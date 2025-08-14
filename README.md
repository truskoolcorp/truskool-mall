# Virtual Tru Skool Mall (Static)

No build step. Pure static `index.html` + `src/main.js` using Three.js via CDN import map.

## Deploy
- Upload everything to your static host (Netlify, etc.).
- Ensure CSP allows `https://cdn.jsdelivr.net` (already set in `netlify.toml`).

## Edit brands
- `src/stores.json` controls names, colors, links, and logo file paths.
- Drop your real logos in `assets/images/` and keep the paths in `stores.json`.

## Local dev
Just open `index.html` with a static server (CORS safe), e.g.
```bash
python -m http.server 5173
# then open http://localhost:5173
```
