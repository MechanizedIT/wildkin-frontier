# Independent full R6 builder source review — HOLD for one gate

**Reviewed source:** `render_full_r6.py` SHA-256 `a48e532e64fc21f7240034a01d1b43ec308034e0fe961c26bf5e34584bd80db1` against the pinned repaired parameters, CPU routine/proof, and R5 shared routine.

The builder correctly imports `build_parts`, pins all reviewed inputs, retains literal CPU geometry, checks pre-Blender topology/bounds/contact records, verifies Blender float32 XYZ and loop-index parity, checks all six actual hoof soles at Z=0, and renders the required seven views at 512/96/48. It does not contain an alternate geometry recipe or export/runtime path.

**Required narrow correction:** before object creation, reject a pinned proof unless `proof["frond_exposure_pass"] is True` (and preferably assert the current pixel threshold record against `parameters["visual_gates"]["frond_min_exposed_pixels_256"]`). The full plan identifies exposed paired fronds as a real Gate-A requirement, but the executable currently requires only `all_contacts`; a structurally connected but hidden pair could therefore render. No parameter or geometry change is needed. Recompute the script hash after adding that one assertion, then it is GO for the one candidate run.

## Final source re-review — GO

**Reviewed final source:** SHA-256 `489e6c71dbed5eff6accb503e297e39c82beee1e2a661393d9a0d538ff327453`.

**GO for the single full candidate run.** The executable now requires both `frond_exposure_pass` and every recorded blade count to meet the pinned positive 256px threshold before Blender object creation. This resolves the only source defect without altering parameters or geometry.
