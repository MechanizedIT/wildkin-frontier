# Wildkin Frontier — Phase 3.5B.2: Author Mode Integration, Transform Parity & Hierarchy

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.5B.2  
**Purpose:** Finish human acceptance of the lightweight world-authoring workflow by making author input exclusive, Edit/Play transforms trustworthy, reset reliable, Wildkin home territory visible/editable, and object selection manageable through a minimal hierarchy.

This is the **final focused Author Mode integration/fix slice before Phase 4**. Do not expand the editor into a general-purpose engine tool. Do not begin Phase 4 gameplay.

Phase 3.5B/3.5B.1 established the correct overall direction: one authored world source, data-driven runtime world, region activation, direct scene placement, click/drag editing, Wildkin selection, camera-centered edit visibility, fog-free author view, deterministic export, and a rough Camp + Area 1 skeleton. Preserve those gains.

---

## 1. Why this refinement exists

Human testing of Phase 3.5B.1 confirmed major progress but found several remaining correctness and usability gaps:

- EDIT still does not truly own the entire game viewport; the virtual joystick / right-side tap-attack zones continue intercepting scene clicks even when their visuals are hidden.
- Drag-moving an object works and rebuilds collision correctly after PLAY.
- Rotating a Camp fence updates its visible mesh, but its collider remains axis-aligned.
- Raising a solid fence changes the authored/visible Y, but its collider stays at ground height.
- Palette → click-world placement works.
- Box W/D/height edits do not fully preview live; size may only appear correctly after PLAY.
- The inspector `Height` field does not consistently change vertical size because author UI/schema/runtime use inconsistent dimension fields.
- Wildkin can now be selected and dragged, and home follows internally, but the human cannot see/edit the Wildkin home/spawn relationship.
- `Reset Draft From Repo` does not reliably restore the canonical repository world.
- A small object hierarchy would materially improve selection/navigation now that the authored world contains many objects.

The editor is close, but it is not yet trustworthy enough to author the real first expedition because **visible Edit state and physical Play state can disagree**.

Core acceptance question remains:

> **Can the human visually shape Area 1 with confidence that what is seen in EDIT is what will exist and collide in PLAY?**

---

## 2. Critical implementation rule — Change Closure / Consistency Sweep

Muse/agents must not fix only the named reproduction case when the underlying contract is shared.

For every change in this slice, trace the complete affected path:

```text
Author UI/input
→ mutable draft
→ normalize/validate
→ live Edit preview
→ static/gameplay runtime builder
→ Rapier/query representation where applicable
→ Play reload
→ deterministic export/reset
→ automated tests
```

### Required proactive behavior

Before implementing, identify the authorable object families affected by each shared contract.

At minimum use this matrix:

| Family | Examples | Position X/Z | Elevation Y | Rotation Y | Size | Collision/gameplay parity |
|---|---|---:|---:|---:|---:|---:|
| solid props | box, fence, forestBoundary, resonator/dropPod where solid | yes | yes where exposed | yes where exposed | W/D/Height | required |
| non-solid props | water/island/visual props | yes | yes where meaningful | yes where exposed | W/D/Height | visual only unless explicitly solid |
| platforms | low/high platforms | yes | yes | only if explicitly supported | W/D/Height | required |
| obstacles | box barriers/obstacles | yes | yes | only if explicitly supported | W/D/Height | required |
| climbables | ladder | yes | only if coherently supported | only if coherently supported | type-specific | traversal parity required |
| resources | tree/rock/fiber | yes | only if runtime supports it | no unless intentionally supported | no in this slice | interaction parity required |
| Wildkin | rusher/spitter spawn | yes | existing supported semantics only | no | no | spawn/home/AI parity required |
| anchors/POIs | waypoint, beacon, chest | yes | yes where meaningful | no unless intentionally supported | no | interaction placeholder parity |

If a control is exposed, it must work end-to-end for that family. If a transform is not coherently supported, hide/disable it rather than leaving a fake field.

### Do not leave partial implementation comments in accepted paths

Do not leave TODO-style behavior such as:

- “size change requires recreation — maybe later”,
- “rotation preview only”,
- “baseY present but physics ignores it”,
- UI fields writing data the runtime never reads.

The completion gate requires a **consistency sweep across all related object families**, not only fence/box examples.

---

## 3. Hard scope

Implement only:

1. explicit Author Mode input ownership,
2. visual ↔ physical transform parity for supported authorable solids,
3. one coherent dimensions contract in the inspector/runtime,
4. live resize preview,
5. Wildkin home/spawn visualization and editing,
6. reliable canonical Reset Draft From Repo,
7. minimal Region → Category → Object hierarchy,
8. focused cross-type automated tests,
9. concise human acceptance instructions,
10. documentation / Build Log updates.

Do **not** implement:

- Phase 4 map/gate-start/extraction/banking/result cards,
- bonding/capture/companions/mount gameplay,
- skill tree/equipment/base expansion,
- final Camp/Area 1 art/balance/layout,
- generic transform gizmos,
- full undo/redo/history,
- multi-select,
- prefab system,
- asset browser,
- scripting,
- procedural generation,
- mobile Author Mode,
- a second physics world,
- new runtime dependencies.

---

## 4. Explicit Author Mode input ownership

The current approach hides HUD/joystick visuals but gameplay pointer handlers still intercept portions of the canvas. This must be fixed at the input-system boundary.

### Required direction

Give gameplay touch/pointer input an explicit enabled state owned through normal module wiring, e.g.:

```text
touchMovement.setEnabled(false)
keyboard/game action input suppression as needed
```

or an equally clear injected `isEnabled()` callback.

Do **not** rely on a fragile global object shape such as `window.__author.authorCtx...` for correctness.

### When entering EDIT

- disable touch movement pointer handling,
- disable right-side tap/hold/swipe attack/dodge handling,
- clear/release any currently active joystick pointer,
- clear/release any active right-side gesture pointer,
- hide gameplay HUD as already intended,
- make the full renderer/canvas area selectable by Author Mode except where the author panel itself overlays it,
- no invisible gameplay input zone may capture pointerdown/pointermove/pointerup.

### When entering PLAY

- restore input exactly once,
- no stale pointer/held-attack/joystick state,
- normal mobile controls behave exactly as before.

Normal `/` mode without `?author=1` must be unchanged.

---

## 5. One transform source for visual + collision parity

Do not independently reinterpret transforms in `authorUI`, `staticWorldBuilder`, and `createPhysicsWorld`.

Introduce or clearly centralize a small normalized authored transform contract/helper for static solids so both rendering and physics consume the same semantic values.

Conceptually:

```text
position/base = x, y, z
rotationY = radians
size = width, height, depth
```

Persisted schemas may retain existing field names when changing them would create unnecessary migration risk, but adapters must yield one consistent runtime transform.

### Solid props

For supported solid props such as:

- box,
- fence,
- forestBoundary,
- resonator/dropPod if collision is enabled,
- other blocking prop subtypes,

require:

```text
Edit visible position == Play visible position == Rapier collider position
Edit visible rotation == Play visible rotation == Rapier collider rotation
Edit visible dimensions == Play visible dimensions == Rapier collider dimensions
```

### Rapier rotation

When a solid authored object supports `rotY`, create the fixed collider using the corresponding Y-axis quaternion/rotation.

A rotated fence must block the player at the rotated fence, not at its old axis-aligned footprint.

Any broadphase/AABB metadata used elsewhere must be recomputed conservatively for rotated geometry if needed. Do not leave stale axis-aligned authored AABBs that cause incorrect obstacle/steering behavior.

### Elevation/base Y

Rapier colliders must consume authored base/elevation Y.

Example:

```text
baseY = 1.0
height = 1.2
visual center Y ≈ 1.6
collider center Y = 1.6
```

Do not hard-code collider center to `height / 2` when authored baseY exists.

Platforms/obstacles exposed as elevatable must obey the same parity.

---

## 6. Dimensions contract and live resize

The inspector must use human-readable **Width / Depth / Height** semantics.

For ordinary props:

```text
Width  -> size.w
Depth  -> size.d
Height -> size.h
```

Do not write prop Height to a separate `height` field if the builder reads `size.h`.

For platforms/obstacles, map the inspector semantic dimensions to their existing schema safely:

```text
Width  -> w
Depth  -> footprint depth (`h` in legacy traversal schema if retained)
Height -> vertical `height`
```

The UI may use adapters; the human should not have to understand the legacy naming difference.

### Live Edit preview

Changing Width/Depth/Height must immediately update the visible object in EDIT.

Use a robust approach:

- recreate geometry for the selected preview object, or
- maintain original dimensions and apply exact scale ratios,
- update pick proxy/highlight to match.

Do not leave a placeholder comment without implementing resize.

### PLAY parity

After PLAY/reload, dimensions must match the Edit preview exactly, including collision for solid objects.

---

## 7. Wildkin spawn/home territory authoring

Current behavior moving `pos` and `homePos` together by default is good; make it visible and controllable.

### Inspector

For a selected Wildkin show at minimum:

```text
Spawn X / Z
Home X / Z
[✓] Move Home With Spawn
Roam radius
Notice radius
Personal-space radius
Leash radius
Temperament
```

Default `Move Home With Spawn = ON`.

Dragging the Wildkin with this enabled moves spawn + home by the same delta.

If disabled, dragging changes spawn only.

Editing Home X/Z explicitly changes home without moving spawn.

### Scene visualization

While a Wildkin is selected in EDIT:

- show a readable author-only Home marker,
- show a line from spawn → home when they differ,
- preferably show roam/home radius as a subtle author-only ring if trivial,
- Home marker is not shown in normal Play.

Preferred: allow the Home marker itself to be clicked/dragged to reposition home. If implementing a separate draggable marker would substantially complicate the slice, numeric Home X/Z + visible marker is sufficient; document that limitation.

No new creature gameplay behavior is required.

---

## 8. Fix Reset Draft From Repo semantics

Canonical repository data and effective Author draft must remain distinct.

Current startup can use persisted localStorage draft as the effective runtime world, but Author Mode's **repo seed must still be the canonical generated `WORLD_DATA`**, not the already-overridden effective draft.

Required conceptual separation:

```text
canonicalWorldData = WORLD_DATA from repo/generated source
persistedAuthorDraft = localStorage only when ?author=1
runtimeEffectiveWorldData = persistedAuthorDraft ?? canonicalWorldData
```

Pass both roles deliberately where needed.

### Reset behavior

`Reset Draft From Repo` must:

1. clear persisted author draft/counter/transient author state,
2. restore a deep clone of canonical repository world,
3. reload Author Mode using canonical world,
4. show no prior local edits,
5. not immediately re-save the old effective draft,
6. remain deterministic across another reload.

A confirmation dialog is fine.

Add an automated test for the exact regression: persisted draft differs from repo → reset → subsequent reload uses repo values.

---

## 9. Minimal hierarchy

Add a compact hierarchy to make selection/navigation practical.

This is not a Unity hierarchy clone.

### Structure

Use:

```text
Region
  Props
  Traversal
  Resources
  Wildkin
  Anchors
  POIs
```

Examples:

```text
Camp
  Props
    prop_camp_dropPod
    fence_camp_west
  Resources
    tree_camp_01
  Anchors
    wp_camp_gate

Forest Edge
  Wildkin
    rusher_p1_skittish
  POIs
    poi_p1_chest
```

### Required behavior

- generated from the current mutable draft,
- updates after place/duplicate/delete/region move,
- click object row → select the same scene object/inspector,
- selected row highlighted,
- collapsing region/categories supported via native `<details>` or similarly simple UI,
- provide a small text filter/search if trivial; otherwise omit,
- double-click row or a small Focus button should center/pan the editor camera to the object's X/Z if straightforward.

At minimum, single-click hierarchy selection is required. Camera focus is strongly preferred but may be omitted only if it risks destabilizing editor camera behavior.

Do not add multi-select/reparent drag/drop/prefabs.

---

## 10. Live preview architecture cleanup

Phase 3.5B.1 added ad-hoc object-type preview syncing. This slice should make the preview reliable enough that supported inspector changes are visible immediately.

Do not rewrite the editor unnecessarily, but remove obvious partial paths.

Required across supported authorable families:

- X/Z movement previews,
- Y elevation previews where exposed,
- RotY previews where exposed,
- W/D/Height previews where exposed,
- duplicate/place/delete previews,
- selection highlight/pick proxy updates after resizing,
- hierarchy updates after mutations.

PLAY may still reload to rebuild authoritative gameplay/Rapier state; hot physics editing is not required.

---

## 11. Cross-type validation matrix

Before declaring completion, test the shared contracts across representative types, not only the reported fence.

### Solid transform representatives

Test at minimum:

- `fence` — move, rotate, elevate, Width/Depth/Height,
- generic `box` — move, rotate, elevate, Width/Depth/Height,
- `forestBoundary` — move/rotate/size if those controls are exposed,
- one `platform` or `obstacle` — move/elevate/size according to supported contract.

For each supported transform:

```text
EDIT preview
→ PLAY visual
→ Rapier/player collision
```

must agree.

### Non-solid/gameplay representatives

- tree placement/move/duplicate → harvestability preserved,
- Wildkin selection/move → home behavior matches checkbox/fields,
- Waypoint/Beacon move → persists,
- POI selection → persists,
- hierarchy selection works for all categories.

The agent should proactively inspect sibling object families using the same code path and add focused tests where a regression would otherwise remain invisible.

---

## 12. Automated tests

Preserve all existing tests.

Add focused tests for:

### Input ownership

- explicit disable prevents joystick start,
- explicit disable prevents right-side attack/swipe gesture start,
- disabling clears active joystick/swipe/held attack state,
- re-enable restores normal input,
- no dependence on `window.__author` global shape for correctness.

### Transform parity

- rotated blocking prop runtime collider receives same Y rotation as visual transform,
- elevated blocking prop collider center includes baseY,
- elevated platform/obstacle collision includes baseY if exposed,
- W/D/Height mappings produce matching render/collider dimensions,
- rotated footprint metadata/steering representation is not stale where used.

If Rapier integration tests are practical, inspect collider translation/rotation/half-extents directly. Otherwise test the normalized collider descriptors/helpers before world construction plus existing gameplay regression coverage.

### Dimensions / preview

- prop Height edits `size.h`, not an unused parallel field,
- live preview resize path updates geometry/scale metadata,
- preview dimensions match builder dimensions after reload,
- pick/highlight proxy remains selectable after resize.

### Wildkin home

- move with checkbox ON applies equal spawn/home delta,
- checkbox OFF leaves home unchanged,
- explicit Home X/Z edit persists,
- home marker reflects authored home.

### Reset

- canonical world and effective draft are distinct,
- reset with a differing persisted draft restores canonical values after reload/re-init,
- reset does not immediately resurrect the old draft.

### Hierarchy

- hierarchy reflects current draft categories/regions,
- placed/duplicated/deleted object appears/disappears,
- hierarchy selection selects correct ID,
- moving object to another region updates hierarchy ownership.

### Existing guarantees

- one authoritative repo world source,
- deterministic export/world stale guard,
- one rAF,
- fixed-step gameplay,
- Rapier only,
- offline/<35MB/portrait normal play,
- region activation and accepted gameplay regressions.

---

## 13. Human acceptance test — final response must be short

Do not give the human a giant coordinate checklist.

Give these concrete tests with exact controls:

### Test 1 — Whole canvas belongs to Edit
1. Open `?author=1`, enter EDIT.
2. Click/select objects in lower-left, center, and right side of game viewport.
3. Expected: no joystick appears and no attack/swipe zone steals the click.
4. Switch PLAY and verify joystick/right-side controls work normally again.

### Test 2 — Transform parity
1. Select a Camp fence.
2. Rotate it ~45°, raise it visibly, and resize Width/Depth/Height.
3. Expected in EDIT: mesh changes immediately.
4. PLAY: walk into/under/around it.
5. Expected: collision matches its exact visible rotation, elevation, and dimensions.

Repeat quickly with a generic Box. Do one supported Y/size edit on a platform/obstacle.

### Test 3 — Live resize
1. Place a Box from Palette.
2. Change Width, Depth, Height substantially.
3. Expected: box resizes immediately in EDIT.
4. PLAY: visual + collision dimensions remain identical.

### Test 4 — Wildkin home
1. Select a Wildkin.
2. Confirm Home marker/fields are visible.
3. Drag Wildkin with `Move Home With Spawn` ON; home should follow.
4. Turn it OFF and move Wildkin again; home should stay.
5. PLAY: creature roams/leashes around the authored home as expected.

### Test 5 — Reset
1. Make one obvious draft edit.
2. Click Reset Draft From Repo and confirm.
3. Expected after reload: that local edit is gone and canonical repo layout is restored.

### Test 6 — Hierarchy
1. Use hierarchy to select a fence, resource, Wildkin, Waypoint, and POI.
2. Place or duplicate an object; hierarchy updates.
3. Delete it; hierarchy updates again.
4. Expected: hierarchy gives reliable access even when scene raycast selection is awkward.

### Test 7 — Regression
1. Direct-place and move a harvest node; PLAY and harvest it.
2. Move Beacon/Waypoint and confirm persistence.
3. Walk the rough Camp → p1 → p2 → p3 → p4 route once.
4. Validate + Export once.

Then ask only:

> **Does Author Mode now feel trustworthy and fast enough to shape the real Area 1 visually?**

A human **yes** is required to close 3.5B.2 / Author Mode work.

---

## 14. Completion gate

Phase 3.5B.2 is complete only when:

- Edit owns the full viewport and no gameplay pointer zone intercepts authoring,
- supported solid transforms have Edit visual == Play visual == Rapier collision parity,
- dimensions use coherent human-facing Width/Depth/Height semantics,
- resize previews live,
- no exposed transform field writes data ignored by runtime,
- Wildkin home/spawn relationship is visible/editable and default-follow behavior is clear,
- Reset Draft From Repo truly restores canonical repo data,
- minimal hierarchy works and stays synchronized with draft mutations,
- consistency sweep covers sibling object types sharing each fixed path,
- automated tests pass,
- `npm run verify` passes,
- `npm run zip` passes,
- one rAF/fixed-step/Rapier/offline/portrait constraints remain intact,
- human acceptance is yes.

Then stop Author Mode work and prepare for **Phase 4 in a fresh session**.

**Do not begin Phase 4 in this session.**

---

## 15. Final agent response requirements

Final response must include:

1. concise implementation summary,
2. a short **Consistency Sweep** section stating which sibling object families were checked when shared contracts changed,
3. test/verify/zip result counts,
4. only the short 7-test human checklist above (adapt exact button labels if needed),
5. explicit stop before Phase 4.

Do not claim “human accepted” before the human answers the final question.
