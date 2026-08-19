# Wildkin Frontier — Phase 1: Movement & World Feel

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 1  
**Primary goal:** Make moving through the world on a phone already feel fast, responsive, expressive, and enjoyable before harvesting or combat exists.

---

## 1. Player-Visible Outcome

At the end of Phase 1, the player can move around a small 3D traversal playground on desktop and phone using the same underlying movement controller.

The player should be able to:

- Stand still without accidental drift.
- **Sneak, walk, and run** using distinct movement-intent zones rather than a purely linear analog speed curve.
- Feel meaningfully fast while running, while preserving future headroom for speed stats, buffs, sprint upgrades, and mounts.
- Change direction quickly and read the character's facing at a glance.
- Dodge in a chosen direction as a short mobility burst.
- Automatically perform a simple jump traversal when intentionally moving across a supported ledge/gap.
- Climb at least one clearly designated climbable surface by moving into it; no dedicated climb button is required.
- Move through a small test course containing open space, obstacles, elevation, a jump opportunity, and a climb opportunity.
- Remain comfortably framed by the fixed high third-person / near-top-down camera.

This phase is about **movement feel and traversal readability**, not resources, combat, progression, or content volume.

---

## 2. Design Intent

Movement should feel more energetic than a slow mobile gathering game.

The intended fantasy is:

> "I can move quickly and confidently through this world, but I can also deliberately slow down when stealth or precision matters."

The normal running state should feel brisk enough that simply crossing the environment is satisfying. However, run speed must not consume all future progression space. Later systems may increase player speed, grant temporary buffs, or introduce faster mounts.

Movement should be easy to learn with one thumb, but support additional mobility actions when a second thumb is available.

### Locked movement principles

1. **Fast-paced feel without uncontrollable speed.**
2. **Sneak / Walk / Run are distinct bands**, not merely a continuously scaled analog speed.
3. A **meaningful deadzone** prevents accidental movement.
4. Input sources produce normalized player intent; gameplay logic does not care whether intent came from touch or keyboard.
5. The player faces their movement/traversal direction.
6. Camera rotation is not player-controlled during normal play.
7. No manual jump button is required for this prototype.
8. Traversal actions should be contextual and readable rather than requiring many UI buttons.
9. Later stats may modify speeds, but Phase 1 tuning values live in centralized configuration.
10. Movement systems must remain understandable and modular for future AI-agent work.

---

## 3. Scope Priority

Implement in this order.

### Tier A — Required Core Locomotion

These are mandatory before Phase 1 can be considered successful:

- Unified input intent model.
- Floating touch movement control.
- Keyboard movement fallback.
- Deadzone + Sneak / Walk / Run bands.
- Responsive acceleration/deceleration.
- Character facing/turning.
- Ground/world bounds and simple obstacle collision.
- Smooth high-angle camera follow.
- Movement feedback that visually distinguishes idle, sneak, walk, and run.
- Expanded movement-test playground.
- Centralized movement/camera tuning.
- Automated tests for pure input/movement-band logic where practical.

### Tier B — Required Mobility Prototype

After Tier A works:

- Directional dodge.
- One supported automatic jump/ledge traversal example.
- One explicit climbable-surface example.
- Clear movement state transitions for dodge/jump/climb.
- No combat semantics yet.

### Tier C — Only if low-risk after A+B

These are optional refinements, not reasons to destabilize the slice:

- Small camera look-ahead while running.
- Short landing/impact feedback.
- Better touch-control visualization.
- Minor procedural character pose/lean improvements.
- Additional traversal-test geometry.

Do not expand beyond these items.

---

## 4. Input Architecture

All input methods must feed one shared movement/action intent layer.

Recommended conceptual shape:

```js
{
  moveX: 0,
  moveY: 0,
  moveMagnitude: 0,
  movementBand: "idle", // idle | sneak | walk | run
  dodgeRequested: false,
  dodgeX: 0,
  dodgeY: 0
}
```

Exact naming may differ, but input handling and movement simulation must remain separate responsibilities.

### Touch movement

Use a **floating virtual joystick / thumb-drag control**:

- A touch beginning in the designated movement area creates the temporary joystick origin at that touch position.
- Drag direction sets movement direction.
- Drag distance chooses a discrete movement band.
- Releasing the touch returns movement to idle.
- The joystick should visually communicate origin, current thumb position, and preferably the movement bands without cluttering the screen.
- The touch control must respect safe-area insets.
- The player should not need to touch a tiny fixed target.
- Normal movement remains possible with one thumb.

Suggested movement area:
- Prefer the lower-left / lower portion of the portrait screen while keeping enough room on the right for future contextual actions.
- The exact region is tunable; do not make unrelated screen areas permanently unusable unless necessary.

### Movement bands

Do **not** multiply speed linearly by joystick magnitude.

Classify magnitude into discrete bands. Use centralized configurable thresholds.

Suggested starting normalized radii:

```text
0.00 – 0.16   IDLE / deadzone
0.16 – 0.40   SNEAK
0.40 – 0.70   WALK
0.70 – 1.00   RUN
```

These are starting values, not sacred constants. They must be easy to tune after human playtesting.

Within a band, speed should be essentially stable. Small smoothing near thresholds is acceptable if it prevents jitter, but the player should perceive three intentional speeds.

### Suggested starting movement speeds

Use centralized values and tune to world scale:

```text
Sneak: ~1.6 world units/sec
Walk:  ~3.3 world units/sec
Run:   ~6.0 world units/sec
```

The ratios matter more than the exact values.

Running should feel quick. Preserve future headroom for:
- speed stats
- temporary buffs
- equipment
- Wildkin utility
- mounts

### Keyboard fallback

Support:
- WASD and arrow keys for direction.
- Default keyboard movement: Walk.
- Hold Shift: Run.
- Hold Ctrl or C: Sneak.
- Space: directional dodge for desktop testing.

Keyboard and touch must use the same movement controller/state model.

---

## 5. Movement Controller

Create a clear kinematic player movement controller; do not introduce a physics engine.

### Required behavior

- Movement is camera-relative on the ground plane.
- Diagonal movement must not be faster than cardinal movement.
- The player accelerates and decelerates responsively rather than teleporting between velocities.
- Direction changes should feel quick enough for an action-oriented game.
- Character facing follows meaningful movement direction.
- Turning can be smoothed slightly, but input should never feel sluggish.
- Frame-rate-independent movement uses delta time.
- Clamp pathological delta values after tab switching/resume.

Suggested starting tuning:

```text
Acceleration:     ~24–32 units/sec²
Deceleration:     ~30–40 units/sec²
Turn response:    fast, lightly smoothed
Max delta clamp:  ~0.05 sec
```

All tuning belongs in a centralized config module/object rather than scattered literals.

### Movement states

Use a clear state representation such as:

```text
IDLE
SNEAK
WALK
RUN
DODGE
JUMP
CLIMB
```

Do not build a framework-heavy state machine. A small explicit controller is preferred.

Transitions must be obvious in code. Dodge/jump/climb temporarily override ordinary ground locomotion and then return control cleanly.

---

## 6. Dodge Prototype

Dodge is a **mobility mechanic in Phase 1**, not yet a combat mechanic.

### Touch

Prototype a directional **swipe/flick dodge gesture** that does not conflict with the movement joystick.

Recommended initial design:

- A quick directional swipe beginning in the right-side action region triggers a dodge in the swipe direction.
- Convert screen-space direction to camera-relative world direction.
- The gesture must have minimum distance/velocity thresholds so ordinary taps do not trigger dodges.
- Avoid placing a permanent dodge button unless the swipe approach proves unusable.

### Desktop

- Space dodges in current movement direction.
- If there is no movement intent, dodge in current facing direction.

### Dodge behavior

- Short, fast burst.
- Fixed duration and cooldown, centralized in tuning config.
- Character cannot endlessly stack dodge requests.
- Preserve collision/bounds.
- Provide clear visual feedback using procedural transforms/effects only.
- **No invulnerability frames, stamina cost, damage interaction, enemy interaction, or combat balancing yet.**

Suggested starting values:

```text
Dodge duration: 0.18–0.28 sec
Dodge distance: roughly 1.5–2.5x a normal running step over that interval
Cooldown:       ~0.45–0.70 sec
```

Tune by feel.

---

## 7. Automatic Jump / Ledge Traversal Prototype

Do not create a manual jump button.

Phase 1 should prove that contextual traversal can work without committing to a general parkour engine.

### Required prototype

Create at least one clearly readable test obstacle where:

1. The player approaches a supported jump edge while intentionally moving toward it.
2. A valid linked landing location exists within the allowed traversal distance.
3. The controller automatically enters `JUMP`.
4. The player follows a short readable arc.
5. Normal ground movement resumes on landing.

Prefer a lightweight **data-driven jump link / traversal marker** or similarly explicit solution over fragile generic edge detection in Phase 1.

The authored test should let us evaluate whether Eternal-Hero-style automatic jumping feels good in this camera/control scheme.

### Guardrails

- Do not implement a general freeform platformer.
- Do not allow arbitrary air steering unless a very small amount is required for feel.
- Do not add fall damage.
- Do not add combat interactions.
- Do not make every drop automatically jumpable.
- Traversal links/valid landing conditions must be explicit and inspectable.

---

## 8. Climbing Prototype

Phase 1 should support **explicitly climbable surfaces**, not "every vertical wall in the game is climbable."

### Required prototype

Include one climbable object, wall section, ladder, vine, or clearly marked surface in the movement playground.

Desired interaction:

1. Player walks toward the climbable surface.
2. When movement intent is sufficiently directed into it and entry conditions are valid, the controller enters `CLIMB`.
3. Continuing movement moves the player along the climb path/surface.
4. Reaching the top transitions back to ground locomotion cleanly.
5. Backing away / descending should behave predictably.

No dedicated climb button is required.

The implementation should make the climbable status explicit in world data/code so future level design can choose which surfaces are climbable.

### Open future question

Whether the final game allows:
- climbing most suitable walls,
- only tagged natural surfaces,
- ladders/vines only,
- or a mixture

remains open. Phase 1 should not decide this permanently.

---

## 9. Collision, Grounding & World Bounds

No full physics engine.

Implement only enough collision/traversal support to make the movement playground trustworthy.

Required:

- The player cannot walk through designated solid obstacles.
- The player stays within valid world/traversal bounds.
- Collision response should slide or stop cleanly rather than jitter.
- Simple circle/capsule/point-plus-radius style collision is acceptable.
- Ground/elevation handling must support the authored jump and climb prototypes.
- Do not attempt general rigid-body physics.
- Do not make decorative visual meshes automatically authoritative collision geometry if a simpler explicit collider representation is clearer.

Keep collision data simple and inspectable.

---

## 10. Camera Follow

Preserve the existing high third-person / near-top-down visual direction.

The camera should now follow the moving player.

Required:

- Fixed rotation during normal play.
- Smooth positional follow.
- Player remains easy to locate while running quickly.
- No nauseating lag or rubber-band feel.
- Camera does not overshoot dramatically after dodge/jump.
- Portrait composition remains primary.
- Camera settings remain centralized.

Optional if it improves feel:
- modest movement-direction look-ahead, especially while running
- speed-sensitive follow tuning

Avoid:
- player-controlled camera rotation
- orbit controls
- camera shake as a substitute for movement feel
- excessive smoothing that makes fast input feel delayed

---

## 11. Movement Feedback

The placeholder player may remain primitive-based, but each movement state should read visually.

Use inexpensive procedural feedback such as:

### Idle
- subtle existing breathing/bob

### Sneak
- lower/crouched posture
- smaller/slower step bob
- visually deliberate slow motion

### Walk
- normal upright locomotion rhythm

### Run
- forward lean
- faster stride/bob rhythm
- stronger sense of momentum

### Dodge
- quick squash/lean/burst/trail or similar readable effect

### Jump
- visible arc and brief takeoff/landing pose change

### Climb
- body orientation/pose clearly differs from ground movement

Do not build an art/animation asset pipeline yet. The purpose is to make states readable and movement satisfying with simple geometry.

---

## 12. Movement Playground

The current Phase 0 island is too small to judge fast movement well.

Expand or replace it with a compact low-poly **movement playground** while preserving the established simple visual style.

Include:

- An open straightaway long enough to feel Run speed.
- Open area for rapid direction changes.
- At least one solid obstacle to test collision/sliding.
- A narrow passage or precision area where Sneak is useful.
- One supported jump/ledge traversal.
- One explicit climbable surface leading to elevated ground.
- At least one elevation change so the camera can be evaluated vertically.
- Clear boundaries.

This is still a test environment, not a finished biome.

Do not spend Phase 1 on decorative art polish.

---

## 13. Recommended Module Boundaries

Follow `docs/ARCHITECTURE.md` and `AGENTS.md`.

A reasonable shape is:

```text
src/
  main.js
  game/
    createGame.js            # if useful; do not create merely for ceremony
    createCamera.js
    createRenderer.js
  input/
    inputController.js
    touchMovement.js
    keyboardInput.js
  player/
    createPlayer.js
    playerController.js
  movement/
    movementConfig.js
    movementBands.js
    traversalController.js
  camera/
    cameraFollow.js          # only if separation is useful
  world/
    createMovementPlayground.js
    collision.js
  ui/
    movementDebug.js         # temporary/debug only if useful
```

Exact filenames are not mandatory.

Architecture rules are:

- `main.js` remains thin.
- One authoritative `requestAnimationFrame` loop.
- Input does not directly move Three.js objects.
- Gameplay controller owns player movement state.
- Pure calculations should be separated from rendering where practical.
- Do not create duplicate competing systems.
- Search for the existing owner of a concern before adding another implementation.
- Prefer small cohesive modules over either one huge file or excessive micro-files.

---

## 14. Configuration / Tuning

Create one obvious home for movement/traversal tuning.

It should include at least:

- joystick deadzone
- sneak threshold
- walk threshold
- run threshold
- sneak/walk/run speeds
- acceleration
- deceleration
- turn response
- dodge distance/speed/duration/cooldown
- jump duration/arc height/max supported link distance
- climb speed
- camera follow smoothing
- optional camera look-ahead

Human playtesting should be able to adjust these without hunting across modules.

Do not implement player stats/progression yet. These are base tuning values that later stats can modify.

---

## 15. Debugging & Tuning Aids

Temporary development aids are welcome if they are unobtrusive and removable.

Useful examples:

- current movement state
- joystick magnitude
- movement band
- current speed
- FPS
- current traversal state
- collider/traversal-marker visualization behind a debug flag

Do not clutter normal mobile play.

Debug globals may exist only under the existing debug-only convention from `AGENTS.md`.

---

## 16. Automated Verification

Preserve all Phase 0/0.5 checks.

Required before stopping:

```sh
npm run verify
npm run zip
```

Add lightweight tests for pure movement/input calculations where practical.

Prefer Node's built-in test runner rather than a new testing framework.

At minimum, automatically verify logic for:

- joystick deadzone
- Sneak / Walk / Run threshold classification
- diagonal normalization / movement vector normalization
- invalid/zero input
- any pure cooldown/state-transition calculations that are easy to test

If a `test` script is added, incorporate it into `npm run verify`.

Do not add a large test dependency.

---

## 17. Performance Requirements

This is a portrait mobile game.

Required:

- Preserve one authoritative frame loop.
- Frame-rate-independent movement.
- Avoid avoidable object/array allocation every frame in hot movement code.
- Avoid per-frame DOM updates except throttled debug/UI work.
- No runtime network dependency.
- No expensive post-processing.
- Preserve existing DPR cap.
- No new gameplay dependency without a concrete need.

The movement playground should remain smooth on the target phone.

---

## 18. Acceptance Criteria

Phase 1 is ready for human review when all of the following are true.

### Functional

- Touch movement works in portrait on a real phone.
- Keyboard fallback works on desktop.
- Deadzone prevents accidental drift.
- Sneak, Walk, and Run are three clearly distinct movement bands.
- Run feels intentionally fast relative to Walk.
- Character facing follows movement direction.
- Acceleration/deceleration and turning are frame-rate independent.
- World collision/bounds work without obvious jitter or tunneling in ordinary movement.
- Camera follows smoothly while preserving the intended fixed angle.
- Dodge works directionally on phone and desktop.
- Dodge has no combat/i-frame logic.
- One authored automatic jump traversal works reliably.
- One authored climbable-surface traversal works reliably.
- The player returns cleanly to ground locomotion after dodge/jump/climb.
- The movement playground contains enough space/features to test every state.

### Architecture

- `main.js` remains thin.
- Exactly one authoritative permanent `requestAnimationFrame` loop exists.
- Input, movement, traversal, world collision, and camera responsibilities are not collapsed into one god file.
- Movement tuning is centralized.
- No React/game engine/ECS/physics engine/backend introduced.
- No duplicate parallel movement systems.
- Submission build remains readable and compliant.

### Verification

- Existing automated tests/checks pass.
- New pure movement-band/input tests pass.
- `npm run verify` passes.
- `npm run zip` passes.
- Submission stays below 35 MB.
- Dev and submission builds both load.
- `docs/BUILD_LOG.md` is updated with the Phase 1 session.

---

## 19. Human Playtest Checklist

After the agent stops, test desktop briefly and then spend meaningful time on the actual phone.

Record notes in `docs/PLAYTEST_NOTES.md`.

### Core feel

- Does Run feel fast and fun, or merely numerically faster?
- Is there still obvious future headroom for buffs/mounts?
- Does movement start quickly enough?
- Does stopping feel precise or slippery?
- Can you reverse direction without fighting momentum?
- Does the character turn quickly enough?
- Is diagonal movement consistent?

### Thumb control

- Is the deadzone large enough to rest your thumb without moving?
- Is it easy to intentionally enter Sneak?
- Can you reliably distinguish Sneak → Walk → Run without watching the joystick?
- Do the three zones feel natural?
- Is the floating joystick origin comfortable?
- Does your thumb obscure anything important?
- Can you move for several minutes without hand discomfort?

### Camera

- Does running outrun the camera mentally/visually?
- Can you see enough space ahead?
- Is follow smoothing responsive rather than floaty?
- Is high-angle framing still good on the real phone?
- Does dodge/jump/climb cause awkward camera snaps?

### Dodge

- Is swipe-to-dodge intentional and reliable?
- Does it conflict with normal touch movement?
- Is the burst satisfying?
- Is the cooldown understandable without intrusive UI?
- Would you want this as a combat movement later?

### Automatic jump

- Does the jump happen when you expect it?
- Does it ever trigger when you did not want it?
- Does automatic traversal feel better than adding a jump button?
- Is the arc readable from this camera?

### Climb

- Is it obvious what is climbable?
- Does entering climb feel intentional?
- Is climbing too automatic or pleasantly frictionless?
- Would tagged surfaces/ladders be preferable to climbing arbitrary walls?

### Overall

- Is simply moving around enjoyable enough to do for a few minutes?
- What is the single worst-feeling part of movement?
- What is the single best-feeling part?
- Which 1–3 tuning changes would create the biggest improvement?

Do not judge harvesting, combat, Wildkin, progression, or final art in this playtest.

---

## 20. Explicit Non-Goals

Do not implement:

- Harvesting.
- Resource drops/pickups.
- Inventory.
- Combat.
- Enemies.
- Damage/health.
- Dodge invulnerability frames.
- Dodge stamina costs.
- Weapons.
- Wildkin.
- Capture/bonding.
- XP.
- Skill trees.
- Equipment progression.
- Base building.
- Matter Resonator.
- Waystones.
- Persistence beyond existing tooling needs.
- General procedural parkour.
- "Climb every wall" behavior.
- Fall damage.
- Swimming.
- Mounts.
- Speed-stat progression.
- Finished character art/animation pipeline.
- Finished biome art.
- Multiplayer.
- Camera rotation controls.

---

## 21. Agent Stop Condition

Implement Phase 1 end-to-end in the priority order above.

Do not stop after planning.

Fix issues you can reproduce during implementation.

If Tier A is not stable, do not spend time polishing Tier B/C.

If the limited jump or climb prototype requires a disproportionately large/general system or destabilizes core movement, implement the smallest explicit authored traversal solution that proves the interaction and document the limitation rather than over-engineering it.

Stop when:

- all automatable acceptance criteria are satisfied,
- the build is ready for human phone playtesting,
- and no Phase 2 functionality has been started.

At the end report:

1. What changed.
2. Module/architecture decisions.
3. Current movement tuning values.
4. Touch and keyboard controls.
5. How dodge input works.
6. How jump traversal is authored/detected.
7. How climbable surfaces are authored/detected.
8. Automated tests and validation results.
9. Exact manual phone checks still required.
10. Any deliberately deferred Phase 1 refinements.
11. Confirmation that `docs/BUILD_LOG.md` was updated.
