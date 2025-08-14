# Virtual Tru Skool Mall (static three.js)

No build step. Deploy the repo root to Netlify (or any static host).

- `index.html` provides the UI and an import-map pinning **three@0.159.0** from jsDelivr.
- `src/main.js` imports `three` (via import map) and `OrbitControls`/`GLTFLoader` from the same version on jsDelivr.
- `src/stores.json` lists your brands (edit colors/links/logos).
- `assets/images/` holds placeholder logos (replace at will).
- No duplicate Three.js instances, no bundler required.

If you prefer to run **offline/no CDN**, download these files and place them under `vendor/three/` then change the import-map in `index.html` to point at `"/vendor/three/build/three.module.js"`:

- `build/three.module.js`
- `examples/jsm/controls/OrbitControls.js`
- `examples/jsm/loaders/GLTFLoader.js`
