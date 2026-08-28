# Wildkin Frontier — Phase 4B.1.4: Author / Runtime Parity & Frontier Travel UX Closure

**Status:** IMPLEMENTED / HUMAN ACCEPTANCE PENDING

**Active slice:** Phase 4B.1.4

**Base implementation:** `f4e3bbb` — Phase 4B.1.3 Author Camera Closure

This is the final bounded closure pass for the Phase 4B.1 section toolkit. It aligns Author with the real runtime object model, makes Camp travel and return-to-Camp extraction coherent, exposes persistent level and gate requirements clearly, distinguishes intentional fatal hazards from combat loss, and fixes Visual Asset Workbench zoom bounds. It does not begin Phase 4B.2 or author the final Section 1 layout.

## Implemented closure

1. One canonical Author object enumerator covers props, ground, boundaries, traversal, resources, Wildkin, anchors, Entry Points, Portal Gates, Jump Pads, Parkour Start/Checkpoint/End, Kill Volumes, and Loot Chests.
2. Real structures remain player-facing in Edit and Play: Portal Gates, Jump Pads, Major Waypoints, Extraction Beacons, and Loot Chests.
3. Entry Points, Parkour Start/Checkpoint/End, Kill Volumes, and spawn markers are distinct editor-only helpers. They do not create duplicate physical gates, Waypoints, or Beacons in Play.
4. Saved Author drafts receive only the targeted Camp-link schema/catalog migration; authored transforms and content remain intact.
5. The Camp Gate always opens a destination selector. Forest Edge is always available; physically discovered Major Waypoints are added; Beacons and ordinary gates are not start destinations.
6. Forest Edge starts outside the Section 1 arrival trigger. Its physical gate is an explicit Camp link that asks for confirmation and resolves through the same idempotent extraction/banking owner as Waypoint or Beacon extraction.
7. Persistent Level and banked XP progress are shown separately from RUN XP. Ruined gates show current/required level, current/required run cargo, and next-level banked-XP progress.
8. Expedition loss records and presents a reason (`Combat` or `Fatal Hazard`). A matching active parkour course still intercepts its own hazard and safely respawns at the latest checkpoint.
9. The proof Kill Volume is in the optional parkour lane at `x=8, z=-12`, separated from the checkpoint and ordinary travel route.
10. Asset Workbench zoom derives dedicated min/max distances from actual asset span and uses the existing normalized exponential wheel path.

## Locked foundations

Do not reopen:

- 100×100 Camp / 50×50 section grammar,
- section-local coordinates and explicit `SectionRuntime`,
- inactive visual/physics/simulation isolation,
- one authoritative `requestAnimationFrame` loop,
- portal travel between ordinary reciprocal physical gates,
- discoverable Major Waypoints and persistent frontier progress,
- current run cargo + persistent player level for ruined-gate repair,
- physical Jump Pad launch with no landing magnet,
- reusable loot/persistence and Matter Attractor keyed migration,
- event-driven Author synchronization and the Phase 4B.1.3 camera contract,
- owner-authored final geography, pacing, landmarks, encounters, and balance.

## Proof topology

```text
Camp
  gate_camp_frontier → destination selector
       ├─ Forest Edge (always)
       └─ discovered Major Waypoints
              ↓
Section 1
  gate_section_1_camp_arrival → confirmed extraction / Camp return
  real Waypoint / Beacon / Jump Pad / chests
  editor-only parkour helpers + fatal proof volume
  ruined gate_section_1_to_2
       ⇅
Section 2
  gate_section_2_to_1
  real Waypoint
```

## Verification checkpoint

- Automated coverage: 558 tests were green before final documentation; the final aggregate gates must remain green.
- Canonical generated world and source JSON are in sync.
- Real browser journeys covered fresh Camp travel, physical Waypoint discovery, discovered destination travel, explicit Camp-return Cancel and Confirm, exact banking at XP 29 and Level 2 at XP 50, ruined-gate requirements, fatal-hazard vs combat loss, matching-course safe respawn, Author hierarchy/helper isolation, player-facing Play objects, section switching, and small/large workbench wheel zoom.
- Browser console warnings/errors were empty on the clean canonical Author load.
- Human perception, sustained 20–30 second Author smoothness, and target-device/phone feel remain owner acceptance work.

## Stop condition

Leave:

```text
Phase 4B.1.4 = IMPLEMENTED / HUMAN ACCEPTANCE PENDING
```

Do not activate **Phase 4B.2 — Human-Authored Section 1 Vertical Slice** until the owner explicitly accepts this closure.
