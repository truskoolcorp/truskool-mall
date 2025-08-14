// --- Pure ESM, no bundler, CDN modules only (no local vendor paths) ---
import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';

// UI helpers
const $ = (s) => document.querySelector(s);
const loader = $('#loader');
const loadMsg = $('#loadMsg');
const chips = $('#chips');

function hideLoader() {
  loader.style.opacity = '0';
  loader.style.visibility = 'hidden';
  loader.style.transition = 'opacity .25s ease';
  setTimeout(() => (loader.style.display = 'none'), 300);
}

// Fetch stores (fall back to inline defaults if fetch fails)
async function getStores() {
  try {
    const res = await fetch('/src/stores.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('stores.json not found');
    return await res.json();
  } catch {
    return [
      { id: 'faithfully-faded', name: 'Faithfully Faded', logo: '', color: '#213a8f', link: '#' },
      { id: 'concrete-rose',   name: 'Concrete Rose',   logo: '', color: '#bb3a45', link: '#' },
      { id: 'cafe-sativa',     name: 'Café Sativa',     logo: '', color: '#56a06a', link: '#' }
    ];
  }
}

// Create a texture from text (used if an image is missing)
function textTexture(text, color='#fff', bg='#0f1117') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = color;
  ctx.font = 'bold 56px system-ui, Segoe UI, Roboto';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width/2, c.height/2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Load an image texture with graceful fallback
function loadLogoTexture(url, fallbackLabel, accent) {
  return new Promise((resolve) => {
    if (!url) return resolve(textTexture(fallbackLabel, '#fff', '#151821'));
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
      undefined,
      () => resolve(textTexture(fallbackLabel, '#fff', '#151821'))
    );
  });
}

// Main
(async function start() {
  try {
    const STORES = await getStores();

    // Build chips
    chips.innerHTML = '';
    for (const s of STORES) {
      const el = document.createElement('div');
      el.className = 'chip';
      el.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
      el.onclick = () => window.open(s.link, '_blank');
      chips.appendChild(el);
    }

    // Three.js scene
    const canvas = $('#three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c10);

    const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 3, 10);
    scene.add(camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, 0);

    // Lights: soft HDR-ish feel
    const hemi = new THREE.HemisphereLight(0xdde8ff, 0x101214, 0.6);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(-7, 5, -6);
    scene.add(rim);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(20, 64),
      new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create sign for each store
    const radius = 7.5;
    const y = 1.6;
    const group = new THREE.Group();
    scene.add(group);

    const signGeo = new THREE.PlaneGeometry(2.2, 1.4);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.9, metalness: 0.1 });

    const signs = [];
    for (let i=0;i<STORES.length;i++){
      const s = STORES[i];
      const ang = (i / STORES.length) * Math.PI * 2 + Math.PI * 0.07;

      // sign panel
      const tex = await loadLogoTexture(s.logo, s.name, s.color);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1 });
      const panel = new THREE.Mesh(signGeo, mat);
      panel.position.set(Math.cos(ang)*radius, y, Math.sin(ang)*radius);
      panel.lookAt(0, y, 0);
      panel.castShadow = true;

      // simple stand
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12);
      const leg1 = new THREE.Mesh(legGeo, standMat);
      const leg2 = leg1.clone();
      const up = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.1), standMat);
      leg1.position.copy(panel.position).add(new THREE.Vector3( 0.6, y-1.2, 0.2));
      leg2.position.copy(panel.position).add(new THREE.Vector3(-0.6, y-1.2, 0.2));
      up.position.copy(panel.position).add(new THREE.Vector3(0, y-0.35, 0.05));
      [leg1, leg2, up].forEach(m => { m.lookAt(0, y, 0); m.castShadow = true; m.receiveShadow = true; });

      const set = new THREE.Group();
      set.add(panel, leg1, leg2, up);
      group.add(set);

      // small accent light per brand
      const accent = new THREE.PointLight(new THREE.Color(s.color), 0.6, 6, 2);
      accent.position.copy(panel.position).add(new THREE.Vector3(0, 0, 0.6));
      scene.add(accent);

      // store metadata
      set.userData = { link: s.link, name: s.name, color: s.color, panel };

      signs.push(set);
    }

    // Raycast click
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onPointer(e){
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ( (e.clientX - rect.left) / rect.width ) * 2 - 1;
      const y = -( (e.clientY - rect.top) / rect.height ) * 2 + 1;
      mouse.set(x,y);
      ray.setFromCamera(mouse, camera);
      const panels = signs.map(s=>s.userData.panel);
      const hit = ray.intersectObjects(panels, false)[0];
      if (hit){
        const g = hit.object.parent;
        const url = g.userData?.link;
        if (url) window.open(url, '_blank');
      }
    }
    renderer.domElement.addEventListener('click', onPointer);

    // Resize
    addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // Kick
    hideLoader();
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
  } catch (err) {
    console.error(err);
    loadMsg.textContent = 'Error starting app (see console)';
  }
})();
