# Virtual Tru Skool Mall (Turnkey)

Static three.js showroom — deploy to Netlify (or any static host).

- Works with **local vendor files** in `/vendor/three/*` OR falls back to CDNs.
- Add/edit brands in `src/stores.json`; logos in `assets/images/`.
- Optional `assets/models/portal.glb` for a 3D portal.

## Optional local vendor
Copy official three.js ESM files into `vendor/three/` for no‑CDN operation:
- `three.module.js`
- `examples/jsm/controls/OrbitControls.js` → place as `vendor/three/OrbitControls.js`
- `examples/jsm/loaders/GLTFLoader.js` → place as `vendor/three/GLTFLoader.js`
