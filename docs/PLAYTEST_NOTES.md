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
