# Trailgloam R3 source-to-plan review

**Decision: HOLD for one precise pre-run aperture fix.** The proposed faceted icosphere shell is an acceptable method amendment for Gate A: its declared `.58 × .50 × .295 m` half-extents preserve the low saucer proportions, and a valence-five head port plus valence-six limb/frond ports is a sound way to use genuine equal-count bridges. This is not a silent change: the source map names it and the R3 source retains the reconciled envelope, axes, six paths, ground-plane hooves, two frond paths, and fail-fast component/manifold/BVH gates.

## Blocking source defect

`ordered_boundary()` deletes only `pivot.link_faces` with `context='FACES_ONLY'`. It leaves the selected pivot vertex in the BMesh with no incident faces/edges. Each of the nine intended ports therefore leaves an isolated vertex, so `component_count()` will fail even if every child bridge is correct. The source-to-plan map's claim that these are real apertures is premature until those pivot vertices are removed.

After deleting the fan faces, delete that exact pivot vertex (without deleting the surviving neighbour cycle), then assert it is invalid/not in `bm.verts`; assert every consecutive neighbour pair is a boundary edge with exactly one shell-side face; and record the selected pivot coordinate/valence for each named `H`, `S_*`, and `F_*` port. Abort before child construction if a selected vertex is not within the declared local aperture neighbourhood of its requested centre. This is a port-construction fix, not a new geometry method.

The remaining source does genuinely differ from R2 in the required ways: it builds head/leg/frond paths, makes `Q` sole vertices at `Z=0`, caps only the intended terminal loops (plus the head face), and derives the final graph/audit from mesh geometry rather than object names. `build_frond()` has changing width/depth sections and an offset half-section ridge, so it is a credible folded-blade construction to judge in the later actual renders. The shell's dark belly rim is not yet a material claim in this neutral source and must not be credited until a later permitted presentation step.

Once the pivot/aperture assertions are corrected, **GO to execute the final R3 Gate-A neutral build**. Its pre-render audit must still prove one component, zero non-two-face edges, no validation repair, outward normals, zero permitted BVH overlaps, reconciled bounds, and sole contact before any capture. This review authorizes neither export, rig, collider, material admission, motion, nor runtime use.

## Final source recheck

**GO to execute the final R3 Gate-A neutral build.** `ordered_boundary()` now deletes the exact isolated pivot after deleting its fan faces, verifies it no longer survives in the BMesh, checks each surviving neighbour edge has one shell-side face, and records selected coordinates, valence, and centre distance. The `.22 m` port-centre tolerance and pre-render audit make a mislocated or invalid 5/6-loop aperture fail before a render. No new method or scope was introduced.
