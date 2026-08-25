# Wildkin Frontier — Phase 4B.0: Primitive Kitbash / Visual Asset Authoring

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B.0  
**Purpose:** Add a small reusable primitive-based Visual Asset workflow to the now-stable Author Mode so Camp and Area 1 can be visually authored quickly without bloating the submission or requiring external modeling tools.

Phase 4A.2.2 is owner-accepted as the Author foundation. Its contracts are now the base and should be **consumed, not redesigned**:

```text
world object
→ AuthorTypeRegistry / normalized Author transform
→ VisualRef
→ deterministic VisualFactory
→ Author Edit + Runtime Play
→ separate simple ColliderDescriptor
```

Phase 4B.0 adds one new VisualRef source:

```text
{ kind: "asset", id: "..." }
```

backed by compact authored primitive recipes.

This is a **visual-authoring foundation**, not Phase 4B expedition pacing/content yet.

---

# 1. Required end state

At the end of Phase 4B.0 a human can, entirely inside desktop Author Mode:

```text
create Visual Asset
→ add primitive parts
→ select/edit parts
→ move / rotate / scale / recolor parts
→ save recipe in canonical world data
→ place reusable instances from palette
→ move / rotate / scale instance with normal Author tools
→ Edit and Play show the same asset
→ simple collision remains independent
→ export/reload reproduces the same result
```

A saved asset can be placed multiple times without duplicating all primitive-part data into every world instance.

Core acceptance question:

> **Can the owner make and reuse a recognizable low-poly prop in minutes, see the same result in Edit and Play, and then return to actual Area 1 level design instead of fighting asset infrastructure?**

---

# 2. Locked architecture

Do not create a second editor object model.

## Canonical data

`src/world/data/world.json` remains the single manually maintained authored world source.

Add a top-level collection:

```json
{
  "visualAssets": [
    {
      "id": "asset_drop_pod",
      "displayName": "Drop Pod",
      "version": 1,
      "parts": [],
      "collision": null
    }
  ],
  "regions": []
}
```

World instances reference an asset rather than copying its parts:

```json
{
  "id": "prop_camp_dropPod",
  "subtype": "visualAsset",
  "visualAssetId": "asset_drop_pod",
  "pos": { "x": -1.8, "y": 0, "z": 9.8 },
  "rotY": 0,
  "uniformScale": 1,
  "visibleInPlay": true,
  "collisionEnabled": true
}
```

The exact migration shape may differ slightly if the existing Author adapter makes another minimal representation cleaner, but these invariants are required:

- asset recipe exists once,
- instances store only reference + instance properties,
- no per-instance duplication of primitive-part recipes,
- stable deterministic IDs,
- deterministic export ordering.

## VisualRef

Extend the existing seam:

```text
VisualRef
├ builtin → existing factory constructor
└ asset   → Visual Asset recipe renderer
```

World/gameplay code must not care whether a visual is built-in, primitive recipe, or a future GLB.

Phase 4B.0 implements only `builtin` + `asset` primitive recipes.

---

# 3. Primitive recipe v1

Keep the first recipe deliberately small.

Each part:

```json
{
  "id": "body",
  "shape": "cylinder",
  "position": { "x": 0, "y": 0.6, "z": 0 },
  "rotation": { "x": 0, "y": 0, "z": 0 },
  "scale": { "x": 1.2, "y": 1.4, "z": 1.2 },
  "color": "#d0d0d0"
}
```

Required primitive shapes:

- Box,
- Cylinder,
- Cone,
- Sphere,
- Capsule,
- Icosahedron.

Optional only if trivial after the required six are stable:

- Torus.

Do not add arbitrary geometry parameters in v1 unless required by a proof asset. Prefer standardized unit primitives shaped by local `scale`.

## Part transform convention

- `position` is local to the asset root,
- `rotation` is local Euler XYZ in **radians** in canonical data,
- editor UI displays rotation in degrees,
- `scale.x/y/z` must be finite and positive,
- asset root local origin is the world-instance placement origin,
- Y=0 is the intended placement/support plane,
- parts may technically extend below Y=0, but editor should make the support plane visually obvious.

Do not automatically rewrite/normalize authored part positions behind the user's back.

## Material v1

Part material supports only:

```text
color
```

Use the existing flat-shaded visual direction.

Do not add:

- texture/UV editing,
- PBR material inspector,
- emissive editor,
- transparency editor,
- shader graph.

Those are not needed to build Area 1.

---

# 4. Pure Visual Asset renderer

Add a pure recipe renderer compatible with the existing `VisualFactory` contract.

Conceptually:

```text
createVisual(
  { kind:"asset", id:"asset_drop_pod" },
  { visualAssets, objectId }
)
→ local-space THREE.Group
```

Requirements:

- no scene add,
- no Rapier creation,
- no DOM,
- no timer/rAF,
- deterministic,
- children retain stable `assetPartId` metadata for Author part selection,
- asset root retains `visualAssetId`,
- safe disposal of generated geometries/materials during preview rebuild,
- built-in visuals continue working unchanged.

Unknown/missing asset references must fail validation clearly. Do not silently render the generic fallback Box for a canonical asset reference.

---

# 5. Visual Asset data owner

Use the existing transactional Author draft as canonical owner.

Add focused operations such as the equivalent of:

```text
createVisualAsset(name)
renameVisualAsset(id, name)
deleteVisualAsset(id)
addAssetPart(assetId, shape)
updateAssetPart(assetId, partId, patch)
duplicateAssetPart(assetId, partId)
deleteAssetPart(assetId, partId)
updateAssetCollision(assetId, collision)
```

Exact function names are not prescribed.

All asset edits must:

```text
clone candidate
→ mutate asset recipe
→ validate full world
→ atomic commit
→ one undo/history entry per deliberate action
→ persist draft
→ reconcile every visible instance of that asset
```

Do not mutate `getDraft()` snapshots directly.

## Asset deletion

Deleting an asset with world instances must be blocked with a readable message listing/counting references.

Do not silently orphan instances.

---

# 6. Validation

Extend `normalizeWorldData` / validation for Visual Assets.

Validate:

- `visualAssets` optional array defaults safely to `[]`,
- asset IDs globally unique within visual assets,
- display name non-empty,
- recipe version supported,
- part IDs unique within asset,
- supported primitive shape,
- finite local position/rotation,
- positive finite scale,
- valid canonical color,
- instance `visualAssetId` resolves,
- no duplicate asset IDs,
- collision descriptor finite/positive when present.

Keep validation deterministic and side-effect free.

Do not add recursive asset nesting in v1, so cycle detection is unnecessary.

---

# 7. Author Mode UX

Integrate into existing desktop Author Mode. Do not create a separate application or Asset Lab.

Add a compact **Visual Assets** section.

Suggested structure:

```text
Visual Assets
  + New Asset

  Drop Pod
    Place
    Edit

  My Tower
    Place
    Edit
```

## New asset

`+ New Asset`:

- creates a deterministic new asset with readable default name,
- starts with one Box part so the asset is immediately visible/editable,
- enters Asset Edit mode.

## Place

Clicking `Place` on a saved asset uses the existing Author placement workflow and creates a normal world instance referencing `visualAssetId`.

Placed asset instances must participate in the normal Author Object contract:

- selection,
- X/Z drag,
- elevation,
- rotation,
- **uniform instance scale**,
- duplicate/delete,
- cross-region auto-rehome,
- undo/redo,
- visibility/collision controls,
- export/reload.

Do not add a separate transform implementation for asset instances.

## Edit

`Edit` enters a bounded **Asset Edit** sub-mode inside Author Mode.

While editing an asset:

- one asset instance/root is the editing context,
- its primitive children are selectable,
- normal gameplay input remains suppressed,
- world-object dragging must not accidentally fire when dragging a primitive part,
- the rest of the scene disappears; only the asset, its collision proxy, focused stage, and scene lighting remain,
- late runtime visibility changes cannot leak world objects into the workbench,
- live part edits update only the temporary asset root; shared world instances reconcile once on exit,
- camera view can orbit left/right in 45° steps, reset, pan with inverted vertical mouse movement, and zoom without inheriting world-camera limits,
- exit returns to ordinary world Edit without losing selection/camera state where practical.

Do not build a second scene editor architecture.

---

# 8. Asset-part editing

Required controls for selected part:

```text
Shape (read-only after creation in v1)
Position X Y Z
Rotation X Y Z
Scale X Y Z
Color
Duplicate
Delete
```

Required shortcuts/interaction:

- click part to select,
- direct drag changes local X/Z,
- inspector changes Y,
- `Space` raises local Y and `C` lowers local Y (0.2 units; `Shift` uses 1.0),
- Q/E rotates local Y in 15° increments,
- `[`/`]` rotates the camera view by 45° and `0` resets it without changing the selected part,
- existing keyboard nudge convention may be reused for local X/Z,
- clicking a part or the canvas returns keyboard ownership to the workbench; focused form controls retain normal typing,
- undo/redo uses existing Author history,
- Esc cancels an active part drag or exits placement before exiting Asset Edit.

Direct part Y dragging and 3-axis gizmos remain deferred.

## Asset gameplay role and drops

Every recipe has one bounded gameplay role:

- **Prop** — ordinary static Visual Asset behavior.
- **Harvestable** — uses the existing resource lifecycle with an authored drop, hit count, respawn duration, and wood/stone/fiber feedback profile.

The drop may be selected from `world.json.resourceDrops` or created in Author Mode with a stable ID, display name, and color. Custom drops participate in physical pickup collection, run cargo, extraction results, and persistent banking. Role metadata belongs to the shared asset recipe, so all placed instances behave consistently. This is not a generic component, scripting, crafting, equipment, container, or interaction framework.

## Starter primitive library and panel usability

Ship categorized editable recipes for the owner-requested 21-asset starter kit: chest, wooden crate, berry bush, iron ore rock, crystal, furnace, bench, table, chair, wood floor, wood wall, wood doorway, iron gear, iron pickaxe, iron sword, redwood tree, fern, flower, grass patch, stone ruin arch, and stone ruin path.

The Visual Assets list includes search. The desktop panel must fit without sideways scrolling; compact vector inputs remain fully visible at the supported desktop viewport.

## Part creation

Provide six buttons:

```text
+ Box
+ Cylinder
+ Cone
+ Sphere
+ Capsule
+ Icosahedron
```

New part appears at a sensible local default near the asset origin, becomes selected, and is immediately editable.

## Flat hierarchy only

Phase 4B.0 asset recipes are:

```text
Asset
├ Part
├ Part
└ Part
```

Do **not** implement nested groups/parenting, bones, constraints, or prefab inheritance.

The existing world hierarchy may show an expanded Visual Asset instance → Parts view while in Asset Edit if useful, but the canonical recipe remains flat.

---

# 9. Collision stays separate

Visual Asset geometry is never used directly as a Rapier mesh collider.

Each asset may have **zero or one** simple native box collision recipe:

```json
{
  "collision": {
    "shape": "box",
    "offset": { "x": 0, "y": 0.8, "z": 0 },
    "size": { "w": 1.4, "h": 1.6, "d": 1.4 }
  }
}
```

Required Asset Edit controls:

- Collision: None / Box,
- collider W/H/D,
- offset X/Y/Z,
- `Fit To Visual Bounds` button.

`Fit To Visual Bounds` may calculate a bounding `THREE.Box3` from the recipe and write a simple box collider. It is an author convenience, not runtime dynamic collision.

World instances retain their existing `collisionEnabled` switch.

Instance uniform scale must scale the native collision box coherently.

In Asset Edit, show collider wireframe clearly and independently of visual parts.

---

# 10. Proof asset: Camp Drop Pod

Use the existing Camp Drop Pod as the required end-to-end migration/proof.

Recreate its current recognizable visual as a primitive Visual Asset recipe using the new system, approximately preserving its current silhouette:

```text
Drop Pod
├ body      Cylinder
├ canopy    Sphere
├ base/ring or landing detail as supported
└ optional simple legs/details if useful
```

Requirements:

- canonical recipe is in `world.json.visualAssets`,
- Camp Drop Pod world object references the asset,
- Edit visual comes from asset recipe renderer,
- Runtime Play uses the same recipe,
- existing Camp layout/placement remains recognizable,
- collision remains a simple box and behaves as before,
- duplicate/place another Drop Pod instance proves reuse,
- editing the asset recipe updates every instance in Edit after reconciliation,
- no duplicated primitive recipe stored on each Drop Pod instance.

The old hard-coded Drop Pod VisualFactory constructor may remain temporarily for compatibility/tests only if still referenced elsewhere, but the Camp proof instance must use the new asset path.

Do not migrate every built-in visual in this phase.

---

# 11. Reconciliation and shared-instance semantics

Editing a Visual Asset changes **all instances** referencing that asset.

Required flow:

```text
part edit committed
→ visual asset recipe changes once
→ Author preview finds all matching visualAssetId instances
→ rebuilds their VisualFactory roots
→ world-object transforms remain unchanged
```

Undo/redo of an asset edit must rebuild all instances to the corresponding recipe state.

Editing an instance transform must not modify the shared asset recipe.

Duplicating a world instance creates another reference to the same asset.

Do not implement “make unique” / asset inheritance in 4B.0.

---

# 12. Palette behavior

Saved Visual Assets appear dynamically in the Author palette without hard-coded UI additions.

Each palette item needs:

- display name,
- Place,
- Edit.

Adding/renaming/deleting an unreferenced asset updates the list immediately.

The palette must be generated from canonical draft `visualAssets`, not a second local list.

---

# 13. Export / generated world / persistence

Visual Asset recipes are first-class authored world data.

Requirements:

- deterministic JSON export,
- local draft persistence includes assets,
- reset-from-repo restores repo asset recipes,
- `world:generate` includes asset data,
- stale/generated-world guard covers assets,
- Runtime Play has all recipes offline,
- no network requests,
- no external asset files required for primitive recipes.

The resulting primitive recipes should add negligible package size compared with images/models.

---

# 14. Tests that matter

Do not repeat the pre-Codex false-confidence pattern. Test production paths.

## Contract/data tests

- Visual Asset schema validates.
- duplicate asset IDs fail.
- duplicate part IDs fail.
- unsupported shape fails.
- invalid scale fails.
- unresolved instance asset reference fails.
- deleting referenced asset fails.
- deterministic export/reload round-trips asset recipes.

## VisualFactory tests

- `kind:"asset"` resolves recipe and returns expected child primitive geometry.
- same recipe produces deterministic geometry/transforms/colors.
- editing part changes recipe key / rebuilt visual.
- missing canonical asset throws/returns explicit failure rather than fallback Box.

## Production Author integration tests

Exercise real action/preview modules for:

- create asset,
- add part,
- edit part transform/color,
- asset undo/redo,
- place asset instance,
- duplicate instance,
- instance transform without recipe mutation,
- recipe edit rebuilds multiple instances,
- delete referenced asset rejected,
- collision fit/proxy path.

## Browser verification

Use the real `?author=1` app to verify at minimum:

```text
New Asset
→ add 3+ different primitives
→ transform/recolor them
→ place two instances
→ edit shared asset
→ both update
→ Play
→ both match Edit
→ Edit
→ undo/redo asset edit
```

Also verify the migrated Camp Drop Pod.

Do not substitute isolated `createVisual()` calls for the actual Asset Edit / placement path.

---

# 15. Required human acceptance tests

Automated/browser verification does not replace owner acceptance.

## Test 1 — Create recognizable asset

Create a new Visual Asset with at least Box + Cylinder + Cone or Sphere. Move/rotate/scale/recolor the parts until it is visibly recognizable as one object.

**Pass:** part selection/editing feels coherent, no accidental world-object edits, no reload required to see changes.

## Test 2 — Reusable instances

Place the new asset twice in different positions/rotations/scales.

**Pass:** both are normal selectable Author objects; moving one does not move the other.

## Test 3 — Shared recipe update

Edit one primitive part in the shared asset recipe.

**Pass:** both world instances update visually; their independent world transforms do not change.

## Test 4 — Undo/redo

Undo and redo several part edits and instance placements/transforms.

**Pass:** asset recipe, all instances, hierarchy/palette and scene remain synchronized with no ghosts.

## Test 5 — Collision

Fit or author a Box collision recipe, leave instance collision enabled, then Play.

**Pass:** Edit wireframe matches expected simple collision; Runtime collision matches; visual complexity is not used as mesh collision.

## Test 6 — Drop Pod proof

Inspect the migrated Camp Drop Pod and place a second temporary instance.

**Pass:** both use the shared asset recipe, look the same apart from instance transform, Camp original collision/layout still works.

## Test 7 — Save/reload/export

Create/edit an asset, place it, Play→Edit/reload, and export.

**Pass:** recipe and instance reproduce deterministically and generated world remains in sync.

## Test 8 — Core regression

Camp → start expedition → harvest/combat → extract/return.

**Pass:** 4A/4A.2.2 behavior remains intact; no asset editing UI/input leaks into Play.

## Test 9 — Focused Asset Edit and vertical controls

Enter Asset Edit on the starter chest, select its lid, press `Space`, then `C`.

**Pass:** the rest of the game scene is absent; the lid visibly moves up and then returns down; the camera/stage remains stable; exiting Asset Edit restores the world. Typing spaces into an asset/category/drop text field does not move a part.

## Test 10 — Custom harvestable/drop end to end

Create a distinctive resource asset, add a custom drop with a readable name/color, set the role to Harvestable, choose a small hit count/respawn time, place it in a recognizable clear area, and enter Play. Harvest it, collect the drop, then extract.

**Pass:** the asset uses the shared resource lifecycle without a duplicate static copy/collider; each hit yields the selected custom drop; depletion and respawn are readable; run cargo/result/bank use the custom display name and retain the exact count.

## Test 11 — Starter library and panel fit

At the default desktop Author viewport, search for `wood`, `iron`, and `ruin`, then open at least one asset in each group.

**Pass:** all requested starter recipes are findable and recognizable; categories/search reduce scanning; all position/rotation/scale inputs fit without horizontal scrolling.

## Test 12 — Workbench camera, focus, and stability

Open the starter chest, select its lid, then alternate `Q`/`E` and `Space`/`C` several times. Orbit with `[` and `]`, reset with `0`, right-drag vertically, and use the wheel. Exit to the asset library.

**Pass:** part shortcuts respond after part/canvas selection; part values return exactly after paired keys; camera orbit moves in readable 45° steps without changing part rotation; vertical pan uses the inverted direction and remains bounded; no world object flashes or appears during edits/camera movement; exit restores the prior world and camera; no sideways panel scrolling or browser warnings/errors occur.

---

# 16. Explicit non-goals

Do **not** implement in Phase 4B.0:

- GLB/glTF import,
- Blockbench/Blender integration,
- OBJ/FBX,
- texture/UV editing,
- nested part hierarchy/groups,
- CSG/boolean modeling,
- vertex/face editing,
- bones/skeletal animation,
- generic animation timeline,
- material/shader editor,
- prefab inheritance/variants,
- “make unique” instance workflow,
- asset folders/tags,
- multi-select,
- transform gizmos,
- region CRUD,
- terrain sculpting,
- procedural-generation editor,
- Phase 4B expedition pacing/layout changes,
- Wildkin bonding,
- Resonator progression.

If a desired behavior is not required to make/reuse primitive props for Area 1, defer it.

---

# 17. Performance / package guardrails

- Primitive recipes are JSON only.
- Reuse geometry/materials where straightforward; do not prematurely build a complex cache.
- Shared asset instances should not clone recipe data.
- `InstancedMesh` is optional and should **not** be introduced unless profiling proves many identical instances are a problem.
- preserve one looping first-party rAF,
- preserve fixed-step simulation ownership,
- preserve offline/local dependency rules,
- preserve portrait runtime behavior,
- preserve ZIP ≤35 MB.

The point of primitive kitbash is **low authoring friction and tiny asset size**, not an optimized rendering engine.

---

# 18. Implementation sequence

Recommended order:

1. Add Visual Asset schema + validator + deterministic export/generation coverage.
2. Extend `VisualFactory` for `{kind:"asset"}` recipes.
3. Add generic `visualAsset` world-instance Author definition / adapter and runtime render/collider path.
4. Add transactional Visual Asset draft operations.
5. Add dynamic Visual Assets palette: New / Place / Edit.
6. Add Asset Edit mode + part selection and local transform/color editing.
7. Add simple asset collision editor + Fit To Visual Bounds.
8. Implement shared-instance reconciliation + undo/redo.
9. Migrate Camp Drop Pod as proof.
10. Run contract/integration/browser verification.
11. Owner human acceptance.
12. **Freeze asset infrastructure and move directly to Phase 4B expedition experience/pacing.**

Do not continue expanding the modeling tool after the acceptance tests pass.

---

# 19. Automated gates

Run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Also verify:

- no runtime network requests,
- no new dependency required unless unavoidable,
- one looping first-party rAF,
- no editor-only asset helpers visible/active in Runtime Play,
- generated world includes `visualAssets`,
- submission stays comfortably below 35 MB.

---

# 20. Completion report requirements

Final implementation response must state:

1. canonical Visual Asset schema implemented,
2. how `{kind:"asset"}` integrates with existing VisualFactory,
3. how asset instances participate in the existing Author Object contract,
4. Asset Edit UX implemented,
5. primitive shapes implemented,
6. collision model implemented,
7. shared-instance reconciliation/undo behavior,
8. Drop Pod migration result,
9. actual browser acceptance paths exercised,
10. automated gate results,
11. anything not proven.

Do **not** claim human acceptance tests passed. Human acceptance remains owner-only.

After acceptance, stop editor/asset-system infrastructure and proceed to **Phase 4B — First Expedition Experience & Pacing**.
