# AGENTS.md — Operating Rules

1. Read `docs/CURRENT_SLICE.md` first. It is the only authoritative implementation scope for this session.
2. Read `docs/GAME_DESIGN.md`, `docs/HACKATHON_REQUIREMENTS.md`, and relevant parts of `docs/ARCHITECTURE.md` before changing architecture or gameplay.
3. Preserve existing working systems, but do not introduce **new features or future-phase behavior** outside the active slice. If a current slice requires touching an older system, make the smallest compatible change and preserve accepted behavior.
4. Preserve hard constraints: single-player, portrait mobile, Three.js/HTML5, no runtime network requests, local vendored `vendor/three.module.js` + `vendor/rapier.js` with relative paths, `index.html` at ZIP root, 35 MB limit, first-party code readable/unminified in submission.
5. Prefer vanilla HTML/CSS/JS + Three.js. No React, game engine, ECS, backend, CDN, or required bundler for dev. Physics/collision runtime is `@dimforge/rapier3d-compat@0.20.0` via vendored `vendor/rapier.js`; use it deliberately for approved collision, kinematic movement, and spatial queries. Do not add another physics engine.
6. Keep the build playable at the end of every session — no console-breaking errors, portrait layout intact, offline-safe.
7. Keep architecture deliberately simple and explicit for repeated agent edits. Prefer focused modules with clear ownership over frameworks or generic abstractions.
8. Validate before stopping: `npm test`, `npm run verify`, and `npm run zip` should pass unless the active slice explicitly states otherwise. Manually confirm relevant dev/submission behavior when browser testing is required.
9. Append a `docs/BUILD_LOG.md` entry for every AI implementation session (date/time, tool/model, goal, decisions, files changed, tests, remaining issues).
10. Never silently change a locked design decision. Record a proposal in `docs/BUILD_LOG.md` or the relevant design doc and ask for owner confirmation.

## Engineering Principles — Permanent

11. `src/main.js` remains a thin composition/bootstrap layer: initialize modules, wire dependencies, own the single authoritative loop, and render. Do not keep adding domain gameplay rules to it.
12. Exactly one `requestAnimationFrame` loop drives all per-frame updates and rendering. No parallel or duplicate loops.
13. Modules split by responsibility as complexity grows. Avoid god objects and duplicate parallel systems; see `docs/ARCHITECTURE.md` for current and planned boundaries.
14. Mutable state has one explicit owner. Avoid hidden cross-module mutation and shadow copies of authoritative state.
15. Dependencies are injected via imports or constructor arguments, not ambient globals.
16. Globals are debug-only: `window.__game` may expose inspection helpers, but gameplay code must not rely on it.
17. Centralize feel/balance/presentation tuning in a findable config location (`src/game/config.js` or focused colocated `*_CONFIG` exports). Avoid scattered magic numbers.
18. Gameplay rules should be testable independently of rendering where practical. Prefer pure helpers for targeting, state transitions, timing, input classification, etc.
19. Mobile performance first: cap DPR, bound pools/arrays, avoid per-frame DOM creation and unnecessary allocations, and validate on a real phone viewport.
20. No new dependencies without justification. Record any approved new dependency in `docs/BUILD_LOG.md`. `esbuild` is approved build-time-only; Rapier is the approved runtime collision/physics dependency.
21. Manual testing instructions must be written for the human player, not the implementer. For every manual test, explain the recognizable setup/location, exact action, expected correct behavior, and visible/audible failure signs. Coordinates/internal IDs may supplement but never replace player-facing descriptions.
22. Human playtest observations override implementation claims for perceptual requirements. “A yaw value changed,” “a sound function exists,” or “a test passes” is not proof that a swing, trail, audio cue, telegraph, or UI element is actually readable in play.
23. Preserve accepted movement, harvesting, collision, performance, and submission behavior unless the active slice explicitly changes it.

## Change Closure / Consistency Sweep — Permanent

24. When changing a **shared behavior, schema, transform, lifecycle, input path, persistence rule, or other cross-system contract**, do not patch only the reported example. Identify the sibling systems/object families that use the same path and verify the change end-to-end across the relevant chain: **input/UI → authoritative state/data → validation → runtime representation → physics/gameplay → persistence/export → tests**. A fix is incomplete if the same underlying inconsistency remains in another sibling path covered by the active slice.
25. Be proactive **horizontally across consistency, not vertically into future scope**. If fixing a fence transform reveals the same transform bug in boxes and boundaries, fix/verify those sibling cases. Do not use that as permission to invent a construction system, new gameplay feature, or future-phase behavior. In the final response, briefly name the sibling paths checked whenever a shared contract changed materially.

## Git Workflow — Owner Locked

26. Work directly on `main`. Do not create or use task or feature branches for this project, locally or remotely, unless Chris explicitly reverses this rule. Commit cohesive work directly to `main`.
