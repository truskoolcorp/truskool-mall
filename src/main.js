/* Mall main – no bundler, CDN modules with fallback */
const loader = document.getElementById('loader');
const loaderMsg = document.getElementById('loaderMsg');
const chipRow = document.getElementById('chipRow');
const canvas = document.getElementById('three');

function showErr(msg){
  console.error(msg);
  if (loaderMsg) loaderMsg.textContent = msg;
}

async function loadThree(){
  const bases = ['https://unpkg.com','https://cdn.jsdelivr.net/npm'];
  let last;
  for (const b of bases){
    try {
      const THREE = await import(`${b}/three@0.159.0/build/three.module.js`);
      const OrbitControls = await import(`${b}/three@0.159.0/examples/jsm/controls/OrbitControls.js`);
      const GLTFLoader = await import(`${b}/three@0.159.0/examples/jsm/loaders/GLTFLoader.js`);
      return {THREE, OrbitControls, GLTFLoader};
    } catch (e){ last = e; }
  }
  throw last ?? new Error('CDNs blocked');
}

function makeLabelTexture(text, color='#fff'){
  const c = document.createElement('canvas');
  const pad = 20; const fs = 48;
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fs}px system-ui, Segoe UI, Roboto`;
  const w = Math.ceil(ctx.measureText(text).width)+pad*2;
  const h = fs*1.8;
  c.width = w; c.height = h;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle = color;
  ctx.font = `bold ${fs}px system-ui, Segoe UI, Roboto`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h/2+2);
  return c;
}

(async function init(){
  try{
    const res = await fetch('src/stores.json',{cache:'no-cache'});
    const STORES = await res.json();

    const {THREE, OrbitControls, GLTFLoader} = await loadThree();

    const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c10);
    const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 6.5, 15);

    const controls = new OrbitControls.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0,2.5,0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x333344, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048,2048);
    dir.shadow.camera.left = -18; dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 18; dir.shadow.camera.bottom = -18;
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(-8, 6, -4);
    scene.add(fill);

    const g = new THREE.CircleGeometry(30, 64);
    const gm = new THREE.MeshStandardMaterial({color:0x15171c, roughness:0.95, metalness:0.05});
    const ground = new THREE.Mesh(g, gm);
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    const portalGroup = new THREE.Group();
    scene.add(portalGroup);
    const gltfLoader = new GLTFLoader.GLTFLoader();

    function addPrimitivePortal(color = 0x3a3f55){
      const arch = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({color, roughness:0.6, metalness:0.2});
      const leg = new THREE.BoxGeometry(0.5,4,0.5);
      const top = new THREE.BoxGeometry(4.5,0.5,0.5);
      const left = new THREE.Mesh(leg, mat); left.position.set(-2,2,0);
      const right = new THREE.Mesh(leg, mat); right.position.set(2,2,0);
      const cap = new THREE.Mesh(top, mat); cap.position.set(0,4,0);
      for (const m of [left,right,cap]){ m.castShadow = m.receiveShadow = true; arch.add(m); }
      return arch;
    }

    try{
      await new Promise((resolve, reject)=>{
        gltfLoader.load('/assets/models/portal.glb', (gltf)=>{
          const mesh = gltf.scene;
          mesh.traverse(o=>{ if (o.isMesh){ o.castShadow = o.receiveShadow = true; } });
          mesh.scale.setScalar(1.8);
          mesh.position.set(0,0,0);
          portalGroup.add(mesh);
          resolve();
        }, undefined, (e)=> reject(e));
      });
    } catch(e){
      portalGroup.add(addPrimitivePortal());
    }
    portalGroup.position.set(0,0,0);

    const texLoader = new THREE.TextureLoader();
    const radius = 14;
    const step = (Math.PI * 2) / STORES.length;
    const clickable = [];

    function makeSign(store, i){
      const group = new THREE.Group();
      group.position.set(radius * Math.cos(i*step), 0, radius * Math.sin(i*step));
      group.lookAt(0, 2.5, 0);

      const poleMat = new THREE.MeshStandardMaterial({color:0x353a46, roughness:0.8});
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,2.2,16), poleMat);
      pole.position.y = 1.1;
      pole.castShadow = pole.receiveShadow = true;
      group.add(pole);

      const plane = new THREE.PlaneGeometry(2.2, 3);
      const frameMat = new THREE.MeshStandardMaterial({color:store.color || '#666'});
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4,3.2,0.12), frameMat);
      frame.position.set(0, 2.5, 0);
      frame.castShadow = frame.receiveShadow = true;
      group.add(frame);

      const mat = new THREE.MeshStandardMaterial({color:0x111114, roughness:0.6, metalness:0.1});
      const board = new THREE.Mesh(plane, mat);
      board.position.set(0,2.5,0.07);
      board.castShadow = board.receiveShadow = true;
      group.add(board);

      texLoader.load(store.logo, (t)=>{
        t.colorSpace = THREE.SRGBColorSpace;
        board.material.map = t;
        board.material.needsUpdate = true;
      });

      const labelTex = new THREE.CanvasTexture(makeLabelTexture(store.name, '#fff'));
      labelTex.colorSpace = THREE.SRGBColorSpace;
      const labelMat = new THREE.SpriteMaterial({map:labelTex});
      const label = new THREE.Sprite(labelMat);
      label.position.set(0, 4.2, 0.06);
      label.scale.set(4.2, 1.1, 1);
      group.add(label);

      group.userData = { link: store.link };
      clickable.push(frame, board, label);
      return group;
    }

    STORES.forEach((s,i)=> scene.add(makeSign(s,i)));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onClick(ev){
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickable, true);
      if (hits.length){
        let obj = hits[0].object;
        while (obj && !obj.userData?.link){ obj = obj.parent; }
        const url = obj?.userData?.link;
        if (url){ window.open(url, '_blank', 'noopener'); }
      }
    }
    window.addEventListener('click', onClick);

    chipRow.innerHTML = '';
    for (const s of STORES){
      const div = document.createElement('div');
      div.className = 'chip';
      div.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
      div.onclick = ()=> window.open(s.link, '_blank', 'noopener');
      chipRow.appendChild(div);
    }

    function resize(){
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    }
    window.addEventListener('resize', resize);

    function tick(t){
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    resize();
    requestAnimationFrame(tick);
    loader.classList.add('hide');
  }catch(e){
    console.error(e);
    showErr('Error starting app (check console)');
  }
})();
