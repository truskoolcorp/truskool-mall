// src/main.js
const $ = (s)=>document.querySelector(s);
const loader = $('#loader'); const loaderMsg = $('#loaderMsg');
const say = (t)=>{ if(loaderMsg) loaderMsg.textContent = t; console.log('[Mall]', t); };
const hideLoader = ()=> loader?.classList.add('hide');

async function loadThree() {
  const tries = [
    '/vendor/three/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js',
    'https://unpkg.com/three@0.159.0/build/three.module.js'
  ];
  let last;
  for (const src of tries) {
    try {
      say(`Loading three from ${src.includes('http')?'CDN':'local'}…`);
      const THREE = await import(/* @vite-ignore */ src);
      const OrbitControls = (await import(src.replace('build/three.module.js','examples/jsm/controls/OrbitControls.js')
                                             .replace('/three.module.js','/examples/jsm/controls/OrbitControls.js'))).OrbitControls;
      const GLTFLoader = (await import(src.replace('build/three.module.js','examples/jsm/loaders/GLTFLoader.js')
                                         .replace('/three.module.js','/examples/jsm/loaders/GLTFLoader.js'))).GLTFLoader;
      return { THREE, OrbitControls, GLTFLoader };
    } catch(e){ last = e; console.warn('Three load failed from', src, e); }
  }
  throw last ?? new Error('Three.js could not be loaded');
}

let THREE, OrbitControls, GLTFLoader;
try {
  const mods = await loadThree();
  THREE = mods.THREE; OrbitControls = mods.OrbitControls; GLTFLoader = mods.GLTFLoader;
} catch (e) {
  say('Error loading 3D libs. Check ad/script blockers or refresh.');
  console.error(e);
  throw e;
}

say('Booting three.js…');

const canvas = $('#three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0, 2.4, 9);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI*0.49;

scene.add(new THREE.HemisphereLight(0xdfefff, 0x0b0b10, .55));

const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(6,8,4); key.castShadow = true; key.shadow.mapSize.set(1024,1024);
scene.add(key);

const fill = new THREE.SpotLight(0x6aa0ff, .65, 30, Math.PI/5, .35, 1.3);
fill.position.set(-6,6,-3); fill.target.position.set(0,1.3,0); fill.castShadow = true;
scene.add(fill, fill.target);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(26, 100),
  new THREE.MeshStandardMaterial({ color: 0x101219, roughness:.95 })
);
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

const clickable = [];
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
canvas.addEventListener('pointerdown', (ev)=>{
  mouse.x = (ev.clientX/innerWidth)*2-1;
  mouse.y = -(ev.clientY/innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(clickable, false)[0];
  if (hit?.object?.userData?.link) window.open(hit.object.userData.link, '_blank', 'noopener');
});

function makeLabelTexture(text, color='#ffffff'){
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const pad=12; const fs=28; ctx.font = `700 ${fs}px system-ui,Segoe UI,Arial`;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2;
  const h = fs + pad*2; c.width = w; c.height = h;
  ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#00000030'; ctx.fillRect(0,h-6,w,6);
  ctx.fillStyle = color; ctx.font = `700 ${fs}px system-ui,Segoe UI,Arial`;
  ctx.textBaseline='top'; ctx.fillText(text, pad, pad-2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addBrandBoard({ name, logo, color='#6aa0ff', link }, i, total){
  const R=10, H=1.6;
  const t = (i/total)*Math.PI*1.3 - 0.65*Math.PI;
  const x = Math.cos(t)*R, z = Math.sin(t)*R;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(.06, .06, 1.25, 16),
    new THREE.MeshStandardMaterial({ color:0x2a2f35, roughness:.75 })
  );
  pole.position.set(x, .625, z);
  pole.castShadow = true; scene.add(pole);

  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness:.4, metalness:.1 });
  if (logo){
    loader.load(logo, (tex)=>{
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
    });
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, .08), mat);
  board.position.set(x, H, z);
  board.lookAt(0, H, 0);
  board.castShadow = true;
  board.userData = { link };
  scene.add(board);
  clickable.push(board);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(name, '#ffffff') }));
  sprite.position.copy(board.position).add(new THREE.Vector3(0, 1.0, 0));
  sprite.scale.set(2.4, .6, 1);
  scene.add(sprite);

  const glow = new THREE.PointLight(new THREE.Color(color).multiplyScalar(0.6), .7, 5);
  glow.position.copy(board.position).add(new THREE.Vector3(0, .9, .6));
  scene.add(glow);
}

async function getStores(){
  const res = await fetch('/src/stores.json', { cache:'no-store' });
  if (!res.ok) throw new Error(`stores.json ${res.status}`);
  return res.json();
}

function buildChips(stores){
  const row = document.getElementById('mallGrid');
  row.innerHTML = '';
  for (const s of stores){
    const el = document.createElement('div');
    el.className='tile';
    el.innerHTML = `<span class="dot" style="background:${s.color||'#6aa0ff'}"></span>${s.name}`;
    el.onclick = ()=> window.open(s.link, '_blank', 'noopener');
    row.appendChild(el);
  }
}

function onResize(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

function loop(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

(async ()=>{
  try{
    say('Fetching stores…');
    const stores = await getStores();
    buildChips(stores);
    stores.forEach((s,i)=> addBrandBoard(s,i,stores.length));

    const gltf = new GLTFLoader();
    gltf.load('/assets/models/portal.glb',
      (g)=>{ g.scene && scene.add(g.scene); },
      undefined,
      (e)=> console.warn('Portal not found (ok)', e.message||e)
    );

    hideLoader();
    loop();
  }catch(e){
    say(`Error: ${e.message}`);
    console.error(e);
  }
})();
