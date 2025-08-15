```markdown
# Truskool Mall — Three.js + WebXR starter

This is a minimal starting point to build a virtual shopping mall using Three.js + WebXR.

Features included:
- Three.js scene with WebXR enabled
- VRButton to enter/exit VR
- Controller visuals and a simple point-and-teleport mechanic
- GLTF loader for adding shop models (place assets in /public/assets)

How to run
1. Install:
   npm install

2. Start dev server (Vite):
   npm run dev

3. Open in a compatible browser:
   - Use `https://localhost` or `http://localhost` (WebXR works on secure contexts except on localhost)
   - Recommended: Chrome with WebXR / Oculus Browser on Quest / Edge with WebXR support

Where to put assets
- Place GLTF/GLB files in /public/assets (Vite serves the public folder as root)
- The starter code tries to load `/assets/mall_centerpiece.glb` — replace with your own asset or remove that call

Recommended next steps
- Replace placeholder shops with optimized GLTF shop models
- Build a navigation mesh for free movement or more robust teleporting (navmesh + pathfinding)
- Add product interaction UI (gaze / controller ray) using three-mesh-ui or HTML panels in world-space
- Implement LOD, texture atlases and mesh instancing for performance
- Add server-side API for dynamic shop/product content
- Consider accessibility: seated mode, locomotion options, comfort mode, subtitles

Notes
- WebXR requires HTTPS in production; localhost is allowed for development.
- Test on target devices early (Quest/Meta Browser, Pico, or PC + headset) — behavior differs per device.
```
