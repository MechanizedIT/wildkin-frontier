# Sunscar weathered rib — focused R2 construction plan

R2 replaces the held centre-fan detail method. It preserves the 4.4 × 2.1 ×
1.6m envelope, one opaque material, grounded base, and single closed mesh.

The builder constructs seven **11-point cross-section rings** from
`geometry-plan-r2.json`, then bridges corresponding edges. Each ring has two
real shelves: lower shelf indices 2–3 and upper shelf indices 5–6. They share
ring edges with the connecting angled/vertical faces, so both shelves change
the outer silhouette and depth in every view.

The upper shelf makes the broad left shoulder: stations 0–2 are 1.30, 1.60 and
1.46m. The lower shelf is the long cap band: stations 2–6 descend 0.96 to
0.64m. Station 0 remains the shoulder’s blunt continuation; station 6 is a
shorter, lower blunt end. This is intentionally not a roof wedge, fan dimple,
boolean, detached slab, or overlapping primitive.

Bridge all six station intervals first. Create the two ordered 11-edge end
ngons last and triangulate them through `bmesh.ops.triangle_fill`; then recalc
outward normals. The routine audit must prove one component, two-face edges,
grounded indices 0/10, bounds, and no non-adjacent positive-volume BVH overlap.
Cap-adjacent zero-volume pairs may be reported only with shared vertex/edge
classification; otherwise they fail.

Before the builder proceeds, review the exact profile checks in the JSON from
source three-quarter, both side, front, and rear views. After independent plan
approval, this authorizes one focused massing repair only. Export, collider,
placement, and runtime admission remain separate.
