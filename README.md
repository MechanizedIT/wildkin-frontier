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
- single-source `world.json` → generated runtime world pipeline,
- current+neighbor region activation with bounded inactive simulation,
- accepted desktop Author Mode with direct placement/dragging, transform/collider parity, Wildkin home editing, hierarchy, deterministic export/reset,
- offline-compliant submission build/validation.

**Phase 3.5A + 3.5B/3.5B.1/3.5B.2 are complete and accepted.**

The active implementation slice is **Phase 4A — First Complete Expedition Loop**. It is the first player-facing loop milestone: Camp → choose an unlocked Major Waypoint → carry unsecured resources/XP → EXTRACT or KEEP GOING → bank or lose → return to Camp → start another run.

Phase 4B will tune the first 5–10 minute expedition, Camp/Area 1 layout, temptation/danger pacing, and the first small meaningful progression spend after the mechanical loop works.

## Core Game Direction

Wildkin Frontier is focused around short, replayable directed expeditions:

**Camp → choose an unlocked major Waypoint start → explore/harvest/avoid/fight/bond → accumulate unsecured value → EXTRACT or KEEP GOING at frontier anchors → bank or lose the run → progress → go again.**

Major Waypoints unlock future start locations. Smaller Extraction Beacons allow safe extraction but do not become start points, preserving the push-or-secure decision.

See `docs/GAME_DESIGN.md` and `docs/PROJECT_PLAN.md` for the current stable direction. `docs/CURRENT_SLICE.md` is always the only implementation scope for an agent session.

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

# Author Mode (desktop only)
# Open: http://localhost:8080/?author=1
```

The dev server binds to `0.0.0.0:8080`.

### Author Mode — accepted Phase 3.5B.2 workflow

1. `npm run dev` then open `http://localhost:8080/?author=1` on desktop.
2. Click **EDIT** — gameplay touch/action input is disabled, fog clears, and the top-down author workspace owns the canvas.
3. Place from Palette by choosing an item then clicking the world; select/drag objects directly or use the inspector for precise X/Z/Y/rotation/size values where supported.
4. Use the **Region → Category → Object** hierarchy to select/focus authored objects; selected Wildkin expose editable spawn/home territory controls.
5. Click **PLAY** — validates the draft, persists it to Author Mode local storage, reloads, and tests the draft with authoritative Rapier/gameplay state.
6. **Export** downloads deterministic `world.json`; copy it to `src/world/data/world.json`, run `npm run world:generate`, then `npm test && npm run verify`.
7. **Reset Draft From Repo** restores canonical repo world data. Normal play (`/` without `?author=1`) ignores the author draft.

- Desktop normal play: `http://localhost:8080/`
- Phone on same network: use the LAN URL printed by the dev server, e.g. `http://192.168.x.x:8080/`

## Phone Testing

1. Run `npm run dev`.
2. Open the printed LAN URL on the phone.
3. Test portrait framing, touch movement/action gestures, combat/harvesting readability, audio, and performance.
4. Use the human checklist in the active `docs/CURRENT_SLICE.md` for slice-specific testing.

## Submission Build & Validation

```sh
npm test
npm run world:generate   # after editing src/world/data/world.json
npm run world:check      # guard against stale generated data
npm run build
npm run validate
npm run verify           # test + world:check + build + validate
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
    session/                # temporary expedition/run lifecycle
    world/                  # world data, builder, registry, region activation, authoring support
    author/                 # desktop-only world Author Mode
    resources/              # harvestables + resource pickups
    tools/                  # Field Tool visual/swing owner
    combat/                 # combat/health/targeting/projectiles/XP
    creatures/              # Wildkin creation/config/AI
    ui/                     # HUD/death/controls/debug; Phase 4A adds map/anchor/results
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
    Specs/                  # archived phase specifications
  tools/
    build-submission.mjs
    generate-world.mjs
    check-world.mjs
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
