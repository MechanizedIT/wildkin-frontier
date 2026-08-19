# Architecture — Wildkin Frontier (Phase 0.5)

> Lightweight, explicit, and human-editable. No framework magic.

## Goals

- One authoritative game loop owns all per-frame work and rendering.
- `src/main.js` is a thin bootstrap/composition layer — wires modules, owns the loop, contains no domain gameplay logic.
- Modules split by responsibility so future slices extend cleanly — avoid god objects and duplicate parallel systems.
- Mobile-first: capped DPR, minimal per-frame allocations, low draw calls, portrait 520px shell.
- Offline-safe: Three.js vendored at `vendor/three.module.js` via relative importmap; no runtime CDN/network requests.

## Entry & Layout

```
index.html                  # portrait shell, importmap (three → ./vendor/three.module.js), module entry
styles/game.css             # portrait HUD + safe-area framing
src/main.js                 # bootstrap: create scene/camera/renderer, resize, single rAF loop, debug label
src/game/
  createScene.js            # scene graph, lighting, placeholder island/player, pure geometry only
  createCamera.js           # CAMERA_CONFIG + createCamera / positionCamera / updateCameraAspect
  createRenderer.js         # WebGLRenderer with DPR cap (≤2) + resize helper
  config.js                 # (future) centralized tuning — camera, movement, balance constants
```

### Data / Update Flow (Phase 0.5)

```
main.js bootstrap
  ├─ createScene()        → { scene, player }    // no gameplay state yet
  ├─ createCamera(aspect) → PerspectiveCamera     // CAMERA_CONFIG-driven
  ├─ createRenderer(canvas) → WebGLRenderer       // DPR capped
  ├─ resize()             → #app.clientWidth/Height → updateCameraAspect + resizeRenderer
  └─ single rAF loop (tick):
       ├─ dt from THREE.Clock (or performance.now)
       ├─ player idle bob/rotation (placeholder; removed when movement lands)
       ├─ fps sampling + debug label (≤2 Hz, not per-frame DOM)
       └─ renderer.render(scene, camera)
```

Resize is explicit: `#app` dimensions, not `window.innerWidth`, so desktop letterboxing and phone portrait stay correct. `orientationchange` debounces 200 ms for Safari.

## Loop Ownership (hard constraint)

- Exactly one `requestAnimationFrame` loop lives in `src/main.js`. Modules may export `update(dt)` helpers, but they are called by that loop — they do not start their own loops.
- No second world/state/camera/update path. If adding systems later, they hang off the main loop via an explicit `update` call graph (e.g., `updatePlayer(dt)`, `updateWorld(dt)` in their own modules).

## State & Dependencies

- Owner of mutable state is explicit (the module that creates it).
- Dependencies are injected via imports or constructor arguments, not ambient globals.
- `window.__game` is debug-only (console inspection); gameplay code must not read/write it.

## Configuration

- Presentation-affecting constants live in a findable location: `CAMERA_CONFIG` (height/distance/fov) exported from `createCamera.js`, and upcoming `src/game/config.js` for cross-cutting tuning.
- No scattered magic numbers for feel/balance — promote them to named config exports when they appear.

## Build & Submission

- Dev: no bundler. Native ESM + importmap, served by `tools/serve.mjs`.
- Submission: build-time-only `esbuild` bundles `src/main.js` (graph-resolved), `minify:false`, `sourcemap:false`, `format:esm`, `external:["three"]`. The emitted IIFE/ESM bundle is inlined as a single `<script type="module">` into `dist/submission/index.html` alongside inlined `styles/game.css`; the importmap remains `three → ./vendor/three.module.js` at runtime. First-party code stays readable/unminified; `three` and other vendored assets stay in `dist/submission/vendor/` with relative paths. `tools/validate-submission.mjs` enforces: index at root, vendor present, no `https://`, readable tokens, referenced files exist, size <35 MB.

## Testing & Verification

- `npm run build` + `npm run validate` are the authoritative gates; `npm run verify` runs both sequentially (used locally and in CI).
- Pure logic (math, state transitions, rules) should be testable without a WebGL context — isolate it from Three.js scene graph code where practical.

## Growth Path (non-binding)

Phase 1+ will introduce: player controller, input, follow camera, small world, collision/bounds — each as its own focused module called from the single main loop. This document must be updated when those boundaries change.
