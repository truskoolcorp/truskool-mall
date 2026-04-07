// TruSkool Mall — 3D Interactive Walkthrough
// Uses import map defined in index.html for Three.js resolution

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const sel = (q) => document.querySelector(q);
const showErr = (msg) => { const el = sel('.load-msg'); if (el) el.textContent = msg; };

/* ─── Globals ─── */
let renderer, scene, camera, controls, raycaster, mouse;
let storeMeshes = [];     // clickable/hoverable meshes
let STORES = [];
let hoveredStore = null;
let infoPanelTimeout = null;
const clock = { elapsed: 0, delta: 0, prev: performance.now() / 1000 };

/* ─── Main ─── */
async function start() {
  // Fetch store data
  try {
    const res = await fetch('/src/stores.json', { cache: 'no-store' });
    STORES = (await res.json()).filter(s => s.logo && s.name && s.link);
  } catch (e) {
    console.error(e);
    showErr('Could not load store data.');
    throw e;
  }

  buildChipRow();
  initRenderer();
  buildScene();
  buildMall();
  buildStorefronts();
  initInteraction();

  // Hide loader
  sel('#loader').classList.add('hide');

  // Render loop
  requestAnimationFrame(tick);
}

/* ─── Chip Row (top navigation) ─── */
function buildChipRow() {
  const chipRow = sel('#chipRow');
  chipRow.innerHTML = '';
  for (const s of STORES) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.id = s.id;
    chip.innerHTML = `<div class="dot" style="background:${s.color}"></div><span>${s.name}</span>`;
    chip.addEventListener('click', () => focusStore(s.id));
    chipRow.appendChild(chip);
  }
}

/* ─── Renderer + Camera ─── */
function initRenderer() {
  const canvas = sel('#three');
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(0, 5, 14);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.1;

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* ─── Scene: Sky, Lights, Fog ─── */
function buildScene() {
  // Gradient sky
  scene.background = new THREE.Color(0x0c0c1a);
  scene.fog = new THREE.FogExp2(0x0c0c1a, 0.018);

  // Hemisphere light — warm from above, cool from below
  const hemi = new THREE.HemisphereLight(0xffeedd, 0x1a1a2e, 0.6);
  scene.add(hemi);

  // Main directional light (sun-like)
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.0);
  sun.position.set(8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  // Fill lights
  const fill1 = new THREE.PointLight(0x6aa0ff, 0.5, 30);
  fill1.position.set(-6, 4, -4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0xf77e3e, 0.3, 25);
  fill2.position.set(6, 3, 4);
  scene.add(fill2);
}

/* ─── Mall Environment ─── */
function buildMall() {
  // --- Main floor (polished) ---
  const floorGeo = new THREE.CircleGeometry(16, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a28,
    roughness: 0.3,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- Outer ring (decorative) ---
  const ringGeo = new THREE.RingGeometry(15.5, 16.2, 64);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x6aa0ff, emissive: 0x6aa0ff, emissiveIntensity: 0.3, roughness: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // --- Center pedestal ---
  const pedGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.3, 32);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x222238, roughness: 0.4, metalness: 0.3 });
  const pedestal = new THREE.Mesh(pedGeo, pedMat);
  pedestal.position.y = 0.15;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // --- Center glowing pillar ---
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 16);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6aa0ff, emissive: 0x6aa0ff, emissiveIntensity: 0.8, roughness: 0.3 });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = 2.3;
  scene.add(pillar);

  // --- Floor path lines radiating to each store ---
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x2a2a40, emissive: 0x3a3a5a, emissiveIntensity: 0.2, roughness: 0.5 });
  for (let i = 0; i < STORES.length; i++) {
    const angle = (i / STORES.length) * Math.PI * 2 - Math.PI / 2;
    const pathGeo = new THREE.PlaneGeometry(0.3, 7);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = -angle;
    path.position.set(
      Math.cos(angle) * 4.5,
      0.02,
      Math.sin(angle) * 4.5
    );
    scene.add(path);
  }

  // --- Ambient floating particles ---
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random() * 8 + 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x6aa0ff, size: 0.06, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.userData.isParticles = true;
  scene.add(particles);
}

/* ─── Storefronts ─── */
function buildStorefronts() {
  const loader = new THREE.TextureLoader();
  const radius = 8;

  for (let i = 0; i < STORES.length; i++) {
    const s = STORES[i];
    const angle = (i / STORES.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -angle + Math.PI;

    const storeColor = new THREE.Color(s.color);

    // --- Back wall ---
    const wallGeo = new THREE.BoxGeometry(3.2, 3.2, 0.12);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x181828,
      roughness: 0.7,
      metalness: 0.1,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.6;
    wall.position.z = -0.06;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // --- Side accent strips ---
    const stripGeo = new THREE.BoxGeometry(0.08, 3.2, 0.14);
    const stripMat = new THREE.MeshStandardMaterial({
      color: storeColor,
      emissive: storeColor,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });
    const leftStrip = new THREE.Mesh(stripGeo, stripMat);
    leftStrip.position.set(-1.64, 1.6, -0.06);
    group.add(leftStrip);

    const rightStrip = leftStrip.clone();
    rightStrip.position.x = 1.64;
    group.add(rightStrip);

    // --- Top accent bar ---
    const topBarGeo = new THREE.BoxGeometry(3.36, 0.08, 0.14);
    const topBar = new THREE.Mesh(topBarGeo, stripMat);
    topBar.position.set(0, 3.24, -0.06);
    group.add(topBar);

    // --- Logo panel ---
    const tex = loader.load(s.logo);
    tex.colorSpace = THREE.SRGBColorSpace;

    const panelGeo = new THREE.PlaneGeometry(2.0, 1.5);
    const panelMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.9,
      metalness: 0.0,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 1.9, 0.02);
    panel.userData = { storeId: s.id, link: s.link, name: s.name, logo: s.logo, color: s.color };
    group.add(panel);

    // --- Store name plate ---
    const plateGeo = new THREE.BoxGeometry(2.4, 0.35, 0.06);
    const plateMat = new THREE.MeshStandardMaterial({
      color: storeColor,
      emissive: storeColor,
      emissiveIntensity: 0.4,
      roughness: 0.5,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.55, 0.04);
    group.add(plate);

    // --- Platform / base ---
    const baseGeo = new THREE.BoxGeometry(3.4, 0.15, 1.2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.075, 0.5);
    base.receiveShadow = true;
    group.add(base);

    // --- Spot light per store ---
    const spot = new THREE.PointLight(storeColor, 0.6, 6);
    spot.position.set(0, 3.5, 1.5);
    group.add(spot);

    scene.add(group);

    // Track the logo panel for raycasting
    storeMeshes.push(panel);
  }
}

/* ─── Interaction (hover + click) ─── */
function initInteraction() {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  const canvas = renderer.domElement;

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  canvas.addEventListener('pointerdown', (e) => {
    // Only left click
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(storeMeshes, false);
    if (hits.length > 0) {
      const data = hits[0].object.userData;
      window.open(data.link, '_blank');
    }
  });
}

/* ─── Focus on a store (chip click → camera move) ─── */
function focusStore(storeId) {
  const mesh = storeMeshes.find(m => m.userData.storeId === storeId);
  if (!mesh) return;

  // Get world position of the panel
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);

  // Animate camera to look at it (smooth via controls target)
  const dir = worldPos.clone().normalize();
  const targetCam = worldPos.clone().add(dir.multiplyScalar(3));
  targetCam.y = Math.max(targetCam.y, 3);

  // Simple smooth transition using controls
  const duration = 1000;
  const startTarget = controls.target.clone();
  const startPos = camera.position.clone();
  const endTarget = worldPos.clone();
  endTarget.y = 1.5;
  const startTime = performance.now();

  function animateCamera(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out

    controls.target.lerpVectors(startTarget, endTarget, ease);
    camera.position.lerpVectors(startPos, targetCam, ease);

    if (t < 1) requestAnimationFrame(animateCamera);
  }
  requestAnimationFrame(animateCamera);

  // Show info panel
  showInfoPanel(mesh.userData);
}

/* ─── Info Panel ─── */
function showInfoPanel(data) {
  const panel = sel('#infoPanel');
  sel('#infoImg').src = data.logo;
  sel('#infoImg').alt = data.name;
  sel('#infoName').textContent = data.name;
  sel('#infoDesc').textContent = 'Click to visit this TruSkool brand';
  sel('#infoLink').href = data.link;
  panel.classList.add('show');

  clearTimeout(infoPanelTimeout);
  infoPanelTimeout = setTimeout(() => panel.classList.remove('show'), 5000);
}

function hideInfoPanel() {
  sel('#infoPanel').classList.remove('show');
}

/* ─── Render Loop ─── */
function tick(now) {
  const t = now / 1000;
  clock.delta = t - clock.prev;
  clock.prev = t;
  clock.elapsed = t;

  controls.update();

  // Hover detection
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(storeMeshes, false);
  if (hits.length > 0) {
    const obj = hits[0].object;
    if (hoveredStore !== obj) {
      // Un-hover previous
      if (hoveredStore) {
        hoveredStore.scale.set(1, 1, 1);
      }
      hoveredStore = obj;
      hoveredStore.scale.set(1.08, 1.08, 1.08);
      renderer.domElement.style.cursor = 'pointer';
      showInfoPanel(obj.userData);
    }
  } else {
    if (hoveredStore) {
      hoveredStore.scale.set(1, 1, 1);
      hoveredStore = null;
      renderer.domElement.style.cursor = '';
    }
  }

  // Animate particles slowly upward and drift
  scene.traverse((child) => {
    if (child.userData.isParticles) {
      const pos = child.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y += clock.delta * 0.15;
        if (y > 9) y = 0.5;
        pos.setY(i, y);

        let x = pos.getX(i);
        x += Math.sin(t + i) * clock.delta * 0.02;
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
  });

  // Subtle center pillar glow pulse
  scene.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissive) {
      // Only pulse the center pillar (thin cylinder at y=2.3)
      if (child.geometry.type === 'CylinderGeometry' && Math.abs(child.position.y - 2.3) < 0.1) {
        child.material.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.3;
      }
    }
  });

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ─── Boot ─── */
start().catch((e) => {
  console.error('Failed to start TruSkool Mall:', e);
  showErr('Error starting the 3D mall — see console for details.');
});
