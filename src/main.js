const $ = (sel) => document.querySelector(sel);
const loader = $('#loader');
const loaderMsg = $('#loader .msg');
const chipRow = $('#chipRow');

function showErr(msg) {
  if (loaderMsg) loaderMsg.textContent = msg || 'Error starting app';
  loader?.classList.remove('hide');
}

async function loadStores() {
  try {
    const res = await fetch('./src/stores.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('stores.json load failed', e);
    showErr('Could not load stores.json');
    throw e;
  }
}

async function loadThree() {
  const bases = ['https://unpkg.com', 'https://cdn.jsdelivr.net/npm'];
  const ver = 'three@0.159.0';
  let lastErr;
  for (const base of bases) {
    try {
      const THREE = await import(`${base}/${ver}/build/three.module.js`);
      const { OrbitControls } = await import(`${base}/${ver}/examples/jsm/controls/OrbitControls.js`);
      const { GLTFLoader } = await import(`${base}/${ver}/examples/jsm/loaders/GLTFLoader.js`);
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) {
      lastErr = e;
      console.warn('Three CDN failed:', base, e);
    }
  }
  throw lastErr || new Error('CDN failed');
}

function buildChips(stores) {
  chipRow.textContent = '';
  for (const s of stores) {
    const el = document.createElement('button');
    el.className = 'chip'; el.setAttribute('data-id', s.id);
    const dot = document.createElement('span');
    dot.className = 'dot'; dot.style.background = s.color || '#888';
    el.appendChild(dot);
    el.appendChild(document.createTextNode(' ' + s.name));
    el.onclick = () => window.open(s.link, '_blank','noopener');
    chipRow.appendChild(el);
  }
}

async function main() {
  try {
    const stores = await loadStores();
    buildChips(stores);

    const { THREE, OrbitControls } = await loadThree();

    const canvas = $('#three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5.5, 11);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0,1.6,0);

    const hemi = new THREE.HemisphereLight(0xbdd3ff, 0x101014, 0.75);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.25);
    dir.position.set(6, 12, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024,1024);
    scene.add(dir);

    const g = new THREE.CircleGeometry(20, 64);
    const m = new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.95, metalness: 0.05 });
    const floor = new THREE.Mesh(g, m);
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    const radius = 9.5;
    const texLoader = new THREE.TextureLoader();
    const group = new THREE.Group();
    scene.add(group);

    stores.forEach((s, i) => {
      const angle = (i / stores.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const signW = 2.6, signH = 1.4, frameT = 0.08;
      const tex = texLoader.load(s.logo);
      tex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 });
      const signGeo = new THREE.PlaneGeometry(signW, signH);
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.castShadow = true;

      const postGeo = new THREE.BoxGeometry(frameT, 1.6, frameT);
      const postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.color || '#888') });
      const postL = new THREE.Mesh(postGeo, postMat);
      const postR = new THREE.Mesh(postGeo, postMat);
      const topGeo = new THREE.BoxGeometry(signW + 0.3, frameT, frameT);
      const top = new THREE.Mesh(topGeo, postMat);
      postL.position.set(-signW/2 + frameT/2, -0.05, 0);
      postR.position.set( signW/2 - frameT/2, -0.05, 0);
      top.position.set(0, signH/2 + 0.35, 0);

      const rack = new THREE.Group();
      rack.add(sign, postL, postR, top);
      rack.position.set(x, 0.8, z);
      rack.lookAt(0, 0.8, 0);
      rack.userData = { link: s.link };
      group.add(rack);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onClick(ev){
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const objs = [];
      group.children.forEach(ch => ch.traverse(o => { if (o.isMesh) objs.push(o)}));
      const hit = raycaster.intersectObjects(objs, true)[0];
      if (hit) {
        let p = hit.object;
        while (p && !p.userData?.link) p = p.parent;
        if (p?.userData?.link) window.open(p.userData.link, '_blank','noopener');
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    function onResize(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    loader?.classList.add('hide');
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
  } catch (e) {
    console.error(e);
    showErr('Error starting app (see console)');
  }
}

main();
