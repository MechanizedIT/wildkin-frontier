# Wildkin Frontier — Phase 2.2: Harvesting Juice & Final Bug Fixes

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 2.2  
**Purpose:** Fix the remaining pickup-collision bugs and make harvesting visually/audio-readably satisfying enough to lock Phase 2. This is the final harvesting refinement before Phase 3.

## 1. Human Playtest Findings

Authoritative findings:

1. Pickups appear to collide with the harvestable they spawned from.
2. Pickups appear to collide with the player during magnetization, creating trailing/repeated-follow behavior.
3. The Field Tool still reads as an up/down chop, not a broad side-to-side sweep.
4. The trail is not visibly readable.
5. The whoosh is not audible.
6. Tree-hit audio is barely audible.
7. Pickup items should be much larger.
8. The Field Tool should be much larger and more cartoonishly emphasized.
9. Tree trunk/canopy proportions are wrong: trunk reads like a tall log.
10. Other Phase 2.1 behavior generally tested well.

Do not redesign the harvesting loop.

## 2. Fix Pickup Source-Collider Interaction

Current code intends to spawn outside the source collider, but the final radial offset can still place the pickup inside it.

Required:

- Compute a true radial spawn clearance:
  `source collider horizontal extent + pickup radius + margin`.
- Do not multiply the final clearance back below the collider boundary.
- For non-solid fiber, use a small radial offset.
- Store the source collider handle/reference on the pickup.
- During LAUNCHED collision queries, exclude the source collider.
- Still collide with unrelated solid world/resource geometry.
- Use Rapier query filtering supported by installed 0.20.0 rather than globally disabling colliders.

## 3. Ignore Player Collider During Magnetization

The player is the pickup destination, not an obstacle.

Pass/expose the player collider or handle to the pickup system.

During MAGNETIZING:

- exclude the player's capsule from ray/shape queries,
- exclude the original source collider,
- retain unrelated wall/platform blocking,
- collect once inside collection radius,
- once collected, immediately hide/release/repool it,
- a collected pickup must never transition back to RESTING/MAGNETIZING.

Expected:
`RESTING → MAGNETIZING → COLLECTED → pooled`

No oscillation or trailing behind the player.

## 4. Make Pickups Chunky

Increase visible pickup dimensions roughly 1.8–2.0× Phase 2.1.

Starting targets:

- wood cube: ~0.40–0.44
- stone radius: ~0.30–0.34
- fiber radius: ~0.27–0.30
- glow scaled proportionally

Update spawn clearance, rest height, collection radius/query radius as needed.

Pickups are rewards and should be intentionally oversized/cartoonish.

## 5. Make the Field Tool Hero-Sized

Increase visible tool dimensions roughly 1.7–2.0× current.

Desired:
- long readable handle,
- chunky multifunction head,
- exaggerated wedge/blade,
- visible accent/glow.

Adjust pivot/idle pose to avoid severe clipping.

## 6. Replace Swing With a Truly Horizontal Sweep

The current swing technically changes yaw/pitch/roll but still reads as vertical.

Dominant motion must be around the player's vertical Y axis.

Starting direction:

- yaw windup: about -1.1 to -1.4 rad
- yaw follow-through: about +1.1 to +1.4 rad
- total yaw sweep at least ~2.0 rad
- pitch/roll secondary

Orient the tool so the head extends outward from the player during strike.

A nested `swingPivot` + `toolMount` is acceptable.

Human visual test:
> From the normal camera, the head clearly travels sideways across/around the player, rather than primarily up and down.

Do not claim success based only on nonzero yaw numbers.

## 7. Make the Trail Show Previous Positions

Current trail is parented to the moving tool and does not clearly preserve the tool's past path.

Replace/refine with either:

### Option A — player-space slash arc
A translucent curved slash/sector centered around player/swing pivot, aligned to horizontal sweep.

### Option B — real afterimages
Sample 3–5 previous tool-head transforms and render ghosts at historical player/world-space transforms.

Requirements:
- not collapsed into current tool transform,
- cyan/white-blue,
- peak opacity ~0.35–0.55,
- visible ~0.15–0.25 sec,
- obvious from standard camera,
- inexpensive.

## 8. Make Whoosh Audible on Phone

Phase 2.1 whoosh is too quiet.

Use stronger phone-reproducible mid-frequency content:
- emphasize roughly 600–1800 Hz,
- filtered noise preferred,
- optional pitched layer underneath,
- trigger ~80–140 ms before impact,
- clearly audible but quieter than impact.

Starting gains may be roughly 2–3× current whoosh layers if needed.

## 9. Make Tree Impact Audible on Phone

Current wood hit relies too heavily on low frequencies.

Layer:
- attack transient around ~250–500 Hz,
- body around ~100–180 Hz,
- optional subtle woody click around ~600–900 Hz.

Raise ordinary wood-hit gain enough to be unmistakable on phone speakers while remaining duller/warmer than stone.

Keep final depletion stronger.

## 10. Fix Tree Proportions

Current trunk is ~1.45 units tall and reads as a log.

Redesign tree silhouette:

- trunk visible height ~0.85–1.0
- trunk center Y ~0.43–0.50
- thicker base/trunk
- foliage starts around ~0.65–0.80
- canopy centers mostly ~0.9–1.45
- canopy broader horizontally
- total tree stays large/readable

Update:
- trunk-focused collider,
- interaction/drop/effect heights if needed,
- stump proportions if necessary.

Goal: compact chunky stylized tree, not pole/log.

## 11. Preserve Accepted Phase 2.1 Behavior

Do not regress:

- stationary harvest speed gate
- Auto Harvest ON/OFF
- true 3D eligibility
- elevated tree cannot harvest from below
- multi-target
- depleted remnants non-solid
- safe collider restoration
- nearby-only respawn indicator
- elevated drop/particle origins
- higher/shorter pickup arc
- pooling/performance stability
- fake resource props removed
- top-right inventory HUD
- movement/jump/fall/dodge/climb/mantle/camera
- Rapier character physics
- fixed timestep/single rAF
- offline submission compliance

## 12. Tests

Preserve all existing tests.

Add/update:

### Pickup filtering
- spawn position is outside source collider + pickup radius/margin
- pickup stores source collider handle
- launched query excludes source collider
- magnet query excludes player collider
- collected pickup cannot re-enter RESTING/MAGNETIZING
- unrelated wall still blocks pickup

### Pickup scale
- dimensions meet new minimums
- rest/spawn/collection values account for new size

### Swing
- total yaw sweep >= ~2.0 rad
- dominant configured sweep is yaw
- trail uses previous transforms or player-space arc rather than moving only with current tool
- whoosh fires once before impact

### Tree/audio
- trunk shorter than Phase 2.1
- foliage starts lower
- collider remains sensible
- audio routing/config exists; manual phone audibility is required

## 13. Acceptance Criteria

### Pickups
- no source-node sticking/jitter
- player capsule does not block magnetization
- no trailing/oscillating pickup after collection
- unrelated obstacles still block pickup flight
- pickups are roughly twice as visually prominent

### Tool
- tool is dramatically larger/readable
- standard camera clearly shows broad side-to-side sweep
- trail plainly shows the sweep path
- whoosh clearly audible on phone

### Tree
- every tree hit clearly audible
- shorter/lower trunk
- broad low canopy
- tree remains large/chunky

### Regression
- accepted Phase 2.1 behavior preserved
- performance still stable
- `npm test`, `npm run verify`, `npm run zip` PASS
- offline/self-contained
- ZIP <35 MB
- BUILD_LOG updated

## 14. Required Manual Tests in Final Response

For each test give setup, exact action, expected behavior, and failure signs.

At minimum:

1. **Pickup source collision** — harvest a tree and verify wood drops begin outside trunk and never stick/jitter against it.
2. **Pickup/player collision** — leave drops resting, enter magnet range while walking; they should smoothly collect once and disappear, never trail behind after count increments.
3. **Wide sweep** — standard camera must show obvious left↔right arc, not up/down chop.
4. **Trail** — visible short slash/afterimages that preserve prior path.
5. **Audio on actual phone speaker** — audible whoosh before impact and clearly audible wood hit every strike.
6. **Scale** — tool and pickups intentionally oversized/cartoonish.
7. **Tree proportions** — short trunk, broad low canopy.
8. **Regression** — Auto Harvest, stationary gate, 3D targeting, elevated drops, respawn, HUD, traversal.

## 15. Stop Condition

This should be the final Phase 2 harvesting refinement unless a serious bug remains.

Priority:
1. pickup source/player collision filtering
2. pickup size
3. true horizontal wide swing
4. visible historical trail
5. audible whoosh/wood impact
6. larger Field Tool
7. tree proportions
8. regression/tests/build/docs

Do not add combat, progression, tool upgrades, crafting, new resources, Wildkin, or Phase 3 systems.
