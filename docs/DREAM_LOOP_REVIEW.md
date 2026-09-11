# Dream Loop art and landscape revision

Status: implementation and independent visual review in progress. This document records evidence, not owner playtest acceptance.

## Owner direction

Chris's September 10 requests authorize blocky, high-contrast matte art with minimal shading and no reflections; readable mobile UI with spacious single icon containers; landscape presentation; a lower, fixed-pitch orbit camera controlled by dragging the right side; and movement relative to the camera's horizontal heading. Orbit alone must leave the idle player facing unchanged.

The later approved human explorer sheet is the master style for all 3D models. Direct mesh construction and Blender are both permitted. The woodland and violet-world references guide environment composition and biome identity. Their invented text and extra systems are not gameplay requirements. After the creature loop stalled, Chris chose to keep the reference target and change approach; do not treat the rejected angular Mossling study as a new baseline.

## Workflow and targets

Installed `achimala/dream-loop` locally and used its Pro workflow. Generated targets use real product captures and supplied reference images. Independent judges score composition (3), lighting (3), materials (3), details (1). Pass requires at least 8/10 and acceptable measured performance. Generated targets are aspirations; only actual browser captures demonstrate the build.

Evidence lives under ignored `.dream-loop/`: immutable baseline captures, generated targets with provenance, asset galleries, and judge verdicts. Earlier portrait world/UI scores (7.4/8.1) are historical because the owner subsequently changed references, player, icon treatment, orientation and camera. New landscape and asset-family reviews supersede them.

## Complete asset coverage

The inventory contains 58 editable library assets, including 14 currently unplaced assets available in Author. Coverage must include all of them, plus the runtime visual families below.

| Family | Coverage | Status |
| --- | --- | --- |
| Explorer/action | Human front/rear, animated limbs, pack, field tool | R13 7.9/10; target identity is present, but broad sleeves and slab-like body volumes still need a large-form pass. |
| Camp/structures | Pod, workshop, sanctuary, lantern, crate, bench, chest, waygates, launch pad | Revised target boards and meshes; independent outpost score 6.6/10. |
| Ecology/resources | Three canopy variants, redwood, heartwood, mushrooms, reeds, lily, berry bush, ore, crystal, blossom, fern, flowers, grass | Revised, but the latest ecology/resource family has not cleared its visual gate. |
| Landmarks | Spire, cinder bloom, wind needle, cloudflower, ruin arch/path, vault barrier, trail stones, fallen log, pebbles | Revised target boards and meshes; independent score 4.6/10. |
| Creatures | Four companions, Thornprowler, Cinderjaw, Heartwood Guardian | Clean Mossling input is staged for a Blender-led approach; rigs and animation are still absent. |
| Library construction/tools | Furnace, table, chair, floor, wall, doorway, gear, pickaxe, sword | All 58 editable library assets have boards and revised meshes; buildables remain 4.5/10. |
| Drops | Wood, stone, fiber, berries, ore, crystal, wildflower | Revised as part of the library pass; fresh independent family acceptance remains pending. |
| Builtin runtime visuals | Harvest tree/rock/fiber and remnants; fences/resonator; platform/obstacle/ladder; thorn bed/parkour marker; fallback gate/pad/chest | Revised target boards and meshes; independent score 4.4/10. |
| World/effects | Terrain edge/path/water, instanced ground foliage/flowers/stones; combat/projectile/ability/harvest effects and readable indicators | Matte ground/foliage and static batching improved; final visual and performance sweep remains. |

Author/debug gizmos are not game art and remain functional editor controls.

## Validation

Current automated checkpoint: `npm test` and `npm run verify` pass with 636 tests; world synchronization and campaign checks pass; the validated submission directory is 25,001.7 KB; and `npm run zip` produces a 7,448.3 KB ZIP, within the 35 MB limit. Native browser checks cover fixed camera pitch/distance during successive yaw and height changes, input exclusion while disabled, simultaneous joystick/orbit ownership, no attack from right drag, ordinary gathering/extraction/bonding/save, Author/export/isolation, and static-prop fade. The package offline check still needs a fresh run after the latest visual revision.

## Current visual checkpoint — September 10, 2026

The landscape UI now passes at **8.4/10** in fresh 844×390 and 932×430 coarse-pointer captures. Its individual 68 px controls, labels, touch instructions, external harvest badge, and companion-icon update guard are evidenced in `.dream-loop/ui-current-verdict.md`.

The explorer is still **7.9/10** in the independent R13 verdict. It remains visually coherent and has no regression, but must not be called complete before its sleeve-to-leg silhouette becomes more naturally tapered. Structures remain below the Dream Loop threshold: outpost 6.6, buildables 4.5, landmarks 4.6, and built-in runtime 4.4. Earlier ecology, resource, and small-prop verdicts were also below threshold and have not received a fresh accepting review after the latest revisions.

The paid Tripo trial previously authorized with a $3 ceiling is now paused at Chris's direction to use Blender. No paid task or upload was made. Native visual control is installed and has been used to inspect the editable Mossling Blender scene in Blender 4.5.3; no plug-in was installed. The staged Mossling image is reference input only, not a shipped game asset. A rigged creature model and real walk/idle/attack/hurt animations remain open work, as does mobile performance validation.

Desktop browser mobile emulation does not establish real-phone thermal/GPU behavior or thumb comfort. Chris's ordinary phone playtest remains the acceptance authority for those perceptual requirements.
