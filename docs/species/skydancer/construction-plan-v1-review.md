# Skydancer construction plan v1 — independent technical review

## Decision: HOLD before implementation

The literal data hash is correct, the coordinate convention is explicit, the changed bounds fit the frozen authoring envelope, and the closed-profile/wedge method is feasible for native Three.js. The counts are internally consistent: two primary wings, four cover plates, two legs, two feet, and six toes total 376 changed triangles.

Two focused corrections are required before a builder starts:

1. The plan's “complete-face” torso attachment is only an axis-aligned interval test derived from torso-loft extents. A vertex can be inside that box while outside the actual closed torso shell. Replace this with an actual full-root per-vertex shell test (top and bottom ray/inside interval or equivalent triangle intersection against the frozen torso), for both wing root rings and each leg root ring. The later builder audit must use that same actual-shell predicate.
2. Two cover plates per wing leave only three visible wing masses per side when the primary wing is counted. The approved target's readable folded silhouette depends on a layered shoulder-to-tip feather cadence, visibly closer to five plates/masses per side. Add **one** distinct closed, attached mid-cover plate per wing, with a separate overlap/root proof and still inside the frozen envelope. This is a bounded numerical amendment, not a new asset or behavior change.

Keep two wings, two legs, six toes, the existing head/body/beak/eyes/tail, collision, placements, and gameplay unchanged. Reissue the JSON/proof after those two corrections; then a source review may gate the first model build.
