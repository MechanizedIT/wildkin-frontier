# Game Design — Wildkin Frontier

> Current product direction: independent single-player expedition game. On September 9, 2026, Chris authorized autonomous design and implementation of a playable beta candidate and superseded the former hackathon/phase/owner-only composition restrictions. The core vision below is retained. Historical references to competition cuts, Phase 4B limits, or unimplemented prototype systems do not describe the current 0.2 candidate.

## Beta 0.2 implementation and provisional design

**September11 owner continuation (implementation pending):** area transitions should be unique clearing/repair problems grounded in local terrain and wreckage, including fallen alien growth, blocked ravines and cave rubble. Camp is an emergency fortified crash site. Expansion secures adjoining sections, with new perimeter barricades automatically built as part of each clearing/resource cost. This supersedes the generic gate/farm-fence presentation and abstract expansion-only intent; exact tasks, plot shapes and costs remain provisional in the crashland proposal.

**September11 new owner direction (implementation pending):** the player's landing pod crashed after a colony/research ship or station incident. A Camp robot/drone, scattered supplies/crates/beacons/teleportation equipment and progressively larger wreck sites tie exploration to parts, blueprints, new equipment and crafting. The desired survival inventory has draggable/sortable items, finite upgradeable backpack capacity and physical Camp storage. This explicitly supersedes historical unlimited-carry/infinite-bank design statements. The current implementation table below remains useful runtime evidence while a coherent replacement is designed in `CRASHLAND_PROGRESSION_PROPOSAL.md`. Exact plot, capacities, blueprint costs and recovery rules are provisional until implemented and playtested.

The player can complete a Camp-to-Heartwood campaign across five expedition regions, collect four Wildkin, revisit four ability-sealed caches, craft medkits, buy fifteen upgrade tiers, repair gates, discover travel starts, and secure the Heartwood Core after defeating its Guardian. The campaign remains open for collection and upgrade completion after its ending.

The following choices are implemented for this candidate under Chris's broad design authorization; their exact feel/balance has **not** been accepted by Chris:

| System | Candidate behavior |
| --- | --- |
| Bonding | September 11 overnight revision: Mossling berry lure/space/feeding, Tidefin dry-bank snare/release, Emberhorn avoided charge/tether/food, Skydancer quiet chime/perches. These replace the universal timing modal; field attempts are under integrated mobile review. New bonds remain at risk until extraction. |
| Companions | Mossling heals; Tidefin shields for three seconds; Emberhorn sends a damaging shockwave; Skydancer leaps upward. Choose one secured companion at Camp. Each opens a matching seal. |
| Capacity | One unsecured bond initially; Wildkin Shelter tiers raise capacity to two, three, then four. Secured species cannot be captured repeatedly. |
| Progression | Banked XP determines level; carried XP is lost on death. Five three-tier upgrade families use secured matter. Field milestones grant one-time secured rewards. |
| Healing | Craft medkits at Camp from Fiber and Berries; Field Medicine increases their healing. Mossling provides a reusable healing option. |
| Camp building | Persistent free placement in an expandable clearing; floors, walls, doorway, fence, lantern, workbench and Wildkin bed. Rotate, cancel and remove/refund. Foundations support walls/furniture; routes/services stay clear. Initial art, recipes and dimensions are provisional. The bed's rest behavior remains unfinished. |
| Field crafting | Secured resources make lures/snares at Salvage, medkits/tethers at Matter fabricator and chimes at Resonance. Basic Camp crafting remains available; advanced gear requires its matching placed station. Visible operating parts and seated products accompany one atomic inventory transaction. Equipment persists, while placed field attempts clear on travel/death. |
| Economy | Gate repair spends carried materials and persists immediately. Every required gate material has a renewable source in reachable regions. Camp upgrades spend banked matter. |
| Finale | The Heartwood Guardian guards the Core. Amber rings warn before area impacts; at low health it chains strikes. The Core only completes the campaign when extracted. Losing it leaves it recoverable. |
| Saving | Browser-local secured progress, validated export/restore at Camp. Unfinished expeditions are not resumed after reload. |

Target expedition length remains 5–10 minutes; complete campaign duration and sustained physical-phone performance are unmeasured. Mounts, swimming/gliding, expanded combat loadouts and a larger narrative campaign remain future work. Chris explicitly authorized free base building and task-specific taming equipment on September 11; those are active work, with current status in OVERNIGHT_MANDATE.md. The authoring system supports new creatures and content; new bonded abilities require a deliberate catalog/runtime addition.

See `BETA_RELEASE_PLAN.md`, `BETA_PLAYTEST_GUIDE.md`, and `BETA_CANDIDATE_REPORT.md` for current delivery scope and proof. The sections below preserve the foundational design and its historical rationale; candidate details above supersede older “open” or “later” wording for implemented systems.

## Working Concept

- **Title:** Wildkin Frontier
- **Genre:** Survival & Resource Management
- **Format:** Single-player, landscape-first mobile web game (Three.js/HTML5), explicitly changed by Chris on September 10, 2026. Keep a usable portrait fallback.
- **Camera:** Fixed high third-person / near top-down
- **Target session:** roughly 5–10 minutes for one meaningful expedition

## High Concept

Wildkin Frontier is a short-session survival expedition game built around one central decision:

> **How far do I dare push before I secure what I found?**

The frontier is a **handcrafted graph of self-contained sections**, not one giant seamless coordinate plane. A section is a compact authored play space with its own ecology, resources, traversal, secrets, extraction opportunities, and connections. Ruined/active portal gates connect sections without requiring their physical world geometry to touch.

This structure keeps local exploration free while making long-term frontier progression readable:

**Camp → enter a known section → gather / fight / explore → discover its Waypoint → extract or push → repair a gate → unlock another section → return stronger.**

Harvesting, wildlife, combat, traversal, parkour challenges, loot, bonding, extraction, portal construction, and progression all exist to strengthen the same loop:

**acquire value → discover opportunity → assess danger → secure / spend / push → experience consequence → change the next run**.

## Design Pillars

- **Directed freedom, not rails or sprawl.** Local exploration is free, but deeper direction is readable.
- **Risk creates stories.** The player should often possess something worth protecting while seeing something tempting farther ahead.
- **Satisfying physical verbs.** Movement, Field Tool harvesting/combat, pickups, wildlife reactions, and later bonding must feel good.
- **Wildkin collection has utility.** Companions change decisions and can unlock traversal/POI opportunities.
- **Persistent progress is deliberate.** Avoid random three-choice level-ups as the primary progression model.
- **Compact depth.** Prefer a few interacting systems and revisitable spaces over feature counts.

## Camp & First Launch

Camp is the player's persistent home on the alien planet.

## Standard Camp footprint

Use a **100×100 Camp ground tile**, conceptually a 2×2 group of standard 50×50 world cells.

Future Camp expansion uses **25×25 plots**, giving a full 100×100 Camp sixteen possible plots. The prototype does not need to unlock/build all sixteen plots yet, but the spatial convention should be established now so later Camp growth does not require a map rewrite.

Initial Camp contains:

- the player's drop pod,
- the frontier gate,
- a small Matter Resonator,
- a basic perimeter,
- room for future structures and secured Wildkin.

Camp remains a special persistent section rather than a normal expedition section.

## First launch flow

1. Player gains control at Camp beside the drop pod.
2. Map button is always visible at top-right.
3. A fresh map shows Camp and known frontier information only.
4. The **Camp Frontier Gate is a portal, not a Major Waypoint**.
5. The Camp gate always opens travel selection. **Forest Edge** is the known Section 1 entry and is always clickable, including on a fresh save.
6. A fresh selector contains Forest Edge only; it does not show a decorative gate row, Beacons, or ordinary Portal Gates as starts.
7. The player starts outside the physical Forest Edge arrival gate, explores Section 1, and must physically discover its Major Waypoint.
8. Once discovered, that Waypoint becomes an additional selectable future expedition start. Later discovered section Waypoints join the same list.

Forest Edge remains available after Waypoints are known. Re-entering its physical Section 1 gate during an active run asks for confirmation, then returns to Camp through the normal extraction/banking result path.

Avoid long intros/cutscenes. Teach primarily through geography, landmarking, readable interactions, and short contextual prompts.

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

## Frontier Anchors: Portal Gates, Major Waypoints & Extraction Beacons

These are three distinct concepts.

## Portal Gate

Portal Gates define **section-to-section topology**.

- Gates connect as explicit pairs/links; geometry does not need to be spatially adjacent.
- A section may have one or more outgoing Portal Gates.
- An entry portal determines where the player arrives in the destination section.
- A ruined/locked gate may require a minimum player level and resources to rebuild.
- Gate construction is persistent frontier progress.
- Resources spent rebuilding a gate are secured into that progress immediately; dying afterward does not undo the repaired connection.
- The Camp Frontier Gate is the special home-side portal into the frontier.

Portal Gates are **not** expedition-start Waypoints.

## Major Waypoint

- Each standard expedition section should normally have **one** Major Waypoint somewhere in the section, usually away from the entry portal.
- The Waypoint begins undiscovered unless explicitly configured otherwise.
- First physical discovery permanently adds it to the map.
- Once discovered, it becomes a selectable starting location for later expeditions.
- Discovering a Waypoint therefore shortens future runs and is meaningful persistent progress.
- A Major Waypoint may also permit extraction when that benefits the current loop, but its primary identity is persistent start unlock.

## Extraction Beacon

- Smaller safety anchor.
- Allows extraction/banking and return to Camp.
- Never becomes a future starting location.
- A section may have zero, one, or several Beacons depending on its intended risk curve.

At a valid extraction anchor, preserve the simple:

**EXTRACT / KEEP GOING**

The distinction is now:

**Portal = reach another section. Waypoint = start here later. Beacon = secure this run.**

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

## Section Content Grammar

A standard expedition section should be designed from a reusable checklist rather than from a required linear route.

Typical ingredients:

- 1 entry portal,
- normally 1 discoverable Major Waypoint,
- 0+ Extraction Beacons,
- 1+ outbound Portal Gates,
- at least 1 secret/revisit reward,
- at least 1 optional traversal/parkour challenge when appropriate,
- authored resource clusters,
- authored Wildkin ecology/encounters,
- landmarks that make navigation readable.

Not every future section must contain every ingredient, but the Section Author summary should make omissions intentional.

The designer—not an agent—decides exact geometry, routes, encounters, visual composition, resource placement, and challenge layout.

## HUD / Companion Action Direction

- Map button: top-right.
- Resource inventory: upper-left; hide zero-count entries; container may scroll if the list later grows.
- Preserve large contextual touch interactions and avoid tiny targets.
- Right side may become a vertical action stack.
- Future active-Wildkin button shows companion icon; tapping opens a small flyout with only supported contextual commands such as **Ability**, **Command**, or **Mount / Dismount**.

Prototype only needs the actions required by its actual companions.

## Camp, Matter Resonator & Economy

The Matter Resonator is physically present from first launch.

For the prototype it is the readable Camp place where recovered matter enables persistent upgrades.

The stopped Phase 4B pass implemented a useful first upgrade concept, **Matter Attractor I**: increased pickup magnet radius/speed. Keep that player-facing effect, but progression storage should evolve away from one-off booleans toward a tiny keyed upgrade-level model, for example:

```text
upgrades:
  matter_attractor: 1
```

This is foundation for later Resonator buffs without building the full future system now.

The future Resonator may support a small standardized set of upgrade families and/or a skill-influenced Resonance discovery interaction. Do not build a full upgrade tree during Phase 4B.1.

Player XP should similarly gain one central **player level** derivation. Portal gates and later systems can depend on `minPlayerLevel` without each feature inventing its own progression math.

Camp expansion/base building remains later depth. The 100×100 / 25×25 plot convention should be preserved now so later expansion has a stable spatial grammar.

## World Authoring & Runtime Scale

The competition frontier should be handcrafted, data-driven, and primarily **human level-designed**.

AI/agents should build reliable authoring primitives, reusable behaviors, validation, catalogs, and systems. They should not be relied on to decide the final placement, route composition, encounter pacing, or visual rhythm of finished sections.

## Standard world cells

- Canonical base cell: **50×50 world units**.
- Standard expedition section: one 50×50 cell.
- Large/special sections may deliberately use 50×100, 100×50, or 100×100 multiples.
- Camp: **100×100** (2×2 standard cells).
- Future Camp plots: **25×25**.

The 50×50 size is a design/building convention, not a requirement that every future space be identical.

## Section graph

Sections are connected by **Portal Gates**, not by touching coordinate bounds.

A section owns local authored content:

- local ground/boundaries,
- entry point(s),
- normally one Major Waypoint,
- zero or more Extraction Beacons,
- Portal Gates,
- resources,
- Wildkin,
- traversal,
- POIs/secrets,
- parkour/challenge data,
- loot chests,
- section tier / recommended level / content targets.

Runtime section placement coordinates are an implementation detail. The map/topology is the portal graph.

## Section runtime seam

The current region manager already reduces distant resource/Wildkin simulation, but the current static builder still constructs the whole authored static world. Phase 4B.1 should introduce an explicit runtime owner such as:

```text
SectionRuntime.activate(sectionId)
```

For the prototype this may activate/deactivate section roots, colliders, AI, resources, pickups, and relevant anchors without implementing complex asynchronous streaming.

The contract must allow future true instantiate/unload behavior without rewriting section data.

Only the active expedition section (plus any tightly required transition state) should be live. Portal travel provides a clean transition boundary.

## Level-design tooling

Author Mode should make the standardized pieces easy for a human to assemble:

- section shell/bounds/grid,
- Portal Gate,
- Major Waypoint,
- Extraction Beacon,
- Jump Pad,
- Parkour Start / Checkpoint / Kill Volume,
- Loot Chest,
- resources/Wildkin/props/traversal,
- section profile summary.

Do not auto-generate finished levels.

## Section content profile

Each section should carry lightweight design metadata such as:

- tier,
- recommended player-level range,
- resource-value target/envelope,
- Wildkin count/level envelope,
- expected required anchors/challenges.

Author Mode may show a **read-only design summary** comparing authored content to these targets. This is guidance/validation, not procedural placement.

## First-class Jump Pad

Replace the current decorative launch-pad + separate hard-coded destination jump definition with one Author object that owns its launch behavior.

A Jump Pad should author:

- position/rotation,
- trigger footprint,
- horizontal launch strength,
- vertical launch strength,
- optional cooldown.

Rotation determines launch direction. Runtime launches the player physically; it should not require a named destination platform or magnetic landing rectangle.

Author Mode should show an editor-only predicted trajectory/landing aid.

Ladders remain their own first-class traversal type.

## Parkour challenge contract

A small reusable Parkour Course contract may include:

- Parkour Start Trigger,
- optional Checkpoints,
- Kill Volumes / normal hazards,
- completion/reward chest.

While a parkour course is active, fatal parkour failure can restore the player at the latest course checkpoint with run cargo preserved rather than resolving expedition death. Leaving/completing the course restores normal death consequences.

Keep this explicit and bounded; do not create a generic quest/scripting engine.

## Loot

Use one reusable Loot Chest behavior with data-driven Loot Tables.

A chest may be:

- one-time/persistent secret loot, or
- repeatable with a long real-time/refill cooldown.

Persistent save data should record one-time claims or the next refill availability rather than bespoke logic per chest.

## Content scaling

Prefer centralized content definitions over arbitrary per-instance combat/economy stats.

Longer-term direction:

```text
Wildkin species definition
+ placed level
+ temperament
→ resolved stats

Resource definition
+ resource tier/level
→ resolved yield/durability/value
```

Phase 4B.1 only needs enough standardized level/tier plumbing to support Section 1/2 and future balancing; avoid a large RPG-stat framework.

## World & Difficulty

Difficulty is primarily **section/tier progression plus local authored encounter design**, not distance in one continuous coordinate strip.

Later sections generally introduce:

- higher-level/stronger Wildkin,
- new Wildkin types,
- higher-value/new resources,
- harder optional traversal,
- stronger loot tables,
- more dangerous secrets/challenges,
- more expensive Portal Gate requirements.

Within a section, danger should still be spatial and readable: tempting value can be guarded, off-route, elevated, or placed behind optional hazards.

Retreat to an Extraction Beacon or Portal should remain understandable. Do not balance by simply inflating HP or filling every space with enemies.

## Prototype First-Session Target

Phase 4B should prove the new section grammar with **Camp + Section 1 + a minimal Section 2 proof**, while the owner performs the actual level design.

Target player arc:

**Camp → Frontier Gate → Section 1 entry portal → gather/explore → fight or avoid a couple Wildkin → discover Section 1 Waypoint → find at least one secret → attempt one simple parkour challenge → extract → use Matter Resonator → run again → gain sufficient XP/resources → repair the ruined Section 2 Portal Gate → enter Section 2 → immediately see new resource/Wildkin identity.**

Section 1 should ultimately contain, by human design:

- one Major Waypoint,
- at least one Extraction Beacon,
- at least one secret loot opportunity,
- at least one parkour course with repeatable reward,
- one ruined outbound Portal Gate,
- resources/Wildkin appropriate to its tier.

Section 2 in Phase 4B only needs enough authored identity to prove the transition and progression structure. It is not required to be a finished level yet.

The competition prototype can expand this graph later, but Phase 4B should establish that the first section is worth replaying and that unlocking a new section feels like meaningful frontier progress.

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

- Standard world cell is 50×50; Camp is 100×100 with future 25×25 expansion plots.
- Expedition sections do not need to be physically adjacent; paired Portal Gates define world topology.
- AI builds level-design systems/tools; the owner performs final section/level composition and pacing.
- Jump Pads become first-class traversal objects; destination-hardcoded jump links are not the long-term authoring model.
- Standard sections support reusable secret/parkour/loot patterns rather than bespoke one-off code.

- Handcrafted frontier graph of self-contained portal-connected sections, not open-world sprawl, a single continuous coordinate strip, or a forced runner.
- Camp begins as drop pod + small Resonator + perimeter fence + frontier gate in dense alien forest.
- Always-accessible inspect map; the physical Camp gate opens travel selection with Forest Edge always available and physically discovered Major Waypoints added over time.
- Portal Gates connect sections; Major Waypoints are discovered inside sections and unlock future starts; Extraction Beacons only extract.
- Extraction Beacons, and Major Waypoints where explicitly allowed, offer **EXTRACT / KEEP GOING**; Portal Gates transition sections rather than bank runs.
- Resource inventory may be unlimited in prototype.
- Wildkin unsecured capture capacity starts at 1 and may be upgraded later.
- Prototype includes a final endpoint that should not be first-run reachable.
- Earlier areas should contain gated revisitable POIs.
- Explicit active-section runtime/streaming boundaries belong in the portal-connected section architecture.
- Unified Field Tool/manual combat/Auto Harvest rules remain locked from Phase 3.1.1.

## Open Questions

- Exact Wildkin bonding/capture mechanic.
- Exact first prototype Wildkin species/ability.
- Exact XP/skill-point retention rules after death.
- Exact long-term Matter Resonator upgrade catalog and costs beyond Matter Attractor I.
- Exact human-authored Section 1/2 layouts, encounter placement, loot tables, gate costs, and balance targets.
- Which companion abilities/mounts make the competition cut versus later game.
