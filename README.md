# Virtual Tru Skool Mall (Turnkey, local vendor imports)

This package loads Three.js from **local vendor files** (no CDN) to avoid ad/script blockers and duplicate module issues.

## IMPORTANT
Make sure your repository has **these files** under `vendor/three/` (real files, not just the README):
- `three.module.js`
- `OrbitControls.js`
- `GLTFLoader.js`  (not required if you don’t load GLBs; safe to keep)

If you used the previous setup, you already uploaded them. If not, download the matching versions from `three` and put them in `vendor/three/`.

## Run locally
Use a static server (modules won’t run from `file://`):
```bash
cd <this-folder>
python -m http.server 5173
# open http://localhost:5173
```

## Deploy
Drop these files into your repo root and deploy with Netlify (no build step).

