# Unity U4C3 — Topology-safe Surface Nets

**PASS within the documented qualification scope after independent read-only review.** The U4C2 fine-resolution defects came from using one dual vertex for every active cell even when the sampled isosurface crossed that cell in separate patches. The repair classifies crossing-edge connectivity from scalar values on the cell's bilinear faces and gives each connected patch its own vertex.

## Result

The two preserved U4C2 failures are manifold after the change. B / seed 4102 / 0.0625 m changes from 5,943 vertices / 11,884 triangles with one four-use edge (`703F91CF39020A4F`) to 5,944 / 11,884 with a closed connected manifold (`5744C5B42A230E0F`). C / seed 4103 / 0.125 m changes from 1,393 / 2,784 with one four-use edge (`D8596BFDA2B48BCE`) to 1,394 / 2,784 with a closed connected manifold (`FA4FA04EE35A8BC9`). Both still have zero skipped degenerate triangles. Their source hashes, sample counts, occupied counts, and source-to-field and reconstructed-to-source error summaries remain unchanged.

All 12 U4C2 true-SDF matrix rows now validate as closed connected manifolds. The clipped B / 0.125 m control remains separate and unchanged. The A / 0.25 m ordinary reference retains its original mesh hash and counts. See [`u4c3-matrix.json`](matrix/u4c3-matrix.json), the original detailed U4C2 receipt, and the before/after diagnostics below.

## Topology change

The classifier treats sign-changing cube edges as graph nodes. Faces with two crossings connect those crossings. Checkerboard faces use the bilinear saddle/asymptotic decision from all four scalar values; a scale-relative near tie deterministically connects the positive-solid phase. This preserves the same decision for a shared face seen from either cell orientation.

Each connected crossing-edge component owns one Surface Nets vertex. Its Hermite average, normal and material weights use only that component's crossings. During quad emission, each incident cell looks up the component containing the specific primal crossing edge. The global stitch key is `(global cell address, 12-bit crossing-edge component mask)`, so separate patches remain separate while duplicate halo observations agree. Ordinary one-patch cells keep the existing single-vertex behavior. Dual Contouring and the true-SDF sampler are unchanged.

For B, cell `[-5,32,10]` with sign mask `0x7B` has crossing mask `0xCC6`, split into component masks `0x406` and `0x8C0`; its neighbor `[-5,33,10]` (`0x21`) remains one patch (`0x339`). For C, cell `[1,8,-6]` (`0xF5`) has crossing mask `0xA0F`, split into `0x203` and `0x80C`; its neighbor `[1,8,-7]` (`0x50`) remains one patch (`0x5F0`). Each repair adds exactly one vertex and leaves triangle count and scalar inputs unchanged.

The before snapshots include the original crossing sample edges, four incident triangles, raw nearby densities and sign masks. The after snapshots include component masks and per-case manifold results: [`B diagnostics`](diagnostics/B-0.0625-ambiguity.json), [`C diagnostics`](diagnostics/C-0.125-ambiguity.json), and the unchanged combined original baseline record [`baseline-ambiguities.json`](diagnostics/baseline-ambiguities.json).

## Verification

- Classifier covers all 256 sign masks under 48 signed cube orientations; value-sensitive saddle and near-tie tests pass. A named regression also exposes a known unsupported trilinear interior-connectivity case.
- A deterministic 96-seed noisy scalar-field stress test stays closed and manifold.
- The ambiguous-cell brick-seam test confirms identical component keys across overlapping captures, complete crossing-edge mapping, no duplicate faces, and no patch weld.
- The full U4C2 matrix remains manifold at all 12 source/resolution rows with unchanged source/SDF fidelity metrics.
- Matched neutral captures show no visible change at these views: [`B before`](before-after/B-0.0625-before.png) / [`B after`](before-after/B-0.0625-after.png), [`C before`](before-after/C-0.125-before.png) / [`C after`](before-after/C-0.125-after.png), and [`A after`](before-after/A-0.25-after.png).
- Focused topology tests: 5/5; `MatterMesherTests`: 23/23; `SourceMeshFidelityTests`: 37/37, including B/C regressions and the 12-row matrix; full EditMode: 143/143; PlayMode: 2/2. The full EditMode suite was rerun after adding the interior-limit regression. Compact summaries are in [`tests/`](tests/).
- A warm single Editor matrix observation recorded A / 0.25 m at 104.8 ms versus U4C2's 147.2 ms, B / 0.0625 m at 915.2 ms versus 961.8 ms, and C / 0.125 m at 239.3 ms versus 333.8 ms. These are single-run observations, not medians or a production performance budget. Final B cold Windows Player sampling/meshing was 4,955/1,069 ms; Editor and player timings are separate.
- Final Windows x64 Development Build succeeded in 56.8 seconds with zero errors and two warnings (missing optional RuntimePipelineConfig and the shader's D3D12 renderer pragma). The rebuilt B / 0.0625 m Player exited 0, rendered without pink/missing-shader presentation, and reported 5,944 vertices, 11,884 triangles, one multi-patch cell, 28,481 mapped crossing edges, zero missing mappings, zero degenerate triangles, and a valid manifold. Its cold sampling/meshing times were 4,955/1,069 ms. The runtime image and JSON receipt are in [`tests/`](tests/).

## Limits and disposition

This phase resolves the recorded B/C face-saddle cases using a generic scalar-topology rule; it does not implement a full MC33 catalog or a trilinear interior critical-point decider. The named limit regression uses corner densities `(1, -0.1, -0.1, -0.1, -0.1, -0.1, 1, -0.1)`: all faces are non-checkerboard, the classifier returns two boundary components, while the trilinear field remains positive along the body diagonal, including its center. This demonstrates that the face-only partition can differ from interior trilinear connectedness; separate closed shells may still result. B/C do not require this interior decision. Therefore this evidence does not establish arbitrary scalar-field topology safety.

The finite exact regressions, all recorded matrix rows, exhaustive sign masks, cube orientations, seam case, and fixed-seed stress set pass; they are not a mathematical proof for every trilinear field. The qualification rocks are genus-zero: the current topology validator also requires Euler characteristic 2 and does not qualify valid higher-genus closed surfaces. The mesh hash changes only in the two repaired rows, and the added vertices correspond to the two measured split patches.

**Next recommendation: investigate Unity U4D — a local high-resolution matter domain, with 0.125 m as the detailed candidate and 0.0625 m retained as optional hero/extreme-detail evidence. U4D was not started. Stop for owner review.** No U4E, U5, Unreal, adaptive stitching, streaming, or production migration work began.

## Independent review

The read-only reviewer confirms the named regression exposes the unsupported interior case and that the documentation clearly limits the topology claim. B/C, all 12 matrix rows, seam stitching, deterministic stress, visual comparisons, and final Player evidence remain credible. The reviewer found no remaining technical blocker and assigns **PASS within the documented qualification scope**. U4D is a recommendation only and must wait for owner review.
