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

