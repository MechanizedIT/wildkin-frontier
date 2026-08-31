# Wildkin Frontier — Phase 4B.1.5: Movement Feel, Parkour & Progression Readability

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B.1.5  
**Canonical spec:** docs/Specs/Phase_4B.1.5.md  
**Base implementation:** 721ebe41de18305d6d5c0fd89e99be3c190455fe — Phase 4B.1.4 Author / Runtime Parity & Frontier Travel UX Closure

Phase 4B.1.4 is substantially accepted from owner testing. The remaining framework blockers are movement/camera feel, parkour lifecycle/readability, persistent-vs-carried progression clarity, Jump Pad feel, truthful Portal visual parity, persistent Camp storage visibility, and one Asset Workbench camera-orientation helper.

## Goal

Close only these issues before owner-authored Section 1 work begins:

1. Smooth gameplay running camera using render interpolation while fixed-step Rapier remains authoritative.
2. Make Portal Gate player-facing visuals resolve identically in Author and Play, including immediate repaired-state refresh.
3. Make Parkour Start/Checkpoint/End visible in Play with clear visual/audio activation feedback.
4. Add Parkour Course Zones so leaving the course clears stale checkpoint/safe-death protection.
5. Show persistent Level and within-level XP progress continuously.
6. Show unsecured carried XP in the upper-left run inventory; bank it only on successful extraction.
7. Make ruined-gate UI distinguish banked XP from carried XP.
8. Expand Matter Resonator into a clear persistent storage/progression view.
9. Change Jump Pads to preserve incoming horizontal velocity and add vertical impulse.
10. Add Low/Medium/High Jump Pad presets and truthful apex/airtime/carry-distance Author guidance.
11. Add the level-editor-style origin/camera-orientation gizmo to Asset Workbench.

## Locked foundations

Do not reopen:

- 100×100 Camp / 50×50 section grammar,
- section-local coordinates,
- explicit SectionRuntime and inactive-section isolation,
- one first-party requestAnimationFrame loop,
- fixed-step Rapier gameplay authority,
- Camp destination selector / Forest Edge / discovered Waypoints,
- Return-to-Camp extraction and banking,
- banked XP as the only persistent Level authority,
- atomic Portal repair,
- loot persistence,
- current level-editor camera and event-driven Author performance work,
- owner-authored final Section 1 layout/pacing/content.

## Key revised contracts

### XP

~~~text
collect XP during expedition
→ carried/unsecured XP shown with run inventory

extract / return to Camp
→ XP becomes banked persistent XP
→ Level progress bar advances

die
→ carried XP lost
~~~

### Jump Pad

~~~text
enter pad
→ preserve current horizontal velocity
→ apply vertical launch power
→ Low / Medium / High presets
~~~

Pad rotation no longer forces launch direction for the new canonical mode.

### Parkour

~~~text
Start
→ active course

Checkpoint
→ safe respawn point

leave all matching Course Zones
→ course resets
→ checkpoint cleared
→ normal death rules resume

End
→ course completes/clears
~~~

Start/Checkpoint/End are player-facing markers. Course Zones and Kill Volumes remain editor-only helpers.

## Non-goals

Do not:

- start Phase 4B.2,
- design the real Section 1,
- add new sections,
- rebalance the full economy,
- build skill trees/crafting/inventory management,
- redesign combat or Wildkin AI,
- create final art,
- build procedural/generic scripting systems.

## Stop condition

When the full Phase 4B.1.5 spec and production/browser gates pass, leave:

~~~text
Phase 4B.1.5 — IMPLEMENTED / HUMAN ACCEPTANCE PENDING
~~~

Then stop.

Only after explicit owner acceptance should the project move to **Phase 4B.2 — Human-Authored Section 1 Vertical Slice**.
