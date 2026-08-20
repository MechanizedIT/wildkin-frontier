# Architecture — Wildkin Frontier (Phase 1.2)

> Lightweight, explicit, and human-editable. No framework magic.

## Goals

- One authoritative game loop owns all per-frame work and rendering.
- `src/main.js` is thin bootstrap/composition — wires modules, owns the single rAF loop, awaits Rapier, contains no domain gameplay logic.
- Modules split by responsibility so future slices extend cleanly — avoid god objects and duplicate parallel systems.
- Mobile-first: capped DPR, minimal per-frame allocations, low draw calls, portrait 520px shell.
- Offline-safe: Three.js + Rapier vendored at `vendor/three.module.js` + `vendor/rapier.js` via relative importmap; no runtime CDN/network requests. Rapier compat build inlines WASM as base64, `await RAPIER.init()` is offline.

## Entry & Layout

```
index.html                  # portrait shell, importmap (three → ./vendor/three.module.js, rapier → ./vendor/rapier.js), module entry
styles/game.css             # portrait HUD + safe-area framing
src/main.js                 # bootstrap: await RAPIER.init(), create scene/camera/renderer, createPhysicsWorld, createCharacterPhysics, single rAF loop with fixed timestep
src/game/
  createScene.js            # scene graph, lighting, playground+player, pure geometry only
  createCamera.js           # CAMERA_CONFIG + createCamera / positionCamera / updateCameraAspect
  createRenderer.js         # WebGLRenderer with DPR cap (≤2) + resize helper
  config.js                 # centralized tuning — MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG, RAPIER_CONFIG
src/physics/
  physicsConfig.js          # RAPIER_PHYSICS_CONFIG (capsule, controller, timestep mirrors RAPIER_CONFIG)
  createPhysicsWorld.js     # creates RAPIER.World (gravity 0) + fixed cuboids for ground, obstacles, platforms, boundaries
  createCharacterPhysics.js # kinematic body + capsule collider + KinematicCharacterController (offset/slide/snap/autostep)
  physicsDebug.js           # optional wireframe capsule + collider debug (disabled by default)
src/player/
  createPlayer.js           # Three.js player group (visual only, not authoritative)
  playerController.js       # authoritative movement: intent→accel→facing, verticalVelocity+gravity, Rapier controller move(), grounding via computedGrounded(), dodge/jump/climb/mantle via controller
  playerVisuals.js          # bob/lean/crouch feedback isolated
src/movement/
  movementBands.js          # band classification (pure)
  traversalController.js    # authored jump/climb/mantle triggers (pure helpers + state for gap/ladder)
src/world/
  createMovementPlayground.js # visual playground + authored traversal data (platforms/obstacles/jumpTraversals/climbables) — collision geometry now also built as Rapier cuboids
  collision.js              # legacy simple circle-vs-AABB (kept for unit tests, NOT used for player movement)
```

### Data / Update Flow (Phase 1.2)

```
main.js bootstrap (await RAPIER.init())
  ├─ createScene()        → { scene, player, playground }    // visuals + authored traversal regions
  ├─ createPhysicsWorld(RAPIER, playground) → { world, staticColliders }
  ├─ createCharacterPhysics(RAPIER, world, startPos) → { body, collider, controller }
  ├─ createPlayerController(player, playground, camera, MOVEMENT_CONFIG, characterPhysics)  // owns vel/verticalVelocity/facing/state, uses traversal helpers
  ├─ createCamera(camera) / createRenderer(canvas)
  ├─ resize()             → #app.clientWidth/Height → updateCameraAspect + resizeRenderer
  └─ single rAF loop (tick) — fixed timestep:
       ├─ dt = min(clock.getDelta(), RAPIER_CONFIG.maxDelta) with accumulator (fixedDt 1/60, maxSubsteps 4)
       ├─ mergeIntents(touch, keyboard) → intent (once per frame)
       ├─ for each physics substep:
       │    └─ playerController.update(fixedDt, intent)  → desired velocity→translation→controller.computeColliderMovement→corrected→body.setTranslation→grounded/ceiling handling→mesh sync
       ├─ cameraFollow.update(renderDt, speed, moveDir)
       ├─ physicsDebug.update() (if enabled)
       ├─ fps sampling + debug label (≤2 Hz)
       └─ renderer.render(scene, camera)
```

Resize is explicit: `#app` dimensions, not `window.innerWidth`, so desktop letterboxing and phone portrait stay correct. `orientationchange` debounces 200 ms for Safari.

## Loop Ownership (hard constraint)

- Exactly one `requestAnimationFrame` loop lives in `src/main.js`. Modules may export `update(dt)` helpers, but they are called by that loop — they do not start their own loops.
- Fixed physics timestep (1/60, max 3–4 catch-up substeps) is driven by accumulator inside that single loop; no second rAF.
- No second world/state/camera/update path.

## Rapier Architecture (Phase 1.2 decision)

- **Runtime dependency:** `@dimforge/rapier3d-compat@0.20.0` (Apache-2.0), vendored as `vendor/rapier.js` (compat base64 WASM, offline `await RAPIER.init()`). Kept external to first-party bundle via importmap (`rapier` + `@dimforge/rapier3d-compat` → `./vendor/rapier.js`) and esbuild `external`.
- **World:** `RAPIER.World({x:0,y:0,z:0})`, `timestep 1/60`. Gravity not applied via World; Wildkin code integrates `verticalVelocity += gravity*dt` (gravity -12) and passes desired translation to controller.
- **Character:** `RigidBodyDesc.kinematicPositionBased()` at capsule center, `ColliderDesc.capsule(0.20, 0.32)` (radius 0.32, halfHeight 0.20, total 1.04), `World.createCharacterController(0.02)`.
- **Controller tuning (src/physics/physicsConfig.js / RAPIER_CONFIG):** `offset 0.02`, `slide true`, `maxSlope 45°`, `minSlide 30°`, `autostep 0.20/0.18/includeDynamic false`, `snapToGround 0.20`, `up (0,1,0)`, `applyImpulsesToDynamic false`.
- **Movement:** `desired = velocity * fixedDt` → `controller.computeColliderMovement(collider, desired)` → `corrected = controller.computedMovement()` → `body.setTranslation(collider.translation()+corrected)` → `grounded = controller.computedGrounded()` → mesh synced to `collider.translation()`. Ceiling: `corrected.y < desired.y*0.3` while rising cancels `verticalVelocity`.
- **Ownership split:** Rapier owns capsule/world collision, sliding, grounding, slopes, steps, penetration. Wildkin owns speeds, accel, facing, dodge, jump vert/gravity/airControl, climb authoring, camera.
- **Old hacks removed:** `getGroundHeight` authoritative grounding, `getCollisionObstaclesForHeight/platformSideColliders/resolveStuckPosition/resolveMovement` for player, timeout forced landings, X/Z overlap ground ownership are no longer used for player movement (kept only for legacy unit tests).

## State & Dependencies

- Owner of mutable state is explicit (the module that creates it). Character physics owned by `createCharacterPhysics`; player state owned by `playerController`; playground visual data by `createMovementPlayground`.
- Dependencies are injected via imports or constructor arguments, not ambient globals.
- `window.__game` is debug-only (console inspection); gameplay code must not read/write it.

## Configuration

- All tuning in `src/game/config.js` (`MOVEMENT_CONFIG`, `CAMERA_CONFIG_FOLLOW`, `INPUT_CONFIG`, `RAPIER_CONFIG`) mirrored in `src/physics/physicsConfig.js`. No scattered literals.

## Build & Submission

- Dev: no bundler. Native ESM + importmap (`three → ./vendor/three.module.js`, `rapier → ./vendor/rapier.js`), served by `tools/serve.mjs`.
- Submission: build-time-only `esbuild` bundles `src/main.js` (`minify:false`, `sourcemap:false`, `format:esm`, `external:["three","rapier","@dimforge/rapier3d-compat"]`). Bundle inlined as readable `<script type="module">` into `dist/submission/index.html` with inlined CSS; importmap remains at runtime. Vendored assets in `dist/submission/vendor/` (three + rapier) with relative paths. `tools/validate-submission.mjs` enforces: index at root, vendor/three+rapier present, no `https://`, readable tokens, referenced files exist, size <35 MB.
- `esbuild@0.24.2` approved build-time-only bundler.

## Testing & Verification

- `npm test` (node --test), `npm run build`, `npm run validate`, `npm run verify` (test+build+validate), `npm run zip` are authoritative gates (CI + local).
- Pure logic (band classification, jump reachability, climb entry, air control caps, gravity integration, fixed-step accumulator) is testable without WebGL/Rapier. Browser/manual smoke required for WASM + collision integration.

## Growth Path (non-binding)

Phase 1+ will introduce: player controller, input, follow camera, small world — done. Next slices will extend with harvesting/combat/Wildkin progression; Rapier remains character controller only (no dynamic ragdoll/terrain trimesh yet).
