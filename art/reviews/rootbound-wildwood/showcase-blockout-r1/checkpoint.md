# Rootbound placeholder assembly checkpoint — September 14, 2026

**Retain the useful blockout gain; the full habitat showcase remains unfinished.** Asset experiments are paused under the latest owner direction. This pass uses existing tree, fallen-log and mineral parts rather than waiting on new model refinement.

## Retained result

Twenty non-colliding group placements use three normalized, color-merged recipes. Their complete geometry totals 58,118 instantiated triangles when all twenty groups are loaded. Scale changes dimensions, never triangle counts. Leaf groups are at most 6.84m high, root groups at most 2.04m, and mineral groups at most 3m. Existing world entries compare exactly after excluding the three appended assets; all seventeen prior Rootbound placement records remain unchanged. No terrain, ecology, movement, harvest, save, generic renderer or collider code changed.

The single coordinated repair replaces isolated cubes with joined native-part silhouettes, corrects oversized inherited geometry, and keeps full visual bounds outside the route. Conservative circles covering all transformed vertices leave at least 3.035m from the primary centreline and 2.382m from the optional branch. These are clearance checks for the new visual groups, not a new certification of the entire outing.

## Actual evidence

The [comparison gallery](review.html) contains six matched baseline/repair views: five normal portrait cameras and an overhead diagnostic. Baselines use the frozen earlier package at commit 5cb0ed1; final captures use current source. CSS viewport is 412×915, recorded at the host's 330×732 screenshot scale. Meadow/Galleries/Crown cameras now face the planned route; old `before-*`/`r1-*` images retain the earlier poses. Fogged overview attempts are explicitly named failed diagnostics. Normal screenshots retain the game HUD; only Scout developer controls are hidden.

The [independent review](independent-final-review.md) retains the Verge cue and Crown deadwood gain, but Meadow/Galleries remain too open, Crown is cropped and reads as an edge, and the overview still shows islands. No finished five-room or 3–5 minute circuit claim.

A short Gallery approach/return uses keyboard events through the existing input path: 9.186m forward and 9.133m back, each about four seconds; all 84 recorded samples grounded. This is neither physical-phone input proof nor a complete outing. Rootbound residents stream 36→0→36 and their actual mesh groups 25→0→25 when leaving and returning. At all five matching portrait poses, no baseline resident IDs disappear and collider counts match. Representative normal rendered frames add 2–6 draw calls and 4,808–21,780 triangles; those are frame counts, not an FPS benchmark. See `playcheck-summary.json`, `normalized-layout.json` and `source-integrity.json`.

The existing unlocated MutationObserver `observe` error appeared again in the browser log. No new error attribution or clean-console claim is made.

## Validation

All 1,434 tests, `npm run verify` and `npm run zip` pass. ZIP: 21,806,198 bytes; SHA256 `13868157868a09c7361c0b5a077e1eda88b30aaf65d63636de7c201b1bd7c032`. Packaged Crown/overview match player state, resident IDs, actual mesh records, triangle/draw counts and collider counts. Crown camera settled 0.089935m lower in its package capture; yaw/pitch/distance match, and overhead camera is exact. No pixel-identical camera claim. See `packaged-parity.json`. The first aggregate run found the three baked recipes missing from the maintained-composer validation registry; they now use the same explicit recipe admission path as the existing Foundry, Fen and Camp composers. Focused Rootbound and visual-kit tests pass. The initial failure log is retained separately.

## Next bounded work

Plan broad terrain/vegetation coverage along the route, using final masked height and actual camera evidence. Current proposed terrain bands need revision where they overlap the return route, optional branch or protected northern plate. Use a visual Crown backdrop if its ground must remain preserved. No new asset experiments or push.
