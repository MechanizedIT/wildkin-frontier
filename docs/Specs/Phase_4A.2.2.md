# Wildkin Frontier — Phase 4A.2.2: Author Object Contract & Parity Foundation

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A.2.2  
**Purpose:** Replace the remaining object-family-specific Author Mode seams with one small data-driven Author Object contract so existing world objects can be edited consistently and the later primitive kitbash / visual asset system can plug into a stable authoring foundation.

Phase 4A.2.1 repaired important trust failures: transactional draft ownership, preview-only drag state, Ground/Boundary live parity, spawn Y/facing, auto-rehome, attack-edge latching, undo/redo reconciliation, and guidance lifecycle. Human playtesting after that pass confirmed those repairs are materially better, but also exposed the next architectural blocker: Author Mode still knows too much about concrete gameplay schemas and creates placeholder previews for several families.

A read-only Codex audit confirmed that the abstraction currently stops at rectangular static descriptors. This slice closes that gap **before** kitbash.

This is a bounded authoring-foundation/parity slice, not a general engine rewrite and not the kitbash phase.

---

# 1. Required end state

At the end of Phase 4A.2.2, Author Mode should work conceptually like this:

```text
canonical world object + storage location
                │
                ▼
       AuthorTypeRegistry.resolve()
                │
                ▼
       AuthorObjectSnapshot
       ├─ normalized transform
       ├─ capabilities
       ├─ inspector fields
       ├─ ownership policy
       ├─ VisualRef
       └─ ColliderDescriptor
          │                │
          ▼                ▼
 common Author Mode     Author Draft
 preview / drag / UI    transactional adapter write
          │
          ▼
      VisualFactory
       ↙       ↘
 Author Edit   Runtime Play
```

Author Mode must no longer need to know that a Platform stores `x/z/y/w/h/height`, that a Ladder stores `bottomY/topY`, or that a Tree is a resource. It should ask the resolved Author type how to read/write the normalized authoring view.

Core acceptance question:

> **Can a human add, move, rotate, resize/elevate, hide/show, undo/redo, and immediately preview appropriate existing object families without Author Mode containing another family-specific patch path or requiring Play → Edit to see the real object?**

---

# 2. Source findings this slice must close

Human playtesting after Phase 4A.2.1 found:

- visible collidable Box/prop changed to hidden still does not gain its wireframe proxy until Play → Edit,
- some existing brown traversal boxes/platforms cannot be moved, or visually drag and snap back,
- existing Boundary editing is still inconsistent in some cases even though newly placed Boundary objects now work,
- Ladder cannot be dragged normally; new Ladder appears as a generic gray box until Play → Edit,
- newly placed Tree appears as a green placeholder box until Play → Edit,
- several resources/anchors/POIs do not expose rotation and/or resize even when those operations should be meaningful,
- Ground, spawn Y/facing, cross-region drag, fast-click attack, and undo/redo are materially improved and should be preserved.

The Codex audit reproduced additional contract failures:

- generic Platform drag can commit a shadow `pos` field while canonical `x/z` remain unchanged,
- creature custom inspector fields such as `roamRadius` can fail to write,
- POI custom fields such as `requires` can fail to write,
- `STATIC_CAPABILITIES` exists but production Author UI still owns duplicate hard-coded capability functions,
- `createPreviewMeshForNewObject()` still creates placeholder Boxes for Tree/Wildkin/Ladder/anchors/POIs and other families,
- Platform/Obstacle/Ladder runtime construction remains outside the shared author transform/collider interpretation,
- visible → hidden proxy creation depends on reconstruction rather than a live proxy lifecycle,
- resource and creature visual construction is coupled to gameplay/runtime wrappers,
- current tests still contain simulated handler behavior and do not fully exercise the real Author/browser path.

Do not patch these as separate one-off defects. The point of this slice is to remove the structural reason they keep recurring.

---

# 3. Architecture decision

Implement a small explicit **AuthorTypeRegistry** (name may vary slightly if a clearer equivalent emerges) whose entries describe how an existing canonical object participates in Author Mode.

This registry is **authoring metadata/adapters only**. It is not ECS, not runtime component architecture, and not a new persisted world-object schema.

## Keep existing canonical gameplay schemas

Do **not** migrate all `world.json` objects to one universal transform format in this slice.

Instead expose a normalized in-memory Author transform through adapters.

Examples:

```text
prop/resource/anchor
  canonical: pos + rotY + size/scale
  author:    position + rotationY + size/scale

platform/obstacle
  canonical: x/z/y|baseY/w/h/height/rotY
  author:    position + rotationY + box size

climbable
  canonical: x/z/bottomY/topY/...dependent traversal fields
  author:    position + rotationY + width/height/depth

spawn
  canonical: position + facingYaw
  author:    position + rotationY
```

Author Mode submits a normalized transform to the resolved adapter. The adapter writes the correct canonical fields atomically.

**Author Mode must not construct raw family-specific patches like `{ pos }`, `{ x, z }`, or `{ bottomY }` itself.**

---

# 4. Hard scope

Implement only the following:

1. Author type registry + type resolution for every currently authored world family,
2. normalized Author object snapshot and transform view,
3. per-type transform/storage adapters that write canonical schemas transactionally,
4. registry-owned capabilities replacing duplicate UI hard-coding,
5. small declarative inspector-field model for current custom metadata,
6. shared `VisualRef` / pure visual factory seam used by both Author preview and runtime visuals,
7. shared collider descriptor/proxy seam for authorable collision,
8. live proxy lifecycle for visible/hidden/collision transitions,
9. proof migrations: **Box, Tree, Ladder**,
10. sibling parity sweep: Platform/Obstacle, Rock/Fiber, current static props, anchors/POIs, current Wildkin author metadata,
11. repair existing Boundary parity through the same shared contract rather than a special new Boundary patch,
12. remove placeholder preview behavior for migrated/current supported families,
13. stronger contract/integration tests plus browser-path verification where feasible,
14. docs / Build Log / architecture updates,
15. preserve hackathon/offline/size/single-rAF/fixed-step constraints.

---

# 5. Explicit non-goals

Do **not** implement:

- primitive kitbash asset authoring UI,
- reusable visual asset persistence/editor yet,
- GLB loading/import pipeline,
- generic prefab inheritance,
- region CRUD or Region palette placement,
- terrain sculpting/painting/heightmaps,
- generic transform gizmos,
- multi-select,
- arbitrary material/shader editor,
- animation editor or skeletal rigging,
- ECS/component-system migration,
- generic scene serialization framework,
- broad gameplay rebalance,
- Wildkin bonding/companions,
- Matter Resonator progression,
- Phase 4B expedition layout/pacing work,
- second area content,
- new runtime dependencies unless absolutely unavoidable.

The purpose is to make the **existing Author Mode extensible and truthful**, then stop and build kitbash on top of it in the next phase.

---

# 6. AuthorTypeRegistry contract

Create one central registry or equivalent source of truth.

Each resolved type definition should provide only what is needed by current Author workflows. An illustrative shape is:

```js
{
  key: "resource:tree",
  matches(found) {},

  transform: {
    read(ref) {},
    write(candidate, ref, authorTransform, options) {},
    sizeMode: "uniform" // "box" | "uniform" | "none"
  },

  storage: {
    create(candidate, context) {},
    duplicate(candidate, ref) {},
    remove(candidate, ref) {}
  },

  capabilities: {
    selectable: true,
    draggable: true,
    elevation: true,
    rotation: true,
    resize: true,
    duplicatable: true,
    deletable: true,
    presentation: false,
    collisionControl: false
  },

  ownership: { mode: "point" },
  visual: { resolveRef(ref) {} },
  collision: { describe(ref) {} },
  inspector: []
}
```

Exact names may differ. Do not overbuild the interface.

Required properties:

- every current authorable world object resolves to exactly one type definition,
- registry/capabilities become production truth for inspector exposure,
- concrete family knowledge is concentrated in registry definitions/adapters rather than spread across `authorUI`, `authorMode`, and `authorDraft`,
- adding a new authorable subtype later should primarily mean adding/registering a definition, not editing several family switch statements.

---

# 7. Normalized Author transform

Use one editor-facing transform shape, for example:

```js
{
  position: { x, y, z },
  rotationY,
  size: { width, height, depth }, // box-sized objects
  uniformScale                  // organic/simple scalable objects
}
```

A type only exposes fields it supports.

## Universal authoring policy

Default rule:

> **Every appropriate placed world object supports position, elevation, rotation, and a meaningful resize/scale operation unless there is a concrete gameplay reason not to expose it.**

Initial policy:

| Family | Position/Y | Rotation | Resize/Scale | Notes |
| --- | --- | --- | --- | --- |
| Box/Fence/Gate/Forest Boundary | yes | yes | box dimensions | visual + collider together |
| Drop Pod/Resonator | yes | yes | dimensions | special visual must honor authored size coherently |
| Ground | yes | yes | box dimensions | support + collider parity |
| Boundary | yes | yes | box dimensions | proxy + collider parity |
| Platform/Obstacle | yes | yes | box dimensions | canonical traversal/collider fields update |
| Ladder/climbable | yes | yes | width/height, bounded depth | dependent climb fields recompute coherently |
| Tree/Rock/Fiber | yes | yes | **uniform scale initially** | collision/interaction geometry scales coherently |
| Wildkin | yes | initial facing | **no scale initially** | avoid silently altering combat/capsule/game identity |
| Waypoint/Beacon | yes | yes | no scale initially | avoid implying interaction-radius scaling |
| POI/chest/barrier | yes | yes | subtype-defined uniform/box scale where safe | collision/requirements stay coherent |
| Camp/Run Spawn | yes | facing only | no | player capsule fixed; no duplicate/delete |

Do not force resize on a family where gameplay semantics are not designed yet. The registry must explain the exception rather than hiding controls through hard-coded UI logic.

---

# 8. Adapter write rules

All author transform changes must use adapter writes inside the existing transaction boundary.

Examples:

## Platform / Obstacle

Dragging must update canonical `x/z` and elevation fields. Resizing must update `w/h/height`. Rotation must update canonical rotation used by visual and collision paths.

No shadow `pos` field may be created.

## Ladder / climbable

Moving/resizing/rotating a Ladder must coherently update all dependent traversal data needed by existing runtime behavior, including current climb volume / approach / top-entry / mantle relationships as applicable.

Do not merely move the visual.

## Resource

Tree/Rock/Fiber position/rotation/uniform scale must affect the shared visual root and relevant simple collider/interaction dimensions.

## Spawn

Reuse the accepted Phase 4A.2.1 spawn behavior: normalized `rotationY` maps to canonical `facingYaw`; no scale.

---

# 9. Inspector must be registry-driven

Remove production dependence on hard-coded UI capability functions such as:

- `supportsY`,
- `supportsRot`,
- `supportsSize`,
- local `getCapsForFound`,
- equivalent concrete-family checks for ordinary transform/presentation exposure.

Author UI should render transform controls from the resolved type definition.

## Custom metadata fields

Introduce a small declarative inspector field schema for fields that are not part of the common transform/presentation model.

Supported control types only need to cover current needs:

- number,
- text,
- enum/select,
- boolean,
- color,
- bounded requirements/JSON editor where already needed.

Current examples to migrate/prove:

- Wildkin temperament,
- roam radius,
- notice radius,
- personal space,
- leash radius,
- move-home-with-spawn behavior,
- Waypoint/Beacon display name,
- POI `requires`,
- resource subtype/type where currently editable.

A custom field write must go through the same transactional adapter/field writer. Do not mutate snapshot objects in UI code.

---

# 10. Shared visual construction

Create a deterministic, pure visual-construction seam shared by Author Edit and Runtime Play.

Conceptually:

```js
createVisual(visualRef, {
  objectId,
  mode: "author" | "runtime",
  deterministicSeed
}) -> THREE.Object3D
```

Requirements:

- constructor creates local-space visual geometry only,
- does not add itself to a scene,
- does not create Rapier bodies,
- does not start AI, harvesting, timers, DOM debug markers, or private animation loops,
- deterministic for the same object ID/data,
- returned root receives world transform/scale externally,
- runtime gameplay systems wrap/reuse this visual rather than duplicating its geometry,
- Author Mode uses the same visual immediately on placement and after reconciliation.

## Proof objects

### Box

Proves:

- box transform,
- dimensions,
- presentation,
- collision descriptor,
- live hidden-collider proxy lifecycle.

### Tree

Proves:

- non-placeholder organic/resource visual,
- shared runtime/Author visual factory,
- deterministic procedural variation,
- rotation + uniform scale,
- simple collider/interaction scaling independent of detailed foliage geometry.

### Ladder

Proves:

- incompatible legacy canonical schema behind a normalized adapter,
- immediate real visual rather than gray Box,
- move/rotate/resize with dependent traversal semantics.

After those pass, sweep Platform/Obstacle and Rock/Fiber through the same contracts.

---

# 11. VisualRef seam for future kitbash

Introduce the smallest visual reference abstraction needed so world/Author code does not care how a visual is produced.

Current built-ins may resolve conceptually as:

```js
{ kind: "builtin", id: "resource/tree" }
{ kind: "builtin", id: "traversal/ladder" }
{ kind: "builtin", id: "prop/box" }
```

The next phase may add:

```js
{ kind: "asset", id: "camp/drop-pod-v2" }
```

Do **not** implement the asset data/editor in this slice.

The seam must leave room for a later asset definition whose source could be:

```text
primitive recipe
or, later, GLB
```

World objects must not eventually need to branch on primitive-vs-GLB source.

---

# 12. Collision descriptor + Edit proxy lifecycle

Create one focused collision description seam for authorable world objects where collision exists.

Illustrative shape:

```js
{
  shape: "box", // bounded current shapes only
  size: { width, height, depth },
  offset: { x, y, z },
  rotationY,
  enabled,
  editProxy: { visibleWhenHidden: true }
}
```

Do not turn detailed visuals into mesh colliders.

Requirements:

- Box/Boundary/Platform/Obstacle/Ladder/resource collision remains simple,
- visual transform and collider transform remain coherent,
- visible object → hidden + collision enabled immediately creates/ensures an Edit proxy,
- hidden → visible or collision disabled removes/hides the proxy immediately,
- proxy lifecycle does not depend on Play → Edit reconstruction,
- existing newly placed Boundary behavior remains correct,
- existing Boundary resize/move/rotate uses this same descriptor path,
- runtime Rapier construction should consume the same collision interpretation rather than an unrelated parallel transform definition where practical in this bounded slice.

---

# 13. Author Mode simplification

Refactor Author Mode around a generic preview handle driven by the resolved Author type.

The generic flow should be:

```text
select
→ resolve type
→ read normalized snapshot
→ preview handle owns root visual + optional proxy
→ drag/inspector produces normalized candidate transform
→ adapter transactional write
→ reconcile from canonical snapshot
```

Concrete gameplay-type checks may remain only where behavior is genuinely unique (for example spawn marker line visualization or creature home marker), not for ordinary position/rotation/size storage.

`createPreviewMeshForNewObject()` must no longer use generic placeholder Boxes for supported migrated families.

---

# 14. Storage operations

Move object-family storage knowledge behind definitions/adapters where practical:

- lookup/reference resolution,
- create,
- duplicate,
- delete,
- ownership/rehome,
- normalized transform read/write.

Do not build a generic database layer.

Preserve:

- atomic validation,
- bounded undo/redo,
- deterministic persistence/export,
- auto-rehome behavior,
- spawn special constraints,
- footprint ownership for Ground/Boundary.

---

# 15. Sibling consistency sweep

After Box/Tree/Ladder proofs, explicitly verify the shared contract across:

## Static / rectangular

- Box,
- Fence,
- Gate,
- Forest Boundary,
- Ground,
- Boundary,
- Drop Pod,
- Resonator,
- Water,
- Island,
- Platform,
- Obstacle.

Do not claim support a subtype does not actually provide. In particular reconcile Island collision truth and Drop Pod authored dimensions with runtime behavior.

## Resources

- Tree,
- Rock,
- Fiber.

## Frontier / POI

- Major Waypoint,
- Extraction Beacon,
- POI Chest/current POI subtypes.

## Wildkin

- Rusher,
- Spitter/current creature types for transform/facing and existing custom inspector metadata.

## Spawns

Preserve accepted Camp/Run Spawn position/Y/facing behavior through the registry seam.

---

# 16. Testing requirements

Phase 4A.2/4A.2.1 showed that helper-level green tests can give false confidence. Tests must target contracts and real integration paths.

## Contract tests

Required examples:

- every current authorable world object resolves to exactly one Author type,
- transform capability exposure comes from registry data, not type-list helpers,
- adapter round-trip never creates shadow transform fields,
- Platform normalized drag writes canonical `x/z`,
- Platform rotation/resize reaches the runtime/collider descriptor,
- Ladder move/rotate/resize updates all required dependent climb fields,
- Tree rotation/uniform scale writes canonical authoring data and scales collider/interaction dimensions coherently,
- Wildkin `roamRadius` and sibling custom fields actually persist through inspector field writer,
- POI `requires` actually persists through inspector field writer,
- ownership modes point/footprint/fixed remain correct.

## Three.js integration tests

Required examples:

- create/place Tree through the real Author preview path and verify real Tree visual signature, not placeholder `BoxGeometry`,
- create/place Ladder and verify real Ladder visual signature immediately,
- visible collidable Box → hidden creates proxy immediately; restoring visible removes/hides it,
- existing Boundary resize updates current visual + proxy without reconstruction,
- Author and runtime use the same `VisualRef` constructor for proof objects,
- collision descriptor transform matches visual root transform for proof objects.

## Browser/dev-server verification

Where tooling permits, exercise real event paths rather than simulated local functions:

- pointerdown → move → pointerup Platform,
- pointerdown → move → pointerup Ladder,
- inspector rotation/resize on Tree/Ladder/Platform,
- visible/collision proxy transition,
- Tree/Ladder placement without mode cycling,
- undo/redo with actual scene objects.

Do not add a heavy browser testing dependency solely for this slice; existing dev tooling or a lightweight script/manual browser verification is acceptable.

## Test quality rule

Do not use:

- `assert.ok(true)`,
- source-string presence as proof of runtime behavior,
- locally reimplemented pseudo-handler logic as proof the actual handler works.

A source scan is allowed only for architectural invariants such as forbidden duplicate rAF owners, never as the sole test of an interaction.

---

# 17. Human acceptance tests

Muse must report these as **TO BE PERFORMED BY HUMAN**, never as passed automatically.

## Test 1 — Platform / brown traversal objects

In Edit, select the existing jump-gap platforms/obstacles and tall brown platform. Drag, rotate, elevate, and resize where exposed.

Pass:

- movement remains after release,
- no snap-back,
- hierarchy/canonical export reflect the new values,
- Play visuals/collision/traversal match Edit.

## Test 2 — Ladder parity

Select an existing Ladder and drag/rotate/resize/elevate it. Place a new Ladder.

Pass:

- existing Ladder moves live and remains moved,
- actual Ladder visual moves, not only an attached Box,
- new Ladder immediately looks like a Ladder in Edit,
- Play climb behavior and visual match authored result.

## Test 3 — Tree/resource parity

Place Tree, Rock, and Fiber. Move/rotate and change supported scale.

Pass:

- each immediately shows its real runtime-style visual in Edit,
- no placeholder colored Box,
- Play uses the same deterministic appearance/transform,
- Tree/Rock collision/harvest interaction remains coherent after scaling.

## Test 4 — Proxy lifecycle

Take an existing visible collidable Box/Fence/etc. Set `Visible in Play = false` while collision remains enabled.

Pass:

- wireframe proxy appears immediately in the current Edit session,
- moving/resizing/rotating updates proxy live,
- setting visible again removes/hides proxy immediately,
- Play collision matches.

## Test 5 — Existing Boundary parity

Select several pre-existing Boundaries from different regions and resize/move/rotate/elevate them.

Pass:

- behavior matches newly placed Boundary objects,
- no old-vs-new object path difference,
- Play collision matches.

## Test 6 — Registry-driven controls

Inspect Box, Platform, Ladder, Tree, Wildkin, Waypoint, Beacon, POI, Spawn.

Pass:

- transform/size controls appear according to the type definition,
- legitimate exceptions are hidden intentionally,
- no missing Tree/Beacon/etc. rotation merely because old UI type lists said no.

## Test 7 — Custom inspector metadata

Edit Wildkin temperament/roam/notice/personal/leash fields and POI requirements.

Pass:

- values persist after selection change,
- export/reload preserves values,
- existing runtime behavior still consumes them.

## Test 8 — Undo/redo and region regression

Perform mixed operations across Platform, Ladder, Tree, Beacon and Box, including one cross-region drag and several undo/redo steps.

Pass:

- canonical data, hierarchy, visuals and proxies stay synchronized,
- no ghosts/placeholders/snap-back,
- auto-rehome remains correct.

## Test 9 — Core regression smoke

Start at Camp, begin expedition, harvest, fight, activate/extract/return, and use elevated spawn.

Pass:

- no regression to accepted Phase 4A/4A.2.1 gameplay/input/spawn/region behavior.

---

# 18. Automated gates

Before declaring implementation complete, run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Also confirm:

- one looping first-party rAF owner remains,
- no new runtime network dependencies/requests,
- bundle remains comfortably under 35 MB,
- generated world data remains synchronized,
- no new Author placeholders for supported migrated families,
- no shadow transform fields introduced by adapter writes.

---

# 19. Documentation updates

On implementation completion, update:

- `docs/ARCHITECTURE.md` with the actual implemented Author registry/adapter/visual/collider contracts,
- `docs/BUILD_LOG.md`,
- `docs/PLAYTEST_NOTES.md` only with implementation state / human acceptance pending as appropriate,
- `docs/PROJECT_PLAN.md` current phase status if the workflow already updates it during phase completion.

Do not describe planned kitbash functionality as implemented.

---

# 20. Stop condition / next phase

Phase 4A.2.2 is accepted only after human tests show the Author object contract actually eliminates current object-family parity failures.

When accepted:

1. **freeze further generic Author infrastructure**, unless kitbash exposes a true blocker,
2. proceed to a separate **Phase 4B.0 — Primitive Kitbash / Visual Asset Authoring** using the `VisualRef` / shared visual-construction seam established here,
3. then return to Phase 4B first-expedition content/pacing work.

The implementation should make 4B.0 smaller. Do not begin 4B.0 in this phase.