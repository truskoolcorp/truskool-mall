// Static mall app — no build step
const sel = (q) => document.querySelector(q);
const showErr = (msg) => { const el = sel('.load-msg'); el.textContent = msg; };

// Load Three from local vendor first, then CDN fallbacks
async function loadThree() {
  const bases = [
    '/vendor/three', // if user drops local libs here later
    'https://unpkg.com/three@0.159.0',
    'https://cdn.jsdelivr.net/npm/three@0.159.0'
  ];
  let last;
  for (const base of bases) {
    try {
      const THREE = await import(`${base}/build/three.module.js`);
      const OrbitControls = await import(`${base}/examples/jsm/controls/OrbitControls.js`);
      return { THREE, OrbitControls };
    } catch (e) { last = e; }
  }
  throw last ?? new Error('CDN blocked');
}

let THREE, OrbitControls;
let renderer, scene, camera, raycaster, mouse, tiles = [];
let STORES = [];

async function start() {
  try {
    ({ THREE, OrbitControls } = await loadThree());
  } catch (e) {
    console.error(e);
    showErr('Error loading 3D libs. Disable ad/script blockers or refresh.');
    throw e;
  }

  // Fetch stores
  try {
    const res = await fetch('/src/stores.json', { cache: 'no-store' });
    STORES = (await res.json()).filter(store => store.logo && store.name && store.link);
  } catch (e) {
    console.error(e);
    showErr('Could not load stores.json'); throw e;
  }

  // Build top chips
  const chipRow = sel('#chipRow');
  chipRow.innerHTML = '';
  for (const s of STORES) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.id = s.id;
    chip.innerHTML = `<div class="dot" style="background:${s.color}"></div><span>${s.name}</span>`;
    chip.onclick = () => window.open(s.link, '_blank');
    chipRow.appendChild(chip);
  }

  // Three.js basics
  const canvas = sel('#three');
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 3.4, 8);
  scene.add(camera);

  // Lights (bright & friendly)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.05);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(3, 6, 4);
  const fill = new THREE.PointLight(0xaabbff, 0.6);
  fill.position.set(-4, 3, -2);
  scene.add(hemi, dir, fill);

  // Ground
  const ggeo = new THREE.CircleGeometry(12, 64);
  const gmat = new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.9, metalness: 0.0 });
  const ground = new THREE.Mesh(ggeo, gmat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // Controls
  const controls = new OrbitControls.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.49;

  // Create brand stands
  const loader = new THREE.TextureLoader();
  const standGroup = new THREE.Group(); scene.add(standGroup);

  const radius = 6.2, tilt = -0.25;
  for (let i = 0; i < STORES.length; i++) {
    const s = STORES[i];
    const angle = (i / STORES.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const tex = loader.load(s.logo);
    tex.colorSpace = THREE.SRGBColorSpace;

    const panelGeo = new THREE.PlaneGeometry(1.6, 1.2, 1, 1);
    const panelMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.0, roughness: 0.95 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(x, 1.2, z);
    panel.rotation.y = -angle + Math.PI / 2;
    panel.rotation.x = tilt;
    panel.userData = { link: s.link, id: s.id, name: s.name };

    // simple stand
    const barMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color).convertSRGBToLinear(), metalness: 0.1, roughness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 16);
    const post = new THREE.Mesh(postGeo, barMat);
    post.position.copy(panel.position).add(new THREE.Vector3(-0.6, -0.8, 0));
    post.rotation.y = panel.rotation.y;

    const post2 = post.clone();
    post2.position.copy(panel.position).add(new THREE.Vector3(0.6, -0.8, 0));

    standGroup.add(panel, post, post2);
    tiles.push(panel);
  }

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  window.addEventListener('pointerdown', onClick);

  // Done loading
  sel('#loader').classList.add('hide');

  function onClick(e){
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(tiles, true)[0];
    if (hit) {
      const { link } = hit.object.userData;
      window.open(link, '_blank');
    }
  }

  // Render loop
  function tick(){
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // Resize
  addEventListener('resize', ()=>{
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

start().catch((e)=>{
  console.error(e);
  showErr('Error starting app (see console)');
});
