# Virtual Tru Skool Mall (Turnkey)

Static, no-build Three.js showroom. Drag-drop into a repo and deploy to Netlify (or any static host).

## Structure

```
index.html
src/
  main.js
  stores.json
assets/
  images/*.png
vendor/
  three/            (optional: add three.module.js & OrbitControls.js here to avoid CDNs)
netlify.toml
```

## Running locally

```
# Python 3
python -m http.server 5173
# Open http://localhost:5173
```

## Notes

- The app loads Three.js from `/vendor/three` if present, otherwise falls back to unpkg/jsDelivr.
- Update `src/stores.json` and replace the PNGs in `assets/images/` with real brand logos.
- Tweak lights in `src/main.js` to taste.
