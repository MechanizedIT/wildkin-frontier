# Architecture — Wildkin Frontier (Post-Phase 3.5A Baseline)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current implemented architecture** (Phase 3.5A). Planned boundaries for later phases remain labeled.

## Permanent Goals

- One authoritative game loop owns per-frame gameplay/update/render work.
- `src/main.js` remains composition/bootstrap + fixed-loop wiring, not a home for domain rules.
- Mutable state has one explicit owner.
- Dependencies are injected, not hidden in gameplay globals.
- Gameplay rules should be testable independently of rendering where practical.
- Mobile-first: capped DPR, bounded pools, limited active simulation, minimal per-frame allocation.
- Offline-safe: all runtime libraries/assets/data local.
- Prefer small explicit systems over framework-heavy ECS/behavior-tree/editor architecture.

## Runtime / Submission Stack

- Three.js 0.160.0 — vendored `vendor/three.module.js`
- `@dimforge/rapier3d-compat@0.20.0` — vendored `vendor/rapier.js`
- Vanilla HTML/CSS/JavaScript
- Native ESM in development
- esbuild only for readable/unminified submission packaging
- One `requestAnimationFrame` loop in `src/main.js`
- Fixed gameplay/physics timestep 1/60 with bounded catch-up

## Current Accepted Foundation

Phase 3.1.1 validated the core gameplay; Phase 3.5A adds the directed-world foundation without changing that gameplay:

- player movement/traversal + Rapier kinematic controller,
- Field Tool single-owner swing/cadence,
- Auto Harvest + manual interaction rules,
- resource nodes/pickups/inventory,
- player health/dodge/death/restart,
- melee/ranged prototype creature attacks,
- aggressive/territorial/defensive/skittish reactions,
- Wildkin-vs-Wildkin interaction support,
- home/roam/leash/return behavior,
- lightweight obstacle steering,
- collision-aware XP pop/rest + guaranteed magnet collection,
- bounded pools,
- data-driven world definition with region/pocket adjacency,
- active-region manager (current + neighbor buffer),
- focused ExpeditionSession owner (no duplicate run state in main.js),
- offline/portrait/submission validation.

Future work should preserve this foundation unless real-frontier play exposes a regression.

## Current High-Level Module Areas ( Implemented Phase 3.5A )

```text
src/main.js
  composition/bootstrap
  single rAF + fixed-step ordering
  thin — wires session/world/region activation in documented order

src/session/
  expeditionSession.js — temporary run lifecycle (status, runXp, kills, unsecured cargo, currentRegion/pocket, maxDepth, death/reset hooks)

src/world/
  data/world.js + data/world.json — authored source of truth (camp, 3 regions, bounds, neighbors, pockets, ground, resources, creatures, traversal, waypoints/beacons/pois)
  worldValidator.js — normalize/validate (unique IDs, neighbor refs, required transforms, supported types, cross-region ownership, spawn clearance)
  worldRegistry.js — runtime registry (which region owns object, neighbor lookup, active-region helpers, discovery)
  regionManager.js — lightweight active-region owner (current region from pos, active = current + immediate neighbors, emits only on change, neighbor buffer, no per-frame churn)
  createMovementPlayground.js — visual playground (still hard-coded ground/boundary; region data mirrors its platforms/obstacles)
  collision.js — legacy circle helpers (now superseded by Rapier for player, kept for tests)

src/game/
  scene/camera/renderer/config

src/input/
  keyboard + touch intent

src/physics/
  Rapier world
  player controller/capsule
  collision/query helpers

src/player/
  movement/state/visuals

src/movement/
  movement bands
  jump/fall/dodge/climb/mantle

src/resources/
  harvestable configuration/system (now region-aware: setActiveRegions, frozen timers when inactive, no duplicate nodes)
  resource pickups (origin region tracked, cullInactiveRegions on deactivation, pools bounded)

src/tools/
  Field Tool visual/swing owner

src/combat/
  health/combat targeting/projectiles (origin region, cullInactiveRegions) /XP (origin region, cullInactiveRegions)/session helpers

src/creatures/
  creation/config/current AI/temperament/steering (region-aware: setActiveRegions, frozen AI/attack timers, collider disabled, no duplicate)

src/ui/
  HUD/death/controls/debug (debugLabel now shows currentRegion [activeIds] and active/total counts)

src/audio/
  procedural/local audio
```

Exact filenames are now `src/session/expeditionSession.js`, `src/world/data/world.js`, `src/world/worldValidator.js`, `src/world/worldRegistry.js`, `src/world/regionManager.js` plus the above.

## Fixed Update Ownership

Conceptually:

```text
main.js
  ├─ initialize scene + Rapier
  ├─ create world
  ├─ create player/input/Field Tool
  ├─ create resource/combat/creature/UI/audio systems
  └─ single rAF
       ├─ merge input intent
       ├─ fixed substeps
       │    ├─ run/session lifecycle
       │    ├─ Field Tool/action state
       │    ├─ player combat timers
       │    ├─ player movement/Rapier move
       │    ├─ region activation/world systems
       │    ├─ active creature AI/movement/combat
       │    ├─ projectiles/XP
       │    ├─ active resources/harvesting/pickups
       │    └─ other active gameplay
       ├─ focus/POI/camera/UI visuals
       └─ render
```

The exact order should remain documented and deterministic.

## Rapier Ownership

Rapier remains the single physics/collision runtime.

- Player remains kinematic.
- Creatures remain simple kinematic actors unless a later slice proves otherwise.
- Visual meshes are not automatically colliders.
- Combat damage remains explicit gameplay logic.
- Query exclusions must distinguish actor targets from static obstacles.
- No second physics engine.

## Player Movement Ownership

`playerController` owns locomotion:

- walk/run/sneak bands,
- acceleration/deceleration,
- facing,
- jump/fall/air control,
- dodge,
- climb/mantle,
- collision-resolved Rapier movement.

Combat may inject temporary movement constraints/knockback but must not become a second movement controller.

## Field Tool Ownership

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

## Resource / Pickup Ownership

- Resource nodes own harvest/depletion/respawn state.
- Resource pickup system owns temporary physical drops + magnet collection.
- XP mote system follows the same reward principle: collision-aware while popping/resting, guaranteed once magnetizing.
- Pools remain bounded.

## Creature Ownership

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

# Implemented Phase 3.5A Architecture

Phase 3.5A has been implemented — the directed expedition now has a cheap technical foundation.

## 1. Expedition / Run Session Owner — `src/session/expeditionSession.js`

Focused owner for temporary run lifecycle. Implemented shape:

```text
status: active | dead | extracted
runXp
kills
unsecuredResourceCargo {wood, stone, fiber} (summary, not duplicate of pickup inventory)
startAnchorId: camp_gate
currentRegionId / currentPocketId
maxDepth (deepest region index via regionDepthMap)
unsecuredWildkin[] (future slot)
extractionOutcome (future slot)
getState, setRegion, addXp/setXp, addKill, setCargo/incrementCargo, reset, onDeath/onExtract
```

Does not own player health, rendering, creature AI, or resource rules. `main.js` wires/updates the session; domain systems notify it via callbacks (pickup inventory, XP, kills, region changes). Reset/death hooks are centralized here, preserving Auto Harvest preference outside the session.

## 2. Thin `main.js`

Implemented thin composition:

```text
initialize (RAPIER.init, scene, worldRegistry, regionManager, session)
create systems (resource/creature systems from worldRegistry data, not hard-coded arrays)
wire dependencies (physicsWorld, characterPhysics, input, audio, HUD, fieldTool, combat)
own fixed rAF loop (single requestAnimationFrame, fixed 1/60 substeps, max 4, maxDelta 0.10)
update in documented order:
  input intent → combatSession → Field Tool → playerCombat → player movement → region activation → creatures → projectiles → XP → resources → pickups → focus rings → camera → render
render
```

All world placement loads through the normalized data path; no second loader for test arena.

## 3. Data-Driven World Definition — `src/world/data/world.js` (+ `world.json` mirror)

Source of truth, 3 test regions partitioning the original playground:

```text
world
  camp: {id, pos, radius} (placeholder, no gameplay)
  regions[3]: south_basin (2.5..11.5, neighbor central), central_basin (-4..2.5, neighbors south+north), north_highlands (-11.5..-4, neighbor central)
    id, displayName, bounds {minX,maxX,minZ,maxZ}, neighbors [regionIds], pockets []
    ground {type, color}, props []
    resources[] {id, type tree|rock|fiber, pos} — 18 total migrated, each pos inside its region bounds
    creatures[] {id, type rusher|spitter, temperament, speciesTag, pos, homePos, roam/notice/personal/leash, hostileSpecies} — 6 total migrated, clearance validated
    traversal {platforms[], obstacles[], jumpTraversals[], climbables[]} — mirrors playground (lowA/lowB/high, ladder)
    majorWaypoints[] {id, type majorWaypoint, pos} — data only
    extractionBeacons[] {id, type extractionBeacon, pos} — data only
    pois[] {id, type chest|barrier, pos, requires} — data only
  startAnchorId: camp_gate
```

JSON mirror at `src/world/data/world.json` is the readable source; JS module is the runtime import to avoid JSON import build issues.

## 4. World Loader / Registry — `src/world/worldValidator.js` + `src/world/worldRegistry.js`

- `worldValidator.js: normalizeWorldData(raw)` clones, validates unique IDs, valid region/pocket refs, valid neighbor refs, required transforms/types, creature spawn/home data, supported world object types, anchor/POI type identifiers, no invalid cross-region ownership (pos inside bounds), and expanded-platform spawn clearance (creature radius 0.32+0.05). Runtime systems consume normalized data.

- `worldRegistry.js: createWorldRegistry(normalized)` builds regionMap, global lookups with regionId attached, and answers: region for position (bounds containment or nearest), pocket for position, neighbors, active set for region (current + neighbors), resources/creatures for region/active, all waypoints/beacons/pois, camp, startAnchor, regionDepthMap.

No giant god-object: registry is queryable, does not own AI/resource rules.

# Spatial Activation / Streaming — Implemented `src/world/regionManager.js`

Three.js frustum culling is render-only; Phase 3.5A adds lightweight gameplay activation.

## Implemented strategy

```text
ACTIVE = current region + immediate neighbors (neighbor buffer prevents visible/collision pop-in)
INACTIVE = distant regions (e.g., south vs north when in opposite)
Determination: player XZ inside region bounds (AABB). Outside all bounds → nearest center (deterministic).
Update: regionManager.update(playerPos) computes currentRegion/pocket, activeSet = current + neighbors, emits only when set changes, caches active array, avoids per-frame allocation.
```

## Per-system activation (documented, deterministic, duplicate-safe)

- **Static world / traversal:** Ground + boundary walls remain always active (cheap). Per-region platforms/obstacles are data-driven via `worldRegistry` but collider lifecycle is currently kept always active for simplicity; distant heavy collider removal is deferred as cost is negligible vs AI. Visuals remain; no pop-in at neighbor buffer.

- **Resources:** `resourceSystem.setActiveRegions(activeIds)` hides group, removes collider, sets `_regionInactive`, freezes timers (`wobble/flash/respawn` not ticked while inactive). `isHarvestableInRange`/`getEligibleNodes`/`getHaloTargets` return empty when inactive. On reactivation: group visible restored, collider restore deferred via `_pendingColliderRestore` until player not inside (safe, no push), no duplicate nodes, respawn timer resumes from frozen value.

- **Creatures:** `creatureSystem.setActiveRegions(activeIds)` hides group, disables collider (`disableCollision`), sets `_regionInactive`, skips entire `update` (no AI, no attack timers, no projectile emission, frozen retaliation/flee timers, frozen respawn). `getAliveCreatures` filters to active only (focus rings, targeting). On reactivation: group visible, collider re-enabled, no instant attack (frozen WINDUP/LUNGE preserved, resumes next tick only if still logically valid), no duplicate, home/return state coherent, dead/RESPAWNING stays coherent (respawn frozen).

- **Temporary entities:** Pooled, bounded (pickup max 32, projectile 16, XP 32). On region deactivation, `cullInactiveRegions(activeSet, worldRegistry)` removes origins whose `regionId` not in active set (pickups: origin resource region; projectiles: owner region or start pos region; XP: spawn pos region). No leakage/duplication; pools bounded. Policy documented as simplest consistent for prototype: origin-based culling on `regionManager.onChange` (plus position fallback).

## Activation guarantees

- Deterministic, single-owner (`regionManager`), emitted only on change.
- No duplicate creation (nodes/creatures created once at load, toggled visible/collider, not re-instantiated).
- Inactive AI/physics cost tied to local neighborhood, not total world size (tests verify timers frozen, active counts bounded).
- Neighbor buffer ensures camera never looks into missing ground/collision.
- Tests prove distant systems not ticking.

# Planned Phase 3.5B — Minimal Author Mode

After 3.5A is accepted, add only enough authoring tooling to shape Area 1 quickly.

Required operations:

- place/select,
- move,
- rotate,
- elevate,
- resize supported objects,
- duplicate/delete,
- edit key object properties,
- assign region/pocket,
- edit anchor/POI type + relevant properties,
- switch Edit ↔ Play quickly,
- export deterministic world data.

Do not build:

- generic asset browser ecosystem,
- scripting system,
- undo history framework unless trivial,
- production editor architecture,
- procedural world generator.

The only question 3.5B must answer is:

> Can a human rapidly shape and replay the first directed expedition without asking an agent to change coordinates?

# Camp / Map / Anchor Architecture Direction (Phase 4, Not 3.5A)

Phase 3.5A data should make these possible but must not implement the full gameplay yet.

## Camp

Persistent home location with:

- drop pod,
- small Matter Resonator,
- frontier gate,
- later secured Wildkin residents.

## Map

Needs persistent discovery state for:

- Camp/gate,
- major Waypoints,
- discovered Extraction Beacons,
- discovered POIs / locked POIs.

Only major Waypoints become expedition starts.

## Frontier Anchors

Two authored types:

- `majorWaypoint`: extract + permanent future start
- `extractionBeacon`: extract only

Both later expose **EXTRACT / KEEP GOING**.

# Wildkin / Ability Architecture Direction

Do not prebuild a generic ability framework.

Future companion data may declare a small contextual capability, for example:

```text
abilityId: swim
mountable: true
commands: [mount]
```

or

```text
abilityId: breakBarrier
commands: [ability]
```

UI should render only actions the active companion actually supports.

POI unlock requirements should remain data-driven enough to express a simple dependency such as:

```text
requires:
  type: companionAbility
  id: swim
```

or

```text
requires:
  type: materialRepair
  costs: { wood: 10, iron: 4 }
```

Do not implement all requirement types until a real POI needs them.

# State & Dependencies

- Mutable state has one owner.
- Dependencies passed explicitly.
- `window.__game` remains debug-only.
- Avoid hidden cross-module mutation.
- Shared rules are centralized rather than duplicated.
- World authored data is not itself mutable run/persistent state; keep authored definition separate from save/session deltas.

# Persistent State Direction

Later save state should record deltas, not clone the full world definition.

Examples:

```text
activatedMajorWaypoints
seenPOIs
solvedPOIs
securedWildkin
unlocks/upgrades
camp expansion state
```

Run state remains separate:

```text
unsecured cargo
unsecured Wildkin
run XP
health / current run metrics
```

# UI Direction

Stable layout direction:

- top-right: map button,
- upper-left: nonzero resource inventory list,
- right side: contextual action stack,
- future active Wildkin icon/button opens small contextual flyout,
- edge indicators for nearby extraction/important POIs.

Keep DOM creation bounded and avoid per-frame rebuilds where simple property/text updates work.

# Performance Guardrails

- one rAF,
- fixed-step gameplay,
- capped DPR,
- region/pocket-limited active simulation,
- bounded pools,
- no unbounded arrays,
- no per-frame DOM creation,
- small active creature counts,
- shared geometry/materials where practical,
- no whole-world AI/physics loop after region activation exists,
- profile before adding complex optimizations.

# Build & Submission

Authoritative gates:

```sh
npm test
npm run verify
npm run zip
```

Requirements remain:

- no runtime external network requests,
- local vendored dependencies,
- readable/unminified first-party submission code,
- ZIP <35 MB,
- portrait/mobile test remains mandatory.

# Architectural Decision Rule

Refactor/add infrastructure only when it solves an upcoming concrete need.

Valid triggers:

- Phase 4 would otherwise add more domain logic to `main.js`,
- temporary run state has multiple competing owners,
- world placement requires gameplay-source edits,
- distant world simulation would scale with total world size,
- the same rule is duplicated,
- testing a rule requires unrelated systems,
- human world iteration is blocked on agent coordinate edits.

Phase 3.5A/3.5B exists to cross exactly those thresholds—nothing more.
