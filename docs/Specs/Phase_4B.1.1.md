# Wildkin Frontier — Phase 4B.1.1: Section Toolkit Closure

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B.1.1  
**Base implementation:** `9083ae2825ba506397b566bc89e3285e381ba450` — Phase 4B.1  
**Purpose:** Close a small set of concrete 4B.1 contract gaps before the owner begins serious human-authored Section 1 work in Phase 4B.2.

This is a **repair/closure slice**, not a new systems phase.

Phase 4B.1 successfully established section-local coordinates, explicit active-section runtime isolation, Portal Gates, persistent gate repair, player levels, Jump Pads, parkour state, loot persistence, Author section context, and sparse Camp/Section 1/Section 2 proof shells.

Repository review found four bounded issues that should be corrected now:

1. Jump Pad Author trajectory previews can remain stale when rotation or launch strength changes.
2. Parkour protection can remain active after the player abandons a course inside the same section.
3. Kill/Fail Volumes are not currently scoped tightly enough to the active course.
4. Portal topology uses destination entries but does not yet provide the physical paired endpoint contract needed for human-authored section graphs.

A fifth hardening requirement is included because it is local and directly related:

5. Ruined-gate repair must not leave a partial state if cargo spending or persistent repair fails.

After these are fixed and human-tested, **freeze section-framework work and proceed to Phase 4B.2**.

---

# 1. Core outcome

Phase 4B.1.1 is successful when the owner can trust the toolkit while hand-authoring a real section:

```text
rotate/tune Jump Pad
→ trajectory preview updates immediately
→ Play uses matching physical launch

enter parkour
→ checkpoint
→ fail safely
→ abandon/complete
→ normal expedition death rules resume

Section 1 Portal Gate
⇄
Section 2 Portal Gate
→ both physical endpoints exist
→ arrival is at the receiving endpoint
→ inactive section remains isolated

ruined gate repair
→ either cargo + persistent repair both commit
→ or neither commits
```

No final Section 1 geography/pacing work belongs in this slice.

---

# 2. Read before editing

Implementation agent must read:

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/Specs/Phase_4B.1.1.md`
4. `docs/Specs/Phase_4B.1.md`
5. `docs/ARCHITECTURE.md`
6. `docs/GAME_DESIGN.md`
7. `docs/PROJECT_PLAN.md`
8. `docs/PLAYTEST_NOTES.md`

Then inspect at minimum:

- `src/world/sectionRuntime.js`
- `src/world/portalGateSystem.js`
- `src/world/jumpPadSystem.js`
- `src/world/parkourSystem.js`
- `src/save/frontierProgress.js`
- `src/player/playerController.js`
- `src/main.js`
- `src/author/authorMode.js`
- `src/author/authorUI.js`
- `src/author/authorDraft.js`
- `src/author/authorTypeRegistry.js`
- `src/world/worldRegistry.js`
- `src/world/worldValidator.js`
- `src/world/data/world.json`
- `tests/phase4b1.test.js`

Work directly on `main` per repository instructions.

Do not rewrite working Phase 4B.1 systems unless a change is required by this closure spec.

---

# 3. Locked foundations — do not reopen

Preserve:

- Camp = 100×100 local space.
- Standard expedition section = 50×50 local space.
- Section topology is graph-based, not coordinate adjacency.
- Exactly one gameplay section is active at a time.
- Inactive section static visuals/colliders/resources/Wildkin/interactions remain isolated.
- Camp Frontier Gate is a launcher, not a Major Waypoint.
- Fresh save Camp departure goes directly to the Section 1 arrival endpoint.
- Major Waypoints must be physically discovered before becoming selectable starts.
- Portal travel between expedition sections preserves active run cargo, run XP, health, and expedition state.
- Ruined-gate repair uses current run cargo + player level.
- Repaired frontier progress persists and survives later death.
- Jump Pads are physical launches with no destination magnet.
- Parkour safe failure preserves run cargo/XP and expedition state only while the course is active.
- Loot Chest / Loot Table persistence remains unchanged unless required for course completion integration.
- Matter Attractor keyed-upgrade migration remains unchanged.
- Human owner performs final section layout/pacing.
- AI implementation agent builds reliable tools/contracts only.

---

# 4. Hard scope

Implement only:

1. correct Jump Pad trajectory invalidation/live refresh,
2. explicit Parkour End/Exit author object + runtime behavior,
3. strict course matching for checkpoints, fail volumes, and completion,
4. safe active-course replacement when entering another course,
5. physical portal endpoint pairing for expedition section links,
6. physical Section 1 arrival endpoint for fresh Camp departure,
7. reciprocal Section 1 ⇄ Section 2 proof link,
8. paired-portal validation and Author inspector support,
9. no-partial-state ruined-gate repair,
10. production-path automated regression coverage,
11. real browser Author/runtime verification,
12. truthful documentation update.

---

# 5. Explicit non-goals

Do not implement:

- final Section 1 level design,
- automatic/procedural level generation,
- graphical portal graph editor,
- generic trigger/event scripting,
- generic checkpoint framework,
- quest system,
- full Camp-return/extraction redesign,
- fast travel between arbitrary portals,
- portal loading screens,
- async streaming,
- broad portal VFX polish,
- parkour timers/medals/leaderboards,
- skill tree,
- new Resonator upgrades,
- Wildkin bonding,
- crafting/equipment,
- new combat systems,
- broad Author Mode UX redesign,
- GLB import,
- multiplayer.

---

# 6. Issue A — Jump Pad trajectory preview must refresh from real fields

## Current defect

The Author trajectory preview cache/signature currently watches a noncanonical field equivalent to:

```text
pad.launch
```

The actual Jump Pad contract uses:

```text
pad.rotY
pad.horizontalLaunch
pad.verticalLaunch
```

As a result, moving a Jump Pad can refresh the preview while rotating it or editing launch strengths can leave a stale line.

## Required fix

The preview invalidation/signature must include every value that changes predicted trajectory.

At minimum:

```text
id
pos.x / pos.y / pos.z
rotY
horizontalLaunch
verticalLaunch
```

If trajectory math later consumes another property, its signature must include that property too.

Do not use a fake aggregate field that is not part of the canonical schema.

## Author behavior

Through actual Author UI:

- select Jump Pad,
- change Rotation,
- trajectory rotates immediately,
- change Horizontal Launch,
- trajectory range changes immediately,
- change Vertical Launch,
- trajectory height/flight duration changes immediately,
- drag/move pad,
- preview origin moves immediately.

No reload. No Edit→Play→Edit toggle. No private animation loop.

## Shared math

Continue using `predictJumpPadTrajectory()` or a single equivalent shared pure function.

Do not create separate Author-only trajectory math.

The preview remains approximate because runtime collision and player air input can change actual landing. It must nevertheless use the same base gravity/direction/launch values as runtime.

---

# 7. Issue B — explicit Parkour End / Exit

## Current defect

Parkour currently becomes active when the player enters a Parkour Start and normally clears only when:

- a course reward chest completes it,
- code explicitly calls leave/reset,
- or the player changes section.

A player can therefore enter a course, walk away within the same section, later die somewhere unrelated, and still receive safe parkour respawn.

That violates the intended rule:

> Parkour protection applies only while the player is actually participating in that course.

## New first-class author object

Add:

```text
Parkour End
```

Canonical collection/name may be `parkourEnds` or `parkourExits`; choose one and use it consistently.

Recommended data:

```json
{
  "id": "parkour_end_section_1",
  "courseId": "course_section_1",
  "pos": { "x": 8, "y": 0, "z": -16 },
  "triggerRadius": 1.2
}
```

A sized volume is also acceptable if it fits the existing Author contracts better.

## Runtime semantics

Entering a matching Parkour End while that course is active:

```text
activeCourseId == end.courseId
→ clear active course
→ clear latest checkpoint
→ clear course start state
→ normal expedition death rules resume
```

If no course is active or a different course is active, the End trigger does nothing.

## Course reward completion

A reward chest with matching `courseId` may continue to complete the course.

Completion must be course-scoped:

```text
rewardChest.courseId == activeCourseId
→ complete that course

otherwise
→ do not clear an unrelated active course
```

Do not let any chest with any `courseId` blindly clear parkour state.

## Entering another Parkour Start

If a Parkour Start for Course B is entered while Course A is active:

```text
explicitly switch to Course B
→ Course A protection/checkpoint cleared
→ Course B start becomes new safe point
```

---

# 8. Issue C — strict course scoping

Every course-owned trigger must respect `courseId`.

## Checkpoint

Only update the checkpoint when:

```text
checkpoint.courseId == activeCourseId
```

## Kill / Fail Volume

A Kill Volume only performs safe parkour failure when:

```text
activeCourseId exists
AND volume.courseId == activeCourseId
```

Otherwise use normal fatal behavior.

Required examples:

```text
Course A active + Course A Kill Volume
→ safe parkour respawn

Course A active + Course B Kill Volume
→ normal expedition death

no course active + Course A Kill Volume
→ normal expedition death
```

## Fatal combat/projectile damage

Fatal player damage may continue to call the central parkour fatal interceptor.

After a matching Parkour End/completion clears state, fatal combat/projectile damage must resolve through normal expedition death.

---

# 9. Parkour Author Mode support

Add Parkour End to the existing standardized Author workflow.

Required:

- palette entry,
- AuthorTypeRegistry definition,
- section-scoped placement,
- move/rotate where supported,
- trigger radius/size inspector,
- `courseId` inspector,
- hierarchy entry,
- duplicate/delete,
- undo/redo through existing Author transaction path,
- validation,
- preview marker consistent with other parkour markers,
- no cross-section rehome due to overlapping local coordinates.

Do not create a separate parkour editor.

---

# 10. Issue D — physical Portal endpoint pairing

## Current gap

4B.1 correctly transitions a source gate to:

```text
targetSectionId + targetEntryId
```

but proof topology does not guarantee a **physical receiving Portal Gate**.

Section 2 currently has no corresponding Portal Gate for the Section 1 → Section 2 link.

For human level authoring, a section connection should have identifiable physical endpoints instead of teleporting to a detached invisible entry marker.

## Target contract

For ordinary expedition-section Portal Gates, introduce a direct physical endpoint reference.

Preferred field:

```text
targetGateId
```

Example:

```json
{
  "id": "gate_section_1_to_2",
  "targetGateId": "gate_section_2_to_1",
  "state": "ruined"
}
```

and:

```json
{
  "id": "gate_section_2_to_1",
  "targetGateId": "gate_section_1_to_2",
  "state": "active"
}
```

The registry may derive section ownership from the containing section.

## Reciprocal normal links

For normal expedition ⇄ expedition links:

```text
Gate A.targetGateId = Gate B.id
Gate B.targetGateId = Gate A.id
```

Validation must require the reciprocal link unless an explicitly one-way special role is documented.

Phase 4B.1.1 proof requires Section 1 ⇄ Section 2 to be reciprocal.

## Arrival transform

Destination position/facing must be derived from the receiving physical gate, not from an unrelated landing rectangle.

Use either:

- a small authored `arrivalOffset` / `arrivalFacingYaw` on the receiving gate, or
- a deterministic default offset derived from receiving gate `pos + rotY`.

The player must spawn just outside the receiving trigger.

The exact direction convention must be tested visually and documented.

Prime/suppress the destination gate until the player exits its trigger so there is no instant bounce-back.

---

# 11. Camp launcher special case

The Camp Frontier Gate remains special.

Do **not** redesign extraction/return-to-Camp rules in this slice.

Fresh departure remains:

```text
Camp Frontier Gate
→ no discovered Waypoints
→ direct Section 1 departure
```

But destination must now be a **physical Section 1 frontier/forest-edge gate endpoint**, not a detached invisible entry marker.

Recommended proof object:

```text
gate_section_1_camp_arrival
```

This endpoint may be explicitly marked as a one-way arrival endpoint / non-travel counterpart in 4B.1.1 to avoid inventing new return-to-Camp semantics.

Acceptable minimal concepts include:

```text
role: "arrival"
travelEnabled: false
```

or another equivalent contract.

Requirements:

- owner can see/place the physical arrival gate in Section 1,
- fresh Camp departure arrives at it,
- player appears outside its trigger,
- no instant bounce-back,
- it does not accidentally become extraction,
- it does not open the Camp start map from inside Section 1,
- no new abandon-run mechanic is introduced.

After frontier Waypoints exist, Camp start selection continues to work exactly as in 4B.1.

---

# 12. Legacy targetEntryId compatibility

Do not force a risky all-at-once rewrite if existing tests/data still need `targetEntryId`.

Preferred migration:

```text
new ordinary portals:
  targetGateId = canonical

legacy compatibility:
  targetSectionId + targetEntryId still readable temporarily
```

Runtime resolution priority:

1. resolve `targetGateId` if present,
2. otherwise use legacy target section/entry compatibility path.

New Phase 4B.1.1 proof content must use the physical target-gate path.

Update architecture/docs to mark detached entry targeting as compatibility, not the preferred authoring model.

---

# 13. Portal Author Mode requirements

Expose enough to author/debug links.

At minimum:

- display name,
- state: active / ruined,
- target gate ID,
- min player level,
- resource requirements using current supported representation,
- travel enabled / arrival role only if introduced,
- position,
- rotation.

Do not build a graphical graph editor.

A text/select target-gate control is sufficient.

Broken target IDs must produce readable validation/status.

When the owner selects a gate, its target endpoint must be discoverable without editing raw JSON.

---

# 14. Portal runtime transition safety

Preserve existing 4B.1 transition cleanup.

Before transition:

- clear contextual interaction,
- reset projectiles,
- reset combat transient state as needed,
- reset Field Tool transient swing if needed,
- clear active parkour course,
- reset Jump Pad entry state as appropriate,
- block duplicate portal activation.

After destination activation:

- place player at receiving gate arrival transform,
- update facing,
- reset/prime anchors,
- suppress destination Portal Gate until player exits,
- preserve player health,
- preserve run cargo,
- preserve run XP,
- preserve expedition session/run ID,
- preserve permanent discoveries,
- preserve repaired gates.

Portal travel remains **not extraction**.

---

# 15. Proof topology after closure

Canonical proof world should become conceptually:

```text
Camp — 100×100
  gate_camp_frontier
       |
       | fresh departure / later start selector
       v
Section 1 — 50×50
  gate_section_1_camp_arrival   [physical arrival endpoint]
  wp_section_1
  beacon_section_1
  proof parkour + Parkour End
  gate_section_1_to_2           [ruined]
       ⇅
Section 2 — 50×50
  gate_section_2_to_1           [active receiving/return endpoint]
  wp_section_2
```

Section 1 ⇄ Section 2 must work in both directions after the Section 1 gate is repaired.

The Section 2 return endpoint may be active from the start; it is unreachable until the Section 1 gate is repaired.

Do not add a third expedition section.

---

# 16. Repair persistence semantics for paired portals

Required user-visible behavior:

```text
repair gate_section_1_to_2
→ it becomes usable
→ travel to Section 2
→ gate_section_2_to_1 can return to Section 1
→ later death/reload
→ Section 1 gate remains repaired
→ pair still functions
```

Do not require paying twice from the reverse side.

Do not create separate progression costs for each endpoint of the same connection.

Keep existing `repairedPortalGateIds` if possible. A new link-level persistence shape is optional and should be avoided unless it clearly reduces complexity without risking old saves.

---

# 17. Issue E — ruined-gate repair must be atomic from the player's perspective

## Current risk

The current flow is roughly:

```text
spend cargo
→ persist repaired gate
```

If the second operation fails, cargo may already be gone.

## Required invariant

A rebuild interaction has exactly two valid outcomes.

### Success

```text
requirements satisfied
→ exact cargo deducted once
→ repaired progress recorded once
→ gate active immediately
```

### Failure

```text
requirements fail OR spend fails OR repair commit fails
→ cargo unchanged
→ repaired state unchanged
```

No partial state. No double charging. No free repair. No partial construction.

## Implementation freedom

Use the smallest reliable approach compatible with current inventory/progress ownership.

Acceptable patterns:

- validate → snapshot → mutate → rollback on second failure,
- coordinator with explicit refund callback,
- another clear transactional approach.

Do not move run inventory ownership into frontierProgress.

Do not duplicate run cargo in persistent progress.

---

# 18. Validation changes

World validation must reject:

- missing `targetGateId` for new ordinary paired expedition portals,
- target gate ID that does not exist,
- self-targeting gate,
- non-reciprocal ordinary pair,
- invalid one-way arrival role,
- Parkour End referencing missing/invalid course,
- Kill Volume referencing missing/invalid course when used as parkour fail volume,
- duplicate Parkour End IDs,
- invalid/non-finite Jump Pad trajectory-affecting values,
- invalid arrival offset/facing fields if introduced.

Do not reject the Camp launcher special arrival endpoint solely because it is one-way, as long as its role is explicit and validated.

Do not break intentional legacy `targetEntryId` compatibility fixtures.

---

# 19. Registry / AuthorType requirements

Required:

- Parkour End available through worldRegistry section queries.
- target gate resolution available by ID.
- AuthorTypeRegistry recognizes Parkour End exactly once.
- Portal Gate inspector reads/writes canonical target-gate fields.
- trajectory preview reads canonical Jump Pad fields.
- duplicate/delete/undo/redo remain transactional.
- no direct draft mutation outside established draft/actions contracts.

If a one-way arrival role is added, it remains a first-class Portal Gate object rather than a decorative prop.

---

# 20. Automated tests — pure coverage

Add/extend tests for:

## Jump Pad prediction/invalidation

- changing `rotY` changes predicted direction,
- changing `horizontalLaunch` changes range,
- changing `verticalLaunch` changes arc,
- Author preview invalidation uses those canonical fields.

Prefer an exported pure signature helper if useful.

## Parkour course scoping

- Start A activates A.
- Checkpoint A updates A.
- Kill A during A = safe failure.
- Kill B during A = normal fatal.
- End B during A = no effect.
- End A during A = clears.
- reward chest B during A = does not clear A.
- reward chest A during A = clears A.
- entering Start B while A active replaces A cleanly.

## Portal pairing

- reciprocal pair validates,
- missing target fails,
- self target fails,
- non-reciprocal ordinary pair fails,
- Camp one-way arrival form validates,
- target-gate resolution returns receiving endpoint,
- arrival transform is outside destination trigger.

## Repair atomicity

Test every branch:

- insufficient level → no cargo/no repair,
- insufficient resources → no cargo/no repair,
- spend failure → no cargo/no repair,
- repair commit failure → cargo restored/no repair,
- success → exact cargo spent + repair recorded once,
- repeat interaction → no double spend.

---

# 21. Required production integration coverage

Pure tests are necessary but not sufficient.

## A. Real Author trajectory refresh

Through actual `?author=1` production UI:

1. select Section 1,
2. select Jump Pad,
3. record trajectory endpoint,
4. change rotation via real production action,
5. verify line changes immediately,
6. change horizontal launch,
7. verify range changes,
8. change vertical launch,
9. verify arc changes,
10. do not reload.

Do not prove only `predictJumpPadTrajectory()`.

## B. Parkour abandon path

Production runtime:

```text
start A
→ checkpoint A
→ End A
→ fatal damage / Kill A
→ normal expedition death
```

Also:

```text
start A
→ Kill B
→ normal expedition death
```

and:

```text
start A
→ checkpoint A
→ Kill A
→ safe checkpoint respawn
→ cargo + run XP unchanged
```

## C. Paired Section 1 ⇄ Section 2

Production runtime:

```text
repaired Section 1 outbound gate
→ travel
→ Section 2 active
→ arrive outside gate_section_2_to_1 trigger
→ Section 1 visuals/colliders/AI inactive
→ leave receiving trigger
→ use Section 2 return gate
→ travel back
→ Section 1 active
→ arrive outside source gate trigger
```

Verify:

- no bounce loop,
- run cargo/XP/health survive both directions,
- inactive-section collision isolation remains true.

## D. Camp fresh arrival

Fresh progress:

```text
Camp Frontier Gate
→ no unlocked Waypoints
→ direct Section 1
→ physical Section 1 Camp-arrival endpoint
→ Section 1 Waypoint remains locked
```

After Waypoint discovery, Camp start selection must still work.

## E. Repair failure rollback

Exercise the production portal interaction with injected/mockable repair-commit failure and prove cargo remains unchanged.

Do not satisfy this only with `spendPortalCargo()`.

---

# 22. Human acceptance checklist

## Test 1 — trajectory editor trust

In Author Mode:

- rotate Jump Pad → line rotates immediately,
- Horizontal Launch change → range changes,
- Vertical Launch change → arc changes,
- move pad → origin changes.

Pass: no reload/mode toggle.

## Test 2 — physical Jump Pad

Play it.

Pass:

- direction corresponds to preview,
- stronger horizontal value travels farther,
- stronger vertical value arcs higher/longer,
- player can miss,
- no destination snapping.

## Test 3 — matching parkour failure

Enter course, reach checkpoint, carry cargo, fail on matching hazard.

Pass:

- respawn checkpoint,
- health safe,
- cargo/XP remain,
- run continues.

## Test 4 — parkour abandonment

Enter course, cross Parkour End, then die/fail.

Pass: normal expedition death; no stale parkour rescue.

## Test 5 — wrong-course hazard

Course A active + temporary Course B fail volume.

Pass: B does not rescue to A checkpoint.

## Test 6 — fresh Camp departure

Reset progress and leave Camp.

Pass:

- no pointless start map,
- arrive at physical Section 1 frontier gate,
- outside trigger,
- no bounce,
- Waypoint still undiscovered.

## Test 7 — paired section portal

Repair S1→S2, travel, then return S2→S1.

Pass:

- physical endpoints on both sides,
- clean section swap,
- no inactive content leakage,
- cargo/XP/health preserved,
- no second payment.

## Test 8 — repair persistence

After repair, later die/extract/reload.

Pass: outbound gate remains repaired.

## Test 9 — Author pair editing

Select S1 gate, inspect target; switch S2, inspect reciprocal target; move/rotate endpoints independently.

Pass: links do not depend on global coordinates.

## Test 10 — phone smoke

Portrait phone: Camp→S1, Jump Pad, parkour fail/exit, S1→S2→S1.

Pass: no obvious input/UI/performance regression.

---

# 23. Proof data changes

Keep proof data sparse.

Required only:

- add physical Section 1 Camp-arrival gate endpoint,
- add physical Section 2 return gate paired to Section 1 outbound gate,
- add Parkour End/Exit to proof course,
- keep existing proof Jump Pad/chests/checkpoint/kill volume,
- retain detached entries only where needed for compatibility,
- preserve Camp 100×100 and Section 1/2 50×50 dimensions,
- preserve overlapping-collider isolation proof.

Do not beautify sections. Do not add final content. Do not rebalance.

---

# 24. Migration / compatibility

Existing 4B.1 normal player saves must remain usable.

Preserve:

- repaired `gate_section_1_to_2`,
- Matter Attractor ownership,
- Waypoint/Beacon discoveries,
- loot claims/cooldowns.

No player reset solely because Portal targeting changed.

For old Author drafts containing `targetSectionId + targetEntryId`:

- load if possible,
- preserve editability,
- migrate only when target gate is unambiguous,
- never silently destroy or guess user-authored links,
- show clear validation if ambiguous.

---

# 25. Documentation

Update truthfully:

- `docs/ARCHITECTURE.md`
- `docs/BUILD_LOG.md`
- `docs/CURRENT_SLICE.md`
- `docs/PLAYTEST_NOTES.md` only for actual automated browser evidence, labeled automated
- `docs/Specs/Phase_4B.1.md` may receive a small closure pointer

Do not mark Phase 4B.2 active.

Do not mark human acceptance without owner confirmation.

---

# 26. Implementation order

## Pass A — characterize + regressions

- run current tests,
- confirm base 4B.1 behavior,
- add failing focused regressions for each reviewed defect.

## Pass B — trajectory closure

- fix preview invalidation,
- production Author proof.

## Pass C — parkour closure

- add Parkour End,
- strict course scoping,
- active-course replacement,
- production runtime proof.

## Pass D — portal endpoint closure

- target-gate resolution,
- Section 1 Camp-arrival endpoint,
- Section 2 reciprocal endpoint,
- destination arrival/suppression,
- validation + Author inspector,
- legacy entry compatibility.

## Pass E — repair atomicity

- no partial mutation,
- failure-path production tests.

## Pass F — browser/docs

- real Author/runtime flows,
- phone/portrait automation if available,
- update docs,
- stop.

---

# 27. Automated gates

Run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Verify:

- generated world synchronized,
- no new runtime network dependency,
- one looping first-party rAF,
- inactive-section collision isolation still passes,
- Jump Pad remains physical/no landing magnet,
- portal travel does not extract,
- paired gate arrival cannot bounce immediately,
- gate repair cannot partially mutate,
- parkour safe failure is course-scoped,
- old save migration remains valid,
- ZIP comfortably below 35 MB.

If a command cannot run, report the limitation rather than claiming success.

---

# 28. Required final implementation report

Report:

1. files changed,
2. trajectory preview root cause/fix,
3. production Author trajectory proof,
4. Parkour End schema/workflow,
5. course matching rules,
6. stale parkour prevention,
7. portal pair schema,
8. Camp→physical S1 arrival behavior,
9. S1⇄S2 behavior,
10. destination trigger suppression,
11. legacy `targetEntryId` compatibility,
12. atomic repair strategy,
13. save compatibility,
14. automated test results,
15. browser scenarios actually run,
16. ZIP result/size,
17. anything unproven,
18. human checklist.

Do not claim human acceptance.

Do not start Phase 4B.2.

---

# 29. Stop condition

Stop when:

- Jump Pad trajectory updates immediately for position, rotation, horizontal launch, and vertical launch edits.
- Parkour End clears protection.
- wrong-course Kill Volumes cannot safe-respawn another course.
- matching fatal course failure still preserves run state.
- entering a new course clears stale prior course state.
- Section 1 has a physical Camp-arrival gate endpoint.
- Section 1 ⇄ Section 2 uses physical paired Portal endpoints.
- portal arrival cannot instantly bounce back.
- repaired gate persists and reverse travel does not require second payment.
- repair failure cannot consume cargo without repair.
- section isolation still works.
- old player saves still load.
- automated gates pass.
- real Author/runtime browser flows pass.

Then leave:

```text
Phase 4B.1.1 = IMPLEMENTED / HUMAN ACCEPTANCE PENDING
```

and wait for owner playtest.

Only after owner acceptance move to:

```text
Phase 4B.2 — Human-Authored Section 1 Vertical Slice
```
