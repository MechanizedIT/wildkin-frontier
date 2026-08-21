# Game Design — Repository Mirror (Stable Decisions)

> Concise mirror of the current Google GDD / `docs/PROJECT_PLAN.md`. Stable decisions belong here; unresolved mechanics are marked open. Do not invent unresolved mechanics.

## Working Concept

- **Title:** Wildkin Frontier
- **Genre:** Survival & Resource Management
- **Format:** Single-player, portrait mobile web game (Three.js/HTML5)
- **Camera:** Fixed high third-person, near top-down

## High Concept

A run-based wilderness expedition game built around player agency. Before each run, the player prepares a loadout, chooses a companion, and chooses where to enter the frontier. During the run they explore, harvest resources, gain XP, fight or avoid wild creatures, capture new Wildkin, discover waystones, and decide when to secure their haul versus pushing deeper into increasing danger.

Death should create tension without erasing underlying long-term progression.

## Design Pillars

- Player agency over rails.
- Satisfying moment-to-moment movement, harvesting, combat, pickups, capture, and companion behavior before broad meta-progression.
- Meaningful persistent progression through deliberate choices, not random three-choice level-ups.
- Risk creates stories: unsecured loot and captures matter because pushing farther can lose them.
- Collection with utility: Wildkin should meaningfully alter runs rather than exist only as a checklist.
- Compact depth: prefer a small set of interacting systems over shallow breadth.

## Core Loop

**Prepare** → **Expedition** (explore → harvest → fight/avoid → gain XP → capture → discover) → **Risk Decision** (secure or push) → **Outcome** (extract/return or die) → **Progress** (spend points/resources, change loadout/companion, choose next route).

## Persistent vs At-Risk Progress

Persistent progress should eventually include skill-tree unlocks, secured Wildkin, discovered regions/waystones, equipment/recipes/loadout options, and important world discoveries.

Until secured, a run may put harvested resources, rare materials, newly captured Wildkin, consumables, and special finds at risk. Death should hurt without erasing underlying character progression.

## Field Tool, Harvesting & Combat

The Field Tool is one physical interaction tool, not separate invisible harvest/combat weapons.

- A Field Tool swing affects valid objects actually inside its interaction arc.
- Harvestables in the arc receive harvest hits.
- Attackable Wildkin in the arc receive combat damage.
- **Auto Harvest** only controls whether nearby resources automatically initiate swings while the player is nearly stationary.
- Enemy presence does **not** globally disable Auto Harvest.
- There is **no auto-attack** in the current prototype.
- Mobile right-side **tap** = one manual Field Tool swing.
- Mobile right-side **hold** = repeat swings at the allowed cadence.
- Mobile right-side **swipe** = dodge and takes precedence over attack.
- Manual swings can hit both harvestables and valid creatures, so manual harvesting remains possible when Auto Harvest is OFF.
- Future ranged weapons should be equipment/loadout choices, not replacements for the Field Tool interaction model.

## Wildkin Ecology & Temperament

Wildkin are wildlife, not a map full of enemies with identical player aggro.

Prototype temperament vocabulary:

- **Aggressive:** may attack player or appropriate nearby creatures on sight.
- **Territorial:** notices/warns first, then attacks actors that enter or remain in personal territory.
- **Defensive:** usually ignores others until threatened or attacked, then retaliates.
- **Skittish:** avoids/flees approaching threats and may flee faster when attacked.
- **Predator/prey disposition:** may be used selectively when it creates readable wildlife interactions.

Wildkin may react to the player **and to other Wildkin**. A creature can ignore, warn, pursue, attack, or flee based on temperament/species disposition and context.

Each field creature should have simple authored/home data such as home position, roam radius, notice/personal-space range, and leash/return-home distance.

Prefer lightweight obstacle probes/steering and separation before adding A* or a navmesh. Add pathfinding only if the real authored frontier demonstrates repeated navigation failures that simple steering cannot solve.

## Wildkin Capture & Companions

Capture/bonding remains open, but it must be more interactive than simply lowering HP and throwing a generic capture object.

Prototype goals:

- 2–3 readable Wildkin species are enough to prove the fantasy.
- Newly captured Wildkin is unsecured until the player successfully extracts/banks it.
- Death returns an unsecured Wildkin to an appropriate habitat rather than permanently deleting a unique creature.
- Secured Wildkin physically inhabit the home area.
- The player chooses one active companion before a run.
- Each companion has one clearly distinct useful behavior that changes the run.

## Skill Tree & Equipment

The prototype skill tree should be small, visible, branching, and intentionally spendable. Initial branches:

- Combat
- Harvesting
- Survival
- Bonding

Skills shape a build; **gear changes available actions/tools**.

A ranged weapon is a strong future equipment choice. The Field Tool remains the broad melee/harvesting option; a ranged weapon should trade crowd/harvest utility for reach/safety. Equipment may be acquired through known purchase, crafting/blueprint, expedition discovery, or a later Matter Resonator reward.

## Waystones

Waystones are discoverable progression anchors, not automatic linear checkpoints. They may unlock future starting locations, provide banking/limited recovery, and mark deeper penetration into the frontier. Starting deeper should trade early gathering/XP/preparation for faster access to valuable dangerous content.

## Base, Economy & Matter Resonator

The base is the persistent home between expeditions and should make secured progress visible, especially Wildkin collection.

Banked resources should eventually compete between reliable upgrades, useful structures, and optional discovery systems.

Base building and the Matter Resonator are **budget-dependent for the competition prototype**. Do not sacrifice expedition, capture/companion, equipment, or risk/reward quality to hit base-system counts.

## World Authoring Direction

The final competition frontier should be compact and handcrafted, but human authoring must be fast.

- Runtime/source-of-truth world placement should be data-driven, preferably `world.json` or equivalent, not scattered gameplay-code arrays.
- The world definition should support terrain/ground, resources, Wildkin spawn/home data, platforms, ramps, ladders, parkour/jump elements, waystones, and future points of interest.
- Add a dev-only in-game author mode for place/select/move/rotate/elevate/resize/duplicate/delete and fast **Edit ↔ Play** iteration.
- Parkour should use explicit authored geometry because dimensions, height, rotation, and immediate physical testing matter.
- Optional future object-map PNG/heightmap import may generate a first draft, but imported data should become normal editable world data rather than the runtime source of truth.
- This is an authoring workflow, not procedural world generation.

## World & Difficulty

Danger should primarily be spatial rather than timer-driven. Farther from safety should mean more complex/stronger threats, more valuable resources, rarer Wildkin, more environmental pressure, and higher extraction stakes. The real spatial gradient should be judged in the authored frontier, not the cramped systems-test arena.

## Camera & Controls

- Fixed high third-person / near top-down camera.
- Portrait-first composition.
- One-thumb movement should remain possible.
- Avoid normal-play camera rotation.
- Keep interactions large/contextual.
- Minimize tiny precision targets for combat and harvesting.

## Prototype Non-Goals Until Core Loop Is Strong

Large open world, multiplayer, large/complex base simulation, dozens of Wildkin, complex crafting trees, procedural world generation, story campaign/quest chains, monetization, online accounts/backend, elaborate character customization.

## Resolved & Open Design Questions

### Resolved

- **Combat input:** mobile tap = one swing, hold = repeated swings, swipe = dodge; desktop attack remains explicit/manual.
- **No auto-attack** in the current prototype.
- **Unified Field Tool hit:** a swing can affect resources and attackable Wildkin in the same physical arc.
- **Auto Harvest stays available during danger** and only auto-initiates swings for resources.
- **Wildkin use temperament/ecology rather than universal instant player aggro.**
- **Simple steering before A*.**
- **Ranged combat belongs primarily to equipment/loadout progression.**
- **World source of truth should be data-driven with a dev author mode; optional PNG/heightmap import is only a convenience layer.**

### Open

- Exact Wildkin capture/bonding mechanic.
- XP/skill-point retention rules on failed runs.
- Whether waystone banking is unlimited or has a cost/cooldown.
- Whether the competition prototype needs a final deep-frontier objective or emphasizes depth/risk plus extraction.
- Exact Matter Resonator activation mechanic if the Resonator makes prototype scope.
- Exact resource costs and competition between upgrades/building/discovery.
- How much free-placement base building belongs in the competition prototype.
