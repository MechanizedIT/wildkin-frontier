# Fungal Hollow production contract — R2 source truth

Status: source-frozen September 13, 2026. The locked [low-poly target](../art/targets/fungal-hollow-v1/target.png) remains a target, not an implementation score. Native visual judgment is **6.5/10 HOLD**: the source and physical outing are integrated, while the current portrait view has not earned art acceptance.

## Player result

Fungal Hollow is one finite branching rootwash centered at `(-2850,-1250)`. A supported shelf carries the player between unequal cuts, 23 fixed fungal props and four luminous blossoms. One aggressive, noncollectable Thornprowler guards the western risky blossom. The approach and return are distinct 6 m routes; mushrooms and logs are dressing and provide no AI line-of-sight cover.

## Shared terrain and geometry owner

`src/world/frontierFungalHollow.js` owns the immutable habitat geometry and fixed life anchors. `frontierRegion.js` blends its final target height and color once by habitat weight; `frontierTerrain.js` publishes the same metadata and height through full, reduced and chunk-mesh paths. Zero Fungal weight preserves other habitat output.

The bounded rootwash uses these three fixed branches:

- west trunk: `[-2925,-1160] → [-2900,-1195] → [-2884,-1230] → [-2887,-1270] → [-2918,-1325]`
- east cut: `[-2770,-1165] → [-2805,-1198] → [-2823,-1235] → [-2820,-1275] → [-2807,-1315]`
- north branch: `[-2887,-1270] → [-2868,-1300] → [-2838,-1330] → [-2800,-1360]`

The finite feature bounds are `x -2960..-2760`, `z -1380..-1140`, with a smooth edge fade. Seeded broad relief and palette detail vary local character without moving the branch topology. R2 places the unequal near banks at left `(-2856.5,-1249.5)`, radii `(4.5,12)`, rise `2`, and right `(-2844,-1254)`, radii `(4.5,9)`, rise `1.6`. Four bounded shelf toes support the fixed composition. Teal hollow floors and olive raised banks provide local zoning.

The public API is:

```js
FRONTIER_FUNGAL_CONFIG
sampleFrontierFungalProfile(x, z, { seed, baseHeight, habitatWeight })
sampleFrontierFungalFeature(x, z)
overlapsFrontierFungalOuting(x, z, radius = 0)
overlapsFrontierFungalRoute(x, z, radius = 0)
```

`sampleFrontierFungalFeature` is a cheap bounded query and returns neutral values outside the feature bounds. `overlapsFrontierFungalOuting` tests footprint intersection with the 31 m hero pocket. `overlapsFrontierFungalRoute` tests footprint intersection with both 3 m half-width route capsules.

## Routes, blossoms and Thornprowler

The route centerlines are frozen:

- approach: `[-2848,-1216] → [-2850,-1232] → [-2849,-1248] → [-2854,-1258]`
- return: `[-2854,-1258] → [-2846,-1270] → [-2838,-1284] → [-2826,-1298]`

Both retain a 3 m supported half-width on the analytic terrain and rendered 2 m triangles.

The four finite blossom records retain these stable identities and coordinates:

| ID | x | z | role |
|---|---:|---:|---|
| `f1:r:-57:-25:400` | -2847 | -1241 | safer first blossom |
| `f1:r:-58:-25:401` | -2855.8 | -1240.5 | west approach blossom |
| `f1:r:-57:-26:402` | -2843.5 | -1255 | raised return-shelf blossom |
| `f1:r:-58:-26:403` | -2860 | -1255 | risky western blossom |

Each uses `asset_luminous_blossom`, scale `1`, footprint radius `.9`, the canonical `wildflower` drop and existing persistent frontier depletion. Fixed records publish before the per-chunk ordinary cap. Missing or malformed canonical blossom assets fail the fixed set closed and remain retryable.

The Thorn home is `(-2868,-1260)`, radius `10`, index `450`, chunk `-58,-26`, with stable origin `f1:w:-58:-26:450`. Its full disk stays inside the 31 m outing and clears both route capsules. Blossom 403 remains inside the home to preserve the risky gathering choice. The admitted `asset_thornprowler` must retain its exact aggressive rusher recipe; it is hostile and intentionally has no companion observation, bond, capture or persistence path.

## Fixed scenery and ordinary dressing

The atomic fixed group contains 23 stable `f1:s:fungal-hollow:*` records using only the admitted mushroom-ring, fallen-log, Fen-stone, trail-stone and pebble-cluster families. All required renderable meshes must be present before any member publishes. An incomplete group is not cached, allowing the existing immutable recipe cache to retry it.

The three final solid Fen stones are:

| stable role | x | z | scale | yaw |
|---|---:|---:|---:|---:|
| stone-a | -2853 | -1247.75 | .6 | .18 |
| stone-b | -2846.75 | -1252 | .7 | -.31 |
| stone-c | -2858.25 | -1249 | .58 | .42 |

All 23 props derive Y from the integrated terrain. The three solid stones clear both routes, the complete Thorn home and all blossom footprints. Nonblocking mushrooms, logs, pebbles, trails and ground tufts may dress the outing and home. Ordinary solid Fen stones must reject route and home overlap. Existing resident caps, draw cells and recipe lifecycle remain authoritative.

## Ownership and lifecycle

| Owner | Files and responsibility |
|---|---|
| Terrain | `frontierFungalHollow.js`, `frontierRegion.js`, `frontierTerrain.js`; bounded morphology, shared anchors, metadata and terrain parity |
| Scenery | `frontierScenery.js`, `frontierSceneryVisual.js`; fixed atomic group, ordinary dressing, ground patches, render/collision residency and cache retry |
| Life | `frontierEcology.js`, `frontierWildlife.js`; finite blossoms, Thorn admission, depletion/respawn and resident retirement |
| Root | composition, purpose hint, native outing, package/persistence and aggregate closure |

## Proof and remaining judgment

Focused source review is PASS. Terrain/region/profile tests pass 46/46. Final bounded Fungal terrain/scenery review passes 45/45 and returns 23/23 unique fixed IDs. All three final stones pass analytic and rendered-triangle support at max slope `.32`; exact measurements are in `.dream-loop/fungal/terrain-receipt.md`.

R2 corrected two source blockers found during review: the Thorn home moved west so its full disk no longer intersects either route, and all three stones were fitted to strict rendered support while retaining their stable roles. Earlier provisional home and stone coordinates are superseded.

Native play still owns the perceptual decision: the banks must read in the portrait view, the two exits must remain understandable, the threat must be visible before aggro, and retreat/harvest must work without snagging or duplicate yield. The current visual score remains **6.5/10 HOLD** until that evidence improves.
