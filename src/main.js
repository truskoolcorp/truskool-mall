// Virtual Tru Skool Mall – turnkey
const $ = s => document.querySelector(s);
const loader = $('#loader');
const loaderMsg = $('#loaderMsg');
const chipRow = $('#chipRow');

function showErr(msg){ loaderMsg.textContent = msg; }
function hideLoader(){ loader.classList.add('hide'); }

async function loadThree() {
  const cdnBases = ['https://cdn.jsdelivr.net/npm','https://unpkg.com'];
  const ver = 'three@0.159.0';
  let last;
  for (const base of cdnBases) {
    try {
      const THREE = await import(`${base}/${ver}/build/three.module.js`);
      const OrbitControls = (await import(`${base}/${ver}/examples/jsm/controls/OrbitControls.js`)).OrbitControls;
      const GLTFLoader = (await import(`${base}/${ver}/examples/jsm/loaders/GLTFLoader.js`)).GLTFLoader;
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) { last = e; }
  }
  throw last;
}

function makeTextCanvas(text, color = '#fff') {
  const pad = 12, fs = 42;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `600 ${fs}px system-ui, Segoe UI, Roboto`;
  const w = Math.ceil(g.measureText(text).width) + pad*2;
  const h = fs + pad*2;
  c.width = w; c.height = h;
  g.fillStyle = '#101217'; g.fillRect(0,0,w,h);
  g.fillStyle = color; g.font = `600 ${fs}px system-ui, Segoe UI, Roboto`;
  g.textBaseline = 'top'; g.fillText(text, pad, pad);
  return c;
}

function buildChips(stores){
  chipRow.innerHTML = '';
  for(const s of stores){
    const el = document.createElement('button');
    el.className = 'chip';
    el.innerHTML = `<span class="dot" style="background:${s.color||'#6aa0ff'}"></span><span>${s.name}</span>`;
    el.onclick = () => window.open(s.link, '_blank', 'noopener');
    el.title = s.link;
    chipRow.appendChild(el);
  }
}

async function main(){
  loaderMsg.textContent = 'Loading 3D libraries…';
  let THREE, OrbitControls;
  try {
    ({ THREE, OrbitControls } = await loadThree());
  } catch (e) {
    console.error(e);
    showErr('Error loading 3D libs. Disable ad/script blockers or refresh.');
    return;
  }

  loaderMsg.textContent = 'Loading brands…';
  let stores = [];
  try {
    stores = await fetch('/src/stores.json').then(r => r.json());
  } catch (e) {
    console.error('Failed to load stores.json', e);
    showErr('Could not load brands list (stores.json).');
    return;
  }
  buildChips(stores);

  const canvas = $('#three');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c10);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 7, 16);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minDistance = 6; controls.maxDistance = 28;

  // Lights
  const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x1a1a22, 0.95);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(7, 12, 6);
  dir.castShadow = true; dir.shadow.mapSize.set(2048,2048);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x99bbff, 0.45);
  fill.position.set(-8, 7, -6);
  scene.add(fill);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(36,36,0.25,64,1,false),
    new THREE.MeshStandardMaterial({color:0x14161a, roughness:0.9, metalness:0.1})
  );
  ground.receiveShadow = true; ground.position.y = -0.15;
  scene.add(ground);

  // Portal arch (simple)
  const arch = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x3d4250, metalness: 0.2, roughness: 0.6 });
  const left  = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), m);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), m);
  const top   = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.35), m);
  left.castShadow = right.castShadow = top.castShadow = true;
  left.position.set(-1.2, 1.6, 0); right.position.set(1.2, 1.6, 0); top.position.set(0, 3.1, 0);
  arch.add(left,right,top); arch.position.set(0,0,0);
  scene.add(arch);

  // Brand boards around a ring
  const loaderTex = new THREE.TextureLoader();
  const ringR = 10.5;
  const boardW = 2.6, boardH = 3.2, boardDepth = 0.2;

  const group = new THREE.Group();
  scene.add(group);

  function makeBoardTexture(s){
    const imgUrl = s.logo;
    return new Promise(resolve => {
      loaderTex.load(imgUrl, tex => {
        tex.colorSpace = THREE.SRGBColorSpace; resolve(tex);
      }, undefined, _err => {
        const c = makeTextCanvas(s.name, s.color||'#6aa0ff');
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      });
    });
  }

  const boards = [];
  for (let i=0;i<stores.length;i++){
    const s = stores[i];
    const angle = (i / stores.length) * Math.PI*2 + Math.PI*0.1;
    const x = Math.cos(angle) * ringR;
    const z = Math.sin(angle) * ringR;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(boardW+0.2, boardH+0.2, boardDepth),
      new THREE.MeshStandardMaterial({ color: 0x1b1f28, metalness: 0.3, roughness: 0.6 })
    );
    frame.castShadow = frame.receiveShadow = true;
    frame.position.set(x, 1.8, z);
    frame.lookAt(0, 1.5, 0);
    group.add(frame);

    const tex = await makeBoardTexture(s);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(boardW, boardH),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    screen.position.z = boardDepth*0.52;
    frame.add(screen);

    boards.push({ mesh: frame, store: s });
  }

  // Interactivity
  const raycaster = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (ev)=>{
    v2.x =  (ev.clientX / renderer.domElement.clientWidth) * 2 - 1;
    v2.y = -(ev.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(v2, camera);
    const intersects = raycaster.intersectObjects(group.children, true);
    if (intersects.length){
      const obj = intersects[0].object;
      const node = obj.parent; // frame
      const hit = boards.find(b => b.mesh === node || b.mesh === obj);
      if (hit) window.open(hit.store.link, '_blank', 'noopener');
    }
  });

  // Animate
  function onResize(){
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  hideLoader();
  (function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

main().catch(err => {
  console.error(err);
  showErr('Error starting app (see console)');
});
