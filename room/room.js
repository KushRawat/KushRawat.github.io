// Kush's Room — interactive 3D dev room (layout 2).
// CC0 furniture models by Kenney (kenney.nl). Everything else hand-placed.
// Hotspots: monitor → projects, TV → walkthrough videos, shelf → Trivzy,
// phone → contact.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const SMALL = window.matchMedia('(max-width: 820px)').matches;
const LOWPWR = TOUCH || SMALL; // phones/tablets: dial back GPU cost
const canvas = document.getElementById('room');

// touch devices tap, not click
if (TOUCH) {
  const hint = document.getElementById('rhint');
  if (hint) hint.textContent = 'tap the glowing objects · drag to look · pinch to zoom';
}

/* ============ renderer / scene / camera ============ */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWPWR });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOWPWR ? 2 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOWPWR ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 12, 24);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 60);

/* ============ room shell ============ */
const shell = new THREE.Group();
scene.add(shell);

// floor with baked-in corner/edge darkening (fake AO)
function floorTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#181b2a';
  g.fillRect(0, 0, 512, 512);
  // subtle noise
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  // AO at edges
  const edge = g.createLinearGradient(0, 0, 0, 90);
  ['top', 'bottom', 'left', 'right'].forEach((side) => {
    g.save();
    g.translate(256, 256);
    g.rotate({ top: 0, right: Math.PI / 2, bottom: Math.PI, left: -Math.PI / 2 }[side]);
    g.translate(-256, -256);
    const gr = g.createLinearGradient(0, 0, 0, 110);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 110);
    g.restore();
  });
  void edge;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x11131e, roughness: 1 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.6, emissive: 0x2a1a55, emissiveIntensity: 0.6 });

const floor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 6.4), floorMat);
floor.position.y = -0.1;
floor.receiveShadow = true;
shell.add(floor);

const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.2, 0.2), wallMat);
backWall.position.set(0, 1.6, -3.1);
backWall.receiveShadow = true;
shell.add(backWall);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 6.4), wallMat);
leftWall.position.set(-3.1, 1.6, 0);
leftWall.receiveShadow = true;
shell.add(leftWall);

// glowing floor trim along the walls
const trim1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.05, 0.05), trimMat);
trim1.position.set(0, 0.03, -2.98);
shell.add(trim1);
const trim2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 6.4), trimMat);
trim2.position.set(-2.98, 0.03, 0);
shell.add(trim2);

/* ============ lights ============ */
const ambient = new THREE.AmbientLight(0x8890b0, 0.65);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x334, 0x110f18, 0.5);
scene.add(hemi);

// mutable light bases — the day/night preset system lerps these; the "life"
// flicker animatables multiply them instead of writing absolute values
const rig = { neonOpacity: 1, neonLight: 3.6, tvGlow: 4.4, screenGlow: 6, dustOpacity: 0.55 };

const warm = new THREE.PointLight(0xffa550, 9, 9, 2);
warm.position.set(2.65, 1.55, -0.85); // floor lamp head
// point-light shadows are the priciest — drop them entirely on phones
warm.castShadow = !LOWPWR;
warm.shadow.mapSize.set(1024, 1024);
warm.shadow.bias = -0.002;
scene.add(warm);

const screenGlow = new THREE.PointLight(0x22d3ee, 6, 4, 2);
screenGlow.position.set(0.5, 1.15, -2.2);
scene.add(screenGlow);

const tvGlow = new THREE.PointLight(0x8b5cf6, 5, 4.5, 2);
tvGlow.position.set(-2.2, 1.0, 0.3);
scene.add(tvGlow);

const key = new THREE.DirectionalLight(0xbcc7ff, 0.7);
key.position.set(4, 6, 3);
key.castShadow = true;
key.shadow.mapSize.set(LOWPWR ? 1024 : 2048, LOWPWR ? 1024 : 2048);
key.shadow.camera.left = -5; key.shadow.camera.right = 5;
key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
key.shadow.bias = -0.0015;
scene.add(key);

/* ============ model loading ============ */
const MODELS = [
  'desk', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse',
  'laptop', 'bookcaseOpen', 'books', 'lampRoundFloor', 'lampSquareTable',
  'loungeSofa', 'tableCoffee', 'rugRounded', 'pottedPlant', 'plantSmall1',
  'plantSmall2', 'televisionModern', 'cabinetTelevision', 'radio', 'speaker',
  'trashcan', 'pillow', 'kitchenCoffeeMachine', 'pillowBlue', 'plantSmall3',
  'rugDoormat', 'speakerSmall',
];
const loader = new GLTFLoader();
const lib = {};
let loadedCount = 0;
const loaderBar = document.getElementById('rloaderBar');
const loaderHint = document.getElementById('rloaderHint');

function loadModel(name) {
  return new Promise((resolve, reject) => {
    loader.load(`assets/models/${name}.glb`, (gltf) => {
      loadedCount++;
      loaderBar.style.transform = `scaleX(${loadedCount / MODELS.length})`;
      loaderHint.textContent = `loading ${name}…`;
      lib[name] = gltf.scene;
      resolve();
    }, undefined, reject);
  });
}

// place a clone of a library model: scale so bbox height == h (or width == w),
// then recenter so bbox center sits on pos.x/z and bbox bottom on pos.y —
// Kenney GLBs have corner pivots, so raw positioning floats/offsets them.
function put(name, { h, w, pos, rot = 0 }) {
  const obj = lib[name].clone(true);
  let box = new THREE.Box3().setFromObject(obj);
  let size = box.getSize(new THREE.Vector3());
  const s = h ? h / size.y : w / size.x;
  obj.scale.setScalar(s);
  obj.rotation.y = rot;
  obj.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  obj.position.x += pos[0] - center.x;
  obj.position.y += pos[1] - box.min.y;
  obj.position.z += pos[2] - center.z;
  obj.traverse((c) => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  scene.add(obj);
  return obj;
}

// wrap an object in a group centered on its bbox so it can rotate in place
function pivotWrap(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  scene.add(g);
  g.attach(obj);
  return g;
}

/* ============ hotspot registry ============ */
const hotspots = {};      // id -> { group, view, label }
const pulses = [];        // clickable-marker sprites
const markerProxies = []; // invisible hit-spheres for reliable tapping

function makePulseSprite(pos) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(34,211,238,1)');
  grad.addColorStop(0.35, 'rgba(34,211,238,0.5)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(0.16);
  sprite.position.set(...pos);
  scene.add(sprite);
  pulses.push(sprite);
  return sprite;
}

function registerHotspot(id, group, view, label, markerPos) {
  group.userData.hotspot = id;
  const glow = [];
  group.traverse((c) => {
    c.userData.hotspot = id;
    if (c.isMesh && c.material && c.material.isMeshStandardMaterial) {
      c.material = c.material.clone(); // isolate from shared kit materials
      c.userData.baseEmissive = c.material.emissive.getHex();
      c.userData.baseEmissiveI = c.material.emissiveIntensity;
      glow.push(c);
    }
  });
  const marker = makePulseSprite(markerPos);
  marker.userData.hotspot = id; // the floating pulse is tappable too (esp. on touch)
  // invisible hit-sphere at the marker — a generous, occlusion-proof tap target
  // so small/edge objects (phone, trashcan) are reliably reachable, esp. on touch
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(TOUCH ? 0.32 : 0.2, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  proxy.position.set(...markerPos);
  proxy.userData.hotspot = id;
  scene.add(proxy);
  markerProxies.push(proxy);
  hotspots[id] = { group, view, label, marker, glow };
}

// registry of per-frame idle animations (steam, flicker, swivel, dust…)
const animatables = [];

// paper toss game — implementations assigned once the scene is built
let gameActive = false;
let startGame = () => {};
let endGame = () => {};

// deploy rush typing game — implementations assigned once the scene is built
let deployActive = false;
let startDeploy = () => {};
let endDeploy = () => {};

/* ============ canvas-texture helpers ============ */
function posterTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 660;
  const g = cv.getContext('2d');
  g.fillStyle = '#0b0d15';
  g.fillRect(0, 0, 512, 660);
  g.strokeStyle = 'rgba(232,234,242,0.18)';
  g.lineWidth = 6;
  g.strokeRect(14, 14, 484, 632);
  const grad = g.createLinearGradient(60, 0, 460, 0);
  grad.addColorStop(0, '#8b5cf6');
  grad.addColorStop(1, '#22d3ee');
  g.fillStyle = grad;
  g.font = '700 92px "Space Grotesk", sans-serif';
  g.fillText('KUSH', 60, 200);
  g.fillText('RAWAT', 60, 300);
  g.fillStyle = '#e8eaf2';
  g.font = '500 34px "Space Grotesk", sans-serif';
  g.fillText('FULL-STACK ENGINEER', 60, 390);
  g.fillStyle = '#9aa1b5';
  g.font = '24px "JetBrains Mono", monospace';
  g.fillText('builder · shipper', 60, 560);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// soft dark blob under furniture — cheap contact shadows
const blobTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
})();
function shadowBlob(x, z, r, stretch = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2 * stretch, r * 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
  scene.add(m);
}

// night-skyline window texture (Jibhi mountains + stars + moon)
// night-skyline / day / golden-hour window textures (Jibhi mountains)
function windowTexture(mode = 'night') {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 340;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 340);
  if (mode === 'day') {
    sky.addColorStop(0, '#7db4e8'); sky.addColorStop(0.65, '#a8cdf0'); sky.addColorStop(1, '#cfe3f5');
  } else if (mode === 'dusk') {
    sky.addColorStop(0, '#3a2a55'); sky.addColorStop(0.5, '#b0522e'); sky.addColorStop(0.8, '#f2913e'); sky.addColorStop(1, '#f7b25a');
  } else {
    sky.addColorStop(0, '#0a1030'); sky.addColorStop(0.7, '#141b45'); sky.addColorStop(1, '#1d2452');
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 340);

  if (mode === 'night') {
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
      g.fillRect(Math.random() * 512, Math.random() * 220, 1.4, 1.4);
    }
    g.fillStyle = '#e8ecff';
    g.beginPath(); g.arc(408, 66, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0a1030';
    g.beginPath(); g.arc(398, 58, 22, 0, Math.PI * 2); g.fill();
  } else if (mode === 'day') {
    // sun with soft glow
    let glow = g.createRadialGradient(120, 70, 8, 120, 70, 60);
    glow.addColorStop(0, 'rgba(255,250,220,1)'); glow.addColorStop(0.35, 'rgba(255,244,200,0.85)'); glow.addColorStop(1, 'rgba(255,244,200,0)');
    g.fillStyle = glow; g.fillRect(40, 0, 180, 160);
    // clouds
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [cx, cy, s] of [[300, 70, 1], [420, 110, 0.7], [200, 130, 0.55]]) {
      g.beginPath();
      g.ellipse(cx, cy, 46 * s, 15 * s, 0, 0, Math.PI * 2);
      g.ellipse(cx + 28 * s, cy - 8 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2);
      g.ellipse(cx - 30 * s, cy - 5 * s, 26 * s, 11 * s, 0, 0, Math.PI * 2);
      g.fill();
    }
    // birds
    g.strokeStyle = 'rgba(40,55,80,0.7)'; g.lineWidth = 2;
    for (const [bx, by] of [[250, 55], [275, 48], [235, 40]]) {
      g.beginPath(); g.arc(bx - 5, by, 6, Math.PI * 1.1, Math.PI * 1.9);
      g.arc(bx + 5, by, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
  } else { // dusk: low sun on the horizon
    let glow = g.createRadialGradient(256, 235, 6, 256, 235, 90);
    glow.addColorStop(0, 'rgba(255,235,180,1)'); glow.addColorStop(0.3, 'rgba(255,190,110,0.9)'); glow.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = glow; g.fillRect(150, 140, 220, 190);
    g.fillStyle = '#ffe9c2';
    g.beginPath(); g.arc(256, 235, 18, 0, Math.PI * 2); g.fill();
  }

  // mountain layers (shared silhouettes, tinted per mode)
  const m1 = mode === 'day' ? '#4a6f8f' : mode === 'dusk' ? '#472b3d' : '#101638';
  const m2 = mode === 'day' ? '#33546f' : mode === 'dusk' ? '#2c1a2e' : '#0b0f28';
  g.fillStyle = m1;
  g.beginPath(); g.moveTo(0, 260);
  g.lineTo(90, 170); g.lineTo(200, 250); g.lineTo(300, 150); g.lineTo(420, 240); g.lineTo(512, 190);
  g.lineTo(512, 340); g.lineTo(0, 340); g.closePath(); g.fill();
  g.fillStyle = m2;
  g.beginPath(); g.moveTo(0, 300);
  g.lineTo(120, 230); g.lineTo(260, 300); g.lineTo(390, 220); g.lineTo(512, 290);
  g.lineTo(512, 340); g.lineTo(0, 340); g.closePath(); g.fill();
  // tiny warm lights in the valley (night + dusk only)
  if (mode !== 'day') {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(255,190,110,0.9)';
      g.fillRect(30 + Math.random() * 450, 285 + Math.random() * 40, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// framed stat card for the wall
function statTexture(big, label) {
  const cv = document.createElement('canvas');
  cv.width = 400; cv.height = 280;
  const g = cv.getContext('2d');
  g.fillStyle = '#0d101c';
  g.fillRect(0, 0, 400, 280);
  g.strokeStyle = 'rgba(232,234,242,0.16)';
  g.lineWidth = 5;
  g.strokeRect(10, 10, 380, 260);
  const grad = g.createLinearGradient(40, 0, 360, 0);
  grad.addColorStop(0, '#8b5cf6');
  grad.addColorStop(1, '#22d3ee');
  g.fillStyle = grad;
  g.font = '700 88px "Space Grotesk", sans-serif';
  g.textAlign = 'center';
  g.fillText(big, 200, 140);
  g.fillStyle = '#9aa1b5';
  g.font = '500 26px "JetBrains Mono", monospace';
  g.fillText(label, 200, 205);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function wallFrame(tex, w, h, pos, rotY = 0) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x232738, roughness: 0.7 })
  );
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  face.position.z = 0.017;
  group.add(frame, face);
  group.position.set(...pos);
  group.rotation.y = rotY;
  scene.add(group);
  return group;
}

function neonTexture(text) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 1024, 256);
  g.font = '700 120px "Space Grotesk", sans-serif';
  g.textAlign = 'center';
  g.shadowColor = '#22d3ee';
  g.shadowBlur = 45;
  g.strokeStyle = '#7ceef7';
  g.lineWidth = 5;
  g.strokeText(text, 512, 160);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ============ build the room after models load ============ */
const SHOTS = ['trivzy', 'caseflow', 'stazo', 'inoventx', 'tasksphere', 'luna'];
let monitorMat = null;
const monitorTextures = [];
let tvVideo = null;
let tvMat = null;

Promise.all(MODELS.map(loadModel)).then(() => {
  /* ---- desk zone (back wall) ---- */
  put('desk', { h: 0.78, pos: [0.5, 0, -2.5] });
  const monitor = put('computerScreen', { h: 0.5, pos: [0.28, 0.78, -2.62] });
  const monitor2 = put('computerScreen', { h: 0.44, pos: [0.94, 0.78, -2.64] });
  put('computerKeyboard', { h: 0.05, pos: [0.35, 0.78, -2.28] });
  put('computerMouse', { h: 0.04, pos: [0.78, 0.78, -2.3] });
  put('laptop', { h: 0.24, pos: [2.45, 0.52, 0.85], rot: -1.2 }); // on the sofa
  put('lampSquareTable', { h: 0.38, pos: [-0.22, 0.78, -2.62], rot: 0.4 });
  put('plantSmall1', { h: 0.22, pos: [1.32, 0.78, -2.68] });
  const chair = put('chairDesk', { h: 0.95, pos: [0.5, 0, -1.75], rot: Math.PI });
  const chairPivot = pivotWrap(chair); // swivel around its own center, not the kit's corner pivot
  animatables.push((t) => { chairPivot.rotation.y = Math.sin(t * 0.35) * 0.12; });
  const trash = put('trashcan', { h: 0.44, pos: [1.62, 0, -2.4] });

  // coffee mug on the desk
  const mug = new THREE.Group();
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.032, 0.075, 14),
    new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.6 })
  );
  mugBody.position.y = 0.038;
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.02, 0.006, 8, 14),
    mugBody.material
  );
  mugHandle.position.set(0.04, 0.04, 0);
  mug.add(mugBody, mugHandle);
  mug.position.set(1.08, 0.78, -2.32);
  mug.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  scene.add(mug);

  // sticky notes on the wall beside the monitors
  const NOTE_COLORS = [0xfff176, 0x80deea, 0xf48fb1, 0xa5d6a7, 0xffcc80];
  for (let n = 0; n < 5; n++) {
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, 0.09),
      new THREE.MeshStandardMaterial({ color: NOTE_COLORS[n], roughness: 1 })
    );
    note.position.set(1.42 + (n % 2) * 0.13, 1.5 - Math.floor(n / 2) * 0.14, -2.985);
    note.rotation.z = (Math.random() - 0.5) * 0.25;
    scene.add(note);
  }

  // monitor screen plane — cycles real project screenshots
  const texLoader = new THREE.TextureLoader();
  SHOTS.forEach((n) => {
    texLoader.load(`../assets/media/${n}.jpg`, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      monitorTextures.push(t);
      if (monitorMat && !monitorMat.map) { // first texture in, light the screen
        monitorMat.map = t;
        monitorMat.color.set(0xffffff);
        monitorMat.needsUpdate = true;
      }
    });
  });
  const mBox = new THREE.Box3().setFromObject(monitor);
  const mSize = mBox.getSize(new THREE.Vector3());
  const mCenter = mBox.getCenter(new THREE.Vector3());
  monitorMat = new THREE.MeshBasicMaterial({ color: 0x111522 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(mSize.x * 0.82, mSize.x * 0.82 * 0.625), monitorMat);
  screen.position.set(mCenter.x, mBox.min.y + mSize.y * 0.62, mBox.max.z + 0.006);
  scene.add(screen);

  // second monitor shows a fixed shot (terminal-feel: the InoventX site)
  const m2Box = new THREE.Box3().setFromObject(monitor2);
  const m2Size = m2Box.getSize(new THREE.Vector3());
  const m2Center = m2Box.getCenter(new THREE.Vector3());
  const monitor2Mat = new THREE.MeshBasicMaterial({ color: 0x111522 });
  let m2Tex = null;
  texLoader.load('../assets/media/inoventx.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    m2Tex = t;
    if (!deployActive) { monitor2Mat.map = t; monitor2Mat.needsUpdate = true; }
  });
  const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(m2Size.x * 0.82, m2Size.x * 0.82 * 0.625), monitor2Mat);
  screen2.position.set(m2Center.x, m2Box.min.y + m2Size.y * 0.62, m2Box.max.z + 0.006);
  scene.add(screen2);
  const deskGroup = new THREE.Group();
  deskGroup.add(monitor.clone()); // raycast against a lightweight proxy
  monitor.userData.hotspot = 'projects';
  registerHotspot('projects', monitor, {
    pos: [1.05, 1.3, -0.85], tgt: [0.45, 1.0, -2.55], // angled so the hostel stays out of frame
  }, 'Projects — click', [0.5, 1.45, -2.55]);
  screen.userData.hotspot = 'projects';

  /* ---- TV zone (left wall) ---- */
  const cab = put('cabinetTelevision', { h: 0.5, pos: [-2.62, 0, 0.3], rot: Math.PI / 2 });
  const tv = put('televisionModern', { h: 0.62, pos: [-2.62, 0.5, 0.3], rot: Math.PI / 2 });
  put('speaker', { h: 0.55, pos: [-2.62, 0, 1.25], rot: Math.PI / 2 });
  put('radio', { h: 0.16, pos: [-2.62, 0.5, -0.5], rot: Math.PI / 2 });

  // TV screen plane — plays walkthrough videos
  tvVideo = document.createElement('video');
  tvVideo.muted = true; tvVideo.loop = true; tvVideo.playsInline = true;
  tvVideo.preload = 'auto';
  tvVideo.src = '../assets/media/lookstyle-1.mp4';
  // show a real frame instead of a blank screen before playback starts
  tvVideo.addEventListener('loadedmetadata', () => { tvVideo.currentTime = 8; }, { once: true });
  const vTex = new THREE.VideoTexture(tvVideo);
  vTex.colorSpace = THREE.SRGBColorSpace;
  tvMat = new THREE.MeshBasicMaterial({ map: vTex });
  const tvBox = new THREE.Box3().setFromObject(tv);
  const tvSize = tvBox.getSize(new THREE.Vector3());
  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(tvSize.z * 0.86, tvSize.z * 0.86 * 0.56),
    tvMat
  );
  tvScreen.rotation.y = Math.PI / 2;
  tvScreen.position.set(tvBox.max.x + 0.006, tvBox.min.y + tvSize.y * 0.55, 0.3);
  scene.add(tvScreen);
  tvScreen.userData.hotspot = 'tv';
  registerHotspot('tv', tv, {
    pos: [-0.35, 1.15, 0.3], tgt: [-2.5, 0.95, 0.3],
  }, 'Walkthrough videos — click', [-2.45, 1.5, 0.3]);
  cab.userData.hotspot = 'tv';
  cab.traverse((c) => { c.userData.hotspot = 'tv'; });

  /* ---- shelf zone (Trivzy) ---- */
  const shelf = put('bookcaseOpen', { h: 1.85, pos: [-2.0, 0, -2.75] });
  put('books', { h: 0.28, pos: [-2.25, 1.13, -2.72] });
  put('plantSmall2', { h: 0.3, pos: [-1.75, 1.13, -2.72] });

  // mini Trivzy "hostel" on a shelf — tiny house from primitives
  const hostel = new THREE.Group();
  const hBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.8 })
  );
  hBody.position.y = 0.11;
  const hRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.16, 4),
    new THREE.MeshStandardMaterial({ color: 0xe25f4e, roughness: 0.7 })
  );
  hRoof.position.y = 0.3;
  hRoof.rotation.y = Math.PI / 4;
  const hDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.11, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6 })
  );
  hDoor.position.set(0, 0.06, 0.115);
  const hSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.07),
    new THREE.MeshBasicMaterial({ map: neonTexture('TRIVZY'), transparent: true })
  );
  hSign.scale.setScalar(1.9);
  hSign.position.set(0, 0.5, 0.05);
  hostel.add(hBody, hRoof, hDoor, hSign);
  hostel.position.set(-2.0, 1.86, -2.75); // on top of the bookcase
  hostel.rotation.y = 0.15;
  hostel.scale.setScalar(1.45);
  hostel.traverse((c) => { if (c.isMesh) { c.castShadow = true; } });
  scene.add(hostel);
  registerHotspot('trivzy', hostel, {
    pos: [-0.9, 2.0, -1.2], tgt: [-2.0, 2.15, -2.75],
  }, 'Trivzy — I build all the tech', [-2.0, 2.75, -2.65]);
  shelf.userData.hotspot = 'trivzy';
  shelf.traverse((c) => { c.userData.hotspot = 'trivzy'; });

  /* ---- poster (branded wall decor, non-interactive) ---- */
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 1.06),
    new THREE.MeshStandardMaterial({ map: posterTexture(), roughness: 0.85 })
  );
  poster.position.set(1.95, 1.8, -2.99);
  scene.add(poster);

  // neon sign above desk
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.42),
    new THREE.MeshBasicMaterial({ map: neonTexture('keep shipping'), transparent: true })
  );
  neon.position.set(0.4, 2.35, -2.99);
  scene.add(neon);
  const neonLight = new THREE.PointLight(0x22d3ee, 4, 3.5, 2);
  neonLight.position.set(0.4, 2.3, -2.6);
  scene.add(neonLight);

  /* ---- lounge ---- */
  put('rugRounded', { w: 2.6, pos: [0.7, 0.005, 0.55] });
  const sofa = put('loungeSofa', { h: 0.8, pos: [2.45, 0, 0.4], rot: -Math.PI / 2 });
  put('pillow', { h: 0.16, pos: [2.45, 0.52, -0.05], rot: -Math.PI / 2 + 0.3 });
  const table = put('tableCoffee', { h: 0.4, pos: [1.05, 0, 0.55] });
  put('pottedPlant', { h: 0.95, pos: [2.6, 0, -2.55] });
  put('lampRoundFloor', { h: 1.6, pos: [2.7, 0, -0.9] });

  // phone on the coffee table — primitives
  const phone = new THREE.Group();
  const pBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.012, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1a1d2b, roughness: 0.4, metalness: 0.3 })
  );
  const pScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.165),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  pScreen.rotation.x = -Math.PI / 2;
  pScreen.position.y = 0.007;
  phone.add(pBody, pScreen);
  phone.position.set(1.05, 0.42, 0.5);
  phone.rotation.y = 0.5;
  scene.add(phone);
  registerHotspot('contact', phone, {
    pos: [1.05, 1.25, 1.35], tgt: [1.05, 0.42, 0.5],
  }, 'Contact me', [1.05, 0.72, 0.5]);
  table.userData.hotspot = 'contact';
  table.traverse((c) => { c.userData.hotspot = 'contact'; });

  /* ---- window with night skyline (left wall) ---- */
  const winTextures = {
    night: windowTexture('night'),
    day: windowTexture('day'),
    dusk: windowTexture('dusk'),
  };
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.95),
    new THREE.MeshBasicMaterial({ map: winTextures.night })
  );
  win.rotation.y = Math.PI / 2;
  win.position.set(-2.99, 1.75, -1.55);
  scene.add(win);
  const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x232738, roughness: 0.7 });
  const wf1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.06), winFrameMat);
  wf1.rotation.y = Math.PI / 2; wf1.position.set(-2.98, 1.75, -0.8);
  const wf2 = wf1.clone(); wf2.position.z = -2.3;
  const wf3 = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 0.06), winFrameMat);
  wf3.rotation.y = Math.PI / 2; wf3.position.set(-2.98, 2.25, -1.55);
  const wf4 = wf3.clone(); wf4.position.y = 1.25;
  const wf5 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), winFrameMat);
  wf5.rotation.y = Math.PI / 2; wf5.position.set(-2.985, 1.75, -1.55);
  scene.add(wf1, wf2, wf3, wf4, wf5);
  const moonlight = new THREE.PointLight(0x7799ff, 4, 6, 2);
  moonlight.position.set(-2.5, 1.75, -1.55);
  scene.add(moonlight);

  /* ---- framed stats flanking the Trivzy hostel ---- */
  wallFrame(statTexture('300+', 'check-ins · trivzy'), 0.55, 0.4, [-2.6, 2.35, -2.98]);
  wallFrame(statTexture('10+', 'apps · 6 months'), 0.5, 0.36, [-1.32, 2.28, -2.98]);

  /* ---- extra props (density pass) ---- */
  put('kitchenCoffeeMachine', { h: 0.28, pos: [-2.62, 0.5, 0.95], rot: Math.PI / 2 });
  put('plantSmall3', { h: 0.24, pos: [-2.62, 0.5, -0.1], rot: Math.PI / 2 });
  put('pillowBlue', { h: 0.16, pos: [2.45, 0.52, 0.3], rot: -Math.PI / 2 - 0.2 });
  put('rugDoormat', { w: 0.9, pos: [0.3, 0.004, 2.6], rot: 0.08 });
  put('speakerSmall', { h: 0.22, pos: [-1.78, 0.68, -2.72] });
  put('books', { h: 0.26, pos: [-2.2, 0.68, -2.73], rot: 0.25 });
  put('books', { h: 0.24, pos: [1.28, 0.42, 0.62], rot: 1.2 }); // on coffee table

  /* ---- life: steam over the mug ---- */
  const steamTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 3, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const steamSprites = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: steamTex, transparent: true, opacity: 0, depthWrite: false,
    }));
    s.position.set(1.08, 0.87, -2.32);
    scene.add(s);
    steamSprites.push({ s, phase: i / 5 });
  }
  animatables.push((t) => {
    steamSprites.forEach(({ s, phase }) => {
      const u = (t * 0.22 + phase) % 1;
      s.position.set(
        1.08 + Math.sin((t + phase * 9) * 1.7) * 0.02,
        0.87 + u * 0.3,
        -2.32
      );
      s.scale.setScalar(0.03 + u * 0.05);
      // steam floats between the camera and the terminal in the deploy view
      s.material.opacity = deployActive ? 0 : Math.sin(u * Math.PI) * 0.35;
    });
  });

  /* ---- life: dust motes drifting in the window light ---- */
  const DUST = 42;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = [];
  for (let i = 0; i < DUST; i++) {
    dustSeed.push({
      x: -2.9 + Math.random() * 1.6,
      y: 0.4 + Math.random() * 1.9,
      z: -2.4 + Math.random() * 1.7,
      p: Math.random() * Math.PI * 2,
      v: 0.25 + Math.random() * 0.7,
    });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xaabbff, size: 0.014, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(dust);
  animatables.push((t) => {
    for (let i = 0; i < DUST; i++) {
      const d = dustSeed[i];
      dustPos[i * 3] = d.x + Math.sin(t * 0.24 * d.v + d.p) * 0.09;
      dustPos[i * 3 + 1] = d.y + Math.sin(t * 0.18 * d.v + d.p * 2) * 0.12;
      dustPos[i * 3 + 2] = d.z + Math.cos(t * 0.2 * d.v + d.p) * 0.09;
    }
    dustGeo.attributes.position.needsUpdate = true;
  });

  /* ---- life: TV glow + neon flicker (scaled by the day/night rig) ---- */
  animatables.push((t) => {
    tvGlow.intensity = rig.tvGlow * (1 + Math.sin(t * 11.3) * 0.08 + Math.sin(t * 23.7) * 0.057);
  });
  const neonMat = neon.material;
  animatables.push((t) => {
    let o = 0.94 + Math.sin(t * 1.7) * 0.06;
    if (Math.sin(t * 0.43) > 0.997) o = 0.35; // rare buzz-out
    neonMat.opacity = rig.neonOpacity * o;
    neonLight.intensity = rig.neonLight * o;
  });

  /* ============ day / golden hour / night lighting ============ */
  // Initial mode follows the visitor's local clock; the wall switch cycles it.
  // ?time=day|dusk|night overrides (shareable/demoable).
  const LIGHT_PRESETS = {
    day: {
      bg: 0x13203a, ambC: 0xd6deee, ambI: 1.9, hemI: 1.1,
      keyC: 0xfff1d0, keyI: 2.1, winC: 0xffe6b8, winI: 7,
      warm: 0, neonO: 0.12, neonL: 0.3, tv: 1.6, screen: 2.4,
      dustO: 0.75, dustC: 0xffe6b8, wallC: 0x35415f, floorB: 1.8, tex: 'day',
    },
    dusk: {
      bg: 0x0a0812, ambC: 0xbf9a92, ambI: 0.95, hemI: 0.6,
      keyC: 0xff9a5c, keyI: 1.15, winC: 0xff8c4a, winI: 6,
      warm: 6, neonO: 0.75, neonL: 2.4, tv: 3.2, screen: 4,
      dustO: 0.65, dustC: 0xffb37a, wallC: 0x1e1522, floorB: 1.15, tex: 'dusk',
    },
    night: {
      bg: 0x05060a, ambC: 0x8890b0, ambI: 0.65, hemI: 0.5,
      keyC: 0xbcc7ff, keyI: 0.7, winC: 0x7799ff, winI: 4,
      warm: 9, neonO: 1, neonL: 3.6, tv: 4.4, screen: 6,
      dustO: 0.55, dustC: 0xaabbff, wallC: 0x11131e, floorB: 1.0, tex: 'night',
    },
  };
  const LIGHT_ORDER = ['day', 'dusk', 'night'];

  const lightCur = {
    bg: new THREE.Color(0x05060a), ambC: new THREE.Color(0x8890b0), ambI: 0.65, hemI: 0.5,
    keyC: new THREE.Color(0xbcc7ff), keyI: 0.7, winC: new THREE.Color(0x7799ff), winI: 4,
    warm: 9, neonO: 1, neonL: 3.6, tv: 4.4, screen: 6, dustO: 0.55, dustC: new THREE.Color(0xaabbff),
    wallC: new THREE.Color(0x11131e), floorB: 1.0,
  };
  const lightTgt = { ...LIGHT_PRESETS.night, };
  let lightMode = 'night';

  // the wall switch (plate + nub) on the back wall, right side
  const switchPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.17, 0.022),
    new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 0.7 })
  );
  switchPlate.position.set(2.62, 1.25, -2.98);
  scene.add(switchPlate);
  const switchNub = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.055, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5 })
  );
  switchNub.position.set(2.62, 1.215, -2.965);
  scene.add(switchNub);
  const NUB_Y = { day: 1.295, dusk: 1.25, night: 1.205 };

  function applyLightTarget(mode) {
    const p = LIGHT_PRESETS[mode];
    Object.assign(lightTgt, p);
    lightMode = mode;
    win.material.map = winTextures[p.tex];
    win.material.needsUpdate = true;
    try { history.replaceState(null, '', mode === timeModeNow() ? location.pathname : `?time=${mode}`); } catch (e) { /* noop */ }
  }
  function timeModeNow() {
    const h = new Date().getHours();
    if (h >= 7 && h < 16) return 'day';
    if ((h >= 16 && h < 19) || (h >= 5 && h < 7)) return 'dusk';
    return 'night';
  }
  function setLightMode(mode, instant = false) {
    if (!LIGHT_PRESETS[mode]) return;
    applyLightTarget(mode);
    if (instant) snapLights();
  }
  function cycleLights() {
    const next = LIGHT_ORDER[(LIGHT_ORDER.indexOf(lightMode) + 1) % LIGHT_ORDER.length];
    setLightMode(next);
    blip(next === 'day' ? 700 : next === 'dusk' ? 520 : 360, next === 'day' ? 940 : next === 'dusk' ? 700 : 480);
  }
  window.__lights = { get mode() { return lightMode; }, set: setLightMode, cycle: cycleLights };

  function snapLights() {
    lightCur.bg.setHex(lightTgt.bg); lightCur.ambC.setHex(lightTgt.ambC);
    lightCur.keyC.setHex(lightTgt.keyC); lightCur.winC.setHex(lightTgt.winC);
    lightCur.dustC.setHex(lightTgt.dustC); lightCur.wallC.setHex(lightTgt.wallC);
    for (const k of ['ambI', 'hemI', 'keyI', 'winI', 'warm', 'neonO', 'neonL', 'tv', 'screen', 'dustO', 'floorB']) lightCur[k] = lightTgt[k];
  }

  const tgtColor = new THREE.Color();
  animatables.push((t, dt) => {
    const f = Math.min(1, dt * 2.2); // ~0.5s to settle
    lightCur.bg.lerp(tgtColor.setHex(lightTgt.bg), f);
    lightCur.ambC.lerp(tgtColor.setHex(lightTgt.ambC), f);
    lightCur.keyC.lerp(tgtColor.setHex(lightTgt.keyC), f);
    lightCur.winC.lerp(tgtColor.setHex(lightTgt.winC), f);
    lightCur.dustC.lerp(tgtColor.setHex(lightTgt.dustC), f);
    lightCur.wallC.lerp(tgtColor.setHex(lightTgt.wallC), f);
    for (const k of ['ambI', 'hemI', 'keyI', 'winI', 'warm', 'neonO', 'neonL', 'tv', 'screen', 'dustO', 'floorB']) {
      lightCur[k] += (lightTgt[k] - lightCur[k]) * f;
    }
    scene.background.copy(lightCur.bg);
    scene.fog.color.copy(lightCur.bg);
    ambient.color.copy(lightCur.ambC); ambient.intensity = lightCur.ambI;
    hemi.intensity = lightCur.hemI;
    key.color.copy(lightCur.keyC); key.intensity = lightCur.keyI;
    moonlight.color.copy(lightCur.winC); moonlight.intensity = lightCur.winI;
    warm.intensity = lightCur.warm;
    screenGlow.intensity = lightCur.screen;
    rig.neonOpacity = lightCur.neonO; rig.neonLight = lightCur.neonL; rig.tvGlow = lightCur.tv;
    dust.material.opacity = lightCur.dustO;
    dust.material.color.copy(lightCur.dustC);
    wallMat.color.copy(lightCur.wallC);
    // floor albedo is a dark texture; components >1 over-brighten it for daytime
    floorMat.color.setScalar(lightCur.floorB);
    // ease the switch nub to its position for the current mode
    switchNub.position.y += (NUB_Y[lightMode] - switchNub.position.y) * Math.min(1, dt * 10);
  });

  // clickable hotspot (no camera move — handled specially in the click handler)
  registerHotspot('lights', switchPlate, {
    pos: [5.3, 4.1, 5.6], tgt: [-0.2, 0.7, -0.4], // unused; click never navigates
  }, 'Light switch — change the time of day', [2.62, 1.55, -2.94]);
  switchNub.userData.hotspot = 'lights';

  // initial mode: URL param wins, else the visitor's local time
  {
    const urlMode = new URLSearchParams(location.search).get('time');
    setLightMode(LIGHT_PRESETS[urlMode] ? urlMode : timeModeNow(), true);
  }

  /* ---- paper toss game ---- */
  registerHotspot('toss', trash, {
    pos: [1.35, 1.45, 0.95], tgt: [1.62, 0.45, -2.4],
  }, 'Paper Toss — play!', [1.62, 0.62, -2.4]);

  const trashBox = new THREE.Box3().setFromObject(trash);
  const RIM = {
    x: (trashBox.min.x + trashBox.max.x) / 2,
    z: (trashBox.min.z + trashBox.max.z) / 2,
    y: trashBox.max.y,
    r: Math.min(trashBox.max.x - trashBox.min.x, trashBox.max.z - trashBox.min.z) * 0.46,
  };
  const BALL_R = 0.045;
  const SPAWN = new THREE.Vector3(1.4, 0.95, -0.15);
  const GRAV = 6.2;

  // crumpled paper ball
  const ballGeo = new THREE.IcosahedronGeometry(BALL_R, 1);
  {
    const p = ballGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i,
        p.getX(i) + (Math.random() - 0.5) * 0.008,
        p.getY(i) + (Math.random() - 0.5) * 0.008,
        p.getZ(i) + (Math.random() - 0.5) * 0.008);
    }
    ballGeo.computeVertexNormals();
  }
  const ball = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({
    color: 0xf4f0e6, roughness: 0.9, flatShading: true,
  }));
  ball.castShadow = true;
  ball.visible = false;
  scene.add(ball);

  // aim trajectory preview
  const AIM_N = 12;
  const aimPos = new Float32Array(AIM_N * 3);
  const aimGeo = new THREE.BufferGeometry();
  aimGeo.setAttribute('position', new THREE.BufferAttribute(aimPos, 3));
  const aim = new THREE.Points(aimGeo, new THREE.PointsMaterial({
    color: 0x22d3ee, size: TOUCH ? 0.03 : 0.022, transparent: true, opacity: 0.9, depthWrite: false,
  }));
  aim.visible = false;
  scene.add(aim);

  // target ring on the bin rim — shows the goal (esp. on touch, no cursor)
  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(RIM.r * 0.75, RIM.r * 1.05, 28),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.set(RIM.x, RIM.y + 0.02, RIM.z);
  targetRing.visible = false;
  scene.add(targetRing);

  // landing reticle — the aiming "crosshair": where the ball is predicted to land
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.075, 22),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  const game = {
    score: 0, streak: 0,
    best: Number(localStorage.getItem('papertoss-best') || 0),
    wind: 0,
    state: 'idle', // idle | aiming | flying | done(score/miss settling)
    vel: new THREE.Vector3(),
    prevY: 0,
    flightT: 0,
    scored: false,
    drag: { x0: 0, y0: 0, x: 0, y: 0 },
  };
  window.__game = game; // handy for debugging/tests

  const ui = {
    root: document.getElementById('rgame'),
    score: document.getElementById('gScore'),
    streak: document.getElementById('gStreak'),
    best: document.getElementById('gBest'),
    wind: document.getElementById('gWind'),
    hint: document.getElementById('gHint'),
  };
  function syncHud() {
    ui.score.textContent = game.score;
    ui.streak.textContent = '×' + game.streak;
    ui.best.textContent = game.best;
    const w = game.wind;
    ui.wind.textContent = Math.abs(w) < 0.05 ? 'wind —'
      : `wind ${w > 0 ? '→' : '←'}${Math.abs(w) > 0.35 ? (w > 0 ? '→' : '←') : ''}`;
  }
  function popText(text, cx, cy) {
    const el = document.createElement('div');
    el.className = 'rgame__pop';
    el.textContent = text;
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function resetBall() {
    ball.position.copy(SPAWN);
    ball.visible = true;
    game.state = 'idle';
    game.scored = false;
    game.flightT = 0;
    game.wind = (Math.random() - 0.5) * 0.9;
    syncHud();
  }

  startGame = () => {
    gameActive = true;
    goTo('toss', hotspots.toss.view);
    ui.root.hidden = false;
    ui.hint.classList.remove('is-hidden');
    canvas.style.cursor = 'crosshair';
    tooltip.classList.remove('is-visible');
    hovered = null;
    targetRing.visible = true;
    resetBall();
  };
  endGame = () => {
    if (!gameActive) return;
    gameActive = false;
    ball.visible = false;
    aim.visible = false;
    targetRing.visible = false;
    reticle.visible = false;
    ui.root.hidden = true;
    canvas.style.cursor = 'grab';
  };

  // simulate the throw forward to find where it lands (for the aim reticle)
  function predictLanding() {
    const vv = launchVelocity();
    const p = SPAWN.clone();
    const step = 0.03;
    for (let i = 0; i < 240; i++) {
      vv.y -= GRAV * step;
      vv.x += game.wind * step;
      p.addScaledVector(vv, step);
      if (vv.y < 0 && p.y <= RIM.y) {
        const d = Math.hypot(p.x - RIM.x, p.z - RIM.z);
        if (d < RIM.r * 1.25) return { x: p.x, y: RIM.y + 0.02, z: p.z, inBin: true };
      }
      if (p.y <= BALL_R) return { x: p.x, y: BALL_R + 0.01, z: p.z, inBin: false };
    }
    return null;
  }

  function launchVelocity() {
    const dx = game.drag.x - game.drag.x0;
    const up = Math.max(0, game.drag.y0 - game.drag.y); // drag upward
    return new THREE.Vector3(
      dx * 0.004,
      0.5 + up * 0.0075,
      -(1.1 + up * 0.007)
    );
  }
  function updateAimPreview() {
    const v = launchVelocity();
    const p = SPAWN.clone();
    const vv = v.clone();
    const step = 0.055;
    for (let i = 0; i < AIM_N; i++) {
      aimPos[i * 3] = p.x; aimPos[i * 3 + 1] = p.y; aimPos[i * 3 + 2] = p.z;
      vv.y -= GRAV * step;
      vv.x += game.wind * step;
      p.addScaledVector(vv, step);
    }
    aimGeo.attributes.position.needsUpdate = true;
    aim.visible = true;
    // landing reticle — the aiming crosshair (cyan = in the bin, pink = miss)
    const land = predictLanding();
    if (land) {
      reticle.position.set(land.x, land.y, land.z);
      reticle.material.color.setHex(land.inBin ? 0x22d3ee : 0xf472b6);
      reticle.visible = true;
    } else {
      reticle.visible = false;
    }
  }

  // input (only in game mode)
  canvas.addEventListener('pointerdown', (e) => {
    if (!gameActive || game.state !== 'idle') return;
    game.state = 'aiming';
    game.drag.x0 = game.drag.x = e.clientX;
    game.drag.y0 = game.drag.y = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!gameActive || game.state !== 'aiming') return;
    game.drag.x = e.clientX;
    game.drag.y = e.clientY;
    updateAimPreview();
  });
  window.addEventListener('pointerup', () => {
    if (!gameActive || game.state !== 'aiming') return;
    aim.visible = false;
    reticle.visible = false;
    const up = game.drag.y0 - game.drag.y;
    if (up < 24) { game.state = 'idle'; return; } // too weak — cancel
    game.vel.copy(launchVelocity());
    game.state = 'flying';
    game.prevY = ball.position.y;
    ui.hint.classList.add('is-hidden');
    blip(300, 190);
  });

  function resolveThrow(made) {
    if (made) {
      game.streak += 1;
      game.score += game.streak;
      if (game.score > game.best) {
        game.best = game.score;
        localStorage.setItem('papertoss-best', String(game.best));
      }
      blip(660, 990);
      popText(`+${game.streak}`, window.innerWidth / 2, window.innerHeight * 0.42);
    } else {
      if (game.streak > 2) popText('streak lost!', window.innerWidth / 2, window.innerHeight * 0.42);
      game.streak = 0;
      blip(220, 150);
    }
    syncHud();
    setTimeout(() => { if (gameActive) resetBall(); }, 550);
    game.state = 'done';
  }

  animatables.push((t, dt) => {
    // pulse the bin target ring while the game is live
    if (targetRing.visible) {
      const k = 0.9 + Math.sin(t * 3) * 0.12;
      targetRing.scale.setScalar(k);
      targetRing.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;
    }
    // spin idle ball gently so it reads as "ready"
    if (gameActive && game.state === 'idle') ball.rotation.y += dt * 1.5;
    if (game.state !== 'flying') return;

    game.flightT += dt;
    game.prevY = ball.position.y;
    game.vel.y -= GRAV * dt;
    game.vel.x += game.wind * dt;
    ball.position.addScaledVector(game.vel, dt);
    ball.rotation.x -= dt * 9;

    const dxr = ball.position.x - RIM.x;
    const dzr = ball.position.z - RIM.z;
    const distR = Math.hypot(dxr, dzr);

    // crossing the rim plane from above
    if (game.prevY > RIM.y && ball.position.y <= RIM.y && !game.scored) {
      game.lastCross = { dist: +distR.toFixed(3), x: +ball.position.x.toFixed(2), z: +ball.position.z.toFixed(2), t: +game.flightT.toFixed(2) };
      if (distR < RIM.r - BALL_R * 0.15) {
        game.scored = true; // swish — falls inside
      } else if (distR < RIM.r + BALL_R * 1.4) {
        // rim hit: bounce off, away from center
        const nx = dxr / (distR || 1), nz = dzr / (distR || 1);
        const dot = game.vel.x * nx + game.vel.z * nz;
        game.vel.x = (game.vel.x - 2 * dot * nx) * 0.35;
        game.vel.z = (game.vel.z - 2 * dot * nz) * 0.35;
        game.vel.y = Math.abs(game.vel.y) * 0.3;
        blip(180, 120);
      }
    }

    if (game.scored && ball.position.y < RIM.y - 0.12) {
      ball.visible = false;
      resolveThrow(true);
      return;
    }

    // walls & floor
    if (ball.position.z < -2.9) { ball.position.z = -2.9; game.vel.z = Math.abs(game.vel.z) * 0.4; }
    if (ball.position.x < -2.9) { ball.position.x = -2.9; game.vel.x = Math.abs(game.vel.x) * 0.4; }
    if (ball.position.y <= BALL_R && !game.scored) {
      ball.position.y = BALL_R;
      game.vel.y = Math.abs(game.vel.y) * 0.42;
      game.vel.x *= 0.7; game.vel.z *= 0.7;
      if (game.vel.length() < 0.6) { resolveThrow(false); return; }
    }
    if (game.flightT > 3) resolveThrow(false);
  });

  /* ---- Deploy Rush — typing game rendered onto the second monitor ---- */
  registerHotspot('deploy', monitor2, {
    pos: [0.94, 1.2, -1.45], tgt: [0.94, 1.0, -2.62],
  }, 'Deploy Rush — play!', [0.98, 1.42, -2.62]);
  screen2.userData.hotspot = 'deploy';

  const termCv = document.createElement('canvas');
  termCv.width = 1024; termCv.height = 640;
  const term = termCv.getContext('2d');
  const termTex = new THREE.CanvasTexture(termCv);
  termTex.colorSpace = THREE.SRGBColorSpace;

  const CMDS = [
    'git add .', 'git commit -m "ship"', 'git push --force', 'npm run deploy',
    'pm2 restart all', 'docker compose up -d', 'npx prisma migrate deploy',
    'vercel --prod', 'ssh prod', 'nginx -s reload', 'npm i', 'git stash pop',
    'kubectl rollout undo', 'curl localhost:3000/health', 'rm -rf node_modules',
    'sudo reboot', 'ship it', 'fix prod NOW', 'claude "fix the bug"',
    'git rebase main', 'npm run build', 'pnpm test',
  ];
  const deploy = {
    running: false, over: false, score: 0, combo: 0,
    best: Number(localStorage.getItem('deployrush-best') || 0),
    time: 20, target: '', typed: 0, log: [], flash: 0, options: [],
  };
  window.__deploy = deploy;
  const dchips = document.getElementById('dchips');

  function pickCmd() {
    let next = deploy.target;
    while (next === deploy.target) next = CMDS[(Math.random() * CMDS.length) | 0];
    deploy.target = next;
    deploy.typed = 0;
    if (TOUCH) renderDeployChips();
  }

  // ---- shared scoring (keyboard on desktop, tap-to-match on touch) ----
  function deployBegin() {
    deploy.running = true; deploy.over = false;
    deploy.score = 0; deploy.combo = 0; deploy.time = 20; deploy.log = [];
    blip(520, 780);
    pickCmd();
  }
  function deployHit() {
    deploy.score++; deploy.combo++;
    deploy.time = Math.min(30, deploy.time + Math.max(1.1, 2.4 - deploy.score * 0.05));
    deploy.log.push('✓ ' + deploy.target);
    if (deploy.score > deploy.best) {
      deploy.best = deploy.score;
      localStorage.setItem('deployrush-best', String(deploy.best));
    }
    blip(660, 880);
    pickCmd();
  }
  function deployMiss() {
    deploy.combo = 0;
    deploy.flash = 0.3;
    deploy.time = Math.max(0.4, deploy.time - 0.75);
    blip(170, 110);
  }

  // ---- touch: render the target + 4 decoys as tappable chips ----
  function renderDeployChips() {
    const opts = new Set([deploy.target]);
    while (opts.size < 5) opts.add(CMDS[(Math.random() * CMDS.length) | 0]);
    const arr = [...opts];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    deploy.options = arr;
    dchips.innerHTML = arr.map((c, i) =>
      `<button data-i="${i}">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}</button>`
    ).join('');
  }
  function syncDeployTouchUI() {
    if (!TOUCH || !deployActive) { dchips.hidden = true; return; }
    dchips.hidden = false;
    if (!deploy.running) {
      const label = deploy.over ? '▶ RETRY' : '▶ START';
      dchips.innerHTML = `<button class="dchips__go" data-act="start">${label}</button>`;
    } else {
      renderDeployChips();
    }
  }
  dchips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !deployActive) return;
    if (b.dataset.act === 'start') { deployBegin(); syncDeployTouchUI(); return; }
    if (!deploy.running) return;
    const cmd = deploy.options[+b.dataset.i];
    if (cmd === deploy.target) deployHit(); else deployMiss();
  });

  function drawTerm(t) {
    const W = 1024, H = 640;
    term.fillStyle = '#0a0f16';
    term.fillRect(0, 0, W, H);

    if (deploy.flash > 0) { // typo flash
      term.fillStyle = `rgba(220,60,60,${deploy.flash * 0.9})`;
      term.fillRect(0, 0, W, H);
    }

    term.textBaseline = 'top';
    if (!deploy.running && !deploy.over) {
      // start screen
      term.fillStyle = '#4ade80';
      term.font = '700 72px "Space Grotesk", monospace';
      term.fillText('DEPLOY RUSH', 60, 140);
      term.fillStyle = '#8b95a8';
      term.font = '30px "JetBrains Mono", monospace';
      term.fillText(TOUCH ? 'tap the matching command before prod dies'
                          : 'type the commands before prod goes down', 60, 250);
      term.fillText(`best run: ${deploy.best} deploys`, 60, 300);
      term.fillStyle = '#22d3ee';
      if (Math.sin(t * 4) > -0.2) term.fillText(TOUCH ? '▸ tap START below' : '▸ press ENTER to start', 60, 400);
    } else if (deploy.over) {
      term.fillStyle = '#ef4444';
      term.font = '700 66px "Space Grotesk", monospace';
      term.fillText('PROD IS DOWN', 60, 130);
      term.fillStyle = '#e8eaf2';
      term.font = '34px "JetBrains Mono", monospace';
      term.fillText(`${deploy.score} deploys shipped`, 60, 240);
      term.fillStyle = '#8b95a8';
      term.font = '28px "JetBrains Mono", monospace';
      term.fillText(`best: ${deploy.best}`, 60, 295);
      term.fillStyle = '#22d3ee';
      if (Math.sin(t * 4) > -0.2) term.fillText(TOUCH ? '▸ tap RETRY below' : '▸ ENTER to retry · ESC to leave', 60, 400);
    } else if (TOUCH) {
      // touch running: show the target command to find + HUD
      term.fillStyle = '#4ade80';
      term.font = '700 30px "JetBrains Mono", monospace';
      term.fillText('DEPLOY RUSH', 40, 28);
      term.fillStyle = '#8b95a8';
      term.font = '26px "JetBrains Mono", monospace';
      term.textAlign = 'right';
      term.fillText(`deploys ${deploy.score}   combo ×${deploy.combo}   best ${deploy.best}`, W - 40, 30);
      term.textAlign = 'left';
      const frac = Math.max(0, deploy.time / 30);
      term.fillStyle = 'rgba(255,255,255,0.08)';
      term.fillRect(40, 80, W - 80, 14);
      term.fillStyle = deploy.time > 10 ? '#4ade80' : deploy.time > 5 ? '#fbbf24' : '#ef4444';
      term.fillRect(40, 80, (W - 80) * frac, 14);
      term.fillStyle = '#8b95a8';
      term.font = '28px "JetBrains Mono", monospace';
      term.fillText('deploy this command:', 40, 210);
      term.fillStyle = '#22d3ee';
      term.font = '700 52px "JetBrains Mono", monospace';
      term.fillText(deploy.target, 40, 270);
      term.fillStyle = '#5a6478';
      term.font = '26px "JetBrains Mono", monospace';
      term.fillText('▾ tap the matching chip below', 40, 380);
    } else {
      // HUD row
      term.fillStyle = '#4ade80';
      term.font = '700 30px "JetBrains Mono", monospace';
      term.fillText('DEPLOY RUSH', 40, 28);
      term.fillStyle = '#8b95a8';
      term.font = '26px "JetBrains Mono", monospace';
      term.textAlign = 'right';
      term.fillText(`deploys ${deploy.score}   combo ×${deploy.combo}   best ${deploy.best}`, W - 40, 30);
      term.textAlign = 'left';

      // time bar
      const frac = Math.max(0, deploy.time / 30);
      term.fillStyle = 'rgba(255,255,255,0.08)';
      term.fillRect(40, 80, W - 80, 14);
      term.fillStyle = deploy.time > 10 ? '#4ade80' : deploy.time > 5 ? '#fbbf24' : '#ef4444';
      term.fillRect(40, 80, (W - 80) * frac, 14);

      // log
      term.font = '26px "JetBrains Mono", monospace';
      deploy.log.slice(-6).forEach((line, i) => {
        term.fillStyle = 'rgba(74,222,128,0.4)';
        term.fillText(line, 40, 140 + i * 40);
      });

      // prompt + target
      term.font = '34px "JetBrains Mono", monospace';
      term.fillStyle = '#22d3ee';
      const promptStr = 'kush@prod:~$ ';
      term.fillText(promptStr, 40, 460);
      const px0 = 40 + term.measureText(promptStr).width;
      const done = deploy.target.slice(0, deploy.typed);
      const rest = deploy.target.slice(deploy.typed);
      term.fillStyle = '#4ade80';
      term.fillText(done, px0, 460);
      const doneW = term.measureText(done).width;
      term.fillStyle = '#5a6478';
      term.fillText(rest, px0 + doneW, 460);
      if (Math.sin(t * 7) > 0) {
        term.fillStyle = '#4ade80';
        term.fillRect(px0 + doneW, 458, 18, 40);
      }
    }

    // CRT scanlines
    term.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 0; y < H; y += 4) term.fillRect(0, y, W, 2);
  }

  startDeploy = () => {
    deployActive = true;
    goTo('deploy', hotspots.deploy.view);
    tooltip.classList.remove('is-visible');
    hovered = null;
    canvas.style.cursor = 'default';
    monitor2Mat.map = termTex;
    monitor2Mat.color.set(0xffffff);
    monitor2Mat.needsUpdate = true;
    deploy.running = false;
    deploy.over = false;
    if (TOUCH) document.body.classList.add('deploying');
    syncDeployTouchUI(); // touch: show START button
  };
  endDeploy = () => {
    if (!deployActive) return;
    deployActive = false;
    deploy.running = false;
    deploy.over = false;
    canvas.style.cursor = 'grab';
    dchips.hidden = true;
    document.body.classList.remove('deploying');
    if (m2Tex) { monitor2Mat.map = m2Tex; monitor2Mat.needsUpdate = true; }
  };

  window.addEventListener('keydown', (e) => {
    if (!deployActive || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') return; // global handler exits the game
    if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') e.preventDefault();
    if (e.key === 'Enter') {
      if (!deploy.running) deployBegin();
      return;
    }
    if (!deploy.running || e.key.length !== 1) return;
    if (e.key === deploy.target[deploy.typed]) {
      deploy.typed++;
      if (deploy.typed >= deploy.target.length) deployHit();
    } else {
      deployMiss();
    }
  });

  animatables.push((t, dt) => {
    if (!deployActive) return;
    if (deploy.flash > 0) deploy.flash -= dt;
    if (deploy.running) {
      deploy.time -= dt;
      if (deploy.time <= 0) {
        deploy.time = 0;
        deploy.running = false;
        deploy.over = true;
        blip(300, 150);
        syncDeployTouchUI(); // touch: swap chips → RETRY button
      }
    }
    drawTerm(t);
    termTex.needsUpdate = true;
  });

  /* ---- contact shadows ---- */
  shadowBlob(0.5, -2.5, 1.0, 1.7);   // desk
  shadowBlob(0.5, -1.75, 0.55);      // chair
  shadowBlob(-2.0, -2.75, 0.65, 1.3); // bookcase
  shadowBlob(-2.62, 0.3, 0.75, 1.0); // tv cabinet
  shadowBlob(2.45, 0.4, 0.95, 1.15); // sofa
  shadowBlob(1.05, 0.55, 0.7, 1.3);  // coffee table
  shadowBlob(2.6, -2.55, 0.42);      // potted plant
  shadowBlob(2.7, -0.9, 0.4);        // floor lamp

  finishLoading();
}).catch((err) => {
  console.error(err);
  loaderHint.textContent = 'something failed to load — try refreshing';
});

/* ============ camera views & motion ============ */
const VIEWS = {
  overview: { pos: [5.3, 4.1, 5.6], tgt: [-0.2, 0.7, -0.4] },
};
let curPos = new THREE.Vector3(7, 5.5, 7);
let curTgt = new THREE.Vector3(0, 0.85, 0);
let goalPos = new THREE.Vector3(...VIEWS.overview.pos);
let goalTgt = new THREE.Vector3(...VIEWS.overview.tgt);
let currentView = 'overview';

// drag-to-peek offsets
const peek = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
let dragging = false;
let dragMoved = 0;
let px = 0, py = 0;

// camera zoom (wheel on desktop, pinch on touch)
let zoom = 1, zoomTarget = 1;
const ZOOM_MIN = 0.55, ZOOM_MAX = 1.6;
const activePointers = new Map();
let pinchStartDist = 0, pinchStartZoom = 1, pinching = false;
const pinchDistance = () => {
  const p = [...activePointers.values()];
  return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
};

canvas.addEventListener('pointerdown', (e) => {
  if (gameActive || deployActive) return; // game owns the pointer
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 2) { // second finger → start pinch, cancel drag
    pinching = true; dragging = false;
    pinchStartDist = pinchDistance(); pinchStartZoom = zoomTarget;
  } else {
    dragging = true; dragMoved = 0; px = e.clientX; py = e.clientY;
  }
});
window.addEventListener('pointermove', (e) => {
  if (gameActive || deployActive) return;
  if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinching && activePointers.size === 2) {
    const d = pinchDistance();
    if (pinchStartDist > 0) {
      zoomTarget = THREE.MathUtils.clamp(pinchStartZoom * (pinchStartDist / d), ZOOM_MIN, ZOOM_MAX);
    }
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  px = e.clientX; py = e.clientY;
  peek.tYaw = THREE.MathUtils.clamp(peek.tYaw - dx * 0.002, -0.35, 0.35);
  peek.tPitch = THREE.MathUtils.clamp(peek.tPitch + dy * 0.0015, -0.15, 0.2);
});

// desktop wheel zoom
canvas.addEventListener('wheel', (e) => {
  if (gameActive || deployActive) return;
  e.preventDefault();
  zoomTarget = THREE.MathUtils.clamp(zoomTarget + e.deltaY * 0.0009, ZOOM_MIN, ZOOM_MAX);
}, { passive: false });
function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinching = false;
}
window.addEventListener('pointerup', (e) => {
  const wasTap = dragging && dragMoved < 10 && !pinching;
  dragging = false;
  endPointer(e);
  // touch has no hover, so a tap raycasts fresh at the release point.
  // desktop uses the click handler instead (avoids double-activation).
  if (TOUCH && wasTap && !gameActive && !deployActive && e.target === canvas) {
    activateHotspot(e.clientX, e.clientY);
  }
});
window.addEventListener('pointercancel', endPointer);

const PANEL_VIEWS = ['projects', 'tv', 'trivzy', 'contact'];
function goTo(viewName, view) {
  currentView = viewName;
  zoomTarget = 1; // each view starts at its designed framing
  goalTgt.set(...view.tgt);
  goalPos.set(...view.pos);
  // portrait screens see a narrower slice — pull the camera back
  const portrait = camera.aspect < 0.8;
  const f = portrait ? 1.85 : camera.aspect < 1.1 ? 1.3 : 1;
  goalPos.sub(goalTgt).multiplyScalar(f).add(goalTgt);
  // on portrait, pan the overview right so the wall poster enters the frame
  if (portrait && viewName === 'overview') {
    goalTgt.x += 0.7; goalPos.x += 0.7;
  }
  // on portrait, a bottom-sheet panel covers the lower part of the screen —
  // aim below the object so it rises into the visible top third
  if (portrait && PANEL_VIEWS.includes(viewName)) {
    goalTgt.y -= 1.15;
  }
  peek.tYaw = 0; peek.tPitch = 0;
  if (REDUCED) { curPos.copy(goalPos); curTgt.copy(goalTgt); }
  document.getElementById('rback').hidden = viewName === 'overview';
  document.getElementById('rhint').classList.toggle('is-hidden', viewName !== 'overview');
}

document.getElementById('rback').addEventListener('click', () => {
  endGame();
  endDeploy();
  closePanel();
  goTo('overview', VIEWS.overview);
  blip(620, 380);
});

/* ============ raycast hover / click ============ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tooltip = document.getElementById('rtooltip');
let hovered = null;
let pointerDirty = false;
let lastEvent = null;

window.addEventListener('pointermove', (e) => { lastEvent = e; pointerDirty = true; }, { passive: true });

// raycast at a screen point → hotspot id (or null). Shared by hover + tap.
function pickHotspot(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  // 1) marker hit-spheres first — generous, occlusion-proof targets
  const mh = raycaster.intersectObjects(markerProxies, false);
  if (mh.length) return mh[0].object.userData.hotspot;
  // 2) fall back to the actual object geometry (tapping the object itself)
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    if (markerProxies.includes(h.object)) continue; // invisible, already handled
    let o = h.object;
    while (o && !o.userData.hotspot) o = o.parent;
    if (o && o.userData.hotspot) return o.userData.hotspot;
    if (h.object.isMesh && !h.object.isSprite) break; // solid non-hotspot blocks the ray
  }
  return null;
}

// desktop only: cursor + tooltip follow the pointer over hotspots
function updateHover() {
  if (TOUCH || gameActive || deployActive) return;
  if (!pointerDirty || !lastEvent) return;
  pointerDirty = false;
  const id = pickHotspot(lastEvent.clientX, lastEvent.clientY);
  if (id !== hovered) {
    hovered = id;
    canvas.style.cursor = id ? 'pointer' : 'grab';
    if (id) {
      tooltip.textContent = hotspots[id].label;
      tooltip.classList.add('is-visible');
    } else {
      tooltip.classList.remove('is-visible');
    }
  }
  if (hovered) {
    tooltip.style.left = lastEvent.clientX + 'px';
    tooltip.style.top = lastEvent.clientY + 'px';
  }
}

// activate whatever hotspot is under a click/tap point (works for mouse + touch)
function activateHotspot(clientX, clientY) {
  const id = pickHotspot(clientX, clientY);
  if (!id) return;
  hovered = id;
  const h = hotspots[id];
  if (id === 'lights') { window.__lights.cycle(); return; } // flip the room, stay put
  blip(440, 700);
  if (id === 'toss') { startGame(); return; }
  if (id === 'deploy') { startDeploy(); return; }
  goTo(id, h.view);
  openPanel(id);
  if (id === 'tv' && tvVideo) tvVideo.play().catch(() => {});
}

// desktop mouse click path (touch goes through pointerup tap detection above)
canvas.addEventListener('click', (e) => {
  if (TOUCH || gameActive || deployActive) return;
  if (dragMoved > 8) return; // was a drag, not a click
  activateHotspot(e.clientX, e.clientY);
});

/* ============ info panels ============ */
const panel = document.getElementById('rpanel');
const panelContent = document.getElementById('rpanelContent');
document.getElementById('rpanelClose').addEventListener('click', () => {
  closePanel();
  goTo('overview', VIEWS.overview);
});

const PANELS = {
  projects: `
    <h2>Projects</h2><span class="sub mono">on the monitor: real shipped work</span>
    <ul>
      <li><h3>Trivzy</h3><p>Hostel concierge & ops platform; I built and run all of its tech. Live with 300+ check-ins.</p><a href="https://trivzy.in" target="_blank" rel="noopener">trivzy.in ↗</a></li>
      <li><h3>Luna</h3><p>Desktop AI assistant running LLMs fully on-device (Electron + node-llama-cpp).</p></li>
      <li><h3>CaseFlow</h3><p>50k-row CSV import → validate → fix → track pipeline.</p><a href="https://caseflow-frontend.vercel.app" target="_blank" rel="noopener">live ↗</a></li>
      <li><h3>InoCloud</h3><p>Compliance-grade e-Factura invoicing SaaS for Romania, built from scratch at InoventX.</p></li>
      <li><h3>Meest ops portal</h3><p>Parcel-ops portal with multilingual bulk-import pipeline and Deliveo→Meest sync.</p></li>
    </ul>
    <a class="cta" href="../#projects">browse all projects →</a>`,
  tv: `
    <h2>Walkthroughs</h2><span class="sub mono">now playing on the TV</span>
    <p>Real screen recordings of my builds. Pick a channel:</p>
    <div class="vidbtns" id="vidbtns">
      <button data-src="lookstyle-1" class="is-active">Lookstyle</button>
      <button data-src="caseflow">CaseFlow</button>
      <button data-src="luna">Luna</button>
      <button data-src="tasksphere">TaskSphere</button>
      <button data-src="scrapeandask">Scrape & Ask</button>
    </div>
    <p style="margin-top:1rem">Want sound and full screen? <a href="../#projects">Watch them on the classic site →</a></p>`,
  trivzy: `
    <h2>Trivzy</h2><span class="sub mono">the tech is all mine</span>
    <p>A hostel concierge & operations platform I built end to end. Guests get an AI chatbot, self check-in with document + signature upload, food ordering and vehicle rentals; operators get full admin dashboards.</p>
    <p>Live in production: first hostel onboarded, <strong style="color:#e8eaf2">300+ guest check-ins</strong>. I own every line of the tech.</p>
    <a class="cta" href="https://trivzy.in" target="_blank" rel="noopener">visit trivzy.in ↗</a>`,
  contact: `
    <h2>Contact</h2><span class="sub mono">the phone is always on</span>
    <p>Building something? I ship fast and own the whole stack.</p>
    <ul>
      <li><h3>Email</h3><a href="mailto:rawatkush0704@gmail.com">rawatkush0704@gmail.com</a></li>
      <li><h3>GitHub</h3><a href="https://github.com/KushRawat" target="_blank" rel="noopener">github.com/KushRawat ↗</a></li>
      <li><h3>LinkedIn</h3><a href="https://www.linkedin.com/in/kushrawat" target="_blank" rel="noopener">linkedin.com/in/kushrawat ↗</a></li>
    </ul>`,
};

function openPanel(id) {
  panelContent.innerHTML = PANELS[id] || '';
  panel.hidden = false;
  const btns = document.getElementById('vidbtns');
  if (btns) {
    btns.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-src]');
      if (!b || !tvVideo) return;
      btns.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      tvVideo.src = `../assets/media/${b.dataset.src}.mp4`;
      tvVideo.play().catch(() => {});
    });
  }
}
function closePanel() {
  panel.hidden = true;
  if (tvVideo) tvVideo.pause();
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { endGame(); endDeploy(); closePanel(); goTo('overview', VIEWS.overview); }
});

// bfcache restore can bring the room back mid-exit — reset the doorway
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    document.body.classList.remove('is-leaving');
    goTo('overview', VIEWS.overview);
  }
});

/* ============ exit portal — dolly forward + fade, then navigate ============ */
document.querySelectorAll('.rnav__exit, .rnav__logo').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    if (document.body.classList.contains('is-leaving')) return;
    document.body.classList.add('is-leaving');
    // rush the camera toward whatever it's looking at
    const dir = new THREE.Vector3().copy(curPos).sub(curTgt);
    goalPos.copy(curTgt).addScaledVector(dir, 0.1);
    goalTgt.copy(curTgt);
    setTimeout(() => { location.href = a.getAttribute('href'); }, 750);
  });
});

/* ============ sound (synthesized — no audio files) ============ */
const soundBtn = document.getElementById('rsound');
let audioCtx = null;
let ambGain = null;
let soundOn = true; // on by default — context starts on first user gesture

function blip(f1, f2) {
  if (!soundOn || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(f2, t0 + 0.12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  o.connect(g).connect(audioCtx.destination);
  o.start(t0); o.stop(t0 + 0.22);
}

function startAmbient() { // soft brown-noise room tone
  const len = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    data[i] = (last + 0.02 * w) / 1.02;
    last = data[i];
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer; src.loop = true;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420;
  ambGain = audioCtx.createGain();
  ambGain.gain.value = 0.02;
  src.connect(lp).connect(ambGain).connect(audioCtx.destination);
  src.start();
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startAmbient();
  ambGain.gain.value = soundOn ? 0.02 : 0;
}

function syncSoundBtn() {
  soundBtn.classList.toggle('is-on', soundOn);
  soundBtn.textContent = soundOn ? '♪ sound on' : '♪ sound off';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
}
syncSoundBtn();

// autoplay policy: audio can only start after a user gesture
window.addEventListener('pointerdown', () => { if (soundOn) initAudio(); }, { once: true });

soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  initAudio();
  syncSoundBtn();
  if (ambGain) ambGain.gain.value = soundOn ? 0.02 : 0;
  if (soundOn) blip(520, 780);
});

/* ============ monitor screenshot cycling ============ */
let shotIdx = 0;
setInterval(() => {
  if (!monitorMat || monitorTextures.length === 0) return;
  shotIdx = (shotIdx + 1) % monitorTextures.length;
  monitorMat.map = monitorTextures[shotIdx];
  monitorMat.needsUpdate = true;
}, 2200);

/* ============ loader finish + cinematic intro ============ */
let intro = null;
function finishLoading() {
  document.getElementById('rloader').classList.add('is-done');
  goTo('overview', VIEWS.overview);
  if (!REDUCED) {
    // sweep in low across the room, rising into the overview corner
    curPos.set(1.4, 0.9, 9.4);
    curTgt.set(0.3, 1.1, -2.2);
    intro = { t: 0, p0: curPos.clone(), t0: curTgt.clone() };
  } else {
    curPos.copy(goalPos);
    curTgt.copy(goalTgt);
  }
}
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/* ============ resize / loop ============ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const v = currentView === 'overview' ? VIEWS.overview : hotspots[currentView]?.view;
  if (v) goTo(currentView, v);
});

const clock = new THREE.Clock();
const spherical = new THREE.Spherical();
const camOffset = new THREE.Vector3();

let lastT = 0;
function tick() {
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;

  if (intro) {
    // choreographed sweep: low glide → rise into the overview corner
    intro.t += dt;
    const u = easeInOut(Math.min(1, intro.t / 2.8));
    curPos.lerpVectors(intro.p0, goalPos, u);
    curPos.y += Math.sin(u * Math.PI) * 0.9; // arc over the room
    curTgt.lerpVectors(intro.t0, goalTgt, u);
    if (u >= 1) intro = null;
  } else {
    const ease = REDUCED ? 1 : 0.055;
    curPos.lerp(goalPos, ease);
    curTgt.lerp(goalTgt, ease);
  }

  // apply drag-peek as spherical offset around the target
  peek.yaw += (peek.tYaw - peek.yaw) * 0.08;
  peek.pitch += (peek.tPitch - peek.pitch) * 0.08;
  camOffset.copy(curPos).sub(curTgt);
  spherical.setFromVector3(camOffset);
  spherical.theta += peek.yaw;
  // slow breathing orbit while idle at the overview
  if (currentView === 'overview' && !intro && !REDUCED) {
    spherical.theta += Math.sin(t * 0.12) * 0.035;
  }
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + peek.pitch, 0.35, 1.45);
  zoom += (zoomTarget - zoom) * 0.15;
  spherical.radius *= zoom;
  camOffset.setFromSpherical(spherical);
  camera.position.copy(curTgt).add(camOffset);
  camera.lookAt(curTgt);

  // pulse hotspot markers
  pulses.forEach((s, i) => {
    const k = 0.14 + Math.sin(t * 2.2 + i) * 0.045;
    s.scale.setScalar(k);
    s.material.opacity = currentView === 'overview' ? 0.9 : 0.25;
  });

  // hover glow — violet emissive pulse on the hovered hotspot
  for (const [id, h] of Object.entries(hotspots)) {
    if (!h.glow) continue;
    const on = id === hovered;
    for (const m of h.glow) {
      if (on) {
        m.material.emissive.setHex(0x8b5cf6);
        m.material.emissiveIntensity = 0.35 + Math.sin(t * 6) * 0.15;
      } else if (m.material.emissiveIntensity !== m.userData.baseEmissiveI) {
        m.material.emissive.setHex(m.userData.baseEmissive);
        m.material.emissiveIntensity = m.userData.baseEmissiveI;
      }
    }
  }

  // idle animations (steam, dust, flicker, swivel…)
  for (const fn of animatables) fn(t, dt);

  updateHover();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
