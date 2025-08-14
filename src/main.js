<script type="module" src="/src/main.js?v=2"></script>
// STATIC ESM imports (one copy of Three, no CDN, no eval)
import * as THREE from '/vendor/three/three.module.js';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';

// ------- tiny helpers -------
const $ = (sel) => document.querySelector(sel);
const showErr = (msg) => {
  const m = $('#loader .msg');
  if (m) m.textContent = msg;
};

// ------- build top chips from stores.json -------
async function buildChips() {
  const grid = $('#chipRow');
  grid.innerHTML = '';
  let stores = [];
  try {
    const res = await fetch('/src/stores.json', { cache: 'no-store' });
    stores = await res.json();
  } catch (e) {
    console.error(e);
    showErr('Could not load stores.json');
    return stores;
  }

  for (const s of stores) {
    const el = document.createElement('button');
    el.className = 'chip';
    el.setAttribute('data-id', s.id);
    el.innerHTML = `
      <span class="dot" style="background:${s.color ?? '#666'}"></span>
      <span>${s.name}</span>
    `;
    el.onclick = () => window.open(s.link, '_blank', 'noopener');
    grid.appendChild(el);
  }
  return stores;
}

// ------- three.js scene -------
async function boot() {
  // UI
  const loader = $('#loader');
  const canvas = $('#three');
  const chips = await buildChips();

  // renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // scene + camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0f);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 2.2, 6);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.49;

  // ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 128),
    new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.95, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // lighting (bright, mall-like)
  const hemi = new THREE.HemisphereLight(0xbfd3ff, 0x0f1014, 0.8);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(6, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbad2ff, 0.6);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe0b8, 0.55);
  rim.position.set(0, 6, -7);
  scene.add(rim);

  // brand sign factory
  function makeSign({ name, color = '#4b5', x = 0, z = 0, tilt = -0.2 }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);

    // post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x31343a, roughness: 0.9 })
    );
    post.position.set(0, 0.55, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);

    // panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.06),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.05 })
    );
    panel.position.set(0.0, 1.25, 0.0);
    panel.rotation.x = tilt;
    panel.castShadow = true;
    group.add(panel);

    // name sprite
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    label.scale.set(2.4, 0.6, 1);
    label.position.set(0, 2.05, 0);
    group.add(label);

    return group;
  }

  // simple arch portal (GLB)
  const loaderGLB = new GLTFLoader();
  loaderGLB.load(
    '/assets/models/portal.glb',
    (gltf) => {
      const arch = gltf.scene;
      arch.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }});
      arch.position.set(0, 0, 0);
      scene.add(arch);
    },
    undefined,
    (err) => console.warn('Portal model optional:', err?.message || err)
  );

  // lay out signs in a circle
  const R = 5.4;
  chips.forEach((s, i) => {
    const a = (i / Math.max(1, chips.length)) * Math.PI * 2 + Math.PI * 0.2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const g = makeSign({ name: s.name, color: s.color, x, z });
    g.userData.link = s.link;
    scene.add(g);
  });

  // click -> open link
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  function click(e) {
    const bounds = renderer.domElement.getBoundingClientRect();
    v2.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
    v2.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;
    ray.setFromCamera(v2, camera);
    const hits = ray.intersectObjects(scene.children, true);
    const h = hits.find(h => h.object && h.object.parent && h.object.parent.userData.link);
    if (h) window.open(h.object.parent.userData.link, '_blank', 'noopener');
  }
  renderer.domElement.addEventListener('pointerdown', click);

  // resize
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  // animate
  const clock = new THREE.Clock();
  (function tick(){
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    controls.update();
    // subtle rim light pulse
    rim.intensity = 0.45 + Math.sin(t * 0.7) * 0.15;
    renderer.render(scene, camera);
  })();

  // done
  loader?.classList.add('hide');
}

try {
  boot();
} catch (e) {
  console.error(e);
  showErr('Error starting app (see console)');
}
</script>
