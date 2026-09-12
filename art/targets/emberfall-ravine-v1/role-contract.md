# Emberfall Ravine V1 - role and layout contract

The numeric plan and role-audit.json override incidental image detail. The target expresses composition and terrain mass only. It does not add, remove, rename, relocate, or reclassify gameplay.

## Required layout read

- Current 120 by 120 meter bounds remain. Image top is north / world -Z.
- The south mouth stays low and open around entry_section_3 (0,46) and gate_section_3_to_2 (0,51).
- The central forge ravine remains a broad low 24 to 30 meter encounter/harvest floor, not a narrow slot canyon or a paved road.
- One irregular connected west ridge rises to about 12m, with a wide grade from the south-west and a separate inner descent to the low foundry. It is not a stack of repeated equal shelves.
- One irregular connected east plateau rises to about 16m. Its existing Cinder Shelf Cache is on a broad 12m western shoulder at (28,8), with a separate north-east continuous descent to the gate approach.
- The north saddle stays open around gate_section_3_to_4 (0,-49). There are no new gates, caves, or shortcuts through terrain.
- The north-west foundry island remains low, sheltered, and open to the beacon/cache/vault; new terrain must blend down before its protected footprint.

## Protected gameplay authority

Preserve every audited stable ID and X/Z in .dream-loop/emberfall-ravine-v1/role-audit.json. Supporting terrain Y may be deliberately rebased only through the shared terrain/support transaction.

Anchors and rewards:
- entry_section_3 (0,46), gate_section_3_to_2 (0,51), gate_section_3_to_4 (0,-49), wp_section_3 (-17,23), beacon_section_3 (-30,-22).
- chest_secret_section_3 (-17,-10), chest_parkour_section_3 (28,8), chest_emberhorn_secret (-25,-32).
- Preserve chest types, tables, refill state, rewards, gate requirements, waypoint/run spawn, and extraction behavior.

Ordinary nodes:
- tree_section_3_01 (-12,14), rock_section_3_01 (12,13), fiber_section_3_01 (12,4).

Harvestable props:
- prop_s3_ore_a (10,-10), prop_s3_shrine_ore (-22,-12), prop_s3_gate_ore (-4.1,-15.1), prop_s3_route_ore (4.8,-5.6), prop_s3_arrival_ore (5.1,12.5), and prop_s3_crystal (-15,-10).
- Keep their current harvest role, chunks, respawn, collision, and pickup contract. Scenic crystals/blooms in the target do not authorize additional harvestables.

Actors:
- wildkin_emberhorn_1 (-4,12), wildkin_emberhorn_2 (10,6), wildkin_cinder_1 (-10,-6), wildkin_cinder_2 (10,-12).
- Keep these four and only these existing actor IDs. The target does not authorize an added creature, altered tame/combat behavior, or a high-ground encounter.
- Preserve their broad low shared court, warning sight lines, lateral exits, and resource clearance.

Foundry/vault:
- Preserve prop_s3_barrier (-26.8,-33.2) and every prop_foundry_habitat_* root and support in the audit. This includes shelves 0-6, support pieces, mineral groves, recess left/right/back/lintel, lower/upper landings, and ground details.
- Keep their transform/support relationships and existing solid flags. Do not bury the recess, make the lintel a new storey, or use the target to add a foundry building.
- Keep low direct approaches to the beacon, Cinder Cache, and Ember Forge Vault.

## Generated-image exclusions

The image contains decorative mineral clusters, small cyan accents, a few dark tiny silhouettes, and a small dark rectangular object near the east lower shoulder. These are visual shorthand only. They are not new chest, resource, creature, cache, building, path marker, or interactable requests. Resolve them as ordinary permitted scenery or omit them.

The target's frequent small rock/bloom accents must not be implemented as repeated climb shelves, new collision obstacles, or a substitute for the two major shared-terrain masses. The full high perimeter-like silhouette is an artistic framing cue, not permission to alter containment, expand the bounds, or encircle the playable floor with inaccessible walls.

No bridge, tunnel, water, waterfall, lava, overhang, cave, platform, player, UI, text, reward icon, new asset family, or new system may be inferred from this image.

This contract accompanies target.png for independent review and any later implementation. The target cannot prove actual height-field support, route grades, collision, camera retraction, companion traversal, performance, or phone readability.
