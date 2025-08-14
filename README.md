# Virtual Tru Skool Mall (CDN-only, static)

Three.js showroom you can deploy to **Netlify** (or any static host).  
_No build step. No vendor folder. Libraries load from CDNs with fallback._

## Run locally
Use any static server (so ES modules work):

```bash
# Python
python -m http.server 5173
# open http://localhost:5173
```

## Structure
```
assets/
  images/            # put brand images here (optional)
  models/            # put portal.glb here (optional)
src/
  main.js            # 3D scene + UI
  stores.json        # edit brands, colors, links
index.html
netlify.toml
```

## Add your portal
Drop a file at `assets/models/portal.glb`. The app will auto-load it if present.