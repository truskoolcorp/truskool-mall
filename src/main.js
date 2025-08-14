/* Virtual Tru Skool Mall (CDN-only three.js)
 * - No vendor folder. Loads from unpkg with jsDelivr fallback.
 * - Static (no build). Works on Netlify or any static host.
 */
const loader = document.getElementById('loader');
const loaderMsg = document.getElementById('loaderMsg');
const chipsEl = document.getElementById('chips');
const canvas = document.getElementById('three');

const CDN_BASES = ['https://unpkg.com', 'https://cdn.jsdelivr.net/npm'];
const THREE_VER = 'three@0.159.0';

async function loadThree() {
  let lastErr = null;
  for (const base of CDN_BASES) {
    try {
      const THREE = await import(`${base}/${THREE_VER}/build/three.module.js`);
      const OrbitControls = await import(`${base}/${THREE_VER}/examples/jsm/controls/OrbitControls.js`);
      const GLTFLoader = await import(`${base}/${THREE_VER}/examples/jsm/loaders/GLTFLoader.js`);
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('CDN blocked');
}

async function fetchStores() {
  const res = await fetch('./src/stores.json', { cache:'no-store' });
  if (!res.ok) throw new Error('stores.json load failed');
  return res.json();
}

// Render a text label onto a canvas, return as a texture
function makeTextTexture(THREE, txt, color='#ffffff') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const W = 512, H = 256;
  c.width = W; c.height = H;
  ctx.fillStyle = '#11131a'; ctx.fillRect(0,0,W,H);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.font = 'bold 68px system-ui,Segoe UI,Roboto';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, W/2, H/2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSign(THREE, label, color) {
  const group = new THREE.Group();

  const boardGeo = new THREE.BoxGeometry(1.2, 1.6, 0.08);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d212b, metalness: 0.1, roughness: 0.8 });
  const board = new THREE.Mesh(boardGeo, frameMat);
  board.castShadow = true; board.receiveShadow = true;
  group.add(board);

  const faceGeo = new THREE.PlaneGeometry(1.1, 1.5);
  const faceMat = new THREE.MeshBasicMaterial({ map: null });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.05 + 0.001;
  group.add(face);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x232733, metalness: 0.2, roughness: 0.9 });
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.y = -1.2;
  leg.castShadow = true; leg.receiveShadow = true;
  group.add(leg);

  group.userData.updateLabel = (THREE, text, colorHex) => {
    const tex = makeTextTexture(THREE, text, '#ffffff');
    faceMat.map = tex;
    faceMat.needsUpdate = true;
    frameMat.color.set(colorHex || '#3b82f6');
  };

  group.userData.hitTarget = face;
  group.userData.updateLabel(null, label, color);
  return group;
}

async function hasPortal() {
  try {
    const r = await fetch('./assets/models/portal.glb', { method:'HEAD', cache:'no-store' });
    return r.ok;
  } catch { return false; }
}

async function init() {
  try {
    loaderMsg.textContent = 'Loading 3D libs…';
    const { THREE, OrbitControls, GLTFLoader } = await loadThree();

    // Scene
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 2.2, 7.2);

    const controls = new OrbitControls.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights — studio-ish
    const hemi = new THREE.HemisphereLight(0xe7f0ff, 0x10131a, 0.55);
    scene.add(hemi);

    const key = new THREE.SpotLight(0xffffff, 1.0, 0, Math.PI/5, 0.4, 1.0);
    key.position.set(6, 8, 6);
    key.target.position.set(0,0,0);
    key.castShadow = true;
    scene.add(key, key.target);

    const fill = new THREE.SpotLight(0xaabbff, 0.55, 0, Math.PI/6, 0.5, 1.0);
    fill.position.set(-7, 6, -4);
    fill.target.position.set(0,0,0);
    scene.add(fill, fill.target);

    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(0, 6, -6);
    scene.add(rim);

    // Floor (soft falloff)
    const floorGeo = new THREE.CircleGeometry(24, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f1219, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Brands/signs
    loaderMsg.textContent = 'Loading brands…';
    const STORES = await fetchStores();

    // Build chips
    chipsEl.innerHTML = '';
    for (const s of STORES) {
      const chip = document.createElement('div');
      chip.className = 'chip'; chip.dataset.id = s.id;
      chip.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
      chip.onclick = () => window.open(s.link, '_blank');
      chipsEl.appendChild(chip);
    }

    // Place signs around a ring
    const ringR = 7.0;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clickable = [];

    STORES.forEach((s, i) => {
      const t = (i / STORES.length) * Math.PI * 2 + Math.PI * 0.1;
      const sign = makeSign(THREE, s.name, s.color);
      sign.position.set(Math.cos(t)*ringR, 0.8, Math.sin(t)*ringR);
      sign.lookAt(0, 1.0, 0);
      scene.add(sign);
      clickable.push({ mesh: sign.userData.hitTarget, link: s.link });
    });

    // Optional center portal (if file exists)
    if (await hasPortal()) {
      loaderMsg.textContent = 'Loading portal…';
      try {
        const gltfLoader = new GLTFLoader.GLTFLoader();
        gltfLoader.load('./assets/models/portal.glb', (g) => {
          const portal = g.scene || g.scenes?.[0];
          if (portal) {
            portal.traverse(o => {
              if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
            });
            portal.position.set(0, 0, 0);
            scene.add(portal);
          }
        });
      } catch (e) {
        console.warn('Portal load skipped:', e);
      }
    }

    // Interactions
    function onClick(ev) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
      const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, camera);
      const objs = clickable.map(c => c.mesh);
      const hits = raycaster.intersectObjects(objs, true);
      if (hits.length) {
        const mesh = hits[0].object;
        const item = clickable.find(c => c.mesh === mesh || mesh.isDescendantOf?.(c.mesh));
        const url = item?.link;
        if (url) window.open(url, '_blank');
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    // Resize
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Animate
    loader.classList.add('hide');
    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

  } catch (err) {
    console.error(err);
    loaderMsg.textContent = 'Error loading 3D libs. Check ad/script blockers or refresh.';
  }
}

init();