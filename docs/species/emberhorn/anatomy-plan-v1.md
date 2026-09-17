# Emberhorn — measured leg and mane plan

Root-authored proposal for a separate builder and reviewer. The independently
reviewed construction target preserves the existing Emberhorn. Its current
neutral side view exposes four legs with only 0.05 m of depth: the existing
Z-oriented loft helper was supplied nearly identical Z stations while the
intended limb length runs vertically. Do not change that shared helper or the
other species as part of this candidate.

Use the actual vertices in `anatomy-plan-v1.json`, authored in Three.js axes
(Y up, +Z forward). The four existing `heavy_leg` objects receive vertical
eight-point XZ rings at ankle, knee and upper thigh. Their center offsets make
the front knees bend gently back and the rear knees bend forward into the
unchanged hoof positions. Radii vary from 0.13/0.135 m at the ankle to
0.21/0.22 m at the thigh. The mesh must have substantial side-view depth,
closed outward faces, and overlap the unchanged hoof and torso at its ends.
These are proposed dimensions fitted to the actual model and target, not
measurements recovered from the generated sheet.

Replace the fifteen `layered_mane` leaf planes with closed five-profile wedges,
each 0.26 m deep. Their overlapping three rows begin within the torso and form
a compact irregular crest below the unchanged horn tips. The explicit lower
row heights address the currently floating, paper-thin side view. Keep the
same orange/dark material alternation and existing part names. Do not add a
tail, horn pair, armor, rig or new creature behavior.

The rest of `emberhorn3()` stays byte-for-byte behaviorally equivalent: body,
head, ivory chest/muzzle, eyes, horns and hooves keep their geometry, material
values and transforms. Other Wildkin constructors and the shared loft/leaf
helpers stay unchanged. Use a focused local indexed-mesh helper for these two
Emberhorn shapes; no new framework or dependency.

The JSON contains all local limb-ring and mane-wedge XYZ positions. Load it as
UTF-8 and keep its hash in production notes. Bridge matching perimeter vertices,
cap each convex end, compute outward normals and audit actual geometry.
Unlike the sandstone's concave cap, these convex profiles permit a simple
indexed cap fan. Confirm positive signed volume, two-face indexed edges and
actual all-angle joint overlap; an AABB overlap alone does not prove a joint.

Initial visual gate: render the actual code-native mesh in neutral front,
rear, both sides, three-quarter, and 48/96px views matching the baseline.
Four planted volumetric legs and a connected compact crest must read without
changing the characteristic horns or head. Independently judge the result
before a focused repair. No anatomical cutout, floating mane, detached ankle,
new silhouette outside the original envelope by more than 0.01 m, or changed
sibling mesh is acceptable.

The gameplay lane verifies the existing portrait encounter and charge/recovery
read. Preserve territorial behavior, taming window, Cragbreaker, cooldown,
resource ownership, save/companion identity and all existing motion owners.
This plan authorizes no gameplay change. Root owns ordinary browser evidence
and the combined integrated checkpoint; the separate builder owns only this
bounded Emberhorn visual change after independent plan approval.
