# Final scenery visual-build profile

Profiled September 13, 2026 with the final cached 5x5 residency fixtures and the production `createFrontierSceneryBuild` memo/filter. Each value is the median of the last three of four Node runs with explicit GC between visual variants. Dummy already-loaded box canopies exercise the external-model clone/dispose path without GLTF I/O. This is CPU preparation evidence, not browser frame telemetry.

| Phase | Dry: 1,102 low / 393 batches / 7 canopies | Lush: 1,925 low / 576 batches / 12 canopies |
| --- | ---: | ---: |
| Cached scenery build/select | 5.1 ms | 7.7 ms |
| Full visual build | 121.5 ms | 120.4 ms |
| Ground acceptance predicate, timed inside full build | 78.1 ms / 672 calls | 78.9 ms / 660 calls |
| Accepted ground Y lookup | 0.7 ms / 640 calls | 0.5 ms / 640 calls |
| Full visual with constant accepted ground | 23.6 ms | 28.1 ms |
| All specs, ground suppressed | 28.3 ms | 35.7 ms |
| Low specs only, ground suppressed | 23.3 ms | 28.1 ms |
| One instance of each of 5 low assets, ground suppressed | 8.9 ms | 6.3 ms |

The placement predicate is the dominant cost: about 65% of the full visual-build wall time, while final ground height lookup is already served by the build memo. The remaining low work is roughly 14-22 ms after subtracting the five unique geometry compilations; this includes instance matrices, 393/576 batch objects, and native bounding boxes/spheres. External canopy cloning contributes about 5-8 ms in this dummy-model harness. Ground matrix/color generation for the accepted 640 clusters is within a few milliseconds of harness noise.

One instrumented predicate run split its inclusive median cost as follows:

| Predicate | Dry | Lush |
| --- | ---: | ---: |
| Route/forage/wildlife clearance | 5.2 ms | 3.6 ms |
| Regional-place exclusion | 1.2 ms | 3.0 ms |
| 0.8 m center-gradient safety | 29.2 ms | 27.9 ms |
| 0.38 m footprint safety, inclusive | 45.9 ms | 52.2 ms |
| of which 9-point land-footprint sampling | 39.5 ms | 45.7 ms |
| of which regional support ring after memo reuse | 4.8 ms | 6.8 ms |

The 0.38 m footprint check is expensive because its nine full terrain samples are also the samples needed by regional height support. A scratch fast path that sampled the continent alone preserved every selected spec, ground matrix, color, and stat, but did **not** improve wall time (dry 105.2→104.3 ms; Lush 111.3→117.9 ms): regional support then had to compute the same full terrain samples. That rules out the tempting coast-only shortcut for these final regional fixtures.

The smallest exact optimization worth considering is local to the existing ground-cover filter: evaluate the 0.38 m ring once as terrain-sample objects and use each sample's `coastDistance` and `height` for both land-footprint and regional support decisions. Thresholds, directions, ordering, accepted clusters, caps, and visuals remain unchanged. The measured second pass is only 5-7 ms, so this is a bounded saving and will not remove a roughly 120 ms rebuild hitch by itself. A larger improvement would require changing when the deterministic 640-cluster recipe is prepared or retained, which is outside this review and should not be introduced as a new cache framework.

Native figures supplied by the gameplay preview remain the authority for rendered work: Lush 111 ms visual build, 48 rendered calls and 214k triangles; dry 191 ms visual build, 40 calls and 140k triangles. The differing native ordering/noise explains why this isolated harness should be used to identify the dominant phase rather than predict an exact device saving.
