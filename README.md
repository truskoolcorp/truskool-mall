# Virtual Tru Skool Mall (Turnkey)

Static three.js showroom (no build step).

## Run locally
```bash
python -m http.server 5173
# then open http://localhost:5173
```

## Deploy to Netlify
- Build command: (leave blank)
- Publish directory: `.`

## Add a portal model (optional)
Place `assets/models/portal.glb` (if present the code would load it; otherwise a simple frame is shown).

## Brands
Edit `src/stores.json`. Logos live in `assets/images/*.png`.
