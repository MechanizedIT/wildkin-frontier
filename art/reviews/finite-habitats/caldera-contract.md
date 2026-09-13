# Provisional Emberglass Caldera implementation contract

## Player-facing goal

Emberglass Caldera should become the first habitat whose identity is more than the temporary Ironspine base grammar. Travel into its 5.73–5.75km² finite region should shift to low charcoal volcanic shelves, rust-red drainage, sparse ember blooms, and occasional volcanic stone before the player reaches one compact, unmistakable breached crater. These broad regional cues must remain visible beyond the landmark's influence; the 116×128m crater is one outing inside the habitat, not the complete habitat. The outing culminates in a supported bowl containing useful crystal and iron, one territorial Emberhorn, and a clear route for fighting, dodging, harvesting, or leaving.

The crater is a local landmark inside the broad habitat. It should not be shrunk merely so the full ring reads from the follow view: the normal camera has a 120m far plane, about 42° pitch, 52° vertical FOV, and roughly 9.27m portrait follow distance. That view should frame the near breach shoulders and bowl resources within roughly 5–20m of the player. The full ring and distant rear rim are overview, movement, or deliberate orbit reads.

This contract is provisional. It does not authorize source work, change the active docs, or claim the other nine topology-only regions are finished habitats.

## Smallest ownership split

| Owner | Files | Responsibility |
|---|---|---|
| Caldera terrain/profile | New `src/world/frontierCaldera.js`, `src/world/frontierTerrain.js`, focused `tests/frontierCaldera.test.js` and terrain integration assertions | One pure fixed-site profile, broad volcanic terrain/palette, local crater/rim/breach math, and returned feature metadata. |
| Scenery | `src/world/frontierScenery.js` and its focused tests | Existing streamed selection and instancing path; a small fixed crater composition plus Caldera-aware ordinary choices and complete footprint/route exclusions. No new visual runtime is expected. |
| Resources | `src/world/frontierEcology.js` and focused ecology tests | Stable finite crystal/iron placements through existing harvestable assets, IDs, slope/land checks, depletion, and residency. |
| Encounter | `src/world/frontierWildlife.js` and focused wildlife tests | One stable crater Emberhorn source plus Caldera-weighted broader wildlife. Existing creature runtime, taming, capture, combat, and collider ownership remain unchanged. |
| Root integration | Existing terrain/chunk/scenery/ecology/wildlife runtimes and native evidence | Ordinary approach, full-window terrain physics, encounter/mining/save continuation, portrait target and at most three visual passes. No new frame loop or coordinator. |

Do not edit `resourceSystem`, creature physics, progression, save schema, `main.js`, or chunk streaming unless integration reveals a concrete broken existing seam. The current systems already own the live mineral cuboids, creature capsule, depletion/capture state, residency, and transactional scenery publication.

## Pure Caldera profile

`frontierCaldera.js` should export one frozen config and one pure sampler. The sampler receives world coordinates, the resolved world/seed, the local pre-Caldera terrain height, and the finite region's `emberglass-caldera` habitat weight. It returns bounded height/color influence plus diagnostic feature metadata. It owns no scene, physics, resource, creature, save, or cache state.

Use the existing `habitatWeights['emberglass-caldera']` as the broad boundary blend. This gives the entire finite region a recognizable volcanic base while retaining the current compact distance-gap transition at neighboring habitats. Inside the region, use low-frequency seeded relief to make broad, walkable charcoal shelves, approximately 6–24m high, with restrained local relief. Do not reuse the high Ironspine ridge result as the visible Caldera core merely because the catalog's temporary `baseKind` remains `ironspine` for sibling compatibility.

At the fixed site `(850,-2000)`, layer one authored crater over that broad grammar:

- Outer smooth influence ellipse: about **58m east-west radius × 64m north-south radius**. This is a 116×128m transition footprint, not the visible crest diameter.
- Readable rim crest: about **44–47m × 50–53m radius**, giving a roughly 90×104m ring that fits the close portrait view.
- Bowl floor: about **27–31m × 31–36m radius**, with at least a 24×28m central area at slope `<= 0.12`.
- Bowl target height: roughly **9–11m** in the default world with no more than about 0.6m seeded floor variation. The current temporary terrain is 8.634m at the site, so this avoids an arbitrary vertical jump.
- Rim crest: roughly **14–17m above the bowl**, with uneven shoulders rather than a uniform torus. Keep ordinary traversable shoulders below about 0.45 slope; deliberately steep outer rim faces may approach 0.70 where no route, resource, or home is admitted.
- Breach: face **south (`+Z`)**, so a northbound player looks through it toward the nearby bowl content and discovers the rear rim through forward movement or orbit. Cut a 12–16m readable throat through the south crest, widening toward a 20–24m outer approach. Give the central 8m lane a 28–36m ramp at slope `<= 0.28` and avoid a lip at either end.

Use smooth radial/elliptical masks with zero-slope outer fades. A simple asymmetric ring mask minus one smooth south-facing breach mask is enough. Add two or three bounded shoulder multipliers or seeded low-frequency terms for unequal crest heights; do not build a general spline, polygon, crater catalog, or erosion system.

`frontierTerrain.js` should apply the broad Caldera target after ordinary finite-region height blending and before the existing Camp/local-landform/coast expression. Full sampling and `sampleFrontierHeight` must call the exact same expression. Blend the volcanic ground palette through the same habitat weight, then retain existing landform and coast color priority. Add separate neutral metadata such as `habitatFeatureKind: 'emberglass-caldera'`, `habitatFeatureZone: 'approach'|'rim'|'breach'|'bowl'`, and a smooth feature influence. Do not overload the existing Skybreak-specific `surfaceKind`; current scenery and ecology use that field for special admission rules.

## Portrait composition and fixed outing layout

The natural approach is northbound from the south. Use feet `(850,-1935)` with yaw `0` as the ordinary-arrival baseline witness and roughly `(850,-1962)` with the same yaw as the integrated portrait composition witness. The native movement convention is `W = (-sin(cameraYaw), -cos(cameraYaw))`, so yaw `0` faces north (`-Z`). Keep the normal 42-degree portrait follow camera with no top-down orbit. At default portrait zoom the camera sits about 6.9m behind and 7.1m above same-height ground; the top vertical ray is only about 16° below horizontal (`42° - 52°/2`) and meets flat ground about 24.7m ahead of the camera, roughly 18m ahead of the player. Therefore the inner witness should prove the breach shoulders and crystal, iron, or Emberhorn silhouettes within about 5–20m. The rear crest near `z=-2052`, about 90m ahead, is not a default-view requirement even though it is inside the far plane.

Keep the central lane between approximately `x=846..854` visually and physically open. Provisional layout, adjusted only after actual support sampling:

- `asset_ember_spire`: one scale 1.15–1.30 near the left breach shoulder around `(832,-1962)`, one scale 1.30–1.50 on the rear-right shoulder around `(874,-2025)`, and at most one scale 0.8–1.0 secondary silhouette around `(820,-2020)`.
- `asset_ember_bloom`: two or three small groups at spire feet and outer shoulder edges. They remain nonblocking and outside the chase lane.
- `asset_pebble_cluster`: two or three low groups at the breach corners, angled toward the opening. Use at most one `asset_trail_stones` patch if its pale moss does not dilute the volcanic read. Omit `asset_fen_stone` and `asset_drop_stone`.
- `asset_crystal`: one harvestable node near `(840,-1980)`.
- `asset_iron_ore_rock`: one harvestable node near `(862,-1975)`.
- `asset_wildkin_emberhorn`: one territorial home around `(856,-2005)`, with its full 4.5m roam disk and 10m leash on the bowl floor.

The mineral nodes are separated from each other, the breach lane, and the Emberhorn home. Their existing rewards—four crystal-shard chunks and five iron-ore chunks—make the trip useful without a new loot or quest authority. Both resource colliders disappear on harvest, so neither may be required to define the only route. The Emberhorn must retain its existing 12 health, 2.1 speed, two damage, warning/charge/recovery behavior, and reinforced-tether taming flow.

The spires are streamed visual scenery and remain nonblocking in this slice. Terrain owns the solid rim and breach. Add actual plan radii to the scenery footprint table before admitting the new kit: approximately 1.70m × scale for the spire, 1.02m × scale for the bloom, and 0.66m × scale for the pebble cluster. Chosen spire anchors must pass support at that complete radius; move them to supported shoulder benches rather than bypassing the check. A shared pure breach-lane distance helper may live with the Caldera geometry so scenery, resources, and the fixed encounter can validate the same opening, but it must not become a generic placement framework.

## Existing generator integration

- **Scenery:** give the fixed crater group stable disjoint IDs and existing staged priority. Suppress ordinary canopy/mushroom/reed infill only in the rim/bowl core, then allow the current bounded generator outside it. Across the broader habitat, use Caldera habitat weight to favor pebbles, sparse blooms, and occasional spires without filling every chunk with the same landmark. Preserve current near/outer/canopy/total caps, complete-cache behavior, visual-asset admission, neighboring forage/wildlife/place exclusions, and transactional physics publication.
- **Ecology:** use disjoint finite placement indices beyond current ordinary, Skybreak, and regional-place ranges. Admit the crystal and iron only when their actual assets are harvestable, their complete footprints are dry/supported, and their owner chunks match. Keep ordinary seeded resources outside the crater core; inside, suppress trees/fiber that obstruct the bowl rather than creating a second resource generator.
- **Wildlife:** the central owner chunk always attempts the one authored Emberhorn before random regional wildlife and suppresses another random creature in the crater core. Broader Caldera cells may continue through the existing sparse wildlife recipe, using habitat identity to favor Emberhorn rather than relying only on temporary Ironspine weight. Preserve home-disk land/support/place checks and resident caps.
- **Persistence:** reuse `makeFrontierResourceId`, generated wildlife source IDs, current depletion records, capture records, residency reconciliation, and literal save reload. Add no Caldera completion bit, chest, objective, or reward ledger.

## Focused proof before native review

1. **Profile math:** deterministic replay and seed variation; exact outer zero; bounded height; no NaN; continuous height/color at the habitat and crater fades; unequal crest witnesses; south breach lower than both shoulders; central lane and bowl slopes; announced dimensions.
2. **Terrain authority:** full/height-only parity, shared chunk-edge vertices across every touched 50m chunk, terrain mesh/query equality, same Rapier triangle surface, and unchanged samples just outside the feature. The 2m normal terrain grid should give at least six vertices across the breach throat; do not add a special mesh unless native traversal proves it necessary.
3. **Scenery:** stable IDs/transforms, exact admitted assets, missing-asset skips, complete scaled support, open lane, mineral/home/place exclusions, caps, cache replay, failure retry, and disposal through existing runtime paths.
4. **Resources and encounter:** exact fixed source IDs, one crystal/one iron, partial depletion and reload, one Emberhorn without a core duplicate, full home/leash support, normal combat/harvest/capture removal and reconstruction.
5. **Integrated story:** ordinary movement from volcanic approach through WALK over the breach into the bowl; near shoulders and useful bowl content read at arrival, while forward movement or orbit reveals the larger rim; Emberhorn warning/charge has room; player can harvest both node types and leave through the same breach; health, inventory, depletion/capture, active run, and dry supported feet survive developer and portable reload.

## Three-pass target strategy

1. **Terrain pass:** capture an overhead diagnostic and the actual `(850,-1962)` portrait view. Use the overhead or an explicit orbit to judge the asymmetric full rim. Use the default portrait view to judge the open breach, near shoulders, first bowl floor, and traversable slope. Fix profile math before dressing.
2. **Composition pass:** add the fixed spires, blooms, rubble, two minerals, and Emberhorn through their real runtime owners. The portrait must show a foreground breach funnel, mineral choice and creature in the middle distance, and an uneven rear crown without hiding the player or HUD.
3. **Polish pass:** adjust only existing colors, scales, density, and supported transforms. Remove repeated needles, pale moss, or clutter from the lane. Select the strongest usable result honestly; if it remains below the visual gate, record the debt rather than adding a fourth round or an unproved hero asset.

The target image should depict what the 42° follow camera can actually frame, rather than treating the 120m far plane as guaranteed ground visibility. A full ring belongs in an atlas, overhead diagnostic, or disclosed orbit view. Large distant volcano cones, lava horizons, smoke systems, glowing dynamic lights, or architecture outside the residency window are unsuitable promises for this slice.
