# Wildkin Frontier — Phase 4A.1: First-Run UX, Anchor Suppression & Authoring Prerequisites

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A.1  
**Purpose:** Human-accept the Phase 4A expedition loop by fixing first-run/start-anchor behavior and player-facing frontier UI, while adding only the minimum Author Mode world controls required to shape Phase 4B safely.

Phase 4A is **implementation-complete but not yet human-accepted**. Its persistence, extraction, death, banking, Map, result-card, region-activation, and run lifecycle architecture are the accepted basis for this refinement unless this slice identifies a concrete regression.

Phase 4B does **not** start in this slice. Do not tune encounter pacing, redesign Area 1, add progression, bonding, Resonator gameplay, or broaden content.

---

## 1. Human findings driving this refinement

Human testing of Phase 4A found:

- Fresh normal launch immediately opens **CHOOSE START** instead of leaving the player standing in Camp with control.
- The cause must be treated as a lifecycle/trigger problem, not only patched with one coordinate: the current Camp spawn can begin within the Camp gate interaction radius.
- Selecting **Forest Edge** or another unlocked Major Waypoint correctly begins an active run and restores harvesting/attack behavior.
- However, immediately after teleporting to a selected Major Waypoint, the game opens that Waypoint's extraction prompt. Starting at a Waypoint must not instantly ask the player to extract from the Waypoint they just selected.
- Extraction itself appears to work.
- Current player-facing Map/prompt UI exposes internal IDs/coordinates and generic labels. Frontier anchors should communicate readable names, not implementation identifiers.
- Human fresh-save testing is awkward because reset progress is only exposed through a console helper.
- Author Mode still cannot adequately shape the real frontier for Phase 4B:
  - existing playable ground is not a normal selectable/editable authored object,
  - new ground cannot be placed,
  - the hard-coded outer physical world boundaries cannot be selected/moved/deleted,
  - static objects need explicit **collision enabled/disabled**, **visible/hidden in Play**, **opacity**, and **color/tint** controls,
  - invisible collider-only objects must remain visible/selectable in Edit,
  - the palette has enough entries that category grouping is now needed.

The loop is close. This slice must make first-run behavior trustworthy and make Author Mode capable of shaping the actual 4B space without another infrastructure detour.

---

## 2. Core acceptance questions

### Player loop

> **From a fresh save, do I begin in Camp with control, deliberately walk through the gate, choose a start, arrive in the frontier with no immediate extraction popup, and immediately harvest/fight normally?**

### Authoring prerequisite

> **Can I visually build/reshape playable ground and collision boundaries, and independently decide whether a static object renders and/or collides, without hidden hard-coded world geometry contradicting the authored scene?**

Both must be yes before Phase 4B.

---

## 3. Hard scope

Implement only:

1. first-launch Camp/gate trigger correctness,
2. selected-start Major Waypoint suppression until a meaningful leave/re-entry,
3. active-run interaction regression coverage after start,
4. player-facing Map/anchor/result naming cleanup,
5. a simple human-friendly **dev-only player-progress reset**,
6. authored/selectable/placeable ground patches,
7. authored/selectable/removable outer boundary colliders instead of hidden hard-coded boundary walls,
8. static-prop presentation/collision controls:
   - collision enabled,
   - visible in Play,
   - opacity,
   - color/tint,
9. Edit-only proxy visualization for hidden/collider-only objects,
10. categorized Author Mode palette + hierarchy categories for ground/boundaries,
11. validator/export/runtime/physics/tests/docs closure for the above.

Do **not** implement:

- Phase 4B encounter/resource/danger pacing,
- final Camp layout or art pass,
- Wildkin bonding/capture/companions,
- progression/spend/skill tree/equipment,
- Matter Resonator gameplay,
- second area/final endpoint,
- terrain sculpting, heightmaps, terrain painting, mesh editing,
- general material editor, texture browser, asset pipeline,
- generic physics layers/masks UI,
- undo/redo/multi-select/prefabs,
- mobile Author Mode,
- new runtime dependencies.

Keep this a **refinement + authoring prerequisite** slice.

---

## 4. Change Closure / Consistency Sweep focus

Permanent `AGENTS.md` Change Closure rules apply.

Do not patch only the currently observed Forest Edge or fence example. For each shared contract changed, trace the whole path.

### Anchor lifecycle

```text
Camp spawn / gate entry
→ frontierAnchorSystem inside/armed state
→ Map start selection
→ beginExpedition
→ selected-start suppression
→ player leaves anchor radius
→ later re-entry
→ extraction prompt
```

Verify this for **every selectable Major Waypoint**, not only `wp_p1_entry`.

### Static authored object contract

```text
Author inspector / palette
→ draft/world.json
→ normalize/validate
→ Edit preview/proxy
→ staticWorldBuilder
→ Rapier collider generation
→ Play reload
→ deterministic export/reset
→ tests
```

Verify sibling static object families using the shared presentation/collision path.

### Player-facing anchor names

```text
world data displayName
→ registry
→ Map
→ start-selection
→ anchor prompt
→ result/discovery card
```

No one UI should fall back to raw internal IDs when another uses the display name.

---

# PLAYER LOOP REFINEMENT

## 5. Fresh launch must begin in Camp with control

Normal `/` launch on a fresh or existing save must **not** automatically open CHOOSE START.

Expected first frame/player experience:

- player is visibly inside Camp,
- no blocking modal open,
- movement works,
- Map button is available,
- expedition session status is `camp`,
- gate waits for a deliberate player entry/crossing.

### Make the Camp spawn authored and robust

Add/normalize an explicit authored Camp player spawn, e.g.:

```text
camp.playerSpawn: { x, y, z }
```

or an equivalent clear field.

Do not keep deriving spawn from `camp.pos - arbitraryOffset` if that can accidentally place the player inside an interaction trigger.

Validator should ensure the spawn is finite and inside/near the Camp region.

### Gate trigger must be edge/entry based, not startup-position based

Even if a future author accidentally places Camp spawn inside the gate radius, startup must not immediately fire the gate modal.

Prime/synchronize the anchor system's initial `inside` state from the actual player position, or otherwise require a genuine outside → inside transition before the Camp gate start prompt can fire.

Preferred guarantee:

```text
load at Camp
→ anchor system knows current overlap state
→ no prompt from initial overlap
→ player exits gate radius
→ later enters gate radius
→ CHOOSE START may open
```

Also author the current Camp spawn far enough from the gate that the intended playtest naturally starts outside the trigger.

---

## 6. Starting at a Major Waypoint must not instantly prompt extraction

When the player selects any unlocked Major Waypoint from CHOOSE START:

1. Map closes.
2. Session becomes active.
3. Player appears at the authored safe spawn position.
4. Gameplay input is restored.
5. No Waypoint/Beacon/Gate prompt is visible.
6. Harvesting, attack, Auto Harvest, movement, dodge, combat, and focus rings work normally.
7. The selected start Waypoint cannot prompt until the player has meaningfully left its interaction radius/starting suppression state and later re-enters.

This rule must work regardless of whether the authored waypoint spawn offset happens to be inside or outside the normal waypoint interaction radius.

Create an explicit API/semantic such as:

```text
suppressUntilExit(waypointId, playerPos)
```

or an equivalent robust state transition.

Do not rely on a fragile sequence of `reset()` + guessed `inside=true` that can be invalidated by spawn offset or the next update.

### Existing Waypoint behavior after suppression

After the player has left and later re-entered:

- newly discovered deeper Waypoint: activate/unlock + show prompt,
- already unlocked Waypoint: show extraction/continue prompt normally,
- KEEP GOING still requires leaving/re-entering before reprompt,
- selecting a Waypoint as the run start never counts as a newly discovered Waypoint.

---

## 7. Explicit post-start interaction regression

Phase 4A changed Field Tool/harvest availability based on expedition state. Add integration coverage proving the player-facing path, not merely individual modules.

Required sequence:

```text
Camp
→ gate start-selection
→ choose initial Waypoint
→ session active
→ no blocking modal
→ Auto Harvest allowed
→ resource target/focus ring available when in range
→ manual Field Tool swing allowed
→ combat target/focus ring allowed
```

At minimum automated tests should assert the state/input gates. Browser/manual acceptance proves the actual circles/swings are visible.

Do not enable expedition harvesting/combat while in Camp unless separately required by design. Camp being non-combat/non-harvest is acceptable; the important rule is that the transition to active expedition reliably restores the accepted systems.

---

## 8. Dev-only fresh-save reset

Keep `window.__game.clearProgress()` for debug compatibility, but give the human a one-action visual reset for repeated fresh-save testing.

Preferred minimal implementation:

- normal gameplay URL remains clean,
- `?dev=1` enables a tiny dev-only control such as **RESET PLAYER SAVE**,
- confirmation required,
- reset clears only normal Phase 4A player progress/bank and reloads at fresh Camp,
- does not erase Author Mode world draft,
- does not appear in normal `/` or submission-facing play without the dev flag.

An equivalently simple dev-only mechanism is acceptable, but it must not require typing JS into the console.

Document the exact URL/action in README and final human test instructions.

---

## 9. Player-facing Map and anchor wording

Normal player UI must not expose implementation identifiers/coordinates such as:

- `wp_p1_entry`,
- `beacon_p2_01`,
- `0.0,7.2`,
- raw region/internal IDs.

Those may remain available in `?dev=1`, debug text, or Author Mode only.

### Authored display names

Support an optional readable `displayName` on Major Waypoints and Extraction Beacons.

Use one consistent helper/fallback, approximately:

```text
anchor.displayName
→ associated region displayName + type fallback
→ generic "Waypoint" / "Extraction Beacon"
```

Update current prototype anchors with readable placeholder names. Avoid treating these as final lore; they are player-readable labels that can later be renamed in Author Mode.

Examples of acceptable presentation:

```text
Forest Edge
Threshold Rise
Tangled Hollow Beacon
Sunken Rise Beacon
```

### UI usage

Use readable names in:

- CHOOSE START list,
- passive Map,
- Waypoint activation/extraction prompt,
- Beacon prompt,
- recovery/loss card discovery rows,
- frontier indicator label if text is shown.

Example prompt direction:

```text
FOREST EDGE WAYPOINT
Extract to Camp and secure this run, or keep going?

[EXTRACT] [KEEP GOING]
```

New Waypoint:

```text
THRESHOLD RISE ACTIVATED
New expedition start unlocked.
Extract now or keep going?
```

Beacon:

```text
TANGLED HOLLOW BEACON
Extraction available. Secure this run and return to Camp?
```

Keep copy short and mobile-readable.

### Author Mode anchor naming

For selected Waypoint/Beacon/POI anchor data, expose **Display Name** when relevant so the human can rename it without editing JSON.

---

# AUTHOR MODE PREREQUISITES FOR PHASE 4B

## 10. Replace hidden playable ground with authored Ground Patches

Current runtime has hard-coded/global ground geometry/collision plus region visual overlays. That is no longer sufficient for real frontier authoring.

Create a simple authored **Ground Patch** representation.

### Ground Patch requirements

A Ground Patch supports:

- ID,
- region ownership,
- X / Y / Z,
- Width / Depth,
- optional small thickness or a fixed implementation thickness,
- tint/color,
- opacity where sensible,
- Play visibility,
- collision enabled,
- move/resize/duplicate/delete,
- palette placement,
- hierarchy selection,
- Edit proxy/selection behavior,
- deterministic export.

No sculpting. A Ground Patch is just a rectangular authored surface/box suitable for assembling the prototype terrain.

### Migration / backwards compatibility

Migrate the current playable surface into explicit authored Ground Patch data so normal play remains continuous after the hard-coded floor is removed as playable collision.

It is acceptable to represent current rectangular region surfaces as one Ground Patch per region or another small explicit set, as long as:

- authored data is the source,
- the current world still plays the same,
- gaps in authored ground are real gaps rather than secretly supported by a hidden floor.

If a safety/fall-catch surface is retained for debugging, place it far below gameplay and do **not** let it masquerade as normal playable ground.

### Physics

Ground Patch collision must come from the same authored patch transform/size used for rendering.

`Edit visible == Play visible == Rapier collider` when collision is enabled.

---

## 11. Replace hard-coded outer boundary walls with authored Boundary Colliders

`createPhysicsWorld` must no longer automatically create four hidden physical walls solely from `playground.bounds` as the normal gameplay boundary.

Represent the current outer limits as explicit authored boundary objects in `world.json` (or equivalent normalized authored data).

### Boundary Collider behavior

Boundary objects must be:

- selectable in Edit,
- listed in hierarchy,
- movable,
- rotatable where the static-solid contract supports rotation,
- resizable,
- duplicatable/deletable,
- collision-enabled by default,
- hidden in Play by default unless author chooses otherwise,
- visible in Edit through an author-only translucent/wireframe proxy even when hidden in Play.

This lets the human build irregular invisible collision limits and remove/reposition old boundaries.

World/region bounds may still exist for region activation/data ownership. **Region bounds must not silently create physical boundary colliders.**

---

## 12. Static object presentation + collision contract

For static props/ground/boundary families that use the general authorable static path, support these authored properties or clear equivalents:

```text
collisionEnabled: boolean
visibleInPlay: boolean
opacity: 0..1
tint/color: readable hex/color value
```

Defaults must preserve current appearance/behavior when properties are absent.

### Collision enabled

- `true` → Rapier/static collision generated where that object family is collider-capable.
- `false` → no Rapier/static collision for that object.
- switching the field in Edit updates the draft immediately; PLAY/reload reflects it exactly.

This is primarily for static props/ground/boundaries. Do not expose generic collision-off switches for resources/Wildkin if that would break their gameplay semantics.

### Visible in Play

- `true` → normal runtime visual.
- `false` → hidden in normal Play.
- hidden object remains author-visible/selectable in Edit through a clear proxy.

Support useful combinations:

```text
visible=true  collision=true   normal solid prop
visible=true  collision=false  decoration
visible=false collision=true   invisible authored collider
visible=false collision=false  allowed but warn/clearly show in Edit
```

### Opacity

- clamp 0..1,
- update live in Edit,
- runtime material transparency configured correctly when `< 1`,
- opacity must not accidentally change collision.

### Tint/color

- simple material color override only,
- live Edit preview,
- persist through export/reload,
- default subtype color remains when no override is authored,
- do not create a material/texture framework.

### Material instance safety

If current object types share Three.js materials, changing tint/opacity on one authored object must not unintentionally recolor every sibling object. Clone/create per-object material only when an override requires it, or use another safe lightweight method.

Apply Change Closure across representative static families:

- box,
- fence,
- forestBoundary,
- resonator/dropPod where applicable,
- Ground Patch,
- Boundary Collider,
- water/island visual props where the shared visual path makes sense.

Hide controls for families where a property is intentionally unsupported rather than storing ignored values.

---

## 13. Edit-only proxies for hidden objects

Invisible authored collision must remain easy to author.

In EDIT only:

- `visibleInPlay=false` static objects show a translucent/wireframe author proxy,
- proxy uses obvious but non-obstructive styling,
- selection highlight still works,
- hierarchy focus still works,
- proxy does not affect normal Play or exported presentation values.

Boundary Colliders should be especially readable in Edit.

Do not use the gameplay object's authored opacity itself as the only editor indicator; a fully hidden object still needs an author proxy.

---

## 14. Categorize the Author Mode palette

The flat palette is becoming hard to scan. Group it using simple collapsible/native sections. No asset browser framework.

Recommended grouping:

### World
- Ground Patch
- Boundary Collider

### Environment / Props
- Box
- Fence
- Gate
- Forest Boundary
- Water / Island if already authorable
- Drop Pod
- Resonator

### Traversal
- Platform
- Obstacle
- Ladder

### Resources
- Tree
- Rock
- Fiber

### Wildkin
- Rusher
- Spitter

### Frontier / POI
- Major Waypoint
- Extraction Beacon
- POI Chest

Exact labels may vary, but related objects must no longer be one undifferentiated 17+ button grid.

### Hierarchy

Add/retain categories that make Ground and collider-only boundaries easy to find, e.g.:

```text
Region
  Ground
  Boundaries / Colliders
  Props
  Traversal
  Resources
  Wildkin
  Anchors
  POIs
```

Click/focus behavior remains unchanged.

---

## 15. Author inspector requirements

For supported static objects expose only relevant controls.

### Common transform

```text
Region
X / Y / Z
RotY (if supported)
Width / Depth / Height/thickness as relevant
```

### Presentation / Physics

Use clear human labels:

```text
[✓] Visible in Play
[✓] Collision
Opacity  [0.00–1.00]
Tint     [#RRGGBB]   (or native color input + readable value)
```

### Anchor

```text
Display Name
Type
Requires
```

### Ground

Height/thickness can be fixed or hidden if it is not useful; Width/Depth + elevation are required.

### Boundary Collider

Default new boundary:

```text
Visible in Play: OFF
Collision: ON
Opacity/tint values only matter if Play visibility is enabled
```

In Edit it always gets the author proxy.

---

## 16. Validator / world schema closure

Extend normalization/validation only as much as needed.

Validate:

- `camp.playerSpawn` / equivalent finite values,
- optional anchor `displayName` is a string with sane length,
- Ground Patch IDs/transforms/sizes/region ownership,
- Boundary Collider IDs/transforms/sizes/region ownership,
- `collisionEnabled` boolean when present,
- `visibleInPlay` boolean when present,
- opacity finite and clamped/rejected outside 0..1 according to existing validator style,
- color/tint accepted format is deterministic,
- no duplicate IDs across new object families,
- no stale generated world after export/generate.

Do not make author cosmetics block old world files unnecessarily; defaults should normalize legacy entries safely.

---

## 17. Automated regression coverage

Preserve all existing tests.

Add focused tests for:

### Fresh launch / gate

- Camp start is `camp` status with no modal implied by initial overlap.
- authored Camp spawn resolves separately from gate.
- anchor system initialization does not treat initial overlap as a fresh entry.
- leaving then entering Camp gate fires start prompt once.

### Selected-start suppression

For at least initial and deeper Major Waypoint:

- begin run from selected waypoint,
- selected waypoint does not immediately prompt,
- suppression remains while inside starting radius,
- leaving arms it,
- later re-entry prompts normally,
- KEEP GOING still requires leave/re-entry.

### Interaction restore

- after Map start selection closes: gameplay input enabled,
- session active,
- Auto Harvest gate true when enabled,
- manual attack gate true,
- modal block false.

### Player-facing labels

- Map/player prompt helpers prefer `displayName`,
- normal rendered/list model does not require raw IDs/coordinates,
- Beacon remains non-start-selectable.

### Ground

- authored Ground Patch produces matching visual/collider transform and dimensions,
- collision-disabled ground produces no collider,
- exported/reloaded patch deterministic.

### Boundary

- no automatic physical world-edge walls generated from region/world bounds,
- authored boundary produces collider,
- delete/disable collision removes it on next authoritative Play build,
- hidden-in-play boundary remains represented by Edit proxy path.

### Presentation/static collision

Representative box/fence/forestBoundary/Ground/Boundary:

- collision flag respected,
- visibility flag respected,
- opacity/tint normalize and persist,
- one object's tint/opacity override does not mutate sibling materials globally,
- hidden collider still author-selectable via proxy metadata/path.

### Existing guarantees

- one rAF,
- fixed 1/60,
- Rapier only,
- region activation/bounded pools,
- extraction/death/banking idempotence,
- normal player save isolated from Author draft,
- deterministic world generation/check,
- offline/portrait/<35 MB.

---

## 18. Human acceptance checklist — concise and player-readable

Final agent response should adapt exact labels but keep this short.

### Test 1 — Fresh game really starts at Camp

1. Open normal game with `?dev=1` and press **RESET PLAYER SAVE**.
2. After reload, do nothing for several seconds.
3. Expected: you are standing in Camp with control and **no CHOOSE START popup**.
4. Walk through the frontier gate.
5. Expected: **CHOOSE START** opens only when you deliberately enter/cross the gate.

Failure: modal opens on load or before you move into the gate.

### Test 2 — Start Forest Edge and immediately play

1. Choose **Forest Edge**.
2. Expected: teleport to Forest Edge, Map closes, **no extraction prompt opens**.
3. Walk away from the blue Waypoint and harvest a nearby node using Auto Harvest.
4. Manually swing/attack a nearby Wildkin/resource.
5. Expected: accepted harvest/attack rings and interactions work normally.
6. Later walk back into the blue Forest Edge Waypoint.
7. Expected: only now may its named extraction prompt appear.

### Test 3 — Named anchor UI + extraction

1. Reach an Extraction Beacon.
2. Expected: prompt uses a readable Beacon name, not an internal ID.
3. Extract.
4. Expected: Camp result card uses readable names and banking still works.
5. Open Map; normal player view has no coordinates/internal IDs.

### Test 4 — Ground authoring

1. Open `?author=1` → EDIT.
2. In **World**, place a Ground Patch in an obvious open location.
3. Move and resize it live.
4. PLAY and walk on it.
5. Expected: visible ground and collision match exactly.
6. Delete/move an existing Ground Patch and verify the old hidden global floor is not silently supporting the removed area.

### Test 5 — Boundary / invisible collider authoring

1. EDIT → place **Boundary Collider**.
2. Expected: obvious author-only proxy is visible/selectable.
3. PLAY: proxy disappears but collision blocks the player.
4. EDIT → turn Collision OFF → PLAY.
5. Expected: player can pass through.
6. Move/resize/delete an outer boundary and confirm there is no separate hard-coded wall left behind.

### Test 6 — Visibility / collision / tint / opacity

Using a Box or Fence:

1. turn Collision OFF but leave Visible ON → PLAY → visible decoration, player passes through;
2. turn Visible OFF + Collision ON → PLAY → invisible but blocking;
3. change Opacity and Tint → EDIT preview changes live, PLAY matches;
4. confirm neighboring objects did not all inherit the same tint/opacity.

### Test 7 — Palette/hierarchy usability

1. Confirm palette is grouped into clear categories.
2. Confirm hierarchy has Ground and Boundary/Collider entries.
3. Select/focus a hidden boundary through hierarchy and edit it.

Then answer:

> **Does the fresh Camp → start → active expedition flow now feel correct, and is Author Mode ready to shape the real Phase 4B frontier without hidden ground/boundary surprises?**

A human **yes** is required to close Phase 4A/4A.1.

---

## 19. Final agent response requirements

Final response must include only:

1. concise implementation summary,
2. short **Consistency Sweep** naming sibling anchor/static-object paths checked,
3. test / verify / zip results,
4. the 7 human tests above rewritten with actual player-facing names/buttons and no unnecessary coordinates/internal IDs,
5. explicit stop before Phase 4B.

Do not give a long developer-coordinate checklist.
Do not claim human acceptance yourself.

---

## 20. Completion gate

Phase 4A.1 implementation is complete only when:

- fresh launch gives Camp control with no automatic start menu,
- deliberate Camp gate entry opens CHOOSE START,
- selecting any Major Waypoint starts a run without immediate extraction prompt,
- selected start Waypoint prompts only after leave/re-entry,
- accepted harvesting/combat/input works immediately in active expedition,
- dev-only one-action player-save reset exists,
- player-facing Map/prompts/results use readable anchor names and hide IDs/coords,
- Ground Patches are authored/placeable/selectable and own playable collision,
- physical outer boundaries are authored/selectable rather than hard-coded from world bounds,
- static visibility/collision/opacity/tint controls work end-to-end for supported families,
- hidden collider-only objects remain author-visible/selectable in Edit,
- palette is categorized,
- hierarchy includes Ground/Boundary access,
- all shared-contract sibling paths receive a consistency sweep,
- automated tests pass,
- `npm run world:check` passes,
- `npm run verify` passes,
- `npm run zip` passes,
- one-rAF/fixed-step/Rapier/offline/portrait constraints remain intact,
- human acceptance is still pending.

**Stop. Do not begin Phase 4B.**
