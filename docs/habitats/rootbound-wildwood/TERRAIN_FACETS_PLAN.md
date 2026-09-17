# Rootbound terrain facets — bounded next-pass plan

## Actual first comparison

[Matched native portrait comparison](../../../art/reviews/rootbound-wildwood/terrain-facets-r1/review.html): root tested a visible 16×18m render-only patch at .18m and .35m amplitude after independent review corrected the original support/camera calculation. Both preserved the existing triangle count. The gentle result is difficult to distinguish; the stronger version adds only faint floor planes and needs support reconciliation before gameplay use. No terrain source changed. This answers the first perception experiment, not the full terrain direction. Next design should combine deliberately irregular planes and restrained surface color; adding low-amplitude sine waves alone is insufficient.

## What the current render actually does

The retained [final destination capture](../../../art/reviews/rootbound-wildwood/final-destination.png) already shows broad triangles in the open floor, but they are too even to give the Lantern Hollow threshold a clear, shallow ground rhythm. The committed [terrain direction](../../../art/targets/rootbound-wildwood/concepts/dossier-v2/terrain-owner-reference.jpg) is useful for its restraint: a calm walkable center, irregular large planes, and relief held at roots and stones. It is a visual direction, not a measured terrain specification.

The present terrain mesh is already low-poly in the relevant render path. `FRONTIER_TERRAIN_CONFIG` creates ordinary 50 m chunks with 25 segments (2 m cells), and both the ground material at `frontierChunkRuntime.js:247` and the separated cliff material at `frontierChunkRuntime.js:68` set `flatShading: true`. The stored vertex normals are therefore not smoothing this material into the current appearance. Flat shading derives its lighting from triangle faces; actual vertex heights, triangle layout, baked ground texture, and scene lighting determine whether those faces read.

`sampleFrontierRootboundFeature(x, z)` and `sampleFrontierRootboundProfile(x, z, { baseHeight, habitatWeight, protectDefaultLife })` are the existing Rootbound exports. The latter already makes its macro displacement preservation-aware. There is no current microfacet option or separate normal API; this plan does not assume either.

## One bounded geometry study

**Candidate area:** the outer Lantern Hollow threshold at `x [-460, -450]`, `z [682, 690]`, within ordinary chunk `(-9, 13)`. This is the rear/left edge of the fixed destination room, deliberately outside its central player lane and away from the curated lantern log, rings, and thornstones around `z 678–681`. It is one connected 10 × 8 m patch, not three screenshot-only chunks and not a global detail setting.

The next structural pass should evaluate one actual-height alternative on the **existing 2 m mesh**:

| Element | Existing render | Candidate geometry | Limit |
| --- | --- | --- | --- |
| Grid and shading | 2 m cells, flat-shaded | unchanged | no automatic 1 m subdivision or chunk-wide cost increase |
| Height language | macro hollow/bank only | one coordinated, deterministic shallow undulation across the 10 × 8 m edge patch | at most ±0.10 m from the retained profile; 5–8 m directional wavelength, no per-vertex random noise |
| Boundary | ordinary neighboring terrain | zero-height fade across the patch’s outer 2 m | no seam or abrupt new ledge |
| Life and props | current protected footprint and curated support | no displacement in any protected point/plate, resource/home support, curated solid-hull support, or certified lane sample | no identity, transform, or admission change |

The useful comparison is **baseline 2 m flat-shaded mesh versus this same 2 m flat-shaded mesh with modest coordinated height relief**, captured at the fixed destination pose. That keeps the visible planes broad and gives flat shading something real to light. A shallow diagonal swale plus one offset shoulder is preferable to a periodic checkerboard: it should lead into the existing lantern bank rather than compete with it.

If the height study remains visually too quiet, an optional *correlated normal* presentation experiment can be reviewed separately. It can change only rendered lighting; it does not change collision or support. It must not be represented as physical ground detail, must use the same low-frequency direction as an accepted height form, and should remain subtle cosmetic faceting; reject strong false ledges or gaps that mislead navigation, not ordinary shallow lighting illusions. Random independent normals are not the recommended first implementation because the material is already flat-shaded and such a treatment could mislead navigation without improving the actual terrain.

## Existing ownership and implementation boundary

A source pass, if independently approved, belongs in the existing Rootbound numeric profile and terrain-query chain rather than in a shader-only overlay. The new local term would be computed after the active Rootbound feature is known and multiplied by the existing preservation result. It must remain neutral for alternate worlds exactly as the current Rootbound profile does. No new exported sampler is required or proposed.

For this patch, `createFrontierChunk`, `sampleFrontier`, and `sampleFrontierHeight` must resolve the same final triangles used for rendering and play. The current detailed-triangle seam is Skybreak-specific; this plan does **not** claim that Rootbound can reuse it unchanged. A concrete implementation must first choose a bounded, reviewed way for query and mesh to agree, without recursive ecology sampling or a render-only height path.

Before a source freeze, prove all of the following against the retained default-world baseline:

1. The full existing Rootbound resource footprints, wildlife home disks, curated scenery hull supports, and their IDs/transforms retain their contract. The existing three stable resident plates and four-metre feather remain intact.
2. The destination lane plus its `.32 m` player-footprint sampling stays physically supported on the final 2 m triangles. The unmodified corridor remains the reference; no narrowing or relaxed slope threshold is allowed.
3. Default implicit and explicit worlds agree; alternate worlds remain Rootbound-neutral.
4. The destination frame shows a readable low, broad face change without a new focal obstacle. Gallery and arrival are comparison-only captures, not additional terrain scopes.

## Decision rule

Proceed only when the single patch produces visible, calm low-poly ground variation at the destination and all support/identity checks pass. HOLD if the existing 2 m triangles make the effect look like noise, if the form is hidden behind the room’s props, or if preservation removes all useful area. In that case retain the current geometry and evaluate the limited correlated-normal presentation option honestly; do not expand to a 1 m mesh, add a global terrain rule, or alter another Rootbound room.
## Relationship to the full showcase

This patch is the first comparison for choosing a useful terrain treatment, not a reduction of the owner's Rootbound-wide objective. If it produces a readable improvement, extend the same language deliberately across the habitat with different strength by subregion and intentional quiet/flat exceptions. Keep the main outing, ecological density and Wildkin work moving alongside terrain refinement.
