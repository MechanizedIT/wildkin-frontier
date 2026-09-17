# Independent raw PLY inspector source review

## Final re-review — GO after bounded fixes

**GO for one serialized post-generation Blender inspection only.** Reviewed `inspect_raw_ply.py` SHA-256 `ceddf3df83004c78256ee639dff9a0c711d7f1f195b24966b3c2ebc05f909a47` and the updated README.

All prior narrow holds are resolved. Triangle validation and flat-shading assignment now use bulk Blender `foreach_get`/`foreach_set` with NumPy arrays. The large raw model retains vectorized exact edge counts, while the Python connected-component pass is explicitly skipped over 250,000 faces and reported as `not_computed`; it will not create a million-face Python graph. The inspector now rejects any receipt outside the immutable Trailgloam PLY profile/mode/input hash/1.9M-cap contract, as well as count disagreement or float64 coordinates.

I independently ran `py_compile` and the four-vertex binary PLY contract round-trip; both passed. The source retains direct PLY validation, identity/no-merge import, exact float32 XYZ and triangle-loop-order checks, neutral presentation only, the 8 GiB entry floor, and the 6 GiB watchdog. It neither repairs nor exports geometry.

Run it only after the owned TRELLIS parent and every child has exited and the raw PLY/receipt exists. Its output remains a raw-shape observation and diagnostic topology receipt, never a cleanup, model admission, or runtime decision.

## Historical initial HOLD — superseded

The following required corrections applied to the earlier SHA `7575f516a4b5c751387abf43002bd1c61a76afb710eae869b8a3ee24502680c4` review.

**Decision: HOLD for three narrow source corrections.** The intended inspection was sound: it uses the binary validator, requires float32, imports without merge/normalization/reduction, reads positions and triangle indices through NumPy buffers, verifies exact Blender XYZ/loop-index parity, hides the floor for only the underside, and uses an 8 GiB entry floor with a 6 GiB watchdog.

## Required corrections before a future run

1. **Remove the 1.8M-face Python property loops.** `any(len(polygon.vertices) ...)` and the loop assigning `polygon.use_smooth = False` visit every Blender polygon as Python objects. Replace both with bulk `foreach_get("loop_total", ...)` / NumPy validation and `foreach_set("use_smooth", np.zeros(..., dtype=np.bool_))`. This preserves the raw mesh while avoiding the very million-object pressure this inspection is meant to avoid.
2. **Bound the connected-component work.** `raw_diagnostics()` constructs array edge facts acceptably, but its `for a, b, c in indices` union-find loop is 1.8M Python iterations and must not be an unconditional gate. Keep the vectorized boundary/two-use/nonmanifold counts. Either report face-bearing component count as `not_computed` above an explicit face threshold, or replace it with a separately reviewed native/chunked solver. Do not create a huge Python graph or silently call the component result complete.
3. **Bind the inspection to the Trailgloam PLY contract.** In addition to PLY hash/count/scalar, require the generation receipt’s immutable profile identifier and exact input SHA `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff`, and reject any mode other than the PLY-only Trailgloam profile. This prevents a structurally valid but unrelated PLY from receiving this trial’s provenance label.

After those changes, rerun `py_compile` and a small synthetic PLY import/round-trip test. The large raw model then needs only one serialized Blender observation after the TRELLIS parent and children are confirmed exited. This remains an inspection, not a topology admission, cleanup, or runtime asset.
