// Static ESM imports from local vendor folder (no CDN, no eval)
import * as THREE from '/vendor/three/build/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader   } from '/vendor/three/examples/jsm/loaders/GLTFLoader.js';

// ---- helpers ----
const $  = (sel) => document.querySelector(sel);
const ui = {
  loader: $('#loader'),
  msg:    $('#loader .msg'),
  chips:  $('#chipRow'),
};

// ---- load stores + build UI chips ----
let STORES = [];
try {
  STORES = await (await fetch('/src/stores.json', { cache:'no-cache' })).json();
} catch (e) {
  console.error(e);
  ui.msg.textContent = 'Error loading stores.json';
  throw e;
}
for (const s of STORES) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.setAttribute('data-id', s.id);
  chip.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.name}`;
  chip.onclick = () => window.open(s.link, '_blank', 'noopener');
  ui.chips.appendChild(chip);
}

// ---- 3D setup ----
const canvas   = $('#three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0, 3.2, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.5;
controls.target.set(0, 1.4, 0);

// Lights – bright enough out of the box
const hemi = new THREE.HemisphereLight(0xaac8ff, 0x202020, 0.75);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
keyLight.position.set(5, 8, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far  = 30;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x88aaff, 0.8);
rimLight.position.set(-4, 7, -6);
scene.add(rimLight);

// Ground
{
  const g = new THREE.CircleGeometry(30, 64);
  g.rotateX(-Math.PI/2);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0f1014),
    roughness: 0.95, metalness: 0.0
  });
  const ground = new THREE.Mesh(g, m);
  ground.receiveShadow = true;
  scene.add(ground);
}

// Optional portal model (fallback to frame)
async function addPortal() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  scene.add(group);

  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/models/portal.glb');
    const node = gltf.scene || gltf.scenes?.[0];
    node.traverse((o)=>{ o.castShadow = true; o.receiveShadow = true; });
    node.position.set(0,0,0);
    group.add(node);
    return group;
  } catch {
    // fallback frame
    const geo = new THREE.BoxGeometry(0.15, 2.4, 0.15);
    const mat = new THREE.MeshStandardMaterial({ color: 0x80838f, metalness: 0.35, roughness: 0.45 });
    const left  = new THREE.Mesh(geo, mat);
    const right = new THREE.Mesh(geo, mat);
    const top   = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.15), mat);
    left.position.set(-0.8, 1.2, 0);
    right.position.set(0.8, 1.2, 0);
    top.position.set(0, 2.28, 0);
    for (const m of [left,right,top]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
    return group;
  }
}
await addPortal();

// Branded “signs” around a ring
function makeSign(store, radius, i, total) {
  const group = new THREE.Group();
  const ang = i / total * Math.PI * 2 + Math.PI * 0.1;
  group.position.set(Math.cos(ang)*radius, 0, Math.sin(ang)*radius);
  group.lookAt(0, 1.4, 0);

  // post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,1.2,16),
                 new THREE.MeshStandardMaterial({color:0x2a2d33, roughness:.8}));
  post.position.set(0, 0.6, 0);
  post.castShadow = true; post.receiveShadow = true;
  group.add(post);

  // panel
  const plane = new THREE.PlaneGeometry(1.2, 1.5, 1, 1);
  const mat   = new THREE.MeshStandardMaterial({ color: new THREE.Color(store.color), roughness:.6, metalness:.05 });
  const panel = new THREE.Mesh(plane, mat);
  panel.position.set(0, 1.6, 0);
  panel.castShadow = true; panel.receiveShadow = true;
  group.add(panel);

  // label sprite (so it’s crisp)
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(store.name) }));
  label.scale.set(1.5, 0.4, 1);
  label.position.set(0, 2.4, 0.02);
  group.add(label);

  // click to open
  panel.userData.url = store.link;
  panel.cursor = 'pointer';

  // a soft “glow” light
  const glow = new THREE.PointLight(new THREE.Color(store.color), 0.8, 4, 2);
  glow.position.set(0, 1.7, 0.8);
  group.add(glow);

  return group;
}

function makeLabelTexture(text) {
  const c = document.createElement('canvas');
  const s = 512; c.width = s; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0,0,s,128);
  ctx.font = '700 64px system-ui,Segoe UI,Roboto';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 6;
  ctx.strokeText(text, s/2, 64);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, s/2, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ringRadius = 6;
STORES.forEach((s, i) => scene.add(makeSign(s, ringRadius, i, STORES.length)));

// Raycast clicks
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function onClick(e){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width ) * 2 - 1;
  mouse.y = -((e.clientY - rect.top ) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(scene.children, true);
  const hit = hits.find(h => h.object.userData?.url);
  if (hit) window.open(hit.object.userData.url, '_blank', 'noopener');
}
window.addEventListener('click', onClick);

// Resize
function onResize(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// Render loop
function tick(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
ui.loader.classList.add('hide');
tick();
