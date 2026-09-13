# Fungal Hollow native blockout support

## Fixture

[`blockout-specs.json`](./blockout-specs.json) is a direct top-level array for `createFrontierSceneryVisual({ specs, ... })`. It contains 23 admitted baked low props around `(-2850, -1250)`: six Mooncap rings, two fallen logs, three fen stones, four trail-stone patches and eight pebble clusters. `groundCover.density` is zero so the native comparison measures this authored composition without adding the visual factory's ordinary grass dressing.

The witness is the player at `(-2850, -1232)`, yaw `0`, portrait `412 x 915`, with the current 36 degree portrait pitch and requested distance `11.591m`. The layout uses unequal side crescents. Four flat trail patches bend from x `-2850.55` through `-2849.4` and back to `-2850.25`; the taller props remain on the sides.

## Geometry, support and route proof

Every `y` is the current `sampleFrontierHeight(x,z)` rounded to six decimals. I checked the canonical transformed mesh footprint radius at each authored scale with the production nine-point support helper and the continent land-footprint helper. All 23 pass on land at `maxSlope .32`; the largest observed actual height delta/radius ratio is `.0385`.

| Family | Count | Scales | Full support radii used | Runtime physics |
|---|---:|---:|---:|---|
| Mooncap ring | 6 | `1.10-1.45` | `1.155-1.523m` (`1.05 * scale`) | None; visual dressing |
| Fallen log | 2 | `.82-.86` | `1.251-1.312m` (`1.525 * scale`) | None; visual route edge |
| Fen stone | 3 | `.58-.76` | `.661-.866m` (`1.14 * scale`) | Three generated solid surfaces |
| Trail stones | 4 | `.66-.72` | `.924-1.008m` (`1.4 * scale`) | None; allowed within the walking line |
| Pebbles | 8 | `.78-1.10` | `.515-.726m` (`.66 * scale`) | None |

The sinuous route center is `x = -2850 + .62 * sin(((-z - 1232) - 5) * .42)`. For every mushroom, log, fen stone and pebble, `abs(x - routeCenter) - fullSupportRadius` is at least `2.019m`, preserving a little over four metres between the two decorative envelopes. Trail stones intentionally occupy the route because their complete meshes are low and nonblocking.

Only `asset_fen_stone` creates collision in this visual path. Its scaled physical cores are:

- stone-a: `.699 x .593m` XZ, `1.634m` high; conservative route clearance `2.764m`.
- stone-b: `.644 x .546m` XZ, `1.505m` high; conservative route clearance `3.770m`.
- stone-c: `.534 x .452m` XZ, `1.247m` high; conservative route clearance `2.199m`.

These three cores do not overlap each other. The larger support radii above already clear the route, so the narrower yawed physical boxes do as well. Mushrooms and logs can visually overlap within their side clusters, but they do not promise a blocking wall in this runtime.

## Projection and resource pocket

I projected every source vertex after the canonical part transform and authored placement transform through the current camera. All 23 meshes fit inside the raw portrait viewport. Their combined full bounds are approximately x `0.8-408.2px`, y `28.8-290.7px`. The tight edge witnesses are mush-a at `0.8px` on the left and mush-f at `408.2px` on the right. Root should judge those deliberate near-edge silhouettes in the native capture; no prop is mathematically clipped in this fixture.

Reserve `(-2847, 11.378099, -1241)` as the first resource pocket. A `.9m` reserved footprint passes land and `.18` support (`.0342` measured slope), stays `2.69m` clear of the route center after its own radius, and has `1.754m` free space beyond the nearest scenery footprint. A scale-1 luminous blossom at that point would project fully at x `328.0-383.3px`, y `190.8-258.5px`. The JSON deliberately does not spawn it.

## Render bound

The actual visual factory reports 23 low instances, 16 low draws, 16,842 triangles, three surfaces, and no ground-cover draw. The five shared compiled geometries contain 10,740 vertices, about `0.39MB` for Float32 position, normal and color attributes before Three.js/GPU bookkeeping. Sixteen draws arise because the composition crosses the fixed negative-coordinate 12.5m cell boundaries at x `-2850` and z `-1250`; it is still a bounded blockout cost and requires no new geometry or material family.

This is a first native blockout, not an art acceptance. The image should decide whether the tight edge caps and upper-screen stone crown make the Hollow feel full enough before any placement refinement.
