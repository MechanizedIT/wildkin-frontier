import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Existing-instance composition only. Call after composeLandscapeArt(world).
// Ruin models, perch geometry, boundary art and new interactions remain separate.
// Keep these explicit IDs: loot claims, ability seals and harvest state own them.
export const OVERNIGHT_HABITAT_MOVES = Object.freeze([
  // Emberfall: arrival silhouettes, clear court, useful foundry return, true gate.
  { region: 'section_3', collection: 'props', id: 'prop_s3_arrival_spire_l', x: -16, z: 35, scale: 1.2 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_arrival_spire_r', x: 1, z: 42, scale: 1 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_shrine_spire_l', x: -23, z: 23 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_shrine_spire_r', x: 20, z: 9 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_shrine_bloom_l', x: -9, z: 19 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_shrine_bloom_r', x: 16, z: 14 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_shrine_ore', x: -22, z: -12 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_pebbles', x: -26, z: -10, scale: 1.4 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_gate_spire_l', x: -7, z: -46, scale: 1.15 },
  { region: 'section_3', collection: 'props', id: 'prop_s3_gate_spire_r', x: 8, z: -48, scale: .95 },
  { region: 'section_3', collection: 'lootChests', id: 'chest_emberhorn_secret', x: -25, z: -32 },
  // Place the temporary old seal behind the chest, outside its open approach.
  { region: 'section_3', collection: 'props', id: 'prop_s3_barrier', x: -26.8, z: -33.2, yaw: Math.PI / 4 },

  // Windscar: separated west habitat and a worthwhile east-loop reward.
  { region: 'section_4', collection: 'props', id: 'prop_s4_arrival_needle_l', x: -18, z: 31, scale: 1.2 },
  { region: 'section_4', collection: 'props', id: 'prop_s4_cloud_a', x: -43, z: 10, scale: 1.2 },
  { region: 'section_4', collection: 'props', id: 'prop_s4_cloud_b', x: -25, z: 4, scale: 1.2 },
  { region: 'section_4', collection: 'lootChests', id: 'chest_skydancer_secret', x: 32, z: -24 },
  { region: 'section_4', collection: 'props', id: 'prop_s4_barrier', x: 30, z: -24, yaw: Math.PI / 2 },
  { region: 'section_4', collection: 'props', id: 'prop_s4_route_crystal', x: 25, z: -9 },
  { region: 'section_4', collection: 'props', id: 'prop_s4_needle_b', x: 44, z: -22, scale: 1.1 },
  { region: 'section_4', collection: 'lootChests', id: 'chest_secret_section_4', x: -44, z: -2 },

  // Heartwood: frame the actual arrival/waypoint; move clutter out of the bowl.
  { region: 'section_5', collection: 'props', id: 'prop_s5_arrival_tree_l', x: -17, z: 48, scale: 1 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_arrival_tree_r', x: 7, z: 46, scale: 1.1 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_waypoint_tree_l', x: -31, z: 25 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_waypoint_crystal_l', x: -31, z: 16 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_heartwood_c', x: -45, z: -9 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_waypoint_root_l', x: -45, z: -13, yaw: Math.PI / 2 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_route_crystal_l', x: -34, z: -18 },
  { region: 'section_5', collection: 'lootChests', id: 'chest_secret_section_5', x: -45, z: -30 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_arena_tree_l', x: -10, z: -16 },
  { region: 'section_5', collection: 'props', id: 'prop_s5_arena_tree_r', x: 24, z: -23 },
].map(Object.freeze));

export function composeOvernightHabitats(world) {
  // Resolve the complete list before mutation: a renamed/missing source ID must
  // fail authoring clearly, rather than silently producing a partial composition.
  const placements = OVERNIGHT_HABITAT_MOVES.map(move => {
    const region = world.regions.find(entry => entry.id === move.region);
    const matches = region?.[move.collection]?.filter(entry => entry.id === move.id) ?? [];
    if (matches.length !== 1) throw new Error(`Habitat composition requires exactly one ${move.region}/${move.id}; found ${matches.length}`);
    return { move, entry: matches[0], y: getSurfaceHeight(region.surface, move.x, move.z) };
  });
  for (const { move, entry, y } of placements) {
    entry.pos = { ...entry.pos, x: move.x, y, z: move.z };
    if (move.scale !== undefined) entry.uniformScale = move.scale;
    if (move.yaw !== undefined) entry.rotY = move.yaw;
  }
  return world;
}
