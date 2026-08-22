# Wildkin Frontier — Game Design & Build Plan

## Purpose

This is the repository mirror of the living Google GDD for the Meta Horizon Creator Competition: Game Prototype project.

It records stable game direction, competition guardrails, development workflow, and the phased roadmap.

`docs/CURRENT_SLICE.md` is always the only implementation scope for an agent session. This roadmap is context, not permission to build future phases.

# 1. Current Game Direction

## Working Concept

- **Title:** Wildkin Frontier
- **Genre:** Survival & Resource Management
- **Format:** Single-player portrait mobile web game
- **Technology:** Three.js + Rapier + vanilla HTML/CSS/JS
- **Camera:** fixed high third-person / near top-down
- **Target expedition:** roughly 5–10 minutes

## High Concept

Wildkin Frontier is a short-session survival expedition game built around one question:

> **How far do I dare push before I turn back and secure what I found?**

The player moves through a handcrafted **directed frontier** made of wide exploration pockets. The game is not a forced endless runner and not a large open-world survival sandbox for the prototype.

Forward/deeper should visibly mean:

- better resources,
- more interesting Wildkin,
- harder threats,
- more environmental pressure,
- more to lose before the next secure opportunity.

The player may always retreat.

## Core Loop

**PREPARE**  
Begin at Camp, check map/frontier progress, choose an available major Waypoint start and any available companion/loadout choices.

**EXPEDITION**  
Explore wide directed pockets → harvest / avoid / fight / bond → collect unsecured value → notice POIs, Extraction Beacons, and tempting deeper rewards.

**RISK DECISION**  
At an Extraction Beacon or major Waypoint choose **EXTRACT** or **KEEP GOING**.

**OUTCOME**  
Extract to Camp and bank the run, or die and lose unsecured value.

**PROGRESS**  
See Camp/map progress, synchronize recovered matter, secure Wildkin, make a small meaningful progression choice, and run again.

## Focus Rule

Every system must strengthen:

**acquire value → see temptation ahead → assess danger → secure or push → consequence → meaningfully different next run**.

If a feature does not improve engagement, playability, core-loop clarity, focus, or originality, defer it.

# 2. First-Time / Camp Experience

## Camp

Camp is a small clearing on an alien planet surrounded by tall dense forest and a basic perimeter fence.

Initial Camp contains:

- drop pod,
- frontier gate,
- small Matter Resonator,
- small home space where secured Wildkin can later be visible.

Long-term Camp may expand outward by spending resources in a Forager/Dreamdale-like way. Camp expansion/free placement is not required for the core competition experience.

## First Launch

1. Player gains control immediately near the drop pod.
2. Map button is visible top-right.
3. First map shows Camp and the frontier gate/start; undiscovered frontier is obscured.
4. Walking through the gate automatically opens expedition-start selection.
5. On a new save only the first area/start is available.
6. Activated major Waypoints later appear as selectable start locations.

Avoid a long intro. Teach by level layout, readable interactions, short prompts, and visible consequences.

# 3. Frontier Structure

## Directed Areas / Exploration Pockets

Each area should feel like a chain of broad explorable spaces rather than a corridor:

```text
Major Waypoint
   ↓
Pocket / local exploration
   ↓
Extraction Beacon
   ↓
Pocket / higher temptation + danger
   ↓
Extraction Beacon (optional)
   ↓
Harder pocket
   ↓
Next Major Waypoint / next area
```

The player should be free to move locally, find side spaces, avoid encounters, harvest, investigate POIs, and retreat.

## Major Waypoints

- Normally represent an area start or major frontier step.
- First activation permanently updates the map.
- Become selectable starting locations for future expeditions.
- Can also extract the current run.
- Reaching the next one should feel like an accomplishment.

## Extraction Beacons

- Smaller mid-area anchors.
- Allow extraction/banking and return to Camp.
- Never become future start locations.
- Use only as many as real pacing needs, likely 1–2 between major Waypoints.

Interacting with either anchor opens:

**EXTRACT / KEEP GOING**

This prevents the exploit where the player banks at every checkpoint and immediately restarts at the exact same point.

## Map / POI Guidance

- Map always accessible from top-right.
- Map records Camp, activated major Waypoints, discovered Extraction Beacons, important POIs, and useful locked discoveries.
- Only major Waypoints are selectable starts.
- Edge-of-screen POI indicators may show nearby extraction opportunities behind/ahead and important forward objectives.

# 4. First-Session Experience Target

The first ~10 minutes should be authored intentionally rather than generated from generic systems.

Target rhythm:

1. **Arrival / Camp:** immediate control; drop pod, fence, Resonator, gate.
2. **Gate / Map:** crossing gate opens the first-area start.
3. **Pocket 1 — Comfort:** movement + satisfying basic harvesting; passive/skittish wildlife.
4. **First complication:** territorial/aggressive wildlife or another readable danger.
5. **Extraction Beacon 1:** teaches **EXTRACT / KEEP GOING**.
6. **Pocket 2 — Temptation:** better resources, visible locked POI, more danger.
7. **High-value unsecured reward:** later this should be a newly bonded Wildkin.
8. **Another extraction choice:** enough accumulated value for the decision to matter.
9. **Next major Waypoint visible/indicated:** clear aspirational progress target.
10. **First-run limit:** danger/progression makes reaching the next major Waypoint unlikely; smart retreat or death teaches the loop.
11. **Camp result:** recovery/loss card, map change, visible progress, immediate retry motivation.

The competition prototype will have a final deep-frontier endpoint, but it must not be realistically reachable on the first run.

# 5. Run State, Inventory & Results

## Resource Inventory

Prototype resource inventory can remain **unlimited**.

Do not add a second carry-pressure system before it proves useful.

HUD direction:

- resource icons/counts upper-left,
- hide zero-count entries,
- allow the inventory container to scroll if it eventually grows.

## Wildkin Capacity

Wildkin supply the early meaningful carry constraint.

Starting prototype rule once bonding exists:

- one active secured companion may be brought on a run,
- one unsecured newly bonded Wildkin may be carried,
- later upgrades may increase capture capacity.

Finding another desirable Wildkin while already full should create a choice.

## Successful Extraction

Return to Camp and show a compact recovery card:

- materials recovered,
- XP earned,
- Wildkin secured,
- important finds/progress.

Return to direct player control quickly.

## Death

Respawn at Camp and show a compact loss card:

- unsecured materials lost,
- unsecured Wildkin lost/returned to habitat,
- relevant retained permanent progress.

Future survival progression may retain a percentage of resources on death, but never 100%.

# 6. Wildkin Direction

## Ecology / Temperament

Current validated temperament model:

- Aggressive,
- Territorial,
- Defensive,
- Skittish,
- selective predator/prey/rival relationships.

Wildkin may react to the player and other Wildkin.

Keep simple home/roam/notice/personal-space/leash data and lightweight steering. Add A*/navmesh only if the real authored frontier demonstrates repeated failures.

## Bonding / Companion

Exact bonding mechanic remains open, but it must be more interactive than reducing HP and throwing a generic capture object.

Competition target:

- 2–3 readable Wildkin species are enough,
- bonded Wildkin remains unsecured until extraction,
- secured Wildkin can visibly inhabit Camp,
- choose one active companion,
- each companion has one clearly useful behavior that changes expedition decisions.

## Gated Revisits

Earlier areas should contain memorable visible rewards the player cannot initially reach.

Examples:

- pond with island/chest when player cannot swim,
- broken bridge requiring wood + iron,
- iron/resource deposit requiring tool capability,
- climb/glide gap requiring Wildkin traversal,
- barrier requiring a powerful creature or upgraded tool.

Later Wildkin/tool/material/skill progression can unlock these POIs. This gives small authored areas long-term depth.

Some future Wildkin may be mountable. A right-side Wildkin button should eventually expose only the contextual actions that companion supports, such as **Ability**, **Command**, or **Mount / Dismount**.

# 7. Field Tool / Combat Foundation

Phase 3.1.1 is accepted as the current foundation.

Locked rules:

- one physical Field Tool owner,
- same swing may hit harvestables and valid Wildkin,
- Auto Harvest only auto-initiates resource swings,
- Auto Harvest remains active during danger,
- no auto-attack,
- mobile tap = one swing,
- hold = repeated swings at shared cadence,
- swipe = dodge and takes precedence,
- manual swings can harvest with Auto Harvest OFF,
- ranged combat belongs to future equipment/loadout choices.

Do not keep polishing the systems-test arena unless later real-frontier play exposes a regression.

# 8. Camp / Matter Resonator

A small Matter Resonator is visible at Camp from first launch.

Core prototype role:

- recovered expedition matter synchronizes/banks through a readable Camp interaction,
- exactly one small reliable unlock/spend may be tied to it in the first complete loop.

Future optional role:

- deposit materials for Resonance attempts,
- short skill-influenced kickoff/minigame,
- duplicate-protected discoveries that unlock new possibilities.

The full Resonator system and large base expansion remain optional until the expedition loop is strong.

# 9. World Authoring & Performance Architecture

## Data-Driven World

Use `world.json` or equivalent rather than scattered coordinate arrays.

Data should support:

- Camp and gate,
- areas/regions,
- exploration pockets,
- terrain/ground,
- resources,
- Wildkin spawn/home/temperament,
- platforms/ramps/ladders/parkour,
- major Waypoints,
- Extraction Beacons,
- POIs,
- optional lock/unlock requirements.

## Dev-Only Authoring

Keep the author tool deliberately small:

- place/select,
- move/rotate/elevate/resize where relevant,
- duplicate/delete,
- edit important object/anchor/region properties,
- quick Edit ↔ Play,
- deterministic JSON export/save.

Do not build a general-purpose level editor framework.

## Region / Pocket Activation

Three.js frustum culling handles render visibility, but it does not automatically stop AI/physics/gameplay simulation.

Add a lightweight runtime activation manager:

- current region/pocket + nearby neighbors active,
- distant creatures/pickups/colliders/expensive simulation deactivated or not instantiated,
- no per-frame whole-world updates,
- all data/assets remain local and offline,
- no complex async asset streaming unless later profiling proves it necessary.

Near-top-down camera and directed areas make this practical.

# 10. Hackathon Guardrails

Official Devpost rules win on conflicts.

Hard requirements include:

- playable mobile prototype primarily built through AI prompting,
- Three.js / HTML5,
- single player,
- portrait fixed phone viewport,
- self-contained/offline runtime,
- submission ≤35 MB,
- root `index.html`,
- readable/unminified first-party code,
- local vendor/assets/data,
- clear repeatable action, feedback, progression/escalation, success/failure/reset,
- Design Intent,
- Markdown Build Log.

Judging:

- Player Engagement — 30%
- Playability — 25%
- Core Loop Design — 20%
- Focus — 15%
- Originality — 10%

Visual polish is not directly scored, but visual clarity is essential. A judge must immediately distinguish player, resources, Wildkin, danger, pickups, map/POIs, and extraction/progression state.

One strong complete mechanic/loop beats several partial systems.

# 11. Agent Workflow

Read order:

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/PLAYTEST_NOTES.md` for refinement work
4. `docs/ARCHITECTURE.md`
5. `docs/GAME_DESIGN.md`
6. `docs/HACKATHON_REQUIREMENTS.md`
7. relevant source only

Workflow:

1. define one bounded outcome,
2. implement only current slice,
3. run automated gates,
4. human playtest desktop + phone,
5. record highest-value issues,
6. run a bounded refinement pass if needed,
7. commit/lock and move on.

# 12. Re-Baselined Phased Implementation Plan

## Phase 0 — Compliant Foundation — DONE

Portrait Three.js app, local vendors, docs, server, build/validation, offline compliance.

## Phase 1 — Movement & World Feel — DONE / LOCKED FOR NOW

Accepted movement/camera/traversal/mobile foundation.

## Phase 2 — Harvesting Loop — DONE / LOCKED FOR NOW

Accepted Field Tool harvesting, resources, pickups, inventory, audio/feedback foundation.

## Phase 3 — Basic Combat — DONE FIRST PASS

Health, dodge, death/restart, melee/ranged creature prototypes, XP.

## Phase 3.1 / 3.1.1 — Ecology & Combat Validation — COMPLETE / ACCEPTED

Validated:

- projectile/player collision,
- dead creature collision,
- unified Field Tool interaction/cadence,
- cyan faceted XP with collision-aware pop/rest and guaranteed magnet,
- aggressive/territorial/defensive/skittish behavior,
- player + Wildkin reactions,
- home/leash/return,
- lightweight steering,
- anatomical Field Tool handedness,
- regression coverage.

Do not continue isolated arena polish unless a later real-world regression appears.

## Phase 3.5 — Directed-World Foundation

Execute as **two bounded slices**, not one mega-sprint.

### Phase 3.5A — Core-Loop Architecture, World Data & Region Activation — NEXT

Goal: create the minimum clean foundation needed for a real directed expedition.

Build:

- keep `main.js` as composition/fixed-loop wiring,
- introduce focused Expedition/Run Session ownership for temporary run state/lifecycle,
- migrate authored placement into normalized `world.json` or equivalent,
- define Camp/region/pocket/resource/Wildkin/traversal/major-Waypoint/Extraction-Beacon/POI schema,
- make existing systems-test content load through the new data path first,
- add region/pocket activation manager with current + neighbor activation,
- preserve one rAF, fixed step, Rapier ownership, offline build, bounded pools,
- add tests for deterministic world loading and activation/deactivation.

Do **not** build Camp gameplay, map, extraction, bonding, progression, or a full editor yet.

### Phase 3.5B — Minimal Author Mode & Area 1 Skeleton

Goal: human can rapidly shape the first expedition without editing coordinates in gameplay code.

Build only the authoring capability required for Area 1:

- select/place/move/rotate/elevate/resize supported objects,
- duplicate/delete,
- edit region/pocket + anchor/POI properties,
- quick Edit ↔ Play,
- deterministic export/save,
- rough Camp + Area 1 pocket skeleton only for authoring validation.

No final gameplay content polish in this slice.

## Phase 4 — Camp, Map & First Complete Directed Expedition

This is the first major gameplay milestone.

Build:

- alien Camp: drop pod, perimeter fence, dense forest boundary, small Resonator, gate,
- always-accessible top-right map,
- gate-triggered expedition-start selection,
- new save exposes only first start,
- first area with 3–4 wide exploration pockets,
- major Waypoint at area start and next major Waypoint as aspirational frontier progress,
- 1–2 Extraction Beacons only if pacing needs them,
- **EXTRACT / KEEP GOING** prompt on anchor interaction,
- edge POI/extraction indicators,
- unlimited prototype resource inventory + clearer upper-left inventory UI,
- unsecured vs banked run state,
- successful extraction recovery card,
- death/loss card,
- map updates/discovery persistence required for the loop,
- Matter Resonator shell/sync + exactly one simple meaningful spend/unlock,
- at least one visible gated POI that cannot yet be solved,
- immediate next-run flow.

Human test:

- is deeper direction obvious?
- does the player know what is at risk?
- do Beacons create real choices without trivial banking?
- is the next major Waypoint tempting but difficult?
- does success/death make the player want another run?

## Phase 5 — Wildkin Bonding as High-Value Risk

Build:

- one original simple bonding interaction,
- 2–3 readable species max for prototype,
- exactly 1 unsecured capture slot initially,
- bonded Wildkin unsecured until extraction,
- death returns unsecured Wildkin to habitat,
- secured Wildkin visible at Camp,
- choose one active companion,
- right-side Wildkin button/contextual ability flyout,
- one companion ability that materially changes expedition decisions and ideally unlocks one known Area 1 POI.

## Phase 6 — Replayability, Capacity & Gated Revisit

Goal: a later run plays differently for a concrete reason.

Build only what playtests justify:

- persistent local save as needed,
- one or two deliberate progression choices,
- possible capture-capacity upgrade 1 → 2,
- Field Tool/tool/material/companion unlock that opens a remembered POI,
- optional small death-loss mitigation upgrade that never reaches 100%,
- at most one mechanically distinct equipment choice if it truly improves replayability,
- branching skill tree remains optional rather than assumed.

## Phase 7 — Multi-Area Pacing, Waypoint Starts & Final Endpoint

Goal: repeated runs create strategic start/depth choices and a clear long-term prototype objective.

Build/tune:

- next major Waypoint / second area if needed,
- map start selection from activated major Waypoints,
- deeper start tradeoff: skips early gathering/XP/preparation,
- Extraction Beacon spacing based on tension,
- additional gated revisit opportunities only if worthwhile,
- clear final deep-frontier endpoint,
- progression/difficulty tuned so final endpoint is not first-run reachable.

## Phase 8 — Optional Base Expansion & Full Matter Resonator

Only after the expedition/bonding/replay loop is strong.

Optional:

- small resource-driven Camp expansion/free placement,
- useful structures,
- full Resonance deposit → skill-influenced attempt → duplicate-protected discovery loop.

Do not sacrifice expedition quality for this phase.

## Phase 9 — Judge-Ready Competition Loop

A judge should understand the game quickly, complete the core loop in one short session, encounter at least one meaningful secure-or-push decision, and want to replay.

Prioritize:

- readable Camp/map/gate flow,
- 5–10 minute directed expedition,
- strong movement/harvesting/combat/wildlife,
- major Waypoint vs Extraction Beacon clarity,
- risk/extraction/death/result clarity,
- small Wildkin bonding/companion payoff,
- at least one gated revisit tease/payoff,
- enough progression to make repeat play materially different,
- final endpoint visible as a longer-term goal,
- no unnecessary feature counts.

## Phase 10 — Feel, Balance & Mobile Hardening

Only judging-impact issues:

- input/thumb comfort,
- camera/readability,
- run pacing/reward frequency,
- extraction/risk clarity,
- wildlife/companion telegraphs,
- UI hierarchy/map/POI indicators,
- performance/streaming boundaries,
- phone aspect ratios/safe areas,
- audio/visual feedback,
- environmental tutorialization.

## Phase 11 — Submission Hardening

- freeze features,
- offline/network validation,
- final readable/unminified `index.html`,
- vendor/asset/relative-reference checks,
- ZIP structure/size,
- fresh-device start → extraction and start → death playthroughs,
- clean Build Log,
- final Design Intent based on proven game,
- final tagged/committed submission state.

# 13. Definition of Done for Every Slice

A slice is done only when:

- stated player/developer outcome exists,
- accepted gameplay remains functional,
- relevant phone/manual test completed,
- no known game-breaking runtime errors,
- tests/verify/zip remain green,
- portrait/offline constraints remain valid,
- Build Log updated by implementation agent,
- accepted refinement notes are complete or explicitly deferred.

# 14. Immediate Next Actions

1. Treat Phase 3.1.1 as accepted; stop systems-test arena polish.
2. Run **Phase 3.5A** next: architecture/world-data/region-activation foundation only.
3. Run **Phase 3.5B** only after 3.5A validates: minimal author mode + rough Camp/Area 1 pocket skeleton.
4. Before Phase 4 implementation, define Area 1 on paper: pockets, resources, encounters, Extraction Beacon positions, locked POIs, and next major Waypoint pressure.
5. Build Phase 4 end-to-end before broad progression systems.
6. Add bonding/capture as the highest-value unsecured reward immediately after the basic expedition loop works.
7. Re-baseline later phases after repeated phone playtests of expedition + Wildkin risk.

**Wildkin Frontier should make the player want to risk “one more pocket” and then play “one more run.”**
