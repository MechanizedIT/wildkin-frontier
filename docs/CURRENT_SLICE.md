# Wildkin Frontier — Phase 4B.1.1: Section Toolkit Closure

**Status:** IMPLEMENTED / HUMAN ACCEPTANCE PENDING  
**Active slice:** Phase 4B.1.1  
**Canonical spec:** `docs/Specs/Phase_4B.1.1.md`  
**Base implementation:** `9083ae2825ba506397b566bc89e3285e381ba450`

Phase 4B.1 is substantially implemented and validated, but repo review found a small set of concrete closure defects that should be fixed **before** serious owner-authored Section 1 composition begins.

## Goal

Close only these toolkit gaps:

1. Jump Pad trajectory preview must live-refresh from canonical `rotY`, `horizontalLaunch`, and `verticalLaunch` values.
2. Parkour must have an explicit End/Exit so safe-death protection cannot remain active after the player abandons a course.
3. Parkour fail/completion behavior must be strictly scoped by `courseId`.
4. Expedition-section Portal links should use physical receiving gate endpoints, including a reciprocal Section 1 ⇄ Section 2 proof pair.
5. Fresh Camp departure should arrive at a physical Section 1 frontier/forest-edge gate endpoint.
6. Ruined-gate repair must be all-or-nothing from the player's perspective.

## Locked foundations

Do not reopen:

- 100×100 Camp / 50×50 section grammar,
- section-local coordinates,
- explicit active SectionRuntime,
- inactive visual/physics/simulation isolation,
- fresh Camp Gate direct departure when no Waypoints are discovered,
- discoverable Major Waypoints,
- current run cargo + player level for ruined-gate repair,
- persistent repaired frontier progress,
- physical Jump Pad launch with no landing magnet,
- reusable loot/persistence,
- Matter Attractor keyed upgrade migration,
- owner-authored final level composition.

## Proof topology after closure

```text
Camp
  gate_camp_frontier
       ↓
Section 1
  physical Camp-arrival gate
  Waypoint / Beacon
  proof Jump Pad + parkour + Parkour End
  ruined gate_section_1_to_2
       ⇅
Section 2
  gate_section_2_to_1
  Waypoint
```

Section 1 ⇄ Section 2 should work in both directions after repair without extracting, double-charging, or bouncing immediately back through the receiving gate.

## Do not do

- final Section 1 layout/pacing,
- procedural level design,
- full portal graph UI,
- generic scripting/quests,
- new progression systems,
- Camp return/extraction redesign,
- async streaming,
- broad Author Mode overhaul.

## Stop condition

When the closure fixes and production/browser tests pass, leave:

```text
Phase 4B.1.1 = IMPLEMENTED / HUMAN ACCEPTANCE PENDING
```

Then stop.

The owner will human-test the toolkit. Only after owner acceptance should the project move to **Phase 4B.2 — Human-Authored Section 1 Vertical Slice**.

## Phase 4B.1.1 closure checkpoint

- Jump Pad trajectory preview invalidates from canonical position, rotation, horizontal launch, and vertical launch fields.
- Parkour End is a first-class section object and parkour checkpoint/fail/reward behavior is course-scoped.
- Expedition portals support reciprocal physical `targetGateId` endpoints with legacy entry fallback; Section 1 has a physical Camp arrival endpoint and Section 2 has a reciprocal return gate.
- Ruined-gate repair uses an explicit rollback seam so cargo and persistent repair commit together from the player perspective.
- Automated implementation coverage is complete; player-facing browser/phone acceptance remains pending.

Read and implement the full requirements in `docs/Specs/Phase_4B.1.1.md`.
