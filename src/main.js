// main.js — glow + arch + camera polish + loader + help panel
const THREE = await import('https://unpkg.com/three@0.159.0/build/three.module.js');
const { OrbitControls } = await import('https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js');
const { GLTFLoader }  = await import('https://unpkg.com/three@0.159.0/examples/jsm/loaders/GLTFLoader.js');

// ----- UI refs -----
const loaderEl = document.getElementById('loader');
const loaderMsg = loaderEl?.querySelector('.msg');
const helpBtn   = document.getElementById('helpBtn');
const helpPanel = document.getElementById('helpPanel');
const helpClose = document.getElementById('helpClose');

// ----- Loading manager -----
const manager = new THREE.LoadingManager(
  () => { // onLoad
    if (!loaderEl) return;
    loaderEl.style.opacity = '0';
    setTimeout(() => loaderEl.style.display = 'none', 300);
  },
  (url, loaded, total) => { if (loaderMsg) loaderMsg.textContent = `Loading ${loaded}/${total}…`; },
  (url) => { console.warn('Failed to load:', url); }
);

// Count stores.json as a load item
manager.itemStart('stores.json');
const STORES = await fetch('/src/stores.json')
  .then(r => r.json())
  .catch(() => [])
  .finally(() => manager.itemEnd('stores.json'));
if (!Array.isArray(STORES) || STORES.length === 0) console.warn('No stores found in /src/stores.json');

// ----- Renderer / Scene / Camera -----
const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.25, 6.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3.4; controls.maxDistance = 7.6;
controls.minPolarAngle = Math.PI * 0.18; controls.maxPolarAngle = Math.PI * 0.48;

// ----- Lights & Floor -----
scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(2,5,3); scene.add(dir);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.9 })
);
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);

// ----- Load GLB arch (optional) -----
let archTemplate = null;
const gltfLoader = new GLTFLoader(manager);
try {
  const glb = await gltfLoader.loadAsync('/assets/models/portal.glb');
  archTemplate = glb.scene || glb.scenes?.[0] || null;
  if (archTemplate) {
    const box = new THREE.Box3().setFromObject(archTemplate);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    archTemplate.scale.setScalar(2.2 / size);
  }
} catch (e) {
  console.warn('portal.glb not found, using procedural arch fallback');
}

// ----- Procedural arch fallback -----
function makeProceduralArch() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.2, roughness: 0.6 });
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 20);
  const left = new THREE.Mesh(legGeo, mat); left.position.set(-0.9, 1.0, 0); g.add(left);
  const right = new THREE.Mesh(legGeo, mat); right.position.set( 0.9, 1.0, 0); g.add(right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.2), mat); top.position.set(0, 2.08, 0); g.add(top);
  return g;
}

// ----- Glow sprite -----
function makeGlowSprite() {
  const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, size*0.05, size/2, size/2, size*0.45);
  grad.addColorStop(0.0, 'rgba(90,107,255,0.35)'); grad.addColorStop(0.5, 'rgba(90,107,255,0.18)'); grad.addColorStop(1.0, 'rgba(90,107,255,0.0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  sp.scale.set(2.6, 2.6, 1); sp.userData.baseScale = 2.6; return sp;
}

// ----- Portals -----
const texLoader = new THREE.TextureLoader(manager);
const group = new THREE.Group(); scene.add(group);
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
let clickable = []; const glows = [];
const hoverMat = new THREE.MeshStandardMaterial({ emissive: 0x5a6bff, emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.6 });

function makeLabel(text) {
  const c = document.createElement('canvas'); c.width=512; c.height=128;
  const ctx = c.getContext('2d'); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#fff'; ctx.font='bold 48px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text, c.width/2, c.height/2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest:false, depthWrite:false, transparent:true, opacity:0.95 }));
  sp.scale.set(1.7, 0.42, 1); return sp;
}

function createFlatCard(store, pos, lookAt) {
  const tex = texLoader.load(store.logo); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mat);
  mesh.position.copy(pos); mesh.lookAt(lookAt);
  mesh.userData = { link: store.link, name: store.name, baseMat: mat };
  group.add(mesh); clickable.push(mesh);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 14),
                               new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
  stand.position.set(pos.x, 0.5, pos.z); scene.add(stand);

  const label = makeLabel(store.name); label.position.copy(pos).add(new THREE.Vector3(0, 0.95, 0)); scene.add(label);
  mesh.userData.label = label;

  mesh.onBeforeRender = () => {
    mesh.position.y = 1.45 + Math.sin(performance.now()/700 + pos.x + pos.z) * 0.05;
    label.position.y = mesh.position.y + 0.95;
  };
  return mesh;
}

function createPortal(store, index, total) {
  const angle = (index / total) * Math.PI * 2;
  const radius = 3.9;
  const pos = new THREE.Vector3(Math.cos(angle)*radius, 1.45, Math.sin(angle)*radius);
  const centerLook = new THREE.Vector3(0, 1.25, 0);

  const card = createFlatCard(store, pos, centerLook);

  const arch = archTemplate ? archTemplate.clone(true) : makeProceduralArch();
  arch.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; } });
  arch.position.set(pos.x, 0, pos.z);
  arch.lookAt(0, 1.2, 0);
  const back = new THREE.Vector3().subVectors(arch.position, centerLook).setLength(0.25);
  arch.position.add(back);
  scene.add(arch);

  const glow = makeGlowSprite();
  glow.position.set(pos.x, 1.35, pos.z);
  const furtherBack = new THREE.Vector3().subVectors(glow.position, centerLook).setLength(0.02);
  glow.position.add(furtherBack);
  scene.add(glow); glows.push(glow);
}

// Top bar grid
const grid = document.getElementById('mallGrid');
STORES.forEach(s => {
  const el = document.createElement('div');
  el.className = 'tile';
  el.innerHTML = `<img src="${s.logo}" alt="${s.name}"/><span>${s.name}</span>`;
  el.onclick = () => window.open(s.link, '_blank');
  grid.appendChild(el);
});

// Build portals
STORES.forEach((s,i) => createPortal(s,i,STORES.length));

// Interactions
let hovered = null;
const rayPick = (x,y) => {
  mouse.x=(x/window.innerWidth)*2-1; mouse.y=-(y/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObjects(clickable,false)[0];
  return hit?hit.object:null;
};
window.addEventListener('pointermove', e => {
  const t = rayPick(e.clientX, e.clientY);
  if (hovered && hovered!==t) { hovered.material = hovered.userData.baseMat; hovered = null; }
  if (t && hovered!==t) { hovered = t; hovered.material = hoverMat; }
});
window.addEventListener('pointerdown', e => {
  const t = rayPick(e.clientX, e.clientY);
  if (t?.userData?.link) window.open(t.userData.link, '_blank');
});

// Help panel
function toggleHelp(force) {
  const set = (v) => helpPanel && (helpPanel.hidden = !v);
  if (typeof force === 'boolean') return set(force);
  set(helpPanel?.hidden ?? true);
}
helpBtn?.addEventListener('click', () => toggleHelp());
helpClose?.addEventListener('click', () => toggleHelp(false));
window.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === '?') toggleHelp();
});

// Resize & loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(function loop(){
  const t = performance.now()*0.0015;
  for (const g of glows) {
    const s = g.userData.baseScale * (1.0 + Math.sin(t)*0.05);
    g.scale.set(s, s, 1);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();
