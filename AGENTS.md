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

## Engineering Principles (Phase 0.5 — permanent)

11. `src/main.js` remains a thin composition/bootstrap layer: it wires modules together, owns the single authoritative game loop, and contains no domain gameplay logic.
12. One authoritative game/update/render loop: exactly one `requestAnimationFrame` loop drives all per-frame updates and rendering. No parallel or duplicate loops.
13. Modules split by responsibility as complexity grows: prefer small, focused modules over monolithic files; see `docs/ARCHITECTURE.md` for the intended boundaries.
14. Avoid god objects and parallel duplicate systems: do not introduce a second world/state/camera/update path that shadows the primary one.
15. Explicit state/dependency ownership: the owner of mutable state is explicit; dependencies are injected via imports or constructor arguments, not ambient globals.
16. Globals only for debug: `window.__game` may exist for manual console inspection; gameplay code must not rely on global state.
17. Centralized tuning/configuration: constants that affect feel, balance, or presentation live in a single findable location (e.g., `src/game/config.js` or colocated `*_CONFIG` exports) rather than scattered literals.
18. Gameplay logic testable independently of rendering where practical: pure logic (math, state transitions, rules) should not require a WebGL context to verify.
19. Mobile performance first: cap DPR, avoid per-frame allocations, keep draw calls low, and validate on a real phone viewport.
20. No new dependencies without justification: justify any new runtime or build-time dependency in `docs/BUILD_LOG.md` and prefer zero-dependency solutions when viable. `esbuild` is the approved build-time-only bundler for submission packaging.
