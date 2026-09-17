# Heartwood Basin rotation 1 — visual-director target selection

## Selected reference

`selected.png` is the canonical perceptual reference, copied from `forage-destination-direction.png`. It is the stronger feasible direction because it improves the actual destination pose without replacing the playable center: the berry cluster remains the payoff, a left-hand grounded log/root gives the room an edge, a lower right counter-edge contains it, and the player-facing lane stays broad.

`threshold-interior-direction.png` is retained only for complementary grammar: unequal side masses, shallow banks, and a planted transition into a denser room. Its paired grand canopy gate, dense wall-to-wall foliage, and rock volume are not literal implementation requirements.

## Fitness and pose fidelity

The selected direction retains the actual 412×915 portrait framing, HUD hierarchy, player scale, normal camera direction, and the destination-player pose: `(-12.794783, -83.233994)`, yaw `0`, portrait pitch `0.6283185307` (36°), requested/effective camera distance `11.5910795 m`, and FOV `52°`. The `6.55 m` horizontal and `5 m` height entries are base debug configuration values, not the actual extended portrait displacement. It is therefore a valid destination judge. Arrival and interior stay matched to their frozen baseline poses: arrival `(-3.446514, -46.265858)`, yaw `0`; interior `(-1.1732645, -74.975792)`, yaw `0`. The overhead is diagnostic only, not a target pose.

## Implementable composition brief

1. Keep a generous interaction lane from the destination player position to the existing berry silhouette; do not place solid low forms, trunk collision, or inaccessible decoration in it.
2. Build a shallow left edge from grouped existing trees/lows and terrain articulation, with a low right counter-edge of trail stones, reeds/lilies, and spaced low ecology. The two edges must make a room without closing the return lane.
3. Use grouped, varied low mass at edges and tree bases, with deliberate open floor at the interaction and route center. Do not answer sparse terrain by uniformly enlarging terrain-cover dots.
4. Carry the same unequal-edge rhythm into the interior and arrival so the circuit reads as apron → planted threshold → sheltered berry room, while leaving Camp's approach and existing protected identities unchanged.
5. Test all positions against forage/wildlife clearance, current canopy/collider limits, and the fixed scenery/terrain owner split. The selected target is direction, not authority to change shared foliage, lighting, HUD, ecology, or save behavior.

## Existing-kit correction, possible missing role, and deferred aspirations

The actual kit includes `asset_fallen_log` (2.84 × 1.14 × 2.32 m, 590 triangles), so it can fill the selected reference's left grounded-log edge and is not an asset gap. It also includes a pink clustered heartwood tree and a tall sparse redwood, neither of which independently matches the selected reference's warm, rounded broadleaf perimeter mass. The blockout must use the existing log and grouped current trees first, then judge that canopy silhouette honestly. If the frozen blockout proves that the target-defining perimeter mass still cannot be achieved, the only eligible new role is **one compact rounded broadleaf canopy/tree** with an attached grounded trunk/base; it must enter the packet's separate reviewed small-asset route. Do not postpone that silhouette decision behind more scattered existing-kit placement.

Deferred: literal dense broadleaf forest walls, large multi-tree canopy replacement, new plant families, cinematic depth/haze, major rocks/cliffs, a new berry mechanic, and any change to global cover, lighting, camera, HUD, saves, or wildlife behavior.

## Decision

**PASS for the frozen implementation brief and one bounded structural visit.** This is a target-selection decision only. The measured 208.01 m / 2:15 trace is not yet a successful harvest or the intended 3–5 minute circuit; it remains route evidence to repair and re-prove separately.
