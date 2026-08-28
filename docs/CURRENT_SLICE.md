# Wildkin Frontier — Phase 4B.1.3: Author Camera Closure

**Status:** IMPLEMENTED / HUMAN ACCEPTANCE PENDING  
**Active slice:** Phase 4B.1.3
**Base implementation:** `312c368` — Phase 4B.1.2 Author Performance Closure

This is a narrow camera/projection closure pass. It keeps the completed Phase 4B.1.2 event-driven toolkit intact while making Author framing section-local, zoom bounded, and safe to enter/exit without changing gameplay camera state.

## Goal

Close only these Author performance gaps:

1. Use selected Camp/Section 1/Section 2 bounds for editor framing, reset, and zoom limits.
2. Replace span-linear wheel jumps with normalized, smooth distance-relative zoom.
3. Give Author Mode an editor-only far plane and restore gameplay near/far/fov/pose exactly on exit.
4. Route Focus Object and Focus Section through canonical `levelViewState`.
5. Preserve event-driven visibility synchronization and diagnostics from Phase 4B.1.2.

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
Phase 4B.1.3 = IMPLEMENTED / HUMAN ACCEPTANCE PENDING
```

Then stop.

The owner will human-test the toolkit. Only after owner acceptance should the project move to **Phase 4B.2 — Human-Authored Section 1 Vertical Slice**.

## Phase 4B.1.3 closure checkpoint

- Author framing/reset now uses the selected section's bounds: Camp span 100, Sections 1/2 span 50.
- Wheel input normalizes pixel/line/page deltas, clamps outliers, and applies exponential distance-relative zoom inside section-local limits.
- Edit entry raises the camera far plane to cover the bounded editor range; exit restores near/far/fov, pose, and rotation from the gameplay snapshot.
- Focus Object and Focus Section update `levelViewState.target` before applying the camera.
- Full Author section synchronization remains event-driven and instrumented via `window.__author.mode.getEditorDiagnostics()`.
- Automated implementation coverage and browser smoke are complete; player-facing browser/phone acceptance remains pending.

Preserve the Phase 4B.1.1 contracts in `docs/Specs/Phase_4B.1.1.md`; do not start Phase 4B.2.
