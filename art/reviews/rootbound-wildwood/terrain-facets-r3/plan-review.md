# Independent R3 preview-plan review

**HOLD for one containment correction; then GO for a private native A/B only.** The literal shared-edge lattice, zero outer ring, non-indexed per-triangle color treatment, and renderer-only boundary are a meaningful changed method after R1/R2. The plan correctly withholds route, support, physics, query, persistence, and ecology claims.

The current harness traverses every `frontier_ground` object and immediately calls `toNonIndexed()` plus material cloning, even when the field has zero relief for that mesh. That contradicts the stated two affected chunks and can turn a narrow preview into unnecessary cloned geometry/material work across resident terrain. Before capture, precheck each mesh's world X/Z bounds against the R3 rectangle and clone only intersecting candidate chunks; alternatively determine that it contains nonzero relief before retaining any clone. Record the exact affected chunk count and changed face count.

## Corrected harness — GO for one private A/B

Reviewed `preview-harness.html` SHA-256 `536c12238e5f4ca259c5bcb290fb5e458a7a2f6376efa80f67ebd610c997e5b5`. It bounds-checks translated terrain chunks before cloning, uses the child-realm typed-array constructor for the color buffer, restores on any preview error and on page exit, and records pose/frame data plus affected-chunk counts. The containment correction is complete. Run one restored-baseline/candidate comparison only; the A/B must decide perceptual value and remains outside source integration.
