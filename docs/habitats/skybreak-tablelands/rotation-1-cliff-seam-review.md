# Skybreak rotation 1 — Verdant cliff enabling-seam review

**Decision: conditional PASS for the bounded `frontierLandformVisual.js` seam design; HOLD on every placement and visual claim.** The accepted toe, buttress, and ledge are actual opaque, grounded external models (1,110 triangles total at unit scale) that provide a meaningful rocky-rim vocabulary the current low-prop kit does not. The three-instance ceiling is a proportionate extension of the existing streamed Terrace precedent, and it avoids the incorrect generic-scenery paths: low batching has no model parts and canopy would add an unrelated trunk collider.

## Architecture and budget boundary

- Add a separately named Skybreak recipe only inside `createFrontierLandformVisual`; leave Terrace behavior and `frontierSceneryVisual` unchanged. Candidate zones all fall in the detailed crown resident chunk `(0,-5)` at the recorded scales, but the implementation must gate on exact approved transforms rather than an approximate zone.
- Reuse cached `createExternalModelVisual` instances and the existing resident `dispose()` path. Add one transformed convex hull per model to the landform resident's `terrainSurfaces`; `frontierChunkRuntime` already stages replacement surfaces before retiring the old resident and removes their IDs when it retires. The ID must be stable and unique per recipe instance so a chunk reload cannot leave an old hull behind.
- The seam adds at most three external visuals and three convex terrain surfaces. It must not alter the 18 existing staged records, generic caps, landform/profile ownership, or resource/wildlife/scenery selection.

## Required transform and placement proof before source freeze

For each proposed toe/buttress/ledge, root must retain one numerical receipt proving the exact same world position, yaw, scale, asset pivot, and sampled base height are used by its visible instance and every transformed hull vertex. With chunk `(0,-5)`, the hull must be translated into that resident's local coordinates using origin `(0,-250)` exactly once; the terrain-surface origin supplies the same world offset. Check every transformed-hull planform vertex for native terrain support/slope, then reject any transform that fails route core/shoulder, finite-resource approach, Mossling 3.1 m disk plus feather, cloudflower planform, crystal support/approach, or exit clearance.

The same receipt must project the full transformed hull (not an origin point) into settled arrival, ascent, crown, and return cameras. A model that only improves an offscreen frame, masks a protected anchor, or needs widened terrain/clearance is rejected. Finally prove normal chunk add/remove has no leaked or duplicate terrain surface and the existing six Terrace instances remain unchanged. These checks decide whether the seam is used; this review does not approve a transform, a structural pass, or a target match.
