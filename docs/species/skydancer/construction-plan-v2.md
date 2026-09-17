# Skydancer construction plan v2

**Status:** revised numerical proposal awaiting separate independent review. V1 and its hash remain preserved. This revision makes no source, bake, runtime, collision, metadata, or gameplay change.

Machine input: `construction-plan-v2.json`, SHA-256 `f0f7f43b6444abd8a0f51af5ac5f9049ae3a659b4db63d512781b9cf76902ee0`. Measured receipt: `art/reviews/skydancer/rotation-1/construction-plan-proof-v2.json`.

V2 retains the accepted two folded wings, two bent legs, two taloned feet, cream torso/head, gold beak, eyes, split tail, and all frozen Skydancer and other-species contracts. It changes only the proposed anatomy geometry. The complete changed envelope remains `x [-.86,.86], y [.035,1.518564], z [-.65,.54]`, inside the frozen authoring envelope.

## Actual shell proof

The former AABB-like intervals are removed as an attachment predicate. The plan contains the actual current `slender_avian_torso` six-sided loft shell as literal vertices and triangles. For every wing root-cap vertex (`host_root_a`, `host_root_b`) and every leg root-cap vertex (`leg_host_root`), a +Y ray through its exact x/z coordinate must return a lower and upper torso-shell hit with `lowerY < vertexY < upperY`. The receipt records all 48 per-vertex results; all pass.

Each primary wing is itself a literal closed five-ring mesh. Every four-vertex root face of each cover plate is checked by a +X ray against that actual primary-wing triangle shell; the x coordinate must be bracketed by `lowerX < vertexX < upperX`. The receipt records all 24 plate-root tests; all pass. This proves a complete buried root face for every plate, rather than an overlap of centers.

## Layer cadence and topology

Each wing now carries **three** closed rooted plates: upper, mid, and lower. The added mid plate is the focused change requested by review; it creates the selected target’s layered folded cadence without extra wings, feathers, or anatomy.

The JSON provides literal section vertices plus executable mesh arrays and triangle order. Profile meshes bridge equal ring indices, cap both ends with explicit centroid fans, and require every edge to have exactly two incident triangles. Plates, feet, and toe wedges use their literal 8 vertices and a 12-triangle closed-wedge index array. V2’s stored closure checks report zero boundary and non-manifold edges for both wings and legs. Builders must repeat closure, normal, shell, plate-root, join, and envelope checks after native BufferGeometry construction.

No builder work is authorized until this V2 plan receives independent approval.
