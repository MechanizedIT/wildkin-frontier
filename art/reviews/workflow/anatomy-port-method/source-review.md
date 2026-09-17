# One-port BMesh anatomy method — independent source review

**Decision: HOLD for one pre-render lifetime fix.** The intrinsic annular shell/collar construction is sound and directly avoids R3's ambiguous deleted-fan topology: it has ordered six-loops, reversed bridges, only the two intended caps, a single component/manifold/BVH audit, a 1,000-face cap, and a separate deletion-semantics record. It is correctly scoped to one abstract diagnostic.

`main()` calls `bm.to_mesh(mesh); bm.free()` and then calls `audit(mesh, loops)`. `audit()` dereferences the freed BMesh vertices in `loops['aperture']` to write `v.index`. After `bm.free()`, those `BMVert` references are invalid, so the source can fail after construction instead of reaching the intended audit/render sequence.

Before execution, snapshot the aperture diagnostic data while BMesh is live—preferably six coordinate tuples (and, if needed, `index_update()`-assigned BMesh indices)—then pass that immutable snapshot to `audit()`/metrics. Do not dereference BMesh vertices after `bm.free()`. With that fix, **GO for the one ≤1,000-face abstract probe execution only**. Its resulting metrics and 256 px render still need independent result review; it does not reopen Trailgloam or authorize a creature/export/runtime pass.

## R2 bridge-source recheck

**GO for the one focused abstract R2 execution.** `bridge()` now connects same-index, same-winding rings with `(a[i], a[i+1], b[i+1], b[i])`; this is consistent with `new_ring()`'s increasing angular order and with the supplied 24-vertex/20-face incidence proof (42 edges, zero boundary edges). The aperture snapshot is now captured while the BMesh is live and passed to `audit()` as plain data, so the held lifetime defect is fixed. The annular shell, caps, single-component check, two-face incidence check, BVH overlap check, face cap, and pre-render audit remain present. This only clears the diagnostic probe; actual metrics and the 256px render still require an independent result review.
