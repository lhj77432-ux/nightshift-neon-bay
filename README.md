# NIGHTSHIFT / 霓虹湾

Original single-page 3D arcade street racer built with Three.js.

Play: https://lhj77432-ux.github.io/nightshift-neon-bay/

## Controls
- Keyboard: ArrowLeft / ArrowRight steering, ArrowUp accelerate, ArrowDown brake/drift, Shift nitro, C camera, R reset, Esc pause.
- Mobile landscape: hold left/right steering buttons, independent throttle/brake/nitro buttons.

## Stack
- Three.js r152.2 (vendored locally)
- Procedural lofted car bodies, independent wheel steer/spin, emissive lamps, nitro cone flames + 3D smoke.
- Spline street circuit, wall and car collisions, ramps, day/night, rain, city instancing, minimap, AI, three race modes, upgrades and localStorage progression.

Run locally with any static server:
`python -m http.server 8080`
