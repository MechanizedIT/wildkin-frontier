# Wildkin Frontier — Phase 4A: First Complete Expedition Loop

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A  
**Purpose:** Turn the accepted movement/harvest/combat/world foundation into the first complete player-facing run loop: **Camp → choose start → gather unsecured value → extract or keep going → bank or lose → return to Camp → immediately run again**.

Phase 3.5A/3.5B/3.5B.1/3.5B.2 are accepted. Author Mode is infrastructure now, not the task. Preserve it and use the existing authored Camp + Area 1 skeleton as the level substrate.

This slice proves that Wildkin Frontier is a **game loop**, not just a collection of working systems. Phase 4B will tune the first 5–10 minute experience, Camp layout, encounter pacing, temptation, difficulty, and first meaningful spend after this mechanical loop is human-accepted.

---

## 1. Player-facing outcome

At the end of Phase 4A, from a fresh normal save the player can:

```text
Open game at Camp
→ inspect the Map
→ walk through the frontier gate
→ choose the only available starting Major Waypoint
→ begin an expedition
→ harvest / fight / gain XP while carrying unsecured value
→ encounter a Major Waypoint or Extraction Beacon
→ choose EXTRACT or KEEP GOING
→ extract and bank the run OR die and lose unsecured run value
→ return to Camp and see a clear recovery/loss card
→ see persistent frontier/map progress
→ walk to the gate and start another expedition immediately
```

After activating a deeper Major Waypoint, that Waypoint is available as a future expedition start. Extraction Beacons may be discovered and used to extract, but **never become starting locations**.

Core acceptance question:

> **Does a first-time player understand what is at risk, how to secure it, what was lost/kept, and how to start the next run?**

---

## 2. Hard scope

Implement only what is required for the complete mechanical loop:

1. explicit Camp ↔ active expedition lifecycle,
2. versioned local persistent frontier/bank state,
3. always-accessible top-right Map,
4. Camp gate → expedition-start map flow,
5. Major Waypoint activation + future-start unlock,
6. Extraction Beacon discovery + extraction-only behavior,
7. Camp gate return/extraction behavior,
8. **EXTRACT / KEEP GOING** anchor prompt,
9. unsecured run resources + run XP vs persistent banked resources + banked XP,
10. successful-extraction recovery card,
11. death/loss card and return-to-Camp flow,
12. immediate next-run reset/start flow,
13. minimal edge guidance for extraction/deeper Major Waypoint,
14. run-cargo HUD cleanup needed to make risk readable,
15. focused persistence/lifecycle/map/anchor tests,
16. docs + Build Log updates.

Do **not** implement in Phase 4A:

- Wildkin bonding/capture/companions/mounts,
- Wildkin carry capacity,
- skill tree or equipment progression,
- full Matter Resonator gameplay or Resonance minigame,
- Camp expansion/base building,
- final Area 1 layout/art/pacing/balance,
- a second area or final endpoint,
- swimming or gated-POI unlock behavior,
- elaborate illustrated map art,
- quest/story systems,
- general POI framework beyond the anchors/guidance needed here,
- new dependencies,
- Author Mode expansion.

**Phase 4B owns “make the first expedition fun/paced”; Phase 4A owns “make the loop complete and understandable.”**

---

## 3. Preserve accepted foundations

Preserve unless this slice explicitly changes the lifecycle around them:

- movement / run / sneak / jump / dodge / climb / mantle,
- Rapier collision and Phase 3.5B.2 transform parity,
- one physical Field Tool and shared cadence,
- Auto Harvest + manual attack/harvest rules,
- resources, physical-looking drops, magnet collection,
- combat, health, dodge i-frames, projectiles, XP motes,
- Wildkin temperaments/ecology/home/leash/steering,
- `world.json` single-source pipeline,
- region activation / bounded pools,
- `ExpeditionSession` as the temporary run owner,
- Author Mode + hierarchy + deterministic world export,
- one `requestAnimationFrame`, fixed 1/60 gameplay, thin `main.js`,
- offline/portrait/<35 MB submission constraints.

Do not reopen accepted Author Mode work unless Phase 4A integration exposes a concrete regression.

---

## 4. Change Closure focus for this slice

Permanent `AGENTS.md` Change Closure rules apply.

The highest-risk shared paths in Phase 4A are:

```text
modal/input lock
Map + anchor prompts + result cards
→ touch/keyboard/gameplay suppression
→ clean restore

run lifecycle
Camp → begin run → active run → extract/death → Camp → next run
→ ExpeditionSession
→ player/resources/creatures/projectiles/pickups/XP
→ UI

persistent progress
Major Waypoint / Beacon discovery + extraction
→ save owner
→ map
→ start selection
→ result card
→ reload

cargo banking
pickup inventory + XP
→ run snapshot
→ extract once
→ persistent bank
→ clear run state
→ no duplicate credit
```

When changing one of these, verify every sibling outcome path. Example: input suppression must work for **Map, anchor prompt, recovery card, and loss card**, not only one modal.

---

## 5. State ownership: temporary run vs persistent frontier progress

Do not turn `ExpeditionSession` into the persistent save file and do not make the pickup inventory own the bank.

Use two explicit ownership layers.

### A. `ExpeditionSession` — temporary run state

Extend/refine the existing session as needed to represent the lifecycle cleanly:

```text
camp / idle
active
extracted outcome
lost / dead outcome
```

The exact enum names may differ, but there must be one obvious answer to:

- are we currently at Camp or in a live expedition?
- which Major Waypoint did this run start from?
- what region/depth did we reach?
- what temporary discoveries occurred this run?
- has this run already been resolved/extracted so rewards cannot be banked twice?

`ExpeditionSession` may keep its current summary mirror of run cargo/XP/kills for UI/results, but the pickup/XP systems remain authoritative for their live values.

### B. Persistent frontier/bank owner

Create a focused module such as `src/save/frontierProgress.js`, `src/progression/frontierProgress.js`, or equivalent.

Versioned persisted state should contain only what Phase 4A needs, approximately:

```js
{
  version: 1,
  bankedResources: { wood: 0, stone: 0, fiber: 0 },
  bankedXp: 0,
  unlockedMajorWaypointIds: [initialMajorWaypointId],
  discoveredBeaconIds: [],
  hasDepartedOnce: false
}
```

Optional small lifetime counters are allowed if genuinely useful for results/debug, but do not build an analytics system.

Requirements:

- localStorage only,
- defensive load + schema/default normalization,
- ignore/filter saved anchor IDs that no longer exist in current `world.json`,
- atomic/idempotent banking API,
- no gameplay globals as authority,
- debug-only `window.__game.clearProgress()` or equivalent is welcome for fresh-save testing.

### Author Mode isolation

`?author=1` must not accidentally corrupt normal player progression while the developer edits/tests the world.

Use either:

- an isolated author/dev save key, or
- in-memory/non-persisted Phase 4A frontier progress while Author Mode is enabled.

Normal `/` play uses the real prototype save.

`Reset Draft From Repo` must remain about authored world data; it must not silently erase normal player progression.

---

## 6. World data additions for start flow

Keep this data-driven rather than hard-coding UI to one waypoint ID.

Add the minimum world metadata required to answer:

- which Camp prop/trigger is the frontier gate,
- which Major Waypoint is available to a brand-new player,
- where the player should safely spawn when choosing a Major Waypoint.

Preferred minimal shape is equivalent to:

```text
camp.frontierGateId
initialMajorWaypointId
majorWaypoint.startOffset / spawnOffset (optional)
```

Exact names may differ.

Validator requirements:

- initial Major Waypoint ID exists and references a `majorWaypoint`,
- Camp gate ID exists and references the intended gate/anchor object,
- optional start offset is finite/valid,
- selected start spawn resolves to a valid region and safe authored height.

Do not encode Phase 4A behavior around `wp_p1_entry` string comparisons in UI code.

---

## 7. Camp state and first launch

Normal game launch begins at Camp, not in an active expedition.

### Fresh save

Player should see:

- Camp/drop pod/fence/Resonator/gate,
- direct player control immediately,
- **Map button at top-right**,
- no long intro/cutscene,
- no active run cargo yet.

The small Matter Resonator remains a visual Camp landmark only in 4A. Do not add its spend/unlock system yet.

### Camp loot rule

Camp should not accidentally generate unsecured expedition cargo before a run starts.

The existing placeholder Camp tree/fiber may be relocated into the first frontier pocket if needed. Prefer that simple data edit over inventing a separate Camp-harvest banking rule.

### Top-right Map before first departure

On a fresh save, passive Map inspection should primarily communicate:

- **Camp**,
- **Frontier Gate**,
- unknown/obscured frontier beyond it.

The first start can be available internally without cluttering this very first passive map view.

---

## 8. Map modes

Use one Map UI with clear modes instead of parallel map screens.

### Inspect mode — top-right Map button

Available from Camp and during a run except while another blocking modal/result is open.

Inspect mode:

- pauses/suppresses gameplay input while open,
- shows known frontier progress,
- does **not** teleport or begin a run,
- major Waypoints are informational only in this mode,
- discovered Extraction Beacons are visible but never selectable starts,
- close returns control cleanly.

### Start-selection mode — triggered by Camp gate

When the player at Camp crosses/enters the frontier gate to depart:

- Map opens automatically in **Choose Start** mode,
- gameplay input is paused,
- only unlocked Major Waypoints are tappable start choices,
- Extraction Beacons may be shown but are never selectable,
- on a fresh save only the initial Major Waypoint is available,
- choosing a Major Waypoint begins a new expedition,
- cancel/close leaves the player safely at Camp and must not trap them in a retrigger loop.

Once `hasDepartedOnce` is true, normal map inspection may show the initial Major Waypoint as part of frontier progress.

### Map representation

Keep it functional and readable, not artistic.

Allowed:

- simple panel,
- projected node positions based on authored world X/Z,
- Camp/gate/Waypoint/Beacon icons,
- region names,
- simple connecting lines if useful.

Do not build map terrain rendering, minimap camera, fog-of-war shaders, or a cartography framework.

---

## 9. Beginning an expedition

Selecting an unlocked Major Waypoint from gate-start mode must execute one explicit begin-run path.

Before player control resumes:

1. validate selected waypoint is unlocked + exists,
2. clear old run inventory/XP and temporary pickups/projectiles/XP motes,
3. reset resources/creatures to the intended new-run baseline,
4. restore player health/action state,
5. set `ExpeditionSession` active with `startAnchorId`,
6. position player at a safe authored start location for the selected Major Waypoint,
7. reprime region activation around that location,
8. suppress immediate anchor popup for the start Waypoint until the player leaves its interaction radius once,
9. close Map and restore gameplay input exactly once.

Each expedition is a new run. Temporary harvest/combat state from the previous run must not leak into it.

Starting from a deeper unlocked Major Waypoint naturally skips earlier gathering; Phase 4B/7 will tune whether that tradeoff is strong enough.

---

## 10. Frontier anchor interaction

Create one focused anchor interaction owner/system rather than scattering distance checks into UI/main.

It must handle:

- Major Waypoints,
- Extraction Beacons,
- Camp gate as a return-to-safety anchor while a run is active.

Use simple proximity/entry detection; no generic interaction framework is required.

### Major Waypoint

On first meaningful activation during an expedition:

1. permanently add it to `unlockedMajorWaypointIds`,
2. record it as a new discovery for this run/result card,
3. update Map state immediately,
4. show anchor prompt:

```text
WAYPOINT ACTIVATED
[current unsecured run summary]

EXTRACT
KEEP GOING
```

On later visits, show the same extraction choice without re-awarding discovery.

**Important:** permanent Waypoint discovery survives later death because frontier penetration is persistent progress; unsecured cargo does not.

### Extraction Beacon

On first discovery:

- add to `discoveredBeaconIds`,
- show on future Maps,
- never add to start choices.

Interaction shows:

```text
EXTRACTION BEACON
[current unsecured run summary]

EXTRACT
KEEP GOING
```

Extracting at a Beacon returns to Camp. The next run still starts from an unlocked **Major Waypoint**, never the Beacon.

### Prompt re-entry guard

If the player chooses **KEEP GOING**, do not reopen the same prompt every frame.

Require the player to leave the anchor interaction radius before it can trigger again.

### Starting Waypoint guard

Spawning at a Major Waypoint must not instantly block the new run with an extraction prompt. Arm that anchor only after the player leaves its radius once.

---

## 11. Returning physically to Camp

The Camp gate is the safe retreat behind the first frontier stretch.

During an active run, crossing/entering the Camp gate from the frontier side should offer a clear return choice equivalent to:

```text
RETURN TO CAMP
Secure everything you are carrying?

RETURN & SECURE
KEEP GOING
```

This allows a player who retreats before reaching a Beacon to save the run by physically making it back to safety.

Do not make walking into Camp silently delete or silently bank a run.

---

## 12. Unsecured cargo and banked progress

### During an active expedition

The following are unsecured in Phase 4A:

- resource inventory (`wood`, `stone`, `fiber`),
- run XP.

Wildkin are not capturable yet.

The player should be able to read current run value at a glance.

### Resource HUD cleanup

Move/keep run resource counts in the **upper-left** so the top-right remains Map.

Requirements:

- hide zero-count resources,
- clearly read as current carried/run cargo,
- do not show an always-visible second bank inventory beside it,
- keep portrait safe areas and existing combat readability.

Bank totals may be shown on Map/Camp/results rather than cluttering gameplay HUD.

### Extraction

Extraction transfers the current run snapshot **once** into persistent bank:

```text
bankedResources += current run resource inventory
bankedXp += current run XP
```

Then clear current run cargo/XP.

Do not double-credit if an extraction callback/modal is somehow triggered twice.

### Death

Death banks **none** of current run resources or run XP in 4A.

On death:

- resource cargo lost,
- run XP lost,
- Major Waypoints already activated remain unlocked,
- discovered Extraction Beacons remain discovered.

Future loss-mitigation skills are later scope.

---

## 13. Successful extraction flow

`EXTRACT` or `RETURN & SECURE` should resolve through one outcome pipeline.

Required order conceptually:

1. freeze/suppress player gameplay input,
2. snapshot run resources/XP + discoveries,
3. mark the run resolved/extracted so it cannot resolve twice,
4. bank resources/XP persistently,
5. return/reset player + transient world state to Camp,
6. show the result card **over Camp**,
7. on Continue, restore direct Camp control.

### Recovery card

Keep compact and readable:

```text
EXPEDITION COMPLETE

Recovered
Wood   +18
Stone   +9
Fiber   +5
XP    +120

Frontier Progress
New Waypoint: Threshold Rise   (when applicable)
Beacon discovered              (when applicable)

Banked Total: ...

CONTINUE
```

Only show rows that matter.

Do not implement spend/upgrade choices on this card in 4A.

---

## 14. Death / failed expedition flow

Replace/repurpose the current prototype death/restart flow so death returns to the actual game loop rather than directly restarting the systems arena.

Required order:

1. player reaches 0 HP,
2. snapshot current unsecured cargo/XP + retained discoveries,
3. mark run resolved/lost,
4. bank nothing from unsecured cargo/XP,
5. return/reset player + transient world state to Camp,
6. show loss card **over Camp**,
7. Continue closes card and gives Camp control.

### Loss card

Example:

```text
EXPEDITION LOST

Lost
Wood   18
Stone   9
Fiber   5
XP    120

Frontier Progress Kept
Threshold Rise Waypoint   (if discovered this run)

CONTINUE
```

Do not show a `TRY AGAIN` button that teleports straight back into the frontier. The player starts the next expedition through Camp/gate/Map.

Use one result-card owner for extraction/death if practical; do not leave competing death overlays active.

---

## 15. Return-to-Camp / new-run reset guarantees

Centralize the run reset/return path enough that extraction, death, and later future outcomes do not each manually reset different subsets of the game.

On return/new run as appropriate verify:

- player position + health/action state coherent,
- resource run inventory 0,
- run XP 0,
- pickups cleared,
- projectiles cleared,
- XP motes cleared,
- resource nodes reset for a new expedition,
- Wildkin reset to authored run baseline/home/alive state,
- region manager reprimes around Camp/start,
- no duplicate creatures/resources/colliders,
- Auto Harvest preference remains a user preference and is not accidentally erased,
- persistent bank/map discovery untouched except for intended outcome changes.

Do not copy/paste three different reset sequences into Map, death, and extraction UI callbacks.

---

## 16. Minimal frontier guidance

The current world is directed but the player needs enough orientation to understand safety vs deeper progress.

During an **active run only**, show at most a small number of edge indicators:

1. a useful **extraction/safety** direction when off-screen (nearest appropriate Camp gate / Major Waypoint / Extraction Beacon),
2. the next deeper **Major Waypoint** direction when relevant.

Requirements:

- screen-edge clamped,
- distinct icon/shape for extraction vs Major Waypoint,
- optional distance text if readable,
- hide when target is comfortably on-screen or use a simple in-world marker,
- never become a large quest-arrow HUD,
- do not implement arbitrary POI tracking in this slice.

The exact “best extraction target” helper should be deterministic and testable.

Phase 4B may tune which anchors are revealed and when based on play feel.

---

## 17. Modal/input ownership

Map, anchor prompt, recovery card, and loss card are blocking gameplay surfaces.

Use one explicit gameplay-input suppression mechanism; do not independently hide visuals while pointer handlers remain active.

When a blocking UI is open:

- touch joystick disabled/cleared,
- right-side attack/hold/swipe disabled/cleared,
- keyboard movement/action suppressed as appropriate,
- Field Tool cannot swing underneath UI,
- player/AI gameplay may be paused or player input-only suppressed according to the simplest consistent design, but no player should take unavoidable damage while a blocking decision/result UI is open.

When closed:

- restore input exactly once,
- no stale held attack, joystick pointer, or dodge request.

Apply Change Closure across every blocking modal in the slice.

---

## 18. Area 1 content policy for 4A

Use the current rough authored route:

```text
Camp
→ p1 Forest Edge / first Major Waypoint
→ p2 + Beacon
→ p3 + Beacon
→ p4 / next Major Waypoint
```

Do not spend this phase making that layout final.

Allowed small data edits:

- move/remove Camp harvest nodes so Camp does not create pre-run cargo,
- safe spawn offsets around Major Waypoints,
- tiny anchor placement/interaction-radius adjustments required to make the loop testable.

Do not do the full Camp/forest/encounter redesign yet.

It is acceptable if the next Major Waypoint is easier to reach than the final design during 4A. Phase 4B will deliberately tune the first-run limit, danger gradient, Beacon spacing, temptation, and 5–10 minute pacing.

---

## 19. Suggested module ownership

Exact filenames are flexible; responsibilities are not.

Prefer focused modules equivalent to:

```text
src/save/ or src/progression/
  frontierProgress.js
    persistent bank + discovered/unlocked anchors

src/world/ or src/expedition/
  frontierAnchorSystem.js
    proximity/entry/armed state for gate/waypoint/beacon

src/ui/
  frontierMap.js
  anchorPrompt.js
  runResultCard.js
  frontierIndicators.js

src/session/
  expeditionSession.js
    temporary run lifecycle/outcome summary
```

`src/main.js` should only construct, inject dependencies, and wire callbacks/update order.

Do not make Map DOM own save state, and do not make save state inspect DOM.

---

## 20. Automated tests

Preserve all existing tests.

Add focused tests for:

### Persistent progress

- fresh defaults initialize correctly,
- initial Major Waypoint is the only start unlocked on new save,
- unknown/removed saved IDs are filtered safely,
- Major Waypoint activation persists across reload,
- Beacon discovery persists across reload,
- Beacon never enters selectable-start set,
- author-mode progress is isolated from normal progress,
- bank operation adds exact resource/XP snapshot once,
- second resolve/bank attempt cannot double-credit.

### Expedition lifecycle

- starts in Camp/idle state,
- begin run sets active + chosen start anchor,
- extraction resolves once,
- death resolves once,
- return/new-run reset clears transient session values but not persistent frontier progress.

### Map/start selection

- inspect mode never starts/teleports a run,
- gate/start mode exposes only unlocked Major Waypoints,
- Extraction Beacons are not selectable starts,
- first departure behavior is deterministic,
- choosing a valid waypoint resolves safe spawn/region.

### Anchor interaction

- new Major Waypoint unlocks before result/outcome and survives later death,
- Beacon discovery persists but never unlocks start,
- KEEP GOING requires leaving radius before reprompt,
- starting waypoint is initially disarmed until player exits radius,
- Camp gate return uses the same extraction outcome pipeline.

### Cargo outcome

- extraction banks run resources + XP and clears them,
- death banks none and clears them,
- result snapshot remains correct after world reset,
- waypoint/beacon discoveries remain after death.

### Modal/input closure

- every Phase 4A blocking UI path disables touch/action input,
- closing restores input,
- no stale joystick/swipe/attack-held state,
- no duplicate input enable/disable imbalance.

### Reset/world integration

- new run resets creatures/resources/player/temp entities once,
- no duplicate creatures/resources/colliders after repeated Camp → run → Camp cycles,
- region activation reprimes to chosen start,
- one rAF remains.

### Submission/regression

- accepted movement/harvest/combat/ecology tests pass,
- `npm run world:check` passes,
- `npm run verify` passes,
- `npm run zip` passes,
- offline / portrait / <35 MB remain valid.

---

## 21. Human acceptance test

Final agent response must keep this human-readable and short. Do not return an internal coordinate checklist.

### Test 1 — Fresh save / first departure
1. Clear prototype progress using the documented dev helper, then load normal game `/`.
2. Confirm you start at Camp and top-right Map initially communicates Camp/gate rather than dropping you into a run.
3. Walk through the gate.
4. Expected: **Choose Start** map opens and only the first Major Waypoint is selectable.
5. Select it; expected: you arrive safely at the first frontier start with empty run inventory/XP and full health.

### Test 2 — Carry value and extract at a Beacon
1. Harvest several resources and gain some XP.
2. Reach the first orange Extraction Beacon.
3. Expected: prompt clearly shows **EXTRACT / KEEP GOING** and your carried run value is readable.
4. Choose **EXTRACT**.
5. Expected: return to Camp, recovery card lists what was banked, carried HUD resets to zero/hidden, bank totals persist.

### Test 3 — Beacon is not a start
1. Leave Camp through the gate again.
2. Expected: start-selection Map offers Major Waypoints only; the Beacon may be shown as discovered but cannot be tapped as a start.

### Test 4 — Deeper Major Waypoint persists through risk
1. Run far enough to activate the next blue Major Waypoint.
2. Choose **KEEP GOING**.
3. Then deliberately die.
4. Expected: loss card shows run resources/XP lost, but the new Waypoint is listed/visible as retained frontier progress.
5. Return to the gate: that Major Waypoint is now a selectable start.

### Test 5 — Physical retreat to Camp
1. Start at the first Waypoint, collect something, then turn around before extracting at a Beacon.
2. Return through the Camp gate.
3. Expected: clear **RETURN & SECURE / KEEP GOING** choice; securing uses the same recovery/banking flow as a Beacon.

### Test 6 — Map does not teleport during a run
1. During an active expedition, tap the top-right Map.
2. Inspect unlocked Waypoints/known Beacons.
3. Expected: tapping around does not start/teleport you; close Map and resume exactly where you were without attack/joystick input leaking through.

### Test 7 — Repeatability / phone
1. Complete several extract/death cycles and start from both available Major Waypoints once unlocked.
2. Confirm no duplicate creatures/resources, stale projectiles, carried inventory, or broken input.
3. Repeat the core flow on a phone in portrait.

Then answer:

> **Does the game now clearly communicate “carry unsecured value → extract or keep going → bank or lose → start another run,” and does that basic loop make sense without explanation?**

A human yes closes Phase 4A. Fun/pacing problems should become Phase 4B notes unless they prevent understanding or completing the loop.

---

## 22. Documentation

Update after implementation:

- `README.md` current playable state,
- `docs/ARCHITECTURE.md` actual persistent-progress / map / anchor / result ownership,
- `docs/PROJECT_PLAN.md` only if implementation materially changes the 4A → 4B handoff,
- `docs/BUILD_LOG.md` with actual implementation/tests/remaining human issues.

Do not rewrite stable design decisions unless implementation reveals a genuine design conflict requiring owner confirmation.

---

## 23. Completion gate

Phase 4A is implementation-complete only when:

- normal launch begins at Camp, not an active run,
- top-right Map exists and has inspect vs gate-start behavior,
- gate starts runs only from unlocked Major Waypoints,
- fresh save exposes only the initial Major Waypoint start,
- Major Waypoint activation persists and unlocks future starts,
- Extraction Beacons persist as discovered but never become starts,
- Camp gate supports physical retreat/extraction,
- anchor prompts provide **EXTRACT / KEEP GOING** without prompt spam,
- current run resources + XP are clearly unsecured,
- extraction banks them exactly once,
- death loses them,
- persistent frontier discovery survives death,
- recovery/loss cards appear at Camp and lead back to direct Camp control,
- next run starts through Camp/gate/Map rather than a direct arena restart,
- transient world state resets without duplicates/leaks,
- Phase 4A blocking UI owns input correctly,
- minimal extraction/deeper guidance exists,
- existing accepted gameplay/Author Mode remains functional,
- full automated tests pass,
- `npm run verify` passes,
- `npm run zip` passes,
- offline / portrait / one-rAF / fixed-step / Rapier constraints remain intact,
- human playtest confirms the mechanical loop is understandable.

Then stop.

**Do not begin Phase 4B, Wildkin bonding, progression, or Matter Resonator spend in the same session.**
