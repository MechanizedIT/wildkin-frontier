# Independent R6 executable review — GO

**Reviewed source:** `build-candidate.py` SHA-256 `9f364a91048ae9ee98f699ec8daa1bf4d83055ec719572d42796a2dba32cf984` against frozen parameters SHA-256 `b3d4c5f3b44e0be11bb9c891468562b3b32d2452489215d8cb4aa6a60f5827fd` and the corrected plan review.

**GO for one guarded Blender reconstruction.** Static review confirms the executable hashes the raw PLY, label cache, and parameters before source selection; selects only root `1579`; builds a duplicate from only that component; records its independent edge audit; and applies exactly one literal `.006` voxel modifier. It has no fallback, crop probe, detached-piece move, or export path.

Post-apply auditing uses actual loop triangles and gates finite positions, index validity, boundary/non-manifold/inconsistent shared-edge counts, unused vertices, zero-area/repeated faces, one vertex-edge face-bearing component, signed volume, and the fixed triangle range before rendering. Its seven directions at 512/96/48 render raw and derivative separately using the **same full raw-master AABB** with a 5% orthographic margin and the shared `-2 EV` neutral presentation. The raw source is re-read after saving to assert position/index preservation.

This is source readiness only. It does not prove the modifier’s topology, resource behavior, six-rise visual requirement, or derivative fidelity; those remain the guarded run and independent image review gates.
