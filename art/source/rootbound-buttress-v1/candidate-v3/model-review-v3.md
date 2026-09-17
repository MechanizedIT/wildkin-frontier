# Rootbound buttress-canopy anchor v3 — final independent model review

**Scope:** final neutral-model and game-scale review only. No runtime admission is granted.

**Reference:** `../../reference/target-v1.png`
**Candidate GLB SHA-256:** `5e68d51e8b9b983dc16784b4ceecd24515afcbaa8d95a2d58b8cdc77e7c609e6`
**Reviewed evidence:** all `output/renders/{front,rear,left,right,three_quarter,game_48,game_96}.png`, `output/candidate-manifest.json`, `output/collider.json`, and `build_rootbound_buttress_v3.py`.

## Decision: HOLD — 6.0 / 10

V3 is a real structural improvement over v1 and v2. It uses a continuous flared trunk, five ground-reaching wedges, and three visible branch paths; its 5.730 m vertical height and maximum 6.002 m footprint meet the brief. At 48 px and 96 px it is recognizably a tree rather than the earlier starburst or ball-on-sticks form.

It does not meet the 8/10 visual-admission threshold for the approved reference. The actual neutral views show three thin, flat canopy platters, especially clear from both side views, instead of the reference's supported irregular foliage lobes with depth and branch windows. The root wedges improve contact but remain paper-thin pointed plates with dark seams rather than broad grown buttresses, and the narrow straight trunk/short forks do not provide the reference's asymmetric, substantial rooted-tree silhouette. The asset would read as a generic low-poly icon at the intended destination, not the target-defining Rootbound frame.

The 433-triangle / one-material budget is technically appropriate. The source-space collider proposal is explicit about its Y-up conversion, but placement/fitted-collider parity remains a separate runtime gate and does not affect this visual HOLD.

## Three consequential remaining gaps

1. **Canopy depth and porosity fail.** Each crown is a shallow horizontal disk with a hard equatorial edge. The side and three-quarter frames expose a stack of platters rather than three irregular, supported, volumetric foliage lobes with visible fork windows.
2. **Buttress mass is too thin.** Five wedges reach the ground, but their pointed sheet-like profile and dark joins do not read as the reference's broad merged root base from all angles.
3. **The trunk/forks lack the reference's asymmetry and weight.** The silhouette remains a narrow taper with short branch stubs. It does not carry the warm, branching mass needed to support the canopies or frame a near-camera Rootbound room.

## Final status

The candidate loop is exhausted. Retain the reference, editable Blender source, GLB, source-space collider note, and this evidence as a useful held checkpoint; do not integrate v3 or create a fourth candidate in this run. A future explicitly scoped revisit should begin with a different hand-sculpted low-poly massing method: thick root volumes merged into the trunk, then deep irregular canopy shells cut with deliberate windows, judged in side silhouette before detail or export.
