# Wildkin Frontier — Phase 3.5B.1: Author Mode Usability & Transform Correctness

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.5B.1  
**Purpose:** Human-accept Phase 3.5B by making Author Mode visually direct, predictable, and trustworthy enough to shape Area 1 without coordinate-driven trial-and-error.

This is a **focused polish/fix slice**. Phase 3.5B architecture, single-source world pipeline, rough Camp/Area 1 skeleton, and normal gameplay are accepted as the baseline. Do not begin Phase 4 gameplay.

---

## 1. Why this refinement exists

Automated 3.5B gates passed, but human authoring exposed usability/correctness gaps that violate the main 3.5B acceptance question:

> **Can a human rapidly shape and replay the first directed expedition without asking an agent to change coordinates?**

Current human answer: **not yet**.

Observed in human testing:

- Right-mouse editor panning works, but vertical mouse direction feels backwards and must be inverted.
- Selecting an object and nudging/editing it moves only the yellow selection marker/line in Edit; the actual object does not visibly move until PLAY/reload.
- Palette placement is not direct scene placement; objects appear at region center and then require numeric/nudge relocation.
- Normal gameplay joystick/HUD still occupies/captures part of the canvas in Edit, making scene selection unreliable in the lower-left and creating heavy UI overlap.
- Resources/creatures outside the player-centered active region are hidden even when the editor camera is looking at those areas.
- Fog is undesirable in Edit mode and makes the top-down author view harder to read.
- Generic Y controls are misleading/incomplete. Some object classes do not actually render/collide at their authored Y.
- Wildkin could not be reliably selected in the scene.
- Ladder movement works, but ladder rotation is stored without visibly/physically changing orientation.
- Waypoint and Beacon movement worked.
- Resource duplication + movement worked and the duplicate remained harvestable.
- Full rough route was walkable with no unusual gameplay regression.
- Export produced valid world data.

Do not treat passing automated tests as proof that this editor is human-accepted. This slice exists specifically to close those human gaps.

---

## 2. Hard scope

Implement only:

1. live visual preview of author transforms,
2. direct click-to-place + drag-to-move workflow,
3. reliable scene selection for every currently authorable object type,
4. author/game input and HUD separation,
5. camera-centered editor visibility activation,
6. editor camera/fog usability fixes,
7. transform-schema/runtime correctness for Y and supported rotation,
8. concise author UI cleanup,
9. focused automated tests + human-readable final test instructions,
10. docs/Build Log updates.

Do **not** implement:

- Phase 4 map/gate-start/extraction/banking/result-card gameplay,
- bonding/capture/companions/mounts,
- skill tree/equipment/base expansion,
- final Camp/Area 1 art or balance,
- a general transform-gizmo library,
- full undo/redo/history,
- asset browser,
- procedural generation,
- A*/navmesh,
- mobile Author Mode,
- a second physics/editor simulation,
- new external runtime dependencies.

Do not redesign the Area 1 skeleton merely because the current rough Camp is visually crowded. This pass should make it **easy for the human to redesign it afterward**.

---

## 3. Preserve the accepted 3.5B foundation

Preserve:

- `src/world/data/world.json` as the one manually maintained authored source,
- deterministic generated runtime world + stale guard,
- normalized validation path,
- data-driven static world/traversal builder,
- `ExpeditionSession`,
- player-centered region activation during Play,
- one `requestAnimationFrame`,
- fixed 1/60 gameplay update,
- Rapier as sole gameplay physics runtime,
- existing movement/traversal/harvesting/combat/ecology behavior,
- bounded pools,
- portrait normal gameplay,
- offline/no-CDN submission build,
- current rough Camp + Area 1 data unless a change is strictly required to fix editor/runtime transform semantics.

The user-exported test world is **evidence of editor behavior, not the new canonical level layout**. Do not replace repo `world.json` wholesale with the human test export.

---

## 4. Live visual preview is mandatory

The current editor mutates the draft and selection marker, but many scene objects remain at their old runtime transform until PLAY/reload.

That is not acceptable for authoring.

### Required behavior

While in EDIT:

- changing X/Z/Y/rotation/size fields immediately changes the visible selected object,
- clicking any nudge button immediately changes the visible object,
- keyboard nudge immediately changes the visible object,
- dragging immediately moves the visible object under the cursor,
- duplicate/place/delete immediately appears/disappears in the editor view,
- selection highlight follows the real visible preview object,
- the inspector values and visible preview remain synchronized.

PLAY/reload may still be used to rebuild authoritative gameplay physics/systems before actual playtesting.

### Architecture guardrail

Use the simplest robust preview strategy.

Allowed examples:

- update existing authored scene nodes by stable author IDs,
- rebuild a lightweight editor visual layer from the draft,
- rebuild affected visual world sections while gameplay is paused.

Do **not** create a second live gameplay/physics simulation merely for editing.

The editor preview is visual authoring state; PLAY remains the authoritative gameplay validation.

---

## 5. Direct placement and movement

Numeric fields remain useful for precision, but they must not be the primary workflow.

### Palette placement

Change palette behavior to:

```text
click Palette item
→ cursor enters PLACE mode / obvious ghost or placement state
→ click world ground where object should go
→ object is created there, assigned to the containing region
→ object becomes selected
```

Requirements:

- placement position comes from the world click, not region center,
- containing region should be resolved from the click X/Z when possible,
- Escape/right-click cancels placement without creating an object,
- status text clearly says what is being placed,
- no gameplay attack/joystick action fires from placement clicks.

A full translucent ghost mesh is welcome but not required if a clear cursor/marker + click placement is simpler.

### Drag movement

For a selected object in EDIT:

```text
left-drag selected object
→ project pointer to editor ground/work plane
→ update X/Z continuously
→ visible object follows pointer in real time
→ draft persists on release / during drag as appropriate
```

Keep Y as explicit nudge/numeric control for this slice. No 3-axis gizmo dependency is required.

Dragging must not accidentally pan the camera or trigger gameplay controls.

---

## 6. Reliable selection for all authorable types

Direct scene selection must work consistently for:

- props/fences/gates/boundaries/drop pod/Resonator,
- platforms/obstacles/ladders,
- trees/rocks/fiber,
- Rusher/Spitter Wildkin,
- Major Waypoints,
- Extraction Beacons,
- POIs.

Do not rely mainly on “nearest authored object to arbitrary hit point” fallback.

Preferred direction:

- assign stable author object IDs through `userData` / parent groups when objects are created,
- raycast to the actual visual or a small **author-only pick proxy**,
- pick proxies must be invisible/disabled in normal Play.

Wildkin and resources should be at least as easy to select as static props.

Selection must work throughout the visible editor viewport, including the lower-left once gameplay controls are suppressed.

---

## 7. Author Mode owns the canvas while editing

When EDIT is active, hide or disable normal gameplay UI/input that competes with editing.

At minimum hide/suppress:

- virtual joystick/touch movement surface,
- gameplay tap/swipe action capture,
- Auto Harvest control,
- normal health/XP/inventory HUD if it overlaps/obscures authoring,
- normal debug/help overlays that are not needed for authoring.

Keep only concise author-relevant information such as:

- editor mode,
- selected ID/type,
- region/pocket overlays,
- validation/status.

When PLAY is activated, restore the normal game HUD/input exactly as before.

Normal `/` mode without `?author=1` must remain unchanged.

Do not solve this by globally deleting or redesigning gameplay HUD components; use author-mode visibility/input ownership.

---

## 8. Editor camera usability

### Vertical pan

Invert the current vertical component of right-mouse/author camera panning to match human expectation.

Human acceptance is simple: the new vertical drag direction should feel opposite to current 3.5B behavior.

### Fog

While EDIT is active:

- disable scene fog (or set an effectively infinite author range),
- restore the exact previous fog when returning to PLAY.

Do not remove fog from normal gameplay in this slice.

### Occluding boundaries

Tall `forestBoundary` placeholders can obscure the top-down editor view.

In EDIT only, make large boundary/occluder props easier to work around using a simple editor presentation such as:

- reduced opacity,
- wireframe/outline,
- or another clearly readable non-occluding author visualization.

Restore normal Play appearance afterward.

Do not redesign the actual forest art here.

---

## 9. Camera-centered editor visibility / region activation

Current resource/creature visibility is player-centered. In Edit mode this means the editor camera can look at a region whose nodes/Wildkin remain hidden because the player is elsewhere.

Fix this.

### Required author behavior

While EDIT:

- determine an editor focus X/Z from the top-down camera/look target,
- resolve the focus region using the existing world registry,
- make current editor-focus region + appropriate immediate neighbors visible for authoring,
- as the editor camera pans across the world, author-visible regions update,
- AI/gameplay remains paused; this is a visibility/authoring concern, not simulation.

Do not mutate persistent expedition progress merely because the editor camera moved.

When switching back to PLAY:

- restore player-centered region activation immediately,
- no duplicate creatures/resources/colliders,
- no stale author activation remains.

If the simplest safe implementation uses all regions visible in Edit for the current tiny world, that may be used temporarily **only if** it is architected so future author visibility can remain bounded. Preferred behavior is editor-focus + neighbors as above.

---

## 10. Fix the transform contract instead of exposing fake controls

The inspector currently presents generic Y/rotation controls for object types whose runtime builder does not consistently consume those values.

That is misleading.

Create/document a clear per-type transform contract and make the inspector show only controls that actually work.

### Common authored position objects

For props, resources, creatures, Waypoints, Beacons, and POIs:

- authored `pos.y` must visibly affect vertical placement where vertical placement is meaningful,
- PLAY rebuild must reproduce the same visible Y,
- collision/query behavior must match the intended rendered placement where the object is solid/interactable.

Static prop builder currently places many meshes at ground-derived Y regardless of `pos.y`; correct that.

### Platforms / obstacles

Add or normalize a base/elevation Y field if these are exposed as vertically movable.

Required if Y controls remain enabled:

```text
visual base/top
== authored elevation + dimensions
== Rapier collider base/top
```

No “mesh moved but old collider stayed” or “field changes but runtime ignores it.”

If a class cannot safely support Y in this slice, disable/hide that control for that class rather than pretending it works.

### Climbable / ladder

Human export demonstrated ladder rotation data can be written while current renderer/traversal ignores it.

Choose one of two acceptable solutions:

**A. Fully support ladder rotation**
- visible ladder/rungs rotate,
- approach/wall orientation and climb behavior remain coherent,
- PLAY reproduces the authored orientation,
- related derived traversal data cannot silently remain at old orientation.

**or B. Explicitly mark ladder rotation unsupported for now**
- hide/disable RotY for climbables,
- do not write meaningless rotation values,
- UI explains that ladder orientation is fixed in this prototype.

Do not leave a working-looking RotY field that has no effect.

For ladder vertical movement, define Y as a coherent shift of `bottomY/topY` and visual/climb placement, or hide/disable generic Y for ladders. Again: no fake control.

### Home position when moving a creature

Dragging/moving a creature spawn should have an explicit rule:

- default editor move should move both `pos` and `homePos` together unless the human explicitly edits home separately,
- existing roam/leash semantics remain intact.

Do not leave a moved creature tethered to an accidental old home without making that intentional and visible.

---

## 11. Compact author UI cleanup

Do not redesign the whole editor, but reduce noise.

Recommended minimum:

- make current mode unambiguous (`EDITING` vs `PLAY TEST`, or equivalent),
- collapse Palette / Selected / Region sections or otherwise avoid showing every form at once,
- show type-specific transform/property fields only when supported,
- keep Validate + Export accessible,
- remove obsolete hint text such as “Palette places at region center” after direct placement exists,
- keep status/error text human-readable.

The editor panel may remain desktop-only and scrollable.

---

## 12. Automated tests

Preserve all existing tests.

Add focused coverage for the new author contract.

### Draft / transforms

- X/Z nudge changes draft,
- Y changes a supported object's authored data and runtime-builder output,
- unsupported transform controls are not falsely exposed/written,
- creature movement keeps home position coherent by default,
- duplicate/delete remain unique/correct.

### Static builder / collision

- elevated solid prop visual and collision share the same intended vertical placement,
- elevated platform/obstacle visual and collision agree if those support Y,
- supported RotY is consumed by the corresponding visual/runtime path,
- climbable rotation either works coherently or is explicitly unsupported and not exported as a fake edit.

### Selection / placement model

- all required authorable types expose stable author IDs/pick metadata,
- placement at a supplied world position creates object at that position and correct containing region,
- cancel placement creates nothing.

### Mode isolation

- Edit hides/suppresses gameplay input/HUD ownership,
- Play restores it,
- Edit disables fog and Play restores it,
- editor visibility follows editor focus rather than stale player region,
- switching back to Play restores player-centered activation,
- no second rAF.

### Existing guarantees

- one authoritative world source,
- deterministic export,
- world stale guard,
- normal mode ignores author draft/UI,
- single rAF/fixed-step/Rapier/offline/portrait constraints,
- all prior movement/harvest/combat/ecology/region tests.

---

## 13. Human acceptance test — write the final response like this

The final response must be concise and written for a human tester. Do **not** return a long internal coordinate/debug checklist like the 3.5B response.

Give the user approximately these tests, with exact controls:

### Test 1 — Basic editing feel
1. Open `?author=1` and enter EDIT.
2. Confirm joystick/game HUD disappears and fog is gone.
3. Right-drag camera vertically and confirm direction is opposite the old build.
4. Pan from Camp toward a distant pocket and confirm its resources/Wildkin become visible even though the player stayed at Camp.

### Test 2 — Select and drag
1. Click a fence/tree/platform/Waypoint.
2. Drag it several units.
3. Expected: the **actual visible object moves while dragging**, not only the yellow marker.
4. Press PLAY and confirm it remains there; solid objects collide at the new position.

### Test 3 — Place
1. Click Tree (or Box) in Palette.
2. Click an obvious empty spot in the world.
3. Expected: it appears exactly there immediately and becomes selected.
4. PLAY: tree is harvestable / box collision matches.

### Test 4 — Wildkin
1. Click a Wildkin directly.
2. Drag it somewhere obvious.
3. Expected: it is selectable and moves visibly; its home follows by default.
4. PLAY: exactly one Wildkin appears there and behaves normally.

### Test 5 — Y and rotation
1. Raise a supported box/platform using Y control and rotate a fence/box.
2. Expected: visible preview changes immediately.
3. PLAY: visible and physical placement still matches.
4. For ladder, test the implemented contract: either rotation now works end-to-end or the rotation control is clearly unavailable; same for vertical shift.

### Test 6 — Existing workflow
1. Duplicate a harvest node and PLAY; both should harvest correctly.
2. Move a Beacon and Waypoint; PLAY confirms locations.
3. Walk the rough route once; no new collision/streaming regression.
4. Export/Validate once; export remains valid/deterministic.

The response should explicitly ask the human whether **editing now feels fast enough to shape Area 1 visually**. That subjective answer is part of the completion gate.

---

## 14. Completion gate

Phase 3.5B.1 is complete only when:

- actual selected objects update visually in real time during author edits,
- direct scene placement works,
- selected objects can be dragged in X/Z,
- Wildkin/resources/static props/anchors are reliably selectable,
- gameplay joystick/action HUD no longer competes with Edit,
- editor camera vertical pan is inverted from the old behavior,
- fog is disabled only during Edit,
- editor visibility follows editor camera/focus rather than player position,
- tall authoring boundaries no longer heavily occlude the Edit view,
- Y controls work end-to-end for every class where they are exposed,
- ladder rotation/Y either works coherently or the unsupported controls are explicitly removed/disabled,
- Play rebuild reproduces the authored visual transform and matching collision for solid objects,
- creature move/home behavior is coherent,
- duplicate resource remains harvestable,
- Waypoint/Beacon editing still works,
- full rough route still walks cleanly,
- export/validate remains correct,
- prior automated tests pass,
- new focused tests pass,
- `npm run verify` passes,
- `npm run zip` passes,
- one rAF / fixed step / Rapier / offline / portrait constraints remain intact,
- **human tester says Author Mode is now practically usable for visually shaping Area 1.**

Then stop.

**Do not start Phase 4 in this session.**
