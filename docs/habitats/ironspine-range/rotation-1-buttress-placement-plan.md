# Ironspine Range rotation 1 — arrival buttress placement plan

**Status: numerical native-preview candidates only.** No runtime source, asset
admission, or collision surface is authorized by this plan. The locked arrival
view is `(-2080,-3160)`, yaw `-2.783`; the selected gully target requires a
readable side edge while retaining its central walking lane and lower iron
approach.

## Candidate pair

| Role | Transform (X, Z, yaw, scale) | Full-hull base Y | Full support span | Minimum hull-to-full-route distance | Numerical result |
| --- | --- | ---: | ---: | ---: | --- |
| west side edge | `(-2085,-3153, +π/2, .65)` | 9.1286 | 0.2545m | 4.5112m | eligible for native preview |
| east side edge | `(-2073,-3152, -π/2, .65)` | 9.6598 | 0.3190m | 1.8311m | eligible for native preview, close to the 1.2m shoulder limit |

These use the accepted shipping `asset_verdant_cliff_buttress`, whose actual
render bounds are 3.068 × 3.828 × 2.020m at unit scale. At `.65`, it is a
medium 2.488m-high edge, not a canyon wall. The yaw transform follows the
existing Three.js landform convention: `x'=x cos(yaw)+z sin(yaw)`,
`z'=-x sin(yaw)+z cos(yaw)`. It therefore preserves the two intended opposing
face directions rather than treating a signed yaw as cosmetic.

The arrival camera’s ground-forward vector from camera to player-facing scene
is approximately `(0.351, 0.936)`. Both anchors are in front under that
precheck: the west candidate is 4.800m forward and 7.139m screen-side; the
east candidate is 9.948m forward and -3.747m screen-side. This is only a
2D camera-side test; it is not a screen-bounds claim. Root’s matching native
preview must check full GLB silhouette, HUD occlusion and the open centre lane.

## Protection and support contract

[buttress-support-probes-r1.json](../../../art/reviews/ironspine-range/rotation-1/buttress-support-probes-r1.json)
records the exact grid scan and both hypotheses. Each candidate samples all 19
transformed convex-hull vertices, three equally spaced samples on every hull
edge, and its origin (77 samples). `baseY` is the sample minimum. The ordinary
free-standing guard remains `span <= .32m`; neither candidate depends on
embedding or a lowered support rule.

Each full transformed hull was checked against all nearby current generated
forage, wildlife home disks, solid canopy/Fen-stone footprints, and every
segment of the frozen 75-node / 485.982m lattice route. Source protection is
owner footprint radius plus the existing 1.2m approach buffer. Home protection
is `max(roamRadius, leashRadius)+1.2m`; route protection is a minimum 1.2m from
the hull boundary. Both candidates report zero source, home, or solid-scenery
conflicts. The west candidate has more route margin; east is deliberately
retained only as the opposing edge needed to test the gully composition.

## Native preview decision boundary

Render exactly this pair at the frozen arrival pose, then reject either form if
its actual GLB bounds enter the useful central play area, its tan Verdant
material reads as an unrelated isolated prop, or either route shoulder changes
under physics. Do not replace a rejection with extra props, generic
`frontierSceneryVisual` use, an unreviewed asset, or terrain widening. If the
pair cannot form the selected continuous grey-gully impression, the appropriate
result is a library/target-fit HOLD pending the separately reviewed structural
plan.

The existing six Terrace rocks and the one fixed Skybreak recipe remain
unchanged. Any future Ironspine implementation needs a separately approved,
bounded landform lifecycle that stages matching transformed hulls and removes
them with their resident chunk.
