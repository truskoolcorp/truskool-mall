// src/main.js — local-only imports (no CDNs)
import * as THREE from '/vendor/three/three.module.js';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';

// ---------- tiny helpers ----------
const $ = (s) => document.querySelector(s);
const loader = $('#loader');
const msg = $('#loaderMsg');
const say = (t) => { if (msg) msg.textContent = t; console.log('[mall]', t); };
const done = () => loader?.classList.add('hide');

// Surface unhandled errors on screen too:
window.addEventListener('error', (e) => { say(`Error: ${e.message}`); });
window.addEventListener('unhandledrejection', (e) => { say(`Error: ${e.reason}`); });

// ---------- renderer / scene ----------
say('Booting renderer…');
const canvas = $('#three');
if (!canvas) throw new Error('Canvas #three not found');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0f);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.4, 8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI * 0.49;

// ---------- lighting ----------
say('Adding lights…');
scene.add(new THREE.HemisphereLight(0xddeeff, 0x0b0b10, 0.6));

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(5, 8, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);

const rim = new THREE.SpotLight(0x6aa0ff, 0.8, 20, Math.PI / 6, 0.4, 1.5);
rim.position.set(-6, 6, -2);
rim.target.position.set(0, 1.3, 0);
rim.castShadow = true;
scene.add(rim, rim.target);

// ---------- ground ----------
const g = new THREE.Mesh(
  new THREE.CircleGeometry(20, 96),
  new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.95 })
);
g.rotation.x = -Math.PI / 2;
g.receiveShadow = true;
scene.add(g);

// ---------- optional portal ----------
say('Loading portal (optional)…');
const gltf = new GLTFLoader();
gltf.load('/assets/models/portal.glb',
  (res) => {
    const m = res.scene;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    scene.add(m);
  },
  undefined,
  (err) => console.warn('Portal not loaded (ok during setup):', err)
);

// ---------- UI chips ----------
function buildChips(stores) {
  const row = $('#mallGrid');
  row.innerHTML = '';
  for (const s of stores) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.id = s.id;
    el.innerHTML = `<span class="dot" style="background:${s.color || '#6aa0ff'}"></span>${s.name}`;
    el.onclick = () => window.open(s.link, '_blank', 'noopener');
    row.appendChild(el);
  }
}

// ---------- 3D brand boards ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickable = [];

function addBoards(stores) {
  const R = 6, Y = 1.5;
  stores.forEach((s, i) => {
    const t = (i / stores.length) * Math.PI * 1.3 - 0.65 * Math.PI;
    const x = Math.cos(t) * R, z = Math.sin(t) * R;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.75 })
    );
    pole.castShadow = true;
    pole.position.set(x, 0.6, z);
    scene.add(pole);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.5, 0.06),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color || '#4a5a7d') })
    );
    board.position.set(x, Y, z);
    board.lookAt(0, Y, 0);
    board.castShadow = true;
    board.userData = { link: s.link };
    scene.add(board);
    clickable.push(board);
  });
}

canvas.addEventListener('pointerdown', (ev) => {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(clickable, false)[0];
  if (hit?.object?.userData?.link) window.open(hit.object.userData.link, '_blank', 'noopener');
});

// ---------- data ----------
async function getStores() {
  say('Fetching stores.json…');
  const res = await fetch('/src/stores.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`/src/stores.json ${res.status}`);
  return res.json();
}

// ---------- loop / resize ----------
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------- boot ----------
(async () => {
  try {
    const stores = await getStores();
    say('Building UI + boards…');
    buildChips(stores);
    addBoards(stores);
    say('Starting render…');
    done();
    tick();
  } catch (e) {
    console.error(e);
    say(`Error loading mall: ${e.message}`);
  }
})();
