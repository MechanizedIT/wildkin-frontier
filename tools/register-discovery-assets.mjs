import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Reviewed mechanical discoveries retain existing secret/reward identities.
export function registerDiscoveryAssets(world) {
  const id = 'asset_ember_forge_cache';
  const asset = { id, displayName: 'Ember forge vault', category: 'Alien discoveries', version: 1,
    parts: [], gameplay: { role: 'prop' },
    collision: { shape: 'box', offset: { x: 0, y: .8, z: 0 }, size: { w: 2.2, h: 1.6, d: 1.517 } },
    model: { path: 'assets/models/ember-forge-cache-v1/model.glb', scale: 1, pivot: { x: 0, y: 0, z: 0 } } };
  const existing = world.visualAssets.findIndex(a => a.id === id);
  if (existing < 0) world.visualAssets.push(asset); else world.visualAssets[existing] = asset;
  const chest = world.regions.flatMap(r => r.lootChests ?? []).find(c => c.id === 'chest_emberhorn_secret');
  if (chest) Object.assign(chest, { visualAssetId: id, displayName: 'Ember Forge Vault', collisionEnabled: true, triggerRadius: 1.65 });
  const fieldChest = world.visualAssets.find(a => a.id === 'asset_chest');
  if (fieldChest) Object.assign(fieldChest, {
    displayName: 'Field supply chest', parts: [],
    collision: { shape: 'box', offset: { x: 0, y: .51, z: .018 }, size: { w: 1.43, h: 1.02, d: .924 } },
    model: { path: 'assets/models/field-chest-v1/model.glb', scale: 1, pivot: { x: 0, y: 0, z: 0 } },
  });
  // Rewards sit beside their finish flags on the broad landing, rather than
  // sharing the flag's origin and driving an opening lid through its pole.
  for (const region of world.regions) {
    for (const reward of region.lootChests ?? []) {
      if (!reward.courseId) continue;
      const end = region.parkourEnds?.find(entry => entry.courseId === reward.courseId);
      if (!end) continue;
      const x = end.pos.x + .95, z = end.pos.z + .9;
      reward.pos = { x, y: getSurfaceHeight(region.surface, x, z), z };
    }
    const rootCache = region.lootChests?.find(entry => entry.id === 'chest_mossling_secret');
    if (rootCache) rootCache.pos = { x: -26.5, y: getSurfaceHeight(region.surface, -26.5, 2.5), z: 2.5 };
    const shoreCache = region.lootChests?.find(entry => entry.id === 'chest_tidefin_secret');
    if (shoreCache) shoreCache.pos = { x: -34, y: getSurfaceHeight(region.surface, -34, 3), z: 3 };
  }
}
