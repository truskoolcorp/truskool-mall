# Truskool Mall — Three.js + WebXR starter

A minimal starting point to build a virtual shopping mall using Three.js + WebXR. This starter demonstrates an approach to combine a Three.js scene with WebXR entry, basic controller visuals, and simple product presentation.

## Features
- Three.js scene with WebXR enabled
- VRButton to enter/exit VR
- Basic controller visuals and point-and-teleport locomotion
- GLTF/GLB loader for shop models (place assets in `public/assets`)
- Simple product presentation panels and interaction stubs
- Vite dev server for fast iteration and static file serving
- Basic README and project metadata

## Quick start
1. Install dependencies
   - npm install
2. Run dev server (Vite)
   - npm run dev
3. Open in a compatible browser:
   - Use `https://localhost` or `http://localhost` during development.
   - Recommended: Chrome with WebXR / Oculus Browser / Edge with WebXR support.

## Project structure
- `index.html` — app entry
- `src/` — source code (Three.js + app)
- `public/assets/` — place GLTF/GLB model files here (Vite serves this folder as root)
- `package.json` — scripts & dependencies

## Assets
- Place GLTF/GLB files in `public/assets/` (example placeholder: `assets/mall_centerpiece.glb`)
- Replace placeholder models with optimized GLTF shop models for better performance

## Recommended browser & devices
- Chrome with WebXR support (desktop + headset)
- Oculus Browser (Quest/Meta) — excellent for testing VR sessions
- Edge with WebXR support on compatible devices
- Note: WebXR behavior differs per device and browser — test early on target devices (Quest, Pico, or PC + headset).

## Notes & recommendations
- WebXR requires HTTPS in production; localhost is allowed for development.
- Implement LOD, texture atlases, and mesh instancing for large scenes.
- Consider server-side API for dynamic product/shop content.
- Accessibility: provide seated/standing locomotion options, comfort modes, and subtitles where applicable.

## Contributing
- Open a PR against `main` with a clear description and testing notes.
- Prefer small, focused PRs for features and performance improvements.

## License
- MIT
