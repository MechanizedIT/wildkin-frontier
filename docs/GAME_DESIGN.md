# Game Design — Repository Mirror (Stable Decisions)

> Concise mirror of the living Google GDD / `docs/PROJECT_PLAN.md`. Stable decisions belong here; unresolved mechanics are marked open. Do not invent unresolved mechanics.

## Working Concept

- **Title:** Wildkin Frontier
- **Genre:** Survival & Resource Management
- **Format:** Single-player, portrait mobile web game (Three.js/HTML5)
- **Camera:** Fixed high third-person / near top-down
- **Target session:** roughly 5–10 minutes for one meaningful expedition

## High Concept

Wildkin Frontier is a short-session survival expedition game built around one central decision:

> **How far do I dare push before I turn back and secure what I found?**

The player moves through a handcrafted directed frontier made of wide exploration pockets rather than a large open world or forced endless runner. Forward/deeper means visibly better rewards and greater danger. The player may always retreat.

Harvesting, wildlife, combat, traversal, bonding, extraction, and progression all exist to strengthen the same loop:

**acquire value → see temptation ahead → assess danger → secure or push → experience consequence → change the next run**.

## Design Pillars

- **Directed freedom, not rails or sprawl.** Local exploration is free, but deeper direction is readable.
- **Risk creates stories.** The player should often possess something worth protecting while seeing something tempting farther ahead.
- **Satisfying physical verbs.** Movement, Field Tool harvesting/combat, pickups, wildlife reactions, and later bonding must feel good.
- **Wildkin collection has utility.** Companions change decisions and can unlock traversal/POI opportunities.
- **Persistent progress is deliberate.** Avoid random three-choice level-ups as the primary progression model.
- **Compact depth.** Prefer a few interacting systems and revisitable spaces over feature counts.

## Camp & First Launch

Camp is a small clearing on an alien planet surrounded by tall, dense forest and a basic perimeter fence.

Initial Camp contains:

- the player's **drop pod**,
- the **frontier gate**,
- a small **Matter Resonator**,
- room for secured Wildkin to visibly inhabit later.

Camp is the physical home/menu between expeditions. It should be readable immediately and stay small for the prototype.

Long-term, the clearing may expand outward in a Forager/Dreamdale-like way by spending resources. Free placement/base expansion is not required for the core competition loop.

### First launch flow

1. Player gains control at Camp beside the drop pod.
2. Map button is always visible at top-right.
3. First map view shows only Camp and the frontier gate/start.
4. Walking through the gate opens the expedition-start map.
5. On a new save only the first area/start is selectable.
6. Later activated **major Waypoints** appear as selectable future starts.

Avoid a long intro/cutscene. Teach the game primarily through geography, readable interactions, and short contextual prompts.

## Core Loop

**PREPARE**  
Begin at Camp. Check map/frontier progress, choose an available major Waypoint start, active companion/loadout when those systems exist, then leave through the gate.

**EXPEDITION**  
Move through directed exploration pockets → harvest / avoid / fight / bond → accumulate unsecured value → discover POIs, extraction opportunities, and tempting deeper rewards.

**RISK DECISION**  
At an Extraction Beacon or major Waypoint choose **EXTRACT** or **KEEP GOING**.

**OUTCOME**  
Extraction returns to Camp and banks the run. Death returns to Camp and loses unsecured value.

**PROGRESS**  
See map/Camp progress, synchronize recovered matter, make a small meaningful upgrade/loadout choice, secure Wildkin, then go again.

## Frontier Anchors: Major Waypoints vs Extraction Beacons

Use two distinct anchor roles so safe banking does not trivialize risk.

### Major Waypoint

- Normally marks the beginning of an area or a meaningful frontier step.
- First activation permanently adds it to the map.
- Becomes a selectable starting location for future expeditions.
- Can also extract the current run.
- Reaching the **next** major Waypoint should feel like a major accomplishment.

### Extraction Beacon

- Smaller mid-area anchor.
- Allows extraction/banking and return to Camp.
- **Never** becomes a future starting location.
- Use roughly 1–2 between major Waypoints only when pacing benefits.

Interacting with either anchor opens a simple:

**EXTRACT / KEEP GOING**

This preserves the decision: extracting halfway through an area is safe, but the next run still begins at the last major Waypoint and must replay that stretch.

## Map & POI Guidance

- Map is always accessible from a top-right button.
- Map progressively reveals Camp, major Waypoints, discovered Extraction Beacons, and important discovered POIs.
- Only activated major Waypoints are selectable expedition starts.
- Undiscovered territory can remain vague/obscured.
- A discovered but inaccessible POI may remain marked as a reason to revisit later.
- Edge-of-screen indicators may point toward nearby extraction opportunities behind/ahead and important forward POIs/major Waypoints.

## Persistent vs At-Risk Progress

Persistent progress may include:

- activated major Waypoints / map discoveries,
- secured Wildkin,
- equipment/tool/ability unlocks,
- deliberate progression choices,
- important solved POIs / frontier discoveries.

At-risk during a run:

- harvested resources and rare materials,
- newly bonded Wildkin,
- run consumables / special finds.

Prototype **resource inventory may remain unlimited**. Do not add a second inventory-pressure system before it proves useful.

## Wildkin Capture Capacity

Wildkin should provide the early meaningful carry constraint.

Prototype starting rule:

- one active companion may be brought from Camp once companions exist,
- player can carry **1 unsecured newly bonded Wildkin** during a run,
- later progression may increase capture capacity (for example 1 → 2 → 3),
- encountering another desirable Wildkin while full should create a real decision rather than auto-expanding capacity.

Exact bonding/capture interaction remains open, but it must be more interactive than reducing HP and throwing a generic capture object.

## Wildkin Ecology & Temperament

Wildkin are wildlife, not a map full of identical enemies.

Prototype temperaments:

- **Aggressive:** may attack player or configured Wildkin on sight.
- **Territorial:** warns/notices before attacking intrusion.
- **Defensive:** ignores until threatened/attacked, then retaliates.
- **Skittish:** avoids/flees threats and flees urgently when attacked.
- Select predator/prey/rival relationships may create readable wildlife interactions.

Each field creature should have authored home/roam/notice/personal-space/leash data.

Use lightweight obstacle probes/steering first. Add A*/navmesh only if the real frontier repeatedly proves simple steering insufficient.

## Field Tool, Harvesting & Combat

The Field Tool is one physical interaction tool.

- One swing may affect valid harvestables and attackable Wildkin inside its physical arc.
- Auto Harvest only initiates resource-driven swings while nearly stationary.
- Enemy presence does not disable Auto Harvest.
- There is no auto-attack.
- Mobile right-side tap = one manual swing.
- Hold = repeated swings at shared Field Tool cadence.
- Swipe = dodge and takes precedence.
- Manual swings can harvest while Auto Harvest is OFF.
- Future ranged weapons are equipment choices, not replacements for this interaction model.

## Gated Revisits & Wildkin Utility

Earlier areas should contain memorable visible opportunities the player cannot solve on the first visit.

Examples:

- pond + chest on an island when the player cannot swim,
- broken bridge requiring materials not yet obtainable,
- cliff/route requiring a traversal ability,
- boulder/barrier requiring a stronger tool or Wildkin,
- resource deposit requiring a Field Tool upgrade.

Later Wildkin, tools, materials, or skills can unlock these POIs. This gives small areas long-term value without requiring a giant open world.

Some future Wildkin may be mountable or grant traversal abilities such as swimming/climbing/gliding/breaking. Treat these as creature-specific utility, not a giant generic ability framework.

## HUD / Companion Action Direction

- Map button: top-right.
- Resource inventory: upper-left; hide zero-count entries; container may scroll if the list later grows.
- Preserve large contextual touch interactions and avoid tiny targets.
- Right side may become a vertical action stack.
- Future active-Wildkin button shows companion icon; tapping opens a small flyout with only supported contextual commands such as **Ability**, **Command**, or **Mount / Dismount**.

Prototype only needs the actions required by its actual companions.

## Camp, Matter Resonator & Economy

The small Matter Resonator is physically present from first launch.

For the prototype it can be the readable place where recovered matter is synchronized/banked and where a very small number of unlocks/upgrades become available.

A larger skill-influenced Resonance-attempt/discovery minigame remains optional and must not displace the expedition loop.

Camp expansion/base building is future depth; only a taste of persistent home progression is needed for the competition build.

## World Authoring & Runtime Scale

The competition frontier should be handcrafted, data-driven, and fast for a human to tune.

- Use `world.json` or equivalent as runtime placement/source of truth.
- Support Camp/gates, areas/regions, exploration pockets, terrain, resources, Wildkin homes/spawns, traversal geometry, major Waypoints, Extraction Beacons, POIs, and optional unlock requirements.
- Add a small dev-only author mode for place/select/move/rotate/elevate/resize/duplicate/delete and quick Edit ↔ Play iteration.
- Gated POIs and traversal challenges should be explicit authored data/geometry.

### Spatial activation / streaming

Three.js render frustum culling helps drawing performance, but it does **not** stop distant gameplay simulation by itself.

The runtime should have a lightweight region/pocket activation manager:

- current region/pocket + nearby neighbors active,
- distant creatures, pickups, expensive AI, and physics/colliders deactivated or not instantiated,
- avoid per-frame work for the whole frontier,
- all assets/data remain local/offline,
- full asynchronous asset streaming is unnecessary until profiling proves it is needed.

The fixed near-top-down camera makes aggressive spatial activation practical because only a limited local area needs to be visually/simulated at once.

## World & Difficulty

Danger is primarily spatial, not timer-driven.

Farther from the last secure point should generally mean:

- more complex/stronger threats,
- more valuable resources,
- rarer Wildkin,
- more traversal/environment pressure,
- higher extraction stakes.

Layouts should deliberately place temptation beyond danger.

## Prototype First-Session Target

The first meaningful session should roughly teach:

**Camp → gate/map → first-area start → safe harvest pocket → first complication → Extraction Beacon → stronger temptation / visible gated mystery → higher-value unsecured reward → another extraction opportunity → glimpse/pressure toward next major Waypoint → extract or die → Camp results → immediate desire to retry.**

The competition prototype **will have a clear final deep-frontier endpoint**, but it should require progression and should not be realistically reachable on the first run.

## Death & Results

On successful extraction:

- return to Camp,
- show compact recovery card with materials, XP, secured Wildkin / important finds,
- return to player control quickly.

On death:

- respawn at Camp,
- show loss card listing unsecured value lost,
- underlying permanent progression remains.

Future survival progression may retain a percentage of resources on death, but never 100%; loss must continue to matter.

## Prototype Non-Goals Until Core Loop Is Strong

- large seamless open world,
- endless/procedural course,
- multiplayer,
- large base-building simulation,
- dozens of Wildkin,
- complex crafting trees,
- procedural world generation,
- story quest chains,
- monetization/backend/accounts,
- elaborate customization,
- full Resonator minigame before expedition quality.

## Resolved Decisions

- Directed frontier of wide exploration pockets, not open-world sprawl or forced runner.
- Camp begins as drop pod + small Resonator + perimeter fence + frontier gate in dense alien forest.
- Always-accessible map; gate opens expedition-start selection.
- Major Waypoints unlock future starts; Extraction Beacons only extract.
- Either anchor offers **EXTRACT / KEEP GOING**.
- Resource inventory may be unlimited in prototype.
- Wildkin unsecured capture capacity starts at 1 and may be upgraded later.
- Prototype includes a final endpoint that should not be first-run reachable.
- Earlier areas should contain gated revisitable POIs.
- Region/pocket spatial activation belongs in the directed-world architecture.
- Unified Field Tool/manual combat/Auto Harvest rules remain locked from Phase 3.1.1.

## Open Questions

- Exact Wildkin bonding/capture mechanic.
- Exact first prototype Wildkin species/ability.
- Exact XP/skill-point retention rules after death.
- Exact first Matter Resonator unlock/spend.
- Exact Area 1 POIs, encounter pacing, Beacon locations, and first major Waypoint target.
- Which companion abilities/mounts make the competition cut versus later game.
