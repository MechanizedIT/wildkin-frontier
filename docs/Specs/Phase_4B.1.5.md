# Wildkin Frontier — Phase 4B.1.5: Movement Feel, Parkour & Progression Readability

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B.1.5  
**Base implementation:** 721ebe41de18305d6d5c0fd89e99be3c190455fe — Phase 4B.1.4 Author / Runtime Parity & Frontier Travel UX Closure  
**Next phase after acceptance:** Phase 4B.2 — Human-Authored Section 1 Vertical Slice

---

## 1. Purpose

Phase 4B.1.4 closed the major Author/Runtime parity and frontier-travel problems. Human playtesting then exposed a final group of issues that directly affect movement feel, level-authoring reliability, and the player's understanding of expedition progression.

This phase closes only those issues.

Core outcomes:

1. gameplay camera movement is visually smooth while the player runs, without changing deterministic/fixed-step physics;
2. Portal Gates use one truthful player-facing visual contract in Author and Play;
3. parkour entrances/checkpoints/exits are understandable in Play, give feedback when triggered, and cannot leave stale checkpoint protection active after the player abandons a course;
4. persistent Level/XP and unsecured carried XP are immediately understandable;
5. Camp persistent storage is visible in the Matter Resonator UI;
6. Jump Pads become momentum-preserving vertical launchers with three reusable power presets;
7. Jump Pad Author guidance becomes truthful for momentum-dependent launches;
8. Asset Workbench receives the same useful camera-origin/orientation reference concept as the level editor.

This is intended to be the last Phase 4B.1.x framework pass. Do not start Phase 4B.2 in this slice.

---

## 2. Human playtest findings driving this phase

After 721ebe4, the owner reported:

- noticeable lag/camera jitter while the player is running;
- Portal Gates do not look the same in Author/Edit as in Play;
- Parkour entrance/checkpoint objects need visible player-facing representations, larger practical trigger zones, and visual/audio activation feedback;
- if the player leaves a parkour course, the course must reset so a later death does not respawn at an old checkpoint;
- the Section 2 ruined-gate panel can show Persistent XP 0/50 even after the player has collected unsecured XP during the run, which is technically correct but confusing;
- current RUN XP presentation is confusing because persistent XP is not continuously visible;
- the player needs a clear persistent Level/XP progress bar;
- collected expedition XP should read like another unsecured carried item in the upper-left run inventory, then transfer into persistent XP only when banked;
- there is no clear place to inspect persistent Camp resource storage;
- Jump Pads should launch straight upward while preserving the player's incoming horizontal velocity instead of forcing a pad-authored forward velocity;
- three reusable Jump Pad power variants would be useful;
- Asset Workbench zoom is now acceptable, but the workbench should expose the same sort of camera rotation/origin visual reference as the level editor.

These observations are authoritative for this slice.

---

## 3. Locked foundations — do not reopen

Preserve all accepted foundations unless a change below explicitly modifies one contract:

- 100×100 Camp and 50×50 standard expedition sections;
- section-local coordinates;
- explicit SectionRuntime;
- exactly one active gameplay section;
- inactive visual/physics/simulation isolation;
- one first-party looping requestAnimationFrame;
- Rapier/fixed-step physics remains authoritative;
- portal-connected section topology;
- Camp destination selector with Forest Edge + discovered Major Waypoints;
- Return-to-Camp as successful extraction/banking;
- discovered Waypoint persistence;
- current unsecured resources for ruined-gate repair;
- persistent banked XP as the sole authority for persistent player Level;
- atomic ruined-gate repair;
- loot persistence;
- parkour safe-failure interception for the active matching course;
- event-driven Author synchronization;
- current level-editor pan/orbit/zoom performance work;
- owner-authored final Section 1 geography, pacing, encounters, resource placement, and balance.

Do not redesign combat, extraction, section topology, or final level content.

---

# PART A — GAMEPLAY CAMERA / RENDER INTERPOLATION

## 4. Problem

The player uses fixed-step Rapier simulation. The current player mesh is synchronized to the latest physics state during fixed updates, while the gameplay camera updates every rendered frame and follows that mesh.

At render rates above the fixed physics rate, the rendered target can remain at one physics pose for multiple frames and then jump to the next pose. The camera then smoothly follows a target that itself advances in fixed-size steps.

This is a likely source of the owner-observed running jitter.

There is also an unconditional refreshMapAvailability() call in the render loop. It repeatedly touches UI state despite availability already being refreshed from actual modal/open/close events. Profile it and remove that per-frame UI work if it contributes no required frame-dependent behavior.

Do not assume; reproduce and measure first.

## 5. Required camera/pose architecture

Physics state remains authoritative.

Introduce a render-only interpolation seam between the previous and current authoritative player poses.

Preferred model:

~~~text
fixed physics step N:
  previousPhysicsPose = currentPhysicsPose
  advance Rapier/controller
  currentPhysicsPose = authoritative new pose

render:
  alpha = accumulator / fixedDt
  renderedPose = interpolate(previousPhysicsPose, currentPhysicsPose, alpha)

  player visual uses renderedPose
  gameplay camera follows renderedPose
~~~

Interpolation must never feed back into:

- Rapier;
- collision;
- harvesting range;
- combat targeting;
- Portal trigger tests;
- Parkour trigger tests;
- pickups;
- AI;
- authoritative save/run state.

Gameplay logic continues to use authoritative playerController.getState().

## 6. Player render pose

Add the smallest clean production seam, for example:

~~~text
playerController.prepareRender(alpha)
playerController.getRenderPose()
playerController.snapRenderPose()
~~~

Exact naming is flexible.

Required render-pose fields at minimum:

~~~text
position
facing
~~~

Use shortest-path angle interpolation for facing if facing interpolation is enabled.

Do not interpolate gameplay state such as grounded, mode, health, or trigger ownership.

## 7. Teleports and discontinuities

Interpolation must not visually smear the player across large discontinuities.

Snap/reset interpolation whenever the player is explicitly repositioned, including:

- Camp spawn;
- expedition start;
- Waypoint start;
- Portal transition;
- Parkour safe respawn;
- Return to Camp;
- death reset;
- explicit gameplay debug reposition.

Expected:

~~~text
teleport
→ previous render pose = current authoritative pose
→ no one-frame lerp trail from old location
~~~

Section transitions must not interpolate across overlapping local-coordinate worlds.

## 8. Camera follow

The gameplay camera should follow the interpolated render target.

Do not simply increase followLerp to hide stepped movement. That creates lag rather than solving the source.

Avoid unnecessary per-frame THREE.Vector3 allocations in cameraFollow.update() if straightforward; reuse scratch vectors where practical. This is secondary to correctness.

Preserve existing look-ahead behavior unless testing proves it contributes to jitter.

## 9. Per-frame UI cleanup

Inspect the unconditional render-loop refreshMapAvailability() call.

If map/button availability depends only on modal/Author/open/close state, make it event-driven and remove it from every frame.

Preserve required calls from real state transitions.

## 10. Camera tests

Add focused tests for:

- midpoint render interpolation;
- authoritative pose isolation;
- shortest-path facing interpolation around ±π;
- teleport snap;
- production camera following the interpolated render target rather than only the latest fixed-step pose.

Avoid brittle source-text tests if a functional seam is available.

---

# PART B — PORTAL GATE VISUAL PARITY

## 11. Current mismatch

Author Type Registry currently gives portalGates a generic prop/gate visual.

Play runtime separately decides whether to show a builtin gate or a Visual Asset such as asset_ruin_arch.

This means the same canonical Portal Gate can look different in Edit and Play.

## 12. One Portal Gate visual resolver

Create one small shared resolver used by both Author preview and runtime static world building.

Conceptually:

~~~text
resolvePortalGateVisual(gate, effectiveState, visualAssets)
~~~

It must return the same base player-facing visual recipe for the same canonical gate/state in both paths.

Backward compatibility:

- existing visualAssetId continues to work;
- gates without a Visual Asset keep a builtin fallback.

Optional state-specific fields may be introduced only if useful and backward-compatible:

~~~text
activeVisualAssetId?
ruinedVisualAssetId?
visualAssetId?          // fallback
~~~

Do not require final art.

## 13. Effective repaired state

Persistent repaired state can make an authored state: ruined gate gameplay-active.

The gameplay visual should update immediately when repair succeeds.

Required:

~~~text
ruined gate visible
→ repair succeeds
→ gameplay gate visual/state presentation updates immediately
→ no page reload
~~~

Author Edit previews canonical authored state, not normal-player save progress.

## 14. Portal visual tests

Prove:

- same ruined gate resolves to same base visual ref in Author and Play;
- same active gate resolves consistently;
- no-asset fallback matches in both paths;
- repair refreshes runtime visual;
- section isolation remains intact.

---

# PART C — PARKOUR PLAYER-FACING CONTRACT

## 15. Revised parkour visual decision

Phase 4B.1.4 made Parkour Start/Checkpoint/End editor-helper-only to eliminate fake Waypoint/Beacon structures.

Human testing now establishes a better rule:

**Parkour Start, Parkour Checkpoint, and Parkour End are real player-facing course markers.**

They must be visible in both Author Edit and normal Play.

They must not masquerade as Major Waypoints, Extraction Beacons, or Portal Gates.

Create dedicated simple marker visuals.

Suggested identities:

- Start: green/cyan gate, ring, or pylon;
- Checkpoint: blue marker/pylon;
- End: gold/yellow finish marker.

Kill Volumes and Course Zones remain editor-only helpers. Entry Points remain editor-only.

## 16. Optional Visual Asset override

Parkour Start/Checkpoint/End should support visualAssetId if practical.

If absent, use dedicated builtins.

Author and Play must use the same visual resolver.

## 17. Trigger feedback

Triggering a parkour marker must provide immediate nonblocking feedback.

Start:
- marker/world pulse;
- short SFX;
- optional PARKOUR START toast.

Checkpoint:
- clear visual pulse;
- checkpoint SFX;
- optional CHECKPOINT toast;
- marker may show activated state while that course is active.

End:
- success pulse;
- short success SFX;
- optional COURSE COMPLETE toast;
- clear course state according to the existing reward/completion contract.

Reuse existing audio/toast/pulse systems where practical.

## 18. Trigger sizing

Current proof radii around 1.2 are too easy to miss.

Use a forgiving proof/default baseline around 1.75–2.0.

Recommended starting point:

~~~text
Start:       1.8
Checkpoint:  1.8
End:         1.8
~~~

Keep radius authorable.

Author Edit should show the true trigger ring/area.

---

# PART D — PARKOUR COURSE ZONE / ABANDON RESET

## 19. Problem

An explicit Parkour End is insufficient.

Current failure mode:

~~~text
enter Start
→ course active
→ hit Checkpoint
→ walk away without crossing End
→ course remains active
→ later death elsewhere
→ stale checkpoint safe-respawn
~~~

That is not acceptable.

## 20. First-class Parkour Course Zone

Add an authorable editor-only collection named parkourCourseZones, or a similarly clear name.

Each zone:

~~~json
{
  "id": "parkour_zone_section_1_a",
  "courseId": "course_section_1",
  "pos": { "x": 8, "y": 2, "z": -8 },
  "size": { "w": 8, "h": 6, "d": 22 }
}
~~~

Multiple zones may share one courseId. Their union defines valid course space.

This supports non-rectangular courses without a generalized spline/volume editor.

## 21. Course-zone runtime semantics

While a course is active:

~~~text
inside ANY zone matching activeCourseId
→ course remains active

outside ALL matching zones
→ leaveCourse("left-course")
→ activeCourseId cleared
→ latestCheckpoint cleared
→ courseStartState cleared
→ normal fatal/death behavior resumes
~~~

Use a very small 0.1–0.2 second grace only if needed to avoid one-frame edge jitter.

If a legacy course has no Course Zone, preserve legacy behavior rather than breaking old drafts; validation may warn that abandonment reset is unavailable.

The proof course must have a Course Zone.

## 22. Zone validation

For courses with zones, validate:

- zone has courseId;
- Start is inside at least one matching zone;
- each Checkpoint is inside at least one matching zone;
- End is inside at least one matching zone;
- IDs are unique.

Kill Volumes may extend below the traversable zone where appropriate.

## 23. Author Mode Course Zone

Course Zone must be:

- visible in Edit as a translucent distinct volume;
- hidden in Play;
- selectable;
- movable;
- resizable;
- duplicatable/deletable;
- section-owned;
- labeled with courseId;
- part of canonical Author enumeration/parity.

Suggested visual: translucent cyan/blue volume, clearly different from red Kill Volume.

## 24. Parkour event callbacks

Expose a small callback seam such as:

~~~text
onCourseStarted
onCheckpointActivated
onCourseEnded
onCourseAbandoned
~~~

Use it to drive SFX/pulse/toast rather than embedding DOM/audio into parkour state logic.

## 25. Parkour tests

Required:

- Start activates course and callback once;
- matching Checkpoint updates once;
- wrong-course Checkpoint ignored;
- leaving all matching Course Zones clears course/checkpoint;
- re-entering zone without Start does not reactivate;
- fatal after abandonment cannot respawn at stale checkpoint;
- moving between multiple matching zones does not abandon;
- matching Kill Volume during active course still safe-respawns;
- End clears normally.

---

# PART E — PERSISTENT LEVEL & XP READABILITY

## 26. Player-facing XP model

Keep underlying ownership:

~~~text
XP collected during expedition
→ unsecured carried XP

successful extraction / Return to Camp
→ banked persistent XP

death
→ carried XP lost

banked persistent XP
→ sole authority for player Level
~~~

Do not make carried XP count toward persistent Level before extraction.

## 27. Persistent Level bar

Replace the current LV N · RUN XP N display with a persistent progression display.

Preferred top-center concept:

~~~text
LV 1
████████░░░░ 24 / 50
~~~

Use getPlayerLevelProgress(bankedXp).

Display within-level progress:

- 24 total banked XP at Level 1 → 24 / 50;
- 75 total banked XP at Level 2 → 25 / 150.

Do not duplicate thresholds in UI.

## 28. Persistent bar refresh

Refresh on:

- initial load;
- successful extraction;
- Return to Camp;
- progress load/reset;
- debug/reset operations that change progress.

Collecting unsecured XP does not move this bar.

## 29. Level-up feedback

If banking crosses a level threshold:

- update bar immediately;
- show small nonblocking LEVEL UP — LV N feedback;
- short SFX/pulse if easy.

Handle multiple-level jumps deterministically.

No skill points/tree.

---

# PART F — CARRIED XP AS RUN INVENTORY

## 30. Upper-left carried XP row

Add unsecured carried XP to the upper-left carried inventory:

~~~text
Wood    4
Stone   2
Fiber   3
XP      7
~~~

Requirements:

- hidden at 0;
- appears/pulses when XP is collected;
- equals current run XP;
- resets on extraction/death/new run;
- remains separate from bankedResources;
- cannot satisfy Portal resource costs;
- does not require turning XP into a normal resource if a display-only row is cleaner.

## 31. Remove RUN XP ambiguity

Once carried XP is in the upper-left inventory, do not prominently show a second RUN XP number in the persistent Level HUD.

Player-facing separation:

~~~text
top-center = permanent Level progress
top-left = unsecured things I am carrying and could lose
~~~

## 32. XP pickup feedback

When XP is collected:

- carried XP count increases;
- row pulses/floats like resource pickup feedback;
- existing mote collection remains.

Persistent bar moves only after banking.

---

# PART G — RUINED GATE XP CLARITY

## 33. Requirement panel

A persistent-Level gate must distinguish secured and carried XP.

Example:

~~~text
LEVEL       1 / 2
BANKED XP   0 / 50 toward LV 2
CARRIED XP  +6  (secure at Camp)

WOOD        2 / 2 ✓
STONE       1 / 2
~~~

The repair check continues to use current banked Level only.

Do not let carried XP satisfy the Level gate before banking.

## 34. Requirement view model

Extend the existing requirement view model with current carried XP for presentation only.

Tests:

~~~text
bankedXp=0, carriedXp=5
→ persistent Level 1
→ banked progress 0/50
→ carried display +5

after banking:
bankedXp=5, carriedXp=0
→ progress 5/50
~~~

---

# PART H — MATTER RESONATOR STORAGE / PERSISTENT BANK

## 35. Problem

Matter Resonator currently exposes upgrade-cost chips, not a clear persistent-storage view.

The player needs to answer:

"What resources and XP have I permanently secured at Camp?"

## 36. Resonator panel structure

Extend the existing panel.

Suggested hierarchy:

~~~text
MATTER RESONATOR

STORAGE
Wood            18
Stone           12
Fiber            9
Iron Ore         4
Crystal Shard    2

PROGRESSION
LV 1
24 / 50 XP

UPGRADES
Matter Attractor I
~~~

Requirements:

- list all defined banked resource types, not only upgrade costs;
- use resource display names from resource catalog;
- show a clear zero/empty state;
- show persistent Level and within-level XP;
- preserve Matter Attractor purchase behavior;
- refresh immediately after banking/purchase;
- remain Camp-only.

Do not build inventory management/crafting.

---

# PART I — JUMP PAD PHYSICS REVISION

## 37. New locked Jump Pad feel

Jump Pads become vertical impulse pads.

Canonical behavior:

~~~text
player enters pad
→ preserve current horizontal velocity vector
→ apply/replace vertical velocity with pad launch power
→ continue horizontally in the direction/speed already being traveled
~~~

Standing still launches straight up.

Running across preserves the current running direction and speed.

Pad rotY must not force gameplay launch direction in this mode. Rotation may remain visual.

## 38. Horizontal momentum source

Preserve actual current authoritative horizontal velocity, not joystick intent and not pad orientation.

Do not add horizontal speed by default.

Do not reduce current horizontal speed because the pad fired.

Existing airborne-control behavior continues afterward.

## 39. Jump Pad power presets

Add centralized reusable presets:

~~~text
low
medium
high
~~~

Central config example:

~~~text
JUMP_PAD_PRESETS = {
  low:    { verticalLaunch: ... },
  medium: { verticalLaunch: ... },
  high:   { verticalLaunch: ... }
}
~~~

Choose values from current gravity/movement feel and browser-test them.

Do not scatter magic values.

## 40. Jump Pad data compatibility

Preferred new fields:

~~~json
{
  "id": "jump_pad_section_1",
  "pos": { "x": 8, "y": 0.35, "z": -3 },
  "rotY": 0,
  "triggerRadius": 1.3,
  "powerPreset": "medium",
  "verticalLaunch": null,
  "cooldown": 1,
  "visualAssetId": "asset_frontier_launch_pad"
}
~~~

Interpretation:

- powerPreset selects centralized power;
- optional explicit verticalLaunch may override if advanced tuning is useful;
- old horizontalLaunch remains readable for legacy drafts but is deprecated/ignored for new vertical-carry behavior.

If needed, add launchMode: verticalCarry.

Newly created pads use the new mode.

## 41. Three palette variants

Author palette:

- Jump Pad — Low;
- Jump Pad — Medium;
- Jump Pad — High.

They may share one Visual Asset with distinct color/emissive accents.

Inspector shows/edits preset.

---

# PART J — JUMP PAD AUTHOR GUIDANCE

## 42. Old preview is no longer truthful

The old directional trajectory assumes pad rotation × horizontalLaunch.

That no longer matches runtime because horizontal travel depends on incoming velocity.

Do not display a fake deterministic landing arc.

## 43. New truthful preview

Replace with direction-independent guidance.

Required:

### Apex
Vertical line/marker to predicted apex height.

### Airtime
Inspector/readout of approximate total airtime.

### Momentum carry
Concentric horizontal rings around pad for representative incoming speeds such as walk and run.

Because incoming direction can be any direction, rings are more truthful than one arrow.

Use shared runtime gravity/power math.

No landing snap/correction.

## 44. Shared preview formulas

Conceptually:

~~~text
apexHeightDelta = vY² / (2 * gravityMagnitude)
airtime ≈ 2 * vY / gravityMagnitude
carryDistance = incomingHorizontalSpeed * airtime
~~~

Use shared pure helpers and runtime constants.

## 45. Jump Pad tests

Required:

- standing launch preserves ~0 horizontal velocity;
- moving launch preserves X/Z velocity;
- pad rotation does not replace incoming horizontal velocity;
- low < medium < high power;
- override behavior if supported;
- old drafts normalize safely;
- apex/airtime math;
- walk/run ring distances scale with speed;
- no landing magnet.

---

# PART K — ASSET WORKBENCH CAMERA/ORIGIN GIZMO

## 46. Goal

Asset Workbench zoom is now acceptable.

Add a visual camera/origin reference comparable to the level editor's useful orbit/origin helper.

The user should understand:

- asset/workbench origin;
- orbit target;
- camera orientation around the asset.

## 47. Reuse, do not duplicate

Inspect existing level-editor orbit gizmo implementation.

Refactor only enough for shared use.

Preferred:

~~~text
createOrbitGizmo(...)
updateOrbitGizmo(...)
~~~

with origin/target, scale, visibility, and view-state inputs.

Do not build a separate workbench camera-control system.

## 48. Workbench behavior

In Asset Edit:

- gizmo centered on asset/workbench origin;
- updates while orbiting/panning as appropriate;
- clearly indicates origin and camera/orbit orientation;
- does not obscure asset;
- scales reasonably for small/large assets;
- hides when leaving Asset Edit.

Preserve improved zoom.

---

# PART L — AUTHOR / PLAY VISUAL CONTRACTS

## 49. After this phase

Visible in Edit and Play:

- Portal Gate;
- Jump Pad;
- Major Waypoint;
- Extraction Beacon;
- Loot Chest;
- Parkour Start;
- Parkour Checkpoint;
- Parkour End.

Editor-only:

- Entry Point;
- Kill Volume;
- Parkour Course Zone;
- Camp/run spawn helper;
- other technical invisible volumes.

Author may layer trigger rings/labels over player-facing visuals.

Play must not show editor boxes/labels.

## 50. Visual resolver guardrail

Avoid separate visual-selection logic in Author and Play for:

- Portal Gate;
- Jump Pad;
- Parkour Start;
- Parkour Checkpoint;
- Parkour End.

The same canonical Visual Asset/builtin resolver should drive both.

---

# PART M — PROOF WORLD

## 51. Keep it sparse

Do not design real Section 1.

Minimum proof adjustments only:

- existing Camp-link gate;
- existing ruined S2 gate;
- Major Waypoint;
- Beacon;
- one Medium Jump Pad;
- Parkour Start;
- at least one Checkpoint;
- Parkour End;
- one Parkour Course Zone enclosing proof course;
- Kill Volume logically beneath/in failure lane;
- existing proof loot.

Increase Start/Checkpoint/End radii to chosen forgiving baseline.

No beautification.

---

# PART N — PRODUCTION/BROWSER VERIFICATION

## 52. Running-camera test

Use actual gameplay.

Test:

- walk;
- sustained run;
- diagonal run;
- rapid turns;
- start/stop;
- jump/fall;
- dodge;
- Portal transition;
- Parkour respawn.

Pass if fixed-step micro-jitter is no longer visually apparent without creating excessive camera lag, and teleports do not smear.

Record frame/pose measurements if tooling permits.

## 53. Portal parity test

Compare Camp/S1/S2 gates in Author and Play.

Repair S1→S2 and verify gameplay visual updates without reload.

## 54. Parkour test

Normal Play:

1. enter Start and see/hear feedback;
2. hit Checkpoint and see/hear feedback;
3. leave Course Zone without crossing End;
4. verify course reset;
5. die/hit fatal hazard elsewhere;
6. verify no stale checkpoint respawn.

Then restart, checkpoint, matching Kill Volume safe-respawn, and complete End.

## 55. XP/readability test

- persistent top-center Level bar visible;
- collect XP;
- persistent bar unchanged;
- carried XP row appears/increments;
- ruined gate distinguishes banked vs carried;
- extract/Return to Camp;
- carried XP clears;
- persistent bar advances;
- level-up feedback if threshold crossed.

Death must clear carried XP without changing persistent bar.

## 56. Storage test

At Camp, Matter Resonator shows all permanent resources, Level/XP, and upgrade state.

## 57. Jump Pad test

For Low/Medium/High:

Standing:
- launch mostly straight up.

Running:
- preserve actual approach direction/speed.

Rotating pad must not force direction.

Power ordering must be perceptible.

## 58. Workbench gizmo test

Small and large assets:

- orbit;
- pan;
- zoom;
- reset/focus if supported.

Origin/camera helper remains useful and unobtrusive.

---

# PART O — AUTOMATED TESTS

## 59. New Phase 4B.1.5 test file

Cover at minimum:

1. render interpolation math;
2. teleport/snap;
3. Portal shared visual resolver;
4. repaired visual effective state;
5. Parkour marker roles;
6. Course Zone membership/abandonment;
7. checkpoint clearing on abandonment;
8. persistent Level progress model;
9. carried XP display model;
10. gate banked-vs-carried model;
11. Resonator storage view model if extracted;
12. Jump Pad momentum preservation;
13. three Jump Pad presets;
14. apex/airtime/distance preview math;
15. Author enumeration for Course Zones;
16. workbench gizmo reuse seam if practical.

Keep all earlier 4B.1.x tests green.

---

# PART P — PERFORMANCE / COMPATIBILITY

## 60. Performance guardrails

Do not reintroduce:

- per-frame full Author visibility sync;
- per-frame section activation;
- per-frame Rapier activation;
- camera-driven scene traversals;
- unnecessary per-frame DOM writes for Map availability.

Render interpolation must be cheap and allocation-conscious.

One first-party looping requestAnimationFrame remains.

## 61. Save and draft compatibility

Do not force progress reset.

Existing saves retain:

- banked resources;
- banked XP;
- Waypoints;
- Beacons;
- repaired gates;
- loot state;
- Matter Attractor.

Existing Author drafts load.

New parkourCourseZones / Jump Pad preset fields must normalize safely.

Old horizontalLaunch data must not crash.

---

# PART Q — NON-GOALS

## 62. Do not do

Do NOT:

- start Phase 4B.2;
- design final Section 1;
- build final forest content;
- rebalance the full economy;
- add skill points/tree;
- add inventory management;
- add crafting UI;
- redesign combat;
- redesign Wildkin AI;
- add mounts;
- redesign map topology;
- add async streaming;
- add networking;
- add procedural generation;
- build generic quests/scripting;
- create final parkour/gate art;
- overhaul all HUD styling.

---

# PART R — IMPLEMENTATION ORDER

## 63. Recommended order

Pass A — characterize and test:
- reproduce camera jitter;
- inspect physics/render cadence;
- characterize gate parity;
- characterize parkour stale state;
- characterize XP/storage presentation;
- characterize Jump Pad velocity replacement;
- write focused regressions.

Pass B — render interpolation/per-frame cleanup:
- previous/current render pose;
- alpha interpolation;
- teleport snap;
- camera follows render pose;
- remove unnecessary per-frame Map availability refresh.

Pass C — shared visuals:
- Portal shared resolver;
- repair visual refresh;
- Parkour marker player-facing visuals;
- Author/Play parity.

Pass D — parkour lifecycle:
- Course Zones;
- larger radii;
- callbacks;
- feedback;
- abandonment reset.

Pass E — progression readability/storage:
- persistent Level bar;
- carried XP row;
- banked vs carried gate feedback;
- level-up feedback;
- Resonator storage/progression.

Pass F — Jump Pads:
- vertical momentum carry;
- presets;
- palette variants;
- revised Author guidance.

Pass G — Workbench gizmo:
- reuse/refactor orbit helper;
- Asset Workbench integration.

Pass H — browser verification/docs:
- real gameplay;
- real Author;
- all build gates;
- stop.

---

# PART S — REQUIRED BUILD GATES

## 64. Run all gates

Run:

~~~bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
~~~

Verify:

- generated world/source in sync;
- one first-party looping rAF;
- no runtime network dependencies;
- old save migration;
- Author draft compatibility;
- inactive-section collision isolation;
- Portal/extraction semantics unchanged;
- ZIP below 35 MB.

Do not claim a gate that was not run.

---

# PART T — DOCUMENTATION

## 65. Update

Update truthfully:

- docs/ARCHITECTURE.md
  - render interpolation seam;
  - Parkour Course Zone semantics;
  - carried vs banked XP presentation;
  - Jump Pad vertical-carry contract;
  - shared player-facing visual resolution if relevant.

- docs/BUILD_LOG.md
  - implementation and actual evidence.

- docs/CURRENT_SLICE.md
  - leave Phase 4B.1.5 IMPLEMENTED / HUMAN ACCEPTANCE PENDING.

- docs/PLAYTEST_NOTES.md
  - automated/browser evidence separately from human acceptance.

Do not activate Phase 4B.2.

---

# PART U — HUMAN ACCEPTANCE

## 66. Owner checklist

### A. Running camera
Run and change direction for 20–30 seconds.

Pass:
- smooth camera/player;
- no fixed-step jitter;
- no excessive lag.

### B. Gate parity
Compare Camp/S1/S2 gates Edit vs Play.

Pass:
- same real gate visuals;
- ruined gate truthful;
- repair updates gameplay visual.

### C. Parkour feedback
Enter Start/Checkpoint.

Pass:
- visible markers in Play;
- forgiving triggers;
- clear visual/audio feedback.

### D. Parkour abandonment
Start → checkpoint → leave entire Course Zone → die elsewhere.

Pass:
- course reset;
- no stale checkpoint respawn.

### E. Persistent XP
Top-center immediately answers:
- current Level;
- progress to next Level.

### F. Carried XP
Collect XP.

Pass:
- XP appears upper-left;
- persistent bar does not move until extraction;
- death loses it;
- extraction banks it.

### G. Gate requirements
Ruined gate clearly distinguishes:
- persistent Level;
- banked XP;
- carried XP;
- resource requirements.

### H. Camp storage
Matter Resonator clearly shows:
- permanent resources;
- persistent Level/XP;
- upgrade status.

### I. Jump Pads
Standing/running through Low/Medium/High.

Pass:
- standing mostly straight up;
- running preserves current horizontal movement;
- powers are distinct.

### J. Jump Pad Author guidance
Pass if it communicates:
- apex;
- airtime;
- walk/run carry distance;
without pretending one fixed landing direction.

### K. Asset Workbench gizmo
Pass:
- origin/orbit/camera orientation is understandable;
- zoom/pan/orbit still good.

---

# PART V — STOP CONDITION

## 67. Stop

Phase 4B.1.5 is complete when:

- running-camera jitter is addressed through render interpolation and production smoke;
- Portal Gates share truthful Edit/Play visuals;
- parkour markers are visible and provide feedback;
- leaving a Parkour Course Zone clears stale course/checkpoint protection;
- persistent Level progress is always understandable;
- carried XP is clearly unsecured and shown with carried resources;
- persistent Camp storage is visible;
- ruined-gate UI distinguishes banked vs carried XP;
- Jump Pads preserve horizontal momentum and use centralized Low/Medium/High power;
- Jump Pad Author guidance is truthful;
- Asset Workbench has the useful origin/orientation gizmo;
- all automated/build gates pass.

Then leave:

~~~text
Phase 4B.1.5 — IMPLEMENTED / HUMAN ACCEPTANCE PENDING
~~~

**Do not start Phase 4B.2.**

Wait for explicit owner acceptance.
