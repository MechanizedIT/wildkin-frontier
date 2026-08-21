# Wildkin Frontier — Phase 2.1: Harvesting Feel, Correctness & Performance

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 2.1  
**Purpose:** Refine the successful Phase 2 harvesting first pass using human phone/desktop playtest findings. Fix correctness and performance issues first, then perform a bounded game-feel/readability pass. Do not begin Phase 3 combat.

---

## 1. Human Playtest Result

Phase 2's core harvesting concept is accepted:

- Automatic harvesting works.
- Multi-target harvesting works.
- Drops/pickups feel good.
- Movement, running, jumping, falling, climbing, and mantle still work.
- Overall gathering is already somewhat fun.

Phase 2.1 should **not redesign harvesting**. It should remove prototype friction, correctness problems, and likely performance leaks while making the action more readable and satisfying.

---

## 2. Remove Legacy Non-Harvestable Natural Props

The current movement playground still contains Phase 1 decorative trees and natural-looking rock props that are not part of the harvesting system.

Remove those old decorative tree and natural rock props.

Reason:

> The world should not teach the player that some visually similar trees/rocks are harvestable and others are not.

Keep:
- grey diagnostic collision boxes/walls
- brown platforms
- ladder
- jump gap
- precision corridor
- other intentional movement/traversal diagnostics

If removed natural rock props currently contribute Rapier colliders, remove those matching colliders as well. Do not leave invisible collision.

From this phase onward, current tree/rock/fiber-like resource props should originate from the resource system unless intentionally differentiated later.

---

## 3. Harvest Only When Nearly Stationary

Do not allow drive-by harvesting while running or walking past a resource.

Do **not** forcibly stop the player.

Add configurable horizontal-speed gating.

Suggested starting value:

```text
harvestMaxHorizontalSpeed: 0.25 u/s
```

Required behavior:

- Player can approach resources normally.
- Resource halo may communicate proximity only when harvesting could actually begin.
- Automatic swing begins only after player horizontal speed falls below the threshold.
- If player starts moving above the threshold during harvesting, cancel/stop the harvesting cycle promptly and return tool toward idle.
- No harvest impacts while walking/running past nodes.
- JUMP / FALL / DODGE / CLIMB / MANTLE remain incompatible regardless of speed.

Harvesting should become an intentional:

```text
approach → stop → harvest → move on
```

interaction.

---

## 4. Auto Harvest Toggle

Add a compact player preference toggle:

```text
AUTO HARVEST  ON / OFF
```

Recommended location:
- top-left HUD
- inventory will move to top-right

Requirements:

- Default ON.
- Large enough for reliable touch input.
- Clear visual ON/OFF state.
- No persistence required yet.
- Does not cover important game view.
- When OFF:
  - automatic Field Tool swings are disabled,
  - harvest proximity halos are hidden so the established meaning remains accurate.

Architecture:

Keep these concepts separate:

```text
player preference:
autoHarvestEnabled

gameplay permission:
harvestingAllowed
```

Later combat/capture may temporarily suppress harvesting without changing the player's preference.

Do not implement combat/capture suppression yet.

---

## 5. True 3D Harvest Distance

Current Phase 2 eligibility uses X/Z-only distance. Replace it with actual 3D/vector distance.

Use the player's authoritative Rapier position and a consistent resource interaction point.

For each resource type, optionally define:

```text
interactionHeight
```

so the distance is measured to a useful point around the resource body rather than always its base.

Required:

- Ground-level resource behavior remains comfortable.
- Elevated resources require real spatial proximity.
- Standing below the tall-platform tree cannot harvest it.
- Standing beside that tree on top of the platform can harvest it.
- Multi-target works across real 3D distance.

The same eligibility calculation must drive:
- actual targets,
- white proximity halos,
- tests.

Do not create separate halo/impact distance rules.

---

## 6. Depleted Nodes Have No Player Collision

Depleted remnants are visual only in Phase 2.1.

When tree/rock is depleted:

- remove full Rapier collider,
- do **not** create a stump/rubble collider,
- player can walk through the visible remnant,
- restore full collider when the resource respawns.

Remove obsolete remnant-collider config/code if unused.

### Safe respawn

Do not restore a full collider while the player is standing inside the respawning node's future collider volume.

Preferred behavior:

- visual resource may wait briefly to finish respawning until player is clear,
- or remain visually "ready" while collider restoration is delayed,
- but do not teleport/push the player.

Keep solution simple and deterministic.

---

## 7. Increase Resource Visual Scale

Current nodes/chunks are too small from the high-angle mobile camera.

Increase them substantially while preserving traversal space.

Starting visual targets:

```text
Trees:       ~1.6–1.8× current
Rock nodes:  ~1.6–1.9× current
Fiber:       ~1.5–1.8× current
```

Correspondingly enlarge the visible break-off chunks.

Do not simply scale the whole group if that incorrectly scales:
- halo
- respawn ring
- interaction range
- collider position

Prefer clearly controlled visual geometry/group scaling.

Update full tree/rock collider footprints/heights so they reasonably match visible geometry.

Do not make resource clusters impassable.

---

## 8. Increase Pickup and Hit-Fragment Readability

Increase pickup visual size roughly:

```text
~1.4–1.6× current
```

Increase harvesting fragments/particles enough that the impact is readable from the game camera.

The goal is not prettier art. The goal is:

> every harvest hit clearly reads as an event.

Keep particle count bounded.

---

## 9. Field Tool — Wide Sweeping Arc

The current up/down swing should be replaced with a broad harvesting sweep.

Desired motion:

- clear windup
- fast wide arc across player's front/side
- obvious impact phase
- recovery

Use combined yaw / roll / pitch as needed.

The animation should visually support the fact that one swing can hit several surrounding resources.

Do not build skeletal animation.

### Swing trail

Add an inexpensive short-lived swing trail during the strike:

Possible implementation:
- translucent arc/fan geometry,
- several fading tool-head afterimages,
- or similarly cheap procedural visual.

Requirements:
- readable from high camera
- short-lived
- follows sweep direction
- not screen-filling
- mobile-friendly

---

## 10. Tool Whoosh + Bounded Sound Polish

Current sounds are functional but too synthetic/arcade-like.

Do a small polish pass only.

Desired character:

### Tool
- subtle whoosh immediately before impact

### Wood
- dull woody thunk/chop
- less electronic

### Stone
- crisp crack/chip with a short lower-frequency body

### Fiber
- light cut/swipe/swish

### Pickup
- pleasant and quick
- less piercing if repeated rapidly

### Depletion
- stronger than normal hit, but not dramatically louder

Stay:
- procedural,
- local,
- offline

unless a tiny owned/generated local asset is clearly simpler/better.

Do not spend excessive implementation time on audio.

---

## 11. Respawn Timer Only Visible Nearby

The depleted stump/rubble/cut patch remains visible at all distances.

The respawn progress indicator should not.

Add:

```text
respawnIndicatorRadius: ~4.0 units
```

Use true 3D distance.

Behavior:

- player nearby → timer ring fades in
- player leaves radius → timer fades out
- timer continues progressing while invisible
- player returns → current progress appears
- respawn completes → indicator disappears

Do not reset progress based on visibility.

---

## 12. Elevated Pickup / Particle Origins

All pickup and impact effects must spawn relative to the actual resource's world position.

Remove hard-coded global Y positions for resource effects.

Define useful resource-type offsets such as:

```text
dropOriginHeight
impactEffectHeight
```

Then compute:

```text
world spawn Y =
node.state.position.y
+ configured local height
```

Required regression:

- wood from the tree on the tall ladder platform visibly launches from that tree at platform height.
- particles from that tree appear there too.
- future elevated rocks/bushes automatically behave correctly.

---

## 13. Pickup Trajectory — Higher, Shorter Pop

Current drops scatter too far horizontally.

Retune toward a compact high pop.

Suggested starting values:

```text
pickupLaunchSpeed: ~1.8 u/s
pickupLaunchUp:    ~3.3 u/s
```

Acceptable tuning ranges:

```text
horizontal: ~1.5–2.2
vertical:   ~3.0–3.8
```

Desired result:

- pickup visibly pops upward
- short outward scatter
- remains near harvested node
- still has satisfying visible motion before magnetization
- less likely to become unreachable

---

## 14. Collision-Aware Pickup Motion

Pickups must stop passing through world geometry or landing inside inaccessible boxes.

Do **not** turn each pickup into a dynamic Rapier body.

Use lightweight Rapier queries for scripted movement.

Possible approach:

For each movement segment:

```text
current pickup position
→ intended next position
→ raycast or small shape cast
→ move freely if clear
→ stop/deflect/rest if blocked
```

Also use a downward query where necessary to determine valid surface height.

Requirements:

- pickup can rest on elevated brown platform.
- pickup does not assume ground is always world Y=0.
- pickup cannot fly through grey box / brown platform wall.
- pickup should remain on reachable side of obstacle.
- pickup spawned from a node should not instantly collide with the node's own full collider.
  - spawn just outside collider,
  - or filter source collider from query.

Keep behavior simple. Drops are reward visuals, not a full rigid-body gameplay system.

---

## 15. Long-Run Lag / GPU Resource Lifetime

Human testing observed progressively laggy movement after leaving the game running.

This is a must-fix before Phase 2 is locked.

### Known likely issue

Current Phase 2 repeatedly creates new pickup/particle Three.js geometries and materials and removes the meshes without disposing/reusing GPU resources.

Replace this with bounded resource usage.

Preferred:

### Pickups
- shared geometry per resource type
- shared materials where compatible
- small mesh/object pool

### Particles
- shared geometry
- shared materials per color/type where practical
- reusable particle mesh pool

If something is truly destroyed instead of pooled:
- dispose any unique geometry/material correctly.

Never dispose shared resources still in use.

### Bound arrays/lifetimes

Ensure:
- pickup list cannot grow forever,
- particle list cannot grow forever,
- unreachable/resting pickups eventually expire or are capped if not collected,
- pooled inactive objects do not remain in scene visibly.

A reasonable stale-pickup lifetime is acceptable for this prototype if needed.

### Avoid obvious hot-loop churn

While touching the systems:
- reuse temporary vectors where simple,
- avoid unnecessary transient `Set`/`Vector3` creation in 60Hz hot paths,
- do not broadly rewrite working architecture for micro-optimization.

---

## 16. Performance Soak Instrumentation

Add useful temporary debug counters.

At minimum expose/display on demand:

```text
active pickups
pooled pickups
active particles
pooled particles
renderer.info.memory.geometries
renderer.info.memory.textures
FPS
```

Do not clutter normal play; put behind existing debug flag or `window.__game`.

### Soak test

Run continuous/repeated harvesting across multiple respawns for at least several minutes.

After initial pool warm-up:

- geometry/material counts should become approximately stable,
- active/pool counts should remain bounded,
- movement/FPS should not progressively degrade.

If geometry count continuously climbs each respawn cycle, the leak is not fixed.

---

## 17. Inventory HUD — Top-Right Vertical List

Replace current top-center text-heavy inventory badges.

Use a compact Dreamdale-like list:

```text
[wood icon]   12
[stone icon]   7
[fiber icon]  15
```

Location:
- upper-right
- respect phone safe area

Requirements:

- one row per resource
- recognizable small icon based on pickup shape/color
- numeric amount
- no large WOOD / STONE / FIBER labels
- compact
- count bump/pulse remains when collected

Floating +1 feedback may remain if subtle.

If practical, position +1 feedback near the corresponding inventory row rather than always screen-center.

---

## 18. Preserve What Already Works

Do not redesign:

- Tree → Wood
- Rock → Stone
- Fiber → Fiber
- current hit/yield counts unless necessary
- multi-target harvesting
- one Field Tool
- per-hit yield
- visible degradation
- pickup magnet collection
- temporary inventory
- resource respawn times unless needed for testing
- Rapier player controller
- movement
- air control
- jump
- fall
- dodge
- climb/mantle
- camera
- fixed timestep
- single permanent rAF loop
- offline packaging

---

## 19. Explicit Non-Goals

Do not add:

- combat
- hostile creatures
- damage/health
- Wildkin
- capture/bonding
- XP
- skill tree
- tool upgrade screen
- multiple equipped tools
- crafting
- rare resource tiers
- inventory capacity
- persistent inventory
- banking/extraction
- base systems
- Matter Resonator
- waystones
- Phase 3 functionality
- final art pipeline

---

## 20. Tests

Keep existing tests.

Add/refine tests for:

### Harvest eligibility
- full 3D distance used
- vertical separation excludes target
- upper-platform player can harvest upper-platform resource
- speed above harvest threshold blocks auto harvesting
- speed below threshold permits harvesting
- Auto Harvest OFF blocks targets/swings
- Auto Harvest OFF hides halos

### Depletion/collider
- no remnant collider created
- full collider removed on depletion
- respawn collider restoration waits safely if occupied

### Respawn UI
- timer visibility uses player proximity
- progress continues while indicator hidden

### Elevated effects
- pickup origin includes node Y
- particle origin includes node Y

### Pickup motion
- configured horizontal launch reduced
- upward launch increased
- obstacle query prevents representative wall crossing
- elevated-surface query can rest pickup above world ground
- once-only collection remains

### Pooling/performance
- pool reuses objects
- active counts stay bounded
- stale pickup cleanup/cap works

Use lightweight tests. Do not add another framework.

---

## 21. Acceptance Criteria

### Harvesting intent
- Player cannot harvest while running/walking past.
- Stopping near a resource starts auto harvesting.
- Auto Harvest toggle defaults ON.
- OFF prevents harvesting and hides halos.

### Target correctness
- Uses true 3D distance.
- High-platform tree cannot be harvested from below.
- Works normally while beside it on platform.

### World clarity
- Legacy decorative trees and natural rock props removed.
- All visible resource-like current trees/rocks are harvestable.

### Depleted state
- Tree stump / rubble / fiber patch remain visible.
- All depleted remnants are non-solid.
- Respawn restores collider safely.

### Readability/feel
- Resources significantly larger.
- Removable chunks larger/readable.
- Pickups larger.
- Field Tool performs wide sweep.
- Trail/whoosh readable.
- Sound less harsh.

### Respawn indicator
- Visible only near depleted node.
- Progress continues while hidden.

### Elevated drops
- High-platform resource drops originate at high-platform height.
- Particles originate correctly.
- Pickups land/rest on sensible surfaces.

### Pickup collision
- No pickup passes through solid obstacle into unreachable geometry.
- No global ground-height assumption.

### Performance
- Several minutes of repeated harvesting do not progressively degrade movement.
- Geometry/material counts stabilize after pool warm-up.
- Arrays/object counts remain bounded.

### HUD
- Inventory appears as top-right vertical icon + count list.

### Regression
- movement/camera remain accepted
- jump/fall/dodge/climb/mantle remain accepted
- Rapier remains stable
- `npm test` PASS
- `npm run verify` PASS
- `npm run zip` PASS
- submission <35 MB
- offline/no external runtime requests
- BUILD_LOG updated

---

## 22. Required Manual Testing Instructions in Agent Final Response

The agent's final response must keep the technical summary concise but provide detailed player-facing tests.

For each manual test include:

- recognizable setup/location
- exact player action
- expected successful behavior
- visible signs of failure

At minimum provide detailed tests for:

1. Drive-by harvesting.
2. Auto Harvest toggle ON/OFF.
3. High-platform vertical targeting.
4. Depleted stump/rubble collision removal.
5. Elevated pickup/particle origin.
6. Pickup interaction with grey/brown solid geometry.
7. Respawn indicator distance visibility.
8. Wide tool swing/trail/whoosh.
9. Top-right inventory HUD.
10. Long-running 5-minute harvesting soak/performance.
11. Existing jump/fall/dodge/climb traversal regression.

Coordinates/internal IDs may supplement but never replace visual descriptions.

---

## 23. Implementation Priority / Stop Condition

Implement in this order:

1. 3D harvest eligibility.
2. stationary-speed gating.
3. Auto Harvest toggle.
4. depleted collider removal + safe collider respawn.
5. elevated pickup/particle origin.
6. collision-aware world-surface pickup behavior.
7. pooling/resource lifetime + performance soak stability.
8. remove old fake resource props.
9. increase resource/chunk/pickup scale.
10. wide swing/trail.
11. nearby-only respawn timer.
12. compact HUD.
13. bounded audio polish.
14. tests/validation/docs.

Do not start Phase 3.

At completion report:

- correctness fixes
- auto-harvest behavior/toggle
- 3D eligibility method
- collider lifecycle
- pickup world-collision approach
- pooling/performance solution and soak results
- visual scale changes
- swing/trail/audio changes
- HUD changes
- automated verification
- submission size
- detailed manual testing instructions
- BUILD_LOG confirmation
