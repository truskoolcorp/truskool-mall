// src/main.js
/* Mall runtime – robust module loader + brighter lighting + fallbacks */

const $ = sel => document.querySelector(sel);
const loader = $('#loader');
const loaderMsg = $('#loaderMsg');
const chipRow = $('#chipRow');

function showErr(msg) { loaderMsg.textContent = msg; }
function hideLoader() { loader.style.display = 'none'; }

/** Load three.js from local vendor first; then CDN fallbacks if needed */
async function loadThree() {
  const tryLocal = async () => {
    // With import map in index.html, vendor add-ons that import 'three' will resolve
    const THREE = await import('/vendor/three/three.module.js');
    const { OrbitControls } = await import('/vendor/three/OrbitControls.js');
    const { GLTFLoader }   = await import('/vendor/three/GLTFLoader.js');
    return { THREE, OrbitControls, GLTFLoader };
  };

  const ver = '0.159.0';
  const fromCdn = base => async () => {
    const THREE = await import(`${base}/three@${ver}/build/three.module.js`);
    const { OrbitControls } = await import(`${base}/three@${ver}/examples/jsm/controls/OrbitControls.js`);
    const { GLTFLoader }   = await import(`${base}/three@${ver}/examples/jsm/loaders/GLTFLoader.js`);
    return { THREE, OrbitControls, GLTFLoader };
  };

  const attempts = [
    tryLocal,
    fromCdn('https://cdn.jsdelivr.net/npm'),
    fromCdn('https://unpkg.com')
  ];

  let last;
  for (const fn of attempts) {
    try { return await fn(); }
    catch (e) { last = e; }
  }
  throw last;
}

/** Draw a simple text texture as a fallback if a logo image is missing */
function makeTextCanvas(text, color = '#fff') {
  const pad = 12, fs = 42;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `600 ${fs}px system-ui, Segoe UI, Roboto`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = fs + pad * 2;
  c.width = w; c.height = h;
  g.fillStyle = '#101217'; g.fillRect(0,0,w,h);
  g.fillStyle = color; g.font = `600 ${fs}px system-ui, Segoe UI, Roboto`;
  g.textBaseline = 'top'; g.fillText(text, pad, pad);
  return c;
}

/** Build chips at top */
function buildChips(stores) {
  chipRow.innerHTML = '';
  for (const s of stores) {
    const el = document.createElement('button');
    el.className = 'chip';
    el.innerHTML = `<span class="dot" style="background:${s.color||'#6aa0ff'}"></span><span>${s.name}</span>`;
    el.onclick = () => window.open(s.link, '_blank', 'noopener');
    el.title = s.link;
    chipRow.appendChild(el);
  }
}

/** 3D scene */
async function main() {
  loaderMsg.textContent = 'Loading 3D libraries…';
  let THREE, OrbitControls, GLTFLoader;
  try {
    ({ THREE, OrbitControls, GLTFLoader } = await loadThree());
  } catch (e) {
    console.error('Failed to load three.js libs', e);
    showErr('Error loading 3D libs. Disable ad/script blockers or refresh.');
    return;
  }

  loaderMsg.textContent = 'Loading brands…';
  const stores = await fetch('/src/stores.json').then(r => r.json());
  buildChips(stores);

  // Renderer
  const canvas = $('#three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene & camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c10);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6.5, 16);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minDistance = 6; controls.maxDistance = 28;

  // Lights — brighter, soft-shadowed
  const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x1a1a22, 0.85);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(7, 12, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 1; dir.shadow.camera.far = 50;
  scene.add(dir);

  const rect = new THREE.RectAreaLight(0xcfe1ff, 7, 12, 6);
  rect.position.set(0, 7, 9); rect.lookAt(0, 0, 0); // soft frontal fill
  scene.add(rect);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(36, 36, 0.25, 64, 1, false),
    new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.1, roughness: 0.9 })
  );
  ground.receiveShadow = true;
  ground.position.y = -0.15;
  scene.add(ground);

  // Simple portal arch
  const arch = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x3d4250, metalness: 0.2, roughness: 0.6 });
  const left  = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), m);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), m);
  const top   = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 0.35), m);
  left.castShadow = right.castShadow = top.castShadow = true;
  left.position.set(-1.25, 1.6, 0); right.position.set(1.25, 1.6, 0); top.position.set(0, 3.2, 0);
  arch.add(left, right, top);
  arch.position.set(0, 0, 0);
  scene.add(arch);

  // Brand signs laid around a ring
  const ringR = 12, tileW = 2.8, tileH = 3.8;
  const tileGeom = new THREE.BoxGeometry(tileW, tileH, 0.2);
  const loaderTex = new THREE.TextureLoader();

  const clickable = [];
  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    const deg = (i / stores.length) * Math.PI * 2 + Math.PI * 0.05;
    const x = Math.cos(deg) * ringR;
    const z = Math.sin(deg) * ringR;
    const face = new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: .3, roughness: .7 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x0e1014 });
    const mats = [edge, edge, edge, edge, face, edge];

    // Try to load a logo; if missing, synthesize a text texture
    let tex;
    try {
      tex = await new Promise((res, rej) => {
        loaderTex.load(s.logo, t => res(t), undefined, () => rej());
      });
    } catch (_) {
      const c = makeTextCanvas(s.name, s.color || '#fff');
      tex = new TH
