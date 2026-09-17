# Skydancer R3 exterior-shingle plan — independent review

## Decision: HOLD — correct and rerun the proof before the final build

The frozen plan hash matches `035490b7a779135cb86d1a618f1d704d8b5a008a942797a4a615ca7cde970b5b`. The geometry direction is appropriate: unchanged R2 wing roots are retained, free plate bodies move `.06/.07/.08 m` outside the primary shell, and the plan stays within the authoring envelope.

The executed raster receipt cannot authorize a build yet.

- Its stated rule requires every exterior plate to meet the 96/512 thresholds in each camera, but the stored counts include zero-pixel far-side plates (`left_mid` in side/three-quarter and symmetric right-mid in mirror views). `occlusion_pass: true` contradicts those counts.
- The checked-in raster script produces only `side` and `threequarter` results, while the receipt also contains `side_mirror` and `threequarter_mirror` rows. The recorded evidence is not reproducible from the supplied script.
- The rasterizes only both wings and plates. It omits the torso/head/body/tail geometry that can occlude the root/body area in the final model, so it does not meet the plan's complete-geometry visibility claim.

A focused proof repair is enough; no geometry redesign is requested. Define the intended near-side visibility rule explicitly (three plates on the camera-facing wing in side and three-quarter, with separate mirrored camera evidence for the opposite wing), rasterize the complete frozen model, emit all four named camera views from the executed script, and make `occlusion_pass` derive from those exact requirements. At 96 px, require each of the three camera-facing plates to exceed the stated two-pixel floor and record the actual counts; current nonzero near-side counts suggest this may be feasible. Re-submit the matching generated proof before R3 build.

## Corrected proof re-review

### Decision: PASS to one final native neutral build

The current plan hash is `0b67e04ba19e6a437fa758730010022aaad973064d118247949f78af88de84ae`, matching the executed proof. The proof repair resolves the prior blockers: the supplied executable emits side, three-quarter, and both mirror views; rasterizes all 27 current native parts with their `matrixWorld` transforms; and derives `occlusion_pass` solely from the explicit camera-facing-wing contract. Plate matrices are identity in the frozen R2 native source, so the literal replacement coordinates share the inspected basis.

All required camera-facing plate counts exceed the stated floors: at 96 px side is `25/17/16`, three-quarter `13/12/12`, with matched mirror evidence; the 512 px values also clear the 20-pixel floor. Far-side zeroes remain correctly recorded as occlusion rather than incorrectly failing the camera-facing visibility rule.

This authorizes exactly one final R3 neutral build. It is not visual admission: the resulting full native captures still decide whether the exterior shingle chain achieves target likeness. No bake or runtime integration follows from this plan gate.
