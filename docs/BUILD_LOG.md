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

