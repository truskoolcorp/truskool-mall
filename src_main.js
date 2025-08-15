import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fbcd4);

// User/group that will move when teleporting (camera sits inside)
const user = new THREE.Group();
scene.add(user);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);
user.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// VRButton (enter/exit VR)
document.body.appendChild(VRButton.createButton(renderer));

// OrbitControls for desktop testing
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.update();

// Lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemi.position.set(0, 50, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(-3, 10, -10);
dir.castShadow = true;
scene.add(dir);

// Floor / mall ground
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9, metalness: 0.0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'floor';
scene.add(floor);

// Simple mall "halls" demo: a few boxes as shops (placeholder)
const shopGeo = new THREE.BoxGeometry(4, 3, 4);
const shopMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
for (let i = -2; i <= 2; ++i) {
  const m = new THREE.Mesh(shopGeo, shopMat.clone());
  m.position.set(i * 6, 1.5, -8);
  m.material.color.setHSL((i + 3) / 8, 0.5, 0.6);
  scene.add(m);
}

// GLTF loader example (drop models into /public/assets/)
const loader = new GLTFLoader();
loader.load('/assets/mall_centerpiece.glb', (g) => {
  g.scene.position.set(0, 0, 0);
  scene.add(g.scene);
}, undefined, (e) => {
  console.warn('GLTF load error (ok if file missing in starter):', e);
});

// Teleportation (simple point-and-teleport using controller ray)
const tempMatrix = new THREE.Matrix4();
const raycaster = new THREE.Raycaster();
const teleportMarker = new THREE.Mesh(
  new THREE.CircleGeometry(0.35, 32).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({ color: 0x00ffcc, opacity: 0.85, transparent: true })
);
teleportMarker.visible = false;
scene.add(teleportMarker);

function setTeleportVisible(hitPoint) {
  teleportMarker.position.copy(hitPoint);
  teleportMarker.position.y += 0.01;
  teleportMarker.visible = true;
}

function hideTeleport() {
  teleportMarker.visible = false;
}

// Controllers
const controller1 = renderer.xr.getController(0);
scene.add(controller1);
const controller2 = renderer.xr.getController(1);
scene.add(controller2);

// Controller visuals (model)
const controllerModelFactory = new XRControllerModelFactory();
const grip1 = renderer.xr.getControllerGrip(0);
grip1.add(controllerModelFactory.createControllerModel(grip1));
scene.add(grip1);
const grip2 = renderer.xr.getControllerGrip(1);
grip2.add(controllerModelFactory.createControllerModel(grip2));
scene.add(grip2);

// Helper line to show ray from controller (simple)
function makePointerLine() {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const m = new THREE.LineBasicMaterial({ color: 0xffffff });
  const line = new THREE.Line(g, m);
  line.name = 'pointer';
  line.scale.z = 10;
  return line;
}
controller1.add(makePointerLine());
controller2.add(makePointerLine());

let teleportCandidate = null;

function onSelectStart(event) {
  // begin pointing: check floor intersection from controller
  const controller = event.target;
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).sub(origin).normalize();

  raycaster.set(origin, direction);
  const intersects = raycaster.intersectObject(floor, false);
  if (intersects.length > 0) {
    teleportCandidate = intersects[0].point.clone();
    setTeleportVisible(teleportCandidate);
  } else {
    teleportCandidate = null;
    hideTeleport();
  }
}

function onSelectEnd() {
  if (teleportCandidate) {
    // move user group so camera height remains ~1.6
    const offsetY = camera.position.y;
    user.position.set(teleportCandidate.x, teleportCandidate.y, teleportCandidate.z);
    user.position.y += 0; // floor already at y=0
    teleportCandidate = null;
    hideTeleport();
  }
}

controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);

// Animation loop
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}