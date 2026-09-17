# Skydancer construction plan v1

**Status:** numerical construction proposal awaiting independent technical review. It does not admit a model or authorize a source, bake, collision, gameplay, or metadata change.

## Inputs and scope

This plan converts the independently accepted direction in `art/targets/skydancer/rotation-1/skydancer-construction-target-v1.png` and `target-review-v1.md` into literal native Three.js mesh data. Its frozen machine input is [construction-plan-v1.json](construction-plan-v1.json), SHA-256 `089ba6a209a48ba69dd8f8b74f37ffaf26e779409115ca7e1a17001ad477f35b`. The matching measured receipt is `art/reviews/skydancer/rotation-1/construction-plan-proof-v1.json`.

The plan changes only the ten leaf-like wing feathers, two thin legs, and two talon meshes created by `sky3()` in `src/world/wildkinMeshKit.js`. It keeps the cream torso and crested head, gold beak, eye pairs, and the two split turquoise tail ribbons. It also keeps the baked-recipe path, asset ID, all Skydancer metadata and gameplay, collision offset `(0, .45, 0)` and size `(1, .9, 1)`, placements, secret chest, and every other species unchanged.

The authoring envelope is frozen from the actual authoring baseline, not inferred from the art target:

| axis | min | max |
| --- | ---: | ---: |
| x | -1.133993 | 1.133993 |
| y | .015873 | 2.147128 |
| z | -1.670907 | 1.132000 |

The changed literal vertices occupy `x [-.86, .86]`, `y [.035, 1.518564]`, and `z [-.65, .54]`. They therefore fit inside the frozen envelope while leaving the existing head and tail extrema untouched.

## Native geometry method

Use a focused local closed-profile mesh helper alongside the existing native helpers. It takes the literal vertices in the JSON; it must not approximate, rebuild, or infer profiles from the target image. For each same-sided ring sequence, make the ordered side quads and triangulate each as `[a,b,d]`, `[b,c,d]`; cap first and last rings with centroid fans; then calculate normals. The JSON specifies the winding order for every closed 8-vertex wedge, foot, and toe.

Do not use open leaf planes, Boolean cuts, voxel remeshing, or geometry merging. A builder must retain distinct named closed meshes so closure, normal direction, triangle totals, and physical joins remain inspectable.

## Two folded wings

Each wing is one closed six-sided five-section volume: `host_root_a → host_root_b → shoulder_fold → outer_fold → folded_tip`. The right-side values are literal in JSON and the left side is its x mirror. Its section-to-section lengths are `.083066`, `.297489`, `.417253`, and `.311448 m`; fold angles are `7.4987°`, `18.5202°`, and `52.2830°`. Full vertical thicknesses are `.24, .24, .32, .28, .22 m`, and chord depths are `.18, .22, .40, .46, .36 m`.

Each wing also has exactly two closed turquoise/deep-teal cover wedges. Their four-vertex root faces are buried in the primary wing between `host_root_b` and `shoulder_fold`, then extend as overlapping folded plates. This gives the target’s layered wing reading without isolated feather planes or a third wing.

The torso root is verified as a **complete-face** condition. Every vertex of both `host_root_a` and `host_root_b` lies in the conservative occupied torso interval `x [-.20, .20]`, `y [1.18, 1.53]`, `z [-.04, .19]`, derived from the existing six-sided torso loft across the root span. It is deliberately stricter than testing whether the section center touches the torso.

## Two bent legs and taloned feet

Each side uses one closed eight-sided four-section leg: `host_root → knee → ankle → foot_root`. The literal right-side centers are `(.16,.62,.02)`, `(.21,.42,.12)`, `(.18,.19,.20)`, and `(.18,.10,.27)` meters; the left is the x mirror. Segment lengths are `.229129`, `.245357`, and `.114018 m`; the two joint angles are `20.9554°` and `19.9274°`. Full width/depth taper is `(.14,.16)`, `(.12,.14)`, `(.09,.10)`, `(.10,.14) m`.

Each leg connects to one closed grounded foot and three short closed toe wedges. Foot top faces overlap `foot_root`; every toe root face overlaps that foot rather than terminating beside it. The minimum changed y coordinate is `.035 m`, so the foot stays grounded inside the existing authoring lower bound.

For each leg, all eight host-root vertices lie in the conservative occupied torso interval `x [-.24, .24]`, `y [.53, .72]`, `z [-.08, .12]`. This again proves the full attachment face, not a center overlap.

## Required builder evidence

The implementation is admissible to a separate reviewer only after it:

- parses this JSON literally and verifies its SHA-256 before use;
- records closure, components, outward normals, and changed-vertex envelope checks;
- checks full-root face containment and wing/plate, leg/foot, and foot/toe joins;
- compares authoring and baked bounds/triangles after the normal local bake path; and
- supplies neutral front, rear, left, right, top, and three-quarter views plus 48 px and 96 px readability views.

Those views have one concrete purpose each: front proves two wings/two legs; side proves the folded volume and knee/ankle bend; rear proves both wing roots and existing split tail; top catches envelope escape; three-quarter proves overlap and grounding. The target remains direction-only until an independent reviewer accepts those receipts.
