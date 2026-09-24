# Phase 0.5C.1 — Material composition and crisp visual seams

**Result: HOLD — stop for owner review.** The bounded compositor and seam comparison work in the isolated lab. The phase reaches an evidence-based provisional **HYBRID** recommendation, but does not pass its complete end-to-end gate: the buried-rock sequence is a deterministic browser preview over the actual mesher, not a persisted interactive matter-world state, the logical chunk-edge material probe is deferred to D, and the current focused C physics test is failing its rotation threshold in this environment.

## VERIFIED

- The Phase 0.5C control used one 13³ resolved density/material array. Dirt was generated first; rock overwrote solid dirt in a later loop. This was deterministic precedence, but the order itself encoded the rule.
- `matter-composition.js` adds a bounded pure dirt/rock/air compositor. Rock priority is explicit (`20` over dirt `10`); ties resolve by lower material ID, then lower density for repeated same-material sources; air is selected when no source is solid. Reversing source evaluation order returns the same result.
- The existing mixed fixture now resolves through the compositor and keeps the same dimensions, material-exclusive samples, sample spacing, and ownership ledger. Source overlap is not counted as physical matter.
- A second bounded source fixture fully buries an ellipsoid rock inside dirt. Dirt-only edits uncover it in two steps; the rock samples remain unchanged and the resulting surface remeshes through the existing single Surface Nets field. Unit coverage proves a larger rock-labelled visible region after the second scoop.
- The crisp render mode classifies each triangle by majority resolved vertex material, breaking ties with the lower material ID. Each vertex is duplicated only when the same source vertex is used by triangles classified as different materials. Duplicate positions are identical; no offset or extra faces are introduced. Current and crisp modes keep the same triangle positions and triangle count.
- Headless Edge/SwiftShader comparison: 908 triangles in both modes; vertices increase from 456 to 478 (+22 / 4.8%). Source comparison returned zero page errors and zero external requests. Matched images and reveal sequence are at [the evidence board](evidence/voxel-phase05c1/material-composition.html).
- Extraction/reload regression asserts each original rock sample resolves to AIR after detachment and stays AIR after validation/reload; no underlying dirt source is regenerated. Existing C tests also retain material-specific editing, exact ledgers, moved-actor targeting, transfer without reward, and rollback injection.
- The source C browser regression replays all eight ordinary-input stages (support, scoop, save/reload, detachment, settling, moved-target chip, final reload) with zero errors/external requests. Receipt/captures are under `evidence/voxel-phase05c1/c-regression/`.
- Across 30 warm Node fixture runs, medians were 4.31 ms composition (including bounded fixture creation), 5.84 ms Surface Nets meshing, and 0.75 ms seam classification. Resolved typed arrays occupy 10,985 bytes; retaining both source-density arrays would add 8,788 bytes. These are bounded fixture observations, not terrain/device budgets. See `evidence/voxel-phase05c1/source/benchmark.json`.

## PROVISIONAL — representation comparison

**Recommendation: HYBRID.** Use explicit deterministic source composition at procedural-generation boundaries, but store only the resolved density/material field as runtime authority with persistent edits/tombstones. A detached actor remains a bounded snapshot of its resolved matter. This makes overlap policy inspectable without retaining duplicate ownership or source stacks in actors/saves.

The current C resolved-only generator is small and correct for two fixed sources. The compositor improves clarity and order independence at small cost, but a per-location source stack would add evaluation and memory cost without helping runtime edits. Do not generalize this prototype into an unlimited material graph.

## FAILED / HOLD

- The browser reveal preview is a deterministic proof of source composition, dirt-only sample edits, and actual Surface Nets remeshing. It does not yet run those reveal stages through the persisted interactive `mineWorldMatter` transaction, ownership ledger, actor detachment, and reload chain on the buried fixture. The existing C interactive sequence covers those latter behaviors on the earlier partly exposed boulder.
- No logical mesh-chunk edge exists in this bounded mixed fixture. Testing the material classification across the Phase 0 padded halo rules would require an artificial re-split of the fixture; defer a meaningful edge-crossing proof to Phase 0.5D, before terrain chunk work is admitted.
- `node --test tests/voxelMixedMatter.test.js` currently fails the existing Rapier rotation assertion: 0.153 rad observed against a >0.25 rad threshold after 300 steps. The fixture still translates, and the Phase 0.5C report had recorded approximately 0.19 rad from its browser receipt. No proxy or threshold change was made in this phase because the discrepancy is outside the compositor/seam path and changes accepted C tuning.
- The crisp seam remains low-poly and follows the triangle classification. This is not a texture/shader quality or mobile-performance claim.

## FUTURE

Before PASS, route the buried fixture through the authoritative edit/save/transfer state chain and resolve/reproduce the existing C rotation-test discrepancy without weakening its accepted behavior. At Phase 0.5D, test a material boundary across a real logical mesh-chunk edge. Do not start terrain-scale work from this report.

## Validation

- `node --test tests/voxelMatterComposition.test.js`: 3/3 pass.
- `node --test tests/voxelMixedMatter.test.js`: 8/9 pass; the existing Rapier rotation threshold fails at 0.153 rad.
- Browser comparison: pass; 908 triangles control/crisp, 456→478 render vertices, zero errors/external requests.
- `npm test` and the final captured `npm run verify` each report 1,558/1,559 passing across 175 suites. The sole failure is the existing C Rapier rotation assertion (0.153238 rad vs >0.25). `verify` exits at its test step, so world/campaign checks, submission build, and submission validation were not reached in this run.
- No ZIP/package-generation claim; production package work is not part of this lab phase.
