import * as THREE from '/vendor/three/build/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from '/vendor/three/examples/jsm/loaders/GLTFLoader.js';

// Grab canvas / renderer
const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Scene / camera / controls
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(5, 3, 8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(3, 6, 4);
sun.castShadow = true;
scene.add(sun);

// Ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.9, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Simple arch so something is visible
const mat = new THREE.MeshStandardMaterial({ color: 0x6aa0ff, roughness: 0.4, metalness: 0.1 });
const side = new THREE.BoxGeometry(0.2, 3, 0.2);
const top = new THREE.BoxGeometry(2.4, 0.2, 0.2);
const left = new THREE.Mesh(side, mat); left.position.set(-1.1, 1.5, 0); left.castShadow = true;
const right = new THREE.Mesh(side, mat); right.position.set( 1.1, 1.5, 0); right.castShadow = true;
const header = new THREE.Mesh(top,  mat); header.position.set(0, 3, 0);   header.castShadow = true;
const arch = new THREE.Group(); arch.add(left, right, header); scene.add(arch);

// Hide loader
const loader = document.getElementById('loader');
if (loader) loader.classList.add('hide');

// Resize
function onResize(){
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

// Render loop
function tick(){
  controls.update();
  arch.rotation.y += 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
