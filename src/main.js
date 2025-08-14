import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (sel) => document.querySelector(sel);
const showErr = (msg) => { const l = $('#loader'); l.classList.remove('hide'); l.querySelector('.load-msg').textContent = msg; }
const hideLoader = () => $('#loader').classList.add('hide');

// Build chips
async function buildChips(stores){
  const row = $('#chipRow');
  for (const s of stores){
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.name}`;
    chip.onclick = () => window.open(s.link, '_blank');
    row.appendChild(chip);
  }
}

async function init(){
  try{
    const res = await fetch('/src/stores.json', {cache:'no-cache'});
    if (!res.ok) throw new Error('Failed to load stores.json');
    const STORES = await res.json();
    await buildChips(STORES);

    // Renderer
    const canvas = $('#three');
    const renderer = new THREE.WebGLRenderer({ antialias:true, canvas, alpha:false });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x0c0c0f, 1);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 6, 14);
    scene.add(camera);

    // Lights (bright, studio-like)
    const hemi = new THREE.HemisphereLight(0xf0f5ff, 0x080810, 0.8);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(8,12,6);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-6,6,-8);
    scene.add(rim);
    const fill = new THREE.AmbientLight(0x22263a, 0.6);
    scene.add(fill);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(24, 64),
      new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Materials & textures
    const loader = new THREE.TextureLoader();
    function makeSign(store, angle){
      const group = new THREE.Group();
      group.userData = { link: store.link };

      // Simple frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 2.0, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x3a3d47, metalness: 0.2, roughness: 0.9 })
      );
      frame.position.set(-0.9, 1.0, 0);
      const frame2 = frame.clone(); frame2.position.x = 0.9;

      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.12, 0.15),
        frame.material
      );
      cross.position.set(0, 2.0, 0);

      // Panel
      const plane = new THREE.PlaneGeometry(2.0, 1.6);
      const color = new THREE.Color(store.color || '#4466aa');
      const panelMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
      const panel = new THREE.Mesh(plane, panelMat);
      panel.position.set(0, 1.4, 0.09);

      // Logo texture if available
      const tex = loader.load(store.logo, () => { renderer.render(scene, camera); });
      tex.colorSpace = THREE.SRGBColorSpace;
      const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      logo.position.set(0, 1.45, 0.1);

      group.add(frame, frame2, cross, panel, logo);

      const radius = 10.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      group.position.set(x, 0, z);
      group.lookAt(0, 1.4, 0);
      return group;
    }

    // Add signs in a ring
    const nodes = [];
    STORES.forEach((s, i) => {
      const a = (i / STORES.length) * Math.PI * 2;
      const g = makeSign(s, a);
      nodes.push(g);
      scene.add(g);
    });

    // Raycaster for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onClick(ev){
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const targets = [];
      nodes.forEach(n => n.traverse(o => { if (o.isMesh) targets.push(o)}));
      const hit = raycaster.intersectObjects(targets, true)[0];
      if (hit){
        let p = hit.object;
        while (p && !p.userData?.link) p = p.parent;
        if (p?.userData?.link) window.open(p.userData.link, "_blank");
      }
    }
    canvas.addEventListener('click', onClick);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 1.4, 0);
    controls.minDistance = 6;
    controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI/2.1;
    controls.enableDamping = true;

    // Handle resize
    addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    hideLoader();

    // Render loop
    function tick(){
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  }catch(e){
    console.error(e);
    showErr('Error starting app (see console)');
  }
}

init();
