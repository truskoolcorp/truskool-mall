import * as THREE from '/vendor/three/three.module.js';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
// GLTFLoader import kept for future portals; not required to run
// import { GLTFLoader } from '/vendor/three/GLTFLoader.js';
import { openLink } from '/scripts/open.js';

const sel = (q)=>document.querySelector(q);
const chipRow = sel('#chipRow');
const loaderEl = sel('#loader');
const loaderMsg = sel('#loaderMsg');

// ---- UI: brand chips ----
async function loadStores(){
  const res = await fetch('/src/stores.json', {cache:'no-cache'});
  if (!res.ok) throw new Error('stores.json not found');
  return await res.json();
}
function buildChips(stores){
  chipRow.textContent = '';
  for (const s of stores){
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
    el.onclick = ()=> openLink(s.link);
    chipRow.appendChild(el);
  }
}

// ---- 3D Scene ----
const canvas = sel('#three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);

// Camera
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 3, 9);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);

// Lights — brighter, soft ambient + directional + rim
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const hemi = new THREE.HemisphereLight(0xddeeff, 0x080820, 0.75);
hemi.position.set(0, 4, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.35);
dir.position.set(4, 6, 4);
dir.castShadow = true;
scene.add(dir);

const rim1 = new THREE.SpotLight(0x6aa0ff, .8, 0, Math.PI/7, .25, 1.2);
rim1.position.set(-6, 3, 2);
scene.add(rim1);

const rim2 = new THREE.SpotLight(0xffb86b, .7, 0, Math.PI/7, .25, 1.2);
rim2.position.set(6, 3, -2);
scene.add(rim2);

// Ground (subtle arc + soft gradient)
const g = new THREE.CircleGeometry(30, 64);
const m = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.95, metalness: 0.05 });
const ground = new THREE.Mesh(g, m);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// ---- Sign factory ----
const textureLoader = new THREE.TextureLoader();

function makeSign(store, index, total){
  const group = new THREE.Group();
  const radius = 7;
  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  group.position.set(x, 0, z);
  group.lookAt(0, 1.2, 0);

  // Pedestal
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.0,16), new THREE.MeshStandardMaterial({ color:0x2b2e36, roughness:.8 }));
  pole.position.y = 0.5;
  group.add(pole);

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,0.05), new THREE.MeshStandardMaterial({ color:0x000000 }));
  frame.position.y = 1.3;
  frame.castShadow = true;
  group.add(frame);

  // Board with logo as texture
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.7), new THREE.MeshBasicMaterial({ color:store.color }));
  board.position.set(0, 1.3, 0.028);
  const tex = textureLoader.load(store.logo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.55), new THREE.MeshBasicMaterial({ map:tex, transparent:true }));
  logo.position.set(0, 1.3, 0.031);
  group.add(board, logo);

  // Click to open link
  logo.userData.link = store.link;
  board.userData.link = store.link;
  frame.userData.link = store.link;
  group.userData.link = store.link;

  return group;
}

// Raycaster for clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function onClick(e){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  const hit = hits.find(h => h.object.userData && h.object.userData.link);
  if (hit) openLink(hit.object.userData.link);
}
renderer.domElement.addEventListener('click', onClick);

// Build from stores
let signs = [];
async function init(){
  try{
    loaderMsg.textContent = 'Loading brands…';
    const stores = await loadStores();
    buildChips(stores);
    stores.forEach((s,i)=>{
      const sign = makeSign(s, i, stores.length);
      signs.push(sign);
      scene.add(sign);
    });
    loaderEl.classList.add('hide');
    animate();
  }catch(err){
    console.error(err);
    loaderMsg.textContent = 'Error starting app (check console)';
  }
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
