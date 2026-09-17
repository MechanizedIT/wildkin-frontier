# Sunscar weathered rib R3 — independent source review

**Status: HOLD before GPU execution.** Script SHA-256 is
`12875a6d2cfd19d85650ba2294ec8356a47bfe6fd414cb271643be98cfd462d4` and it
correctly pins and direct-loads final UTF-8 input
`077016a80c180f55ee6fab77873270cd922af236415e00ae4e62448d4420189a`.
The literal seven-by-twelve ring data, closed side bridge, distinct concave
end faces, `bmesh.ops.triangulate` of those faces, `calc_loop_triangles`,
bounds/ground contact, component/edge checks, and pre-`--execute` stop are
all real code rather than comments. Metrics are written on each explicit
structural failure.

Two small source corrections are required before this final counted R3 runs:

1. The claimed cap-facing opaque-pixel gate only renders two PNGs. It never
   reads either result or fails on transparent/empty/insufficiently covered
   pixels. After each 96px cap render, load the render result or saved image,
   measure alpha/non-background coverage in the expected central area, persist
   the measurements, and call `fail` before studio cameras when either cap
   misses its threshold.
2. The narrow-phase loop skips *every* BVH pair sharing any vertex. That can
   waive a non-adjacent crossing that happens to share a vertex. Skip only
   known topological neighbours sharing an edge (or otherwise run the narrow
   test for single-vertex pairs); persist the tested/waived pair classes.

The existing cap area calculation is acceptable as a triangulation coverage
check because it starts from the two explicit BMesh faces, but it does not
replace either correction above. No geometry or target change is requested.

## Re-review — revised executable source

**PASS to the one final R3 execution.** I verified revised script SHA-256
`dba484a99860b8c3371d39f42468a4054e1fadba822b1b47407c01bf9a59c898`; frozen
geometry input remains `077016a80c180f55ee6fab77873270cd922af236415e00ae4e62448d4420189a`.

The repair is operative. Each transparent 96px cap render is reloaded before
any studio setup, and its alpha is measured in the central 60% frame. The
threshold requires both at least 64 opaque pixels and 1.5% central coverage;
at 96px the former is the effective 4.34% central-frame minimum, which is
meaningful for the intended cap-facing framing and does not accept an empty
or edge-only sliver. Measurements and thresholds are persisted before a
failure can abort the run.

The BVH pass now waives only pairs sharing a complete indexed edge. It sends
single-vertex pairs through the actual edge-plane/barycentric narrow-phase,
records them separately, and fails on confirmed intersections. The method
still treats a contact solely at the shared vertex as a boundary contact, as it
should; it no longer grants that class a blanket waiver. Geometry and source
scope are unchanged. Final mesh/renders remain unreviewed until execution.
