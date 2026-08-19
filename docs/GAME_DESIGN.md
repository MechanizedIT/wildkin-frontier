# Game Design — Repository Mirror (Stable Decisions)

> Concise mirror of `docs/PROJECT_PLAN.md` §1. Open questions are marked as open. Do not invent unresolved mechanics.

## Working Concept

- **Title:** TBD (Frontier placeholder)
- **Genre:** Survival & Resource Management
- **Format:** Single-player, portrait mobile web game (Three.js/HTML5)
- **Camera:** Fixed high third-person, near top-down

## High Concept

Run-based wilderness expedition: prepare a loadout, choose a companion and entry point, explore/harvest/fight/capture, decide when to secure the haul versus pushing deeper into increasing danger. Dying should create tension without erasing all long-term progress.

## Player Fantasy

"I prepare for an expedition, enter a dangerous wild frontier, make my own route, find valuable resources and creatures, decide how far I dare to push, then return stronger for the next run."

## Design Pillars

- Player agency over rails
- Satisfying moment-to-moment play before meta-progression
- Meaningful persistent progression (visible skill tree, intentional spending)
- Risk creates stories (unsecured loot/captures at risk)
- Collection with utility (Wildkin change runs)
- Compact depth over shallow breadth

## Core Loop

**Prepare** → **Expedition** (explore → harvest → fight → XP → capture → discover) → **Risk Decision** (secure or push) → **Outcome** (extract/return or die) → **Progress** (spend points/resources, adjust loadout)

## Persistent Progression

- Skill points / tree nodes, secured Wildkin, discovered regions/waystones, unlocked equipment/recipes, major world discoveries

## At-Risk (Unsecured) per Run

Harvested resources, rare materials, newly captured Wildkin, consumables/special finds. Default: death hurts but does not erase underlying character progression.

## Skill Tree (Prototype)

Visible, branching, deliberate spending. Branches: Combat, Harvesting, Survival, Bonding. Prototype needs only a small branching tree, not linear upgrades.

## Wildkin

Wild creatures with interactive capture (more than low-HP + throw). Each readable at a glance with distinct field/combat role. One active companion per run. Newly captured = unsecured until banked. Lost unsecured returns to habitat (not deleted).

## Waystones

Discoverable anchors: unlock as start location, secure resources/captures, limited recovery, mark deeper penetration. Starting deeper trades early gathering/XP for earlier access to rare content.

## Base & Economy

Base is persistent home between runs; returning visibly changes it and shows secured Wildkin. Banked resources spent on: reliable upgrades, base structures/stations, Matter Resonator attempts (competing sinks).

### Base Building (Prototype)

Few freely placeable useful structures on valid ground. Fast mobile placement: preview, valid/invalid, confirm/cancel. Must have obvious utility, not just decoration.

### Base Wildkin

Secured Wildkin wander/idly inhabit base so collection is visually legible. Active companion selected from secured pool.

## Matter Resonator

Base machine: deposit materials → earn a Resonance attempt. Attempt includes a short skill-influenced kickoff mechanic (aim/timing/trajectory/routing/etc.) that changes odds/path but preserves surprise. Rewards unlock possibilities (blueprints, relics, utility, cosmetics, map discoveries). Guardrails: no premium currency, reliable progression exists outside Resonator, duplicate protection, skill influences but does not determinize outcome.

## World & Difficulty

Spatial difficulty, not timer-driven. Farther from safety → stronger enemies, more valuable resources, rarer Wildkin, more hazards, higher extraction stakes. Player chooses difficulty by choosing how far to push.

## Camera & Controls

Fixed high third-person / near top-down, portrait-first, one-thumb movement possible, no camera rotation during play, large contextual buttons, minimize tiny precision targets.

## Prototype Non-Goals (until core loop is strong)

Large open world, multiplayer, large base sim, dozens of Wildkin, complex crafting trees, procedural generation, story campaign, monetization, online accounts, elaborate character customization.

## Open Design Questions

- Combat input model (auto-target+attack vs aim vs tap vs hybrid) — **open**
- Wildkin capture/bonding mechanic — **open**
- XP retention on failed run — **open**
- Waystone banking cost/cooldown — **open**
- Prototype end-state (final objective vs depth/score + extraction) — **open**
- Matter Resonator kickoff minigame — **open**
- Resource cost tuning between building/upgrades/Resonator — **open**
- How much free-placement belongs in competition prototype — **open**
