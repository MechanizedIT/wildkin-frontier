# Independent postprocess derivative inspector review

## Final re-review — GO

**GO for one serialized future-derivative inspection after its postprocess job exits.** Reviewed revised `inspect_derivative.py` SHA-256 `ba404629ca9b3a22bfddb3ef50e323ce9d73ea4ef1d3f1d9b4cfb9f92ea52da1`; `py_compile` passes.

The three comparison fixes are complete. The script snapshots original imported GLB material slots, per-polygon material indices, and smoothing before it creates display-only matte copies; it restores those originals before saving the inspection blend. Neutral material indices now use bulk `foreach_set`. Before render, it compares all imported world-AABB extrema against the pinned raw Blender frame within a stated 5%-of-max-span tolerance, so an unexpected glTF axis conversion or offset stops the matched comparison. The receipt records that tolerance and restoration.

The final delta also rereads and asserts restored material-slot identity plus per-face smoothing and material-index arrays before saving the display blend, and records imported matrices in its receipt. The source-file hash and geometry fingerprint remain before/after invariants, while host RAM retains its 8 GiB entry and 6 GiB watchdog. Textured treatment means generated base-color content under matte review lighting; neutral treatment is shape-only. Neither alters the GLB source or establishes model admission.

## Historical initial HOLD — superseded

**Decision: HOLD for three focused comparison fixes.** The planned inspector had the right boundary: it pins the GLB hash, uses the retained raw framing bounds, makes a fresh display blend, fingerprints source geometry before/after, records a host 8 GiB entry floor and 6 GiB watchdog, and never writes the GLB. Its textured and neutral treatments are useful complementary reviews.

1. **Restore original imported material slots in the saved display blend.** The script calls `assign_matte_material_copies()` before it snapshots `textured`, so its saved “restored” slots are matte display copies rather than the original imported GLB materials. Snapshot source material slots and per-polygon smooth/material-index arrays immediately after import. Use separate matte copies only for the textured-display treatment, use clay for neutral, then restore the original imported slots/indices/smoothing before saving. Record that distinction in the receipt.
2. **Replace the neutral per-polygon Python assignment with `foreach_set`.** The derivative may approach 60k faces. Set its material indices through a NumPy zero array rather than `for poly in ...`, consistent with the bounded inspection path.
3. **Make raw-frame axis compatibility an executable check.** The GLB must be rendered through cameras derived from the raw PLY’s Blender Z-up frame. Record imported world transforms and world AABB, compare its axis extents/center to the pinned raw bounds with a stated scale-tolerant threshold, and reject an axis permutation or large unexpected offset before rendering. A glTF import that is rotated or otherwise misframed would make the matched views misleading even though source-file hashing succeeds.

After those corrections, a small synthetic imported GLB/material-slot restoration check and `py_compile` are sufficient for one serialized postprocess inspection. The future GLB remains a derivative candidate; successful inspection does not admit topology, scale, rigging, collision, runtime behavior, or saves.
