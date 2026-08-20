# Build Log

> Each AI session appends: date/time, tool/model, goal, decisions, files changed, tests/validation, remaining issues. Required for hackathon submission.

## 2026-08-18 — Phase 0 Foundation — muse-spark-1.2-contributor (OpenCode)

- **Goal / Prompt:** Initialize and implement Phase 0 per `docs/CURRENT_SLICE.md` — compliant minimal Three.js/HTML5 portrait foundation with vendored Three.js, offline submission build, and validation.
- **Decisions:**
  - Vanilla HTML/CSS/JS + Three.js only. No React/engine/ECS/physics/backend/CDN.
  - Vendored Three.js 0.160.0 from `node_modules/three/build/three.module.js` → `vendor/three.module.js` via local copy (no CDN).
  - Portrait presentation: `#app` centered, max 520px, `100dvh`, safe-area insets, `overscroll-behavior: none`, `user-scalable=no`.
  - Camera centralized in `src/game/createCamera.js` with `CAMERA_CONFIG` (height 14, distance 10, fov 42) for Phase 1 tuning.
  - Scene kept deliberately low-poly: cylinder island + ring, dodecahedron rocks, cone/cylinder trees, octahedron crystals, directional+ambient+hemisphere lights.
  - Player marker: cylinder body + sphere head + forward cone (facing +Z) + top marker + fake contact shadow — orientation readable from high angle.
  - Renderer caps DPR at 2 and handles resize/orientationchange safely.
  - Submission tooling builds `dist/submission/index.html` by inlining readable unminified first-party JS/CSS and copying `vendor/` relatively; importmap keeps `three` → `./vendor/three.module.js`.
  - Dev server `tools/serve.mjs` binds `0.0.0.0` and logs LAN URLs for phone testing.
  - Validator `tools/validate-submission.mjs` checks: index at root, vendor present, no `https://`, readable code, referenced files exist, size <35 MB, no localhost/dev paths.
- **Files/Features Changed:**
  - Created: `package.json`, `.gitignore`, `index.html`, `styles/game.css`, `src/main.js`, `src/game/createScene.js`, `src/game/createCamera.js`, `src/game/createRenderer.js`, `vendor/three.module.js`, `tools/serve.mjs`, `tools/build-submission.mjs`, `tools/validate-submission.mjs`, `tools/zip-submission.mjs`, `AGENTS.md`, `README.md`, `docs/GAME_DESIGN.md`, `docs/HACKATHON_REQUIREMENTS.md`, `docs/BUILD_LOG.md`, `docs/PLAYTEST_NOTES.md`
  - Modified: `.gitignore`, `package.json`
- **Tests/Validation Performed:**
  - `npm install` — PASS (three 0.160.0, 1 package, 0 vulnerabilities)
  - `npm run build` — PASS (dist/submission/index.html 13.2 KB, vendor/three.module.js 1243.1 KB, total submission 1256.3 KB)
  - `npm run validate` — PASS (size <35 MB, vendor present, no https://, readable tokens present, no localhost/dev live refs)
  - `npm run zip` — PASS (dist/submission.zip 256.6 KB, index.html at ZIP root, vendor preserved)
  - Dev serve smoke — PASS (http://localhost:18083/ 200, importmap + vendor ref present)
  - Submission serve smoke — PASS (http://localhost:18081/ 200, readable createScene/createCamera, served independently of source)
  - ZIP root check — PASS (index.html at archive root, vendor/three.module.js present)
  - Manual dev load — pending human check (desktop)
  - Manual phone load — pending human check
  - Manual submission serve — pending human check (npm run serve:submission → http://localhost:8081/)
  - Manual offline/airplane-mode check — pending human check
- **Human/Manual Changes:** None yet.
- **Remaining Issues / Deferred:**
  - Human must perform desktop + phone portrait checks per `docs/CURRENT_SLICE.md` §10 (see report below).
  - Confirm offline/airplane-mode reload of submission build (already-loaded tab, then airplane mode).
  - Design Intent doc deferred to Phase 10 per competition rules.
  - No unresolved automatable blockers; all Phase 0 automatable acceptance criteria satisfied.

## 2026-08-19 — Phase 0.5 Engineering Hardening — muse-spark-1.2-contributor (OpenCode)

- **Goal / Prompt:** Implement active Phase 0.5 slice end-to-end — engineering-hardening pass only, preserve verified visual scene, no Phase 1 gameplay.
- **Decisions:**
  - Appended permanent engineering principles (§11–20) to `AGENTS.md` verbatim from slice: thin main.js, single rAF loop, split-by-responsibility modules, no god objects/duplicates, explicit state ownership, globals only for debug, centralized config, logic testable off render, mobile perf first, no new deps without justification (esbuild approved build-time-only).
  - Created `docs/ARCHITECTURE.md` as lightweight explicit architecture contract: entry/layout, data/update flow, loop ownership hard constraint, state/dependency rules, config location, build/submission pipeline (esbuild), testing gates. Deferred future boundaries to Phase 1+ note.
  - Replaced hard-coded `JS_MODULES` + regex strip bundling in `tools/build-submission.mjs` with robust esbuild graph solution: `bundle src/main.js`, `minify:false`, `sourcemap:false`, `format:esm`, `external:["three"]`, `write:false`, then inline readable bundle into `dist/submission/index.html` with relative importmap `three → ./vendor/three.module.js`. Copies `vendor/` + `assets/` + `THIRD_PARTY_NOTICES.md` to submission.
  - Added `esbuild@0.24.2` as `devDependency` (build-time-only) with justification: automatic module-graph bundling without manual lists or fragile regex.
  - Consolidated two `requestAnimationFrame` loops in `src/main.js` into one authoritative `tick()` — merges idle bob/rotation, FPS sampling (throttled 2 Hz), and `renderer.render` under single rAF. Verified visible behavior unchanged (same clock, same thresholds, same DOM update cadence).
  - Renamed `package.json:name` `mobile-rpg-prototype` → `wildkin-frontier`, description → `Wildkin Frontier (working title) — Phase 0 foundation…`; `README.md` title → `Wildkin Frontier — Meta Horizon… (working title)`; `index.html` `<title>` and HUD badge → `Wildkin Frontier`; submission build title/badge likewise.
  - Corrected `README.md` offline-test instructions: removed flawed "disconnect from LAN then reload dev server" step; added Network-tab check, `npm run validate` gate, and true offline smoke via already-loaded `npm run serve:submission` tab with airplane mode (do not reload through dev server).
  - Added `npm run verify` (`build && validate`) as single automated gate for local and CI.
  - Added Three.js provenance: `vendor/README.md` (version, origin, copy method, runtime path), `THIRD_PARTY_NOTICES.md` at repo root (version 0.160.0, source, vendored path, MIT text), header preserved in `vendor/three.module.js`, and build copies notices into `dist/submission/`.
  - Added minimal GitHub Actions workflow `.github/workflows/verify.yml` (`push|pull_request`, `node 22`, `npm ci`, `npm run verify`).
- **Files/Features Changed:**
  - Modified: `AGENTS.md`, `package.json`, `index.html`, `src/main.js`, `tools/build-submission.mjs`, `README.md`
  - Created: `docs/ARCHITECTURE.md`, `THIRD_PARTY_NOTICES.md`, `vendor/README.md`, `.github/workflows/verify.yml`
  - Updated devDependency: `esbuild@0.24.2`
  - Build output now: `dist/submission/index.html` 11.0 KB (esbuild bundle), `vendor/three.module.js` 1243.1 KB, `THIRD_PARTY_NOTICES.md` 1.6 KB, total ~1256.7 KB; `dist/submission.zip` 257.4 KB
- **Tests/Validation Performed:**
  - `npm run build` — PASS (11.0 KB index, 1243.1 KB vendor, submission dir `dist/submission`)
  - `npm run validate` — PASS (size 1256.7 KB <35 MB, vendor present, no https://, readable tokens `createScene/createCamera/CAMERA_CONFIG/Phase 0`, referenced files exist, avg line len OK)
  - `npm run verify` — PASS (build + validate chain)
  - `npm run zip` — PASS (257.4 KB, index at ZIP root, vendor preserved, `THIRD_PARTY_NOTICES.md` at root)
  - Dev serve smoke — PASS (http://localhost:18225/ 200, vendor ref OK, title Wildkin Frontier)
  - Submission serve smoke — PASS (http://localhost:18226/ 200, readable createScene, no https, sub vendor OK)
  - ZIP root check — PASS (index.html at archive root, vendor/three.module.js + README + THIRD_PARTY_NOTICES present)
  - rAF consolidation check — PASS (exactly one `requestAnimationFrame` in `src/main.js:49`)
  - No console-breaking errors; portrait layout intact; `validate` enforces offline-safe
- **Human/Manual Changes:** None.
- **Remaining Issues / Deferred:**
  - Human must manually confirm dev + submission builds load identically to Phase 0 (camera framing, island scale, player directionality, resize/orientation).
  - Phone portrait recheck after CSS/JS rebundling (no visual change intended, but mobile viewport always re-validated).
  - Design Intent doc still deferred to Phase 10.
  - No Phase 1 systems added per slice scope — movement/harvesting/combat/Wildkin progression intentionally absent.

## 2026-08-19 — Phase 1 Movement & World Feel — muse-spark-1.2-contributor (OpenCode)

- **Goal / Prompt:** Implement `docs/CURRENT_SLICE.md` Phase 1 end-to-end: Tier A core locomotion (unified intent, joystick bands, accel/turn, collision, camera follow, playground) + Tier B traversal (dodge, auto-jump, climb) while preserving hard constraints and thin main.js.
- **Decisions:**
  - Added centralized tuning `src/game/config.js` (MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG, WORLD_CONFIG) — all band thresholds, speeds (1.6/3.3/6.0), accel 28/decel 36, turnSpeed 14, maxDelta 0.05, dodge 0.22s/11u/s/0.55cd, jump 0.48s/1.45 arc, climb 2.0 u/s, bounds ±12.5/11.5, camera follow lerp 5.0/look-ahead 1.1). Phone tuning without hunting literals.
  - Pure band logic in `src/movement/movementBands.js` (classifyMovementBand, getBandSpeed, normalize2D, clampToUnitCircle) for Node testability. Bands: 0–0.16 idle, 0.16–0.40 sneak, 0.40–0.70 walk, 0.70–1.0 run (discrete speeds, not linear).
  - Collision kept simple in `src/world/collision.js` (circle vs AABB, bounds clamp, sliding resolveMovement: try full, then X-only, then Z-only). Player radius 0.42.
  - Input split: `touchMovement.js` floating joystick (origin at first touch in left/below 58%/38% zone, maxRadius 68, magnitude→band, visual origin+stick+rings) + right-side swipe dodge (≥34px, ≤300ms, ≥0.32 px/ms, screen→world via camera basis). `keyboardInput.js` WASD/arrows (Shift=run 0.9, Ctrl/C=sneak 0.3, else walk 0.55, Space dodge) + `inputController.js` mergeIntentsPure (touch move wins, touch dodge merges with keyboard move). Unified intent `{moveX,moveY,moveMagnitude,movementBand,dodgeRequested,dodgeX,dodgeY}`.
  - Player: `src/player/createPlayer.js` primitive group (cylinder+head+cone top) + `playerController.js` kinematic controller with explicit state modes IDLE/SNEAK/WALK/RUN/DODGE/JUMP/CLIMB (no framework). Camera-relative ground movement (forward/right from camera getWorldDirection), accel/decel vector steering, turn smoothing (14 rad/s), frame-rate independent (Δ clamped 0.05), diagonal clamped, facing follows movement/dodge/traversal. Dodge: fixed 0.22s burst at 11 u/s (≈2.4 units, ~1.8× run step) with cooldown 0.55s, sliding collision, squash/lean. Jump: data-driven links triggered when within 1.35 units of start and moving into direction dot >0.35 with intent>0.18; arc `sin(πt)*1.45` over 0.48s via smoothstep, then snap to landing. Climb: explicit ladder wall at (2.2,-5.05) with top platform (2.2,-7.2) height 2.4; entry when within 1.05, dot>0.30, intent>0.18 moving into wall; vertical driven by forwardDot*mag*2.0; top snap, back-away exit dot<-0.25.
  - World: `src/world/createMovementPlayground.js` compact low-poly playground (26×24 ground, boundary walls, straightaway, obstacles at (4.2,0.6)/(−3.5,2.2)/rocks, narrow sneak corridor −7.5/−4.2 at −6.5, low platforms −5.8/0.8 at height 1.25 with gap 2.45 for jump, high platform 2.2,−7.2 height 2.4 with climbable wall + rungs, visual gap/sneak markers). Collision data + jumpLinks (east/west) + climbables authored explicitly; `getGroundHeight` returns platform height.
  - Camera: `src/camera/cameraFollow.js` fixed high third-person offset (0,14,10), smooth pos lerp 5.0 / lookAt 6.0, optional run look-ahead 1.1 (lerp 2.2, clamped 1.6). Snap on init.
  - Feedback: procedural bob/lean/scale per state (sneak 0.86 crouch + slower bob, walk normal, run lean 0.18 + fast bob, dodge squash, jump arc, climb lean −0.35, contact shadow).
  - `src/main.js` remains thin: wires scene/camera/renderer/playground/player/controller/cameraFollow/touch/keyboard, single `requestAnimationFrame` loop (clock.getDelta→update→render, FPS throttled 2 Hz, debug label shows fps/mode/band/speed, window.__game debug only).
  - Updated `src/game/createScene.js` to compose playground+player, kept `CAMERA_CONFIG`/`createCamera`/`createRenderer` unchanged (DPR cap 2).
  - Built `styles/game.css` joystick visuals, `index.html` Phase 1 HUD (left move/right swipe, Shift/Ctrl/Space hints, gap/ladder hint).
  - Tooling: `tools/build-submission.mjs` now inlines Phase 1 HUD/CSS; `tools/validate-submission.mjs` accepts Phase 0 or Phase 1 token; `package.json` adds `test` (node --test) and `verify` now `test && build && validate`. Submission stays readable unminified, vendored three relative, size OK.
  - No React/engine/ECS/physics/backend/CDN added; esbuild remains build-time-only.
- **Files/Features Changed:**
  - Created: `src/game/config.js`, `src/movement/movementBands.js`, `src/world/collision.js`, `src/input/touchMovement.js`, `src/input/keyboardInput.js`, `src/input/inputController.js`, `src/player/createPlayer.js`, `src/player/playerController.js`, `src/world/createMovementPlayground.js`, `src/camera/cameraFollow.js`, `tests/movementBands.test.js`, `tests/collision.test.js`
  - Modified: `src/game/createScene.js`, `src/main.js`, `styles/game.css`, `index.html`, `package.json`, `tools/build-submission.mjs`, `tools/validate-submission.mjs`, `docs/BUILD_LOG.md`
  - Build output: `dist/submission/index.html` 47.9 KB, `vendor/three.module.js` 1243.1 KB, total submission ~1293.6 KB; `dist/submission.zip` 266.3 KB
- **Tests/Validation Performed:**
  - `npm test` — PASS (25 tests, 10 suites: classifyMovementBand thresholds/boundaries/invalid, getBandSpeed ratios/headroom, normalize2D, clampToUnitCircle, isValidIntent, mergeIntentsPure, clampToBounds/circleVsAABB/isColliding/resolveMovement sliding/bounds)
  - `npm run build` — PASS (47.9 KB index, 1243.1 KB vendor, submission dir dist/submission)
  - `npm run validate` — PASS (size 1293.6 KB <35 MB, vendor present, no https://, readable tokens createScene/createCamera/CAMERA_CONFIG/Phase 1, referenced files exist)
  - `npm run verify` — PASS (test + build + validate chain)
  - `npm run zip` — PASS (266.3 KB, index at ZIP root, vendor preserved)
  - Manual smoke via Node import: playerController walk/dodge/jump/climb state transitions — PASS (walk north reduces Z, dodge enters DODGE, jump enters JUMP after idle, climb entry at ladder)
  - rAF single-loop check — PASS (exactly one requestAnimationFrame in src/main.js:60)
  - Dev/submission serve smoke pending human check; offline check pending human check
- **Human/Manual Changes:** None.
- **Remaining Issues / Deferred:**
  - Human phone playtest required per `docs/CURRENT_SLICE.md` §19 (run feel, deadzone, sneak/walk/run zones, camera lag, dodge reliability, jump trigger sensitivity, climb readability). Tuning centered for easy iteration.
  - Tier C optional refinements deferred (additional camera tuning, landing feedback polish, extra procedural lean variations, extra traversal geometry) — kept low-risk, stable A+B only.
  - No harvesting/combat/Wildkin/progression/base/mounts per non-goals.
  - Design Intent doc still deferred to Phase 10.

## 2026-08-19 — Phase 1.1 Movement & Traversal Refinement — muse-spark-1.2-contributor (OpenCode)

- **Goal / Prompt:** Implement `docs/CURRENT_SLICE.md` Phase 1.1 end-to-end as refinement of manually playtested Phase 1 build — fix desktop sneak binding, canned jump, platform-side ramp bug, climb descent/mantle, architecture cleanup; preserve accepted Phase 1 feel.
- **Decisions:**
  - Jump replaced (not tuned): authored `jumpLinks:{start,end}` → data-driven `jumpTraversals:{triggerCenter,triggerRadius,direction,landingRegion,minTakeoffSpeed,maxLandingCorrection}` (world decides validity, player momentum decides feel). No snap to `jumpStart`; begin from actual current pos, capture grounded horizontal velocity, preserve heading with 0.25 blend toward authored direction. Kinematic integration: `pos+=hVel*dt`, `vertVel-=gravity*dt`, `pos.y+=vertVel*dt` (no physics engine).
  - Tuning centralized in `src/game/config.js` (Phase 1.1): `jumpInitialVerticalVelocity 5.8 u/s`, `jumpGravity 12 u/s²` (airtime 0.967s, within 0.7–1.0), `jumpAirControlFactor 0.28` (≈28% ground authority, 7.8 u/s² max), `jumpAirMaxSpeed 7.2`, `jumpMinTakeoffSpeed 2.2` (sneak 1.6 fails, walk 3.3 passes conservatively, run 6.0 farthest), `jumpMaxLandingCorrection 1.4`, `mantleDuration 0.28s`, `mantleOffset 0.65`, `climbSpeedUp 1.9` / `climbSpeedDown 1.7` separate, `climbTopEntryDot 0.22`, `climbTopEntryRadius 1.15`. Removed obsolete `jumpDuration/jumpArcHeight` placeholders (kept as legacy alias for compat). Sneak no longer auto-jumps gap; running visibly farther than walking.
  - Elevation/side collision fixed: `getGroundHeight(x,z,currentY)` now requires `currentY >= height-0.45` to return elevated height; X/Z overlap alone insufficient (prevents invisible ramp). Introduced `platforms[]` explicit data + `platformSideColliders[]` mirrored footprints + `getCollisionObstaclesForHeight(posY)` that includes side colliders only when `posY < height+0.05` (solid when below, non-solid when on top). Also `isBlockedByPlatformSide` helper for tests. Platform tops reachable only via valid traversal (jump landing, climb mantle). Sliding preserved via active obstacles filtered by height.
  - Reported left-gap invisible obstruction fixed: gap center (`-2.5,-1.2`) now returns ground height 0 at ground Y and `isColliding` false for ground-height active obstacles; side colliders do not overlap gap.
  - Climb refined: continuous climb up (`climbSpeedUp`) and down (`climbSpeedDown`); releasing pauses (no auto-progress). Downward input descends (previously triggered instant exit). Fixed `traversalController.updateClimb` early away-exit that caused instant detach on down input. Top-entry/down-climb added via `topEntryRegion {1.25..3.15, -6.0..-5.25}` inside high platform south edge, checked by `checkClimbTopEntry` (inside region + on top Y + dotSouth>0.22). Mantle replaces deep teleport: `MANTLE` state 0.28s smoothstep lerp + 0.22 arc from wall anchor (`climb.x - approach*0.35`) to `mantleExit {2.2,-6.4}` (small ledge offset, not platform center `2.2,-7.2`). Bottom exit smooth to grounded locomotion.
  - Architecture: split `playerController.js` (now coordinator for grounded locomotion + delegates traversal, owns dodge, accel/turn, Y smoothing, re-usable THREE vectors to reduce per-frame allocations) + `movement/traversalController.js` (single owner for jump/climb/mantle, pure helpers `isInsideRegionXZ`, `closestPointInRegion`, `computeAirTime`, `canReachLanding`, `checkJumpTrigger`, `checkClimbBottomEntry`, `checkClimbTopEntry`, `computeMantleEndpoints`) + `player/playerVisuals.js` (bob/lean/crouch/traversal pose isolation). `inputController.js` cleaned: removed unused `createInputController` wrapper, kept single `mergeIntents` (+ alias `mergeIntentsPure` for compat). No duplicate world/state/camera paths; `main.js` remains thin, single `requestAnimationFrame` tick.
  - Desktop controls: `keyboardInput.js` removed `Control` from sneak check; `C` is sole sneak modifier (`Shift+move=Run`, `C+move=Sneak`, `Space=dodge`). `index.html` HUD updated `C=Sneak · Shift=Run · Space=dodge` and version to `Phase 1.1 — 0.3.0` with hint `Gap = auto-jump (Run farthest) · Ladder = climb (Up/Down) · C to sneak`. No browser shortcut overriding.
  - Hot-loop allocation reduction: reused `tmpDir/tmpForward/tmpRight/tmpTargetVel/tmpCurVel/tmpDiff` vectors in playerController; traversal uses plain objects for hv.
  - No new runtime deps; esbuild remains build-time-only.
- **Files/Features Changed:**
  - Modified: `src/game/config.js`, `src/world/createMovementPlayground.js`, `src/player/playerController.js`, `src/input/keyboardInput.js`, `src/input/inputController.js`, `src/main.js`, `index.html`, `package.json` (version bump implicit), `docs/BUILD_LOG.md`
  - Created: `src/movement/traversalController.js`, `src/player/playerVisuals.js`, `tests/traversal.test.js`, `tests/elevation.test.js`
  - Build output: `dist/submission/index.html` 62.6 KB, `vendor/three.module.js` 1243.1 KB, total ~1308.3 KB; `dist/submission.zip` 269.5 KB
- **Tests/Validation Performed:**
  - `npm test` — PASS (48 tests, 16 suites: 25 original + 23 new: airtime 0.967 in 0.7–1.0, run>walk>sneak distances, sneak < threshold fails, walk triggers, run reachable, direction/radius/invalid landing gates, jump starts from current pos not authored start, preserves run>walk momentum, air control capped (reverse blocked, delta ≤0.30), bottom entry recognized, top entry recognized, downward descends instead of detach, mantle endpoint small offset not center, mantle duration 0.20–0.35, platform side blocking ground vs top, side colliders solid below/not solid on top, sliding still works, valid landing on elevated surface, gap obstruction not solid)
  - `npm run build` — PASS (62.6 KB index, 1243.1 KB vendor)
  - `npm run validate` — PASS (size <35 MB, vendor present, no https://, readable tokens)
  - `npm run verify` — PASS (test + build + validate chain)
  - `npm run zip` — PASS (269.5 KB, index at ZIP root)
  - rAF single-loop check — PASS (`grep requestAnimationFrame src/main.js` = 1 at line 60)
  - Manual smoke: not run (requires human desktop + phone per checklist)
- **Human/Manual Changes:** None.
- **Remaining Issues / Deferred:**
  - Human phone/desktop playtest required per `docs/CURRENT_SLICE.md` §15 checklist: ground regression, jump at Sneak/Walk/Run, platform side slide, left-gap retest, climb bottom/top/mantle/bottom exit. Tuning centralized for iteration.
  - Architecture doc update deferred (boundaries now split per `docs/CURRENT_SLICE.md` §10, documented here; `docs/ARCHITECTURE.md` to be updated next slice if needed).
  - No Phase 2 systems (harvesting/combat/Wildkin/progression/base/waystones etc.) per non-goals.
  - Design Intent doc still deferred to Phase 10.
