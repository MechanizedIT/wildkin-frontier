# Wildkin Frontier — Phase 4B.1: Section Framework & Level-Design Toolkit

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B.1  
**Canonical spec:** `docs/Specs/Phase_4B.1.md`

**Previous direction:** Phase 4B AI-authored continuous-area pacing pass — **STOPPED EARLY 2026-08-27**. Useful systems work from commit `cad34988dbc43824256419a8a2301a4e9372a942` may remain, especially Matter Attractor I, useful assets/content IDs, and valid regression tests. The elongated continuous "Crescent Basin" layout is not the target world structure.

## Goal

Give the owner a standardized section grammar and reusable level-design pieces so the **human owner designs the actual levels** while AI handles reliable systems/tooling.

Target topology:

```text
Camp — 100×100
  ↓ portal
Section 1 — 50×50
  ├ discoverable Waypoint
  ├ Extraction Beacon
  ├ secret chest
  ├ simple parkour + Jump Pad
  └ ruined portal → Section 2
Section 2 — 50×50
  └ minimal proof + discoverable Waypoint
```

Sections use local coordinates and are connected by Portal Gates rather than required physical adjacency.

## Locked design decisions

- Standard world cell = **50×50**.
- Standard expedition section = **50×50**.
- Camp = **100×100**, with future **25×25** expansion plots.
- World topology is a section/portal graph, not one giant continuous coordinate strip.
- Camp Frontier Gate is a portal/launcher, not a Major Waypoint.
- Fresh save: Camp Gate → Section 1 entry directly.
- A section Waypoint must be physically discovered before it becomes a future start.
- Extraction Beacons remain extraction-only.
- Ruined Portal Gates may require player level + **current run cargo** to rebuild.
- Repaired gates are permanent immediately, even if the player later dies.
- AI builds systems/tools; final section composition/pacing is human-authored.
- Jump Pads become first-class traversal objects; destination-hardcoded jump links are legacy.
- Parkour can safely respawn at course checkpoints without losing run cargo while the course is active.
- Loot Chest + Loot Table is reusable for secrets and repeatable parkour rewards.
- Banked XP gains one central player-level derivation.
- Matter Attractor I remains, but persistence should migrate toward keyed upgrade levels.
- Section profile + read-only Author summary guide balance; they do not auto-generate content.

## Hard scope

Implement:

- section-local canonical data/ownership,
- explicit active-section runtime,
- inactive-section visual/physics/simulation isolation,
- Portal Gate transitions,
- ruined gate construction/persistence,
- first-launch/Waypoint semantics,
- first-class Jump Pad + editor trajectory aid,
- Parkour Start / Checkpoint / Kill Volume,
- reusable Loot Chest / Loot Table / refill persistence,
- player level foundation,
- Matter Attractor save migration,
- section profile metadata + read-only Author summary,
- sparse proof Camp + Section 1 + Section 2 shells,
- production integration/browser tests.

## Do not do

- final Section 1 level design,
- procedural/AI level generation,
- full skill tree,
- bonding/companions,
- crafting/equipment,
- Camp expansion UI,
- async streaming,
- generic scripting/quest engine,
- broad editor polish.

## Human outcome after this slice

The owner should be able to open Author Mode and independently build Section 1 from standardized pieces:

```text
geography
+ Visual Assets
+ resources
+ Wildkin
+ Waypoint
+ Beacon
+ Portal Gate
+ Jump Pad
+ parkour
+ secret/repeatable chest
```

without needing an AI agent to decide where those pieces should go.

## Stop condition

When the framework is technically reliable and the owner can use the sparse proof sections, **freeze systems work and move to Phase 4B.2 — owner-authored Section 1 vertical slice**.

Read and implement the complete requirements in `docs/Specs/Phase_4B.1.md`.
