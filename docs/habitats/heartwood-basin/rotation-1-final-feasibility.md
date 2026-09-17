# Heartwood Basin rotation 1 — final R3 feasibility

**Decision: HOLD — do not spend the final repair pass.** The independent R2 finding is correct that the berry frame needs a closer left edge and a lower-right counter-edge. The frozen source, protected support geometry, and actual locked-camera projections show that the only way to make either change consequential would either enter a protected resource approach or repeat the same low, distant placement method that R2 already proved insufficient. This visit closes at R2 HOLD rather than claiming a cosmetic pass.

## Evidence checked

- Actual R2 destination capture: `art/reviews/heartwood-basin/rotation-1/r2-destination.png`. The log is present at the far left, the player remains surrounded by pale floor, and the right-side marks do not form a room edge.
- Locked destination pose from `art/targets/heartwood-basin/concepts/implementation-brief.md`: player `(-12.794783, -83.233994)`, yaw `0`, pitch `36°`, effective distance `11.5910795 m`, FOV `52°`, 412×915 portrait HUD.
- Full transformed-mesh receipt: `art/reviews/heartwood-basin/rotation-1/repair-asset-projections.json`. The existing log at `(-16,-90)` occupies `x -32.0..97.4, y 200.2..273.9`; the visible right pieces occupy only upper/right fragments (stones `x 280.8..371.8, y 201.0..230.4`; reed `x 346.3..401.7, y 80.2..183.8`). This is the observed remote, uncontained frame, not an untested projection.
- Source protections: `src/world/frontierHeartwood.js` keeps the berry witness `(-16.718,-85.94)` level in a `3.95 m` disk with a further `1.8 m` fade, and `tests/frontierTerrain.test.js` asserts these resource supports remain level. `src/world/frontierScenery.js` keeps ordinary low scenery at least `3.2 m` from forage, with route and full-footprint checks still mandatory.

## Why the proposed closer edge is not feasible

The existing log center is only `4.12 m` from `(-16.718,-85.94)`. It is legal because it remains outside the `3.2 m` scenery-forage clearance, but moving it forward toward the player reaches that clearance at approximately `z = -89.06` (at its current x). The visible, player-adjacent left-bank region around `z ≈ -86` is inside both that scenery exclusion and the resource's level-support disk. A left bank placed farther west stays off-frame: the locked-camera probe at `(-18.795,-89.234)` projects its one-metre top to `x -144, y 222`; it cannot close the player-facing room.

The retained right bank is centered at `(-8,-91.8)` with only `0.52 m` raw height. Its close, lower-right continuation is attenuated by the protected support around `(-13.916,-83.928)` before it can become a useful bank; raising or spreading it would need a new terrain shape in the same protected/feathered area. Its already admitted low forms are the right-side fragments listed above. Adding more of those forms at the same supported distance would repeat R2's dispersed-mark result rather than make a structural edge.

The R2 plan's unadmitted proposed left reed/lily at `(-16.4,-91.8)` and `(-15.6,-92.8)` are absent from the frozen `HEARTWOOD_CIRCUIT`; they cannot be treated as an available clustered left bank. The admitted source has only the log on that side. The held broadleaf remains unavailable, and no new asset, resource relocation, collider/clearance change, cap increase, or camera change is authorized.

## Closure

No source change is recommended for R3. Preserve the current R2 ordinary-route work and all protected gameplay identities. A later rotation may reopen Heartwood only with a changed premise that can satisfy the full support and camera-projection checks before implementation; this visit has no safe, consequential existing-kit repair left.
