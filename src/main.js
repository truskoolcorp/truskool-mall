// Main mall app (static ESM).
// One Three.js instance via import-map => CDN.
// Examples imported from the same version to avoid mismatches.
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/OrbitControls.js';
// GLTFLoader is ready if you later drop models:
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';

const $ = (sel) => document.querySelector(sel);
const loader = $('#loader');
const loaderMsg = $('#loaderMsg');
const chipRow = $('#chipRow');
const canvas = $('#three');

function showErr(msg){
  console.error(msg);
  loaderMsg.textContent = String(msg);
  loader.classList.remove('hide');
}

(async function start(){
  try {
    loaderMsg.textContent = 'Loading brands…';
    const STORES = await (await fetch('/src/stores.json', { cache:'no-store' })).json();
    // Build chips
    chipRow.innerHTML = '';
    for (const s of STORES){
      const d = document.createElement('div');
      d.className = 'chip'; d.dataset.id = s.id; d.title = s.name;
      d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.name}`;
      d.onclick = () => window.open(s.link, '_blank', 'noopener');
      chipRow.appendChild(d);
    }

    loaderMsg.textContent = 'Starting 3D…';
    // 3D setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c10);

    const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
    camera.position.set(0, 6, 14);
    scene.add(camera);

    // Lights: bright but soft
    const hemi = new THREE.HemisphereLight(0xffffee, 0x223344, 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(6, 12, 8);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.PointLight(0x88aaff, 0.35, 30); fill.position.set(-6,4,-6); scene.add(fill);

    // Floor: big dark ring gradient
    const floorGeo = new THREE.CircleGeometry(40, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color:0x0e1015, metalness:.2, roughness:.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Brand sign prefab
    const signGroup = new THREE.Group();
    scene.add(signGroup);

    const makeSign = (s) => {
      const group = new THREE.Group(); group.userData = { link:s.link };
      // Stand
      const standMat = new THREE.MeshStandardMaterial({ color:0x3a3f4a, metalness:.6, roughness:.5 });
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.1, .18), standMat); leg1.position.set(-.5, 1.05, 0);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.1, .18), standMat); leg2.position.set(.5, 1.05, 0);
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, .2, .18), standMat); topBar.position.set(0, 2.2, 0);
      leg1.castShadow = leg2.castShadow = topBar.castShadow = true;
      group.add(leg1, leg2, topBar);
      // Panel
      const panelMat = new THREE.MeshStandardMaterial({ color:new THREE.Color(s.color), metalness:.4, roughness:.35 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, .08), panelMat);
      panel.position.set(0, 1.4, -0.25);
      panel.castShadow = true; panel.name = 'panel';
      group.add(panel);
      // Caption (sprite)
      const canvas2d = document.createElement('canvas');
      const ctx = canvas2d.getContext('2d');
      const w=512, h=128; canvas2d.width=w; canvas2d.height=h;
      ctx.fillStyle = '#000000aa'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#fff'; ctx.font='bold 48px system-ui,Segoe UI,Roboto';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(s.name, w/2, h/2+4);
      const tex = new THREE.CanvasTexture(canvas2d);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, depthTest:true }));
      sprite.position.set(0, 2.5, -0.25); sprite.scale.set(4, 1, 1);
      group.add(sprite);
      // Glow
      const glow = new THREE.PointLight(new THREE.Color(s.color), .45, 8); glow.position.set(0, 1.5, -1.0); group.add(glow);
      return group;
    };

    // Arrange signs in a ring
    const R = 10;
    STORES.forEach((s, i) => {
      const a = (i / STORES.length) * Math.PI*2 + Math.PI * .15;
      const sign = makeSign(s);
      sign.position.set(Math.cos(a)*R, 0, Math.sin(a)*R);
      sign.lookAt(0, 1.2, 0);
      signGroup.add(sign);
    });

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .045;
    controls.target.set(0, 1.2, 0);
    controls.minDistance = 6; controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI*0.495;

    // Raycaster for clicks
    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    function onClick(ev){
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(signGroup.children, true);
      if (hits.length){
        let g = hits[0].object;
        while (g && !g.userData.link) g = g.parent;
        if (g && g.userData.link) window.open(g.userData.link, '_blank', 'noopener');
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    // Resize
    addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // Tick
    function tick(){
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    loader.classList.add('hide');
  } catch (e){
    console.error(e);
    showErr('Error starting app (see console)');
  }
})();
