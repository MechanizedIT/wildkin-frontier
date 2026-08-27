# Wildkin Frontier — Phase 4B.1: Section Framework & Level-Design Toolkit

**Status:** IMPLEMENTED IN `9083ae2` — CLOSURE FOLLOW-UP REQUIRED  
**Active slice:** Superseded by Phase 4B.1.1  
**Purpose:** Replace the stopped continuous-strip level assumption with a reusable portal-connected section framework so the owner can hand-build levels from standardized systems instead of asking AI to invent level layout/pacing.

> **Phase 4B.1.1 closure note — 2026-08-27:** Repository review after `9083ae2` found bounded toolkit issues: stale Jump Pad trajectory invalidation, stale/insufficiently scoped parkour protection, missing physical paired Portal endpoints, and a gate-repair partial-state risk. Implement `docs/Specs/Phase_4B.1.1.md` before owner-authored Phase 4B.2 level composition.

Phase 4B.0 remains owner-accepted for now. The stopped Phase 4B first pass contains useful implementation work, especially Matter Attractor I, some reusable assets/content IDs, and tests. **Do not revert the whole commit.** Preserve useful systems while replacing the continuous "Crescent Basin" world layout and destination-hardcoded jump authoring model.

---

# 1. Core outcome

Phase 4B.1 is successful when the owner can open Author Mode and work with a predictable world grammar:

```text
Camp — 100 × 100
  ↓ Camp Frontier Gate

Section 1 — 50 × 50
  ├ entry portal
  ├ discoverable Waypoint
  ├ Extraction Beacon
  ├ secret Loot Chest
  ├ simple Parkour Course
  ├ Jump Pad
  └ ruined Portal Gate → Section 2

Section 2 — 50 × 50
  ├ entry portal
  └ discoverable Waypoint
```

The proof shells should be intentionally sparse. They exist to prove systems and authoring workflows, **not to substitute for owner level design**.

The next slice, Phase 4B.2, is where the owner hand-authors Section 1 geography, encounter placement, resource rhythm, secret placement, parkour layout, landmarks, and final pacing.

---

# 2. Design responsibility split

This is a permanent workflow decision.

## AI / implementation agent owns

- robust reusable systems,
- schemas/contracts,
- persistence,
- editor controls for standardized objects,
- validation,
- read-only design summaries,
- starter Visual Assets,
- automated tests,
- browser verification of actual interactions.

## Human owner owns

- final section geography,
- routes and visual composition,
- resource placement,
- Wildkin placement,
- secret placement,
- parkour composition,
- landmarks,
- extraction/Waypoint placement,
- encounter pacing,
- balance feel.

Do not implement automatic section population, procedural level design, auto-balancing placement, or an AI-generated finished Section 1.

---

# 3. Locked foundations

Preserve:

- Phase 4A Camp ↔ expedition lifecycle,
- extraction banking / death loss,
- run cargo and XP,
- Map inspect/start modes,
- Major Waypoint persistence,
- Extraction Beacons,
- Field Tool harvesting/combat,
- Wildkin ecology/temperaments,
- Rapier character/collision ownership,
- Author Object contract,
- VisualRef / VisualFactory,
- Visual Asset workbench and gameplay roles,
- custom resource drops,
- one looping first-party rAF,
- offline/local submission constraints,
- readable/unminified first-party code,
- submission comfortably below 35 MB.

Do not reopen generic Author Object or Visual Asset architecture unless required by this slice.

---

# 4. Hard scope

Implement only:

1. standard section/camp spatial grammar,
2. section-local authored coordinates,
3. explicit active-section runtime ownership,
4. portal-connected topology independent of physical adjacency,
5. Camp Gate fresh-start semantics,
6. paired active/ruined Portal Gates,
7. persistent gate rebuilding with player-level/resource requirements,
8. discoverable per-section Major Waypoints,
9. dedicated first-class Jump Pad,
10. Parkour Start / Checkpoint / Kill Volume + safe course respawn,
11. reusable Loot Chest + Loot Table + one-time/refill persistence,
12. centralized player level derived from banked XP,
13. migrate Matter Attractor I persistence toward a keyed upgrade model,
14. section profile metadata,
15. read-only Author section summary,
16. sparse proof Camp + Section 1 + Section 2 shells,
17. migration/removal of the stopped continuous-strip proof layout from canonical runtime data,
18. production-path automated tests + real Author/browser verification.

---

# 5. Explicit non-goals

Do not implement:

- finished Section 1 level design,
- automatic level generation,
- procedural section population,
- AI encounter composition,
- full skill tree,
- multiple new Matter Resonator upgrades,
- bonding/capture,
- companions/mounts,
- crafting,
- equipment/loadouts,
- ranged player weapon,
- Camp plot unlocking/building UI,
- multiple finished frontier sections,
- async/network asset streaming,
- generic event scripting,
- quest system,
- generic checkpoint framework outside parkour,
- generic trap editor,
- physics mesh collision,
- GLB import,
- multiplayer,
- broad UI/art polish.

---

# 6. Standard spatial grammar

Adopt these canonical authoring dimensions:

```text
BASE_CELL_SIZE = 50
STANDARD_SECTION = 50 × 50
CAMP = 100 × 100
FUTURE_CAMP_PLOT = 25 × 25
```

Large/special future sections may use multiples of 50, but Phase 4B.1 proof expedition sections are 50×50.

## Section-local coordinates

Expedition sections should no longer need globally unique map coordinates.

Preferred canonical convention:

```text
standard section local bounds:
X = -25 .. +25
Z = -25 .. +25

Camp local bounds:
X = -50 .. +50
Z = -50 .. +50
```

Objects inside a section use **section-local coordinates**.

This means Section 1 and Section 2 may both contain an object at `{x: 4, z: -8}` without spatial conflict because only the active section is live in normal gameplay.

Object IDs remain globally unique.

## Migration note

The existing `regions` structure may be evolved or adapted rather than renamed everywhere at once if that minimizes risk.

However, runtime behavior and new code should speak in terms of **section identity**:

- `sectionId`,
- active section,
- destination section,
- section entry,
- section profile.

Compatibility aliases such as legacy `regionId` are acceptable internally during migration, but new gameplay contracts must not depend on coordinate overlap or position-based region discovery.

---

# 7. Canonical section contract

The exact JSON shape may vary to fit current normalization, but canonical data must express this concept:

```text
section {
  id
  displayName
  size: { width, depth }

  sectionProfile: {
    tier
    recommendedLevel: { min, max }
    resourceValueTarget?
    wildkinCountTarget?
    wildkinLevelTarget?
    expected?
  }

  entryPoints[]
  props[]
  resources[]
  creatures[]
  traversal
  majorWaypoints[]
  extractionBeacons[]
  portalGates[]
  pois[]
  parkourCourses[]
  lootChests[]
  groundPatches[]
  boundaryColliders[]
}
```

For Phase 4B.1, proof sections should have explicit ground/boundaries sized to their canonical section dimensions rather than relying on global world bounds.

---

# 8. SectionRuntime — explicit active-section owner

The current `regionManager` is not sufficient as the final architecture because it derives current region from player position and the static builder constructs broad world content.

Introduce one explicit runtime owner conceptually equivalent to:

```text
SectionRuntime
  activate(sectionId, entryId?)
  getActiveSectionId()
  isSectionActive(sectionId)
  transitionThroughPortal(portalId)
```

The exact module name may differ, but there must be **one clear owner** for active section state.

## Required runtime behavior

During normal gameplay:

- Camp is active while player is at Camp.
- Exactly one expedition section is active at a time.
- Only active-section static visuals are visible.
- Only active-section static collision is enabled/present.
- Only active-section resources and Wildkin simulate.
- Only active-section anchors/POIs/Jump Pads/parkour triggers/loot interact.
- Inactive-section objects do not block Rapier queries despite overlapping local coordinates.
- Inactive-section pickups/projectiles/XP do not leak into the active section.
- transitions are deterministic and synchronous for the prototype.

Do not build async streaming.

## Implementation freedom

The existing static world / Rapier pipeline may be adapted using:

- per-section roots + collider enable/disable,
- or bounded destroy/rebuild at section transition,
- or another simple verified approach.

Choose the smallest reliable solution.

The contract must allow future lazy instantiate/unload optimization without changing authored section data.

---

# 9. Portal Gate system

Portal Gates define frontier topology.

## Canonical gate model

Conceptually:

```text
portalGate {
  id
  displayName?
  pos
  rotY
  visualAssetId?

  entryId
  targetSectionId
  targetEntryId

  state: "active" | "ruined"

  requirements?: {
    minPlayerLevel?: number
    resources?: {
      resourceId: integerAmount
    }
  }
}
```

A pair does not need to reference each other symmetrically in storage if validation can resolve the link, but the authored graph must be deterministic and valid.

## Active gate

When player intentionally enters/interacts with an active Portal Gate:

1. block duplicate input,
2. clear/resolve unsafe transient movement state,
3. activate destination section,
4. move player to target entry position/facing,
5. update active section,
6. re-prime anchors/triggers,
7. preserve active expedition session/cargo/XP/health unless explicitly documented otherwise,
8. resume control.

Portal transition is **not extraction** and does not bank cargo.

## Ruined gate

A ruined gate is a permanent progression sink.

Requirements may include:

- `minPlayerLevel`,
- carried run resources.

Interaction panel should communicate:

```text
RUINED FRONTIER GATE
Requires Level 3

Repair:
Wood 10/12
Stone 8/8
Iron Ore 2/4

[REBUILD]
```

Exact proof costs should be modest and chosen to test the system, not final balance.

## Resource source for repair

Use **current run cargo**, not banked Camp resources, for Phase 4B.1 proof.

On successful rebuild:

- deduct exact required cargo once,
- mark gate repaired in persistent frontier progress,
- repaired state persists across extraction/death/reload,
- spent resources are effectively secured into the gate and are not refunded/lost on later death,
- gate becomes active immediately.

If player lacks level/resources, no partial deduction occurs.

Do not add partial construction stages in this phase.

---

# 10. Camp Gate / first-launch semantics

The Camp Frontier Gate is a Portal Gate / expedition launcher, **not a Major Waypoint**.

Fresh save behavior:

```text
Camp Gate
→ no discovered frontier Waypoints
→ immediately transition to Section 1 default entry
```

Do not open a meaningless start-selection map with only one undiscovered option.

After the player has discovered at least one frontier Waypoint:

```text
Camp Gate
→ start-selection map
→ choose among discovered/unlocked Major Waypoints
```

Starting from a Waypoint activates that Waypoint's section and places player at its runSpawn.

The Camp Gate itself must not appear as a selectable Major Waypoint.

---

# 11. Major Waypoint semantics

A standard expedition section should normally have one Waypoint.

Required behavior:

- Section 1 Waypoint is **not unlocked on fresh save**.
- Player must physically discover/activate it during the expedition.
- Discovery permanently adds it to selectable expedition starts.
- Discovery should survive later death.
- Starting at a Waypoint places player in that section.
- Waypoint start must suppress immediate self-trigger exactly as current 4A start suppression does.
- Waypoint IDs remain stale-filtered against canonical world data.

Section 2 proof Waypoint follows the same rule.

Extraction Beacons remain extraction-only and never become starts.

---

# 12. Map model

Do not build a large graphical map editor.

Update the player Map enough to reflect section semantics:

- Camp shown as home,
- discovered sections/Waypoints shown,
- discovered Beacons shown as extraction-only information,
- known Portal connections may be shown textually or simply represented by section grouping,
- only discovered Major Waypoints are selectable starts,
- ruined/unreached Section 2 does not become a start merely because its gate is visible,
- fresh save does not list Section 1 Waypoint as unlocked before discovery.

The long-term map is a **section graph**, not a literal continuous X/Z map.

Keep Phase 4B.1 UI minimal.

---

# 13. Dedicated Jump Pad

Replace the current proof pattern:

```text
visual launch pad prop
+
separate jumpTraversal trigger/direction/landing rectangle
```

with one first-class authorable Jump Pad.

## Data

Conceptually:

```text
jumpPad {
  id
  pos
  rotY
  triggerRadius or triggerSize
  horizontalLaunch
  verticalLaunch
  cooldown?
  visualAssetId?
}
```

Use the existing frontier launch-pad Visual Asset as the default proof model if useful.

## Runtime

When a valid player enters the pad trigger:

- derive horizontal launch direction from `rotY`,
- apply authored horizontal/vertical launch values,
- enter normal airborne traversal state,
- preserve ordinary air control rules where appropriate,
- do not require a destination platform,
- do not magnetically correct to a landing rectangle.

The player can miss.

## Author preview

Author Mode should show an editor-only predicted trajectory / approximate landing marker based on the same gravity/launch math.

Requirements:

- updates live with position/rotation/launch changes,
- clearly editor-only,
- does not create runtime collision,
- does not become a hardcoded target,
- no private animation loop.

Legacy `jumpTraversals` may remain supported temporarily for old data/tests, but Phase 4B.1 proof parkour must use Jump Pads.

---

# 14. Parkour Course contract

Add a deliberately small optional challenge system.

## Canonical concepts

### Parkour Start

Defines:

- courseId,
- trigger volume,
- initial respawn point/facing.

Entering starts the course state.

### Parkour Checkpoint

Defines:

- courseId,
- trigger volume,
- respawn position/facing.

Touching it updates the active course checkpoint.

### Kill / Fail Volume

Defines a volume that causes fatal/fail behavior.

If no parkour is active, it uses normal expedition death.

If a matching parkour course is active, it triggers safe course respawn.

## Runtime owner

One small owner should track:

```text
activeCourseId
latestCheckpoint
courseStartState
```

Do not encode this state independently in each hazard.

## Safe parkour failure

While a course is active, a fatal course failure:

- does NOT resolve expedition death,
- does NOT return to Camp,
- does NOT bank cargo,
- does NOT remove run cargo or XP,
- restores player health to a safe defined amount/full,
- clears dangerous transient projectiles/attack state as needed,
- respawns player at the latest matching checkpoint,
- reprimes course triggers to avoid loops.

Normal Wildkin/projectiles may also cause this safe failure while the course is active.

## Exit / completion

The proof course may complete when the reward chest is reached/opened or through an explicit completion trigger.

On completion/exit:

- clear active parkour state,
- normal expedition death rules resume.

Do not build medals/timers/leaderboards.

---

# 15. Loot Chest + Loot Table

Implement one reusable loot system.

## Loot Table catalog

Canonical top-level catalog conceptually:

```text
lootTables: [
  {
    id
    displayName
    rewards: [
      { type: "resource", id: "iron_ore", amount: 2 },
      { type: "xp", amount: 10 }
    ]
  }
]
```

Keep Phase 4B.1 reward types narrow:

- resources,
- XP.

Do not add equipment/items/rarity-roll architecture yet.

Deterministic fixed rewards are acceptable for the proof.

## Loot Chest

Conceptually:

```text
lootChest {
  id
  pos
  rotY?
  visualAssetId?
  lootTableId
  refillSeconds?: number | null
}
```

Behavior:

- interact/open near chest,
- grant reward to **run cargo/run XP**,
- one-time chest with no refill remains claimed persistently,
- repeatable chest stores next available timestamp,
- unavailable chest communicates cooldown/empty state clearly,
- no duplicate reward from repeated interaction.

Use one shared chest implementation for both secret and parkour chest.

## Proof

Section 1 proof includes:

- one one-time secret chest,
- one repeatable parkour completion chest with a short/dev-friendly verification cooldown or clearly testable clock injection.

Production default refill should represent a long revisit timer, but tests must not sleep in real time.

---

# 16. Player level foundation

Current `bankedXp` remains authoritative persistent XP.

Add a pure central player-level derivation.

Example API:

```text
getPlayerLevel(bankedXp)
getXpForLevel(level)
```

Exact curve may be simple.

Requirements:

- Level 1 on fresh save,
- monotonic deterministic curve,
- no level loss on death,
- gate requirement checks use this single function,
- UI can display current level where needed,
- tests cover thresholds.

Do not add skill points or a skill tree.

---

# 17. Matter Resonator persistence migration

Preserve the implemented Matter Attractor I effect and purchase flow where it still works.

Migrate persistence toward:

```text
upgrades: {
  matter_attractor: 1
}
```

Requirements:

- old saves with `matterAttractorI: true` load as `upgrades.matter_attractor >= 1`,
- old false/missing saves load as 0,
- no player loses a purchased upgrade,
- purchase remains idempotent,
- runtime pickup tuning reads the keyed upgrade level,
- UI behavior remains understandable,
- no second upgrade is required.

If compatibility requires temporarily writing both shapes, keep one canonical internal owner and document the migration.

---

# 18. Persistent frontier progress additions

Extend the existing versioned `frontierProgress` owner rather than creating a second save.

It should own persistent state such as:

```text
bankedResources
bankedXp
unlockedMajorWaypointIds
discoveredBeaconIds
repairedPortalGateIds
claimedLootChestIds
lootChestReadyAt
upgrades
hasDepartedOnce
```

Only add fields needed by Phase 4B.1.

Requirements:

- normalize old saves,
- stale-filter world IDs where appropriate,
- idempotent mutations,
- Author Mode uses isolated/memory persistence as before,
- normal player reset clears the expanded frontier progress cleanly.

---

# 19. Section profile / balance metadata

Each expedition section may define:

```text
sectionProfile {
  tier: 1
  recommendedLevel: { min: 1, max: 3 }

  resourceValueTarget?: { min, max }
  wildkinCountTarget?: { min, max }
  wildkinLevelTarget?: { min, max }

  expected?: {
    waypoint: 1
    extractionBeacons: { min, max }
    secrets: { min, max }
    parkourCourses: { min, max }
    outboundPortals: { min, max }
  }
}
```

These are designer targets, not runtime difficulty scaling by themselves.

## Read-only Author summary

When a section is selected in Author Mode, show a compact summary such as:

```text
SECTION 1 — Tier 1 — Lv 1–3

Resources: 24 value / target 20–35
Wildkin: 3 / target 2–4
Wildkin levels: 1–2 / target 1–3

Waypoint: 1 ✓
Beacons: 1 ✓
Secrets: 1 ✓
Parkour: 1 ✓
Outbound gates: 1 ✓
```

It may warn when outside targets.

Do not auto-place missing objects.

Do not automatically modify resource/Wildkin stats to satisfy targets.

---

# 20. Resource/Wildkin level metadata foundation

The user needs a standardized balancing path, but Phase 4B.1 must stay small.

Add only the minimum metadata/contracts needed so placed content can carry a **level/tier** consistently.

Preferred direction:

```text
Placed Wildkin:
  species/type
  level
  temperament
  authored home/roam

Placed Resource:
  resource type
  level/tier
```

If current creature/resource systems already encode many direct stats, do not rewrite the full combat/economy stack in this phase.

Instead:

- define canonical default level = 1,
- make level available in normalized data,
- expose it in Author inspector where practical,
- use it in Section summary,
- preserve existing current behavior if no scaling function is yet required.

A full species-stat/yield scaling framework may be a later balance slice.

---

# 21. Author Mode section workflow

This slice necessarily changes how the owner navigates level data because section-local coordinates overlap.

## Section context

Author Mode needs an explicit **active edit section**.

Required behavior:

- section selector/list,
- selecting a section shows that section at its local origin,
- other sections are hidden from the edit scene,
- world-object selection/hierarchy is scoped to selected section,
- placing/moving an object keeps ownership in the selected section,
- do not auto-rehome based on overlapping local bounds,
- object positions remain section-local,
- Play activates the selected/current gameplay section appropriately.

Camp should be selectable as its own 100×100 edit context.

## Minimal section controls

Allow:

- select/focus section,
- create standard 50×50 section only if needed for proof,
- edit display name/profile values,
- inspect entry points/gates/anchors,
- see read-only Section summary.

Do not build a graphical node/portal-map editor in this slice.

## Palette additions

Add standard Author entries for:

- Portal Gate,
- Jump Pad,
- Parkour Start,
- Parkour Checkpoint,
- Kill Volume,
- Loot Chest.

Use existing Author Object contract rather than bespoke scene manipulation where practical.

---

# 22. Proof world migration

Replace the stopped continuous-strip canonical layout with a sparse proof structure.

Git history already preserves the Crescent Basin experiment; no archive copy is required unless implementation needs a temporary migration fixture.

## Camp

- 100×100 ground/bounds.
- Keep Drop Pod.
- Keep Matter Resonator.
- Keep basic frontier gate/perimeter.
- Do not build all future 25×25 plots.
- Camp Gate targets Section 1 default entry on fresh save.

## Section 1

50×50.

Required sparse pieces:

- one default entry portal near an edge,
- one discoverable Major Waypoint somewhere away from entry,
- one Extraction Beacon,
- one one-time secret Loot Chest,
- one small Parkour Start,
- at least one Jump Pad used by that parkour,
- zero or one Parkour Checkpoint as needed,
- one Kill Volume/failure hazard,
- one repeatable parkour reward chest,
- one ruined outbound Portal Gate to Section 2,
- a few resources/Wildkin only as system proof.

Do not beautify/fill the whole section.

## Section 2

50×50.

Required only:

- target entry portal,
- clearly different ground tint/very small identity proof,
- one discoverable Major Waypoint,
- one or two proof resources/Wildkin if useful.

Do not finish-design Section 2.

---

# 23. Handling the stopped Phase 4B commit

Review commit `cad34988dbc43824256419a8a2301a4e9372a942`.

Preserve where useful:

- Matter Attractor I player-facing functionality,
- upgrade UI if still appropriate,
- resource IDs such as iron/crystal if canonical and useful,
- Visual Assets useful for future authoring,
- regression tests that still reflect valid behavior.

Replace/supersede:

- enlarged global Crescent Basin movement bounds,
- long physically adjacent p1/p2/p3/p4 layout as final topology,
- tests that assert the continuous strip is the desired world,
- destination-authored Jump Traversals as proof content,
- first Waypoint being effectively granted instead of discovered,
- AI-authored final-level claims.

Do not blindly revert unrelated useful work.

---

# 24. Transition safety

Portal transitions must safely handle:

- player movement/traversal state,
- dodge/jump/climb/mantle state,
- player collider,
- active Wildkin attacks,
- projectiles,
- resource focus/Auto Harvest,
- pickups/XP,
- anchor triggers,
- parkour state,
- camera follow,
- edge indicators.

Define explicit reset/preserve semantics.

Recommended:

Preserve:
- player health,
- run cargo,
- run XP,
- active expedition session,
- permanent discoveries.

Clear/reset:
- traversal mode,
- attack swing transient if necessary,
- projectiles,
- stale target/focus,
- current parkour course when leaving its section,
- anchor armed/inside state before destination prime.

Do not accidentally resolve extract/death during portal travel.

---

# 25. World bounds

Remove dependence on one giant global frontier bound.

Player movement bounds during runtime should derive from the active section's local authored bounds / boundary colliders.

Camp derives from 100×100.

Standard Section derives from 50×50.

The old widened global `MOVEMENT_CONFIG.worldBounds` from the stopped Crescent Basin pass should not remain the authority for expedition movement.

Legacy config may remain as fallback for tests only if clearly labeled.

---

# 26. Validation requirements

World validation should reject:

- duplicate section IDs,
- invalid section dimensions,
- standard proof sections not matching configured size,
- duplicate object IDs,
- missing portal target section,
- missing target entry,
- invalid portal resource IDs/amounts,
- invalid `minPlayerLevel`,
- a repaired gate ID that no longer exists should be stale-filtered from save,
- missing loot table,
- invalid chest refill,
- parkour checkpoint referencing nonexistent course,
- Jump Pad non-finite launch values,
- missing visual asset references,
- Waypoint/start pointing to wrong/missing section,
- objects outside selected section local bounds where that is invalid.

Do **not** reject local-coordinate overlap between separate sections.

---

# 27. Tests — avoid false confidence

Pure schema tests are necessary but not sufficient.

Keep useful pure tests for:

- level curve,
- gate affordability/atomic spend,
- persistence migration,
- loot cooldown math,
- trajectory math,
- section validation.

Also test actual production integration paths.

## Required production/integration coverage

### A. Fresh first departure

```text
fresh save
→ Camp Gate
→ Section 1 activates
→ player appears at Section 1 entry
→ Section 1 Waypoint remains locked
```

### B. Waypoint discovery

```text
physically enter Waypoint
→ persistent unlock
→ die
→ Camp
→ Camp Gate Map
→ Section 1 Waypoint selectable
```

### C. Portal construction

```text
ruined gate
→ insufficient level/resources: no mutation
→ sufficient level + cargo
→ exact cargo deduction
→ repaired ID persists
→ death/reload
→ gate remains active
```

### D. Section transition isolation

```text
Section 1 active
→ Section 2 visual/colliders/AI inactive
→ portal transition
→ Section 1 inactive/non-colliding
→ Section 2 active
```

Use a deliberately overlapping local coordinate blocker in both sections to prove inactive collision cannot leak.

### E. Jump Pad

Use the actual runtime pad trigger.

Verify:

- rotation changes launch direction,
- launch values affect flight,
- no destination rectangle required,
- player can intentionally miss,
- Author trajectory reacts to same values.

Do not prove this by calling only a trajectory helper.

### F. Parkour

```text
normal death outside course → expedition death
enter course
→ fail volume / fatal damage
→ respawn latest checkpoint
→ cargo unchanged
→ expedition still active
complete/exit course
→ fatal damage again → normal expedition death
```

### G. Loot

```text
open secret chest
→ run cargo/XP changes once
→ reload/save state
→ cannot claim again

open repeatable chest
→ reward
→ unavailable until ready
→ injected time advances
→ claim again
```

### H. Matter Attractor save migration

Load old boolean save and prove equivalent keyed upgrade state/effect.

### I. Author section context

Through real `?author=1` browser path:

- select Camp,
- select Section 1,
- verify only chosen section visible/editable,
- place Jump Pad,
- rotate it,
- see trajectory update,
- place gate/chest/checkpoint,
- verify objects remain owned by selected section,
- switch Section 2 and back,
- verify no snap/rehome/cross-section pollution,
- read Section summary.

Do not simulate these only through direct draft calls.

---

# 28. Human acceptance tests

Automated tests do not prove usability.

The owner should test:

## Test 1 — Camp scale

Open Camp in Author Mode.

Pass if:
- it reads as a 100×100 editable home space,
- future 25×25 plot scale is understandable,
- existing Drop Pod/Resonator/gate remain usable.

## Test 2 — Section editing

Switch to Section 1 and Section 2.

Pass if:
- each is a clean 50×50 local editing space,
- only selected section is visible,
- placing/moving objects does not jump between sections.

## Test 3 — First departure

Reset player save.

Walk through Camp gate.

Pass if:
- no pointless start-choice screen appears,
- player arrives at Section 1 entry,
- Section 1 Waypoint is not yet unlocked.

## Test 4 — Waypoint

Find Section 1 Waypoint.

Return/die/extract to Camp.

Pass if:
- future Camp-gate start selection now includes Section 1 Waypoint.

## Test 5 — Jump Pad

Place/adjust a Jump Pad.

Play it.

Pass if:
- pad visually communicates direction,
- actual launch feels physical,
- rotation/strength are intuitive,
- player can miss,
- no invisible destination snapping is noticeable.

## Test 6 — Parkour safe failure

Enter proof parkour with cargo.

Fail after reaching a checkpoint.

Pass if:
- respawn occurs at parkour checkpoint,
- cargo remains,
- expedition remains active.

Leave/finish course and die normally.

Pass if normal expedition death returns.

## Test 7 — Loot

Open secret and repeatable proof chests.

Pass if:
- rewards are understandable,
- secret does not duplicate,
- repeatable chest communicates unavailable state.

## Test 8 — Portal repair

Reach ruined Section 2 gate.

Pass if:
- requirement UI is understandable,
- insufficient state does nothing,
- spending required carried resources repairs it once,
- repair remains after death/reload.

## Test 9 — Section transition

Enter repaired gate.

Pass if:
- transition feels clean,
- Section 2 visibly replaces Section 1,
- no Section 1 collisions/Wildkin/projectiles leak,
- cargo/health/run remain intact.

## Test 10 — Section 2 identity

Section 2 proof does not need to be a level.

Pass if:
- arrival, entry portal and Waypoint work,
- section can clearly use different visuals/resources/Wildkin later,
- owner can immediately imagine authoring it independently.

## Test 11 — Matter Attractor

Existing/legacy save + fresh purchase.

Pass if:
- upgrade still works,
- persistence survives migration,
- no double purchase/regression.

## Test 12 — portrait phone smoke

On portrait phone:

- Camp → Section 1,
- Jump Pad,
- parkour fail,
- chest,
- extraction/death,
- repaired portal transition.

Pass if controls/UI remain usable and performance does not visibly regress.

---

# 29. Implementation order

Implement in this order.

## Pass A — preserve / characterize

- run current tests,
- inspect stopped Phase 4B diff,
- identify reusable Matter Attractor/content work,
- add tests proving current continuous assumptions where they must change,
- do not begin by rewriting Author Mode blindly.

## Pass B — section data + runtime

- section-local coordinate contract,
- active section owner,
- per-section visual/collider/simulation activation,
- active-section movement bounds,
- sparse Camp/Section 1/Section 2 migration.

Get section isolation working before portals.

## Pass C — portals + Waypoints

- entry points,
- active portal transition,
- fresh Camp gate,
- physical Waypoint discovery,
- ruined gate + persistent repair.

## Pass D — progression persistence

- player level,
- repaired gates,
- Matter Attractor keyed upgrade migration.

## Pass E — Jump Pad

- runtime physical launch,
- Author object,
- trajectory preview,
- migrate proof parkour away from destination-hardcoded jump link.

## Pass F — parkour + loot

- course state,
- checkpoint,
- fail volume/death interception,
- loot catalog/chests/cooldown persistence.

## Pass G — section profile

- profile metadata,
- actual-value computation,
- read-only Author summary.

## Pass H — browser verification / cleanup

- real Author workflow,
- fresh-save runtime flow,
- transition isolation,
- mobile smoke,
- remove obsolete proof assertions/layout references,
- update docs/build log truthfully.

---

# 30. Performance / streaming guardrail

This phase introduces a better **activation boundary**, not a complex streaming engine.

Target:

```text
one active section
inactive sections effectively cost little/no gameplay simulation
```

It is acceptable for canonical JSON and Visual Asset recipes to stay fully resident in memory.

If static meshes for inactive sections remain instantiated for simplicity, they must be hidden and their physics disabled, and profiling should show this is safe.

Do not add fetch/network chunk loading.

No new runtime network requests.

---

# 31. Automated gates

Run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Verify:

- generated world is synchronized,
- no stale continuous-world assumptions in Phase 4B.1 tests,
- one looping first-party rAF,
- no runtime network dependencies,
- no inactive-section collision leak,
- no duplicate loot/gate spend,
- old save migration works,
- submission remains comfortably below 35 MB.

If `npm run zip` cannot run in the sandbox because PowerShell is unavailable, report that explicitly; do not claim ZIP success.

---

# 32. Documentation updates

Implementation agent should update:

- `docs/ARCHITECTURE.md`,
- `docs/BUILD_LOG.md`,
- `docs/CURRENT_SLICE.md`,
- `docs/PLAYTEST_NOTES.md` only for actual browser evidence, clearly labeled automated vs human,
- any world-data documentation needed for section/portal/parkour/loot schemas.

Do not mark Phase 4B.1 human accepted.

---

# 33. Stop condition

Stop Phase 4B.1 when:

- standardized Camp/Section dimensions exist,
- sections use explicit local ownership,
- active section isolation works,
- portals work,
- Waypoint discovery works,
- ruined gate repair persists,
- player level foundation works,
- Matter Attractor save migration works,
- Jump Pad is first-class and usable,
- safe parkour failure works,
- loot chest/refill works,
- Section summary works,
- sparse Camp + Section 1 + Section 2 proof shells work,
- automated gates pass,
- owner has a concise human checklist.

**Do not continue into final Section 1 composition.**

Phase 4B.2 begins with the owner using these tools to build the actual level.
