# Fungal Hollow — structural plan V3 (focused native-preview repair)

**Status: PROPOSED FOR ONE NATIVE PREVIEW ONLY.** This replaces neither the held V2 report nor any source. It is the single, finite repair authorized after [the V2 native preview](../../../art/reviews/fungal-hollow/rotation-1/v2-preview-review.md) held because the V2 form read only as a small upper/mid-frame patch.

## One terrain form

`near-midframe-return-shoulder` is one continuous, low, terrain-only ellipse:

- center **(-2834, -1294)**; radii **5 m X / 4 m Z**; peak delta **+0.65 m**;
- delta is `0.65 * (1 - n²)²` for `n = hypot((x+2834)/5, (z+1294)/4) < 1`, otherwise zero;
- it intentionally grades the supported return corridor near its final approach. There is no new scenery, asset, ID, cap, source sampling path, or movement rule.

This is deliberately a right/rear shoulder: it leaves the immediate player center open while putting a connected rise beside and ahead of the player, rather than restoring the V2 rear lobe that landed at screen Y 165–245.

## Screen-aware selection

The destination camera is the frozen native receipt: player `(-2826, 14.146509, -1298)`, yaw `2.432966`, pitch `0.628319`, 52° FOV, 412×915. A bounded six-anchor check was limited to the final-return neighborhood after the V2 hold; it evaluated post-delta 2 m mesh vertices, not just a terrain center.

| Local anchor | Post-mesh useful frame coverage | Disposition |
| --- | --- | --- |
| (-2838, -1294) | 2 vertices, X 305–375, Y 267–292 | too slight |
| (-2836, -1294) | 4 vertices, X 237–386, Y 275–359 | narrow |
| (-2834, -1296) | 6 vertices, X 230–401, Y 280–442 | edge-biased |
| **(-2834, -1294)** | **7 vertices, X 162–387, Y 267–393** | **sole proposal** |
| (-2832, -1296) | 8 vertices, X 143–390, Y 286–489 | too close to player lane |
| (-2832, -1294) | 10 vertices, X 77–388, Y 274–433 | crowds lower center |

The chosen 15 affected 2 m vertices include a visible connected sweep from the right/rear into mid-frame. Its peak projects at X 378, Y 267; lower contiguous vertices reach X 162–387, Y 267–393. Root must judge the native preview; these projections are feasibility evidence, not a visual pass.

## Contracts and numerical proof

The [V3 screen proof](../../../art/reviews/fungal-hollow/rotation-1/fungal-structural-plan-v3-proof.json) reports no resource/home exclusion impact, 6 affected route-interior vertices, and 138 rendered 2 m route triangles with maximum slope **0.212974** (none over .32).

The [V3 full-footprint proof](../../../art/reviews/fungal-hollow/rotation-1/fungal-structural-plan-v3-footprint-proof.json) samples both complete 3 m half-width capsules every .5 m longitudinally and laterally, using each point’s 16-direction .32 m footprint. It finds zero introduced failures: approach remains 0/0; return remains 0/0 while its maximum sampled slope rises from .073848 to .208902. All three solid stone supports, all 23 fixed dressing records, four resource supports, and source identities remain unchanged or supported. This numerical evidence does not replace native traversal, persistence, or visual review.

## Retained baseline-only debt

The stricter V2 findings are intentionally carried forward rather than hidden or “fixed” by this proposal: blossom #402 has **1 baseline and 1 final** failure under the 16-angle `.18` support check; the complete 10 m Thorn home has **67 baseline and 67 final** failures, and its 9.68 m player-contained disk has **35 baseline and 35 final** failures. V3 adds zero failures to each. They are inherited baseline debt and prevent any comprehensive support PASS claim.

## Gate

No source change is authorized from this plan. Root should capture this one terrain-only preview, then independent review must establish material visual usefulness before implementation. A hold ends this focused repair; no alternate anchors, dressing pass, or asset lane is implied.
