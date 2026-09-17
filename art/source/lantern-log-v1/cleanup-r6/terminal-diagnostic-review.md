# Independent terminal diagnostic authorization — R6

**Observed terminal result:** the single R6 `.006` reconstruction stopped before studio rendering. Its recorded derivative has 124,172 triangles and 62,510 vertices with zero boundary/non-manifold/inconsistent-direction/unused/repeated/zero-area counts and positive volume, but **240 face-bearing vertex-connected components**.

## Authorization

**GO for one read-only diagnostic of the saved `held-candidate.blend` only.** This is observation of the terminal R6 artifact, not an R7 reconstruction, repair, cleanup, or admission attempt.

The diagnostic may:

- open the saved held blend and measure component face/vertex sizes from its existing derivative geometry;
- render raw master and derivative under the frozen matched full-R5-bounds, seven-direction, 512/96/48 neutral setup; and
- write a separate receipt and image output directory.

It must preserve geometry exactly: no modifier addition/application, remesh, decimation, Boolean, weld, normal recalculation, mesh update/edit-mode operation, transform/material geometry change, export, or save-over of the held blend. Bind the held-blend hash before/after and record the derivative vertex/index counts before inspection. The report must retain the precise term **face-bearing vertex-connected components**, state that no renders existed before this diagnostic, and must not present clean local surfaces as a coherent or runtime-ready asset.

The diagnostic is useful because it can distinguish a retained primary mass from many islands and document whether the post-remesh surface visibly carries any V2 body/cap read. It cannot justify deleting islands or running another reconstruction this visit.
