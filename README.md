# Virtual Tru Skool Mall (Turnkey)

Static three.js showroom – no build step. Drag/drop to Netlify/GitHub.

## Structure
- `index.html` – shell + loader + chips
- `src/main.js` – all app code
- `src/stores.json` – brands
- `assets/images/*` – logo placeholders (replace with real)
- `netlify.toml` – permissive CSP for jsdelivr/unpkg CDN

## Notes
- We load three.js from CDN (jsDelivr → unpkg). If both are blocked, the page will show a loader error.
- Replace logo PNGs with your own (keep same filenames or update `stores.json`).

