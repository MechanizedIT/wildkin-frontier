# Architecture — Wildkin Frontier (Post-Phase 3.5B.2 Baseline)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current implemented architecture through accepted Phase 3.5B.2** and the ownership boundaries Phase 4A should add. Planned Phase 4A modules are labeled as planned until implementation lands.

## Permanent Goals

- One authoritative game loop owns per-frame gameplay/update/render work.
- `src/main.js` remains composition/bootstrap + fixed-loop wiring, not a home for domain rules.
- Mutable state has one explicit owner.
- Dependencies are injected, not hidden in gameplay globals.
- Gameplay rules should be testable independently of rendering where practical.
- Mobile-first: capped DPR, bounded pools, limited active simulation, minimal per-frame allocation.
- Offline-safe: all runtime libraries/assets/data local.
- Prefer small explicit systems over framework-heavy ECS/behavior-tree/editor architecture.
- Shared-contract changes follow the permanent `AGENTS.md` Change Closure / Consistency Sweep rule.

## Runtime / Submission Stack

- Three.js 0.160.0 — vendored `vendor/three.module.js`
- `@dimforge/rapier3d-compat@0.20.0` — vendored `vendor/rapier.js`
- Vanilla HTML/CSS/JavaScript
- Native ESM in development
- esbuild only for readable/unminified submission packaging
- One `requestAnimationFrame` loop in `src/main.js`
- Fixed gameplay/physics timestep 1/60 with bounded catch-up
- Root `index.html`, local runtime references, offline-safe ZIP <35 MB

# Current Accepted Foundation

Phase 3.1.1 validated the core gameplay. Phase 3.5A added the directed-world/runtime foundation. Phase 3.5B/B.1/B.2 added and human-accepted the world-authoring pipeline required to shape the real expedition.

Accepted current systems:

- player movement/traversal + Rapier kinematic controller,
- Field Tool single-owner swing/cadence,
- Auto Harvest + manual interaction rules,
- resource nodes/pickups/inventory,
- player health/dodge/death prototype,
- melee/ranged prototype Wildkin attacks,
- aggressive/territorial/defensive/skittish reactions,
- selected Wildkin-vs-Wildkin interaction support,
- home/roam/leash/return behavior,
- lightweight obstacle steering,
- collision-aware XP pop/rest + guaranteed magnet collection,
- bounded pickup/projectile/XP pools,
- data-driven `world.json` source with Camp + Area 1 regions/anchors/POIs,
- current+neighbor region activation,
- focused `ExpeditionSession` temporary-run owner,
- desktop-only Author Mode with direct placement/dragging, live transforms, hierarchy, Wildkin home editing, deterministic export/reset,
- visual ↔ Rapier transform parity for supported authored solids,
- offline/portrait/submission validation.

Do not keep polishing accepted systems in isolation unless real expedition play exposes a concrete regression.

# Current High-Level Module Areas

```text
src/main.js
  composition/bootstrap
  dependency wiring
  single rAF + fixed-step ordering
  debug exposure only

src/session/
  expeditionSession.js
    temporary expedition/run lifecycle summary

src/world/
  data/world.json
    one manually maintained authored world source
  data/world.generated.js
    generated runtime module; do not edit
  data/world.js
    thin import/re-export wrapper
  worldValidator.js
    normalize/validate authored world
  worldRegistry.js
    region/object/anchor query registry
  regionManager.js
    current+neighbor active-region owner
  staticWorldBuilder.js
    visuals + static/traversal descriptors from world data
  createMovementPlayground.js
    production wrapper into data-driven builder; legacy fallback only for old tests

src/author/
  authorDraft.js
    mutable author-only draft + persistence/export/reset
  authorUI.js
    palette/inspector/hierarchy
  authorMode.js
    Edit/Play orchestration, selection/drag/preview/camera visibility/home marker

src/game/
  scene/camera/renderer/config

src/input/
  keyboard + touch intent
  touch input has explicit enabled/disabled ownership for Author Mode/modal-safe integration

src/physics/
  Rapier world
  player capsule/controller/query helpers
  static colliders consume authored elevation/rotation/dimensions

src/player/
  movement/state/visuals

src/movement/
  movement bands
  jump/fall/dodge/climb/mantle

src/resources/
  harvestable configuration/system
  region-aware resource activation
  physical pickups + magnet + run inventory

src/tools/
  Field Tool visual/swing owner

src/combat/
  player health/combat targeting/projectiles/XP/session helpers

src/creatures/
  Wildkin creation/config/AI/temperament/steering
  region-aware activation

src/ui/
  current HUD/death/debug/controls
  Phase 4A planned: map, anchor prompt, run result card, frontier indicators

src/audio/
  procedural/local audio
```

# Fixed Update Ownership

Conceptually:

```text
main.js
  ├─ initialize scene + Rapier
  ├─ create canonical world registry + region manager + session
  ├─ create player/input/Field Tool
  ├─ create resource/combat/creature/UI/audio systems
  ├─ inject dependencies/callbacks
  └─ single rAF
       ├─ gather/merge input intent
       ├─ fixed substeps
       │    ├─ session/lifecycle state
       │    ├─ Field Tool/action state
       │    ├─ player combat timers
       │    ├─ player movement/Rapier move
       │    ├─ region activation
       │    ├─ active creature AI/movement/combat
       │    ├─ projectiles/XP
       │    ├─ active resources/harvesting/pickups
       │    └─ Phase 4A anchor/session callbacks when implemented
       ├─ focus/indicator/camera/UI visuals
       └─ render
```

The exact order should remain deterministic and documented when Phase 4A changes lifecycle wiring.

# Rapier Ownership

Rapier remains the single physics/collision runtime.

- Player remains kinematic.
- Creatures remain simple kinematic actors unless a later slice proves otherwise.
- Visual meshes are not automatically colliders.
- Combat damage remains explicit gameplay logic.
- Query exclusions distinguish actor targets from static obstacles.
- No second physics engine.

## Authored static transform contract — accepted Phase 3.5B.2

Supported authored solids flow through the same semantic transform path:

```text
world.json authored values
→ normalize/validate
→ staticWorldBuilder visual + collision descriptor
→ createPhysicsWorld Rapier collider
→ Author Mode preview/export
```

For supported solid props:

```text
position/base = x, y, z
rotationY = radians
size = width, height, depth
```

Legacy traversal schema names may remain internally, but Author Mode adapters expose human-facing Width/Depth/Height semantics.

Rotated colliders use a Y-axis Rapier quaternion. Elevated colliders include authored baseY. Conservative rotated AABBs are recomputed where broad-phase/steering metadata needs them.

# Player Movement Ownership

`playerController` owns locomotion:

- walk/run/sneak bands,
- acceleration/deceleration,
- facing,
- jump/fall/air control,
- dodge,
- climb/mantle,
- collision-resolved Rapier movement.

Combat may inject temporary movement constraints/knockback but must not become a second movement controller.

Phase 4A blocking UI may suppress **input**, but should not create a second movement-state owner.

# Field Tool Ownership

One Field Tool visual/interaction owner controls:

- hand/head transforms,
- trail,
- swing timing,
- shared readiness/cadence,
- manual vs Auto Harvest initiation priority.

Rule:

```text
one Field Tool swing
  ├─ valid harvestables in arc → harvest hit
  └─ valid attackable Wildkin in arc → combat hit
```

Harvesting/combat systems must not independently animate or schedule competing tool impacts.

# Resource / Pickup / XP Ownership

- Resource nodes own harvest/depletion/respawn state.
- Resource pickup system owns temporary physical drops + magnet collection + current run resource inventory.
- XP mote system owns live run XP pickup/collection state.
- Pools remain bounded.
- Region deactivation freezes/culls according to the accepted Phase 3.5A policy.

**Phase 4A must not turn the live pickup inventory into the persistent bank.** It may snapshot current run resources/XP for outcome resolution, but persistent bank values need a separate owner.

# Creature Ownership

Keep these concerns conceptually separate without introducing a heavyweight framework:

```text
PERCEPTION
  nearby actors / threats

TEMPERAMENT / DECISION
  ignore / warn / flee / pursue / attack / return

LOCOMOTION / STEERING
  move toward/away
  obstacle probes
  home/leash

COMBAT BEHAVIOR
  windup / lunge / projectile / recover / hurt / dead
```

Wildkin may target/react to the player and other Wildkin.

Use simple probes/steering first. Add pathfinding only when authored-world evidence requires it.

# ExpeditionSession — Implemented Temporary Run Owner

`src/session/expeditionSession.js` exists to keep run lifecycle/state out of `main.js`.

Current responsibility includes temporary values such as:

```text
status
runXp
kills
unsecured cargo summary
startAnchorId
currentRegionId / currentPocketId
maxDepth
future unsecuredWildkin slot
outcome hooks
```

It does not own:

- player health,
- resource node rules,
- live pickup inventory implementation,
- persistent frontier progression,
- map DOM,
- creature AI.

Phase 4A may extend the session lifecycle to explicitly distinguish Camp/idle vs active/resolved run states, but should keep persistent progress in a separate module.

# Single-Source World Pipeline — Accepted

```text
src/world/data/world.json
  → tools/generate-world.mjs
  → src/world/data/world.generated.js
  → src/world/data/world.js
  → normalize / validate
  → worldRegistry
  → staticWorldBuilder + gameplay placement systems
```

Rules:

- `world.json` is the one manually maintained authored source.
- Generated runtime data is never hand-edited.
- `npm run world:check` catches stale generated data.
- `npm run verify` includes world consistency before build validation.
- Runtime world/UI systems should query normalized/registry data rather than duplicate anchor/region coordinates.

Current authored skeleton:

```text
Camp
  ↓ gate
p1 Forest Edge
  ↓
p2 Tangled Hollow / Beacon
  ↓
p3 Sunken Rise / Beacon
  ↓
p4 Threshold Rise / next Major Waypoint
```

This is a spatial proof, not final pacing/art.

# Spatial Activation / Streaming — Accepted

Three.js frustum culling is render-only. `src/world/regionManager.js` owns lightweight gameplay activation.

```text
ACTIVE = current region + immediate neighbors
INACTIVE = distant regions
```

Accepted behavior:

- resources hide/remove collider/freeze timers while inactive,
- creatures hide/disable collider/freeze AI/attack/respawn while inactive,
- pooled pickups/projectiles/XP are culled by region policy,
- entities are created once and toggled rather than duplicated,
- neighbor buffer prevents visible simulation holes,
- author Edit visibility can follow editor camera while gameplay remains paused,
- Play restores player-centered region activation.

Do not add async/network asset streaming until profiling proves it necessary.

# Author Mode — Accepted Phase 3.5B.2

Desktop-only `?author=1` is now accepted infrastructure.

## Authoring ownership

```text
canonical repo world
  └─ Author Mode mutable draft (isolated localStorage)
       ├─ palette → click-world placement
       ├─ scene raycast/hierarchy selection
       ├─ direct X/Z drag
       ├─ supported Y/Rot/Width/Depth/Height edits
       ├─ Wildkin Spawn/Home editing
       ├─ Region → Category → Object hierarchy
       ├─ Validate
       ├─ deterministic Export
       └─ Reset Draft From Repo
```

Edit mode owns gameplay input explicitly. Normal player progression in Phase 4A should use a different persistence owner/key and must not be accidentally mutated by Author Mode world-draft reset.

## Scope guardrail

Do not turn Author Mode into a general engine editor. No prefab system, scripting, multi-select, full undo stack, asset browser, or mobile authoring unless a future accepted slice explicitly requires it.

# Phase 4A Architecture Direction — PLANNED, NOT YET IMPLEMENTED

The active slice adds the first complete expedition lifecycle. Keep these ownership boundaries unless implementation evidence proves a simpler equivalent.

## 1. Persistent frontier progress owner

Planned focused module, e.g. `src/save/frontierProgress.js` or `src/progression/frontierProgress.js`.

Owns only persistent prototype progress needed by Phase 4A:

```text
version
bankedResources
bankedXp
unlockedMajorWaypointIds
discoveredBeaconIds
hasDepartedOnce
```

Rules:

- localStorage normal-play save,
- version/default normalization,
- filter stale world IDs,
- idempotent bank/anchor-discovery methods,
- no DOM dependency,
- Author Mode uses isolated dev progress or in-memory progress.

## 2. Frontier anchor interaction owner

Planned focused system for:

- Camp frontier gate,
- Major Waypoints,
- Extraction Beacons,
- proximity entry/exit/armed state,
- start-anchor suppression until player leaves radius,
- KEEP GOING reprompt only after leaving/re-entering.

It should emit domain events/callbacks; UI should not own proximity rules.

## 3. Map owner

Planned UI/controller responsibilities:

- inspect mode from top-right button,
- gate-start selection mode,
- known Camp/Waypoint/Beacon presentation,
- only unlocked Major Waypoints selectable in start mode,
- no teleport/start from ordinary inspect mode.

Map reads normalized world + persistent progress. It does not own either.

## 4. Outcome/result owner

Planned shared result-card path for extraction/death:

```text
snapshot run
→ resolve once
→ bank or lose unsecured values
→ return/reset transient world to Camp
→ show recovery/loss card
→ Continue → Camp control
```

Do not leave the old prototype death overlay independently restarting the arena once 4A lands.

## 5. Blocking UI input ownership

Map, anchor prompt, recovery card, and loss card should all use one explicit gameplay-input suppression path.

Do not solve this by only hiding joystick visuals. Touch movement/right-side gesture state must be disabled/cleared and restored exactly once.

# Persistence Separation — Phase 4A Guardrail

Three different persistence/state concepts must remain distinct:

```text
world.json
  authored world layout/data

Author Mode draft
  developer-only mutable world layout copy

frontierProgress save
  player bank + discovered/unlocked frontier state
```

`ExpeditionSession` is a fourth category: **temporary current-run state**, not persistence.

Do not merge these because they all happen to use localStorage/data objects.

# Reset / New-Run Integration Direction

Phase 4A needs a shared return/begin-run path that can coherently reset transient gameplay without duplicating logic across death, extraction, and gate-start callbacks.

Reset guarantees should cover:

- player position/health/action state,
- run inventory/XP,
- pickups/projectiles/XP motes,
- resources,
- creatures,
- region activation,
- session status/start anchor,
- no duplicate entities/colliders,
- Auto Harvest preference preserved,
- persistent bank/map progress preserved except intended outcome changes.

Prefer one small lifecycle coordinator/helper over three copied reset blocks.

# Performance Guardrails

Continue to preserve:

- one rAF,
- fixed 1/60 gameplay,
- bounded fixed-step catch-up,
- capped DPR,
- region/pocket-limited active simulation,
- bounded pools,
- no unbounded arrays,
- no per-frame DOM creation,
- small active creature counts,
- shared geometry/materials where practical,
- no whole-world AI loop,
- no unnecessary network/async streaming,
- profile before adding complex optimizations.

# Build & Submission

Required gates remain:

```text
npm test
npm run world:check
npm run verify
npm run zip
```

Submission requirements remain:

- offline runtime,
- local vendor/assets/data,
- readable/unminified first-party source in packaged build,
- root `index.html`,
- portrait-safe layout,
- <35 MB.

# Architecture Red Flags

Stop/reconsider if a slice introduces:

- second `requestAnimationFrame` loop,
- second physics engine,
- persistent player progress inside Map DOM or `main.js`,
- persistent bank inside live pickup inventory,
- duplicate run lifecycle owners,
- separate death/extraction reset implementations that drift,
- hard-coded Waypoint IDs scattered through UI,
- Author Mode draft and player progression sharing one key/owner,
- duplicate world coordinates outside the `world.json` pipeline,
- per-frame whole-world iteration after region activation,
- major feature framework not required by current slice,
- human world iteration blocked again on agent coordinate edits.

Phase 4A should cross one threshold only:

> **The current systems become a complete, repeatable Camp → expedition → secure-or-risk → outcome → Camp loop.**
