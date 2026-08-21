# Wildkin Frontier — Meta Horizon Game Prototype

Single-player, portrait-mobile, Three.js/HTML5 survival & resource-management prototype for the Meta Horizon Creator Competition.

Current playable foundation includes:

- fixed high third-person / near top-down camera,
- one-thumb movement plus run/sneak/jump/dodge,
- Rapier kinematic collision, slopes/steps, falling, ladders, and mantle traversal,
- automatic + manual Field Tool harvesting,
- three resource types with chunky depletion, physical-looking drops, magnet collection, inventory, and respawn,
- first-pass melee combat with the same oversized Field Tool,
- hostile melee/ranged creature prototypes,
- player health/dodge invulnerability/death/restart,
- temporary combat XP rewards,
- offline-compliant submission build/validation.

The active development direction is **Phase 3.1 — Creature Ecology & Combat Refinement**, followed by an architecture/world-authoring checkpoint before building the first complete expedition loop.

## Prerequisites

- Node.js 18+ and npm
- Modern desktop browser
- Phone on the same Wi-Fi for device testing

Runtime is offline-safe: Three.js and Rapier are vendored locally under `vendor/`.

## Install & Run

```sh
npm install
npm run dev
# or
npm run serve
```

The dev server binds to `0.0.0.0:8080`.

- Desktop: `http://localhost:8080/`
- Phone on same network: use the LAN URL printed by the dev server, e.g. `http://192.168.x.x:8080/`

## Phone Testing

1. Run `npm run dev`.
2. Open the printed LAN URL on the phone.
3. Test portrait framing, touch movement/action gestures, combat/harvesting readability, audio, and performance.
4. Use the human checklist in the active `docs/CURRENT_SLICE.md` for slice-specific testing.

## Submission Build & Validation

```sh
npm test
npm run build
npm run validate
npm run verify
npm run zip

npm run serve:submission
# open http://localhost:8081/
```

The submission pipeline checks the important competition constraints including:

- root `index.html`,
- vendored local dependencies,
- no runtime CDN/external network references,
- readable/unminified first-party code,
- valid local references,
- package size below 35 MB.

## Offline Check

For a true submission smoke test:

1. `npm run build && npm run serve:submission`
2. Load `http://localhost:8081/`.
3. Confirm DevTools Network contains only local requests.
4. With the already-loaded game open, briefly disable network and confirm gameplay remains functional.

The server itself naturally requires local connectivity to serve/reload the page; the built game must not require external runtime services.

## Core Technology

- Three.js 0.160.0 — vendored `vendor/three.module.js`
- `@dimforge/rapier3d-compat@0.20.0` — vendored `vendor/rapier.js`
- Vanilla HTML/CSS/JavaScript
- Native ESM for development
- esbuild only for submission packaging

See `THIRD_PARTY_NOTICES.md` and `vendor/README.md` for third-party provenance/licensing.

## Current Project Structure

```text
/
  AGENTS.md
  index.html
  src/
    main.js                 # composition + one authoritative fixed/rAF loop
    game/                   # scene, camera, renderer, config
    input/                  # keyboard + touch intent
    physics/                # Rapier world/character/query helpers
    player/                 # player movement/state/visuals
    movement/               # traversal helpers
    world/                  # current systems-test world / traversal data
    resources/              # harvestables + resource pickups
    tools/                  # Field Tool visual/swing owner
    combat/                 # combat/health/targeting/projectiles/XP
    creatures/              # creature creation/config/AI system
    ui/                     # HUD/death/controls
    audio/                  # procedural/local audio
  styles/
    game.css
  vendor/
    three.module.js
    rapier.js
  docs/
    GAME_DESIGN.md          # concise stable gameplay decisions
    PROJECT_PLAN.md         # comprehensive repo planning mirror
    ARCHITECTURE.md         # current architecture + intended boundaries
    HACKATHON_REQUIREMENTS.md
    CURRENT_SLICE.md        # only implementation scope for current session
    PLAYTEST_NOTES.md
    BUILD_LOG.md
  tools/
    build-submission.mjs
    validate-submission.mjs
    serve.mjs
  dist/                     # generated
```

## Agent Read Order

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/PLAYTEST_NOTES.md` when the slice is a refinement based on human testing
4. `docs/ARCHITECTURE.md`
5. `docs/GAME_DESIGN.md`
6. `docs/HACKATHON_REQUIREMENTS.md`
7. Relevant source only

`docs/PROJECT_PLAN.md` is the comprehensive roadmap/reference; agents should not treat the whole roadmap as implementation scope. `CURRENT_SLICE.md` always controls what gets implemented in a session.
