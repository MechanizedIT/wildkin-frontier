# Wildkin Frontier — Phase 3.5B: Minimal Author Mode & Area 1 Skeleton

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.5B  
**Purpose:** Give the human developer a fast way to shape and replay the first directed expedition without editing gameplay coordinates.

This is a **developer-tooling + rough-layout slice**, not Phase 4 gameplay or art polish.

Phase 3.5A is accepted. Preserve its ExpeditionSession, world registry/validation, region activation, bounded pools, validated gameplay, single rAF/fixed step, Rapier, portrait, and offline build.

---

## 1. Player/developer-visible outcome

At the end of this slice:

- exactly **one authoritative authored world source** exists,
- static/traversal geometry, resources, creatures, anchors, and POIs derive from it,
- desktop dev-only Author Mode can place/select/move/rotate/elevate/resize/duplicate/delete the Area 1 object types,
- region/pocket and anchor/POI properties can be edited,
- Edit ↔ Play is one quick workflow and preserves the working draft,
- authored data exports deterministically back to the repo,
- a rough Camp + 3–4-pocket Area 1 skeleton exists and can be walked end-to-end,
- normal gameplay/regressions still work.

Core question:

> **Can a human reshape the first expedition, immediately play it, and export the result without asking an agent to change coordinates?**

---

## 2. Hard scope

Implement only:

1. eliminate world-data mirror drift,
2. instantiate static/traversal world from normalized authored data,
3. minimal desktop dev-only Author Mode,
4. mutable validated author draft,
5. quick Edit ↔ Play,
6. deterministic export workflow,
7. rough Camp + Area 1 skeleton,
8. placeholder anchor/POI/Camp visuals needed to judge placement,
9. tests/docs/Build Log.

Do **not** implement:

- map UI or gate start-selection UI,
- extraction/banking or EXTRACT / KEEP GOING,
- waypoint discovery persistence,
- result/loss cards,
- Matter Resonator gameplay,
- bonding/capture/companions/mounts,
- skill tree/equipment/base-building gameplay,
- final Area 1 content/balance/art,
- production editor framework, full undo/redo, scripting, asset browser,
- procedural world generation, A*/navmesh, async/network streaming,
- mobile authoring.

**Phase 4 owns the first complete Camp → expedition → extract/die → Camp gameplay loop.**

---

## 3. Fix the Phase 3.5A authoring duplication first

Current state has:

- `src/world/data/world.js`,
- `src/world/data/world.json`,
- static/traversal placement still repeated in `createMovementPlayground.js`.

Do not build an editor on top of three coordinate copies.

Required pipeline:

```text
ONE authored source
  → normalize / validate
  → runtime registry / world builder
  → traversal + props + resources + creatures + anchors + POIs
```

Prefer `world.json` as the human/editor export format.

If native JSON module loading is awkward in dev, use a tiny deterministic generator/pre-step:

```text
world.json
  → world.generated.js
  → runtime import
```

A generated file is allowed. A second manually maintained mirror is not.

Add a test/build guard that detects stale generated data if generation is used.

---

## 4. Data-driven static world builder

Resources/creatures already use world data. Convert the remaining authored world placement so the same normalized data drives at minimum:

- ground / walkable region surfaces,
- generic props,
- platforms,
- box obstacles/barriers,
- climbables/ladders,
- jump traversal metadata,
- Camp fence/gate/drop-pod/Resonator placeholders,
- Major Waypoint placeholders,
- Extraction Beacon placeholders,
- POI placeholders.

Existing movement/traversal APIs may remain if safer, but their coordinates/geometry must derive from normalized world data.

Moving a platform in Author Mode must move **both its visible mesh and collision/traversal source**. Do not redesign accepted movement.

---

## 5. Author Mode

Enable explicitly in development, preferably:

```text
?author=1
```

Requirements:

- desktop-focused,
- hidden/inert during normal play,
- normal gameplay never depends on editor state/DOM,
- one rAF remains authoritative,
- Edit mode may pause/suppress player combat/harvest/AI input,
- Play mode restores normal gameplay,
- A/T/D/S temperament markers default **OFF** in normal play and may be available in author/debug mode.

### Minimal UI

A plain compact panel is enough:

```text
[EDIT / PLAY]
Palette
Selected object
Region / pocket
Transform / size
Type-specific properties
Duplicate | Delete
Validate | Export
Reset Draft From Repo
```

### Scene editing

Support:

- click/raycast selection,
- visible selection highlight/marker,
- place from palette,
- move X/Z,
- elevate Y,
- rotate Y,
- resize supported objects,
- duplicate/delete.

No full transform-gizmo dependency is required. Prefer robust simple controls:
- drag on ground plane and/or keyboard nudge,
- numeric inputs for precision.

Provide simple near-top-down editor pan + zoom; no orbit/free-fly system required.

---

## 6. Required palette/object types

Only what Camp + Area 1 needs:

### World/traversal
- generic box/prop,
- forest-boundary placeholder,
- fence segment,
- gate,
- platform,
- obstacle/barrier,
- climbable/ladder.

### Gameplay placement
- tree,
- rock,
- fiber,
- Rusher spawn,
- Spitter spawn.

### Expedition placeholders
- Major Waypoint,
- Extraction Beacon,
- POI,
- drop pod,
- Matter Resonator.

A generic `prop` with subtypes is fine. Do not build an asset ecosystem.

---

## 7. Editable properties

Common:

```text
id
type/subtype
regionId
pocketId if used
position x/y/z
rotationY
dimensions/scale where supported
```

Creature spawn:
- creature type,
- temperament,
- home position,
- roam/notice/personal-space/leash,
- existing species/hostility fields when applicable.

Anchor:
- `majorWaypoint` or `extractionBeacon`,
- id,
- region/pocket,
- position.

POI:
- id/type/position,
- `requires` metadata.

Region/pocket:
- id/display name,
- bounds/activation volume,
- neighbors,
- existing depth/order metadata.

Do not expose every gameplay tuning constant.

---

## 8. Draft, validation, Edit ↔ Play

Author Mode edits a **mutable clone** of authored data, never module constants directly.

Allowed dev persistence: `localStorage` / `sessionStorage`.

Normal play ignores drafts unless Author Mode is explicitly enabled.

Every Apply/Play/Export must run through the same world validator.

Invalid data must show a useful author error.

Provide:

- **Reset Draft From Repo**
- deterministic unique IDs for duplicated objects.

### Edit → Play

```text
edit layout
→ Apply / Play
→ immediately test that draft in real gameplay
```

### Play → Edit

```text
return to Edit
→ same draft remains
→ continue adjusting
```

Hot rebuild is welcome but not required. A fast one-action local reload is acceptable if it preserves the draft.

Applying a changed draft must not leave:
- duplicate Rapier colliders,
- duplicate resources/creatures,
- stale projectiles/pickups/XP,
- stale region state.

Reset ExpeditionSession and place the player at a valid authored test/start point as needed.

---

## 9. Deterministic export

Provide **Export world JSON** via download and/or clipboard.

Export must:

- use stable formatting/order,
- contain schema version,
- remove transient editor/runtime fields,
- pass normalize/validate,
- reproduce the same world when loaded again.

The browser does not need permission to write directly to Git.

If generation is used, document one obvious workflow, e.g.:

```text
Export world.json
→ replace src/world/data/world.json
→ npm run world:generate
→ npm test / verify
```

---

## 10. Rough Camp + Area 1 skeleton

Use the new authoring/data path itself to build this. It is a **spatial proof**, not final level design.

Target:

```text
CAMP
 ↓ gate
POCKET 1 — comfort / Forest Edge
 ↓
POCKET 2 — complication
 ↓
POCKET 3 — temptation
 ↓
POCKET 4 — deeper/riskier threshold
 ↓
NEXT MAJOR WAYPOINT
```

The frontier should be a chain of **wide exploration pockets connected by shorter readable routes**. It must not read as an endless runner, narrow corridor, or giant open field. Player can turn around everywhere.

### Camp placeholder

Include:
- clearing,
- drop pod,
- small Matter Resonator,
- basic perimeter fence,
- one obvious frontier gate,
- dense/tall forest boundary that is visually distinct from harvestable trees.

No Camp interaction yet.

### Area 1 placeholders

Include:
- first Major Waypoint near Area 1 start,
- 1–2 Extraction Beacon placeholders for future pacing,
- next Major Waypoint at the far/deeper threshold,
- current resources distributed through pockets,
- current creatures/temperaments redistributed enough to exercise the route,
- at least one memorable locked early POI.

Preferred locked POI:

```text
small pond / impassable-water placeholder
 → island
 → visible chest
 → requires: { type: "companionAbility", id: "swim" }
```

Do **not** implement swimming, companion abilities, chest rewards, or unlock behavior.

Pacing intent only:
1. comfort,
2. complication,
3. temptation,
4. rising danger/value,
5. aspirational deeper Waypoint.

Phase 4 owns final 5–10 minute pacing and risk/extraction behavior.

---

## 11. Placeholder readability + region overlays

Simple geometry/colors/icons are enough.

In Play/author testing, Major Waypoint, Extraction Beacon, POI, Camp gate should be visually distinguishable.

In Edit mode show:
- region/pocket ID,
- bounds/activation overlays,
- selected object's owning region/pocket.

Camp must participate coherently in the world/activation model.

Keep AABB region activation unless the real skeleton proves it insufficient.

---

## 12. Required automated tests

Preserve all prior tests.

Add focused coverage for:

### Single source
- authored source deterministically produces runtime world,
- stale generated data fails if generation is used,
- static/traversal objects no longer require a second manual coordinate list.

### Author model
- transform edit updates draft,
- duplicate gets unique ID,
- delete removes only target,
- invalid duplicate/reference/region data fails,
- deterministic export is byte-stable,
- transient fields are excluded.

### Runtime application
- moving platform/obstacle changes visual + collision source,
- ladder/jump metadata still works from authored data,
- resources/creatures instantiate once after Apply/Play,
- repeated Edit ↔ Play creates no duplicate colliders/entities.

### Isolation
- normal mode ignores author UI/draft,
- Edit mode suppresses conflicting gameplay input,
- Play restores gameplay input,
- one rAF remains.

### Area 1
- Camp + 3–4 frontier pockets exist,
- neighbor graph validates,
- first + next Major Waypoints exist,
- Extraction Beacon placeholder(s) exist,
- swim-gated POI metadata exists,
- all entities validate inside assigned bounds.

---

## 13. Human acceptance test

Agent final response must give exact controls/URL.

### A. Author Mode
Open Author Mode. Confirm editor panel + region overlays appear and normal attack/harvest input does not interfere.

### B. Static geometry
Move/resize/rotate a platform or obstacle → Apply/Play.
Expected: mesh and collision move together. No old invisible collider.

### C. Resource
Move/duplicate a resource → Play.
Expected: exactly one authored instance per ID, harvest still works, region activation still freezes distant node.

### D. Creature
Move a Wildkin spawn/home and change temperament → Play.
Expected: exactly one creature at edited location and existing behavior still works.

### E. Frontier structure
Move one Major Waypoint, one Extraction Beacon, and the pond/island POI.
Expected: types remain visually distinct and export with correct ownership.

### F. Full route
Walk Camp → gate → all rough Area 1 pockets → next-Waypoint threshold, then backtrack.
Expected:
- readable directed route with local freedom,
- no missing ground/collision,
- clean region transitions,
- no gameplay extraction/map prompts yet.

### G. Export round trip
Make one edit → export → reset draft → load/check in exported world using documented workflow.
Expected: same edit reproduces.

---

## 14. Architecture/performance guardrails

- one authored source,
- one rAF,
- fixed 1/60 gameplay,
- Rapier only,
- `main.js` stays composition/wiring,
- editor logic in focused dev/editor modules,
- world instantiation in world modules,
- gameplay systems do not depend on editor DOM,
- region manager remains activation owner,
- no parallel physics/editor world,
- no unnecessary dependencies,
- no runtime external network requests,
- inactive AI remains frozen,
- pools remain bounded,
- no normal-play per-frame DOM creation,
- submission stays <35 MB/offline/portrait-safe.

---

## 15. Documentation

Update:

- `docs/ARCHITECTURE.md` with actual single-source pipeline and Author Mode modules/workflow,
- `README.md` with Phase 3.5B state and Author Mode launch/export instructions,
- `docs/BUILD_LOG.md`,
- `docs/PROJECT_PLAN.md` only if the Phase 4 handoff materially changes.

Do not record implementation claims in `PLAYTEST_NOTES.md` as human observations.

---

## 16. Completion gate

Phase 3.5B is done only when:

- Phase 3.5A and gameplay regressions remain good,
- one authoritative authored world source exists,
- static/traversal placement uses it,
- required Author Mode operations work,
- region/pocket + anchor/POI properties are editable,
- Edit ↔ Play preserves draft without duplicate runtime objects,
- deterministic export round-trips,
- rough Camp + 3–4-pocket Area 1 skeleton exists,
- first/next Major Waypoint, Extraction Beacon(s), and locked swim POI placeholders exist,
- route is fully walkable/backtrackable without collision holes,
- region activation still works,
- automated tests pass,
- `npm run verify` passes,
- `npm run zip` passes,
- offline / portrait / single-rAF / fixed-step / Rapier constraints remain intact,
- human authoring test passes.

Then stop.

**Do not start Phase 4 gameplay in the same session.**
