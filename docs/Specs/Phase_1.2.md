# Wildkin Frontier — Phase 1.2: Rapier Character Controller Migration

**Status:** READY TO IMPLEMENT  
**Purpose:** Replace the current hand-rolled player collision/grounding simulation with Rapier 3D's kinematic character controller while preserving the accepted movement feel.

## Why this slice exists

Human testing after Phase 1.1 found persistent failures:
- Falling from elevated geometry can happen instantly rather than under continuous gravity.
- The player can become embedded/stuck in a grey obstacle near the jump platforms.
- Jump landings can visibly sink through the floor and then pop back upward.
- The current implementation now relies on `getGroundHeight`, height-dependent collider activation, timeout landing correction, and `resolveStuckPosition`.

Do not add more special-case height thresholds, stuck resolvers, teleport corrections, or extra ad-hoc foot rays. The current abstraction is the problem.

## Architecture decision

Use **`@dimforge/rapier3d-compat`** and Rapier's **KinematicCharacterController**.

Use a pinned stable package version. At the time this spec was written, current stable is 0.20.0; verify the installed version and record it.

The player remains deliberately controlled:
- position-based kinematic rigid body
- capsule collider
- Rapier character controller computes collision-resolved translation

Wildkin Frontier code still owns:
- Sneak / Walk / Run speeds and input
- acceleration/deceleration
- facing
- dodge
- jump vertical velocity/gravity tuning
- authored auto-jump triggers
- climb/mantle state
- camera

Rapier owns:
- capsule-vs-world collision
- penetration prevention
- sliding
- grounded result
- slopes
- small-step handling
- snap-to-ground
- collision queries

Do **not** use a fully dynamic player rigid body unless the kinematic controller demonstrably cannot satisfy this slice.

Update `AGENTS.md` and `docs/ARCHITECTURE.md` so Rapier is an explicitly approved runtime dependency and the old no-physics-engine rule no longer conflicts.

## Player collider

Use a capsule approximating the rendered character:
- radius roughly 0.30–0.38 units
- total height roughly 0.9–1.1 units

Tune to the actual player mesh. The visual mesh is not authoritative; the Rapier body/collider position is.

Add an optional debug collider visualization if practical.

## Physics module

Create a focused physics layer, e.g.:

```text
src/physics/
  createPhysicsWorld.js
  createCharacterPhysics.js
  physicsDebug.js   # optional
```

Responsibilities:
- `await RAPIER.init()` once
- create Rapier World
- create fixed world colliders
- create player kinematic body + capsule
- create/configure character controller
- expose small explicit APIs
- contain no game-design decisions

Bootstrap must await Rapier before starting the game loop.

Keep exactly one permanent `requestAnimationFrame` loop.

## Fixed timestep

Use a fixed simulation step:

```text
physics dt = 1 / 60 sec
max catch-up substeps = 3–4
```

Use an accumulator in the existing loop or a clearly-owned update layer. Do not create another rAF loop.

Clamp large frame gaps after tab switching.

## Character controller configuration

Centralize tuning.

Starting concepts:

```text
controller skin/offset: ~0.01–0.03
slide: enabled
snap-to-ground: ~0.15–0.25
max slope climb: ~40–50 degrees
autostep max height: ~0.15–0.30
autostep min width: small but nonzero
autostep dynamic bodies: false
```

Requirements:
- tiny steps/terrain lips may autostep
- tall brown boxes must not autostep
- snap-to-ground stabilizes small downward terrain changes without canceling real jumps
- wall sliding remains

Use Rapier's `computedGrounded()` as the primary grounded result.

Do not infer grounded state from player Y.

## World colliders

Replace player-specific custom AABB/height hacks with real fixed Rapier colliders.

For the current playground:
- ground = fixed cuboid
- grey diagnostic blocks/walls = fixed cuboids
- brown low platforms = fixed cuboids
- high climb platform = fixed cuboid
- boundaries = fixed cuboids if needed

Prefer simple collision primitives rather than render-mesh triangle collision.

Keep render geometry and collision geometry explicitly separate but corresponding.

Do not add general trimesh/terrain collision yet.

## Remove obsolete player collision hacks

Once Rapier works, remove or stop using for player movement:

- `getGroundHeight(...)` as grounding authority
- `getCollisionObstaclesForHeight(...)`
- `platformSideColliders`
- `resolveStuckPosition(...)`
- custom `resolveMovement(...)` for the player
- timeout-based forced landings
- X/Z overlap deciding elevated ground ownership

Do not keep two active player collision systems.

## Ground movement

Preserve the accepted movement feel.

Each physics step:

1. Calculate desired horizontal velocity from movement intent.
2. Update vertical velocity based on grounded/airborne state.
3. Form desired translation = velocity × fixedDt.
4. Call Rapier character-controller movement computation for the capsule.
5. Read corrected movement.
6. Apply corrected movement to the kinematic body/collider using the installed Rapier API's recommended method.
7. Step/synchronize the physics world as appropriate.
8. Read `computedGrounded()` and collision results.
9. Sync the Three.js player mesh to the authoritative Rapier position.

Verify exact call order against the installed Rapier version.

## Gravity and falling

Keep explicit vertical velocity.

When airborne:

```text
verticalVelocity += gravity * dt
```

with negative-Y gravity.

When grounded and vertical velocity is downward:

```text
verticalVelocity = 0
```

Walking off a platform must produce a continuous gravity-driven fall. Never instantly set Y to a floor height.

No fall damage yet.

## Landing / floor collision

The swept capsule/controller must prevent the player from penetrating the floor before landing.

Do not wait until the center is below a known floor Y.

Landing is recognized from controller collision/grounding.

On landing:
- zero downward velocity
- preserve reasonable horizontal velocity
- no sink/pop
- no timeout correction

If the capsule hits a ceiling while rising, cancel upward vertical velocity based on collision/blocked translation.

## Jump

Keep:
- authored valid auto-jump opportunities
- Sneak normally does not trigger gap jump
- Run momentum matters
- limited air control
- no jump button

But after takeoff:
- capsule moves through Rapier every physics step
- do not author an exact trajectory
- do not force a landing point
- do not teleport into a landing region
- collision determines actual landing

Authored jump data should mainly determine whether a jump starts and may keep expected/safe landing metadata for design/debugging.

Keep current jump vertical tuning initially (~5.8 u/s initial vertical velocity, ~12 u/s² downward gravity) unless migration requires adjustment. First make collision robust, then tune.

## Dodge

Keep directional dodge.

Dodge translation must pass through the same Rapier character controller so it cannot pass through or embed in obstacles.

No i-frames/stamina/combat logic.

## Climb and mantle

Climbing remains authored; Rapier does not decide what is climbable.

Use explicit climb regions/sensors/data.

While climbing:
- suppress ordinary gravity
- movement is intentional and continuous
- move capsule with collision-resolved translations where practical
- no ground-height reset
- prevent wall/platform penetration
- top-entry should transition to climb path rather than fall instantly

At top:
- short mantle allowed
- mantle must be collision-aware
- no distant fixed-position teleport
- finish at a clear capsule position just beyond ledge

If needed, validate mantle target clearance with a Rapier shape query.

## Required regression tests

### Fall from high platform
1. Climb high platform.
2. Walk off a non-ladder edge.
3. Natural accelerating fall.
4. Clean lower-floor collision.
5. No instant drop.
6. No platform-side embedding.
7. No stuck-resolver push.
8. No floor penetration/pop.

### Grey box
- Run/walk/dodge into grey box from multiple angles.
- Jump/land nearby.
- Never embed.
- Diagonal movement slides.
- No emergency AABB push.

### Jump landing
- Run-jump gap repeatedly.
- Capsule contacts top surface before visible penetration.
- No sink/pop.
- No forced Y correction.
- Test at different render FPS if practical; fixed physics should remain stable.

## Packaging / offline

No CDN or external runtime requests.

Preferred:
- use installed `@dimforge/rapier3d-compat` as source
- vendor the correct browser-compatible Rapier distribution under `/vendor`
- keep Rapier third-party code external to the inlined first-party bundle
- add importmap/build externalization as needed
- compat package's embedded WASM must initialize offline
- include Rapier version/license (Apache-2.0) in `THIRD_PARTY_NOTICES.md`
- validator must still pass
- ZIP must remain <35 MB

Do not guess package internal file paths; inspect package exports and vendor the correct browser-compatible distribution.

## Documentation

Update:
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `THIRD_PARTY_NOTICES.md`
- `README.md` if startup/build commands change
- `docs/BUILD_LOG.md`

Do not change GAME_DESIGN unless gameplay decisions change.

## Tests

Preserve useful input/movement-band tests.

Replace/remove tests asserting obsolete custom collision behavior.

Add pure tests where practical for:
- gravity integration
- grounded vertical-velocity reset
- fixed-step accumulator limits
- jump-start rules
- climb gravity suppression

Do not mock Rapier so heavily that integration tests become meaningless. Browser/manual smoke testing is required for WASM + collision integration.

## Debugging

Add an optional physics debug mode if easy:
- capsule
- world colliders
- grounded true/false
- horizontal speed
- vertical velocity
- physics substeps/FPS

Keep disabled/unobtrusive by default.

## Acceptance criteria

- Rapier initializes offline.
- Player is a kinematic body/capsule controlled through Rapier KinematicCharacterController.
- Old player grounding/collision hacks are no longer authoritative.
- Sneak/Walk/Run feel remains recognizable.
- Camera/touch/desktop controls remain good.
- Wall/box sliding works.
- Tall brown faces cannot be walked up.
- Grey-box embedding is gone.
- Falling from high platform is continuous and gravity-driven.
- Lower-floor landing has no penetration/pop.
- Auto-jump still works and Run momentum matters.
- Air control remains limited.
- Jump landing comes from real collision, not forced target placement.
- Ladder climb up/down works without instant fall.
- Mantle does not deeply teleport.
- One rAF loop remains.
- `npm test`, `npm run verify`, `npm run zip` pass.
- No external network.
- Submission <35 MB.
- Desktop + real phone manual smoke pass.
- BUILD_LOG/ARCHITECTURE/AGENTS updated.

## Non-goals

Do not add:
- harvesting/resources
- combat/enemies/health
- Wildkin
- inventory/XP/skills
- base/Matter Resonator/waystones
- mounts
- fall damage
- swimming
- ragdoll
- full terrain/trimesh system
- second physics engine
- generic parkour
- dynamic-object pushing unless necessary only for a minimal Rapier sanity check

## Stop condition

This is a character-controller migration, not Phase 2.

Make robustness in this order:
1. ordinary ground movement/collision
2. falling/landing
3. jump/dodge integration
4. climb/mantle integration

Do not preserve broken custom collision in parallel with Rapier.

At completion report:
- Rapier package/version
- offline vendoring approach
- body/capsule/controller configuration
- fixed timestep
- grounded/falling logic
- jump/dodge integration
- climb/mantle integration
- custom code removed
- tests/validation
- manual checks
- submission size
- documentation updates
