// Static ESM imports via CDNs (no eval, CSP-friendly)
// Helper qs
const $ = (sel) => document.querySelector(sel);
const showErr = (msg) => { const m = $(".load-msg"); if (m) m.textContent = msg; };

// Load brand data
async function getStores() {
  const res = await fetch('/src/stores.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load stores.json');
  return res.json();
}

// Load Three.js modules from two CDNs (fallback)
async function loadThree() {
  const bases = ['https://unpkg.com', 'https://cdn.jsdelivr.net/npm'];
  let last;
  for (const base of bases) {
    try {
      const THREE = await import(`${base}/three@0.159.0/build/three.module.js`);
      const { OrbitControls } = await import(`${base}/three@0.159.0/examples/jsm/controls/OrbitControls.js`);
      const { GLTFLoader } = await import(`${base}/three@0.159.0/examples/jsm/loaders/GLTFLoader.js`);
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) { last = e; }
  }
  throw last || new Error('CDN blocked');
}

function addChips(stores) {
  const row = $("#chipRow");
  row.innerHTML = '';
  for (const s of stores) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.setAttribute('data-id', s.id);
    chip.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.name}`;
    chip.onclick = () => window.open(s.link, '_blank', 'noopener');
    row.appendChild(chip);
  }
}

async function init() {
  try {
    const stores = await getStores();
    addChips(stores);

    const { THREE, OrbitControls } = await loadThree();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);

    // Camera
    const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 3.5, 9);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: $("#three"), antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);

    // Lights
    const hemi = new THREE.HemisphereLight(0xcad2ff, 0x0a0a0a, 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 6, 4);
    key.castShadow = false;
    scene.add(key);
    const fill = new THREE.PointLight(0x88aaff, 0.4);
    fill.position.set(-6, 3, -4);
    scene.add(fill);

    // Ground (big soft disc)
    const g = new THREE.CircleGeometry(30, 64);
    const m = new THREE.MeshStandardMaterial({ color: 0x11141b, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(g, m);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = -0.01;
    scene.add(ground);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.2, 0);
    controls.minDistance = 4;
    controls.maxDistance = 18;
    controls.minPolarAngle = Math.PI*0.15;
    controls.maxPolarAngle = Math.PI*0.5;

    // Create simple sign for a store
    function makeSign(tex, color=0x334) {
      const group = new THREE.Group();
      // panel
      const geo = new THREE.PlaneGeometry(1.3, 1.6);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .9, metalness: 0 });
      const panel = new THREE.Mesh(geo, mat);
      panel.position.y = 1.1;
      group.add(panel);
      // frame (U shape)
      const legGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3140, roughness: .9 });
      const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.55, 0.6, 0);
      const legR = legL.clone(); legR.position.x = 0.55;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.08), legMat); top.position.set(0,1.2,0);
      group.add(legL, legR, top);
      return group;
    }

    // Load textures for each store and place them around a ring
    const loader = new THREE.TextureLoader();
    const ringR = 5.2;
    const angleStep = (Math.PI * 2) / stores.length;
    const clickable = [];
    stores.forEach((s, i) => {
      const tex = loader.load(s.logo);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sign = makeSign(tex);
      const angle = i * angleStep;
      sign.position.set(Math.cos(angle) * ringR, 0, Math.sin(angle) * ringR);
      sign.lookAt(0, 1.1, 0);
      sign.userData = { link: s.link };
      scene.add(sign);
      clickable.push(sign.children[0]); // the panel mesh
    });

    // Raycast for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onClick(ev){
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left)/rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top)/rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(clickable, false)[0];
      if (hit){
        const link = hit.object.parent?.userData?.link;
        if (link) window.open(link, '_blank', 'noopener');
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    // Resize
    addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // Animate
    (function loop(){
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    })();

    // Hide loader
    $("#loader")?.classList.add('hide');
  } catch (e) {
    console.error(e);
    showErr('Error starting app (see console)');
  }
}

init();
