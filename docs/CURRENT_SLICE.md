# Wildkin Frontier — Phase 4A.2.1: Author Trust & Spawn/Input Repair

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A.2.1  
**Purpose:** Repair the Phase 4A.2 acceptance failures found by human playtesting and a read-only Codex audit so Author Mode can be trusted before any Phase 4B content work or kitbash/asset-system expansion.

Phase 4A.2 established several useful foundations that should be preserved: transactional intent, draft-derived spatial helpers, explicit Camp/Waypoint spawn schemas, hierarchy preservation, undo/redo, contextual frontier interaction, run identity/banking, HUD stacking, and projected guidance. However, human testing and code audit found that several acceptance claims are false in the actual editor/runtime path.

This is a **repair slice, not a new feature phase**.

---

# 1. Required end state

At the end of Phase 4A.2.1:

## Author Mode trust

A human edit must obey one rule:

```text
input / drag / shortcut
→ preview candidate only
→ validate candidate
→ atomic canonical commit
→ preview reconciles from canonical truth
→ undo/redo restores the same truth
→ Play only starts from a valid draft
```

No Author UI path may mutate canonical draft state before validation.

## Static Edit parity

For current rectangular static families, Edit, Play, and Rapier must use one coherent interpretation of:

```text
position/base Y
rotation
size
visibility
collision
opacity/tint
```

Ground Patch and Boundary Collider must move/resize/elevate/rotate live in Edit, and newly placed hidden colliders must immediately show their Edit proxy.

## Spawn authoring/runtime parity

Camp Spawn and Major Waypoint Run Spawn must behave as real authored transforms:

```text
feet/support position X/Y/Z + facingYaw
→ Author marker
→ validation
→ runtime resolver
→ capsule center derived from authored support Y
→ player appears at the same authored place and facing
```

A Run Spawn on an elevated platform must start the player on that platform, not at global ground height.

## Input reliability

A short desktop attack edge must survive render frames with zero fixed simulation steps and reach one eligible Field Tool update exactly once.

## Region movement

Point-owned objects can cross a region boundary naturally:

```text
drag object
→ determine unique containing region at final position
→ rehome + position commit atomically
```

No impossible “change region first / move first” ordering.

Core acceptance question:

> **Can the human reshape Area 1 without the editor lying, losing edits, corrupting draft state, dropping clicks, or spawning the player somewhere different from the authored marker?**

---

# 2. Source findings this slice must close

Human playtesting at Phase 4A.2 commit `b5005263d44612e7ec5af80784e61dd9dfe4a615` found:

- Ground Patch placement works, but moving an existing Ground Patch does not update live in Edit.
- Newly placed Boundary Collider does not show its wireframe/proxy until Play → Edit rebuild.
- dragging Run Spawn markers can make them disappear or fail to persist.
- Threshold Rise Run Spawn is authored on an elevated box, but starting there places the player inside/below it.
- Q/E does not rotate Run Spawn facing; inspector numeric rotation does.
- quick desktop clicks are intermittently lost while hold-repeat works.
- Beacon/point-owned region movement is effectively unusable because position and region ownership are validated in separate transactions.
- activation sound/toast is visible, but in-world pulse is not perceptible.

Code audit additionally found:

- `syncPreviewForId()` lacks real Ground/Boundary transform parity.
- newly placed hidden Boundary uses a generic placeholder rather than canonical proxy creation.
- virtual spawn drag mutates synthesized temporary objects.
- spawn marker parent/child transforms mix world and local coordinates.
- runtime start/reset paths discard authored spawn Y.
- Author UI/Mode still directly mutate canonical references returned by `getDraft()` / `findObjectById()` before transaction validation.
- Edit→Play mode state can transition before validation succeeds.
- undo/redo can leave stale/ghost preview objects.
- live material reset can fail when opacity returns to `1` or tint is removed.
- static capability truth is inconsistent for some sibling families.
- activation VFX starts a private recursive `requestAnimationFrame` and hardcodes world Y.
- frontier indicator depth/endpoint behavior and per-frame DOM recreation need a small bounded correction.
- several Phase 4A.2 tests are helper/source-presence checks rather than real integration coverage.

Do not patch these as unrelated symptoms. Close the shared contracts that caused them.

---

# 3. Hard scope

Implement only the following:

1. canonical Author draft mutation ownership,
2. preview-only drag/placement state with atomic commit/cancel,
3. validate-before-Play transition,
4. canonical static descriptor usage for current rectangular static families,
5. Ground/Boundary live transform + proxy parity,
6. full Author preview reconciliation after commit/undo/redo/place/delete,
7. spawn marker transform/selection/drag/facing repair,
8. authored spawn Y runtime application,
9. spawn support/clearance validation needed for current Camp + Area 1,
10. automatic unique-region rehoming for point-owned moves,
11. desktop attack-edge retention across zero-substep render frames,
12. activation pulse authored Y + single-rAF ownership,
13. static capability/material reset consistency sweep,
14. small frontier-indicator endpoint/depth/DOM lifecycle correction,
15. replace false-confidence tests with focused integration/handler coverage,
16. docs/Build Log updates and verification gates.

---

# 4. Explicit non-goals

Do **not** implement:

- Phase 4B final Camp/Area 1 layout or encounter pacing,
- kitbash/visual asset/prefab system,
- region creation/deletion or Region palette placement,
- generic transform gizmos,
- multi-select,
- terrain sculpting/heightmaps/painting,
- new Wildkin species/bonding/companions/mounts,
- Matter Resonator progression/spend,
- resource/combat rebalance,
- second area/final endpoint content,
- world-space contextual interaction buttons,
- new runtime dependencies,
- broad visual/art polish,
- generic animation framework,
- generic command/event-sourcing architecture.

The screen-space contextual `EXTRACT` button is allowed by the existing design and is not a defect in this slice.

---

# 5. Change Closure / consistency sweep

Permanent `AGENTS.md` Change Closure rules apply.

For each shared contract touched, trace the complete path rather than stopping at the helper that passes a unit test.

## Author mutation contract

```text
UI / keyboard / drag / placement
→ candidate/preview state
→ normalize + validate
→ atomic commit
→ persistence/history
→ preview reconciliation
→ export
→ Play validation gate
```

## Static descriptor contract

```text
world.json authored static
→ normalize descriptor
→ Edit preview
→ runtime visual
→ Rapier collider descriptor
→ Play rebuild
```

## Spawn contract

```text
world.json spawn transform
→ validator
→ Author marker/inspector/drag/shortcuts
→ registry resolver
→ beginExpedition / resetToCamp
→ player capsule center + facing
→ region + support + blocker clearance
```

## Attack edge contract

```text
pointer/key edge
→ owning input adapter
→ pending/latch
→ merged intent
→ eligible fixed step
→ Field Tool receives edge once
→ consume only after processing
```

---

# AUTHOR MODE REPAIR

# 6. Canonical draft must not be directly mutable from UI/Mode

Phase 4A.2 intended transactional mutation, but canonical references are still exposed and mutated before transactions.

Repair the ownership boundary.

Requirements:

- normal Author UI/Mode code must not mutate the object returned by canonical lookup before validation,
- `getDraft()` / `findObjectById()` may remain for read access only if callers cannot use them to bypass transaction safety,
- use cloned/read-only snapshots, explicit getters, or another small focused approach,
- all meaningful edits route through explicit mutation APIs,
- invalid inspector edits leave canonical in-memory state and persisted draft unchanged,
- invalid region/drag/place operations leave canonical state unchanged,
- Esc during active drag/placement cancels preview and restores canonical presentation,
- no direct `found.obj.foo = ...` mutation in normal Author UI event paths.

Do not build immutable-state infrastructure for the whole game. This boundary is only for Author draft ownership.

---

# 7. Preview candidate vs canonical commit

Drag and placement need a real preview layer/state instead of temporarily changing canonical data.

Preferred semantics:

```text
pointerdown
→ capture canonical start transform
pointermove
→ update preview only
pointerup
→ build one candidate mutation
→ auto-rehome if applicable
→ validate
→ commit once + one history entry
→ reconcile preview from canonical
```

Requirements:

- drag remains visually live,
- no history entry per pointermove,
- invalid release snaps preview back to canonical object and shows readable error,
- Esc cancels without commit,
- placement preview/creation must not create a canonical object and then directly mutate it into position,
- newly placed object commits once with final intended transform/region,
- duplicate/delete/inspector/nudge use the same canonical commit rules.

---

# 8. Validate before changing Edit/Play state

Edit→Play must be an actual gate.

Required order:

```text
Play requested
→ validate current canonical draft
→ if invalid: stay fully in Edit, keep gameplay suppressed, show error
→ if valid: exit Edit / rebuild / reload
```

Requirements:

- no UI badge/state change to Play before validation succeeds,
- no Author suppression mismatch after a failed Play attempt,
- `onPlay` / rebuild callback must not continue after failed validation,
- automated test must exercise the real transition controller/handler, not only call `validate()` separately.

---

# 9. Canonical static descriptor must be real production authority

`staticDescriptor.js` should not be a nominal helper used mostly by tests.

For current rectangular static families, one normalized descriptor must be the shared interpretation used by:

- Author preview creation/update,
- runtime static visual construction,
- Rapier collider creation/descriptor generation.

At minimum sweep:

- Box,
- Fence,
- Gate,
- Forest Boundary,
- Ground Patch,
- Boundary Collider,
- Resonator,
- Drop Pod where its special geometry allows the same authored transform/collision contract,
- Water / Island where intentionally visual-only or non-colliding behavior differs,
- Platform / Obstacle if they share the rectangular base-Y path.

Do not force special visual geometry into a generic box representation; share transform/size/collision interpretation while allowing special visuals.

---

# 10. Ground Patch / Boundary live Edit parity

Ground Patch and Boundary Collider must be first-class live Author objects.

While in Edit:

- X/Y/Z move updates immediately,
- drag X/Z updates continuously,
- size changes update immediately,
- supported rotation updates immediately,
- elevation uses base-Y consistently,
- hidden collidable Boundary shows obvious wireframe/proxy immediately after placement,
- toggling visible/collision regenerates or updates proxy truthfully,
- Play reload produces the same transform/collider.

New-object preview creation must use the same descriptor/proxy interpretation as an existing object. Do not create a generic placeholder that contradicts the real object.

---

# 11. Preview reconciliation after canonical changes

Undo/redo/place/delete currently can leave stale or missing scene objects.

Provide one focused reconciliation path after canonical draft changes.

Requirements:

- undo deletion recreates the object preview,
- undo placement removes the placed preview,
- redo restores the corresponding preview,
- changed objects update from canonical data,
- stale author-only proxy/marker nodes are removed,
- hierarchy and selection remain coherent,
- static, spawn, resource, creature, anchor/POI families keep their existing accepted preview behavior.

Implementation may reconcile affected IDs or rebuild a lightweight Author preview layer; do not rebuild gameplay physics continuously in Edit.

---

# 12. Static capabilities and live material reset

Use one capability definition as the Author inspector truth.

Verify at minimum:

- Water does not advertise unsupported collision,
- Island collision UI matches actual runtime behavior,
- Gate collision remains truthful,
- Drop Pod authored transform/dimensions/collision semantics are not silently ignored,
- removing tint restores subtype/default material color live,
- opacity `1 → 0.4 → 1` restores transparency/depth state live,
- sibling objects sharing a base material remain unaffected by one object's presentation edits.

Do not add a generic material editor.

---

# SPAWN REPAIR

# 13. Spawn authoring target semantics

Camp Spawn and Run Spawn are virtual Author targets backed by canonical spawn data, but they must not behave like mutable temporary copies.

Create a small explicit spawn-authoring path or equivalent.

Requirements:

- authoritative getter returns canonical spawn transform snapshot,
- drag/inspector/keyboard commit through explicit spawn mutation,
- Run Spawn drag persists,
- marker remains visible after move,
- selected marker can be focused and highlighted,
- marker children use **local transforms** relative to one world-positioned group,
- do not apply world position/facing to both parent and children,
- line from Waypoint to Run Spawn updates after movement,
- Waypoint position and explicit Run Spawn remain independent by design.

Raising a Waypoint does not automatically raise an explicit Run Spawn unless a future user action intentionally does so.

---

# 14. Spawn facing shortcuts

Q/E must rotate spawn facing using the same canonical property as inspector input.

Requirements:

- normal static object Q/E → `rotY` where supported,
- Camp Spawn / Run Spawn Q/E → `facingYaw`,
- 15° increment remains acceptable,
- preview arrow updates immediately,
- exported/reloaded spawn retains facing,
- starting expedition applies that facing.

---

# 15. Authored spawn Y means feet/support elevation

Lock the meaning of spawn position:

> `playerSpawn.position.y` / `runSpawn.position.y` is the intended **feet/support elevation** in world space, not the capsule center.

Runtime derives capsule center from authored support Y plus the character collider's correct vertical half extent/clearance.

Requirements:

- Camp start/reset uses authored Y,
- every Waypoint run start uses authored Y,
- no replacement with a fixed global ground-level Y,
- Threshold Rise spawn on the elevated box starts visibly on top of the box,
- X/Z/facing remain exact authored values,
- character physics state, player visual state, region activation, and camera snap all use the resolved final capsule position coherently.

Use the actual collider dimensions/config already owned by character physics; do not duplicate magic height constants in multiple places.

---

# 16. Spawn support and clearance validation

Strengthen validation only enough to trust current Camp and Area 1 spawns.

For each Camp/Run Spawn:

- finite X/Y/Z/facing,
- strict containment in intended region,
- feet/support position lies on or very near an authored traversable support surface at the same elevation,
- player capsule volume is not initially intersecting a blocking static collider/boundary/gate,
- elevated platform support is valid,
- no navmesh/pathfinding required.

Use existing static/Rapier descriptor math rather than building a second collision model.

---

# REGION OWNERSHIP REPAIR

# 17. Auto-rehome point-owned objects atomically

Point-owned objects should move naturally across region boundaries.

For supported point-owned families:

```text
final candidate position
→ findContainingRegion(position)
→ exactly one region = candidate owner
→ move object between collections + set position in same transaction
→ validate + commit
```

At minimum apply to:

- resources,
- creatures/spawns,
- Major Waypoints,
- Extraction Beacons,
- POIs,
- ordinary point-owned props where their ownership semantics are point-based.

Requirements:

- dragging Beacon from Region A into Region B succeeds in one gesture when final position is valid,
- hierarchy updates to the new region after commit,
- ambiguous overlap/no containing region is rejected and preview returns to canonical,
- Region dropdown may remain as an advanced/manual control, but it must not be the only way to cross regions,
- Ground/Boundary footprint ownership keeps its existing footprint-specific rules rather than point auto-rehome.

For a Major Waypoint with an explicit Run Spawn, if rehoming the Waypoint would make its Run Spawn invalid for the new region, reject with a readable error rather than silently moving the Run Spawn.

---

# INPUT REPAIR

# 18. Latch quick attack edges until a fixed step processes them

Do not consume a one-shot desktop/touch attack edge merely because a render frame occurred.

Requirements:

- pointer/key tap becomes a pending attack edge,
- if a render frame executes zero fixed steps, edge remains pending,
- the next eligible fixed step passes the edge to Field Tool exactly once,
- consume after the fixed-step gameplay path processes that edge,
- do not create duplicate swings from pointerdown + mousedown,
- hold-repeat continues using existing cadence,
- F tap/hold remains valid,
- touch tap/hold/swipe precedence remains valid,
- no broad attack queue that bypasses Field Tool cadence/cooldowns.

Test at render cadence faster than fixed simulation (e.g. simulated 120/144 Hz render vs 60 Hz fixed step).

---

# ACTIVATION / GUIDANCE REPAIR

# 19. Activation pulse uses authored world Y and authoritative tick

Keep the accepted nonblocking toast/audio.

Repair the in-world pulse:

- spawn at anchor's authored world Y with a small visible offset,
- elevated anchor pulse must appear at the elevated anchor, not ground plane,
- no recursive/private `requestAnimationFrame`,
- expose a tiny `update(dt)` or register with an existing tick-driven visual owner,
- dispose/remove ring geometry/material when finished,
- one pulse per genuine first discovery only.

Do not build a generic tween/animation framework.

---

# 20. Small frontier-indicator lifecycle correction

Do not redesign guidance.

Close only the systemic defects found in audit:

- progress guidance must not point backward when there is no deeper valid Major Waypoint,
- deepest endpoint returns no deeper-progress target,
- avoid treating raw JSON array order as the long-term semantic depth authority; use a small explicit validated depth/order field or a deterministic graph-derived depth suitable for the current five-region frontier,
- keep current camera projection behavior,
- reuse/update indicator DOM nodes instead of destroying/recreating them every render frame.

Human-noted visual polish can remain deferred to later pacing/hardening phases.

---

# TEST REPAIR

# 21. Replace false-confidence tests with real path coverage

Do not remove useful pure tests, but tests claiming integration behavior must exercise the integration path.

Add focused coverage for:

## Author

- existing Ground move/resize/elevate/rotate updates live preview representation,
- newly placed hidden Boundary immediately owns a visible Edit proxy,
- invalid inspector mutation does not alter canonical draft,
- invalid drag release restores canonical preview,
- Esc drag cancel restores canonical preview,
- placement commits final transform atomically,
- Play refusal keeps full Edit mode/suppression state,
- undo/redo reconciles scene objects for placement/deletion.

## Spawn

- Run Spawn drag changes canonical `runSpawn.position`,
- Q/E changes `facingYaw`, not `rotY`,
- marker children remain local to marker group,
- elevated authored Y produces correct runtime capsule center,
- facing applies to player state,
- support/clearance validator rejects an actually blocked spawn.

## Region

- Beacon/point-owned object crossing boundary rehomes in the same transaction,
- ambiguous/outside final position rejects without canonical mutation.

## Input

Simulate:

```text
pointerdown attack
render frame with 0 fixed steps
next render frame with >=1 fixed step
```

and assert exactly one Field Tool attack edge reaches processing.

Do not accept source-text checks like “file contains mouse guard” as proof of end-to-end input correctness.

## rAF

Scan all first-party runtime source or otherwise verify there is only the authoritative game-loop rAF owner after this repair.

Tautological `assert.ok(true)` checks do not count as acceptance coverage.

---

# 22. Preserve accepted Phase 4A.2 behavior

This repair must not regress:

- hierarchy expanded/collapsed state,
- keyboard nudge/focus/delete/undo/redo outside the spawn-specific fix,
- unbounded old-arena movement removal,
- draft-derived world extents,
- upper-left HUD stacking,
- camera-projected indicator direction,
- unique runId banking/idempotence,
- per-run reset/depth lifecycle,
- nonblocking Waypoint/Beacon discovery,
- screen-space contextual EXTRACT / E action,
- Camp gate START EXPEDITION / RETURN & SECURE flow,
- Map start selection,
- one-rAF/fixed-step/Rapier/offline/portrait/<35 MB constraints.

---

# 23. Required human acceptance tests

After automated gates pass, human-test all of the following before declaring 4A.2.1 accepted.

## Test 1 — Ground/Boundary live truth

1. Open `?author=1` → Edit.
2. Select an existing Ground Patch.
3. Drag it, resize it, elevate it, rotate if supported.
4. Repeat on Boundary Collider.
5. Enter Play.

**Pass:** every Edit change is visible immediately and Play/Rapier matches.

## Test 2 — New hidden Boundary proxy

1. Place Boundary Collider.
2. Do not enter Play.

**Pass:** obvious selectable wireframe/proxy appears immediately and follows movement/resize.

## Test 3 — Threshold Rise spawn

1. Select Threshold Rise Run Spawn.
2. Drag it on top of the elevated box/platform.
3. Adjust Y if needed.
4. Rotate facing using Q/E.
5. Start expedition from Threshold Rise.

**Pass:** marker persists, arrow matches Q/E, player starts on top at authored elevation and facing, never inside/below the box.

## Test 4 — Cross-region move

1. Select a Beacon or other point-owned object near a region edge.
2. Drag it clearly into the neighboring region.

**Pass:** one drag rehomes it automatically, hierarchy updates, no dropdown sequencing required.

## Test 5 — Fast click reliability

On desktop, rapidly make distinct short left clicks at varied cadence, including a high-refresh display if available; then test hold.

**Pass:** every reasonable discrete click produces exactly one accepted swing request; no click vanishes solely due to render/fixed-step timing; hold cadence remains normal.

## Test 6 — Transaction safety / Play gate

Try invalid numeric edit, invalid drag outside all regions, invalid region move, and Esc-cancelled drag. Then try Play while draft is invalid using a deliberately testable invalid state/path.

**Pass:** canonical/exported data does not change for rejected/cancelled edits; preview snaps back; invalid Play remains fully in Edit with gameplay suppressed.

## Test 7 — Undo/redo scene reconciliation

Place, delete, undo, redo several objects including a hidden Boundary.

**Pass:** hierarchy and scene match canonical draft after every operation; no ghosts or missing restored previews.

## Test 8 — Activation + core loop regression

Discover a ground-level anchor and an elevated anchor where practical.

**Pass:** visible in-world pulse occurs at correct elevation once, sound/toast still work, and Camp → start → gather → extract/return → Camp remains intact.

---

# 24. Automated gates

Required before handoff:

```text
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Also verify:

- one authoritative first-party runtime `requestAnimationFrame` owner,
- no new network requests,
- no new runtime dependency unless absolutely unavoidable (expected: none),
- ZIP remains under 35 MB,
- `world.json` ↔ generated data remain synchronized,
- first-party code remains readable/unminified per competition requirements.

---

# 25. Completion / stop condition

Phase 4A.2.1 is complete only when:

- automated gates are green,
- the new tests exercise the actual failing integration paths rather than helper/source presence,
- all eight human acceptance tests pass or any remaining issue is explicitly judged non-blocking by the human,
- `docs/BUILD_LOG.md` and architecture/current-state docs accurately describe what is truly implemented,
- no completion summary claims a human acceptance result that was not actually human-tested.

When 4A.2.1 is human-accepted, **stop infrastructure repair**.

Next planning step is the already-discussed read-only audit for a small **Phase 4B.0 Kitbash / Visual Asset System** before Phase 4B level/pacing authoring. Do not begin that work in this slice.
