# Independent continent R3 review

Date: September 13, 2026
Scope: frozen R3 silhouette plus read-only review of the continent source and its immediate terrain, shelf, land-admission, current, and resume contracts. Habitat painting and the later ten-habitat implementation are outside this score.

## Visual judgment

**R3: 8.3/10 — PASS for the silhouette-and-scale slice.** R3 is the strongest candidate. The east-facing gulf reads immediately, the unequal southern arms remain distinct, and the extended northeast headland now has a clear projection and undercut. The remaining HOLD gap is the stepped, blunt west/southwest perimeter and the lower-left arm's shorter, thicker taper compared with the target. It does not justify a fourth coastline round.

This result does not claim that the target's vegetation, rivers, snow, landmarks, or ten habitats exist in gameplay. The runtime still honestly exposes three implemented regional grammars.

## Source and contract review

No new blocking defect was found in the frozen polygon implementation.

- The authored polygon is validated for finite vertices, usable area, nondegenerate edges, and self-intersection before its spatial tables become usable.
- The nearest-edge cell candidates use a conservative edge-AABB lower bound against a whole-cell upper bound. An independent all-edge reference comparison found **0 signed-distance or direction mismatches across 400,000 samples over eight seeds**.
- A separate construction stress check found **0 invalid outlines across 10,000 sequential seeds**. Across 139,929 samples within 160 metres of the coast, every returned direction was unit length and moved monotonically toward increasing coast distance.
- The rounded union cannot cut into the legacy land envelope. Polygon distance and polygon direction come from the same winning edge; the smooth union blends the two field directions with the derivative weights of the same smooth-maximum expression.
- The global sampler cache retains at most four world-owned samplers. Further worlds are sampled without enlarging the cache, so memory remains bounded. Production uses one normalized immutable world descriptor.
- Terrain height, shelf membership, triangle indexing, foliage and content footprints, ocean depth, visual currents, swimming current, and resume candidates all consume the same published coast fields. Empty deep-ocean chunks publish no terrain collider, and corrected resume candidates still pass the ordinary Rapier support and capsule-clearance query.

The root-run focused integration log reports **39/39 passing**, including coast, ocean/swim, companion behavior, bounded discovery/place admission, inspector behavior, and preservation of every current catalog claim through save normalization and reload. The geometry writer separately reported **7/7 focused passing**. These execution results were supplied by the root; this independent review did not rerun them.

Measured evidence records approximately **28.95 km²** of land over the fixed **6 km × 7 km** extent. Conservative land/shelf atlas use including reveal padding is **12,914 / 16,384**, leaving 3,470 entries. The finite catalog contains **86 definitions** (85 groves plus Signal), retains all original 60 IDs, and remains below the 200 persisted-claim cap. Two retained chest heights changed by less than 0.004 m and 0.001 m.

## Consolidated recommendation

Freeze R3 with no required repair. Retain one explicit inherited caveat: when the old harmonic radial envelope wins the union, its `coastDistance = radius(angle) - radius` field keeps the legacy purely radial inland vector. That vector still increases coast distance and returns the player toward land, but it is not always the exact normalized gradient of the harmonic field. In the offshore-current band, the largest sampled difference was about **37 degrees** near the old Camp-side shore. This predates the polygon path and is not a nearest-edge-bin defect.

Use the native shore check as the acceptance evidence for this inherited behavior. If it produces visible along-shore drift or failed coast-contour settling, the smallest later repair is to derive the legacy vector from that legacy field's local gradient and add one Camp-side current-band witness before blending it with the polygon direction. Avoid changing it during this frozen slice solely for mathematical purity because it would alter established legacy-coast current and dressing behavior.

## Closure check

The two scenery expectation updates after the first aggregate are clean and limited to legitimately changed dry-coast selection. The coast fixture now names the four surviving contour assets, retains two supported dry clusters around a central exit of at least 12 metres, verifies the scaled land footprint and slope support of every survivor, and still proves graceful fallback when the Fen stone asset is unavailable. Starter and Skybreak keep their exact prior counts and ID hashes. The expanded coast replaces its stale exact hash with deterministic order, no dense infill, the expected 20-item cap result, and a named newly dry stone whose full scaled footprint is on land. The changes preserve meaningful dry/support, central-exit, asset-availability, starter, and Skybreak proof rather than merely accepting new output.

The root's final native shore witness strengthens acceptance of the inherited current direction: the new peninsula route transitioned WALK to WADE to SWIM, reached 31.76 metres offshore, drifted landward after release, and returned grounded 10.23 metres inland at health 5. Residency remained bounded at 25 terrain chunks and three ocean draws. Literal dry resume changed feet height only by about 2.4e-8 metres and one atlas mask while restoring the earned Camp exactly. This reviewer did not rerun the final aggregate.
