# Cinderjaw — measured leg and attached-plate plan

Root-authored initial proposal, pending independent review. The separate builder
may change only four `low_clawed_leg` meshes and twelve `overlap_cara_tile`
meshes in routed `cinder3()`. Use the literal UTF-8 vertices in the adjacent
JSON. They are proposed construction choices fitted to the reviewed target and
actual mesh, not recovered dimensions from the perspective sheet.

The old legs have only 0.02m of longitudinal separation: the shared Z loft was
used for a vertical limb. The new legs are closed eight-point rings, running
from ankle through bent knee to buried upper thigh. Front limb stations are
approximately Y0.095/0.30/0.51, Z0.41/0.19/0.27; rear stations are
Y0.095/0.27/0.44, Z-0.42/-0.62/-0.52. Side offsets and full radii are in the
JSON. The front direction changes 74.17 degrees at the knee; rear 84.28.
These are short planted reptile limbs, with a visible backward knee and broad
upper attachment. The middle cross-section is perpendicular to the overall
ankle-to-thigh tangent. End rings are horizontal for claw and torso overlap.
The ankle overlaps each unchanged cream claw; the upper cap enters the actual
retained torso. Preserve the claw centers, body height and low crouched stance.

For the dorsal repair, retain twelve pieces and the same three-row/four-column
material rhythm. Each piece becomes a closed low pentagonal plate: five base
vertices sit 0.035m inside the measured torso surface, while its apex clears
the actual skin by 0.185m on the middle columns or 0.135m on the outer columns.
Sixty base rays and twelve apex rays store actual triangle hits and normals.
The full measured attachment footprint is required, not just a guessed center
height. This is restrained armour; do not reproduce the sheet's extra forms.
The routed current species has no flame horns. Preserve the existing skull,
jaw, four claws, eyes and tail exactly; do not revive unused `cinder2()` parts.

## Construction method and tool guidance

Use a Cinderjaw-local direct BufferGeometry recipe, preserving the code-native
runtime. Read the project modeling-director and native asset-forge contracts.
The pinned RobLe3 Blender modeling guidance contributes explicit axis meaning,
deliberate overlap at attachments, and direct mesh control for precise topology.
Here these operations map to Three.js vertex/index arrays, without Blender,
sculpting, remesh, materials, or a format migration. The installed vendored
BufferGeometry/Float32BufferAttribute API and the prior closed Emberhorn recipe
are available examples; do not change or call the Emberhorn-specific helper.
No new dependency or GPU run is necessary for this small native repair.

Connect corresponding leg rings with consistent triangles and close each convex
end ring separately. Each limb has 24 vertices and 44 triangles. For a plate,
connect its five base edges to its apex and close its convex base with three
triangles: six vertices, eight triangles. Check actual indexed faces, positive
signed volume, nonzero triangles, one component and exactly two incident faces
per edge. The base's nonplanar skin-following polygon still has a convex XZ
projection, so its fan must remain entirely inside that projection. Never
combine disconnected loops into one cap.

## Frozen input and evidence gates

Before implementation, freeze the approved JSON SHA and record it in the
candidate source receipt. Builder consumes the arrays rather than retyping
prose formulas. Preserve earlier input versions. Material topology/shape
deviations require independent re-review before execution.

The complete changed-part bounds are computed in JSON and fit inside the
actual baseline envelope (approximately 1.56W x1.23H x3.29L). Keep the unchanged
parts inside that envelope too; whole-model height may shrink when the floating
plates are seated. Budget at most 1,000 triangles and 28 meshes. Baseline is
740 triangles/28 meshes. No collider, identity, rusher behavior, placement,
motion, persistence, or species utility changes.

| Visible requirement | Construction | Review evidence / failure |
| --- | --- | --- |
| Four substantial legs | Bent eight-point sections, 0.23–0.38m transverse width | Both sides and front/rear; fail blade appearance or straight thin rods |
| Supported planted stance | Ankle/claw overlap, upper cap inside torso | Side and underside/contact measurements; fail daylight at either attachment |
| Seated low plates | Actual skin rays at all base vertices and apex | Side, rear, top; fail floating shelf or invisible buried crest |
| Existing Cinderjaw identity | Exact unchanged components/materials | 48/96px and three-quarter; fail altered skull, jaw, tail or new horns |
| Stable siblings | Exact snapshots by part name and occurrence | All six other code-native species exact |

Separate builder produces initial massing and geometry receipt. Root captures
the same neutral views and 48/96px images; independent reviewer judges them
against the baseline and selected target. One initial candidate plus two
focused repairs maximum, stop early on PASS. Only after neutral retention does
root prove the ordinary portrait rusher encounter and integrated checkpoint.
