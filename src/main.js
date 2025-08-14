// --- Minimal UI hooks (optional) ---
const loaderEl = document.getElementById('loader');
const loaderMsg = document.querySelector('.load-msg');
const showErr = (m) => { if (loaderMsg) loaderMsg.textContent = m; };

// ---------- Load three.js with CDN -> CDN -> Local fallback ----------
async function loadThree() {
  const cdns = [
    'https://unpkg.com',
    'https://cdn.jsdelivr.net/npm'
  ];
  let last;

  for (const base of cdns) {
    try {
      const THREE = await import(`${base}/three@0.159.0/build/three.module.js`);
      const OrbitControls = await import(`${base}/three@0.159.0/examples/jsm/controls/OrbitControls.js`);
      const GLTFLoader = await import(`${base}/three@0.159.0/examples/jsm/loaders/GLTFLoader.js`);
      return { THREE, OrbitControls, GLTFLoader };
    } catch (e) { last = e; }
  }

  // Local vendor fallback (works even if CDNs are blocked)
  try {
    const THREE = await import('/vendor/three/three.module.js');
    const OrbitControls = await import('/vendor/three/OrbitControls.js');
    const GLTFLoader = await import('/vendor/three/GLTFLoader.js');
    return { THREE, OrbitControls, GLTFLoader };
  } catch (e) { last = e; }

  throw last ?? new Error('three.js load failed');
}

let THREE, OrbitControlsNS, GLTFLoaderNS;
try {
  ({ THREE, OrbitControls: OrbitControlsNS, GLTFLoader: GLTFLoaderNS } = await loadThree());
} catch (e) {
  console.error('Error loading 3D libs', e);
  showErr('Error loading 3D libs. If you use an ad/script blocker, allow unpkg.com & jsdelivr.net — fallback to /vendor will be used.');
  throw e;
}

// Named exports from the modules
const OrbitControls = OrbitControlsNS.OrbitControls;
const GLTFLoader = GLTFLoaderNS.GLTFLoader;

// ---------- Renderer / Scene ----------
const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);

const camera = new THREE.PerspectiveCamera(55, window.innerWidt
