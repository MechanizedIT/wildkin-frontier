# Sunscar weathered rib — final R3 construction plan

R3 is the final authorized repair. It replaces the uniform R2 bench profile
with one irregular, connected weathered-rock shell. `geometry-plan-r3.json`
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
