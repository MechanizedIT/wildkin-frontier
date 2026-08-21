# Wildkin Frontier — Game Design & Build Plan

## Purpose

This is the repository mirror of the living Google GDD for the Meta Horizon Game Prototype hackathon project. It records the current game direction, hard competition constraints, agent workflow, and phased implementation plan.

`docs/CURRENT_SLICE.md` is always the only implementation scope for an agent session. This document is context and roadmap, not permission to build future phases.

# 1. Game Design

## Working Concept

- **Title:** Wildkin Frontier
- **Genre:** Survival & Resource Management
- **Format:** Single-player, portrait mobile web game
- **Presentation:** 3D Three.js world with a fixed high third-person / near top-down camera

## High Concept

A run-based wilderness expedition game built around player agency. Before each run, the player prepares a loadout, chooses a companion, and chooses where to enter the frontier. During the run they explore, harvest resources, gain XP, fight or avoid wild creatures, capture new Wildkin, discover waystones, and decide when to secure their haul versus pushing deeper into increasing danger.

The player is expected to die sometimes. A run should create real tension without erasing all long-term progress.

## Player Fantasy

> I prepare for an expedition, enter a dangerous wild frontier, make my own route, find valuable resources and creatures, decide how far I dare to push, then return stronger and better prepared for the next run.

## Design Pillars

- **Player agency over rails.** The world presents opportunities and danger; it should rarely dictate one mandatory next step.
- **Satisfying moment-to-moment play.** Movement, harvesting, combat, pickups, capture, and companion behavior must feel good before broad meta-progression.
- **Meaningful persistent progression.** The player sees choices and deliberately spends/chooses rather than receiving random three-choice level-ups.
- **Risk creates stories.** Newly collected loot and newly captured Wildkin matter because pushing farther can put them at risk.
- **Collection with utility.** Wildkin are not just checklist entries; companions should meaningfully change a run/loadout.
- **Compact depth.** Prefer a small set of interacting systems over a large amount of shallow content.

## Core Loop

**PREPARE**  
Choose starting point/waystone, active Wildkin, equipment, consumables, and skill configuration.

**EXPEDITION**  
Explore → harvest → fight/avoid → gain XP → capture Wildkin → find better resources → discover landmarks/waystones.

**RISK DECISION**  
Secure what has been found or push farther for rarer rewards and greater danger.

**OUTCOME**  
Extract/return safely and bank gains, or die and lose unsecured expedition cargo.

**PROGRESS**  
Spend skill points, bank/spend resources, improve loadout, organize Wildkin, and choose the next expedition.

## Persistent Progression

Permanent progress should eventually include:

- earned skill points / skill-tree nodes,
- secured Wildkin,
- discovered regions/activated waystones,
- unlocked equipment/recipes/loadout options,
- important permanent world discoveries.

## At-Risk Run Progress

Until secured, a run may put these at risk:

- harvested resources,
- rare materials,
- newly captured Wildkin,
- run consumables/special finds.

Default rule: death should hurt enough to create tension without erasing underlying character progression.

## Skill Tree

The player should be able to inspect a small visible tree and spend points deliberately.

Initial branches:

- Combat
- Harvesting
- Survival
- Bonding

The prototype should demonstrate branching/build choice, not linear upgrades.

## Field Tool, Harvesting & Combat Interaction

The Field Tool is one physical interaction tool, not separate invisible harvest/combat weapons.

- A swing may affect every valid thing actually inside its interaction arc.
- Harvestables receive harvest hits.
- Attackable Wildkin receive combat damage.
- **Auto Harvest** controls whether nearby resources automatically initiate swings when the player is nearly stationary.
- Auto Harvest remains available even when hostile creatures are nearby/attacking.
- Auto Harvest does **not** initiate automatic combat.
- Mobile right-side **tap** = one Field Tool swing.
- Mobile right-side **hold** = repeated swings at allowed cadence.
- Mobile right-side **swipe** = dodge; dodge recognition takes precedence and must not also attack.
- Manual swings can hit resources and valid creatures, giving the player manual harvesting when Auto Harvest is OFF.
- There is **no auto-attack** planned for the current prototype.
- Future ranged weapons should be equipment/loadout choices.

## Wildkin

Wildkin are wild creatures encountered during expeditions. Capture must be more interactive than reducing HP and throwing a generic capture object.

Prototype goals:

- readable at a glance,
- clear field behavior/combat role,
- one active companion selected before a run,
- newly captured Wildkin remains unsecured until extraction/banking,
- lost unsecured Wildkin returns to an appropriate habitat rather than being permanently deleted.

## Wildkin Ecology, Temperament & Perception

Wildkin should feel like wildlife, not generic enemies sharing the same player aggro radius.

Prototype temperament vocabulary:

- **Aggressive:** may attack the player or appropriate nearby creatures on sight.
- **Territorial:** notices/warns first, then attacks actors that enter/persist in personal territory.
- **Defensive:** generally ignores until threatened/attacked, then retaliates.
- **Skittish:** avoids/flees approaching threats and may flee faster when attacked.
- **Predator/prey/rival disposition:** may be used selectively to create readable wildlife interactions.

Wildkin may interact with other Wildkin. A creature can perceive nearby actors and choose to ignore, warn, pursue, attack, flee, or return home based on temperament/species disposition and context.

Each creature should have simple authored data such as:

- home/spawn position,
- roam radius,
- notice range,
- personal-space/territory range,
- leash/return-home distance.

Prefer lightweight obstacle probes/steering and separation before adding A* or a navmesh. Add pathfinding only if the real authored frontier demonstrates repeated failures that simple steering cannot solve.

## Waystones

Waystones are discoverable progression anchors, not linear checkpoints.

They may:

- permanently unlock future starting locations,
- provide a banking/secure interaction,
- offer limited recovery if useful,
- mark deeper progression into dangerous areas.

Starting farther forward should trade early gathering/XP/preparation for faster access to rare/deep content.

## Base, Resource Economy & Long-Term Home

The base is the persistent home between expeditions. Returning safely should preserve more than numbers: the player should see secured Wildkin and other permanent progress.

Banked resources should eventually support competing meaningful sinks:

- known player/tool/equipment/Wildkin upgrades,
- useful base structures/stations,
- optional Matter Resonator discovery attempts.

## Base Building

Long-term vision: Forager-like free placement of useful structures/stations.

Competition prototype scope is budget-dependent. Do not build a large construction/crafting simulation before the expedition/capture loop is strong.

## Base Wildkin

Secured Wildkin should physically wander/idly inhabit the home area so collection is visible. The active expedition companion is selected from the secured pool.

## Matter Resonator

The Matter Resonator is an optional persistent discovery machine:

- deposit materials to earn a Resonance attempt,
- perform a short skill-influenced activation/kickoff interaction,
- reward new possibilities rather than mostly tiny percentage increases.

Potential rewards:

- equipment/tool blueprints,
- structures,
- relics/charms,
- utility items,
- cosmetics,
- frontier/map discoveries.

Guardrails:

- no real-money/premium-currency framing,
- reliable progression exists outside it,
- duplicate protection/non-repeating discovery is preferred,
- resource spending should compete with other useful sinks,
- skill affects outcome without making it fully deterministic.

The Resonator is **optional/budget-dependent** for the competition prototype.

## World Authoring Direction

The competition world should be compact and handcrafted, but the human developer needs to iterate without repeatedly asking an agent to edit coordinates.

### Runtime/source of truth

Use a simple data-driven world definition such as `world.json` rather than scattered placement arrays in gameplay code.

It should support:

- terrain/ground,
- harvestables,
- Wildkin spawn/home/temperament data,
- platforms,
- ramps,
- ladders,
- parkour/jump elements,
- waystones,
- future points of interest.

### Dev-only author mode

Preferred capabilities:

- place/select,
- move,
- rotate,
- elevate,
- resize where useful,
- duplicate,
- delete,
- quick **Edit ↔ Play** switching,
- deterministic export/save of world data.

Parkour should be directly authored because platform dimensions, elevation, rotation, and rapid testing matter.

An optional colored object-map PNG / grayscale heightmap importer may later create a broad first draft, but imported data must become the same editable world definition. This is an authoring workflow, not procedural world generation.

## World & Difficulty

Danger should primarily be spatial, not timer-driven. Farther from safety should generally mean:

- stronger or more complex threats,
- more valuable resources,
- rarer Wildkin opportunities,
- more environmental/traversal pressure,
- higher extraction stakes.

Judge this in the real authored frontier, not the cramped systems-test arena.

## Prototype Session Goal

The prototype should support success and failure. A successful run secures meaningful progress and returns/extracts; death is failure. Deeper waystones/rare discoveries may provide escalating objectives. A final deep-frontier objective is optional if playtesting shows the session needs stronger direction.

## Camera & Controls

- fixed high third-person / near top-down,
- portrait-first,
- one-thumb movement possible,
- avoid normal-play camera rotation,
- interactions large/contextual,
- combat/harvesting minimize tiny precision targets.

## Prototype Non-Goals Until Core Loop Is Strong

- large open world,
- multiplayer,
- large/complex base-building simulation,
- dozens of Wildkin,
- complex crafting trees,
- procedural world generation,
- story campaign/quest chains,
- monetization,
- online accounts/backend,
- elaborate character customization.

## Resolved & Open Design Questions

### Resolved

- Manual combat input: tap = one swing, hold = repeated swings, swipe = dodge.
- No auto-attack in current prototype.
- Unified Field Tool interaction: one swing may hit harvestables + attackable Wildkin.
- Auto Harvest stays available during danger and only auto-initiates resource-driven swings.
- Wildkin use temperament/ecology rather than universal instant player aggro.
- Wildkin may react to/attack/flee from other Wildkin.
- Lightweight steering before A*.
- Ranged combat belongs primarily to equipment/loadout progression.
- Data-driven world + dev author mode is the preferred authoring path.

### Open

- Exact Wildkin capture/bonding mechanic.
- XP/skill-point retention after failed runs.
- Waystone banking cost/cooldown rules.
- Whether the competition build needs a final deep-frontier objective.
- Matter Resonator activation mechanic if it makes scope.
- Exact resource costs and competition between spending sinks.
- How much base free-placement belongs in the competition build.

# 2. Hackathon Requirements & Guardrails

## Official Source

Meta Horizon Creator Competition: Game Prototype on Devpost. If this repository conflicts with official rules, Devpost wins.

## Hard Build Requirements

- genuinely playable mobile game prototype created primarily with AI prompting,
- Three.js / HTML5,
- single-player,
- portrait orientation/fixed phone viewport during play,
- self-contained and playable without external runtime network requests,
- submission package <=35 MB,
- `index.html` at ZIP root,
- first-party code readable/unminified in submitted `index.html`,
- third-party libraries in `/vendor` with relative paths,
- local assets/audio/fonts/data,
- primary repeatable action, real-time feedback, progression/escalation, clear success/failure/reset,
- Design Intent document required,
- Markdown Build Log required.

## Chosen Genre

Survival & Resource Management.

## Judging Priorities

- Player Engagement — 30%
- Playability — 25%
- Core Loop Design — 20%
- Focus — 15%
- Originality — 10%

Visual polish is not a direct scoring category, but feel/readability materially support the scored categories.

## Project Implications

- A small fun/reliable game beats a broad feature list.
- The milestone is not “systems complete”; it is “fun to move, harvest, fight, risk something, and restart.”
- Every phase preserves a playable build.
- Mobile testing happens continuously.
- Packaging/validation stays green throughout development.
- Build Log is maintained during normal work.

# 3. Agent-Friendly Repository Rules

Agent read order:

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/PLAYTEST_NOTES.md` for refinement slices
4. `docs/ARCHITECTURE.md`
5. `docs/GAME_DESIGN.md`
6. `docs/HACKATHON_REQUIREMENTS.md`
7. relevant source files only

`CURRENT_SLICE.md` is implementation scope. This roadmap is not.

# 4. Recommended Build Workflow

Use a **Human → Agent → Human** loop rather than long autonomous mega-sprints.

1. Define one bounded player-visible outcome.
2. Agent implements only the current slice.
3. Run automated gates.
4. Human playtests desktop + phone.
5. Record what actually felt good/bad/confusing.
6. Give a refinement session only accepted notes.
7. Lock/commit and move on.

Use stronger models for cross-system architecture/difficult bugs/review; cheaper models are suitable for well-specified implementation, cleanup, tests, config, and bounded fixes.

# 5. Re-Baselined Phased Implementation Plan

## Phase 0 — Compliant Foundation — DONE

Portrait Three.js scene, local vendor dependencies, repository/docs, local server, submission build/validation, offline constraints.

## Phase 1 — Movement & World Feel — DONE / LOCKED FOR NOW

Player movement, camera, Rapier kinematic capsule/controller, run/sneak/jump/fall/air control, dodge, ladder/mantle, collision/grounding, mobile input, systems-test playground.

Movement has been human-playtested and is accepted enough to avoid destabilizing while later systems are built.

## Phase 2 — Harvesting Loop — DONE / LOCKED FOR NOW

Three resources, Auto Harvest, manual/automatic Field Tool swings, in-range focus, vertical-aware targeting, visible depletion, pooled drops, magnet collection, temporary inventory, respawn, audio/particles, performance hardening.

Harvesting has been iteratively human-refined and is accepted as the current foundation.

## Phase 3 — Basic Combat Foundation — FIRST PASS DONE

Player-visible goal: frontier becomes dangerous and player can intentionally fight, dodge, take damage, die, and restart.

Implemented direction:

- mobile tap attack / swipe dodge,
- desktop explicit attack/dodge,
- Field Tool melee,
- broad frontal attack readability,
- health/damage/knockback/i-frames,
- Rusher melee prototype,
- Spitter ranged prototype,
- temporary XP,
- death + fast restart.

Human test: combat is readable/fundamentally viable, but projectile collision, dead colliders, harvest/combat interaction, and wildlife identity require refinement.

## Phase 3.1 — Creature Ecology & Combat Refinement — NEXT

Player-visible goal: wild creatures begin to feel like inhabitants of a frontier rather than generic enemies while combat correctness/interaction rules are resolved.

Build:

- fix Spitter projectile/player collision,
- disable dead/respawning creature colliders and restore safely,
- one physical Field Tool interaction against resources + attackable Wildkin,
- keep Auto Harvest active during danger,
- Auto Harvest only auto-initiates swings for resources,
- tap = one swing, hold = repeated swings, swipe = dodge,
- manual swings can harvest as well as damage creatures,
- replace gold XP with larger glowing blue/cyan essence,
- add data-driven temperaments: aggressive / territorial / defensive / skittish,
- allow selected Wildkin-vs-Wildkin reactions/attacks/fleeing,
- add home/roam/notice/personal-space/leash behavior,
- add lightweight obstacle steering/separation,
- do not add A* unless later evidence requires it.

Human test:

- do creatures behave differently before being attacked?
- can wildlife interactions happen without the player?
- can player keep harvesting while deciding to avoid/fight/intervene?
- do tap/hold/swipe gestures remain clear?
- are projectile hits, dead collision, XP rewards reliable?

## Phase 3.5 — Architecture & World Authoring Foundation

Player-visible/developer goal: preserve modular code before adding run persistence and make the frontier fast for a human to author/test.

Architecture goals:

- return `main.js` to composition/fixed-loop ownership rather than domain rules,
- introduce clear Expedition/Run Session ownership for temporary run state,
- keep Field Tool/action/hit ownership explicit,
- separate creature perception/temperament, locomotion/steering, and combat behavior enough to avoid catch-all scripts,
- preserve one rAF/fixed-step/Rapier/offline/performance constraints.

World-authoring goals:

- move placements into `world.json` or equivalent,
- support terrain/resources/creature spawn-home/platform/ramp/ladder/parkour/waystone/POI data,
- add dev-only place/select/move/rotate/elevate/resize/duplicate/delete,
- quick Edit ↔ Play loop,
- deterministic export/save,
- optional later PNG/heightmap import only as first-draft generation.

Human test: can the developer move/place a platform/tree/spawn, instantly playtest, return to edit, adjust, and repeat without asking an agent to edit coordinates?

## Phase 4 — Real Frontier & First Complete Expedition Loop

Player-visible goal: an ugly but complete real run in a compact connected frontier:

**leave home → explore/harvest/fight → decide to return/push → extract/bank or die/lose unsecured cargo → immediately try again.**

Build:

- replace cramped systems-test arena with compact connected authored frontier,
- small home/safe clearing,
- at least two meaningful routes, including room for traversal/parkour,
- one riskier/deeper area,
- unsecured vs banked resources/run state,
- clear return/extraction interaction,
- death loses unsecured cargo,
- successful extraction banks it,
- run summary + immediate next-run flow,
- at least one reliable banked-resource spend that visibly improves next run,
- no requirement for free-placement base building yet.

This is the first major milestone. Do not broadly expand until the run loop is understandable and somewhat enjoyable.

## Phase 5 — Wildkin Capture, Security & Companion

Player-visible goal: capturing/securing a Wildkin creates a memorable reason to survive the trip home.

Build:

- one original simple capture/bonding interaction,
- 2–3 prototype species with readable silhouettes/temperaments/roles,
- captured = unsecured during run,
- death returns unsecured Wildkin to habitat,
- extraction secures it,
- secured Wildkin visibly inhabit home,
- choose one active companion before run,
- each companion has one distinct useful behavior.

## Phase 6 — Equipment, Loadout & Deliberate Progression

Player-visible goal: intentionally plan different builds for future expeditions.

Build:

- persistent local save,
- XP / skill-point retention rules,
- small branching Combat/Harvesting/Survival/Bonding tree,
- deliberate point spending,
- home loadout selection,
- at least one mechanically different equipment choice,
- ranged weapon is a strong candidate and should be acquired/equipped gear,
- Field Tool remains melee/harvest option,
- a few reliable resource purchases/upgrades that noticeably alter play.

Skills shape the build; gear changes actions/tools.

## Phase 7 — Waystones & Player-Directed Depth

Player-visible goal: discover progression anchors and choose future entry points, trading early preparation for deeper rewards/danger.

Build:

- ~2 discoverable waystones if world scale supports them,
- permanent activation,
- banking/limited recovery if useful,
- start-location selection,
- deeper starts skip some early resource/XP opportunities,
- distinct danger/resource/rare-Wildkin/traversal pressure deeper in world.

## Phase 8 — Optional Base Utility & Matter Resonator

**Budget-dependent. Add only if expedition/capture/progression are already strong.**

Possible build:

- 1–2 or a few useful placeable structures,
- competing resource sinks,
- Matter Resonator deposit → attempt,
- one short skill-influenced activation interaction,
- small duplicate-protected discovery pool,
- rewards that unlock meaningful possibilities.

Do not sacrifice stronger core systems just to hit base-system counts.

## Phase 9 — Competition Vertical Slice

Player-visible goal: one cohesive prototype demonstrates the actual intended fantasy without future promises.

Prioritize:

- one compact connected authored frontier + home,
- strong movement/traversal/harvesting/combat,
- wildlife temperament/ecology,
- risk/extraction/death/restart,
- small Wildkin roster sufficient to prove capture + companion,
- meaningful loadout/skill choices if worthwhile,
- waystones only if world scale makes them strategic,
- optional base/Resonator only if proven,
- one deeper aspirational objective/rare discovery if session needs stronger direction.

Do not add content solely to hit counts.

## Phase 10 — Feel, Balance & Mobile Hardening

Focus only on issues that materially affect judging:

- input responsiveness/thumb comfort,
- traversal readability,
- Field Tool/combat/harvest timing,
- creature telegraphs/temperament readability,
- camera framing,
- run pacing/reward frequency,
- risk/reward clarity,
- capture/companion differentiation,
- equipment/skill differentiation,
- performance/long-session stability,
- phone aspect ratios/safe areas,
- audio/visual feedback,
- environmental/UI tutorialization.

## Phase 11 — Submission Hardening

- freeze features,
- offline/network validation,
- final readable/unminified `index.html`,
- verify `/vendor` + relative asset references,
- ZIP structure/size,
- fresh-device playthrough to extraction and death,
- clean Build Log,
- final Design Intent based on proven game,
- preserve final tagged/committed state.

# 6. Definition of Done for Every Slice

A slice is done only when:

- the player-visible outcome exists,
- it works on phone,
- existing accepted gameplay still works,
- no known game-breaking runtime errors remain,
- hackathon packaging remains valid,
- agent updates Build Log,
- human playtests it,
- accepted refinement notes are completed or explicitly deferred.

# 7. Immediate Next Actions

1. Complete and human-playtest **Phase 3.1 — Creature Ecology & Combat Refinement**.
2. Lock combat/wildlife only when projectile hits, dead colliders, Field Tool interaction, temperaments, and hold-to-attack feel reliable on phone.
3. Run **Phase 3.5 — Architecture & World Authoring Foundation** before adding extraction, persistence, or companion systems.
4. Use authoring workflow to replace systems-test arena with the first small connected frontier.
5. Implement Phase 4 complete expedition loop: unsecured cargo, return/extraction, banked gains, death loss, one reliable spend.
6. Prioritize Wildkin capture/security/companion immediately after the run loop, before broad base/Resonator scope.
7. Re-baseline later phases again after both the complete expedition loop and capture/companion loop have been human-playtested.

**The project should earn complexity. Every new system must justify itself by improving the playable loop.**
