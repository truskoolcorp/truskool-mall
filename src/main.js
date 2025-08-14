// src/main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/objects/Sky.js';
import { RectAreaLightUniformsLib } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/lights/RectAreaLightUniformsLib.js';

const sel = (q) => document.querySelector(q);
const canvas = sel('#three');
const chipRow = sel('#chipRow');

async function getStores() {
  const res = await fetch('/src/stores.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('stores.json not found');
  return res.json();
}

// ---------- Renderer / Scene / Camera ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.physicallyCorrectLights = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.3, 7.2);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.3, 0);
controls.minDistance = 3.5;
controls.maxDistance = 18;
controls.minPolarAngle = THREE.MathUtils.degToRad(15);
controls.maxPolarAngle = THREE.MathUtils.degToRad(75);

// ---------- Environment (physically-based sky to PMREM) ----------
const sky = new Sky();
sky.scale.setScalar(800);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
const sun = new THREE.Vector3();
function updateSky() {
  // Good indoor-balanced light with subtle sun
  const phi = THREE.MathUtils.degToRad(80);   // elevation
  const theta = THREE.MathUtils.degToRad(25); // azimuth
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['turbidity'].value = 2.1;
  sky.material.uniforms['rayleigh'].value = 1.2;
  sky.material.uniforms['mieCoefficient'].value = 0.0045;
  sky.material.uniforms['mieDirectionalG'].value = 0.9;
  sky.material.uniforms['sunPosition'].value.copy(sun);

  const envRT = pmrem.fromScene(sky, 0.05);
  scene.environment = envRT.texture;
}
updateSky();

// ---------- Ground ----------
const groundGeo = new THREE.CircleGeometry(40, 128);
const groundMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x101115).convertSRGBToLinear().offsetHSL(0, 0, 0.02),
  roughness: 0.9,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Subtle ring pattern for depth (just a faint darker ring)
const rings = new THREE.Group();
for (let i = 1; i <= 6; i++) {
  const r = 3.5 * i;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.06, r + 0.06, 256),
    new THREE.MeshBasicMaterial({ color: 0x0a0b0e, transparent: true, opacity: 0.25 })
  );
  ring.rotation.x = -Math.PI / 2;
  rings.add(ring);
}
scene.add(rings);

// ---------- Lights ----------
RectAreaLightUniformsLib.init(); // for area lights

const hemi = new THREE.HemisphereLight(0x6b8cff, 0x1b1b21, 0.35);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(6, 8, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0006;
key.shadow.camera.near = 1;
key.shadow.camera.far = 30;
scene.add(key);

const rim = new THREE.DirectionalLight(0x9fbaff, 0.8);
rim.position.set(-6, 4, -6);
scene.add(rim);

// ---------- Helpers ----------
const loader = new THREE.TextureLoader();
loader.colorSpace = THREE.SRGBColorSpace;

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

async function loadLogoTexture(url, fallbackText) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => resolve(tex),
      undefined,
      () => {
        // Fallback: draw brand name onto a canvas texture (crisp on any DPI)
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 1024;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0f1116';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#eaeaf2';
        ctx.font = 'bold 140px system-ui, Segoe UI, Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fallbackText, c.width / 2, c.height / 2);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      }
    );
  });
}

function placeAroundCircle(n, radius, y = 0) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI * 0.25;
    arr.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  return arr;
}

const clickable = new Map();
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;

// ---------- Build mall ----------
async function buildMall(stores) {
  // UI chips
  chipRow.innerHTML = '';
  stores.forEach((s) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.id = s.id;
    chip.innerHTML = `<span class="dot" style="background:${s.color || '#6aa0ff'}"></span>${s.name}`;
    chip.onclick = () => window.open(s.link, '_blank');
    chipRow.appendChild(chip);
  });

  // 3D signs arranged around a circle
  const positions = placeAroundCircle(stores.length, 6.5, 0);

  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    const group = new THREE.Group();
    group.position.copy(positions[i]);
    group.lookAt(0, 1.2, 0);

    // Post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 0.6, metalness: 0.05 })
    );
    post.position.set(0, 0.6, -0.04);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);

    // Board (rounded box)
    const w = 1.05, h = 1.35, r = 0.12, d = 0.08;
    const shape = roundedRectShape(w, h, r);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.computeVertexNormals();
    const boardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(s.color || '#6aa0ff').convertSRGBToLinear().multiplyScalar(0.6),
      roughness: 0.5,
      metalness: 0.1,
      envMapIntensity: 0.9
    });
    const board = new THREE.Mesh(geo, boardMat);
    board.position.set(0, 1.4, 0);
    board.castShadow = true;
    board.receiveShadow = true;
    group.add(board);

    // Logo plane (slightly in front)
    const logoTex = await loadLogoTexture(s.logo, s.name);
    logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.86, h * 0.8),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
    );
    logo.position.set(0, 1.4, d * 0.52);
    group.add(logo);

    // Title tag above
    const title = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement('canvas');
          c.width = 512; c.height = 128;
          const ctx = c.getContext('2d');
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 56px system-ui, Segoe UI, Roboto';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.name, c.width / 2, c.height / 2);
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })()
      })
    );
    title.position.set(0, 2.2, 0.02);
    title.scale.set(1.4, 0.35, 1);
    group.add(title);

    // Local area light to make the sign read like a display
    const area = new THREE.RectAreaLight(0xffffff, 15, w * 1.2, h * 1.2);
    area.position.set(0, 1.45, 1.0);
    area.lookAt(group.position.x, 1.45, group.position.z);
    group.add(area);

    // Subtle light “glow” on the ground
    const glow = new THREE.SpotLight(new THREE.Color(s.color || '#6aa0ff'), 1.2, 4.2, THREE.MathUtils.degToRad(40), 0.35, 0.3);
    glow.p
