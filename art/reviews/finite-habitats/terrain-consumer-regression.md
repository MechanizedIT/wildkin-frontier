# Finite habitat terrain-consumer regression

## Command

```powershell
node --test tests/frontierChunkRuntime.test.js tests/frontierIntegration.test.js tests/frontierContinent.test.js tests/frontierCoastIntegration.test.js tests/frontierRegionalPlace.test.js tests/frontierLandformVisual.test.js tests/frontierTextureColor.test.js
```

## Initial unchanged result

**41/45 passed; four failed.** All four failures were investigated before changing a witness.

- `frontierChunkRuntime`: the former dry point `(-640,-335)` now correctly belongs to the finite Skybreak/`ironspine` allocation instead of an infinite generated Sunscar province.
- `frontierChunkRuntime`: the former `(-99.904,219.680)` mixed point is now a full Lush core and admits 96 deterministic grass instances rather than 30.
- `frontierRegionalPlace`: the old `(-5,-2)` bloom owner now correctly admits a Lush root cache under the new macro allocation.
- The old bloom composition support check consequently inspected that grove with bloom footprint assumptions.

## Meaningful witness updates

- Dry foliage now uses the authored Sunscar core at `(-1850,50)` and retains the same dry tint, scale, cap, and open-space assertions.
- The grass blend uses an actual finite Lush/Sunscar ecotone at chunk `(-22,4)`, centered near `(-1075,225)`. Its deterministic count is 52. The near-Camp point remains a separate reserve-fade witness, and the Rootbound approach at chunk `(-3,6)` retains its current deterministic 96-instance count and scale assertions.
- The default supported Sunscar bloom witness is now chunk `(-34,-4)`, center `(-1679.0894256704696,-175.14118808092113)`, yaw `3.075761204687521`, layout `fan`. Its existing asset recipe, one-owner rule, whole support, open approach, and solid-separation assertions remain unchanged.

## Real defect and repair

The meaningful-witness run reached **44/45 passed**. Streaming lifecycle, physics publication, coast, controller traversal, continent, landform visual, region-place admission, texture boundaries, and color interpolation passed.

The remaining failure was a production defect, not an obsolete witness: terrain groundcover could overlap finite forage because `frontierChunkRuntime.addFoliage` did not query forage footprints.

At chunk `(-22,4)`, grass instance 17 is centered at `(-1088.9696083,240.0134392)` with scale `0.7272067`. Rock `f1:r:-22:4:4` is centered at `(-1088.4566072,239.8469848)`. Their center distance is `0.5393303m`; the existing measured grass and rock envelopes require `1.4108873m`, an overlap of about `0.872m` beyond the allowed clearance.

The first repair reused the full scenery ground-cover filter. It fixed the overlap but raised this suite from 17.18s to 22.52s (about 31%) because each terrain chunk caused nested forage, wildlife, place, and support recipe work. That version was rejected.

The retained repair samples a 3x3 forage neighborhood only when a fully regional inland, non-Skybreak chunk first has a grass candidate. The array belongs to that one resident build and is released on return; there is no lifetime-growing map or per-frame scan. Candidate grass uses its measured XZ radius and the existing ecology footprint values for tree, rock, fiber, berry, crystal, and iron. Camp/reserve, coast, and Skybreak foliage do not enter the new path.

The lighter full specified run took **20.34s** and passed 44/45; its sole failure was the pre-repair deterministic count assertion (51 admitted versus 52). After recording the new clear counts (51 at the ecotone and 94 at the Rootbound approach), the complete combined grass/forage/grove focused test passed in **3.72s**. The other 44 consumer tests had already passed unchanged in that same light-path run.
