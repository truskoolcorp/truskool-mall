// main.js — Virtual Mall + GLB Arch Portals
// - CDN modules (no bundler)
// - fetch() for stores.json
// - GLTFLoader for /assets/models/portal.glb
// - hover glow + labels + gentle camera limits

const THREE = await import('https://unpkg.com/three@0.159.0/build/three.module.js');
const { OrbitControls } = await import('https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js');
const { GLTFLoader }  = await import('https://unpkg.com/three@0.159.0/examples/jsm/loaders/GLTFLoader.js');

// ---------- Load store config ----------
const stores = await fetch('/src/stores.json').then(r => r.json()).catch(() => []);
if (!Array.isArray(stores) || stores.length === 0) {
  console.warn('No stores found. Check /src/stores.json');
}

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.3, 6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.2;
controls.maxDistance = 9;
controls.minPolarAngle = Math.PI * 0.15;
controls.maxPolarAngle = Math.PI * 0.48;

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(2, 5, 3);
scene.add(dir);

// ---------- Floor ----------
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------- Load the GLB arch once ----------
let archTemplate = null;
const gltfLoader = new GLTFLoader();
try {
  const glb = await gltfLoader.loadAsync('/assets/models/portal.glb');
  archTemplate = glb.scene || glb.scenes?.[0] || null;

  // optional: normalize scale if model is huge/tiny
  if (archTemplate) {
    const box = new THREE.Box3().setFromObject(archTemplate);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const scale = 2.2 / size; // target approx width
    archTemplate.scale.setScalar(scale);
  }
} catch (e) {
  console.warn('No portal.glb found or failed to load; using flat cards only.', e);
}

// ---------- Portals ----------
const texLoader = new THREE.TextureLoader();
const group = new THREE.Group();
scene.add(group);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickable = [];

const hoverMat = new THREE.MeshStandardMaterial({
  emissive: 0x5a6bff,
  emissiveIntensity: 0.35,
  metalness: 0.1,
  roughness: 0.6
});

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(1.7, 0.42, 1);
  return sp;
}

function createFlatCard(store, pos, lookAt) {
  const tex = texLoader.load(store.logo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mat);
  mesh.position.copy(pos);
  mesh.lookAt(lookAt);
  mesh.userData = { link: store.link, name: store.name, baseMat: mat };
  group.add(mesh);
  clickable.push(mesh);

  // stand
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 1.0, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  );
  stand.position.set(pos.x, 0.5, pos.z);
  scene.add(stand);

  // label
  const label = makeLabel(store.name);
  label.position.copy(pos).add(new THREE.Vector3(0, 0.95, 0));
  scene.add(label);
  mesh.userData.label = label;

  // float
  mesh.onBeforeRender = () => {
    mesh.position.y = 1.45 + Math.sin(performance.now() / 700 + pos.x + pos.z) * 0.05;
    label.position.y = mesh.position.y + 0.95;
  };

  return mesh;
}

function createPortal(store, index, total) {
  const angle = (index / total) * Math.PI * 2;
  const radius = 3.9;
  const pos = new THREE.Vector3(Math.cos(angle) * radius, 1.45, Math.sin(angle) * radius);
  const centerLook = new THREE.Vector3(0, 1.25, 0);

  // Card (click target)
  const card = createFlatCard(store, pos, centerLook);

  // Arch behind card (if available)
  if (archTemplate) {
    const arch = archTemplate.clone(true);
    arch.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; } });
    // place slightly behind the card, facing the center
    arch.position.set(pos.x, 0, pos.z);
    arch.lookAt(0, 1.2, 0);
    // pull back a touch so card sits in front visually
    const back = new THREE.Vector3().subVectors(arch.position, centerLook).setLength(0.25);
    arch.position.add(back);
    scene.add(arch);
  }
}

// ---------- Top bar grid ----------
const grid = document.getElementById('mallGrid');
stores.forEach((s) => {
  const el = document.createElement('div');
  el.className = 'tile';
  el.innerHTML = `<img src="${s.logo}" alt="${s.name}"/><span>${s.name}</span>`;
  el.onclick = () => window.open(s.link, '_blank');
  grid.appendChild(el);
});

// Create portals
stores.forEach((s, i) => createPortal(s, i, stores.length));

// ---------- Interactions ----------
let hovered = null;

function pick(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  return hit ? hit.object : null;
}

window.addEventListener('pointermove', (e) => {
  const target = pick(e.clientX, e.clientY);
  if (hovered && hovered !== target) {
    hovered.material = hovered.userData.baseMat;
    hovered = null;
  }
  if (target && hovered !== target) {
    hovered = target;
    hovered.material = hoverMat;
  }
});

window.addEventListener('pointerdown', (e) => {
  const target = pick(e.clientX, e.clientY);
  if (target?.userData?.link) window.open(target.userData.link, '_blank');
});

// ---------- Resize & loop ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(function tick(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
})();
