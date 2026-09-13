# Foliage overlap repair review

**Verdict: PASS.** Reviewed `src/world/frontierChunkRuntime.js` at SHA-256 `439fb5a50851d71bdaf81e30e67cdac230cf65ab1a3e5c73b0aafabbca7fa71b`, its focused consumer diff, and `terrain-consumer-regression.md`. No source blocker found.

- The forage neighborhood is a function-local array created lazily at the first eligible candidate and released when that one chunk resident finishes construction. It adds no runtime-lived cache, per-frame query, or residency lifecycle owner.
- The 3×3 chunk lookup fully encloses any forage capable of reaching a candidate in the center 50 m chunk. Clearance uses the measured grass geometry maximum XZ vertex norm `0.6678251760362262`, multiplied once by the final uniform grass scale.
- Resource envelopes use the same base radii as ecology and multiply the resource scale once. Crystal `1.3` and iron `0.93` match their collision-box XZ half-diagonals (about `1.296 m` and `0.927 m`); berry `1.29` and generic tree/rock/fiber `1.35/.9/.55` match the established ecology envelopes. Asset identity takes priority over generic resource type, so admitted mineral geometry is not undersized.
- The new rejection path requires exact full regional influence, at least 40 m coast distance, and a non-Skybreak point. Starter/reserve and partial ecotones do not enter it; coast and authored Skybreak keep their previous placement and scale branches. Shelf fronds remain on the Skybreak path.
- The focused proof covers the real ecotone overlap witness, the fully influenced Rootbound approach, reserve-edge scale blending, near-shore legacy scale, Lush cache and stone clearance, and existing Skybreak support/lifecycle tests. Counts changed only where newly overlapping grass was rejected.

No source edit or additional test run was performed for this review.
