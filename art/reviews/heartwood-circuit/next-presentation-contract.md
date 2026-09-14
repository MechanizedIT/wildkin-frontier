# Provisional next presentation contract

Status: **planning only**. This is a reversible native A/B study for shared presentation. It does not admit new art, alter the current Heartwood checkpoint, or replace the recommended Ironspine gameplay batch.

## Exact owners and locked boundaries

- `src/presentation/visualStyle.js` owns the shared light values. `src/game/createScene.js` constructs the single hemisphere, sun and fill lights from them; `src/presentation/frontierShadows.js` owns the player-following 18 m / 1024² sun-shadow setup.
- `src/game/createRenderer.js` owns sRGB output, `NoToneMapping`, exposure 1, DPR cap 2 and `PCFShadowMap`. These stay fixed in this first A/B.
- `src/world/frontierChunkRuntime.js` owns terrain mesh material and the separate 96-per-chunk terrain-foliage field named `frontier_groundcover`. Terrain is rough flat-shaded `MeshStandardMaterial`; terrain foliage is unlit, double-sided `MeshBasicMaterial` with `toneMapped:false`, with its existing regional/Fungal/Caldera instance colors.
- `src/world/frontierSceneryVisual.js` owns scenery low props and the separate bounded grass layer named `frontier_scenery_ground_cover`. Both use lit rough flat-shaded `MeshStandardMaterial`; scenery grass is capped at 640 clusters and already receives its own Fungal/Caldera color transforms.
- `src/assets/modelAssetRuntime.js` owns imported canopy response through flat-shaded `MeshLambertMaterial`.

The A/B changes only `FRONTIER_LIGHTING_CONFIG`. Terrain/scenery recipes, grass counts, transforms, geometry, instance colors, palettes, fog, camera, renderer, tone mapping and shadows remain byte-identical.

## Native A/B

Use one temporary constants patch that can be reverted as a single edit:

| Variant | Sun | Sky | Fill | Other state |
| --- | ---: | ---: | ---: | --- |
| A — shipping baseline | 3.4 | 0.9 | 0.25 | Current colors and all locked boundaries above |
| B — balanced light | 2.8 | 1.05 | 0.25 | Same colors and all locked boundaries above |

Capture both variants at the same portrait viewport, DPR, player transform, camera transform and settled residency in three recognizable views:

1. Heartwood starter: the new tree/low-plant circuit with player, path and canopy undersides visible.
2. Fungal Hollow: the ordinary-camera route fork/bank with mushrooms, low tufts and Thorn approach visible.
3. Caldera: the south breach or first mineral shelf with ember dressing, scorched tufts and dark ground visible.

For each habitat retain one full-scene A/B pair. Also capture two diagnostic B frames by temporarily hiding, then restoring, the named meshes `frontier_groundcover` and `frontier_scenery_ground_cover` one at a time. These visibility frames diagnose which grass owner causes a mismatch; they are not art-admission evidence and require no source change.

Judge each full-scene pair for player/ground/prop separation, readable canopy or rock shadow faces, preserved habitat palette, and phone-scale route readability. Score the two grass paths separately: terrain foliage should not be credited with a lighting improvement because its Basic material is unlit, while scenery grass and low props will respond to B. Record identical-frame timing and confirm unchanged resident, canopy and grass-cluster counts.

Choose B provisionally only if it improves value separation in at least two habitats, does not wash out or recolor the third, and does not make the lit scenery grass visibly detach from the unlit terrain foliage in any view. Otherwise restore A. Allow at most one constants refinement after B. A later tone-mapping or shadow-filter experiment is a separate A/B from the restored winner; do not stack it into this study.

## Three biggest pitfalls

1. **Treating both grass systems as one material.** Global light changes affect the Standard scenery grass but not the Basic terrain foliage. A combined “grass looks better” verdict can hide a worse seam between the two owners.
2. **Trading one habitat's palette for another's.** More sky fill may help Heartwood while flattening Fungal teal/violet or contaminating Caldera ochre/charcoal. Admission requires all three locked views, not an average or a Heartwood-only win.
3. **Comparing different shadow/residency states.** The shadow frustum follows the player and streamed residents affect the frame. Capture only after the same residency has settled, with exact player/camera transforms and counts recorded; otherwise lighting, shadow movement and content changes are confounded.
