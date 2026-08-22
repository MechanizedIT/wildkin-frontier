# Wildkin Frontier — Meta Horizon Game Prototype

Single-player, portrait-mobile, Three.js/HTML5 survival & resource-management prototype for the Meta Horizon Creator Competition.

## Current Playable Foundation

- fixed high third-person / near top-down camera,
- one-thumb movement plus run/sneak/jump/dodge,
- Rapier kinematic collision, slopes/steps, falling, ladders, and mantle traversal,
- automatic + manual Field Tool harvesting,
- three resource types with chunky depletion, collision-aware physical-looking drops, magnet collection, inventory, and respawn,
- first-pass melee combat with the same oversized Field Tool,
- melee/ranged Wildkin prototypes,
- aggressive / territorial / defensive / skittish temperament behavior,
- selected Wildkin-vs-Wildkin reactions,
- home/roam/leash/return + lightweight obstacle steering,
- player health/dodge invulnerability/death/restart,
- cyan faceted XP essence with collision-aware pop/rest + guaranteed magnet collection,
- offline-compliant submission build/validation.

**Phase 3.1 / 3.1.1 is accepted for now.**

The active development direction is **Phase 3.5A — Core-Loop Architecture, World Data & Region Activation**. This is a bounded foundation slice before a minimal author-mode pass and then the first complete Camp → expedition → extract/die → Camp loop.

## Core Game Direction

Wildkin Frontier is being focused around short, replayable directed expeditions:

**Camp → choose an unlocked major Waypoint start → explore/harvest/avoid/fight/bond → accumulate unsecured value → EXTRACT or KEEP GOING at frontier anchors → bank or lose the run → progress → go again.**

Major Waypoints unlock future start locations. Smaller Extraction Beacons allow safe extraction but do not become start points, preserving the push-or-secure decision.

See `docs/GAME_DESIGN.md` and `docs/PROJECT_PLAN.md` for the current stable direction.

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

The submission pipeline checks important competition constraints including:

- root `index.html`,
- vendored local dependencies,
- no runtime CDN/external network references,
- readable/unminified first-party code,
- valid local references,
- package size below 35 MB.

## Offline Check

1. `npm run build && npm run serve:submission`
2. Load `http://localhost:8081/`.
3. Confirm DevTools Network contains only local requests.
4. With the already-loaded game open, briefly disable network and confirm gameplay remains functional.

The local server naturally requires local connectivity to serve/reload the page; the built game itself must not require external runtime services.

## Core Technology

- Three.js 0.160.0 — vendored `vendor/three.module.js`
- `@dimforge/rapier3d-compat@0.20.0` — vendored `vendor/rapier.js`
- Vanilla HTML/CSS/JavaScript
- Native ESM for development
- esbuild only for submission packaging

See `THIRD_PARTY_NOTICES.md` and `vendor/README.md` for third-party provenance/licensing.

## Project Structure

```text
/
  AGENTS.md
  README.md
  index.html
  src/
    main.js                 # composition + one authoritative fixed/rAF loop
    game/                   # scene, camera, renderer, config
    input/                  # keyboard + touch intent
    physics/                # Rapier world/character/query helpers
    player/                 # player movement/state/visuals
    movement/               # traversal helpers
    world/                  # current world + upcoming data/region ownership
    resources/              # harvestables + resource pickups
    tools/                  # Field Tool visual/swing owner
    combat/                 # combat/health/targeting/projectiles/XP
    creatures/              # Wildkin creation/config/AI
    ui/                     # HUD/death/controls/debug
    audio/                  # procedural/local audio
  styles/
    game.css
  vendor/
    three.module.js
    rapier.js
  docs/
    GAME_DESIGN.md          # concise stable gameplay decisions
    PROJECT_PLAN.md         # comprehensive planning mirror
    ARCHITECTURE.md         # current + planned ownership boundaries
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
3. `docs/PLAYTEST_NOTES.md` when the slice is refinement based on human testing
4. `docs/ARCHITECTURE.md`
5. `docs/GAME_DESIGN.md`
6. `docs/HACKATHON_REQUIREMENTS.md`
7. Relevant source only

`docs/PROJECT_PLAN.md` is roadmap/reference; agents must not treat the whole roadmap as implementation scope. `CURRENT_SLICE.md` always controls what gets implemented in a session.
