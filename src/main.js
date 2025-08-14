// src/main.js — local-only imports (no CDNs)
import * as THREE from '/vendor/three/three.module.js';
import { OrbitControls } from '/vendor/three/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';

// ------- small helpers -------
const $ = (sel) => document.querySelector(sel);
const hideLoader = () => $('#loader')?.classList.add('hide');
const setLoaderText = (t) => { const el = $('#loaderMsg'); if (el) el.textContent = t; };

// ------- scene / renderer -------
const canvas = $('#three');
if (!canvas) throw new Error('Canvas #three not found');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0f);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.4, 8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI * 0.49;

// ------- lights -------
const hemi = new THREE.HemisphereLight(0xddeeff, 0x0b0b10, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 8, 4);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 50;
scene.add(dir);

const rim = new THREE.SpotLight(0x6aa0ff, 0.8, 20, Math.PI / 6, 0.4, 1.5);
rim.position.set(-6, 6, -2);
rim.target.position.set(0, 1.3, 0);
rim.castShadow = true;
scene.add(rim);
scene.add(rim.target);

// ------- ground -------
const ggeo = new THREE.CircleGeometry(20, 96);
const gmat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.95, metalness: 0.0 });
const ground = new THREE.Mesh(ggeo, gmat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ------- portal model (optional) --
