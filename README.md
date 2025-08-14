# Virtual Tru Skool Mall (Turnkey)

A **static** three.js showroom. No build step. Drag these files into your GitHub repo (root) and deploy on Netlify.

## Features
- Loads **Three.js** via dual-CDN fallback (unpkg → jsDelivr). No `eval`, safe for strict CSP.
- Local assets only (logos). Click a chip **or** a 3D sign to open the brand link.
- Clean lighting, shadows, orbit controls, and mobile-friendly UI.

## Run locally
Just open `index.html` with a static server (e.g. Python):  
```bash
python -m http.server 5173
# open http://localhost:5173
```

## Structure
```
index.html
netlify.toml
src/
  main.js
  stores.json
assets/
  images/*.png
```

## Update brands
Edit `src/stores.json` (add more entries, change `logo`, `color`, or `link`). Logos are in `assets/images`.

---
© Tru Skool
