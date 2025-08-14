# Virtual Tru Skool Mall (Investor Demo)

A polished, static three.js scene you can deploy as-is to Netlify/Vercel/GitHub Pages.
- CDN-loaded Three.js (no build step)
- Clickable brand chips + 3D signs
- Optional central portal: place your `assets/models/portal.glb` and it will appear
- Soft lights, shadows, mobile-friendly orbit controls

## Run locally (any static server)
```bash
python -m http.server 5173
# then open http://localhost:5173
```

## Edit brands
Update `/src/stores.json`:
```json
[
  { "id":"faithfully-faded", "name":"Faithfully Faded", "logo":"/assets/images/faithfully-faded.png", "link":"https://www.faithfully-faded.com", "color":"#213a8f" }
]
```

## Deploy
- Netlify: point **publish directory** to project root (`/`). No build command required.
- Vercel: framework = **Other**, output = `/`.
