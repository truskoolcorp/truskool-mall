# Virtual Tru Skool Mall (Turnkey)

Static three.js showroom — deploy to Netlify or any static host.

## Edit brands
- Open `src/stores.json` and edit `name`, `link`, `color`, `logo`.
- Add brand logo images in `assets/images/`. Keep them ~512×512 PNGs.

## GLB portal (optional)
- Drop `assets/models/portal.glb`. If found, it loads; otherwise a simple frame shows.

## Local preview
```bash
python -m http.server 5173
# then open http://localhost:5173
```
