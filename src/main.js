/* Virtual Tru Skool Mall (Turnkey Pro)
   - Local vendor/three fallback to CDN
   - Brighter showroom lighting + HDRI (RoomEnvironment)
   - RectAreaLight accents
   - Clickable brand signs & top chips
   - Portal GLB loader (optional)
*/
const elCanvas = document.getElementById('three');
const loader   = document.getElementById('loader');
const loaderMsg= document.getElementById('loaderMsg');
const chipRow  = document.getElementById('chipRow');
function setMsg(t){ if (loaderMsg) loaderMsg.textContent = t; }

async function loadThree() {
  let last;
  try {
    const THREE = await import('/vendor/three/three.module.js');
    const { OrbitControls } = await import('/vendor/three/OrbitControls.js');
    const { GLTFLoader }   = await import('/vendor/three/GLTFLoader.js');
    let RoomEnvironment, RectAreaLightUniformsLib;
    try {
      ({ RoomEnvironment } = await import('/vendor/three/RoomEnvironment.js'));
    } catch {}
    try {
      ({ RectAreaLightUniformsLib } = await import('/vendor/three/RectAreaLightUniformsLib.js'));
    } catch {}
    return { THREE, OrbitControls, GLTFLoader, RoomEnvironment, RectAreaLightUniformsLib, source:'local' };
  } catch(e){ last = e; }

  const base = 'https://unpkg.com/three@0.159.0';
  try {
    const THREE = await import(`${base}/build/three.module.js`);
    const { OrbitControls } = await import(`${base}/examples/jsm/controls/OrbitControls.js`);
    const { GLTFLoader }   = await import(`${base}/examples/jsm/loaders/GLTFLoader.js`);
    const { RoomEnvironment } = await import(`${base}/examples/jsm/environments/RoomEnvironment.js`);
    const { RectAreaLightUniformsLib } = await import(`${base}/examples/jsm/lights/RectAreaLightUniformsLib.js`);
    return { THREE, OrbitControls, GLTFLoader, RoomEnvironment, RectAreaLightUniformsLib, source:base };
  } catch(e){ last = e; }
  throw last ?? new Error('Unable to load three.js');
}

setMsg('Loading 3D libraries…');
const { THREE, OrbitControls, GLTFLoader, RoomEnvironment, RectAreaLightUniformsLib } = await loadThree().catch(err => {
  console.error(err);
  setMsg('Error loading 3D libs. Check ad/script blockers or refresh.');
  throw err;
});
setMsg('Starting…');

// Renderer / Scene / Camera
const renderer = new THREE.WebGLRenderer({ canvas: elCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f13);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 3.6, 9);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 3;
controls.maxDistance = 28;

// Room-like HDRI environment (optional)
let hdriEnabled = false;
let pmrem = null;
function enableHDRI(on){
  if (!RoomEnvironment) return; // not available locally
  if (on && !pmrem){
    pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
    scene.environment = envTex;
    renderer.toneMappingExposure = 1.5;
    hdriEnabled = true;
  } else if (!on && pmrem){
    scene.environment = null;
    renderer.toneMappingExposure = 1.35;
    hdriEnabled = false;
  }
}
window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='h'){ enableHDRI(!hdriEnabled); }});

// Showroom Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a22, 0.85);
hemi.position.set(0, 10, 0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(6, 8, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1; key.shadow.camera.far  = 40;
key.shadow.camera.left=-12; key.shadow.camera.right=12; key.shadow.camera.top=12; key.shadow.camera.bottom=-12;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 1.2);
rim.position.set(-6, 6, -6); scene.add(rim);
const fill = new THREE.PointLight(0xffffff, 0.8, 30);
fill.position.set(0, 3, 0); scene.add(fill);

// RectAreaLight accents (if uniforms lib available)
if (RectAreaLightUniformsLib) {
  RectAreaLightUniformsLib.init();
  const rect1 = new THREE.RectAreaLight(0xffffff, 10, 3.5, 1.2);
  rect1.position.set(0, 3.2, 3.6); rect1.lookAt(0, 1.2, 0);
  const rect2 = new THREE.RectAreaLight(0xffffff, 8, 2.6, 1.0);
  rect2.position.set(-4.0, 2.4, -3.6); rect2.lookAt(0, 1.2, 0);
  scene.add(rect1, rect2);
}

// Lighting presets (L)
const presets = [
  { name:'Night',   amb:.40, hemi:.55, key:1.2, rim:.7, exposure:1.05 },
  { name:'Evening', amb:.65, hemi:.85, key:2.2, rim:1.2, exposure:1.35 },
  { name:'Day',     amb:.90, hemi:1.20,key:3.2, rim:1.6, exposure:1.60 },
];
function applyPreset(p) {
  ambient.intensity = p.amb; hemi.intensity = p.hemi;
  key.intensity = p.key; rim.intensity = p.rim;
  renderer.toneMappingExposure = p.exposure;
}
let presetIndex = 1; applyPreset(presets[presetIndex]);
window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='l'){presetIndex=(presetIndex+1)%presets.length; applyPreset(presets[presetIndex]);}});

// Ground
{
  const geo = new THREE.CircleGeometry(22, 80);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1b21, roughness: 0.9, metalness: 0.0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ringGeo = new THREE.RingGeometry(12, 21.8, 96, 1);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x0f1014, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.002;
  scene.add(ring);
}

// Helpers
function makeLabelSprite(text, color = '#ffffff') {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  roundRect(ctx, 6, 6, canvas.width/scale-12, canvas.height/scale-12, 12, true, true);
  ctx.font = '700 28px system-ui, Segoe UI, Roboto';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width/(scale*2), canvas.height/(scale*2));
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true });
  const sp = new THREE.Sprite(mat); sp.scale.set(2.8, 0.7, 1);
  return sp;
}
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (w<2*r) r = w/2; if (h<2*r) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Load stores.json
let STORES = [];
try {
  const res = await fetch('/src/stores.json', { cache: 'no-store' });
  STORES = await res.json();
} catch {
  STORES = [
    { id:'faithfully-faded', name:'Faithfully Faded', logo:'/assets/images/faithfully-faded.png', color:'#213a8f', link:'https://www.faithfully-faded.com' },
    { id:'concrete-rose',    name:'Concrete Rose',    logo:'/assets/images/concrete-rose.png',    color:'#bb3a45', link:'https://concrete-rose.world' },
    { id:'cafe-sativa',      name:'Café Sativa',      logo:'/assets/images/cafe-sativa.png',      color:'#56a06a', link:'https://cafe-sativa-llc-uzn6.b12sites.com/' }
  ];
}

// Top chips
for (const s of STORES) {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.dataset.id = s.id;
  chip.innerHTML = `<span class="dot" style="background:${s.color||'#6aa0ff'}"></span>${s.name}`;
  chip.onclick = () => window.open(s.link, '_blank', 'noopener');
  chipRow.appendChild(chip);
}

// Signs around ring
const ringRadius = 9.6;
const angleStep = Math.min((Math.PI/180)*30, (Math.PI * 1.4) / Math.max(3, STORES.length));
const startAngle = -((STORES.length-1) * angleStep)/2;
const clickable = [];
const group = new THREE.Group(); scene.add(group);

for (let i=0;i<STORES.length;i++){
  const s = STORES[i];
  const a = startAngle + i*angleStep;
  const x = Math.cos(a) * ringRadius;
  const z = Math.sin(a) * ringRadius;

  const postGeo = new THREE.BoxGeometry(0.12, 1.4, 0.12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3d47, roughness:.7, metalness:.2 });
  const postL = new THREE.Mesh(postGeo, postMat), postR = new THREE.Mesh(postGeo, postMat);
  postL.castShadow = postR.castShadow = true;
  postL.position.set(-0.45, 0.75, 0); postR.position.set(0.45, 0.75, 0);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.12), postMat); cross.position.set(0, 1.5, 0);
  const frame = new THREE.Group(); frame.add(postL, postR, cross);

  const faceGeo = new THREE.PlaneGeometry(1.06, 1.42);
  const color = new THREE.Color(s.color || '#6aa0ff');
  const faceMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.55, metalness: 0.2, emissive: color, emissiveIntensity: 0.13
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 1.1, -0.07); face.castShadow = true; face.receiveShadow = true;

  const label = makeLabelSprite(s.name, '#ffffff'); label.position.set(0, 1.9, 0);

  const sign = new THREE.Group(); sign.add(frame, face, label);
  sign.position.set(x, 0, z); sign.lookAt(0, 1.2, 0);
  sign.userData = { link: s.link, id: s.id };
  group.add(sign); clickable.push(face);
}

// Optional portal
try {
  const l = new GLTFLoader();
  const glb = await l.loadAsync('/assets/models/portal.glb');
  const portal = glb.scene || glb.scenes?.[0];
  if (portal) {
    portal.traverse(o => {
      if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material){ o.material.roughness=0.55; o.material.metalness=0.25; } }
    });
    portal.scale.set(1.1, 1.1, 1.1);
    portal.position.set(0, 0, 0);
    scene.add(portal);
  }
} catch (e) { console.log('Portal GLB not found/loaded. Skipping.'); }

// Clicks
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', (ev)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left)/rect.width)*2 - 1;
  mouse.y = -((ev.clientY - rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickable, true);
  if (hits.length) {
    const obj = hits[0].object; const g = obj.parent?.parent || obj.parent;
    const link = g?.userData?.link; if (link) window.open(link, '_blank', 'noopener');
  }
});

// Resize + animate
function onResize(){ camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', onResize);
(function tick(){ controls.update(); renderer.render(scene, camera); requestAnimationFrame(tick); })();

if (loader) loader.classList.add('hide');
