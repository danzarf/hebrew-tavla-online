const THREE_MODULE_URL = 'https://esm.sh/three@0.161.0';
const GLTF_LOADER_MODULE_URL = 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
const BOARD_MODEL_URL = 'assets/models/backgammon-board.glb';

function board3DRequested() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('board3d') === '1';
}

function webGLAvailable() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
}

function cloneMaterial(material) {
  const cloned = material?.clone ? material.clone() : material;
  if (cloned) cloned.needsUpdate = true;
  return cloned;
}

function hideBundledGameplayObjects(root) {
  const hiddenNamePattern = /(06[_\s-]*dice|dice|02[_\s-]*beyazlar|03[_\s-]*siyahlar|beyaz|siyah|white|black|checker|stone)/i;
  root.traverse(child => {
    if (hiddenNamePattern.test(child.name || '')) child.visible = false;
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
      child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
    }
  });
}

function fitSceneToBoard(THREE, object, targetWidth = 4.8) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxPlanar = Math.max(size.x, size.z, size.y) || 1;
  const scale = targetWidth / maxPlanar;
  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);
  const fittedBox = new THREE.Box3().setFromObject(object);
  const center = fittedBox.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

export function createBoard3DPrototype({ boardEl, modelUrl = BOARD_MODEL_URL } = {}) {
  const enabled = board3DRequested() && webGLAvailable() && !!boardEl;
  let THREE = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let canvas = null;
  let loadPromise = null;
  let active = false;
  let failed = false;

  function ensureCanvas() {
    if (canvas || !boardEl) return canvas;
    canvas = document.createElement('canvas');
    canvas.className = 'board3dLayer';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 180ms ease',
    });
    boardEl.prepend(canvas);
    boardEl.classList.add('board3dRequested');
    return canvas;
  }

  function resize() {
    if (!renderer || !camera || !boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderOnce();
  }

  function renderOnce() {
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  async function preload() {
    if (!enabled || failed) return false;
    if (active) return true;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        ensureCanvas();
        const [threeModule, { GLTFLoader }] = await Promise.all([
          import(THREE_MODULE_URL),
          import(GLTF_LOADER_MODULE_URL),
        ]);
        THREE = threeModule;

        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(31, 16 / 9, 0.1, 100);
        camera.position.set(0, 3.15, 4.85);
        camera.lookAt(0, 0, 0);

        const ambient = new THREE.HemisphereLight(0xffecd0, 0x160905, 2.4);
        const key = new THREE.DirectionalLight(0xffd59b, 3.0);
        key.position.set(2.4, 4.2, 3.2);
        const fill = new THREE.DirectionalLight(0x87b8ff, 1.0);
        fill.position.set(-3.2, 2.1, -2.2);
        scene.add(ambient, key, fill);

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelUrl);
        const model = gltf.scene;
        hideBundledGameplayObjects(model);
        fitSceneToBoard(THREE, model, 4.9);
        model.rotation.x = -0.02;
        scene.add(model);

        resize();
        canvas.style.opacity = '1';
        boardEl.classList.add('board3dActive');
        active = true;
        window.addEventListener('resize', resize, { passive: true });
        renderOnce();
        return true;
      } catch (error) {
        failed = true;
        active = false;
        if (canvas) canvas.style.opacity = '0';
        boardEl.classList.remove('board3dRequested', 'board3dActive');
        console.warn('3D board prototype disabled; falling back to DOM board.', error);
        return false;
      }
    })();

    return loadPromise;
  }

  function init() {
    if (!enabled) return Promise.resolve(false);
    return preload();
  }

  return {
    init,
    preload,
    isEnabled: () => enabled && !failed,
    isActive: () => active,
  };
}
