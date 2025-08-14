# Virtual Tru Skool Mall (Three.js Starter)

A minimal, static Three.js starter you can deploy to Vercel/Netlify or any static host.
- Click brand tiles (UI) or 3D portals to open links
- Add your own logos in `public/assets/images/`
- Edit mall entries in `src/stores.json`

## Run locally (no build step required)
Just open `index.html` with a static server (CORS-safe), e.g.
```bash
python -m http.server 5173
# then open http://localhost:5173
```

## Deploy
- **Netlify**: connect repo → set Site build to "manual" (no build) → publish directory: "."
- **Vercel**: import repo → Framework: "Other" → Output: "."

## Customize
- Replace placeholder logos with real brand marks.
- Swap portals for GLTF models and load with `GLTFLoader`.
- Add realistic characters later (Ready Player Me / custom GLTF).

