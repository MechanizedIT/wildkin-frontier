# Sunscar weathered rib V1 — independent R2 massing review

**Decision: HOLD — 3.0/10. One final focused R3 is warranted.** R2 replaces the dimpled wedge with real outer step bands: the high left shoulder and lower long shelf are now visible at 48/96 px. But the result reads as a simple bench/roof extrusion rather than the broad weathered sandstone reference. More seriously, the left and right renders visibly show large dark open-looking end cavities. A two-face edge count and one vertex component do not establish a visually closed or correctly oriented concave end cap.

The four entries called `nonAdjacentPositiveVolumeOverlaps` are **BVH broad-phase candidates only**. The script classifies overlap from triangle AABB spans; it does not run a triangle-triangle narrow-phase test or demonstrate intersection volume. They cannot be claimed as actual self-intersections, but their presence still fails the candidate's own audit and must be resolved or accurately classified before render.

## Final R3 repair packet

Build one final closed, weathered-rib massing from the approved R2 envelope and the same single material; do not add primitives, detached slabs, booleans, or a new method probe.

1. **Close the concave end profiles visibly and prove it before render.** Replace the current opaque `triangle_fill` cap step with an explicit, ordered 2D triangulation of each 11-point concave profile, or an equivalent boundary-respecting cap construction. Assert exactly one boundary loop before capping, cap-triangle winding outward for left/right X directions, cap projected-area coverage equal to the profile polygon without unfilled holes/overlap, and no backface-only workaround. Then run a real triangle-triangle narrow-phase intersection test on non-adjacent BVH candidates; record candidates separately from confirmed intersections. Fail before render if any non-adjacent crossing remains.
2. **Turn the bench rail into one eroded continuous rock body.** Keep the two genuine shelves, but taper and break the front lower shelf over the station sequence so it does not run as a uniform rectangular rail; make the raised left shoulder a thicker, blunt broken mass, then let the upper shelf decay into the lower long cap. Add only a few connected planar fractures at the shoulder and right termination to produce asymmetric weathering. The source three-quarter must show broad stepped rock planes, not a square channel or roof.
3. **Pre-render source gate.** Require bounds/grounding/one component/two-face edges/outward normals, cap coverage, zero confirmed non-adjacent intersections, and a deterministic end-facing render check showing opaque cap pixels across both profile interiors. Inspect the R3 build script against these gates before Blender execution.

If R3 cannot pass both the end-closure proof and the weathered-rock silhouette, preserve this asset as HOLD; the three-pass cap is exhausted.
