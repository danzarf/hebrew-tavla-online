const THREE_MODULE_URL = 'https://esm.sh/three@0.161.0';
const GLTF_LOADER_MODULE_URL = 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
const DICE_MODEL_URL = 'assets/models/dice-premium.glb';
const DISABLE_STORAGE_KEY = 'tavlaDice3dDisabled';
const LOAD_WAIT_MS = 650;

function webGLAvailable() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
}

function featureEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('dice3d') === '0') return false;
  try {
    return window.localStorage.getItem(DISABLE_STORAGE_KEY) !== 'true';
  } catch (e) {
    return true;
  }
}

function waitForLoad(loadPromise, timeoutMs) {
  return Promise.race([
    loadPromise,
    new Promise(resolve => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function cloneMaterial(material) {
  const cloned = material?.clone ? material.clone() : material;
  if (cloned) {
    cloned.transparent = false;
    cloned.depthWrite = true;
    cloned.needsUpdate = true;
  }
  return cloned;
}

function cloneDiceObject(source) {
  const clone = source.clone(true);
  clone.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
    }
  });
  return clone;
}

function findDiceVariant(scene, variantName, fallbackIndex) {
  const exact = scene.getObjectByName(variantName);
  if (exact) return exact;
  const candidates = [];
  scene.traverse(child => {
    const name = child.name || '';
    if (child.isMesh && /dice/i.test(name) && /metal/i.test(name)) candidates.push(child);
  });
  return candidates[fallbackIndex] || candidates[0] || null;
}

function fitObject(object, targetSize = 1) {
  object.updateMatrixWorld(true);
  const box = new object.parent.userData.THREE.Box3().setFromObject(object);
  const size = box.getSize(new object.parent.userData.THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxAxis;
  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);
  const fittedBox = new object.parent.userData.THREE.Box3().setFromObject(object);
  const center = fittedBox.getCenter(new object.parent.userData.THREE.Vector3());
  object.position.sub(center);
}

export function createDice3DPrototype({ boardEl, modelUrl = DICE_MODEL_URL } = {}) {
  const enabled = featureEnabled() && webGLAvailable() && !!boardEl;
  let THREE = null;
  let GLTFLoader = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let lightRig = null;
  let group = null;
  let diceA = null;
  let diceB = null;
  let canvas = null;
  let loadPromise = null;
  let ready = false;
  let failed = false;
  let raf = 0;
  let activeToken = 0;

  function ensureCanvas() {
    if (canvas || !boardEl) return canvas;
    canvas = document.createElement('canvas');
    canvas.className = 'dice3dLayer';
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '21',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 120ms ease',
    });
    canvas.setAttribute('aria-hidden', 'true');
    boardEl.appendChild(canvas);
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
  }

  async function loadModel() {
    if (!enabled || failed) return null;
    if (ready) return { renderer, scene, camera, group };
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      ensureCanvas();
      [THREE, { GLTFLoader }] = await Promise.all([
        import(THREE_MODULE_URL),
        import(GLTF_LOADER_MODULE_URL),
      ]);

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = false;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.1, 100);
      camera.position.set(0, 2.15, 5.2);
      camera.lookAt(0, 0, 0);

      lightRig = new THREE.Group();
      const ambient = new THREE.HemisphereLight(0xfff2cf, 0x1a0c05, 2.1);
      const key = new THREE.DirectionalLight(0xffdf9a, 3.2);
      key.position.set(2.5, 4.2, 3.5);
      const rim = new THREE.DirectionalLight(0x8fc7ff, 1.35);
      rim.position.set(-3.4, 2.2, -2.8);
      lightRig.add(ambient, key, rim);
      scene.add(lightRig);

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(modelUrl);
      const sourceA = findDiceVariant(gltf.scene, 'Dice_v1_metal', 0);
      const sourceB = findDiceVariant(gltf.scene, 'Dice_v2_metal', 1);
      if (!sourceA || !sourceB) throw new Error('Premium dice GLB did not expose metal dice meshes');

      group = new THREE.Group();
      group.userData.THREE = THREE;
      diceA = cloneDiceObject(sourceA);
      diceB = cloneDiceObject(sourceB);
      diceA.userData.THREE = THREE;
      diceB.userData.THREE = THREE;
      group.add(diceA, diceB);
      scene.add(group);
      fitObject(diceA, 0.72);
      fitObject(diceB, 0.72);
      diceA.position.set(-0.42, 0, 0);
      diceB.position.set(0.42, 0, 0);
      group.visible = false;
      resize();
      window.addEventListener('resize', resize, { passive: true });
      ready = true;
      return { renderer, scene, camera, group };
    })().catch(error => {
      failed = true;
      if (canvas) canvas.style.opacity = '0';
      console.warn('3D dice prototype disabled; falling back to DOM dice.', error);
      return null;
    });

    return loadPromise;
  }

  function perspectiveTargets(perspectiveClass) {
    if (perspectiveClass === 'dicePerspectiveOpponent') return { startX: -2.85, landX: -1.25, direction: -1 };
    if (perspectiveClass === 'dicePerspectiveCenter') return { startX: 0, landX: 0, direction: 1 };
    return { startX: 2.85, landX: 1.25, direction: 1 };
  }

  function hide(token) {
    if (token !== activeToken) return;
    cancelAnimationFrame(raf);
    raf = 0;
    if (group) group.visible = false;
    if (canvas) canvas.style.opacity = '0';
  }

  async function playRoll({ finalDice = [1, 1], duration = 1000, perspectiveClass = 'dicePerspectiveOwn', startedAt = performance.now() } = {}) {
    if (!enabled || failed || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const rollStartedAt = startedAt;
    const loaded = await waitForLoad(loadModel(), LOAD_WAIT_MS);
    if (!loaded || !renderer || !scene || !camera || !group || !diceA || !diceB) return false;

    activeToken += 1;
    const token = activeToken;
    const safeDuration = Math.max(720, Math.min(1800, duration));
    if (performance.now() - rollStartedAt > safeDuration - 180) return false;
    const { startX, landX, direction } = perspectiveTargets(perspectiveClass);
    const phaseA = (finalDice[0] || 1) * 0.31;
    const phaseB = (finalDice[1] || 1) * 0.37;

    resize();
    group.visible = true;
    canvas.style.opacity = '1';

    const renderFrame = now => {
      if (token !== activeToken) return;
      const t = Math.min(1, (now - rollStartedAt) / safeDuration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const bounce = Math.abs(Math.sin(t * Math.PI * 3.2)) * (1 - t) * 0.35;
      group.position.set(startX + (landX - startX) * easeOut, bounce - 0.1, 0);
      group.rotation.z = direction * (0.35 - easeOut * 0.35);
      diceA.rotation.set(t * 10.5 + phaseA, t * 13.2 + phaseB, t * 8.1 + phaseA);
      diceB.rotation.set(t * 12.4 + phaseB, t * 9.6 + phaseA, t * 11.7 + phaseB);
      diceA.position.y = Math.sin(t * Math.PI * 5) * (1 - t) * 0.14;
      diceB.position.y = Math.sin(t * Math.PI * 4.6 + 0.8) * (1 - t) * 0.14;
      renderer.render(scene, camera);
      if (t < 1) raf = requestAnimationFrame(renderFrame);
      else setTimeout(() => hide(token), 90);
    };

    raf = requestAnimationFrame(renderFrame);
    return true;
  }

  function preload() {
    if (!enabled || failed) return Promise.resolve(false);
    return loadModel().then(Boolean);
  }

  function schedulePreload() {
    if (!enabled || navigator.connection?.saveData) return;
    const start = () => preload();
    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2200 });
    else window.setTimeout(start, 900);
  }

  schedulePreload();

  return {
    preload,
    playRoll,
    isEnabled: () => enabled && !failed,
    isReady: () => ready,
  };
}
