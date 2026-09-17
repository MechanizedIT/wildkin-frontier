# Ironspine Range rotation 1 — relief feasibility audit

**Status: HOLD. No terrain source pass is authorized.** This is a corrected, full default-world query of a bounded low-relief method, not evidence that all terrain methods have failed.

**Root closure:** the study below is historical. Its `.42` slope threshold was not an authorized relaxation; root retained `.32`. Subsequent footprint searches used the actual smooth mask rather than rejecting an entire ellipse for any protected overlap. They did not establish a useful arrival/interior terrain solution. `relief-plan-debug-audit.json` is a relaxed diagnostic, never admission evidence. No terrain edit resulted. The current limited alternative is one separately planned narrow bank at the arrival, with the two admitted buttresses as fallback; do not restart these terrain searches this visit.

## Corrected executable contract

`.dream-loop/ironspine-relief/full-audit.mjs` is read-only and writes [the numerical audit](../../../art/reviews/ironspine-range/rotation-1/relief-plan-numerical-audit.json). It asserts the recorded arrival camera position `(-2083.2910549614385, 17.02303360892079, -3168.780900818081)` before doing any projection. The prior v1/v2 audit receipts are retained as invalid, wrong-camera/hard-mask evidence and must not be used for admission.

The executable enumerates the actual default-world catalog through `sampleFrontierForageChunk`, `sampleFrontierSceneryChunk`, and `sampleFrontierWildlifeChunk` for all 48 chunks intersecting the union of each recorded pose's 80m search band, the full lobe footprint, and the ordinary home-radius halo. It records all 262 sources, 161 scenery hulls, and 9 homes, with the actual source/scenery footprint rules and `max movement radius + 4.9m` home support radius. The all-74-segment lattice remains a 1.2m protected corridor.

Each proposed lobe is a 9m x 12m 2m-high ellipse. Its final displacement is:

`2 * (1 - (dx/9)^2 - (dz/12)^2)^2 * smoothstep(clamp(clearance/2, 0, 1))`

The same pure masked displacement is used for height, every route slope, and every projected 2m lobe vertex. The recorded monotonic mask samples prove the range stays [0, 1].

## Measured result

Of 90 camera-visible crest samples, only one full-footprint lobe passes the full source/scenery/home/route clearance and matching-pose central-vertex threshold: the destination shoulder at `(-2128, -3027)`. Its peak surviving masked displacement is `1.950922m`; 19 of its sampled 2m terrain vertices land in the destination safe portrait frame. The audit stores base and final projections for every footprint vertex, not only the crest.

The combined final all-74-segment route audit peaks at slope `.3163265313`, below `.42`; no route vertex receives a terrain delta. Arrival and interior have no full-footprint candidate under this fixed 9m x 12m profile after the complete default-world protection query. Therefore the required representative ascent/crown/return sequence is incomplete. Do not make a one-location destination bump appear to solve the target.

## Next gate

An independent reviewer may inspect the executable and audit. A future structural attempt needs a materially different, still fully queried and smoothly masked terrain footprint that supplies arrival and interior evidence, or may begin the separately authorized bounded Ironspine sidewall target-to-plan-to-builder loop. It must retain the resource, home, scenery, route, camera, and terrain-owner constraints.
