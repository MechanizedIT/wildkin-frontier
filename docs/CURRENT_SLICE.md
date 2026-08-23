# Wildkin Frontier — Phase 4A.2: Pre-4B Authoring Reliability & Expedition Interaction Closure

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A.2  
**Purpose:** Close the remaining systemic authoring, input, spawn, persistence, guidance, and frontier-interaction defects discovered by human playtesting and a read-only GPT-5.6 Sol audit so Phase 4B can focus on designing the actual first expedition instead of fighting tools or lifecycle bugs.

Phase 4A/4A.1 are **implementation-complete but not yet fully human-accepted**. Their useful architecture remains the base: `ExpeditionSession`, `frontierProgress`, single-source `world.json`, region activation, Author Mode, Map, banking/results, movement/harvest/combat/ecology, one-rAF/fixed-step/Rapier/offline guarantees.

This slice is the **last planned pre-4B infrastructure/hardening pass**. When it is human-accepted, stop editor/system work and begin Phase 4B content/pacing authoring unless a true blocker appears.

---

# 1. Required end state

At the end of Phase 4A.2:

## Authoring

A human can reshape Camp and Area 1 without hidden legacy arena assumptions or Edit/Play disagreement:

```text
select/place object
→ edit/drag/shortcut
→ candidate validates
→ canonical draft commits
→ Edit preview updates truthfully
→ Play rebuild uses same authored descriptor
→ Rapier matches
→ export/reload reproduces same result
```

The editor can move beyond the original arena rectangle, preserve hierarchy state, undo/redo accidental changes, visually author Camp/Waypoint player spawns, and reliably edit Ground/Boundary/static presentation.

## Expedition interaction

The frontier no longer interrupts movement with automatic extraction modals:

```text
new Waypoint/Beacon entered
→ discovery persists once
→ brief pulse + sound + readable activation toast
→ contextual EXTRACT action available while nearby
→ walking away naturally means Keep Going
```

Camp gate becomes a readable physical threshold:

```text
Camp side: approach closed gate → START EXPEDITION → Map/start selection
active run frontier side: approach gate → RETURN & SECURE
```

## Core reliability

- one physical desktop click = one Field Tool swing,
- player starts resolve to authored, validated spawn transforms,
- edge indicators use actual camera projection,
- run banking uses a unique run identity rather than cargo values,
- run depth resets between runs,
- upper-left HUD does not overlap.

Core acceptance question:

> **Can the human now author the first real expedition quickly and trust that what Edit shows is what Play will do, while the Camp/Waypoint/Beacon flow feels nonblocking and intentional?**

---

# 2. Source findings this slice must close

Human playtesting and audit identified these systemic issues:

- Ground Patch move/resize is not reliably live in Edit.
- Dragging remains hard-clamped to the original `~25×23` playground rectangle.
- Author Mode spatial ownership can consult the immutable startup registry instead of the current draft.
- Ground/Boundary/static preview logic is parallel to runtime construction rather than sharing one canonical descriptor path.
- presentation reset/proxy creation is inconsistent across object creation and property transitions.
- current draft mutation can persist invalid edits before validation.
- region overlap/gap/ownership/traversal validation is incomplete.
- `spawnOffset` is an unsafe authoring abstraction; Forest Edge can resolve back inside Camp.
- authored run spawn Y/facing are not represented/applied coherently.
- desktop mouse can be interpreted by desktop and touch adapters, causing two swings.
- Auto Harvest and inventory independently occupy upper-left UI space.
- frontier indicator vertical direction is wrong because it assumes world X/Z → screen X/Y instead of projecting through the camera.
- run banking idempotence can reject a legitimate later run with identical cargo/XP.
- max-depth/session reset can leak previous-run state.
- hierarchy refresh loses expanded/collapsed state.
- keyboard author commands are incomplete and can conflict with focused inspector inputs.
- there is no small undo/redo safety net.
- proximity discovery and extraction action are conflated into blocking dialogs.
- first activation of Waypoints/Beacons lacks meaningful presentation.
- gate collider capability and some generic presentation/collision controls do not accurately describe runtime support.

Do not patch these as isolated examples. Close the shared contracts that produce them.

---

# 3. Hard scope

Implement only the following:

1. transactional/validated Author draft commits,
2. canonical shared static-object descriptor path for Edit/runtime/Rapier,
3. Ground Patch + Boundary Collider live transform/presentation/proxy parity,
4. one coherent Y/base transform convention for rectangular static objects,
5. draft-derived spatial queries/world extents and removal of legacy drag/editor bounds,
6. region/ownership/neighbor/transform validation closure needed for current Area 1 authoring,
7. explicit Camp spawn and per-Major-Waypoint run spawn transforms with position + facing,
8. visual spawn markers and editor controls,
9. hierarchy expansion-state preservation,
10. focused Author keyboard shortcuts,
11. bounded Author undo/redo snapshot history,
12. desktop-vs-touch input ownership fix,
13. shared upper-left HUD layout,
14. camera-projected frontier edge indicators,
15. unique run identity/idempotent banking,
16. correct per-run depth/session reset,
17. nonblocking Waypoint/Beacon discovery + contextual extraction interaction,
18. physical/contextual Camp gate start/return interaction,
19. one-shot first-activation visual/audio/name feedback,
20. focused migration/tests/docs/Build Log updates.

---

# 4. Explicit non-goals

Do **not** implement:

- Phase 4B Camp/Area 1 final layout or encounter pacing,
- resource/danger/reward rebalance,
- Matter Resonator progression/spend,
- Wildkin bonding/capture/companions/mounts,
- second area/final endpoint,
- resize handles/generic transform gizmos,
- multi-select,
- prefab system,
- arbitrary polygon regions,
- region CRUD unless absolutely required to preserve current data,
- terrain sculpting/heightmaps/painting,
- static-world streaming/async assets,
- generic material/physics-layer editor,
- mobile Author Mode,
- new runtime dependencies,
- broad visual/art polish.

Do not turn Author Mode into Unity/Godot. The target is a trustworthy lightweight tool for the current five-region directed frontier.

---

# 5. Change Closure / Consistency Sweep

Permanent `AGENTS.md` Change Closure rules apply.

For every shared contract touched, trace sibling families and the complete path instead of patching the reported example.

## Authoring contract

```text
Author input/UI
→ candidate mutation
→ normalize/validate candidate
→ atomic commit
→ persistence/history
→ Edit preview descriptor
→ runtime/static descriptor
→ Rapier descriptor
→ Play rebuild
→ export/reset
→ tests
```

## Spawn contract

```text
world.json spawn transform
→ validator
→ Author marker/inspector
→ registry resolver
→ beginExpedition/resetToCamp
→ player X/Y/Z/facing
→ region ownership + ground/collider clearance
```

## Frontier interaction contract

```text
proximity
→ first discovery event
→ persistent save
→ activation feedback
→ nearby contextual action
→ extraction/start/return lifecycle
→ Map/indicators/results
```

## Input contract

```text
mouse / touch / pen / keyboard
→ exactly one owning adapter
→ unified intent
→ Field Tool / dodge / contextual interaction
```

## Persistence contract

```text
begin run with unique runId
→ temporary run state
→ resolution
→ bank once by run identity
→ repeated identical-value runs still bank
→ replayed same run resolution does not bank twice
```

---

# AUTHOR MODE RELIABILITY CLOSURE

# 6. Transactional author mutations

Current raw-draft mutation must not leave invalid persisted state behind.

Create a focused mutation/commit API in `authorDraft` or equivalent.

Preferred semantics:

```text
begin with canonical current draft
→ clone/minimal candidate
→ apply requested mutation
→ normalize + validate affected candidate/world
→ if valid: commit atomically + persist + history entry
→ if invalid: authoritative draft remains unchanged; show readable error
```

Requirements:

- invalid inspector edit does not persist,
- invalid drag/place/region change does not corrupt canonical draft,
- Play transition validates before leaving Edit/reloading,
- invalid persisted old draft must have a recoverable path (fall back/reject with clear Author error rather than crashing before UI can recover),
- export operates on already-valid canonical draft,
- Reset Draft From Repo remains authoritative and clears incompatible undo history.

Do not build a generalized command framework. A small explicit mutation API is enough.

---

# 7. Canonical static descriptor path

Stop maintaining a parallel incomplete representation for Edit preview.

Introduce one small shared normalized static descriptor/helper layer used by both Author preview and runtime/static construction.

For every supported rectangular static object, descriptor should resolve equivalent concepts such as:

```text
id
family/subtype
position / center/base convention
rotationY
size { width, height, depth }
visibleInPlay
collisionEnabled
opacity
tint/default color
editor proxy needs
region ownership
```

Exact API/file names are implementation choice, but both paths must consume the same interpretation:

- Author Edit preview,
- `staticWorldBuilder`,
- `createPhysicsWorld` / Rapier collider descriptors.

Do not duplicate transform math in three modules when one descriptor can define it.

### Required sibling sweep

At minimum verify:

- Box,
- Fence,
- Forest Boundary,
- Gate where capability allows,
- Resonator / Drop Pod where applicable,
- Ground Patch,
- Boundary Collider,
- Water / Island visual-only behavior where applicable,
- Platform / traversal path if it shares the same dimensions/Y semantics.

If a family intentionally does not support a property, hide/disable that control rather than storing ignored data.

---

# 8. One transform convention

Rectangular static authored objects must have one human-readable Y convention.

Preferred rule:

> `pos.y` / authored Y is the **base/bottom elevation** for ordinary rectangular solids/surfaces; runtime visual center and Rapier center are derived from base + height/2.

If Boundary Colliders currently use center Y, migrate them to the same convention rather than keeping a special invisible rule.

Requirements:

- Edit inspector meaning matches runtime,
- placement respects authored/default Y instead of forcing every new object to the editor plane,
- Ground Patch/Boundary/Box/Fence elevation and size reproduce identically after Play reload,
- validator checks finite values and positive dimensions.

---

# 9. Ground / Boundary / presentation live parity

Ground Patch and Boundary Collider must be first-class Author objects, not special data that only becomes truthful after Play.

While in Edit:

- drag updates visible Ground/Boundary immediately,
- numeric X/Y/Z changes update immediately,
- width/depth/height changes update immediately,
- rotation updates immediately when supported,
- opacity `1 → 0.4 → 1` restores correctly,
- tint add/change/remove restores subtype/default color correctly,
- `visibleInPlay=false + collisionEnabled=true` immediately shows an obvious Edit-only proxy,
- newly placed hidden Boundary shows proxy immediately without requiring Play/reload,
- toggling visibility/collision immediately updates the Author representation/proxy state,
- selection/focus remains possible even when normal Play visual is hidden.

Edit does **not** need to rebuild Rapier continuously. The requirement is truthful visual/collider proxy preview and exact Rapier rebuild when entering Play.

---

# 10. Static capability matrix

Do not expose generic toggles that lie.

Create a small explicit capability definition/helper for object families/subtypes, e.g. whether each supports:

- collision,
- visibleInPlay,
- opacity,
- tint,
- rotation,
- elevation,
- dimensions.

Examples:

- a collider-capable Gate must actually create/remove collision when enabled/disabled,
- if Water is intentionally non-colliding, do not show a misleading Collision checkbox unless water collision is truly implemented,
- resources/Wildkin do not receive generic static collision controls.

The Author inspector derives controls from capabilities rather than broad type assumptions.

---

# 11. Draft-derived spatial model and unbounded editor movement

Remove the hard-coded old playground drag clamp (`~±12.x/±11.x`) and any equivalent old editor framing assumptions that prevent growth.

Author placement/dragging may extend beyond current regions. Invalid positions should be represented clearly and rejected on commit/Play—not silently clamped to legacy bounds.

Create current-draft spatial helpers, separate strict validation from convenience lookup:

```text
findContainingRegion(position) → strict nullable; ambiguous overlap is error
findNearestRegion(position) → hint/camera only
getWorldExtents() → derived from current regions + authored geometry
getIntersectingRegions(footprint) → Ground/Boundary ownership validation
```

Do not use the immutable startup `worldRegistry` as authority for draft positions after region/object edits.

### Region ownership

For current prototype:

- point-owned families (resources, creatures/spawns, anchors, most props) must resolve to exactly one declared region,
- moving a point-owned object across a region boundary should deterministically rehome it on commit or clearly require/select owner; choose one consistent behavior and document it,
- Ground/Boundary footprints may cross neighboring edges but must intersect their declared owner; warn/reject obviously unrelated ownership,
- region overlap ambiguity is invalid,
- neighbor references must exist and be reciprocal where the current activation design requires reciprocity,
- validation must not use `nearest region` as proof of valid ownership.

### Region/world extents

Editor camera framing/panning should derive from authored extents with generous padding rather than original arena constants.

Do not add a new movement clamp to replace the old one.

---

# 12. Validation closure for current object families

Strengthen only validation required to trust current Area 1 authoring.

Required checks include:

- region IDs unique,
- region bounds finite and min < max,
- no ambiguous overlapping region interiors,
- neighbor references valid; reciprocal where required,
- point-owned object center belongs to declared region,
- static transforms finite,
- dimensions positive,
- traversal transforms finite and sizes valid,
- Ground/Boundary ownership/intersection coherent,
- spawn transforms supported/clear/owned (Section 13),
- duplicate IDs across all authorable collections rejected,
- displayName/presentation values remain valid.

Do not add polygon geometry algorithms or generalized world topology beyond what this rectangular directed prototype needs.

---

# 13. Explicit Camp and Waypoint spawn transforms

Replace ambiguous `spawnOffset` as the canonical authoring model.

Use explicit spawn transforms approximately:

```js
camp.playerSpawn = {
  position: { x, y, z },
  facingYaw: 0
}

majorWaypoint.runSpawn = {
  position: { x, y, z },
  facingYaw: 0
}
```

Exact schema names may differ, but canonical data must represent absolute position + facing.

Migration may temporarily read old `spawnOffset`, but exported/current canonical `world.json` should use the explicit transform after this slice.

### Runtime requirements

When starting/resetting:

- use authored X/Y/Z,
- use authored facingYaw,
- do not silently replace Y with a fixed value except for the correct capsule center calculation derived from authored ground/support,
- Forest Edge start must resolve visibly inside Forest Edge,
- Threshold Rise and future Major Waypoints use the same generic path.

### Validation requirements

For every Camp/Waypoint spawn:

- finite position/facing,
- strict containment in intended declared region,
- supported by authored Ground/Platform/traversable surface,
- player capsule has clearance from blocking static objects/boundaries/gate,
- not accidentally inside another blocking interaction/collider state,
- no ambiguous region overlap.

Use lightweight existing static descriptors/Rapier-shape math; do not build navmesh/pathfinding.

---

# 14. Visual spawn authoring

Author Mode must make spawn relationships visible instead of requiring coordinate arithmetic.

### Camp

Hierarchy contains an editor-only/selectable **Camp Spawn** item.

Scene shows:

- capsule/footprint marker,
- facing arrow.

Inspector supports:

- X / Y / Z,
- facing angle,
- optional convenience **Focus**.

### Major Waypoint

Each Waypoint hierarchy entry exposes/selects a **Run Spawn** child/related item.

Scene shows:

- Waypoint marker,
- separate run-spawn capsule/footprint,
- facing arrow,
- optional line from Waypoint to its Run Spawn.

The human must be able to drag the Run Spawn independently of the Waypoint and rotate facing without editing JSON.

Useful small convenience actions are allowed only if trivial, e.g. **Move Spawn Here** or **Face Deeper**, but not required.

---

# 15. Hierarchy state preservation

Refreshing hierarchy due to selection/edit/place/delete must not collapse the user's workspace.

Preserve expanded/collapsed state by stable keys:

```text
region id
category id
spawn child groups where applicable
```

Requirements:

- selecting a row does not collapse other open groups,
- editing selected object does not collapse groups,
- place/duplicate/delete preserves unrelated expansion state,
- filtering does not permanently destroy previous expansion state,
- selected row remains visibly highlighted and scrolled into view when practical.

Selection is not itself a draft mutation.

---

# 16. Author keyboard workflow

Add a small explicit command router active only in Edit and only when focus is **not** inside `input`, `textarea`, `select`, contenteditable, or another text/number editor.

Required shortcuts:

- `Delete` / `Backspace` (with sensible browser prevention) → delete selected object with the same safeguards as UI button,
- `F` → focus selected object,
- `WASD` and/or Arrow keys → nudge X/Z,
- `Shift` modifier → larger nudge,
- `Q / E` → rotate selected object in fixed increments when supported,
- `Space / C` or another documented pair → raise/lower selected object when elevation supported,
- `Ctrl/Cmd+Z` → Undo,
- `Ctrl/Cmd+Shift+Z` and/or `Ctrl/Cmd+Y` → Redo,
- `Esc` → cancel placement/active transient edit.

Do not bind shortcuts that conflict with inspector editing.

---

# 17. Bounded undo/redo

Implement lightweight in-memory Author history, approximately 30–50 snapshots.

Requirements:

- one history entry per completed meaningful change, not every pointermove frame,
- drag coalesces into one entry on release,
- inspector commit creates one entry,
- place/duplicate/delete creates one entry,
- undo/redo restores canonical valid draft and live preview/hierarchy,
- Play/Export uses current history head,
- Reset Draft From Repo clears history,
- history does not need to persist across browser reloads.

Do not build a generalized command/event-sourcing framework.

---

# GAMEPLAY / CORE-LOOP CLOSURE

# 18. Desktop vs touch input ownership

Fix the double desktop swing at the input-adapter boundary.

Required ownership:

- **mouse** → desktop/keyboard mouse adapter only,
- **touch** → touch/mobile gesture adapter,
- **pen** → choose one explicit owner and test it; preferably touch-like unless there is a reason otherwise.

`touchMovement` must not interpret normal mouse pointer events as mobile tap/hold/swipe while `keyboardInput` also owns them.

Acceptance:

- one quick desktop left click = exactly one attack request / one recognizable swing,
- mouse hold repeats only at accepted shared cadence,
- F tap/hold still works,
- touch tap = one swing,
- touch hold repeats,
- swipe still dodges and never also attacks.

Do not paper over this with a Field Tool cooldown that merely hides duplicate requests.

---

# 19. Shared upper-left HUD layout

Auto Harvest and resource carry HUD currently position themselves independently and overlap.

Create one lightweight upper-left HUD stack/container/layout owner.

Requirements:

- safe-area aware,
- Auto Harvest and run inventory never overlap,
- inventory still hides zero rows,
- when all current resource rows are visible, layout remains readable in portrait,
- if future rows exceed available height, inventory section may scroll without covering the toggle,
- do not redesign the whole HUD in this slice.

Keep Map top-right and other accepted controls unchanged unless required for overlap/safe-area correctness.

---

# 20. Camera-projected frontier indicators

Replace fixed world-axis screen-direction assumptions with actual Three.js projection through the current camera.

Required behavior:

- project target world position into clip/NDC using the real camera,
- determine on-screen/off-screen accurately,
- handle targets behind the camera,
- clamp off-screen ray/direction to a safe portrait rectangle with UI padding,
- left/right/up/down remains correct if camera pitch/yaw/offset changes,
- no vertically flipped waypoint/beacon indicator.

### Guidance policy cleanup

Centralize minimal policy:

- extraction guidance may point only to discovered/usable extraction-capable anchors plus Camp return as appropriate,
- progress guidance points to the next appropriate deeper Major Waypoint/objective,
- endpoint must not point to itself,
- do not rely on JSON array order as long-term semantic depth if a small explicit `depth/order` field or validated graph-derived order is clearer,
- no more than the current minimal number of indicators; do not build a quest tracker.

---

# 21. Unique run identity and banking idempotence

Current banking must not identify a run only by its cargo/XP values.

Add a unique `runId` generated when `ExpeditionSession.beginRun()` begins a new expedition.

Requirements:

- runId included in resolved run snapshot,
- persistent bank tracks enough recent resolution identity to ensure a single run cannot bank twice,
- two separate runs with identical cargo/XP both bank successfully,
- retrying extraction resolution for the same runId is idempotent,
- no unbounded history growth; one last-resolved ID or small bounded set is enough given single-player sequential runs,
- death does not accidentally mark an extract bank token unless lifecycle design requires shared resolution identity.

Keep save schema versioned/defensive.

---

# 22. Per-run depth/session reset correctness

Audit `ExpeditionSession.beginRun/resetToCamp/death/extract` so per-run fields cannot leak.

At new run start, reset at minimum:

- current/max run depth,
- run kills,
- run XP/cargo mirrors,
- temporary discovery-summary state as appropriate,
- resolved/outcome flags,
- old start anchor state,
- runId replaced with a new one.

Persistent unlocked Waypoints/Beacons remain in `frontierProgress` and must not be erased.

Camp reset should prime region/session state after player position is actually returned to Camp, not sample a stale frontier region first.

---

# FRONTIER INTERACTION REDESIGN — OWNER APPROVED

# 23. Separate discovery from extraction action

Replace automatic blocking Waypoint/Beacon extraction dialogs on proximity.

### First discovery

When entering a previously undiscovered/unlocked anchor's activation radius during an active expedition:

1. persist discovery/unlock exactly once,
2. emit one activation event,
3. show nonblocking activation feedback (Section 24),
4. expose contextual nearby action if extraction is available,
5. **do not open a blocking modal automatically**.

Re-entering an already discovered anchor does not replay first-discovery presentation.

### Nearby extraction action

While the player is within an extraction interaction radius:

- show one contextual player action such as **EXTRACT**, including readable anchor name when helpful,
- desktop interaction key: `E` (preferred unless conflict),
- mobile: dedicated contextual button in a predictable right-side/contextual area,
- action disappears when leaving range,
- walking away is naturally **Keep Going**; remove the need for a KEEP GOING button/modal,
- pressing EXTRACT may use a small confirmation only if genuinely needed to avoid accidental loss of run continuity; default preference is direct extraction with clear button wording.

Do not make Field Tool attack input double as interaction.

### Existing anchor suppression

Starting at a Major Waypoint should not immediately show EXTRACT until the player has left/re-entered or until an explicit short spawn suppression state ends according to the existing intended logic. Preserve the no-immediate-extract start guarantee generically.

---

# 24. First activation presentation

A newly discovered Waypoint/Beacon should feel like a persistent milestone.

Implement lightweight offline feedback:

- short in-world emissive/pulse/ring animation,
- brief readable nonblocking toast/name banner,
- short procedural/local activation sound,
- optional small camera-independent UI flourish if cheap.

Examples:

```text
FOREST EDGE WAYPOINT ACTIVATED
New expedition start unlocked
```

```text
TANGLED HOLLOW BEACON ONLINE
Extraction available
```

Requirements:

- only fires on genuine first persistence change,
- never blocks movement/combat,
- uses authored `displayName`,
- one consistent path for Waypoint and Beacon with type-specific subtitle/color allowed,
- no external assets/network dependencies required; procedural WebAudio/local tiny asset is fine,
- re-entry does not replay discovery cue.

Do not spend this slice on final VFX/art polish.

---

# 25. Camp gate as physical expedition threshold

The Camp gate is no longer a walk-through trigger that automatically opens Map.

Target behavior:

## At Camp

- gate is physically closed/solid,
- approaching from Camp side exposes contextual **START EXPEDITION**,
- press/tap action → open CHOOSE START Map,
- selecting a Major Waypoint begins run and teleports to its authored Run Spawn,
- closing Map/canceling keeps player in Camp and gate closed,
- player cannot simply walk through the closed gate while no run is active.

## Returning during active expedition

- approaching gate from frontier side exposes **RETURN & SECURE**,
- activating it uses the same run extraction/banking pipeline as Waypoint/Beacon extraction,
- no automatic blocking modal merely from entering proximity,
- if player walks away, run simply continues.

### Gate collision capability

Make the static capability truthful:

- the authored gate can have collision when closed,
- if the implementation uses a stateful collider/door representation, keep it simple and deterministic,
- no visual door-opening animation is required because run start teleports to selected Waypoint,
- Author Mode Collision control for Gate must not claim support the runtime ignores.

Do not create a generalized door system.

---

# 26. Contextual interaction ownership

Create one small contextual interaction owner/helper instead of scattering proximity buttons across anchor/gate systems.

It should answer approximately:

```text
current interaction label
current target id/type
is interaction available
activate interaction
```

Inputs:

- desktop E,
- mobile contextual button.

It must coexist with:

- Field Tool tap/hold/swipe,
- Map button,
- joystick,
- Author Mode suppression,
- result cards.

Only one highest-priority contextual frontier action should be shown at a time.

Do not build a generic NPC/dialog interaction framework.

---

# 27. World-data migration

Update canonical `src/world/data/world.json` through the normal generation path.

Required migration:

- explicit `camp.playerSpawn` transform with position/facing,
- each Major Waypoint gets explicit `runSpawn`,
- current Forest Edge run spawn corrected inside Forest Edge on supported ground and facing deeper,
- Threshold Rise run spawn similarly valid,
- old `spawnOffset` removed from canonical data after migration unless retained only as backward-compatible loader support,
- Ground/Boundary transforms normalized to the chosen Y convention,
- anchor depth/order metadata added only if required by the cleaned indicator policy,
- gate collision data matches new physical Camp-gate behavior.

Do not redesign the Area 1 layout in this slice beyond corrections needed for valid spawn/interaction behavior.

---

# 28. Automated regression coverage

Add focused tests for shared contracts, not only example coordinates.

## Authoring

Required automated coverage should include:

1. Ground Patch move/rotate/elevate/resize → canonical descriptor → Edit descriptor → runtime descriptor parity.
2. Boundary Collider equivalent parity and base-Y convention.
3. newly placed hidden collidable Boundary immediately has an Edit proxy.
4. all four `visibleInPlay × collisionEnabled` combinations on representative static families.
5. opacity `1 → 0.4 → 1` and tint apply/remove restore defaults without sibling leaks.
6. invalid inspector mutation does not alter/persist canonical draft.
7. invalid placement/region move does not corrupt canonical draft.
8. Play transition refuses invalid draft before mode/reload corruption.
9. object can move beyond old ±12/±11 rectangle.
10. current-draft region query reflects edited bounds rather than startup registry.
11. ambiguous region overlap rejected.
12. point-owned object outside declared region rejected or deterministically rehomed according to chosen rule.
13. traversal/static transform finite/positive checks.
14. hierarchy expanded-state preserved across select/edit/place/delete/filter.
15. shortcuts ignored while inspector input/select is focused.
16. undo/redo restores canonical draft and selection/live preview.

## Spawn

17. every Camp/Waypoint spawn strictly belongs to intended region.
18. spawn is supported by authored walkable surface and clear of blocking colliders.
19. Forest Edge begins inside Forest Edge.
20. authored facing is applied.
21. selected run-start Waypoint does not immediately expose extract until suppression/leave-reentry rule permits.

## Input/UI

22. realistic desktop mouse sequence produces exactly one attack request.
23. F/touch tap/touch hold/swipe behavior remains accepted.
24. upper-left HUD does not overlap at representative narrow portrait width with all resource rows visible.
25. camera projection sends north/south/east/west targets to correct screen edge and handles behind-camera cases.
26. undiscovered extraction anchors excluded; endpoint does not self-point.

## Persistence/session

27. two distinct runIds with identical cargo/XP both bank.
28. same runId cannot bank twice.
29. beginRun resets maxDepth/temporary summary/resolution state.

## Interaction

30. first Waypoint discovery persists once + emits one activation event.
31. first Beacon discovery same.
32. re-entry does not replay activation event.
33. proximity alone does not open extraction modal.
34. contextual EXTRACT invokes normal extraction pipeline.
35. Camp START EXPEDITION opens Map without walking through closed collider.
36. closing Map keeps Camp state/gate closed.
37. RETURN & SECURE uses same idempotent banking/result path.

Retain all existing tests unless a test asserts deliberately replaced auto-modal behavior; update those tests to the new approved interaction contract rather than deleting coverage.

---

# 29. Human acceptance checklist

Muse's final response must give this in short human-readable language adapted to the actual controls.

### Test 1 — Author world is no longer boxed in

- Open `?author=1`, Edit.
- Move/place a Ground Patch and another object well beyond the old yellow/original arena rectangle.
- Resize/move it and confirm the actual object updates live.
- Play and confirm ground + collision match what Edit showed.

**Pass:** no hidden old clamp; no Edit/Play mismatch.

### Test 2 — Hidden collider / presentation truth

- Place a Boundary Collider.
- Make it hidden in Play + collision ON.
- Confirm proxy appears immediately in Edit.
- Change opacity/tint on a visible Box/Fence and return opacity to 1/remove tint.
- Play.

**Pass:** proxies/presentation update immediately and Play matches; sibling objects unchanged.

### Test 3 — Hierarchy, shortcuts, undo

- Expand several regions/categories.
- Select/edit objects; groups stay open.
- Use F focus, WASD/arrows nudge, Q/E rotate, raise/lower, Delete.
- Undo/redo a move and a delete.
- Click a numeric inspector field and use arrow/WASD-like typing/navigation as appropriate.

**Pass:** shortcuts do not fire while editing fields; hierarchy state survives; undo/redo is predictable.

### Test 4 — Spawn authoring

- Select Camp Spawn and Forest Edge Run Spawn visually.
- Drag Forest Edge Run Spawn to an obvious valid place inside Forest Edge and set facing deeper.
- Play fresh run and choose Forest Edge.

**Pass:** player appears on solid ground inside Forest Edge, facing intended direction; no immediate extract action from the start Waypoint.

### Test 5 — One desktop attack + HUD

- In active run, click once with mouse.
- Hold once.
- Fill/collect enough resources to show all current inventory rows.

**Pass:** quick click gives one swing; hold uses normal cadence; inventory and Auto Harvest never overlap.

### Test 6 — Waypoint/Beacon interaction

- Discover a new Waypoint or Beacon.

**Pass:** one brief activation pulse/sound/name appears without stopping movement; nearby EXTRACT contextual action appears; walking away continues naturally; returning later does not replay discovery animation.

### Test 7 — Camp gate + guidance + repeat runs

- At fresh Camp, approach closed gate.
- Use START EXPEDITION; close Map once and confirm gate remains closed.
- Reopen/start Forest Edge.
- Follow an off-screen indicator above/below/left/right as you move.
- Extract or return to Camp; repeat another run with identical small cargo if practical.

**Pass:** gate is a deliberate threshold; indicators point correctly; repeated runs bank correctly; no stale depth/input state.

Final human question:

> **Does Author Mode now feel trustworthy enough to shape the real 5–10 minute expedition, and does Camp → start → discover → optionally extract → continue/return feel natural without automatic interruption?**

Human yes is required before Phase 4B.

---

# 30. Completion gate

Phase 4A.2 is implementation-complete only when:

- canonical Author mutation/descriptor path exists and is used by Edit/runtime/Rapier for supported static families,
- Ground/Boundary live parity/proxy lifecycle works,
- old editor clamp is removed,
- current-draft spatial/ownership validation works,
- explicit visual Camp/Waypoint spawn transforms work end-to-end,
- hierarchy state/shortcuts/undo are reliable,
- desktop mouse no longer double-attacks,
- upper-left HUD is stacked,
- edge indicators use camera projection,
- run identity/banking/depth reset defects are closed,
- auto extraction modals are replaced by nonblocking discovery + contextual actions,
- Camp gate uses contextual start/return and real collision,
- first activation feedback works once,
- `npm test` passes,
- `npm run world:generate` / `npm run world:check` pass as applicable,
- `npm run verify` passes,
- `npm run zip` passes,
- one rAF / fixed 1/60 / Rapier / offline / portrait / <35MB guarantees remain intact,
- docs/Build Log reflect actual implementation,
- implementation stops before Phase 4B content/pacing work.

Do **not** claim human acceptance. Human playtest closes this phase.

---

# 31. Final agent response format

Keep closeout concise and useful:

1. **Implementation summary** — grouped by Author reliability, Spawn, Input/UI, Interaction, Persistence.
2. **Consistency Sweep** — name sibling families/paths verified.
3. **Automated gates** — exact test/verify/zip results.
4. **Human acceptance** — only the seven simple tests above, adapted to actual labels/shortcuts.
5. Stop. **Do not begin Phase 4B.**
