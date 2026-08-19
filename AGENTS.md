# AGENTS.md — Operating Rules

1. Read `docs/CURRENT_SLICE.md` first. It is the only authoritative implementation scope for this session.
2. Read `docs/GAME_DESIGN.md` and `docs/HACKATHON_REQUIREMENTS.md` before changing architecture or gameplay.
3. Do not expand scope beyond the active slice. No harvesting, combat, Wildkin, inventory, progression, base building, Matter Resonator, waystones, or other future systems until their slice is active.
4. Preserve hard constraints: single-player, portrait mobile, Three.js/HTML5, no runtime network requests, local vendored `vendor/three.module.js` with relative paths, `index.html` at ZIP root, 35 MB limit, first-party code readable/unminified in submission.
5. Prefer vanilla HTML/CSS/JS + Three.js. No React, game engine, ECS, physics engine, backend, CDN, or required bundler for dev.
6. Keep the build playable at the end of every session — no console-breaking errors, portrait layout intact, offline-safe.
7. Keep architecture deliberately simple and explicit for repeated agent edits (`src/game/createScene.js`, `createCamera.js`, `createRenderer.js`).
8. Validate before stopping: `npm run build` + `npm run validate` must pass; manually confirm dev and submission builds both load.
9. Append a `docs/BUILD_LOG.md` entry for every AI session (date/time, tool/model, goal, decisions, files changed, tests, remaining issues).
10. Never silently change a locked design decision. Record proposals in `docs/BUILD_LOG.md` or the relevant doc and ask for owner confirmation.
