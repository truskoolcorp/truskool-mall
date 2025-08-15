import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Self-healing loader: try local import map first; if it fails, re-inject a CDN import map and retry.
async function loadThreeBundle() {
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    return { THREE, OrbitControls, from: 'local' };
  } catch (e) {
    // Fallback import map that points to the official CDN
    const im = document.createElement('script');
    im.type = 'importmap';
    im.textContent = JSON.stringify({
      imports: {
        'three': 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js',
        'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/'
      }
    });
    document.head.appendChild(im);

    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    return { THREE, OrbitControls, from: 'cdn' };
  }
}

function show(msg) {
  const el = document.getElementById('loadMsg');
  if (el) el.textContent = msg;
}

function hideLoader() {
  const el = document.getElementById('loader');
  if (el) el.style.display = 'none';
}

(async () => {
  show('Loading 3D…');

  const { THREE, OrbitControls, from } = await loadThreeBundle();
  show(from === 'cdn' ? 'Loaded from CDN' : 'Loaded');

  // Renderer
  const canvas = document.getElementById('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0f);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(6, 4, 8);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  // Lights (bright & clear)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.8);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
  fill.position.set(-6, 3, -4);
  scene.add(fill);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshStandardMaterial({ color: 0x11141a, metalness: 0.0, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A simple “arch” placeholder (verifies lighting & shadows)
  const mat = new THREE.MeshStandardMaterial({ color: 0x8aa0ff, metalness: 0.1, roughness: 0.5 });
  const pillar = new THREE.BoxGeometry(0.3, 3, 0.3);
  const beam   = new THREE.BoxGeometry(2.4, 0.3, 0.3);

  const left = new THREE.Mesh(pillar, mat); left.position.set(-1.2, 1.5, 0); left.castShadow = true; scene.add(left);
  const right= new THREE.Mesh(pillar, mat); right.position.set( 1.2, 1.5, 0); right.castShadow = true; scene.add(right);
  const top  = new THREE.Mesh(beam,   mat); top.position.set( 0.0, 3.0, 0);   top.castShadow = true; scene.add(top);

  // Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // First frame will hide the loader
  let firstFrame = true;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    if (firstFrame) { hideLoader(); firstFrame = false; }
    requestAnimationFrame(tick);
  }
  tick();
})();
