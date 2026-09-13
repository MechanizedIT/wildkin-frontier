# Continent v2 frozen geometry evidence

## Frozen inputs

- Production source: `src/world/frontierContinent.js`
  - SHA-256: `28d35d7cc392eb4db2c30796b17d084c9e9376a85a44c8f7c1f0fe3b9ed916d3`
  - Git blob: `698c72f1e737cd90170db3fde17c7f5af6781e01`
- Focused proof: `tests/frontierContinent.test.js`
  - SHA-256: `808dce16ea35818f9c64bf0e9494b91ca5075f4b6bead481dd747907e448c41b`
  - Git blob: `d6b1757f52ee6c3f0a87cdeecfe0c55e6dc4a2be`

The frozen authored outline spans `x = -3700..2300m` and `z = -4400..2600m`. A 25m cell-center sample measured `28.9575km²` of land. The outline supplies the broad southeast gulf, unequal southern arms, asymmetric western mass, and tapered northeast headland accepted by the R3 independent silhouette review at 8.3/10.

## Geometry contract

- The authored branch uses exact nearest-segment Euclidean distance, point-in-polygon sign, and the nearest edge's inward normal. Strict comparison gives deterministic ties.
- Default-world vertex variation is deterministic, bounded to 24m, and keeps authored extrema and protected gulf controls fixed.
- The complete previous radial continent remains an expansion floor. The public coast field is a 24m rounded maximum of the authored and legacy fields, with at most 6m of union bulge. Therefore `coastDistance` is exact signed polygon distance where the authored edge owns the result, but retains radial-distance semantics where the legacy floor owns it; normals blend only inside the union transition.
- Shelf, water depth, land/content-land, terrain omission, and footprint APIs retain metre-based semantics.

## Focused proof

`node --test tests/frontierContinent.test.js` passed 7/7 in 498.053ms. It covers the 6×7km extrema and sampled area, a concave ray with multiple land/water crossings, deterministic seed variation and outline validation, complete sampled legacy-envelope preservation plus named sites, increasing signed distance along the reported inward direction, shallow/shelf/deep water bands, full footprint margins, and complete-triangle terrain omission.

## Sampler measurement

The pre-index comparison used a warmed Node process and four passes over a representative terrain grid (68,244 calls). The copied legacy radial sampler measured about 47–50ms; the direct authored edge scan measured about 95–100ms. This justified the private exact 400m cell candidate index and preclassified interior cells.

The frozen R3 sampler was then warmed and measured over four passes of a slightly larger bounds-covering 50m grid (74,676 calls), seven samples sorted by elapsed time. Median elapsed time was 77.81ms. The grids differ, so these figures establish order of magnitude and removal of the material direct-scan regression rather than a strict microbenchmark ratio. They are local JavaScript timings, not native frame-time evidence; root-owned terrain publication and native travel remain the integration authority.

## Scenery expectation closure

The aggregate's two scenery failures were stale coast-compatibility expectations, not production regressions. The frozen `tests/frontierScenery.test.js` used for the focused closure has SHA-256 `cb091f3343d12b99bc072f22af916ee600b0096b08558f8d7fa580b5bea72f8f` and Git blob `3359fce2e3495bddb59b17ad5929b95e53006a16`.

- The chunk `6,2` contour now admits seeds `0,2,3,4`; its terrain-dependent admission correctly omits the fifth old slot. The test still proves every admitted prop has a dry full footprint and supported ground, the two two-stone clusters leave an approximately 17.15m central opening, their approximately 24.19m span reads along the shore, and removing the Fen-stone asset prevents its use while retaining trail stones.
- The protected starter and Skybreak residency counts and exact selection hashes remain unchanged. The broader coast residency remains deterministic, infill-free, and at 20 selected props, but its exact legacy hash was intentionally retired. Its new `f2c:s:6:4:seed-6` witness at approximately `(319.269, 213.288)` moved from `-39.497m` under the legacy radial coast to `12.596m` inside the authored union and passes the real scaled dry-footprint check. This establishes why the authorized expansion legitimately changes the wider coast-window identity set instead of merely replacing one expected hash with another.

Focused command: `node --test --test-name-pattern="coastal stone slots|protected starter and Skybreak" tests/frontierScenery.test.js`. Result: 2/2 passed in 5106.598ms. No production source changed for this closure.
