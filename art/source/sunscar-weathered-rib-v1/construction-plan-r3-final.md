# Sunscar weathered rib — final R3 construction plan

R3 is the final authorized repair. It replaces the uniform R2 bench profile
with one irregular, connected weathered-rock shell. `geometry-plan-r3-final.json`
contains the only construction input.

Its 12-point rings create two true shelf bands in the exterior, then vary both
shelf depths and heights across seven stations. The left shoulder is broad and
high (1.24 → 1.60 → 1.42m) with a blunt connected end; the lower cap begins at
.93m and narrows/decays to .55m at the opposite blunt termination. This makes
large stratified planes rather than a continuous rectangular rail or roof.

Bridge the same-index rings first. Create two distinct concave end ngons,
triangulate those *existing individual faces* using `bmesh.ops.triangulate`,
then recalculate normals. Never delete cap faces then triangle-fill their
combined disjoint boundaries. For every audit, use `mesh.calc_loop_triangles()`
rather than a manual fan. A BVH overlap is broad-phase only: narrow-phase each
non-adjacent candidate; report cap-adjacent shared-boundary contacts separately
and fail confirmed intersections.

Before any render, prove one closed component, two-face edges, grounded feet,
bounds, normals, cap YZ coverage, and cap-facing opaque pixels. The R3 source
three-quarter must show a thick raised left shoulder, a lower broken long cap,
and bevelled blunt ends. Side/front/rear views must retain deep stepped rock
planes. If any gate fails, preserve HOLD: this is the last asset pass.

## Final pre-builder numeric correction

This final pre-builder copy supersedes R3 only for its lower-shelf coordinates.
`geometry-plan-r3-final.json` now makes each lower shelf outer/inner vertex
exactly **Z=L**; the adjacent front-break is **Z=L+.08**. Thus the long cap
really descends `.93 → .82 → .76 → .66 → .55m`, and the break remains below
`U` at every station (including `.63 < .67m` at the last station). The
previous `.68L` wording was inconsistent with the intended meaningful strata.

Gate order is numeric topology/bounds/normals/coverage/intersection proof,
then one cheap cap-facing opaque-pixel render, then studio comparison renders.
Applicable local Blender guidance is explicitly cited in the JSON:
`.agents/skills/wildkin-asset-forge/references/blender-mcp.md`; its scoped,
reproducible Blender-Python and actual-export inspection rules are adapted here
for bmesh triangulation/recalc and `mesh.calc_loop_triangles()` audits.

Root consistency correction: the builder directly loads the seven arrays of twelve XYZ vertices in `ring.coordinatesXYZ`, using UTF-8. These numbers, not an English formula, are the frozen construction input. The expected closed triangulation is 164 triangles. The old prose-only final draft is preserved separately as rejected.
