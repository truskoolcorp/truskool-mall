// ---------- tiny helpers ----------
const $ = (q) => document.querySelector(q);
const loader = $('#loader');
const loaderMsg = $('#loaderMsg');
const chipRow = $('#chipRow');

function showLoader(text) {
  if (text) loaderMsg.textContent = text;
  loader.classList.remove('hide');
}
function hideLoader() {
  loader.classList.add('hide');
}
function errOut(msg) {
  loaderMsg.textContent = msg;
  loader.classList.remove('hide');
  throw new Error(msg);
}

// ---------- robust loader for Three + examples (CDN then local vendor) ----------
async function loadThree() {
  const cdns = [
    'https://unpkg.com',
    'https://cdn.jsdelivr.net/npm'
  ];

  // try CDNs first
  for (const base of cdns) {
    try {
      const THREE         = await import(`${base}/three@0.159.0/build/three.module.js`);
      const OrbitControls = await import(`${base}/three@0.159.0/examples/jsm/controls/OrbitControls.js`);
      const GLTFLoader    = await import(`${base}/three@0.159.0/examples/jsm/loaders/GLTFLoader.js`);
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) { /* try next */ }
  }

  // local vendor fallback (works even with CDN/script blockers)
  try {
    const THREE         = await import('/vendor/three/three.module.js');
    const OrbitControls = await import('/vendor/three/OrbitControls.js');
    const GLTFLoader    = await import('/vendor/three/GLTFLoader.js');
    return { THREE, OrbitControls, GLTFLoader };
  } catch (e) {
    console.error(e);
    errOut('Error loading 3D libs. Check ad/script blockers or refresh.');
  }
}

// ---------- main ----------
showLoader('Initializing 3D…');

const { THREE, OrbitControls, GLTFLoader } = await loadThree();

// renderer
const canvas = $('#three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

// scene / camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0e);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 3.5, 9);

const controls = new OrbitControls.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.6, 0);
controls.minDistance = 3;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.49;

// lighting — balanced & soft
{
  const hemi = new THREE.HemisphereLight(0xbcc6ff, 0x3a3a45, 0.6);
  hemi.position.set(0, 6, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(6, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8bb5ff, 0.35);
  rim.position.set(-6, 5, -6);
  scene.add(rim);

  // faint ground glow
  const amb = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(amb);
}

// floor
{
  const geo = new THREE.CircleGeometry(16, 96);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0e0f13,
    roughness: 0.95,
    metalness: 0.0
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

// portal arch (optional)
(async function () {
  try {
    const loader = new GLTFLoader.GLTFLoader();
    const glb = await loader.loadAsync('/assets/models/portal.glb');
    const root = glb.scene || glb.scenes?.[0];
    if (root) {
      root.traverse(o => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      root.scale.setScalar(1.1);
      root.position.set(0, 0, 0);
      scene.add(root);

      // subtle accent light to sell the look
      const spr = new THREE.SpotLight(0x7aa8ff, 1.2, 20, Math.PI / 6, 0.35, 1.2);
      spr.position.set(0.8, 3.2, 2.2);
      spr.target.position.set(0, 1.4, -0.5);
      spr.castShadow = true;
      scene.add(spr, spr.target);
    }
  } catch (e) {
    console.warn('Portal model optional:', e);
  }
})();

// fetch brands
let STORES = [];
try {
  const res = await fetch('/src/stores.json', { cache: 'no-cache' });
  STORES = await res.json();
} catch (e) {
  console.error(e);
  errOut('Could not load brand data.');
}

// build top chips
function addChip(store) {
  const el = document.createElement('div');
  el.className = 'chip';
  el.dataset.id = store.id;
  el.innerHTML = `<span class="dot" style="background:${store.color || '#6aa0ff'}"></span>${store.name}`;
  el.onclick = () => window.open(store.link, '_blank', 'noopener');
  document.querySelector('#chipRow').appendChild(el);
}
STORES.forEach(addChip);

// 3D brand signs
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickable = []; // meshes to test

async function makeSign(store, angle, radius = 6.2) {
  // position around a circle
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // frame (simple)
  const frame = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2f3b, metalness: 0.1, roughness: 0.85 });
  const barGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
  const legL = new THREE.Mesh(barGeo, mat);
  const legR = new THREE.Mesh(barGeo, mat);
  const top  = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), mat);
  legL.position.set(-0.5, 0.55, 0);
  legR.position.set( 0.5, 0.55, 0);
  top.position.set(0, 1.1, 0);
  [legL, legR, top].forEach(m => { m.castShadow = true; m.receiveShadow = true; frame.add(m); });

  // panel – try logo texture, else styled text canvas
  let panelMat;
  try {
    const tex = await new THREE.TextureLoader().loadAsync(store.logo);
    tex.colorSpace = THREE.SRGBColorSpace;
    panelMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.75, metalness: 0.05
    });
  } catch {
    // text fallback
    const W = 512, H = 640;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#1d2230'; g.fillRect(0,0,W,H);
    g.fillStyle = '#ffffff';
    g.font = '700 60px system-ui, Segoe UI, Arial';
    g.textAlign='center'; g.textBaseline='middle';
    g.fillText(store.name, W/2, H/2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    panelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.05 });
  }

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), panelMat);
  panel.position.set(0, 1.0, 0);
  panel.castShadow = true; panel.receiveShadow = true;
  frame.add(panel);

  // glow / key light for panel
  const spot = new THREE.SpotLight(0x9db8ff, 0.7, 8, Math.PI / 5, 0.35, 1.2);
  spot.position.set(0, 2.5, 1.8);
  spot.target = panel;
  spot.castShadow = true;
  frame.add(spot);

  // orient towards center
  frame.position.set(x, 0, z);
  frame.lookAt(0, 1, 0);

  frame.userData.id = store.id;
  frame.userData.link = store.link;
  clickable.push(panel);

  scene.add(frame);
}

const TWO_PI = Math.PI * 2;
for (let i = 0; i < STORES.length; i++) {
  const angle = (i / STORES.length) * TWO_PI + Math.PI * 0.1;
  await makeSign(STORES[i], angle);
}

// pointer picking
renderer.domElement.addEventListener('pointerdown', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(clickable, true)[0];
  if (hit) {
    let g = hit.object;
    while (g && !g.userData.link && g.parent) g = g.parent;
    const url = g?.userData?.link;
    if (url) window.open(url, '_blank', 'noopener');
  }
});

// resize
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// animate
hideLoader();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
