# Playtest Notes

> Human observations are evidence. Record what was actually seen/heard/felt, not what an implementation report claims should happen.

## Template

- **Date / Build / Device(s):**
- **What felt good:**
- **What was confusing:**
- **What felt awkward / slow:**
- **Bugs:**
- **Highest-value next changes (1–2):**

---

## 2026-08-18 — Phase 0 — Foundation

- **Date / Build / Device(s):** 2026-08-18, dev + submission builds, desktop Chrome + S26+
- **What felt good:** Loaded quickly.
- **What was confusing:** Nothing.
- **What felt awkward / slow:** Nothing.
- **Bugs:** None.
- **Highest-value next changes:** None at the time.

---

## 2026-08-19 — Phase 1 — Movement

- **Date / Build / Device(s):** Desktop Chrome + phone.
- **What felt good:** Movement and camera felt smooth.
- **What was confusing:** Desktop sneak control was initially unclear.
- **What felt awkward / slow:** Early jump implementation did not scale well with run speed, felt abrupt/teleport-like, lacked satisfying air control; ladder descent/top transitions needed refinement.
- **Bugs:** Invisible/incorrect collision near authored jump/platform geometry; player could interact poorly with brown box/platform edges.
- **Highest-value next changes:** Movement refinement and robust Rapier character collision.

> Subsequent Phase 1.x work migrated player collision/grounding to Rapier KinematicCharacterController and refined jump/fall/air control/facing. Human testing later accepted movement as good enough to lock for current prototype work.

---

## 2026-08-20 — Phase 2 / 2.1 / 2.2 — Harvesting

### What felt good

- Automatic stop-to-harvest loop became enjoyable enough to continue.
- Multi-target harvesting, visible chunk depletion, physical-looking drops, magnet collection, inventory, and resource respawn created a satisfying basic gathering loop.
- Harvestable focus/readability improved after separating “resource in range” from “stationary enough to harvest.”

### Problems found and refined

- Old decorative/fake resource props conflicted with real harvestables.
- Initial harvesting required standing still before the focus ring appeared; changed so the ring can identify an in-range harvestable while moving, while actual harvesting still requires near-stationary movement.
- High-platform resources could initially be harvested from below because targeting was too XZ-centric; corrected with vertical-aware eligibility.
- Depleted resource colliders and pickup spawn/collision needed lifecycle fixes.
- Resource drops could become embedded or blocked from magnet collection; accepted rule: initial throw/rest should respect world geometry, but once magnetizing, reward collection should be reliable and may ignore intervening world collision.
- Performance degraded in early versions due to repeated geometry/material allocation; pooling/shared resources/caps were added.
- Field Tool swing/trail/audio required repeated perceptual refinement. Human-visible result matters more than numeric yaw/test assertions.
- Tree silhouettes had overly tall exposed trunks; lower/broader stylized proportions were preferred.

### Locked direction from Phase 2

- Auto Harvest remains optional player preference.
- Auto Harvest only initiates harvesting while the player is nearly stationary.
- In-range harvestable focus can show while walking/running.
- Field Tool is intentionally oversized/cartoonish and is the physical interaction tool.
- Resource pickups are intentionally large/readable.

---

## 2026-08-21 — Phase 3 First Pass — Combat, Creatures & Death

### Date / Build / Devices

Phase 3 first-pass commit, desktop + phone human playtest after Muse implementation.

### What felt good

- Combat is **readable enough and fundamentally viable** for a first pass.
- One melee threat (Rusher) plus one ranged threat (Spitter) is a useful starting contrast.
- Manual attack + dodge is understandable.
- Basic health, enemy telegraphs, death, restart, and XP reward establish a real combat loop.
- The first-pass result is not fundamentally bad; it needs refinement rather than replacement.

### Bugs / correctness issues

1. **Spitter projectile/player collision is unreliable.** Bullets appeared to damage the player only from some facing situations. Repo review suggests projectile world shape-cast can see the player capsule as an environment blocker and destroy the projectile before the explicit player-hit test. Projectile environment queries should exclude intended actor colliders and player-hit resolution should be explicit/swept.
2. **Defeated creatures leave invisible collision.** Creature visuals/death state hide them, but physical collider lifecycle is not correctly disabled during death/respawn.
3. **Field Tool visual handedness/swing direction remains perceptually wrong.** Repeated implementation attempts claim right-hand/right-to-left based on local offsets/yaw signs, but the human-visible result can still read as left-hand/left-to-right. Numeric transform assertions are not sufficient proof; defer major primitive-rig effort if it threatens schedule, and solve definitively when player presentation/animation is replaced.

### Combat / harvesting design learning

The Phase 3 first pass globally suppressed Auto Harvest when combat was engaged. Human testing suggests this is the wrong interaction model.

**New locked direction:**

- Do **not** disable Auto Harvest merely because a creature is nearby/attacking.
- Keep **no auto-attack** for now.
- Auto Harvest only allows a nearby resource to automatically initiate a Field Tool swing while stationary.
- A physical Field Tool swing can affect **both harvestables and attackable creatures** actually inside its arc.
- Manual right-side **tap** initiates one swing.
- Manual right-side **hold** repeats swings at normal attack cadence.
- Right-side **swipe** remains dodge and must take precedence over attack classification.
- Manual swings can also harvest resources, including when Auto Harvest is OFF.

This is closer to the fluidity seen in games where harvesting and melee share the same physical action without globally pausing gathering around enemies.

### Creature identity / ecology learning

Universal instant player aggro makes Wildkin feel like generic enemies rather than wildlife.

Preferred direction:

- **Aggressive:** attacks appropriate actors on sight.
- **Territorial:** notices/warns; attacks when personal territory is violated.
- **Defensive:** generally ignores until threatened/attacked, then retaliates.
- **Skittish:** avoids/flees approaching threats or attacks.
- Selective predator/prey or rival dispositions may create readable Wildkin-vs-Wildkin interactions.

Wildkin should be capable of perceiving/reacting to **other Wildkin**, not only the player. This can create small emergent ARK/Palworld-like wildlife moments without a large ecology simulation.

Give each creature simple home/roam/leash data. Prefer lightweight obstacle steering/separation before A*. Only add pathfinding if the real authored frontier repeatedly proves steering insufficient.

### XP reward readability

Current small gold octahedral XP resembles coins/gold more than experience.

Preferred Phase 3.1 change:

- roughly 2x current visual size,
- blue/cyan glowing essence/orb identity,
- clearly distinct from wood/stone/fiber and future currency.

### Spatial danger / map observations

The current world is still a **small systems-test arena**. It is too cramped to meaningfully judge:

- “safe spawn → dangerous frontier,”
- deep spatial difficulty,
- meaningful route choice.

Do not spend much Phase 3.1 effort pretending this test arena is a real frontier. Judge spatial danger after the authoring/world phase creates a compact connected expedition map.

### Future combat/equipment note

A ranged player weapon is desirable, but should be deferred to equipment/loadout progression rather than added to Phase 3.1. Gear should create mechanically different options (for example Field Tool melee/harvest utility vs ranged reach/safety), while skill-tree choices shape builds.

### Highest-value next changes

1. **Phase 3.1 Creature Ecology & Combat Refinement:** projectile/collider correctness, unified Field Tool resource+creature hits, hold-to-attack, keep harvesting during danger, blue XP essence, temperaments, Wildkin-vs-Wildkin interactions, home/leash, lightweight steering.
2. After 3.1, run an **architecture + world-authoring checkpoint** before adding extraction/persistence/capture so the current `main.js`/run-state/world-placement complexity does not keep expanding.

---

## 2026-08-24 — Phase 4A.2.2 stabilization — automated browser evidence only

This is an implementation/automation record, **not a human playtest**. The nine spec §17 tests remain **TO BE PERFORMED BY HUMAN**.

### Observed in the real `?author=1` browser path

- Entered Edit with the existing local draft; no browser console warnings/errors.
- Selected existing `ladder_south_high`. One tagged visual root contained the wall, five rungs, and marker. `Y+0.2` moved the visual root and atomically changed `bottomY`, `topY`, `topPlatform.topY`, and `mantleExit.y`; undo restored it. The real keyboard rotation path changed root `rotY` and rotated `wallNormal`, `approachDir`, `topEntryRegion`, and `mantleExit`; undo restored it.
- Placed a Box through the palette/canvas. It immediately used a `prop/box` factory root with authored dimensions. Turning off Visible in Play while Collision remained enabled immediately hid the root and created one visible, correctly centered/sized wireframe proxy. Temporary Box was removed.
- Placed a Tree through the palette/canvas. It immediately showed the deterministic factory Tree (Cylinder trunk plus five Cone foliage chunks), not a placeholder Box. Temporary Tree was removed.
- Placed a temporary Box, clicked Play, allowed the normal reload, and observed the same canonical object and factory visual in Runtime Play. Returned to Edit, deleted it, and reloaded Play to persist cleanup.

### Acceptance still pending

Human must still perform the complete player-facing tests for Platform/Obstacle, Ladder traversal after arbitrary resize, all resource scale/harvest interactions, live proxy transform feel, several pre-existing Boundaries, the full registry-control matrix, Wildkin/POI metadata consumption, mixed cross-region undo/redo, and the Camp→expedition→harvest/combat→extract/return smoke test on desktop and phone. Do not treat the observations above as perceptual or gameplay acceptance.

## 2026-08-24 — Phase 4A.2.2 owner-playtest closure corrections — automated browser evidence only

This is implementation/browser evidence, **not a human acceptance pass**.

### Observed through the real Author UI → Play reload

- On the recognizable initial Camp view in Play, the scene contained no editor collision wireframes. Entering Edit created visible wireframes for the four hidden Camp boundaries. Clicking Play and completing the normal reload returned the scene to zero editor proxies.
- Selected the existing Tree author object, entered `57` in Rotation and `1.65` in Scale, then clicked Play. Runtime resource state and the visible resource root both retained 0.9948 radians / 1.65 scale. Tree, Rock, and Fiber share the tested placement adapter; focused tests cover all three siblings.
- Selected the existing Tangled Hollow extraction beacon and typed `Silver Grove Beacon` with real Space key events. The input and canonical draft retained the complete name, and Runtime Play loaded the same spaced display name.
- Browser console warnings/errors: none. The isolated playtest draft was cleared and the browser returned to the repository world afterward.

### Owner confirmation still requested

In Edit, hide any visible collidable object and confirm its wireframe appears immediately; click Play and confirm the wireframe disappears while collision remains. Also rotate/scale one Tree or Rock, type a multi-word Waypoint/Beacon name, click Play, and confirm the resource appearance/collision and full display name match Edit. Any wireframe visible in Play, transform snap-back, or missing space is a failure.

## 2026-08-25 — Phase 4B.0 Primitive Visual Asset authoring — automated browser evidence only

This is implementation/browser evidence, **not human acceptance**.

### Observed through the real `?author=1` UI

- Created a new Visual Asset and added Box, Cylinder, Cone, and Sphere parts through the dynamic palette. Edited the Sphere's local position, rotation, nonuniform part scale, and color through real inspector controls.
- Fit To Visual Bounds produced a visible independent cyan Box proxy around the combined visual. Direct canvas dragging of the selected Sphere updated its local X/Z inspector values.
- Placed two world instances. Changed the second instance's ordinary authored rotation and uniform scale independently. Re-entering Asset Edit showed both instances retaining their independent transforms.
- Changed the shared Box part's scale and color; both placed instances visibly rebuilt from the same recipe. Ctrl+Z restored both and Ctrl+Y reapplied both through the production undo/redo path.
- Returning to Runtime Play required one click after the edit-mode state synchronization fix. Both shared instances remained visible and Asset Edit-only presentation disappeared. Browser warnings/errors: none.

### Human acceptance still requested

Using recognizable player-facing locations and visuals, build one multi-part prop, place two instances, transform one independently, edit the shared recipe, and confirm both update without snapping together. Click Play and confirm the appearance matches Edit and no cyan collider proxy remains. Verify the simple Box collision blocks only where expected, export/reload reproduces the recipe and instances, and the migrated Camp Drop Pod remains recognizable. Repeat the Play/readability check in a portrait phone viewport. Any transform coupling, recipe mismatch, mesh-derived collision, leaked editor proxy, reload loss, or unrecognizable Drop Pod is a failure.

## 2026-08-25 — Phase 4B.0 focused workbench, starter kit, and harvestable roles — automated browser evidence only

This is implementation/browser evidence, **not human acceptance**.

### Observed through the real `?author=1` UI

- A clean repository-backed Author origin listed all 21 requested starter recipes under Containers, Furniture, Machines, Nature, Resources, Ruins, Structures, and Tools. Searching `iron` reduced the list to Iron Mechanical Gear, Iron Ore Rock, Iron Pickaxe, and Iron Sword.
- Asset Edit hid every non-light scene root and showed only the dedicated grid/platform, selected asset, and separate collider proxy. Browser inspection confirmed hidden world roots and zero stage roots after Exit; exiting restored 83 visible scene roots and a finite prior camera.
- Initial browser proof exposed a bounds-name camera defect (`x/y/z` read from a `w/h/d` result); the corrected workbench visibly framed the Frontier Chest and Berry Bush.
- Selecting the chest lid and using the production keyboard path changed local Y from `0.88` to `1.08` with `Space`; `C` returned it to `0.88`.
- At the default desktop viewport, the 380 px panel reported `clientWidth === scrollWidth === 363`; each vector row reported `clientWidth === scrollWidth === 330`. No horizontal overflow was present.
- Berry Bush displayed Game Object Type `harvestable`, drop `berries`, 4 hits, 14 second respawn, and plant/fiber feedback. The drop selector listed all seven canonical drops.
- Placed a Berry Bush through the real palette/canvas and clicked Play. Runtime produced exactly one `asset:asset_berry_bush` resource yielding `berries`; `staticWorldBuilder` had no duplicate copy. Browser warnings/errors were empty.
- A 390×844 normal-runtime smoke remained portrait-framed and usable with no browser warnings/errors.

### Human acceptance still requested

Use the recognizable setup in `docs/Specs/Phase_4B.0.md` Tests 9–11. Confirm the isolated stage feels clear, `Space`/`C` movement is readable, starter assets are recognizable enough for rapid map authoring, and a custom harvestable/drop remains understandable through real harvesting, depletion/respawn, extraction results, and banking. Automated state inspection is not proof of feel, recognizability, or phone performance.

## 2026-08-25 — Phase 4B.0 Asset Workbench stabilization — automated browser evidence only

This is implementation/browser evidence, **not human acceptance**.

### Observed through real pointer and keyboard input

- Opened the repository-backed Frontier Chest workbench at the normal desktop viewport. The focused 420 px panel hid the asset catalog and unrelated Author sections, themed its controls consistently, and left the 3D stage unobstructed.
- Clicking the chest lid focused the renderer canvas. Real `Q`/`E` input changed local Y rotation `0° → -15° → 0°`; real `Space`/`C` changed local Y `0.88 → 1.08 → 0.88`. Canvas focus remained active after every temporary-root refresh.
- `]` produced a visibly different right-side view and the truthful status `Camera rotated right 45°`. A real right-button vertical drag moved the view in the requested inverted direction with a bounded scale; reset/orbit controls remained available.
- The first stabilization screenshot exposed late resource roots above the asset. Render-bound isolation plus an Asset Edit visibility early-return removed the leak. After the fix, 123 unrelated scene roots retained identical UUIDs through 12 consecutive part edits and zero were visible before or after the sequence.
- Exiting removed every tagged workbench-stage root, restored 83 visible non-light roots, restored the saved camera, and returned status to `EDIT — world objects`.
- At 1024×720, panel `clientWidth === scrollWidth === 403`, editor `clientWidth === scrollWidth === 382`, and every part input stayed inside the panel bounds. Browser warnings/errors: none.

### Human acceptance still requested

Perform spec Test 12 by feel. Confirm the 45° orbit is useful from all sides, the inverted vertical pan matches expectation, shortcuts remain dependable after ordinary inspector use, no scene object flashes during a longer authoring session, and the wider focused panel is comfortable on the actual desktop setup.

## 2026-08-25 — Phase 4B.0 behavioral assets and world-authoring closure — automated browser evidence only

This is implementation/browser evidence, **not human acceptance**.

### Observed through the real `?author=1` UI

- Reloading an older saved Author draft non-destructively added the missing repository catalog: the Visual Assets library populated with the shipped recipes while the pre-existing draft remained usable.
- The Frontier Chest workbench remained isolated during repeated edits. Its panel reported `clientWidth === scrollWidth === 403`; the same no-horizontal-overflow result held at a 768×720 narrow desktop viewport.
- Real keyboard input on the selected chest band produced `Q: 0° → -15°`, `E: 0° → +15°`, `Space: 0.42 → 0.62`, and `C: 0.42 → 0.22`; Ctrl+Z returned each field to its exact starting value. Moving the part later changed its visible order from row 4 to row 5, and undo restored row 4.
- The camera buttons visibly changed the chest from its initial angled/front view to a 45° right-side view. The production camera helper additionally verifies that wheel dolly preserves fixed pitch and right-drag translates in the current camera plane.
- Harvestable controls exposed ordered hits, respawn, impact profile, depleted-remnant Visual Asset, selected drop model, edit-model, and create-model flows. Wildkin controls exposed behavior, temperament, species/hostility, health/damage/speed/respawn, and all four spatial radii.
- Clicking the Camp Resonator in the scene selected it, expanded `camp → Props`, highlighted its exact hierarchy row, and scrolled it into view. Clicking Forest Edge selected the Major Waypoint, expanded `p1_forest_edge`, showed bounded Uniform Scale and a World Model dropdown containing the full Visual Asset catalog, and retained a dark readable inspector theme.
- Browser console warnings/errors remained empty after the final reload.

### Human acceptance still requested

Perform spec Tests 13–17 in recognizable play. Harvest an ordered multi-part custom resource through depletion/respawn, collect its custom-model drop, inspect its custom remnant, and extract/bank it. Fight or observe a Visual Asset Wildkin through warning/death/respawn, and verify custom Waypoint/Beacon models retain their normal gameplay. Confirm camera pan/dolly feel, model recognizability, and portrait-phone readability by eye; automated state and screenshots do not replace perceptual acceptance.


---

## 2026-08-27 — Phase 4B first-pass stop / level-design direction

### Human observation

The first Phase 4B implementation pass was intentionally stopped after review/play because AI-authored level layout/pacing was not producing a convincing human-designed section.

Useful systems/content from the pass may remain, but the continuous elongated "Crescent Basin" direction is not accepted as the final world structure.

### New owner-directed level-design direction

- Standard base world cell: **50×50**.
- Camp target footprint: **100×100**, with future **25×25** expansion plots.
- Expedition spaces become self-contained portal-connected sections rather than one physically adjacent strip.
- A section normally has one discoverable Major Waypoint; entry portals are not Waypoints.
- Fresh Camp Gate travel goes directly to Section 1 until a frontier Waypoint has actually been discovered.
- Ruined section gates can require player level + carried resources to rebuild and permanently unlock the next section.
- Section 1 should eventually contain at least one secret, one optional parkour challenge, a repeatable loot chest, resources/Wildkin appropriate to its tier, an Extraction Beacon, its Waypoint, and an outbound ruined gate.
- Dedicated first-class Jump Pads are preferred over the current visual pad + invisible destination-authored jump link.
- Parkour failures may safely respawn at course start/checkpoint without resolving expedition death or losing run cargo.
- AI should build standardized systems, Visual Assets, behaviors, validation and authoring tools; the owner will perform final level composition and repeated play/balance tuning.

### Next

Implement **Phase 4B.1 — Section Framework & Level-Design Toolkit**, then stop system expansion and use the tools for the owner-authored Phase 4B.2 Section 1 vertical slice.

---

## 2026-08-27 — Phase 4B.1 framework verification — automated Chrome/CDP evidence only

This is implementation/browser evidence, **not human acceptance**. The checks used the repository dev server at `http://localhost:8080/`, a real Chrome page, real DOM controls, and real pointer/keyboard CDP input. Automated state inspection cannot establish feel, recognizability, phone performance, or final pacing.

### Author Mode (`?author=1`)

- At the desktop author viewport, the actual section selector exposed `camp`, `section_1`, and `section_2`; the palette exposed Jump Pad, Parkour Start, Checkpoint, Kill Volume, Portal Gate, and Loot Chest.
- Entering and leaving Edit through the real button changed the mode and input ownership correctly. Selecting Section 1, placing a Jump Pad, rotating it with real `E`, and placing Portal Gate/Loot/Checkpoint pieces kept the new objects owned by Section 1; no automatic rehoming occurred.
- Switching the real selector to Section 2 and back updated visible roots and the read-only section profile summary. Editor trajectory helpers were present for the proof Jump Pad and updated after rotation.

### Normal runtime (`?dev=1`)

- After clearing the normal save, positioning the player at the Camp Gate and clicking the actual `START EXPEDITION` contextual button activated Section 1 at its authored entry, with no initial Waypoint unlocked.
- The production parkour system started the proof course, recorded a checkpoint, and safely respawned from a kill volume with health restored and run cargo preserved.
- Opening the Section 1 secret chest through the actual contextual button awarded its iron loot/XP once; the follow-up label became `CHEST EMPTY` and a second click did not duplicate the reward.
- With level-2 XP and the required current run cargo, the actual ruined-gate interaction showed its requirement detail, repaired and persisted the gate, deducted the required wood/stone, and then transitioned through the portal to Section 2 while preserving the active run. Section 1 colliders were disabled and Section 2 colliders enabled.
- Moving onto the Section 2 Waypoint through the runtime path added `wp_section_2` to frontier progress. Browser warnings/errors were empty during the final reload/check sequence.

### Human acceptance still requested

Use the player-facing checklist in `docs/Specs/Phase_4B.1.md` and the next Phase 4B.2 brief. Confirm the sparse pieces read naturally on the target phone, traversal and parkour are understandable by feel, portal/loot feedback is clear, and the owner-authored Section 1 composition has convincing routes, secrets, encounters, and pacing.
## 2026-08-27 — Phase 4B.1.1 automated implementation evidence

This is automated/unit evidence only, not human acceptance. The closure regression suite covers canonical Jump Pad trajectory invalidation, course-scoped parkour checkpoint/fail/end/replacement behavior, and atomic repair rollback. World generation and normalization pass with the physical Section 1 ⇄ Section 2 gate pair and Section 1 Camp-arrival endpoint. A real browser/phone perceptual pass remains to be performed by the owner.

## 2026-08-27 — Phase 4B.1.2 Author performance automated evidence

This is automated/browser evidence only, not human acceptance.

- The production `?author=1&dev=1` path loaded with the Phase 4B.1.2 label and no browser warnings/errors.
- Entered Edit, selected Section 1, switched the real camera through right-drag pan, Alt-drag orbit, and wheel zoom, then selected `jump_pad_section_1` and changed Rotation, Horizontal Launch, and Vertical Launch through the real inspector controls without reload.
- SectionRuntime regression coverage confirms repeated activation of the same section produces no second playground activation, physics activation, or change callback. Source-level regression coverage confirms the main loop and camera handlers no longer invoke full editor synchronization.
- A temporary browser attempt to place 200 cheap Box objects exceeded the bounded automation window before a trustworthy workload count was available. No stress fixture or decorated level was committed.

Human acceptance still requested: perform sustained pan/orbit/zoom by feel on the target desktop and phone viewport, use `window.__author.mode.getEditorDiagnostics()` while simply looking and while moving the camera (expected full sync rate approximately 0/sec), and verify section switching, object selection, overlays/gizmo alignment, and live Jump Pad trajectory readability.

## 2026-08-27 — Phase 4B.1.3 Author camera closure — automated browser evidence only

This is automated input and screenshot evidence, **not human acceptance**. The checks used the repository server at `http://127.0.0.1:8093/` in the in-app browser.

### Observed through the real `?author=1&dev=1` UI

- The page loaded the Phase 4B.1.3 label (`0.16.0`) with no console warnings or errors.
- Entered Edit and used the real section selector across Camp, Section 1, and Section 2. Each section remained selectable and its section profile updated in the visible UI; Camp is framed from span 100 and Sections 1/2 from span 50 by the pure metric tests.
- Sent an extreme wheel scroll over the renderer and then clicked the real **Reset view 0** control. The editor remained rendered with the orbit orb/cross and returned the visible reset status; no world-disappeared or browser-error state appeared.
- Used the real Section 2 **Focus Camera** control, right-drag pan, and Alt-drag orbit. The renderer stayed visible and the final screenshot retained the orbit marker and section editor surface.
- Deterministic camera tests verify zoom limits of 320 for Camp and 160 for Sections 1/2, with an editor far plane of 500 for these ranges; the gameplay projection snapshot restores near/far/fov after Edit exit.

### Human acceptance still requested

Confirm by feel on the target desktop and portrait phone: Camp/S1/S2 framing, smooth wheel response at trackpad and mouse deltas, min/max zoom usefulness, pan/orbit readability, Focus Object/Section placement, section-switch context, and that no distant geometry clips at the editor limit. Diagnostics were not exposed through this browser's page-evaluation surface, so the expected approximately 0/sec camera-only full-sync rate remains covered by source/unit tests rather than claimed as a browser observation.

## 2026-08-28 — Phase 4B.1.4 parity and travel closure — automated browser evidence only

This is real browser/UI evidence and automated state inspection, **not owner human acceptance**. A clean-origin repository server was used for canonical Author checks so the existing saved Author draft was not deleted or reset.

### Author and Play parity

- A clean `?author=1` load showed Camp, Section 1, and Section 2. Section 1 hierarchy exposed the real Jump Pad, both Portal Gates, Waypoint, Beacon, two chests, Entry Point, Parkour Start/Checkpoint/End, and Kill Volume.
- In Edit, Entry Point, Parkour markers, and Kill Volume resolved as `editorHelperOnly`. Selecting Section 2 made all Section 1 helper roots effectively hidden while the Section 2 Entry Point helper remained visible.
- In Section 1 Play, Entry Point, Parkour Start/Checkpoint/End, and Kill Volume had zero visible presentation roots. The real arrival/outbound gates, Jump Pad, Waypoint, Beacon, and both chests remained visible.
- The existing saved draft on the normal development origin loaded successfully and retained its authored region/content shape. Targeted persisted-draft migration is additionally covered by an automated authored-transform preservation test.
- Clean Author load had no browser warnings or errors.

### Camp travel, progression, and extraction

- Starting at the physical Camp gate presented only a clickable **Forest Edge** row at zero discoveries. Travel began an active Section 1 run at `z=17.5`, outside the Forest Edge gate trigger; the Section 1 Waypoint remained locked.
- Physically entering the Section 1 Waypoint displayed its activation toast and extraction action. After returning to Camp, the Camp travel selector contained both Forest Edge and the discovered Section 1 Waypoint, with no Beacon or decorative gate row.
- With Wood 3, Stone 2, and RUN XP 29, the Forest Edge gate displayed **RETURN TO CAMP**. **KEEP EXPLORING** left the session active with exact cargo/XP and an unchanged bank. Confirm returned to Camp, showed `EXPEDITION COMPLETE`, banked exactly Wood 3 / Stone 2 / XP 29, and recorded the new Waypoint.
- A second real extraction banked XP 21 to the exact 50 boundary. The Camp HUD visibly changed from `LV 1` to `LV 2`; RUN XP reset to 0.
- At the ruined Section 2 gate with 29 banked XP, the visible panel reported Level `1 / 2`, Stone `0 / 2`, Wood `0 / 2`, and Persistent XP `29 / 50`; repair was disabled.

### Hazard and workbench checks

- During the matching parkour course, entering the proof Kill Volume after its checkpoint safely respawned to that checkpoint and kept the expedition active.
- Outside the course, entering the same volume resolved the run and displayed `Cause: Fatal Hazard`. The combat death path separately displayed `Cause: Combat`.
- The browser pass exposed an initial checkpoint/volume overlap after relocation. Moving the proof volume farther down the optional lane to `x=8, z=-12` separated safe respawn from the hazard; the safe and fatal journeys were rerun successfully.
- Real wheel input over the Iron Sword workbench moved view distance `9.77 → 8.18 → 9.77`. The Stone Ruin Arch moved `10.26 → 8.56 → 10.26`, showing bounded reversible zoom without the previous no-effect jump. Pure tests cover more extreme spans (`0.1` and `120`) and clamp behavior.

### Human acceptance still requested

Run the checklist in `docs/CURRENT_SLICE.md` and the Phase 4B.1.4 handoff: visually judge helper recognizability, duplicate cleanup, Camp/Forest Edge clarity, extraction confidence, gate readability, intentional-hazard clarity, workbench zoom feel, and sustained 20–30 second Author smoothness on the target desktop/phone. Automated UI/state evidence does not establish perceptual or performance acceptance.
