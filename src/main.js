// Minimal, production-friendly Three.js scene for the Tru Skool mall.
export default async function init() {
  const sel = (q) => document.querySelector(q);
  const loaderEl = sel('#loader');
  const loaderMsg = sel('#loaderMsg');
  const setMsg = (t) => loaderMsg.textContent = t;

  // Load brand data
  let STORES = [];
  try {
    const res = await fetch('/src/stores.json', {cache:'no-store'});
    STORES = await res.json();
  } catch (e) {
    console.error(e);
    setMsg('Could not load store data'); return;
  }

  // Build UI chips
  const chips = sel('#chips');
  for (const s of STORES) {
    const el = document.createElement('div');
    el.className = 'chip';
    el.dataset.id = s.id;
    el.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.name}`;
    el.onclick = () => focusStore(s.id);
    chips.appendChild(el);
  }

  // Load Three.js modules with CDN fallback
  async function loadThree() {
    const bases = ['https://unpkg.com','https://cdn.jsdelivr.net/npm'];
    let last;
    for (const base of bases) {
      try {
        const THREE = await import(`${base}/three@0.159.0/build/three.module.js`);
        const { OrbitControls } = await import(`${base}/three@0.159.0/examples/jsm/controls/OrbitControls.js`);
        const { GLTFLoader } = await import(`${base}/three@0.159.0/examples/jsm/loaders/GLTFLoader.js`);
        const { RectAreaLightUniformsLib } = await import(`${base}/three@0.159.0/examples/jsm/lights/RectAreaLightUniformsLib.js`);
        const { Sky } = await import(`${base}/three@0.159.0/examples/jsm/objects/Sky.js`);
        return { THREE, OrbitControls, GLTFLoader, RectAreaLightUniformsLib, Sky };
      } catch (e) { last = e; }
    }
    throw last ?? new Error('CDN blocked');
  }

  let THREE, OrbitControls, GLTFLoader, RectAreaLightUniformsLib, Sky;
  try {
    ({ THREE, OrbitControls, GLTFLoader, RectAreaLightUniformsLib, Sky } = await loadThree());
  } catch (e) {
    console.error(e);
    setMsg('Error loading 3D libs. Check ad/script blockers or refresh.');
    return;
  }

  // Setup renderer/canvas
  const canvas = sel('#three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene & fog
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0c10, 0.035);

  // Camera & controls
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3.4, 10);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1.2, 0);

  // Environment sky + soft ambient
  const hemi = new THREE.HemisphereLight(0xaaccee, 0x202028, 0.35);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(-4, 6, 3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024,1024);
  scene.add(dir);

  // Rect area light support
  RectAreaLightUniformsLib.init();

  // Sky (physically-based) for gentle environment
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(85);
  const theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);

  // Ground (smooth dark)
  const groundGeo = new THREE.CircleGeometry(30, 48);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Helpers
  function makeTextTexture(text, color = '#ffffff') {
    const padX = 24, padY = 12;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = '600 46px system-ui,Segoe UI,Roboto,Helvetica,Arial';
    ctx.font = font;
    const metrics = ctx.measureText(text);
    canvas.width = Math.ceil(metrics.width + padX * 2);
    canvas.height = 72 + padY * 2;
    // bg
    ctx.fillStyle = 'rgba(20,20,26,0.85)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // text
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padX, canvas.height/2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function makeLogoTexture(url, fallbackText, color) {
    return new Promise((resolve) => {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(url, (t) => { t.anisotropy = 4; resolve(t); }, undefined, () => {
        resolve(makeTextTexture(fallbackText, color));
      });
    });
  }

  // Build a brand sign (panel + post), with subtle light
  async function buildSign(store, radius = 10, y = 1.2) {
    const g = new THREE.Group();
    const angle = (store.angle ?? 0) * Math.PI/180;
    const x = radius * Math.sin(angle);
    const z = radius * Math.cos(angle);

    g.position.set(x, 0, z);
    g.lookAt(0,1,0);

    // Panel
    const logo = await makeLogoTexture(store.logo, store.name, store.color);
    const panelGeo = new THREE.PlaneGeometry(1.8, 1.2);
    const panelMat = new THREE.MeshStandardMaterial({ map: logo, roughness: 0.8, metalness: 0.05 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, y, 0);
    panel.castShadow = true;
    panel.userData = { link: store.link, id: store.id, type: 'panel' };
    g.add(panel);

    // Backplate (thin)
    const backGeo = new THREE.BoxGeometry(1.85, 1.25, 0.05);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x111217, metalness: 0.1, roughness: 0.9 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, y, -0.03);
    back.castShadow = true;
    g.add(back);

    // Post
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 16);
    const post = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x333844, metalness: 0.2, roughness: 0.8 }));
    post.position.set(0, 0.55, -0.25);
    post.castShadow = true;
    g.add(post);

    // Rect fill light near the sign
    const rect = new THREE.RectAreaLight(store.color ?? '#6aa0ff', 1.6, 1.6, 1.1);
    rect.position.set(0, y+0.1, 0.85);
    rect.lookAt(panel.position.clone().add(new THREE.Vector3(0,0,-0.5)));
    g.add(rect);

    // Label sprite above
    const labelTex = makeTextTexture(store.name);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, depthTest:false });
    const label = new THREE.Sprite(labelMat);
    label.scale.set( labelTex.image.width/200, labelTex.image.height/200, 1 );
    label.position.set(0, y+0.9, 0);
    g.add(label);

    scene.add(g);
    clickable.push(panel, back);
  }

  // Portal arch (optional)
  async function tryLoadPortal() {
    const loader = new GLTFLoader();
    try {
      const url = '/assets/models/portal.glb';
      await new Promise((res, rej) => {
        fetch(url, { method: 'HEAD' }).then(r => r.ok ? res() : rej()).catch(rej);
      });
      loader.load('/assets/models/portal.glb', (gltf) => {
        const arch = gltf.scene;
        arch.position.set(0, 0, 0);
        arch.scale.set(1.2, 1.2, 1.2);
        arch.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        scene.add(arch);
      });
    } catch {}
  }

  // Build all signs
  const clickable = [];
  for (const s of STORES) await buildSign(s);

  // Raycast clicks
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  function onClick(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    v2.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    v2.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(clickable, true)[0];
    if (hit?.object?.userData?.link) {
      window.open(hit.object.userData.link, '_blank');
    }
  }
  renderer.domElement.addEventListener('click', onClick);

  // Focus a store by rotating controls target
  function focusStore(id) {
    const s = STORES.find(x => x.id === id); if (!s) return;
    const targetAngle = (s.angle ?? 0) * Math.PI/180;
    const r = 10;
    const camGoal = new THREE.Vector3(r * Math.sin(targetAngle), camera.position.y, r * Math.cos(targetAngle));
    const start = camera.position.clone();
    const startTime = performance.now();
    const dur = 650;
    (function tween() {
      const t = Math.min(1, (performance.now() - startTime) / dur);
      camera.position.lerpVectors(start, camGoal, t);
      controls.target.lerp(new THREE.Vector3(0,1.2,0), 0.1);
      if (t < 1) requestAnimationFrame(tween);
    })();
  }

  // Try optional portal
  tryLoadPortal();

  // Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // Animate
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // Hide loader when ready-ish
  setTimeout(() => loaderEl.classList.add('hide'), 300);
}
