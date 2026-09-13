# Emberglass Caldera terrain receipt

## Result

The finite Emberglass allocation now has a distinct low volcanic shelf profile and one fixed breached crater. `frontierCaldera.js` is pure and cache-free. `frontierRegion.js` applies its final height once using the existing normalized habitat weight, then blends the volcanic color target once by that same weight. `frontierTerrain.js` consumes the region height through its existing Camp, landform, coast, mesh, height-query, and collider-field expression.

Zero Caldera weight is an exact numeric no-op. Camp/starter/Skybreak reserve height, color, and grammar weights retain their existing output; new feature metadata is neutral there and everywhere outside the crater.

R2 replaced the washed-out tan result with a linear charcoal/slate field broken by deterministic 6–15m rust patches. R3 adds two unequal low buttresses in the ordinary portrait camera's useful depth while preserving a four-metre supported route and two exact prop-support toes. Full Caldera color bypasses the terrain pipeline's former 12% legacy-color wash; every non-Caldera habitat retains the existing 88% regional blend.

## Frozen geometry/API

- `FRONTIER_CALDERA_CONFIG`: center `(850,-2000)`, outer radius `58×64m`, rim `46×52m`, bowl `29×34m`, default bowl target `10m`, rim rise `16m`, ramp half-width `4m`, clear-lane half-width `2m`.
- The existing outer inner-shoulder config remains unchanged. R3 near buttresses occupy only `z=-1974..-1964`: left center `(845.5,-1969.5)`, `2.5×5.5m`, `2.8m` nominal rise; right center `(854.5,-1970.25)`, `2.5×4.75m`, `2.05m` nominal rise. Added shoulder influence is exactly zero across `x=848..852` and throughout the fixed Emberhorn 10m refuge.
- Exact zero-rise support toes are left `(847.05,-1968.5)`, radius `.95m`, and right `(852.85,-1969.5)`, radius `.77m`. A `1.1m` smooth feather removes nearby buttress rise and height-matches each footprint to its existing breach floor, without adding a ledge at the lane edge.
- `sampleFrontierCalderaFeature(x,z)`: cheap fixed geometry only. Returns outer/rim/bowl/ramp influence, zone, ramp membership, and point lane overlap. Outside the outer ellipse its influences are zero, zone is null, and flags are false.
- `overlapsFrontierCalderaClearLane(x,z,radius=0)`: true when a point or candidate disk intersects the reserved four-metre lane; content admission must reject it.
- `sampleFrontierCalderaProfile(x,z,{seed,baseHeight,habitatWeight})`: returns final once-blended height, volcanic color target, weight, and feature geometry.

Terrain publishes `calderaWeight`, `habitatFeatureKind`, `habitatFeatureZone`, `habitatFeatureInfluence`, `habitatFeatureRamp`, and `habitatFeatureClearLane`, so scenery and life consumers do not resample the region.

## Measured default field

- Bowl center: `10.299m`; sampled cardinal rim rise: approximately `14.2–14.6m` above the bowl.
- Maximum sampled slope across the full eight-metre ramp: `0.268`; central lane is gentler. Maximum sampled slope across the central `24×28m` bowl: `0.011`.
- Crystal `(846.5,-1976)`, radius `1.30m`: support passes slope `0.12`, y `10.344m`.
- Iron `(854,-1980)`, radius `0.93m`: support passes slope `0.12`, y `10.297m`.
- Emberhorn home `(850,-1986)`, full `10m` disk: support passes slope `0.12`, y `10.314m`.
- R3 left/right near-buttress centers are `12.969m` and `12.375m`, respectively `2.269m` and `1.721m` above the adjacent route. Maximum sampled slope over the four-metre clear route is `0.173`; maximum central-bowl slope remains below `0.12`.
- The left support toe is `10.727m` across its full `.95m` footprint and the right is `10.644m` across its full `.77m` footprint. Both pass canonical footprint support at maximum slope `.12`.
- R2 route color near `(850,-1970)` is approximately linear RGB `(0.027,0.033,0.043)`. The fixed crystal witness lands in an irregular rust patch around `(0.078,0.040,0.034)`. Global linear-to-sRGB conversion and the existing 62% ground-paint overlay remain unchanged.

## Focused proof

```powershell
node --test tests/frontierCaldera.test.js tests/frontierRegion.test.js tests/frontierRegionCatalog.test.js tests/frontierTerrain.test.js
```

The final focused runs passed Caldera 6/6 and region/terrain 32/32. The proof covers deterministic replay/seed variation, exact zero weight, smooth outer fade, lane intersection semantics, broad 6–24m shelves, locally varied charcoal/rust palette, asymmetric near-buttress mass, exact exclusion from the four-metre route and 10m refuge, both complete prop footprints, bowl/rim/breach dimensions, support and slopes, full versus height-only parity, and exact vertices/colors across all touched 50m chunk borders.

The existing crystal, iron, and full Emberhorn refuge support checks remain green. Final R3 scenery placement and native projection are separate owner/root evidence; terrain did not weaken support admission or edit sibling scenery.

## Limits

This proves pure terrain geometry and metadata. The locked 8/10 image remains a target, not an achieved visual score. Ordinary portrait readability, scenery projection, real Emberhorn behavior, mineral persistence, physical traversal, and packaged performance remain integration/native evidence owned by the other slice workers and root.
