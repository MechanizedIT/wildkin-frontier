# Emberglass Caldera — rotation 1 planning session

Planning ahead only; Fungal remains the active habitat source lane. Fresh native baselines are in `art/reviews/emberglass-caldera/rotation-1/`. No new structural implementation or new route is admitted by this packet.

## Purpose and identity

A charcoal volcanic shelf opens into an unequal breached crater, with rust-colored ground, sparse ember blooms and useful mineral deposits. The explorer chooses whether to approach the territorial Emberhorn while gathering crystal and iron, then retreats through the readable breach. Keep a broad dry travel floor, two unequal near shoulders, and an open mineral/creature view; use clustered rubble and blooms at supported shelf edges. The crater is a local landmark inside the much larger habitat, not its entire identity.

The previous Caldera visit remains visual HOLD 3.8. Its 42-degree camera screenshots and tiny cropped groups are historical. The current 36-degree portrait camera shows both spire groups and minerals, but the central charcoal plane still lacks a convincing shelf/breach composition. Fresh baselines are direction inputs, not a new acceptance result.

## Authoritative owners and constraints

`frontierCaldera.js` owns volcanic height, colors, rim/bowl/breach, near buttresses, support toes and refuge. `frontierRegion.js` and `frontierTerrain.js` consume that shared terrain definition for queries/render/physics. Existing ecology, wildlife, scenery, chunk streaming, resource/pickup and progress owners retain their responsibilities. No new terrain framework, asset loader, gameplay behavior, water, network request, frame loop or save schema.

Preserve the full four-meter clear travel lane (`clearLaneHalfWidth=2`) through the supported breach and its existing broader ramp. Preserve complete mineral footprint support (slope limit .18), the Emberhorn's full ten-meter movement refuge (slope limit .32), stable IDs, encounter behavior and finite rewards. A terrain composition proposal must prove final rendered 2m triangles and the player's .32m footprint; the current mask algorithm is not automatically a locked zero-height-change rule. Preserve accepted widths and outcomes, with ordinary traversal and persistence proof after any regrade.

| Fixed content | Actual source identity | Required role |
| --- | --- | --- |
| Crystal | `f1:r:16:-40:300`, (846.5,-1976), radius 1.3, scale 1 | Finite harvestable mineral; reachable from the left breach edge |
| Iron | `f1:r:17:-40:301`, (854,-1980), radius .93, scale 1 | Finite harvestable mineral with retreat space |
| Emberhorn | `f1:w:17:-40:300`, home (850,-1986), movement radius 10 | Existing territorial warning/charge/recovery; no behavior or taming change |
| Fixed dressing | Nine `caldera-*` staged keys in chunks (16,-40), (17,-40), (17,-41) | Existing nonblocking spires, blooms and pebble groups; terrain owns the solid rim |

Keep the actual footprint/instance sizes, priority, resident/cache caps and ordinary ecology outside the core. Read the old `art/reviews/finite-habitats/caldera-contract.md` as historical design; current source positions and camera above supersede its provisional coordinates and old 42-degree camera.

## Fresh comparison poses

All three portraits use 412×915, FOV 52°, pitch .62831853 radians, effective distance 11.5910795m and unchanged HUD/player scale. See `baseline-captures.json` for settled positions and camera state.

| Pose | Player x,z | Yaw | Question |
| --- | --- | ---: | --- |
| Arrival | (850,-1936) | 0 | Does ordinary travel announce the volcanic approach before entering the breach? |
| Interior / primary breach | (850,-1962) | 0 | Do unequal shoulders, grouped ecology and open floor frame the useful minerals? |
| Destination / bowl edge | (862,-1982) | .982793723 | Is the creature-risk choice and route back visible together? |
| Diagnostic overhead | (850,-2000), 155m overhead | 0 | Are the complete crater, supported breach and local route coherent? |

## Circuit planning and targets

The prior local outing proved mineral pickup, warning/retreat and approximately 82m streamed out-and-back, not a 3–5 minute circuit. A possible extended approach along the existing southern shelf needs an actual triangle/footprint route survey and ordinary timing; no distance or purpose claim is accepted yet. Do not pad the outing with idle time or repeated laps to meet a duration.

Create two high-quality portrait targets from the actual interior and arrival views, then independently select the strongest feasible direction. Keep the actual camera/HUD/player scale, dry charcoal/rust floor, unequal connected low shoulders, sparse clustered blooms/rubble and visible mineral risk choice. No lava river, cinematic horizon, huge cliff wall, fortress or invented creature. Map every defining form to an actual admitted asset/system or a bounded new-asset task after selection. Names alone do not prove a mesh matches. The selected reference must be compared with these same actual poses.

One initial structural pass plus up to two focused repairs applies to this rotation visit after independent plan approval. Earlier closed rounds remain historical; no shader/asset/camera expansion is implied. Required integration checks run once on the eventual frozen source checkpoint; no source change yet.
