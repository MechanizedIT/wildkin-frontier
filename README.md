# Wildkin Frontier — Meta Horizon Game Prototype

Single-player, portrait-mobile, Three.js/HTML5 survival & resource-management prototype for the Meta Horizon Creator Competition.

## Current Playable Foundation (Phase 4B.0 — Primitive Visual Asset Authoring)

- fixed high third-person / near top-down camera, one-thumb movement + run/sneak/jump/dodge, Rapier kinematic via authored Ground Patches/Boundary Colliders (base-Y, no global floor, safety at -30),
- Field Tool harvesting (auto + manual, data-driven built-in/custom drops), magnet pickups (hide-zero run carry vs persistent bank), Wildkin A/T/D/S + home/leash, combat + health/dodge, XP motes,
- single-source `world.json` (`camp.playerSpawn {position,facingYaw}`, `MajorWaypoint.runSpawn {position,facingYaw}`, `groundPatches`/`boundaryColliders` base-Y, `visibleInPlay/collisionEnabled/opacity/color`) → generated pipeline,
- current+neighbor region activation, bounded pools, deterministic export,
- **Camp → START EXPEDITION (near closed gate) → Map start-selection → teleport to authored Run Spawn (facing applied) → carry unsecured value → discover Waypoint/Beacon (one-shot pulse/sound/toast) → contextual EXTRACT while nearby (E / mobile button) → walking away = Keep Going → RETURN & SECURE at Camp gate → bank or lose → outcome card → Camp**
- Camp gate is closed/solid; Map close keeps gate closed; gate/frontend extraction share idempotent `runId` banking,
- **Major Waypoints** unlock future starts (Forest Edge, Threshold Rise), **Extraction Beacons** extraction only (Tangled Hollow etc), displayName everywhere,
- **Top-right Map** inspect vs gate start, beacons never selectable; **minimal camera-projected edge indicators** (extraction + next deeper waypoint, not self-pointing),
- **Upper-left HUD stack** (Auto Harvest + inventory, never overlap, safe-area, scrollable),
- one desktop click = one swing (mouse vs touch ownership), one-rAF / fixed 1/60, Rapier-only, offline/portrait/<35 MB,
- desktop `?author=1` Author Mode: transactional draft + 40-step undo/redo, canonical descriptor for Edit/Play/Rapier parity, live Ground/Boundary proxy, 21 searchable/categorized starter Visual Assets, isolated Asset Edit stage, compact part controls (`Space`/`C` vertical nudge), simple Box collision, per-recipe Prop/Harvestable role with existing/custom drops, unbounded world-object drag, draft-derived extents, region/ownership validation, Camp Spawn + Waypoint Run Spawn markers + facing arrow/line, hierarchy expansion preserved, bounded shortcuts (ignored while typing), capability-aware Visible/Collision/Opacity/Tint,
- `?dev=1` **RESET PLAYER SAVE** (frontierProgress only).

**Phase 3.5A/B.x + 4A/4A.1/4A.2.x accepted. Phase 4B.0 is implementation-complete with automated/browser proof; human Visual Asset acceptance is required before Phase 4B.**

Phase 4B will author the first real 5–10 min expedition (Camp/Area 1 layout, temptation/danger pacing, first meaningful spend).

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

### Author Mode + Dev Reset — Phase 4A.1 workflow

1. `npm run dev` then open `http://localhost:8080/?author=1` on desktop.
2. Click **EDIT** — gameplay hidden, fog cleared, top-down workspace, categorized palette: **World** (Ground Patch, Boundary Collider), **Environment/Props**, **Traversal**, **Resources**, **Wildkin**, **Frontier/POI**.
3. Place via palette → click world; select/drag objects; inspector shows Region/X/Z/Y/RotY/Width/Depth/Height plus **Display Name** for Waypoints/Beacons and **Visible in Play / Collision / Opacity / Tint** for props/ground/boundaries (live preview, per-object material cloning, Edit proxy for hidden).
4. Hierarchy now has **Ground** and **Boundaries / Colliders** under each Region; select/focus hidden boundary through hierarchy.
5. Click **PLAY** — validates draft, persists to Author local storage, reloads with authoritative Rapier state.
6. **Export** downloads deterministic `world.json`; copy to `src/world/data/world.json`, `npm run world:generate`, then `npm test && npm run verify`.
7. **Reset Draft From Repo** restores canonical repo world data. Normal play (`/` without `?author=1`) ignores author draft.

Visual Asset workflow: use search/categories to find a starter recipe, then **Place** or **Edit**. Asset Edit hides the rest of the scene; select a part and use WASD/arrows for local X/Z, `Space`/`C` for local Y, Q/E for local Y rotation, and `Shift` for coarse steps. Set **Game Object Type** to Prop or Harvestable. A Harvestable can select a drop or add a custom drop ID/name/color plus hit count and respawn time; all instances of that recipe share the role.

- Fresh-save testing: `http://localhost:8080/?dev=1` shows **RESET PLAYER SAVE** (center top, confirms, clears `wildkin.frontierProgress` only, reloads fresh Camp). Normal `/` has no button.
- Desktop normal play: `http://localhost:8080/`
- Phone: use LAN URL printed by dev server, e.g. `http://192.168.x.x:8080/` (Author Mode desktop only).

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
    main.js                 # thin composition + one authoritative fixed/rAF loop
    game/                   # scene, camera, renderer, config
    input/                  # keyboard (with setEnabled) + touch intent
    physics/                # Rapier world/character/query helpers
    player/                 # player movement/state/visuals
    movement/               # traversal helpers
    session/                # expeditionSession (camp/active/extracted/dead, idempotent)
    save/                   # frontierProgress (persistent bank + unlocked/beacons, isolated author key)
    world/                  # world data/validator/registry/regionManager, staticWorldBuilder, frontierAnchorSystem
    author/                 # desktop-only Author Mode (isolated draft)
    resources/              # harvestables + resource pickups (region-aware)
    tools/                  # Field Tool visual/swing owner
    combat/                 # combat/health/targeting/projectiles/XP/session
    creatures/              # Wildkin creation/config/AI
    ui/                     # runInventoryHud (upper-left hide-zero), frontierMap, anchorPrompt, runResultCard, frontierIndicators, combatHud, autoHarvestToggle
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
