import { BOARD_3D_DIMENSIONS, createBoardPointLayout } from "./threeBoardLayout.js";

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
const WOOD_TEXTURE_BASE_PATH = 'assets/textures/wood_table/';

export function isThreeBoardFeatureEnabled(search = window.location.search) {
  return new URLSearchParams(search).get('board3d') === '1';
}

export async function initThreeBoardPrototype({ boardEl }) {
  if (!boardEl || !isThreeBoardFeatureEnabled()) return null;

  const THREE = await import(THREE_MODULE_URL);
  const prototype = createThreeBoardPrototype({ THREE, boardEl });
  prototype.mount();
  return prototype;
}

function createThreeBoardPrototype({ THREE, boardEl }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'threeBoardCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.textureBasePath = WOOD_TEXTURE_BASE_PATH;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8.8, 8.8, 5.1, -5.1, 0.1, 40);
  camera.position.set(0, 12.5, 1.45);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  const materials = createMaterials(THREE);
  buildScene({ THREE, scene, materials });

  let frameId = 0;
  let resizeObserver = null;

  function resize() {
    const rect = boardEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);

    const aspect = width / height;
    const viewHeight = 10.2;
    const viewWidth = viewHeight * aspect;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  return {
    mount() {
      boardEl.classList.add('threeBoardEnabled');
      boardEl.prepend(canvas);
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(boardEl);
      render();
    },
    dispose() {
      cancelAnimationFrame(frameId);
      if (resizeObserver) resizeObserver.disconnect();
      boardEl.classList.remove('threeBoardEnabled');
      canvas.remove();
      renderer.dispose();
    },
  };
}

function createMaterials(THREE) {
  const woodTexture = createProceduralWoodTexture(THREE, { base: '#6b3a1f', grain: '#9c6234' });
  const darkWoodTexture = createProceduralWoodTexture(THREE, { base: '#35180d', grain: '#70401f' });

  const wood = new THREE.MeshStandardMaterial({
    color: 0x8a5730,
    map: woodTexture,
    roughness: 0.72,
    metalness: 0.03,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x4a2413,
    map: darkWoodTexture,
    roughness: 0.82,
    metalness: 0.02,
  });
  const felt = new THREE.MeshStandardMaterial({
    color: 0x21483d,
    roughness: 0.94,
    metalness: 0,
  });
  const feltGlow = new THREE.MeshStandardMaterial({
    color: 0x2f6b55,
    roughness: 0.98,
    metalness: 0,
  });
  const redPoint = new THREE.MeshStandardMaterial({
    color: 0x8f2f25,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const greenPoint = new THREE.MeshStandardMaterial({
    color: 0x3f8067,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  return { wood, darkWood, felt, feltGlow, redPoint, greenPoint };
}


function createProceduralWoodTexture(THREE, { base, grain }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, base);
  gradient.addColorStop(0.48, grain);
  gradient.addColorStop(1, base);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    const wave = Math.sin(y * 0.11) * 18 + Math.sin(y * 0.037) * 32;
    ctx.strokeStyle = `rgba(255,220,160,${0.035 + (y % 7) * 0.004})`;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.17) * 1.5);
    ctx.bezierCurveTo(150 + wave, y - 9, 320 - wave, y + 11, canvas.width, y + Math.sin(y * 0.07) * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 36; i += 1) {
    const x = seededUnit(i, 11) * canvas.width;
    const y = seededUnit(i, 23) * canvas.height;
    ctx.fillStyle = 'rgba(40,18,8,.12)';
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      18 + seededUnit(i, 37) * 36,
      2 + seededUnit(i, 43) * 5,
      seededUnit(i, 53) * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 1);
  texture.needsUpdate = true;
  return texture;
}


function seededUnit(index, salt) {
  const value = Math.sin(index * 91.17 + salt * 17.31) * 10000;
  return value - Math.floor(value);
}

function buildScene({ THREE, scene, materials }) {
  addLighting({ THREE, scene });
  addBoardBase({ THREE, scene, materials });
  addPointLayout({ THREE, scene, materials });
  addSubtleFeltLines({ THREE, scene, materials });
}

function addLighting({ THREE, scene }) {
  scene.add(new THREE.HemisphereLight(0xffe8c0, 0x1b2c28, 1.8));

  const key = new THREE.DirectionalLight(0xffe0af, 3.4);
  key.position.set(-3.5, 8, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x78b7ff, 0.55);
  rim.position.set(4.5, 5.5, -5);
  scene.add(rim);
}

function addBoardBase({ THREE, scene, materials }) {
  const dims = BOARD_3D_DIMENSIONS;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(dims.innerWidth, dims.floorThickness, dims.innerHeight),
    materials.felt,
  );
  floor.position.y = -dims.floorThickness / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(dims.innerWidth * 0.96, dims.innerHeight * 0.9),
    materials.feltGlow,
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.006;
  glow.receiveShadow = true;
  scene.add(glow);

  const wallY = dims.wallHeight / 2;
  const halfW = dims.width / 2;
  const halfH = dims.height / 2;
  const wallThickness = dims.wallThickness;

  const wallSpecs = [
    { size: [dims.width, dims.wallHeight, wallThickness], position: [0, wallY, halfH - wallThickness / 2] },
    { size: [dims.width, dims.wallHeight, wallThickness], position: [0, wallY, -halfH + wallThickness / 2] },
    { size: [wallThickness, dims.wallHeight, dims.height], position: [-halfW + wallThickness / 2, wallY, 0] },
    { size: [wallThickness, dims.wallHeight, dims.height], position: [halfW - wallThickness / 2, wallY, 0] },
  ];

  wallSpecs.forEach(({ size, position }) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), materials.wood);
    wall.position.set(...position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  });

  const centerBar = new THREE.Mesh(
    new THREE.BoxGeometry(dims.centerBarWidth, 0.34, dims.innerHeight + 0.25),
    materials.darkWood,
  );
  centerBar.position.set(0, 0.17, 0);
  centerBar.castShadow = true;
  centerBar.receiveShadow = true;
  scene.add(centerBar);

  const centerHighlight = new THREE.Mesh(
    new THREE.BoxGeometry(dims.centerBarWidth * 0.34, 0.018, dims.innerHeight * 0.92),
    materials.wood,
  );
  centerHighlight.position.set(0, 0.355, 0);
  centerHighlight.castShadow = false;
  centerHighlight.receiveShadow = false;
  scene.add(centerHighlight);
}

function addPointLayout({ THREE, scene, materials }) {
  createBoardPointLayout().forEach((point, index) => {
    const shape = new THREE.Shape();
    const [first, ...rest] = point.vertices;
    shape.moveTo(first[0], first[1]);
    rest.forEach(([x, z]) => shape.lineTo(x, z));
    shape.lineTo(first[0], first[1]);

    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      index % 2 === 0 ? materials.redPoint : materials.greenPoint,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.026;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

function addSubtleFeltLines({ THREE, scene, materials }) {
  const dims = BOARD_3D_DIMENSIONS;
  const lineMaterial = materials.darkWood.clone();
  lineMaterial.color.set(0x1a2d27);
  lineMaterial.roughness = 0.95;

  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(dims.innerWidth - dims.centerBarWidth, 0.012, 0.035),
      lineMaterial,
    );
    rail.position.set(0, 0.04, side * 0.02);
    rail.receiveShadow = true;
    scene.add(rail);
  });
}
