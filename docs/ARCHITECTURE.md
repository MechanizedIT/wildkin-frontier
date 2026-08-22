# Architecture — Wildkin Frontier (Post-Phase 3.1.1 Baseline)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current architecture** plus clearly labeled planned boundaries. Do not assume Phase 3.5 modules already exist until their slice is implemented.

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

Phase 3.1.1 validated the current foundation well enough to stop isolated systems-test polishing:

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
- offline/portrait/submission validation.

Future work should preserve this foundation unless real-frontier play exposes a regression.

## Current High-Level Module Areas

```text
src/main.js
  composition/bootstrap
  single rAF + fixed-step ordering
  still owns some run/restart coordination that should not keep growing

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

src/world/
  current systems-test/playground
  world placement still partly code-defined

src/resources/
  harvestable configuration/system
  resource pickups

src/tools/
  Field Tool visual/swing owner

src/combat/
  health/combat targeting/projectiles/XP/session helpers

src/creatures/
  creation/config/current AI/temperament/steering

src/ui/
  HUD/death/controls/debug

src/audio/
  procedural/local audio
```

Exact filenames may evolve; ownership boundaries matter more than directory names.

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

# Planned Phase 3.5A Boundaries

Phase 3.5A is the next active architecture slice. It exists only to make the directed expedition cheap to build and scale.

## 1. Expedition / Run Session Owner

Introduce a focused owner such as `ExpeditionSession` / `RunSession` for temporary run lifecycle.

Likely responsibilities:

```text
run status
run XP
kills
unsecured resource cargo
future unsecured Wildkin slots
start anchor identity
current/deepest region/pocket
future extraction completion
run death/reset lifecycle
```

Player locomotion, rendering, creature AI, and map rendering do not belong here.

## 2. Thin `main.js`

Target:

```text
initialize
create modules
wire dependencies
own fixed loop
call updates in documented order
render
```

Do not migrate code merely for style. Move state/rules only where ownership is already becoming unclear or where Phase 4 would otherwise add more domain logic to `main.js`.

## 3. Data-Driven World Definition

Move authored placement into `world.json` or equivalent.

The schema should support enough stable structure for the real game:

```text
world
  camp
  areas / regions
    pockets
      bounds / adjacency
      terrain / props
      resources
      Wildkin homes/spawns
      traversal geometry
      POIs
      extractionBeacons
    majorWaypoints
```

Important authored concepts:

- Camp + frontier gate
- area/region identity
- pocket identity + adjacency
- terrain/ground
- resource nodes
- Wildkin species/temperament/home data
- platforms/ramps/ladders/parkour
- major Waypoints
- Extraction Beacons
- POIs
- optional POI unlock requirement metadata

Normalize/validate world data once rather than letting every gameplay system interpret raw JSON independently.

## 4. World Loader / Registry

Create one runtime world owner/registry that can answer:

- which region/pocket owns this object?
- which pockets neighbor the current pocket?
- what authored entities belong to an active region?
- what major Waypoints / Beacons / POIs exist?
- how do systems instantiate/deactivate their owned objects from normalized data?

Avoid a giant world god-object that also owns creature AI/resource rules.

# Spatial Activation / Streaming

Three.js has render frustum culling for ordinary objects, but **render culling is not gameplay streaming**. Distant objects can still consume CPU/physics/AI if our systems update them.

The game needs a lightweight **region/pocket activation manager**.

## Prototype strategy

Keep world data/assets local and available, but only simulate the useful local neighborhood.

Recommended baseline:

```text
ACTIVE
  current pocket/region
  immediately adjacent pockets needed to prevent visible pop-in
  Camp when player is at Camp

INACTIVE
  distant creatures
  distant pickup/projectile systems
  distant resource simulation
  unnecessary Rapier colliders/bodies
  expensive per-frame POI/environment logic
```

Exact deactivation can vary by system:

- hide + stop update,
- disable/remove collider and recreate on activation,
- keep lightweight static visuals if cheap,
- instantiate lazily from normalized world data.

Do not create a complex asynchronous/network-style asset streamer. The competition build is offline and small; this system is about **bounded simulation**, not remote loading.

## Activation requirements

- deterministic activation/deactivation,
- no duplicate entity creation,
- persistent state survives deactivate/reactivate when required,
- pickups/projectiles do not leak across region teardown,
- creature home/reset state remains coherent,
- player can cross boundaries without visible missing ground/collision,
- active-neighbor buffer prevents camera-edge pop-in,
- tests prove distant systems are not still ticking.

Near-top-down portrait camera makes this especially effective because only a small local area needs full detail/simulation.

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
