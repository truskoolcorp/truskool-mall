import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const loaderEl = $('#loader');

function showErr(msg) {
  loaderEl.querySelector('.load-msg').textContent = msg;
  loaderEl.classList.remove('hide');
  console.error(msg);
}

async function init() {
  try {
    // Renderer
    const canvas = $('#three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene + camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0f);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 2.2, 6);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 6, 4);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
    rim.position.set(-4, 3, -2);
    scene.add(hemi, key, rim);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(20, 64),
      new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.9, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // A simple “entry arch” so you see something immediately
    const arch = new THREE.Group();
    const colMat = new THREE.MeshStandardMaterial({ color: 0x8aa0ff, metalness: 0.2, roughness: 0.4 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xb7c3ff, metalness: 0.3, roughness: 0.35 });
    const colGeo = new THREE.BoxGeometry(0.2, 2.0, 0.2);
    const beamGeo = new THREE.BoxGeometry(1.8, 0.2, 0.2);
    const colL = new THREE.Mesh(colGeo, colMat); colL.position.set(-0.9, 1.0, 0);
    const colR = new THREE.Mesh(colGeo, colMat); colR.position.set( 0.9, 1.0, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0, 2.1, 0);
    arch.add(colL, colR, beam);
    scene.add(arch);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;

    // Brand chips
    const chipRow = $('#chipRow');
    try {
      const res = await fetch('/src/stores.json', { cache: 'no-cache' });
      if (res.ok) {
        const STORES = await res.json();
        for (const s of STORES) {
          const chip = document.createElement('button');
          chip.className = 'chip';
          chip.innerHTML = `<span class="dot" style="background:${s.color}"></span><span>${s.name}</span>`;
          chip.onclick = () => window.open(s.link, '_blank', 'noopener');
          chipRow.appendChild(chip);
        }
      }
    } catch (e) {
      console.warn('stores.json not found (optional).', e);
    }

    // Render loop
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    loaderEl.classList.add('hide');

    (function loop(){
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    })();

  } catch (e) {
    console.error(e);
    showErr('Error starting app (see console).');
  }
}

if (!('importmap' in document.createElement('script'))) {
  showErr('Your browser needs Import Maps (latest Chrome/Edge/Safari).');
} else {
  init();
}
