# Wildkin Frontier — Phase 1.1: Movement & Traversal Refinement

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 1.1  
**Purpose:** Refine the Phase 1 movement/traversal prototype using the first human desktop + phone playtest. Preserve the movement/camera behavior that already feels good while replacing prototype shortcuts that made jumping, climbing, and elevation feel artificial.

## 1. Human Playtest Findings — Authoritative Input

Phase 1 was manually tested on desktop Chrome and a Samsung S26+.

### What worked well
- General movement felt smooth.
- Camera follow felt smooth.
- Sneak / Walk / Run concept worked.
- Mobile movement control was functional.
- Directional dodge was functional.
- Ladder climbing upward was basically understandable.
- Core architecture/build/validation passed.

### Problems found
1. **Desktop sneak binding conflict**
   - `Ctrl + W` can invoke browser/system shortcuts.
   - The player had to discover the sneak control instead of it being obvious.

2. **Jump feels canned and abrupt**
   - Jump distance is identical regardless of approach speed.
   - The beginning of the jump appears to teleport/snap the player.
   - Airtime feels too short/abrupt.
   - Player has no meaningful control while airborne.
   - Desired: more natural, slightly floatier jump preserving approach momentum with limited air steering.

3. **Elevated platform sides behave incorrectly**
   - Walking into brown elevated geometry can cause the player to rise onto it as though an invisible ramp exists.
   - There appeared to be an invisible collision/grounding problem near the left jump-gap mound.

4. **Climb descent/exit feels artificial**
   - Climbing upward was acceptable.
   - Climbing downward felt nearly instantaneous.
   - Reaching the top caused a visible forward teleport.
   - Desired: continuous climb down and a short readable top-out/mantle transition.

5. **Architecture cleanup opportunity**
   - `playerController.js` now owns enough locomotion + dodge + jump + climb + visuals that traversal responsibilities should be separated before more gameplay is added.
   - `inputController.js` exposes an unused wrapper plus the pure merge helper actually used by `main.js`; remove the redundant API shape.

These findings override Phase 1 prototype behavior where they conflict.

## 2. Player-Visible Outcome

At the end of Phase 1.1:
- Existing Sneak / Walk / Run movement still feels as smooth as the accepted Phase 1 build.
- Desktop controls no longer use `Ctrl` for sneak.
- Automatic jumps begin from the player's actual current position without visible snapping.
- Approach speed affects horizontal jump momentum/distance.
- Running can create a meaningfully longer jump than walking.
- Sneaking normally does not automatically launch the player across a gap.
- Jump airtime is slightly floatier and visually readable from the fixed high camera.
- The player has limited air steering without becoming a full platformer.
- Vertical platform faces block ordinary walking instead of turning into invisible ramps.
- Elevated surfaces are reached only through explicit valid traversal such as a jump, ramp/stairs if authored, or climbing.
- Climbing downward is continuous instead of instant.
- Reaching the top uses a short mantle/top-out transition rather than teleporting deeply onto the platform.
- A player on top can intentionally enter the climb and descend.
- Existing collision sliding, dodge, touch control, camera follow, offline packaging, tests, and performance remain intact.

No harvesting/combat/Phase 2 functionality is added.

## 3. Preserve Accepted Phase 1 Behavior

Do not rewrite working systems merely for elegance.

Preserve unless necessary:
- Floating touch joystick.
- Discrete deadzone / Sneak / Walk / Run bands.
- Current base speeds unless a tiny adjustment is needed.
- Fast responsive acceleration/deceleration.
- Camera-relative movement.
- Character facing.
- Current camera angle and generally accepted follow feel.
- Directional right-side swipe dodge.
- Desktop Space dodge.
- Simple kinematic collision approach.
- One authoritative permanent `requestAnimationFrame` loop.
- Centralized tuning.
- esbuild submission pipeline.
- `npm run verify`, tests, ZIP tooling and CI.

## 4. Desktop Control Refinement

Remove `Control` / `Ctrl` as a sneak modifier.

Required desktop controls:

```text
WASD / Arrow Keys  = movement
C + movement       = Sneak
movement alone     = Walk
Shift + movement   = Run
Space              = Dodge
```

Requirements:
- `Ctrl` must not be captured or treated as gameplay input.
- `C` is the only sneak modifier for desktop in Phase 1.1.
- If useful, add a small temporary development controls legend so bindings are discoverable.
- Do not attempt to override browser/system reserved shortcuts.

## 5. Jump Model — Replace the Canned Snap Animation

The authored jump-link idea remains useful, but links/zones should define a **legal traversal opportunity**, not an exact canned trajectory.

### Core principle
> The world decides whether a jump is valid. The player's current movement determines how the jump feels.

### Do not
- Snap/copy the player to an authored `jumpStart`.
- Always interpolate from one exact start point to one exact end point.
- Ignore current horizontal speed.
- Use the same horizontal jump distance for Sneak, Walk, and Run.

### Required takeoff
When reaching a valid authored jump trigger:
1. Begin from the player's actual current world position.
2. Capture current grounded horizontal velocity/direction.
3. Determine forward momentum from current speed/band.
4. Preserve heading naturally.
5. Enter jump without visible positional snap.

### Movement-band behavior
- **Sneak:** normally does not auto-jump a real gap; should allow careful ledge approach.
- **Walk:** may trigger a conservative short jump if a valid landing is reachable.
- **Run:** may trigger a farther/faster jump with more horizontal momentum.
- **Dodge:** must not accidentally convert into jump behavior.

### Authored traversal data
Keep explicit authored data, but represent concepts such as:

```js
{
  id: "...",
  triggerRegion: ...,
  direction: ...,
  landingRegion: ...,
  minTakeoffSpeed: ...,
  maxLandingDistance: ...
}
```

Exact structure may differ. Do not require one exact takeoff coordinate.

### Landing validity
- A jump begins only when a supported landing region is valid ahead.
- Momentum may affect where inside that region the player lands.
- Correct/clamp only enough to guarantee the authored traversal remains valid.
- Avoid magnetic snapping to target center.
- If speed is insufficient, do not silently teleport across.

### Jump motion
Use a small explicit kinematic model, such as:

```text
horizontal position += horizontalVelocity * dt
vertical velocity += gravity * dt
vertical position += verticalVelocity * dt
```

No physics engine.

Suggested starting ranges:
```text
initial vertical velocity: ~5.0–6.5 u/s
gravity:                   ~10–14 u/s²
air control:               ~20–35% of ground steering authority
```

Aim for roughly ~0.7–1.0 seconds of readable airtime for a representative running jump if world scale supports it.

### Air control
- Limited intentional steering.
- Ground control remains much stronger.
- No instant midair reversal.
- Same touch/keyboard directional intent.
- Enough to correct a jump, not fly.

### Landing
- Land naturally on a valid authored surface/region.
- Preserve sensible post-landing horizontal momentum.
- Transition cleanly to grounded movement.
- No fall damage/combat.
- Tiny landing feedback is allowed if low-risk.

## 6. Elevation & Platform-Side Collision Fix

The current ground-height approach must not make vertical platform faces behave like ramps.

### Required rule
> X/Z overlap with an elevated platform is not sufficient by itself to place the player on top.

Requirements:
- Vertical platform sides are solid barriers during normal grounded locomotion.
- Walking into a side stops/slides along it.
- Player may stand on top only after a valid route: jump landing, climb/mantle, or visible authored ramp/stair/path.
- Keep explicit simple collision/elevation data.
- Do not infer complex collision from decorative meshes.

A simple model is preferred:
```text
ground surfaces / walkable regions
solid side colliders
jump landing regions
climbable surfaces
```

Specifically reproduce and fix:
- walking into sides/top-region of the brown low jump-gap platforms,
- the reported apparent invisible obstruction/height issue at the top of the left gap mound.

Add/update pure tests where practical.

## 7. Climbing Refinement

Keep explicit climbable surfaces. Do not implement climb-every-wall.

### Entering from below
- Intentional movement into a tagged surface enters `CLIMB`.
- Avoid visible teleport.
- Small attachment snap is acceptable if visually minor.

### Upward movement
- Holding intended climb direction moves upward continuously.
- Releasing input pauses.
- Tune speed as needed.

### Downward movement
- While attached, intentional downward input moves the player down continuously.
- Do not immediately reset Y to ground height.
- Reaching bottom returns smoothly to grounded locomotion.

### Entering from above
- Add explicit top-entry/down-climb support.
- Player on upper platform moving toward tagged climb edge can transition onto it.
- Use a small authored top-entry region, not generic ledge detection.
- Then allow continuous descent.

### Mantle / top-out
Replace fixed-position teleport with a brief procedural top-out:
1. Reach upper edge.
2. Move slightly upward/over the lip.
3. End just inside the upper walkable surface.
4. Return to ground locomotion.

Suggested duration:
```text
~0.20–0.35 sec
```

Use actual nearby position plus a small authored exit offset; do not teleport to platform center.

If helpful distinguish `CLIMB` and `MANTLE`, without a heavyweight state-machine framework.

## 8. Collision Sliding Test

Keep existing sliding behavior unless it proves broken.

The block near `(4.2, 0.6)` is a diagnostic obstacle. When pushing diagonally into it:
- player does not pass through,
- player does not jitter badly,
- remaining valid movement allows sliding along the surface.

Do not remove it just because it is a test fixture.

## 9. Sneak / Precision Corridor

The narrow corridor is a control diagnostic, not a stealth mechanic.

It tests:
- whether Sneak is easy to enter intentionally,
- low-speed correction,
- tight-space collision,
- whether Sneak gives a precision advantage over Run.

Keep/simplify/improve it as useful. Do not add enemies, detection meters, noise, or stealth systems.

## 10. Architecture Refinement

### `playerController.js`
Keep it as player-state/grounded-locomotion coordinator, but do not let it become the monolithic owner of traversal and visuals.

Strong candidates:
```text
src/player/playerController.js        # locomotion/state coordination
src/player/playerVisuals.js           # bob/lean/crouch/traversal pose
src/movement/traversalController.js   # jump/climb/mantle
```

Exact files may differ. Split only for cohesive responsibility.

### Traversal ownership
- World data defines valid traversal opportunities.
- Traversal controller interprets them.
- Avoid duplicated jump/climb logic across world/player/input.

### Input cleanup
`src/input/inputController.js` currently contains a redundant/unused wrapper while the pure merge helper is what runtime uses.

Choose one clear API and remove unused parallel API/comments/placeholders.

### Hot-loop allocation
Reduce obvious avoidable per-frame `THREE.Vector3` allocations while touching movement/traversal, if practical. No broad premature optimization rewrite.

## 11. Tuning Configuration

Keep feel values centralized.

Add/refine:
- walk/run jump momentum modifiers if needed
- vertical takeoff velocity
- gravity
- air-control strength
- minimum jump speed
- maximum authored landing correction
- climb up/down speed
- climb entry thresholds
- mantle duration
- mantle offset/distance
- top-entry climb thresholds

Remove clearly obsolete unused placeholder config.

No stats/progression.

## 12. Tests

Preserve existing tests and add lightweight pure tests.

Priority:

### Jump
- Sneak below jump threshold for representative gap.
- Walk and Run produce different jump potential.
- Run > Walk.
- Jump starts from supplied current position, not fixed authored start.
- Air control is capped.
- Invalid/no landing region does not trigger.

### Elevation/collision
- Walking into elevated platform side cannot place player on top.
- Sliding along side still works.
- Valid traversal landing can place player on elevated walkable surface.

### Climb
Where pure/testable:
- bottom entry recognized,
- top entry recognized,
- downward input descends instead of instant detach,
- mantle endpoint is a small ledge offset, not platform-center teleport.

Use Node built-in test runner. No new framework.

## 13. Debug/Test Aids

If useful show:
```text
mode
movement band
speed
airborne horizontal speed
jump/air state
climb/mantle state
FPS
```

Temporary desktop control legend allowed. Keep normal phone view uncluttered.

## 14. Acceptance Criteria

### Desktop controls
- Ctrl no longer sneaks.
- `C + movement` sneaks.
- `Shift + movement` runs.
- Browser shortcuts are not intentionally overridden.

### Ground locomotion preserved
- Touch joystick still works.
- Deadzone/Sneak/Walk/Run remain distinct.
- Ground movement remains smooth.
- Camera remains accepted.
- Dodge remains functional.

### Jump
- No visible snap to authored takeoff.
- Actual current position used.
- Approach velocity affects momentum.
- Run jump is farther/more forceful than Walk where appropriate.
- Sneak does not auto-launch across test gap.
- Jump is more readable/floaty.
- Limited air steering works without free flight/reversal.
- Landing is smooth and preserves sensible momentum.
- Jump remains limited to authored valid opportunities.

### Elevation/collision
- Walking into vertical platform side cannot lift player onto it.
- Brown platform sides are solid.
- Reported left-gap bug is resolved.
- Wall sliding still works.
- Elevated tops usable after valid traversal.

### Climb
- Bottom entry works.
- Upward and downward climb are continuous.
- Top-entry/down climb works.
- Top performs short mantle rather than deep teleport.
- Bottom exits smoothly.
- Only tagged surfaces are climbable.

### Architecture
- One permanent authoritative rAF loop.
- `main.js` remains thin.
- Traversal has one clear owner.
- `playerController.js` is not more monolithic.
- Redundant input API removed.
- Tuning centralized.
- No physics engine/framework.

### Verification
- `npm test` PASS.
- `npm run verify` PASS.
- `npm run zip` PASS.
- Dev and submission builds load.
- No external runtime network requests.
- ZIP <35 MB.
- `docs/BUILD_LOG.md` updated.

## 15. Human Playtest Checklist

### Ground regression
- Movement still smooth?
- Run still brisk?
- Wall sliding still natural?
- Sneak corridor comfortable?

### Jump
Test same gap at different approach speeds:
- Sneak: safely avoid unwanted launch?
- Walk: shorter jump?
- Run: momentum clearly matters?
- Seamless takeoff?
- Readable/floaty airtime?
- Modest trajectory correction?
- Air control not too strong?
- Natural momentum on landing?
- Can you intentionally avoid/fail traversal without teleport?

### Platforms
- Run into every vertical side of both brown platforms.
- Confirm stop/slide rather than rise.
- Confirm valid traversal still reaches top.
- Retest prior left-gap bug.

### Climb
- Enter from bottom and climb up.
- Release halfway: pause.
- Climb down from midway.
- Reach bottom naturally.
- Climb to top and watch mantle.
- From upper platform enter ladder and descend.
- No large forward teleport.
- No instant drop to ground.

### Overall
Record best behavior, worst behavior, bugs, and highest-value 1–2 remaining adjustments.

## 16. Explicit Non-Goals

Do not implement:
- harvesting/resources
- combat/enemies/damage/health
- dodge i-frames/stamina
- manual jump button
- arbitrary freeform jumping everywhere
- general parkour
- climb-every-wall
- fall damage
- swimming
- mounts
- speed progression
- Wildkin/capture
- inventory/XP/skills/equipment
- base/Matter Resonator/waystones
- final art/animation
- physics engine
- multiplayer
- camera rotation

## 17. Agent Stop Condition

This is a refinement pass, not a feature sprint.

Work from the human playtest findings first. Do not start Phase 2.

Do not broadly redesign accepted movement/camera behavior.

Fix reproducible traversal/elevation issues rather than merely changing tuning numbers.

If refinement starts requiring a general physics/platforming system, choose the smallest explicit kinematic/data-authored solution that satisfies this slice.

At the end report:
1. What changed.
2. How jump differs from Phase 1.
3. Exact jump tuning/formula and Walk vs Run behavior.
4. Air-control behavior.
5. Platform-side/elevation correction.
6. Climb-down, top-entry, and mantle behavior.
7. Architecture/module changes.
8. Desktop control changes.
9. Tests/validation results.
10. Exact human checks.
11. Anything deliberately deferred.
12. Confirmation BUILD_LOG.md was updated.
