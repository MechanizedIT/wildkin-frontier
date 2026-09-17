# Rootbound restart — implementation brief

**Bounded goal:** use the selected Lantern Hollow / Thornstone target to make one 3–5 minute circuit readable through the real portrait camera. Chris explicitly restarted this habitat pass; prior R1/R2 remain historical HOLD evidence. Subsequent owner steering raised the working allowance to three substantial passes (one structural pass and up to two focused repairs), under the project production loop policy. Asset work does not reset it or add another habitat batch.

## Exact matching review poses

Use the same fixed portrait camera configuration for baseline, structural pass, repair, and final review:

| View | Player position | Yaw | Pitch | Effective distance |
| --- | --- | ---: | ---: | ---: |
| Arrival | `(-475, 590)` | `-1.743` | `0.6283185307` | `11.5910795442` |
| Gallery | `(-480, 720)` | `-1.36` | `0.6283185307` | `11.5910795442` |
| Destination | `(-449, 675)` | `-2.30` | `0.6283185307` | `11.5910795442` |
| Overhead diagnostic | `(-425, 650)` | straight down | 225 m above ground | fog disabled; far plane 1000; 1100 × 900 capture |

Arrival and Gallery come from the historical matching captures. Destination is the frozen preimplementation staging amendment recorded in `staging-amendment.md` and matched by `restart-baseline-*.png` plus `restart-baseline-captures.json`; it replaces the historical destination pose for every restarted-pass comparison. The overhead is corrected to its actual independent survey camera rather than inactive follow-camera metadata. It remains diagnostic only; portrait views own perceptual acceptance.

## Five implementable changes

1. **Arrival must point into a place.** At the Arrival pose, retain a broad central floor lane and put one admitted canopy-tall or canopy-spread silhouette at the upper-middle/side edge where it is not hidden by the objective/minimap. Use `ROOTBOUND_CURATED_SCENERY` in `src/world/frontierRootbound.js` and the existing `sampleFrontierSceneryChunk()` admission path. Do not create a giant tree proxy by scaling a current canopy beyond its reviewed bounds.
2. **Turn Gallery into a framed choice.** At the Gallery pose, form a left/right edge from the existing canopy pair and/or fallen log while keeping the middle clear for player plus companion. The lighter wider lane is the safe route; the tighter edge opening toward the destination is the richer route. Terrain relief belongs in `sampleFrontierRootboundProfile()` and must remain within the current 1–3 m local grammar.
3. **Make Lantern Hollow a single readable cluster.** At Destination, place the admitted `asset_fallen_log` with the two `asset_mushroom_ring` instances together on one sheltered edge, outside the center lane. Use a pale/less-saturated floor through the existing Rootbound terrain color profile; do not add emissive/glowing material or a new fungus asset.
4. **Make Thornstone a counterweight, not scatter.** Put the two `asset_fen_stone` instances together at the opposite edge/opening of the Destination pose, leaving an honest route between the fungal/log cluster and the stones. The stone group signals the denser side choice; it must not close the existing clearance, collision, forage, or wildlife paths.
5. **Remove the empty-square failure without re-densifying uniformly.** Use the existing scenery selection/exclusion owners in `src/world/frontierScenery.js` and Rootbound curated data to keep sparse ground cover in the approach, clustered low detail at the two destination edges, and no unrelated blanket scatter inside the circuit. Validate the four exact poses before multiplying instances.

## Existing owner mapping

| Need | Existing owner |
| --- | --- |
| Rootbound local relief and value zoning | `src/world/frontierRootbound.js` → `sampleFrontierRootboundProfile()` |
| Terrain feature metadata/rendered height/color | `src/world/frontierRegion.js`, `src/world/frontierTerrain.js`, `src/world/frontierChunkRuntime.js` |
| Curated canopies/log/rings/stones and clearance admission | `ROOTBOUND_CURATED_SCENERY` in `src/world/frontierRootbound.js`; `src/world/frontierScenery.js` |
| Existing resource/wildlife identity and support | `src/world/frontierEcology.js`, `src/world/frontierWildlife.js` |

No new terrain API, ecology schema, creature behavior, save rule, or rendering loop is authorized.

## Asset decision

**Authorized enabling asset:** one grounded low-poly **Rootbound buttress-canopy anchor**. This is the selected target's one defining unavailable role: a near-camera rooted frame that the existing slim/paddle canopies cannot supply. It is one static scenery asset, not a new biome kit, a Heartroot Crown, or a new interaction.

The asset must be a matte opaque, visibly grounded trunk with three to five broad buttress roots, an approximately **5–6 m** high silhouette, a **5–7 m** maximum lateral footprint, and a restrained sparse canopy above the walking line. Its rooted base, trunk, and branch junctions must read in a normal portrait view. Keep a compact fitted ground collider for its genuinely solid lower mass; do not infer a broad crown collider, a walk-under arch, or a new traversal rule. Keep it within the existing protected route/forage/wildlife exclusions.

Use one clean reference, one serialized asset-forge mesh route, editable source, neutral front/rear/side/three-quarter/ground-contact inspection, game-scale portrait frames, and independent reference/mesh review before runtime admission. Its role is a destination-edge frame/counterweight alongside the admitted fallen-log, mushroom-ring, fen-stone, canopy-tall, canopy-spread, and ordinary low plants. It cannot compensate for missing room relief, both edge clusters, or the open center lane.

**Still deferred:** a hero-scale Heartroot Crown, a family of buttress variants, giant world roots, and all extra target-image flora remain outside this one-asset authorization.

## Deferred aspirations

Dense hanging foliage, vine curtains, glowing mushroom materials, new resources, new Wildkin behavior, a navigation overlay, the Heartroot hero kit, and further Rootbound asset families are deferred. They must not be inferred from the selected concept image.
