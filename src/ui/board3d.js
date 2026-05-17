const THREE_MODULE_URL = 'https://esm.sh/three@0.161.0';
const GLTF_LOADER_MODULE_URL = 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
const BOARD_MODEL_URL = 'assets/models/backgammon-board.glb';

const SCENE = {
  width: 6.6,
  height: 3.72,
  leftX: [-2.95, -2.46, -1.97, -1.48, -0.99, -0.50],
  rightX: [0.50, 0.99, 1.48, 1.97, 2.46, 2.95],
  topStartZ: -1.48,
  bottomStartZ: 1.48,
  checkerGap: 0.235,
  checkerRadius: 0.16,
};

const TOP_POINTS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const BOTTOM_POINTS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function webGLAvailable() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
}

function board3DEnabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('board3d') !== '0';
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

function pointToX(point) {
  const topIndex = TOP_POINTS.indexOf(point);
  if (topIndex >= 0) return (topIndex < 6 ? SCENE.leftX : SCENE.rightX)[topIndex % 6];
  const bottomIndex = BOTTOM_POINTS.indexOf(point);
  if (bottomIndex >= 0) return (bottomIndex < 6 ? SCENE.leftX : SCENE.rightX)[bottomIndex % 6];
  return 0;
}

function pointIsTop(point) {
  return TOP_POINTS.includes(point);
}

function makePipTexture(value, { bg = '#f7e5bf', fg = '#21140b' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(84,48,22,.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);
  const spots = {
    1: [[64, 64]],
    2: [[38, 38], [90, 90]],
    3: [[38, 38], [64, 64], [90, 90]],
    4: [[38, 38], [90, 38], [38, 90], [90, 90]],
    5: [[38, 38], [90, 38], [64, 64], [38, 90], [90, 90]],
    6: [[38, 34], [90, 34], [38, 64], [90, 64], [38, 94], [90, 94]],
  }[value] || [];
  ctx.fillStyle = fg;
  spots.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}

function makeCountTexture(count) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(32,16,8,.88)';
  ctx.beginPath();
  ctx.arc(48, 48, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,155,.78)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#fff0bd';
  ctx.font = '700 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), 48, 50);
  return canvas;
}

export function createBoard3DLayer({ boardEl } = {}) {
  const enabled = board3DEnabled() && webGLAvailable() && !!boardEl;
  let THREE = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let canvas = null;
  let modelRoot = null;
  let piecesGroup = null;
  let diceGroup = null;
  let loadPromise = null;
  let active = false;
  let failed = false;
  let pendingState = null;
  let pendingDice = null;

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
    return canvas;
  }

  function resize() {
    if (!renderer || !camera || !boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false);
    const aspect = rect.width / Math.max(1, rect.height);
    const viewH = SCENE.height;
    const viewW = Math.max(SCENE.width, viewH * aspect);
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderOnce();
  }

  function renderOnce() {
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function fitModelToPlayableArea(object) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const scaleX = SCENE.width / (size.x || 1);
    const scaleZ = SCENE.height / (size.z || 1);
    const scaleY = Math.min(scaleX, scaleZ);
    object.scale.set(scaleX, scaleY, scaleZ);
    object.updateMatrixWorld(true);
    const fittedBox = new THREE.Box3().setFromObject(object);
    const center = fittedBox.getCenter(new THREE.Vector3());
    object.position.sub(center);
  }

  function createChecker(color) {
    const material = new THREE.MeshStandardMaterial({
      color: color === 'white' ? 0xf0d5a6 : 0x151316,
      roughness: color === 'white' ? 0.42 : 0.34,
      metalness: color === 'white' ? 0.10 : 0.18,
      emissive: color === 'white' ? 0x120a02 : 0x000000,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(SCENE.checkerRadius, SCENE.checkerRadius, 0.075, 48), material);
    mesh.position.y = 0.08;
    const bevel = new THREE.Mesh(
      new THREE.TorusGeometry(SCENE.checkerRadius * 0.78, 0.010, 8, 48),
      new THREE.MeshStandardMaterial({ color: color === 'white' ? 0xffedc8 : 0x3a3740, roughness: 0.36, metalness: 0.18 }),
    );
    bevel.rotation.x = Math.PI / 2;
    bevel.position.y = 0.122;
    const group = new THREE.Group();
    group.add(mesh, bevel);
    return group;
  }

  function createSprite(textureCanvas, width = 0.22, height = 0.22) {
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, height, 1);
    return sprite;
  }

  function addCountBadge(count, x, z) {
    const sprite = createSprite(makeCountTexture(count), 0.28, 0.28);
    sprite.position.set(x, 0.38, z);
    piecesGroup.add(sprite);
  }

  function addCheckerStack(point, color, count) {
    const top = pointIsTop(point);
    const x = pointToX(point);
    const maxVisible = Math.min(count, 5);
    for (let i = 0; i < maxVisible; i += 1) {
      const checker = createChecker(color);
      const z = (top ? SCENE.topStartZ : SCENE.bottomStartZ) + (top ? 1 : -1) * i * SCENE.checkerGap;
      checker.position.set(x, 0, z);
      piecesGroup.add(checker);
    }
    if (count > 5) {
      const z = (top ? SCENE.topStartZ : SCENE.bottomStartZ) + (top ? 1 : -1) * maxVisible * SCENE.checkerGap;
      addCountBadge(count, x, z);
    }
  }

  function addBarStack(color, count) {
    const zBase = color === 'white' ? 0.58 : -0.58;
    const maxVisible = Math.min(count, 4);
    for (let i = 0; i < maxVisible; i += 1) {
      const checker = createChecker(color);
      checker.position.set(0, 0, zBase + (color === 'white' ? 1 : -1) * i * 0.18);
      piecesGroup.add(checker);
    }
    if (count > 4) addCountBadge(count, 0, zBase + (color === 'white' ? 1 : -1) * 0.86);
  }

  function addOffStack(color, count) {
    if (!count) return;
    const z = color === 'white' ? 1.46 : -1.46;
    const x = -3.55;
    const maxVisible = Math.min(count, 5);
    for (let i = 0; i < maxVisible; i += 1) {
      const checker = createChecker(color);
      checker.scale.setScalar(0.82);
      checker.position.set(x, 0, z + (color === 'white' ? -1 : 1) * i * 0.12);
      piecesGroup.add(checker);
    }
    addCountBadge(count, x, z + (color === 'white' ? -0.72 : 0.72));
  }

  function createDie(value, x, z, dark = false) {
    const faceMaterials = [1, 2, 3, 4, 5, 6].map(n => new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(makePipTexture(n, dark ? { bg: '#1b1715', fg: '#f2c96d' } : undefined)),
      roughness: 0.34,
      metalness: dark ? 0.22 : 0.06,
    }));
    faceMaterials.forEach(m => { m.map.colorSpace = THREE.SRGBColorSpace; });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), faceMaterials);
    mesh.position.set(x, 0.23, z);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    const top = createSprite(makePipTexture(value, dark ? { bg: '#1b1715', fg: '#f2c96d' } : undefined), 0.30, 0.30);
    top.position.set(x, 0.415, z);
    diceGroup.add(mesh, top);
  }

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse?.(node => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
        else { node.material?.map?.dispose?.(); node.material?.dispose?.(); }
      });
    }
  }

  function drawProceduralBoardGuides() {
    const guideGroup = new THREE.Group();
    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(SCENE.width, 0.035, SCENE.height),
      new THREE.MeshStandardMaterial({ color: 0x4b2a13, roughness: 0.62, metalness: 0.04 }),
    );
    felt.position.y = -0.04;
    guideGroup.add(felt);
    for (const p of [...TOP_POINTS, ...BOTTOM_POINTS]) {
      const top = pointIsTop(p);
      const x = pointToX(p);
      const shape = new THREE.Shape();
      const h = 1.34;
      const w = 0.40;
      if (top) {
        shape.moveTo(x - w / 2, -1.72);
        shape.lineTo(x + w / 2, -1.72);
        shape.lineTo(x, -1.72 + h);
      } else {
        shape.moveTo(x - w / 2, 1.72);
        shape.lineTo(x + w / 2, 1.72);
        shape.lineTo(x, 1.72 - h);
      }
      shape.closePath();
      const geom = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ color: p % 2 ? 0x9f3b28 : 0x7b4b22, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
      const tri = new THREE.Mesh(geom, mat);
      tri.rotation.x = -Math.PI / 2;
      tri.position.y = 0.012;
      guideGroup.add(tri);
    }
    scene.add(guideGroup);
  }

  async function init() {
    if (!enabled || active || failed) return false;
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
        camera = new THREE.OrthographicCamera(-SCENE.width / 2, SCENE.width / 2, SCENE.height / 2, -SCENE.height / 2, 0.1, 20);
        camera.position.set(0, 6.4, 0.18);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight(0xffedcf, 0x120704, 2.5));
        const key = new THREE.DirectionalLight(0xffd39a, 3.0);
        key.position.set(2.5, 6, 2.2);
        scene.add(key);
        const gltf = await new GLTFLoader().loadAsync(BOARD_MODEL_URL);
        modelRoot = gltf.scene;
        hideBundledGameplayObjects(modelRoot);
        fitModelToPlayableArea(modelRoot);
        scene.add(modelRoot);
        drawProceduralBoardGuides();
        piecesGroup = new THREE.Group();
        diceGroup = new THREE.Group();
        scene.add(piecesGroup, diceGroup);
        active = true;
        boardEl.classList.add('board3dActive');
        canvas.style.opacity = '1';
        window.addEventListener('resize', resize, { passive: true });
        resize();
        if (pendingState) renderState(pendingState);
        if (pendingDice) renderDice(pendingDice);
        return true;
      } catch (error) {
        failed = true;
        active = false;
        boardEl.classList.remove('board3dActive');
        if (canvas) canvas.style.opacity = '0';
        console.warn('3D board failed to load; using the stable DOM board fallback.', error);
        return false;
      }
    })();
    return loadPromise;
  }

  function renderState(state) {
    pendingState = state;
    if (!active || !piecesGroup) return;
    clearGroup(piecesGroup);
    for (let point = 1; point <= 24; point += 1) {
      const value = state.board?.[point] || 0;
      if (!value) continue;
      addCheckerStack(point, value > 0 ? 'white' : 'black', Math.abs(value));
    }
    addBarStack('white', state.bar?.white || 0);
    addBarStack('black', state.bar?.black || 0);
    addOffStack('white', state.off?.white || 0);
    addOffStack('black', state.off?.black || 0);
    renderDice(state.dice || pendingDice || [0, 0]);
    renderOnce();
  }

  function renderDice(dice = [0, 0]) {
    pendingDice = dice;
    if (!active || !diceGroup) return;
    clearGroup(diceGroup);
    if (!dice?.[0] || !dice?.[1]) { renderOnce(); return; }
    const onRight = !boardEl.classList.contains('dicePerspectiveOpponent');
    const x = onRight ? 1.25 : -1.25;
    createDie(dice[0], x - 0.24, 0, false);
    createDie(dice[1], x + 0.24, 0.03, true);
    renderOnce();
  }

  init();

  return {
    init,
    renderState,
    renderDice,
    isActive: () => active,
    isEnabled: () => enabled && !failed,
  };
}
