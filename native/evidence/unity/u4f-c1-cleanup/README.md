# U4F-C1 dual-derivative cleanup — `U4FC1_RENDER_SOURCE_HOLD`

**Disposition:** the raw candidate's macro silhouette survived the bounded construction and focused component repair, and the resulting high-resolution shell passes the recorded topology checks. Independent visual review rejects it as a pristine render source: severe striped/moiré surface artifacts remain across the visible mass, the underside retains a dark radial/star pattern, and the raw source already departs from the approved reference's broad connected plane hierarchy. Stop C1 here. Do not decimate, produce a stamp-source derivative, import into Unity, or start U4G/U5.

## Frozen inputs and start

- Starting `main` / `origin/main`: `be67c47ddc75a00c2e672318cd454405b0647ab4`.
- Approved reference: `art/source/u4f-rock-002/reference/candidate-04.png`, SHA-256 `6b0d4606568158de586f488bb0cafe7b17e04c26b6c47f5528cee6209043b0bc`.
- Immutable raw master: `art/source/u4f-rock-002/raw/staged512-geometry-r1/raw-geometry.ply`, SHA-256 `4cc76dc0608ed0e3575e25718c3b606561aa7925c4cd5d46350c4576d5958c5d`; 796,082 vertices, 1,594,784 triangles, float32 positions, uint32 indices.
- Blender: 4.5.3 LTS. The raw was only read/imported for audit and matched captures; no raw repair or save-back occurred.

## Defect localization

The established capture convention is **+Z up / −Z underside**. The read-only raw audit found boundary edges by normalized-height band: bottom 0–15% 1,123; lower 15–30% 1,084; middle 30–70% 3,184; upper 70–100% 965 (6,356 total). Nonmanifold edges: 1,850; 1,410; 5,057; 1,547 respectively (9,864 total). Defects occur on visible upper/side regions as well as the underside, so the problem is not confined to a single fillable opening.

The boundary graph has 1,416 connected groups: 823 simple loops and 593 branched/open fragments. The largest simple loop has 10 edges; the largest boundary graph component has 16 edges. No stable large loop supports blind hole filling. A BVH probe on the lower 35% found 299 triangle-pair overlaps without shared face indices among 839,428 tested faces; this is a localized lower-shell self-overlap diagnostic, not a whole-mesh self-intersection claim. An 81×81 upward ray grid recorded 4,415 hits and 2,146 misses over the expanded XY footprint; the highest first-hit surface was at normalized Z 0.286. These measurements supported authoring a shallow irregular base but did not explain away the widely distributed upper/side defects. Full records: `metrics/raw-defect-localization.json`, `metrics/raw-lower-self-overlap.json`, and `metrics/raw-underside-rays.json`.

## Construction and the one focused repair

The deterministic construction copied the single face-bearing raw component, removed its 53 unused vertices in the copy, authored a shallow irregular multi-ring support core, and performed one 0.0014-unit voxel reconstruction. The resulting 3,206,138-vertex / 6,399,340-triangle working solid was closed and nonmanifold-free but contained 13,166 face-bearing components. Its captured surface showed striping and its signed volume was negative.

After independent review identified detached remesh islands as one specific repair target, the only focused repair retained the largest shared-edge-connected component (5,691,980 triangles; 88.946% of faces), discarded the other 13,165 components (707,360 triangles), compacted referenced vertices, and reversed the retained shell's winding because its measured signed volume was negative. It did not remesh or smooth the retained surface. The repaired working file is `art/source/u4f-rock-002/cleanup/c1/working/c1-working-solid-focused-repair.blend`, SHA-256 `35633fa26f42c69bb6a48723adce17ab9e4d15c1ec946e6901ab9b70acf4bd8b`; it has 2,826,334 vertices and 5,691,980 triangles, bounds `[-0.494383,-0.460299,-0.310706]` to `[0.491602,0.459378,0.268706]`, and signed volume `+0.0939447849631`. Closure/topology: zero boundary edges, zero nonmanifold edges, one component, zero unused vertices, zero repeated-index/zero-area faces, zero nonfinite scalars, and zero orientation conflicts. Blender reopen validation passes in `metrics/reopen-validation.json`.

The removed islands were not the remaining blocker: matched raw/working silhouette IoU spans 0.992965–0.998631 across eight views, with the largest difference in top view. Independent review found the operation visually silhouette-preserving, but the actual surface still has severe striped/moiré contours over the cap, shoulders, and lower mass. The radial/star underside shading remains. The raw itself reads more like a bulky base with a separate mesa-like cap than the approved reference's coherent tall-offset-shoulder boulder. See `review-cleanup.md` and `review-pre-reduction.md`.

## Product gates

- **Pristine render derivative:** not produced. The only saved mesh is a high-resolution working candidate rejected by independent review; it is not an admitted runtime/render asset and is far above the 30k–80k triangle guidance.
- **Closed stamp-source derivative:** not produced. The working shell's topology passes, but stamp construction is blocked because the visible-source gate failed.
- **Unity/SDF/U4G/U5:** untouched.
- **Raw master:** unchanged; expected SHA-256 remains exact.

## Reproduction and evidence map

Run the read-only defect audits and diagnostic renderer before any construction. `tools/art/build-u4f-c1-derivatives.py -- --stage construct` created the initial working shell and pre-reduction captures. `tools/art/repair-u4f-c1-largest-component.py` is the one reviewer-authorized repair; `tools/art/validate-u4f-c1-repaired-blend.py` reopens the saved blend without mutation. `tools/art/compose-u4f-c1-review-boards.py` produces the matched boards and silhouette masks. Configuration is `art/source/u4f-rock-002/cleanup/c1/cleanup-config.json`; construction rationale is `art/source/u4f-rock-002/cleanup/c1/construction-plan.md`.

- Raw defect map: `captures/diagnostics/defects-primary.png`, `defects-opposite.png`, `defects-underside.png`.
- Unrepaired construction board: `captures/pre-reduction/pre-reduction-primary.png` and matching opposite/front/back/left/right/top/underside boards.
- Post-repair comparison: `captures/post-repair/pre-reduction-primary.png` and matching opposite/front/back/left/right/top/underside boards. Separate raw/working renders and silhouette overlays are alongside them.
- The underside failure is isolated in `captures/post-repair/underside-progression-hold.png`: raw open underside → initial closed working candidate → after the single focused repair. This is a HOLD trace, not a pristine/stamp product board.
- Input, component, closure, reopen, comparison and capture hashes are recorded in `metrics/*.json` and `receipt.json`.
- `tests/focused.json` records the focused helper/validation results. No Unity tests ran because Unity was not touched.

The repository ignores Blender `.blend` files. The two C1 working scenes are kept locally for owner inspection and are not included in the Git commit; their paths and hashes are recorded above and in the receipts. The review boards, scripts, configuration, metrics, and documentation are committed.

**Next step:** owner review of the actual post-repair boards and a fresh direction on a structural source-cleanup method. Do not repeat the same remesh/component cleanup route or spend another repair pass without that direction.
