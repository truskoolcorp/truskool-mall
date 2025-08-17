# Virtual Tru Skool Mall (Three.js Starter)

A lightweight, production-ready Three.js mall starter you can deploy to Netlify/Vercel
with **no build step**. Just serve `index.html` from the root.

## Run locally
```bash
# Python
python -m http.server 5173
# then open http://localhost:5173
```

## Deploy
- **Netlify**: Site settings → Build & deploy → Publish directory: `.`
- **Vercel**: New Project → `Import` and set Framework as `Other` so it serves static root.

## Customize
- **Brands**: Edit `src/stores.json`. Place logo PNGs in `assets/images/` and reference them.
- **Portal arch**: Drop a GLB named `portal.glb` into `assets/models/`.
- **Lighting/positions**: Tweak values in `src/main.js`.

This template lazy-loads Three.js modules from a CDN with a backup CDN. If both fail,
the UI stays up and shows a helpful message in the loader.
