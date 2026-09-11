import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Existing second Mossling only. Keep all instance/harvest/secret IDs intact.
export function composeSocialEncounters(world) {
  const region = world.regions.find(r => r.id === 'section_1');
  const matches = region?.props.filter(p => p.id === 'prop_s1_creek_mossling_b') ?? [];
  if (matches.length !== 1 || matches[0].visualAssetId !== 'asset_wildkin_mossling') {
    throw new Error('Social composition requires the existing second creek Mossling');
  }
  matches[0].pos = { x: -26, y: getSurfaceHeight(region.surface, -26, 18), z: 18 };
  return world;
}
