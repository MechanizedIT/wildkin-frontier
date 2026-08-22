# Wildkin Frontier — Phase 3.5A: Core-Loop Architecture, World Data & Region Activation

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.5A  
**Purpose:** Build the minimum technical foundation required for the first real directed expedition without starting Camp/map/extraction gameplay yet.

This is an **architecture/data/performance slice**, not a feature-expansion sprint.

Phase 3.1 / 3.1.1 is accepted. Preserve its validated gameplay unless this migration exposes a real regression.

---

# 1. Outcome

At the end of this slice:

- current gameplay still works,
- world placement loads through a normalized data-driven path,
- temporary run/session state has a focused owner instead of continuing to accumulate in `main.js`,
- authored world content can be grouped into regions/pockets,
- only the current/nearby region neighborhood performs meaningful gameplay simulation,
- the architecture is ready for Phase 3.5B authoring and Phase 4 Camp/map/extraction without another framework rewrite.

The core question is:

> **Can we safely build a larger directed frontier without world coordinates, temporary run state, and distant simulation becoming new sources of complexity?**

---

# 2. Hard scope

Implement only:

1. focused Expedition/Run Session ownership,
2. data-driven world definition + normalization/validation,
3. migration of the existing systems-test world through that data path,
4. region/pocket identity + adjacency,
5. lightweight active-region manager,
6. system hooks needed to activate/deactivate authored resources, creatures, and world collision safely,
7. regression/integration tests,
8. architecture/docs/build-log updates.

Do **not** implement:

- real Camp gameplay,
- map UI,
- frontier gate/start-selection flow,
- extraction/banking UI,
- major Waypoint interaction,
- Extraction Beacon interaction,
- POI edge indicators,
- bonding/capture,
- companions/mounts,
- skill tree/equipment progression,
- Matter Resonator gameplay,
- base expansion,
- final Area 1 content,
- full in-game editor (Phase 3.5B),
- A*/navmesh,
- procedural generation,
- complex asynchronous asset streaming.

---

# 3. Preserve validated Phase 3.1.1 behavior

Do not redesign accepted systems while migrating ownership/data.

Preserve:

- one rAF + fixed 1/60 gameplay loop,
- Rapier as sole physics runtime,
- player movement/jump/fall/dodge/climb/mantle,
- unified Field Tool owner and shared cadence,
- Auto Harvest behavior,
- manual tap/hold/swipe rules,
- resource node/pickup behavior,
- player health/death/restart,
- creature temperaments and Wildkin-vs-Wildkin reactions,
- leash/home/return,
- lightweight steering,
- projectile collision behavior,
- XP collision-aware pop/rest + guaranteed magnet,
- portrait/mobile layout,
- offline/no-CDN submission packaging.

Temperament debug markers may remain available through debug controls, but normal game architecture must not depend on them.

---

# 4. Expedition / Run Session owner

Introduce a small focused owner such as `ExpeditionSession` or `RunSession`.

It should own temporary expedition lifecycle state that otherwise keeps growing in `main.js`.

Minimum useful shape:

```text
status
runXp
kills
unsecuredResourceCargo reference/summary as appropriate
startAnchorId or start location identity
currentRegionId / currentPocketId
maxDepth or deepest region/pocket reached if useful
run reset/death lifecycle hooks
future slots for unsecured Wildkin/extraction outcome
```

Do not force player-health internals, rendering, creature AI, or resource-system state into this module merely to centralize everything.

Prefer orchestration and session-owned summary state over duplication.

`main.js` should wire/update the session rather than contain new domain policies.

---

# 5. Data-driven world definition

Create a simple source of truth, preferably:

```text
src/world/data/world.json
```

or an equivalent explicit data module if JSON creates a concrete build/test problem.

The schema only needs to support current content plus near-future directed-world concepts.

Required authored concepts:

```text
world
  camp (placeholder metadata allowed; do not build gameplay)
  areas / regions
    id
    bounds or activation volume
    neighbor region ids
    pockets (optional nested identity if useful)
    ground / terrain / props
    resources
    creatures
    traversal geometry
    majorWaypoints (data only for now)
    extractionBeacons (data only for now)
    pois (data only for now)
```

Current systems-test/playground content should be represented by this same data path.

Do not create two separate loaders for "test arena" and "real frontier."

---

# 6. World normalization + validation

Create one normalization/validation step before runtime systems consume authored world data.

Validate at least:

- unique IDs where required,
- valid region/pocket references,
- valid neighbor references,
- required transforms/types,
- creature spawn/home data,
- supported world object types,
- anchor/POI type identifiers,
- no obvious invalid cross-region ownership.

Preserve or integrate the Phase 3.1.1 creature-spawn clearance regression where practical.

Runtime systems should consume normalized data, not each parse raw JSON independently.

---

# 7. Region / pocket activation manager

Three.js frustum culling is render-side only. We need bounded **gameplay simulation** as the frontier grows.

Add a lightweight active-region owner.

## Baseline rule

```text
active = current region/pocket + immediate neighbors needed to prevent visible/collision pop-in
inactive = distant regions
```

Exact current-region detection can use the simplest deterministic method supported by authored data:

- bounds/activation volumes,
- pocket volumes,
- explicit region transitions,
- or another simple authored method.

Do not add a navigation/pathfinding framework to determine regions.

## Active-region manager responsibilities

- determine current region from player position,
- compute active region set,
- emit/apply activation changes only when the set changes,
- expose active IDs for debug/tests,
- preserve a neighbor buffer so the camera never looks into missing ground/collision,
- avoid per-frame allocation/churn where practical.

---

# 8. What activation means

Different systems may use different cheap strategies.

### Static world / traversal

- Current + neighbor geometry/collision must exist before the player sees/reaches it.
- Distant heavy collision may be removed/disabled if safe.
- Cheap distant decorative visuals may remain if that is simpler; do not optimize blindly.

### Resources

Inactive regions should not run harvest/respawn/pickup logic.

On reactivation:

- current accepted test behavior remains coherent,
- no duplicate node/pickup instances,
- state is restored/reset according to existing authored/test semantics.

### Creatures

Inactive region creatures should not:

- perceive,
- steer,
- attack,
- fire projectiles,
- consume meaningful fixed-step AI cost.

Their Rapier collision/body should be disabled/removed if needed to avoid distant physics overhead.

On reactivation:

- no duplicate creature,
- home data remains valid,
- dead/respawn state remains coherent within current prototype rules,
- no instant attack from stale state unless logically valid.

### Temporary entities

Projectiles, XP, resource pickups, and other temporary effects must not leak or duplicate across deactivation.

Use the simplest consistent cleanup policy for this prototype and document it.

---

# 9. Do not overbuild "streaming"

This slice is **not** an MMO/open-world asset streamer.

All assets/data remain packaged locally.

Do not add:

- network loading,
- dynamic import of gameplay areas,
- background asset jobs,
- complicated LOD framework,
- occlusion system,
- generic scene graph paging library.

The goal is simply:

> **Total world size may grow, but active AI/physics/gameplay cost should remain tied mainly to the player's local neighborhood.**

---

# 10. Thin `main.js`

After the migration, `main.js` should primarily:

```text
initialize
create systems
wire dependencies
own fixed loop
update session/world activation/systems in documented order
render
```

Do not perform a cosmetic rewrite.

Move only code whose ownership is already unclear or would otherwise block Phase 4.

---

# 11. Required tests

Add focused tests/integration coverage for:

## World data

- world definition loads/normalizes,
- invalid duplicate IDs fail,
- bad neighbor/reference IDs fail,
- existing test-world objects are represented through the new data path,
- creature spawn validation still passes.

## Region activation

- player position resolves current region/pocket,
- active set includes expected neighbor buffer,
- moving across a boundary changes active set once,
- moving back restores expected set,
- distant regions remain inactive,
- no duplicate entity creation after deactivate/reactivate.

## Creature/resource integration

- inactive creature does not progress AI/attack timers,
- active creature still behaves normally,
- inactive resource region does not produce unwanted run updates,
- reactivation restores a valid state.

## Temporary entities

- deactivation cleanup does not leak projectiles/pickups/XP,
- pools remain bounded.

## Existing regressions

Preserve all prior tests.

---

# 12. Human playtest / debug acceptance

The agent final response must include a simple test procedure.

At minimum provide a debug way to see:

- current region/pocket ID,
- active region IDs,
- optionally active creature/resource counts.

Human test:

1. Start in one test region.
2. Confirm only current + intended neighbor regions report active.
3. Cross a region boundary.
4. Confirm the new region activates before gameplay/geometry becomes visibly missing.
5. Confirm the distant old region deactivates after it leaves the neighbor buffer.
6. Walk back and confirm it reactivates without duplicate creatures/resources.
7. Re-run normal movement/harvest/combat/death/restart checks.
8. Watch for collision holes, visible pop-in, duplicate enemies, stale attacks, or pickup leaks.

This is primarily an architecture slice; visual world quality is not being judged here.

---

# 13. Performance acceptance

Do not require a synthetic huge benchmark framework.

Provide enough instrumentation/tests to establish that:

- inactive regions do not keep updating creature AI,
- active object counts remain bounded by local neighborhood rather than total authored world size,
- no new per-frame DOM creation,
- no second rAF,
- no unbounded pools/arrays introduced.

---

# 14. Documentation updates

Implementation agent should update:

- `docs/ARCHITECTURE.md` with final actual module/file names and activation policy,
- `docs/PROJECT_PLAN.md` only if implementation materially changes the planned 3.5B/Phase 4 handoff,
- `README.md` project state if useful,
- `docs/BUILD_LOG.md` with model/tool/prompt, decisions, files, tests, human-test instructions, and deferred issues.

Do not rewrite stable design decisions unless a real conflict is discovered; propose changes instead.

---

# 15. Completion gate

Phase 3.5A is complete only when:

- existing game remains playable,
- data-driven world path owns the current test world,
- run/session owner exists and `main.js` does not grow more domain state,
- region/pocket activation works across at least multiple authored test regions,
- inactive regions stop meaningful gameplay simulation,
- activation/deactivation is deterministic and duplicate-safe,
- automated tests pass,
- `npm run verify` passes,
- `npm run zip` passes,
- offline/portrait/single-rAF/fixed-step/Rapier constraints remain intact,
- human boundary/re-entry regression test passes.

Then stop.

**Do not start Phase 3.5B or Phase 4 in the same session.**
