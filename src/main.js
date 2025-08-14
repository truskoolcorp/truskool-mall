import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const elCanvas = document.getElementById('three');
const elLoader = document.getElementById('loader');
const elLoaderMsg = document.getElementById('loaderMsg');
const elChipRow = document.getElementById('chipRow');

// ---------- load data ----------
async function loadStores() {
  const res = await fetch('/src/stores.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load stores.json');
  return res.json();
}

// ---------- three setup ----------
const renderer = new THREE.WebGLRenderer({ canvas: elCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0d, 0.03);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5.5, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 22;
controls.minDistance = 6;
controls.minPolarAngle = Math.PI * 0.23;
controls.maxPolarAngle = Math.PI * 0.52;

// lights
{
  const hemi = new THREE.HemisphereLight(0x8796ff, 0x0c0c10, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(6, 10, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  scene.add(dir);
}

// ground (smooth dark disc)
{
  const geo = new THREE.CircleGeometry(22, 96);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.85, metalness: 0.02 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // subtle rings
  const ringGeo = new THREE.RingGeometry(10.8, 11, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x15151b, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.001;
  scene.add(ring);
}

// utilities
const loader = new THREE.TextureLoader();
function loadTexture(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function roundedRectShape(w, h, r){
  const s = new THREE.Shape();
  const x = -w/2, y = -h/2;
  s.moveTo(x+r, y);
  s.lineTo(x+w-r, y);
  s.quadraticCurveTo(x+w, y, x+w, y+r);
  s.lineTo(x+w, y+h-r);
  s.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  s.lineTo(x+r, y+h);
  s.quadraticCurveTo(x, y+h, x, y+h-r);
  s.lineTo(x, y+r);
  s.quadraticCurveTo(x, y, x+r, y);
  return s;
}

function makeSign({ name, logo, color }){
  const group = new THREE.Group();

  // panel (extruded rounded rect)
  const W=2.2, H=3, R=0.25, D=0.25;
  const shape = roundedRectShape(W, H, R);
  const extrude = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 24 });
  extrude.translate(0, 0, -D/2);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x1c1f2a, roughness: 0.6, metalness: 0.15 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.5, metalness: 0.3 });
  const panel = new THREE.Mesh(extrude, [edgeMat, faceMat]);
  panel.castShadow = true; panel.receiveShadow = true;
  group.add(panel);

  // logo texture on a slightly inset plane
  const planeGeo = new THREE.PlaneGeometry(W*0.92, H*0.9);
  const planeMat = new THREE.MeshBasicMaterial({ transparent: true });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.position.z = 0.01;
  group.add(plane);

  // pole
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 16);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.9 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0, -2.6, 0.3);
  pole.castShadow = true; pole.receiveShadow = true;
  group.add(pole);

  // name sprite (always faces camera)
  const label = makeLabel(name);
  label.position.set(0, H/2 + 0.6, 0);
  group.add(label);

  // soft coloured point light near sign
  const pt = new THREE.PointLight(new THREE.Color(color), 0.75, 8, 2);
  pt.position.set(0.5, 0.6, 1.2);
  group.add(pt);

  // load logo texture
  loadTexture(logo).then(tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    planeMat.map = tex;
    planeMat.needsUpdate = true;
  });

  // store click target
  group.userData.clickable = true;
  group.userData.name = name;
  return group;
}

function makeLabel(text){
  const padX = 24, padY = 10;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = '700 24px system-ui, Segoe UI, Roboto';
  const mw = Math.max(140, ctx.measureText(text).width + padX*2);
  const mh = 42 + padY*2;
  ctx.canvas.width = mw; ctx.canvas.height = mh;
  // background panel
  ctx.fillStyle = 'rgba(10,12,18,.85)';
  roundRect(ctx, 0, 0, mw, mh, 12); ctx.fill();
  // text
  ctx.fillStyle = '#ffffff'; ctx.font = '700 24px system-ui, Segoe UI, Roboto';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, mw/2, mh/2);
  const tex = new THREE.CanvasTexture(ctx.canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(sprMat);
  const scale = 0.012; spr.scale.set(mw*scale, mh*scale, 1);
  return spr;
}
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// raycaster for clicks / hover
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoverObj = null;

function onPointerMove(e){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}
function onClick(){
  if (!hoverObj) return;
  const url = hoverObj.userData?.url;
  if (url) window.open(url, '_blank');
}

renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('click', onClick);

// build chips
function renderChips(stores){
  elChipRow.innerHTML = '';
  for (const s of stores){
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.id = s.id;
    chip.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
    chip.onclick = () => window.open(s.link, '_blank');
    elChipRow.appendChild(chip);
  }
}

// place items in a circle
function layoutCircle(stores){
  const radius = 11;
  const y = 1.2;
  const step = (Math.PI * 1.2) / (stores.length - 1 || 1);
  const start = -Math.PI * 0.6;
  return stores.map((s, i) => {
    const a = start + i * step;
    return new THREE.Vector3(Math.cos(a)*radius, y, Math.sin(a)*radius);
  });
}

// optional portal (if exists)
async function tryLoadPortal(){
  try {
    const url = '/assets/models/portal.glb';
    // HEAD check by attempting a fetch of first bytes
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return;
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(url, gltf => {
        const obj = gltf.scene;
        obj.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
        obj.position.set(0, 0, 0);
        scene.add(obj);
        resolve(obj);
      }, undefined, reject);
    });
  } catch { /* no portal file - ignore */ }
}

// main
(async function init(){
  try{
    elLoaderMsg.textContent = 'Loading brands…';
    const STORES = await loadStores();
    renderChips(STORES);

    // positions + create signs
    const positions = layoutCircle(STORES);
    STORES.forEach((s, i) => {
      const sign = makeSign(s);
      sign.position.copy(positions[i]);
      sign.lookAt(0, 1.4, 0);
      sign.userData.url = s.link;
      scene.add(sign);
    });

    // portal (optional)
    elLoaderMsg.textContent = 'Building scene…';
    await tryLoadPortal();

    elLoader.classList.add('hide');
    animate();
  } catch (err){
    console.error(err);
    elLoaderMsg.textContent = 'Error starting app (see console)';
  }
})();

function animate(){
  requestAnimationFrame(animate);

  // hover hit test
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true).filter(h => h.object.parent?.userData?.clickable || h.object.userData?.clickable);
  const newHover = hits.length ? (hits[0].object.parent?.userData?.clickable ? hits[0].object.parent : hits[0].object) : null;
  if (newHover !== hoverObj){
    if (hoverObj){ hoverObj.scale.set(1,1,1); }
    hoverObj = newHover;
    if (hoverObj){ hoverObj.scale.set(1.03, 1.03, 1.03); }
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
