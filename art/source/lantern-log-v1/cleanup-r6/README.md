# Lantern R6 — terminal reconstruction study

**HOLD; sixth substantial Lantern attempt closed.** Preserve the raw R5 master, manual R4, this derivative and their evidence. No game asset was admitted.

The independently reviewed plan and source selected the largest raw vertex-connected component and applied one Blender 4.5.3 voxel reconstruction at 0.006 raw units. There was no fallback voxel size, hand repair, texture, normalization or export. Exact-coordinate diagnosis first ruled out duplicate XYZ vertices and duplicate index triangles as a simple explanation of the raw topology defects.

The actual derivative has 62,510 vertices and 124,172 triangles. Boundary/nonmanifold edges, inconsistent shared-edge directions, unused vertices, repeated-index triangles and zero-area triangles are zero. It failed the required single-component gate: 240 face-bearing vertex-connected surface components remain. The builder stopped with exit 1 and preserved `candidate/held-candidate.blend` before rendering. This is useful topology progress, not a complete repair.

A separately approved read-only observation opened that exact saved scene, measured each component and rendered 42 matched raw/derivative views at 512/96/48px. Both geometry signatures and the saved file stayed unchanged; observation exited 0 in 21.25 seconds, minimum sampled free RAM 18.638 GiB. The dominant component has 116,764 triangles; all 240 have positive signed volume. Nesting and self-intersections were not tested, so surface components cannot be reported as 240 separate physical solids.

The actual matched views show loss of the broad lower log mass and visible small fragments. Closing surfaces alone did not recover the intended volume. Read the independent terminal visual review for the final perceptual judgment. No seventh repair belongs to this visit; move to another Rootbound constituent and revisit only with a concrete changed approach.

## Evidence

- [Matched actual images](../review.html#cleanup-r6)
- [Reviewed construction plan](construction-plan.md) and [source review](source-review.md)
- [Failed candidate gate](candidate/candidate-audit.json) and [build receipt](candidate/run-receipt.json)
- [Read-only source review](terminal-diagnostic-source-review.md)
- [Component facts](diagnostic/component-facts.json), [framing](diagnostic/render-framing.json), [unchanged-source receipt](diagnostic/run-receipt.json)
- [Independent terminal visual review](terminal-visual-review.md)

The raw source is untextured. Both models use the same neutral gray material, exposure and full raw bounding-box framing. Long axis is X: `end-*-y` filenames show broad sides, while `side-*-x` looks toward the log ends. The underside hides the presentation floor. These are actual Blender inspection images, not gameplay screenshots.
