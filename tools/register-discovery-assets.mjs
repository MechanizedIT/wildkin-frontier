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
}
