# Architecture — Wildkin Frontier (Post-Phase 4A — First Complete Expedition Loop)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current implemented architecture through Phase 4A**. Phase 3.5A/B.x foundations remain accepted.

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

Phase 3.1.1 validated the core gameplay. Phase 3.5A added the directed-world/runtime foundation. Phase 3.5B/B.1/B.2 added and human-accepted the world-authoring pipeline. Phase 4A adds the first complete Camp ↔ expedition loop.

Accepted current systems:

- player movement/traversal + Rapier kinematic controller,
- Field Tool single-owner swing/cadence,
- Auto Harvest + manual interaction rules,
- resource nodes/physical pickups/magnet inventory (now run-carry, upper-left, hide-zero) + banked totals,
- player health/dodge/death with Camp-return flow,
- melee/ranged prototype Wildkin attacks,
- aggressive/territorial/defensive/skittish reactions,
- selected Wildkin-vs-Wildkin interaction support,
- home/roam/leash/return behavior + steering,
- collision-aware XP pop/rest + guaranteed magnet collection,
- bounded pickup/projectile/XP pools,
- data-driven `world.json` source with Camp + Area 1 regions/anchors/POIs + frontierGateId/initialMajorWaypointId/spawnOffset,
- current+neighbor region activation,
- `ExpeditionSession` temporary-run owner (camp/active/extracted/dead, idempotent resolve),
- `frontierProgress` persistent bank + unlocked/discovered frontier,
- frontier anchor interaction + Map (inspect vs gate-start) + anchor prompts + result cards + minimal edge indicators,
- desktop-only Author Mode with direct placement/dragging, live transforms, hierarchy, Wildkin home editing, deterministic export/reset (isolated from player progress),
- visual ↔ Rapier transform parity for supported authored solids,
- single rAF/fixed 1/60, offline/portrait/<35 MB submission validation.

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

src/save/
  frontierProgress.js
    persistent bank + discovered/unlocked anchors (versioned localStorage, stale-filter, idempotent bank)

src/world/
  frontierAnchorSystem.js
    proximity/entry/armed state for gate/waypoint/beacon + start-suppress + keep-going guard

src/ui/
  frontierMap.js (inspect vs gate-start, unlocked-only selectable)
  anchorPrompt.js (EXTRACT/KEEP GOING, gate RETURN & SECURE)
  runResultCard.js (recovery/loss over Camp)
  frontierIndicators.js (extraction + next-waypoint edge guidance, active-run only)
  runInventoryHud.js (upper-left, hide-zero carry)

src/audio/
  procedural/local audio
```

# Fixed Update Ownership

Conceptually (Phase 4A):

```text
main.js (thin: creates, injects, owns single rAF)
  ├─ init scene/Rapier/worldRegistry(regionDepthMap)/campSpawn/frontierProgress(load)/session(camp)/regionManager
  ├─ create player/input/FieldTool/resource/pickup/creature/projectile/XP/combat/audio/HUD/Map/AnchorPrompt/ResultCard/Indicators
  ├─ wire anchorSystem callbacks → Map/prompt/frontierProgress/session
  ├─ wire playerCombat.onDeath → deathFlow, anchor prompts → extractionFlow, map start → beginExpedition
  └─ single rAF tick
       ├─ syncInputBlock (authorEdit | Map|Prompt|ResultCard) → touch/keyboard setEnabled
       ├─ gather/merge intents → effectiveIntent (zeroed when blocked)
       ├─ fixed substeps (when !blocked && !resolved)
       │    ├─ frontierAnchorSystem.update(playerPos) → may open Map/Prompt
       │    ├─ combatSession, FieldTool, playerCombat, playerController/Rapier, regionManager
       │    ├─ creatures/projectiles/XP/resources/pickups + focus rings
       │    └─ harvesting allowed only when session.isActive() && !blocked
       ├─ indicators.update(camera) (visual, active-run only)
       └─ render
```

Order remains deterministic; extraction/death share `resetTransientWorldToCamp` helper.

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

`src/session/expeditionSession.js` — camp/active/extracted/dead (dead alias for lost), idempotent `tryResolveExtract`/`tryResolveDeath`, `beginRun`/`resetToCamp`, transient cargo/xp/kills + `runDiscoveries` (newWaypoints/newBeacons), `regionDepthMap`/`maxDepth`. `reset()` retained as legacy active-reset for old tests; `resetToCamp()` is the Phase 4A camp-return path used by main.js.

It does not own:

- player health,
- resource node rules,
- live pickup inventory implementation,
- persistent frontier progression (frontierProgress owns bank),
- map DOM,
- creature AI.

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

# Phase 4A Architecture — IMPLEMENTED

## 1. Persistent frontier progress owner

`src/save/frontierProgress.js` — implemented as specified:

```text
version: 1
bankedResources: { wood, stone, fiber }
bankedXp
unlockedMajorWaypointIds: [initialMajorWaypointId]
discoveredBeaconIds: []
hasDepartedOnce
```

- localStorage `wildkin.frontierProgress` (normal) vs `wildkin.authorFrontierProgress` (author isolated key),
- version/default normalization, stale-filter via worldRegistry, dedup,
- idempotent `bankRun` token guard, `unlockWaypoint`/`discoverBeacon` return true only on new discovery, `markDeparted` once,
- no DOM dependency.

## 2. Frontier anchor interaction owner

`src/world/frontierAnchorSystem.js` — implemented:

- Camp gate, Major Waypoints (excluding wp_camp_gate marker), Extraction Beacons,
- per-anchor `armed`, `inside`, `cooldown` state,
- `disarmStartWaypoint` until first exit, `handleKeepGoing`/`handleExtracted` leave-and-re-enter guard,
- gate dispatches `onGateStartPrompt` (camp) vs `onGateReturnPrompt` (active),
- waypoint/beacon dispatch with unlock/discover via frontierProgress,
- callbacks only; UI owns no proximity.

## 3. Map owner

`src/ui/frontierMap.js` — implemented:

- top-right `MAP` button, `openInspect` (camp+gate+unknown before first departure, then known frontier) vs `openStartSelection` (gate-triggered, only unlocked Major Waypoints tappable),
- beacons shown only when discovered, never selectable,
- `inspect` never teleports, `startSelection` validates unlocked + exists before `beginExpedition`,
- reads registry + frontierProgress, owns no persistence.

## 4. Outcome/result owner

`src/ui/anchorPrompt.js` + `src/ui/runResultCard.js` + shared lifecycle in `src/main.js`:

```text
snapshot run (cargo/xp + newWaypoints/newBeacons)
→ tryResolveExtract / tryResolveDeath (once)
→ bank (extraction) or lose (death) via frontierProgress
→ resetTransientWorldToCamp (shared: player/moves/health/clear pickups/projectiles/motes, reset creatures/resources, reprimes region, no duplicates)
→ show recovery/loss card over Camp
→ CONTINUE → Camp control, next run via gate→Map
```

Old `deathOverlay` replaced; no competing arena restart.

## 5. Blocking UI input ownership

One suppression path: `isAnyBlockingModal()` (Map|AnchorPrompt|ResultCard) + authorEdit → `setGameplayInputBlocked`. Both `touchMovement.setEnabled` and `keyboardInput.setEnabled` clear held joystick/swipe/keys and disable `getIntent`. Restored exactly once on close. Field Tool also gated via `fieldCanAttack && session.isActive()`.

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
