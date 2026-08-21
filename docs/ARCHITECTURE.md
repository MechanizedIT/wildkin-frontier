# Architecture — Wildkin Frontier (Post-Phase 3 Baseline)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current architecture** plus clearly labeled planned boundaries. Do not assume planned Phase 3.5 modules already exist.

## Permanent Goals

- One authoritative game loop owns all per-frame gameplay/update/render work.
- `src/main.js` should remain composition/bootstrap plus fixed-loop ownership, not a home for domain gameplay rules.
- Modules split by responsibility as complexity grows; avoid god objects and duplicate parallel systems.
- Mutable-state ownership is explicit.
- Dependencies are injected via imports/constructor arguments, not hidden globals.
- Gameplay logic should be testable independently of Three.js rendering where practical.
- Mobile-first: capped DPR, bounded pools, minimal per-frame allocation, portrait-safe UI.
- Offline-safe: Three.js + Rapier vendored locally; no runtime CDN/network dependency.

## Runtime / Submission Stack

- Three.js 0.160.0, vendored at `vendor/three.module.js`.
- `@dimforge/rapier3d-compat@0.20.0`, vendored at `vendor/rapier.js` with embedded WASM.
- Native ESM for development.
- `esbuild` is build-time-only and produces a readable, unminified submission `index.html`.
- One `requestAnimationFrame` loop in `src/main.js`.
- Fixed gameplay/physics timestep: 1/60 with bounded catch-up substeps.

## Current High-Level Module Areas

```text
src/main.js
  composition/bootstrap
  single rAF + fixed-step ordering
  currently contains more run/combat/restart coordination than desired

src/game/
  scene/camera/renderer
  centralized config/tuning

src/input/
  keyboard input
  touch movement/action gestures
  merged input intent

src/physics/
  Rapier world
  player kinematic capsule/controller
  collision/query helpers
  debug helpers

src/player/
  player visual
  movement/controller state
  visual feedback

src/movement/
  movement bands
  authored traversal helpers
  jump/climb/mantle logic

src/world/
  current systems-test/playground geometry
  authored traversal/world data still partly code-defined

src/resources/
  harvestable node creation/config
  harvesting/resource system
  pooled physical-looking resource pickups

src/tools/
  Field Tool visual + swing ownership
  harvest/combat swing profiles

src/combat/
  player combat/health
  combat targeting
  projectile system
  XP mote system
  combat/session helpers

src/creatures/
  creature creation/config
  creature system / current AI state logic

src/ui/
  inventory / combat HUD
  death overlay
  controls / debug UI

src/audio/
  procedural/local game audio helpers
```

Exact filenames may evolve; ownership boundaries matter more than directory names.

## Current Data / Update Flow

Conceptually:

```text
main.js
  ├─ initialize Three.js + Rapier
  ├─ create world/playground
  ├─ create player + character physics + controller
  ├─ create input
  ├─ create Field Tool
  ├─ create resource/pickup systems
  ├─ create combat/player-health systems
  ├─ create creature/projectile/XP systems
  ├─ create UI/audio
  └─ single rAF
       ├─ merge input intent
       ├─ fixed substeps
       │    ├─ Field Tool/action state
       │    ├─ player combat timers
       │    ├─ player movement/Rapier move
       │    ├─ creature AI/movement/combat
       │    ├─ projectiles
       │    ├─ XP motes
       │    ├─ resources/harvesting
       │    └─ pickups
       ├─ target/focus visuals
       ├─ camera
       ├─ particles/visual-only updates
       └─ render
```

The exact order must preserve deterministic gameplay relationships and should be documented when changed.

## Rapier Ownership

Rapier is the approved runtime for collision and spatial physics queries.

Current uses include:

- player kinematic capsule movement/collision/grounding,
- static world colliders,
- creature kinematic colliders/movement,
- projectile/world collision queries,
- pickup/world clearance queries where appropriate,
- collision-aware knockback/locomotion.

Guidelines:

- The player remains kinematic; do not convert the core character to a dynamic rigid body.
- Creatures should remain simple kinematic actors unless a later slice explicitly proves a need otherwise.
- Visual meshes are not automatically physics colliders. Tool/head/direction visuals should not silently become combat blockers.
- Combat damage is explicit gameplay logic, not continuous body-contact damage.
- Query filters/exclusions must be deliberate; avoid treating the intended target collider as an environment blocker.
- No second physics engine.

## Player Movement Ownership

`playerController` owns locomotion state and accepted movement feel:

- speed bands,
- acceleration/deceleration,
- facing from meaningful input,
- jump/fall/gravity/air control,
- dodge movement,
- climb/mantle traversal,
- collision-resolved movement via the player Rapier controller.

Combat may impose temporary movement caps/explicit knockback through injected options, but combat modules must not become a second movement controller.

## Field Tool Ownership

The Field Tool is one visual/interaction object.

Current rule:

```text
one Field Tool swing
  ├─ valid harvestables in arc → harvest hit
  └─ valid attackable creatures in arc → combat hit
```

Architecture requirements:

- One authoritative module owns Field Tool transforms/trail/swing timing.
- Harvesting and combat must not independently write the same tool hierarchy.
- Auto Harvest controls **swing initiation for resources**, not a separate weapon mode.
- Manual attack can initiate the same physical interaction and may affect resources + valid creatures.
- Swipe/dodge takes precedence over attack gesture recognition.

## Resource / Pickup Ownership

- Resource nodes own harvest/depletion/respawn state.
- Resource pickup system owns temporary physical-looking drops and collection.
- Pickup flight/rest may respect world collision.
- Once magnetizing to the player, collection reliability takes priority over cosmetic collision realism.
- Pools/caps must remain bounded.

## Combat Ownership

Combat is split conceptually into:

- player attack request/timing,
- target eligibility/hit resolution,
- player health/i-frames/knockback/death,
- enemy attack behavior,
- projectiles,
- XP reward collection,
- run/combat session coordination.

Avoid making `main.js` decide detailed combat/harvest rules.

## Creature Ownership — Current + Phase 3.1 Direction

Current Phase 3 creatures have simple explicit combat state logic (Rusher / Spitter).

Phase 3.1 evolves this toward wildlife behavior without a heavyweight behavior tree.

Keep these concerns conceptually separate:

```text
PERCEPTION
  what actors/resources/threats are nearby?

TEMPERAMENT / DECISION
  ignore / warn / flee / pursue / attack / return home

LOCOMOTION / STEERING
  move toward/away, obstacle avoidance, leash/home return

COMBAT BEHAVIOR
  windup / lunge / projectile / recover / hurt / dead
```

Wildkin should be able to perceive the player and other Wildkin. Do not hard-code `target = player` as the only meaningful actor relationship.

Use lightweight steering/obstacle probes/separation first. Do not add A* or a navmesh until the authored frontier demonstrates repeated failures that simple steering cannot solve.

## Run / Temporary State — Current Technical Debt

Phase 3 introduced more temporary-run state:

- health,
- XP,
- kills,
- temporary resource cargo,
- death/restart,
- projectile/mote cleanup,
- creature reset,
- resource reset.

Some coordination currently lives in `main.js`. This is acceptable as a temporary Phase 3 state but should **not continue growing**.

## Planned Phase 3.5 Architecture Boundary

Phase 3.5 is a deliberate cleanup/authoring checkpoint before extraction, persistence, captures, equipment, and waystones.

### 1. Expedition / Run Session Owner

Introduce a focused owner (name may vary) for temporary run lifecycle such as:

```text
ExpeditionSession / RunSession
  health/run-death integration as appropriate
  run XP
  kills
  unsecured resource cargo
  future unsecured captures
  restart/reset lifecycle
  future extraction completion
```

Do not move rendering or player locomotion into this module.

### 2. Thin `main.js`

Target responsibility:

```text
initialize
create modules
wire dependencies
own single fixed loop
call updates in documented order
render
```

Domain-specific state machines and reset policies should live in their owning systems/session modules.

### 3. Creature Separation

Keep perception/temperament decisions, locomotion/steering, and attack-state behavior separated enough that one creature file does not grow into a catch-all.

Do not introduce a generic ECS/behavior-tree framework just to achieve separation.

### 4. Interaction / Field Tool Boundary

Manual swing initiation, Auto Harvest initiation, and hit resolution should have a clear flow without competing transform owners or duplicated arc logic.

### 5. Data-Driven World Definition

Move authored placements out of scattered hard-coded arrays into a simple world definition, preferably:

```text
src/world/data/world.json
```

or equivalent.

It should support:

- ground/terrain regions,
- resources,
- creature spawn/home/temperament data,
- platforms,
- ramps,
- ladders,
- jump/parkour geometry,
- waystones,
- future points of interest.

Runtime systems should consume normalized world data rather than each maintaining unrelated placement lists.

### 6. Dev-Only Author Mode

Add a small human-facing editor for quick world iteration:

- select/place,
- move,
- rotate,
- elevate,
- resize supported objects,
- duplicate/delete,
- Edit ↔ Play quickly,
- export/copy deterministic world data.

This is intentionally not a production game editor framework.

Optional PNG object-map/heightmap import may later generate a first draft, but editable world data remains source of truth.

## State & Dependencies

- Mutable state has one explicit owner.
- Dependencies are passed explicitly.
- `window.__game` is debug-only and gameplay must not depend on it.
- Avoid hidden cross-module mutation.
- If two systems need the same rule (for example attack arc eligibility), centralize that rule rather than reimplementing it.

## Configuration

Feel/balance/presentation constants should live in centralized config exports (`src/game/config.js` or focused colocated `*_CONFIG` modules).

Do not scatter unexplained tuning literals across update functions.

## Performance Guardrails

- One rAF.
- Fixed-step gameplay.
- Capped DPR.
- Bounded pools for repeat effects/projectiles/pickups/motes.
- No unbounded arrays or per-enemy loops outside the main update.
- No per-frame DOM creation.
- Keep active creature counts small for the competition prototype.
- Prefer shared geometry/materials where practical.

## Build & Submission

- Dev: native ESM + local importmap.
- Submission: `esbuild` bundles first-party code readable/unminified into root `index.html`; Three.js/Rapier remain vendored local dependencies.
- Runtime must make no external network requests.
- ZIP must remain <35 MB.

Authoritative gates:

```sh
npm test
npm run verify
npm run zip
```

Browser/phone manual testing remains mandatory for collision, touch gestures, audio, and gameplay feel.

## Architectural Decision Rule

Do not refactor merely for aesthetic purity. Refactor when one of these becomes true:

- a module has multiple unrelated reasons to change,
- the same rule is duplicated across systems,
- a new phase would require adding more domain logic to `main.js`,
- state ownership is unclear,
- testing a rule requires booting unrelated systems,
- world authoring requires editing gameplay source code.

Phase 3.5 exists because several of those thresholds will otherwise be crossed by extraction, persistence, capture, companions, equipment, and waystones.
