import { RESOURCE_TYPES } from '../src/resources/resourceConfig.js';

const SOLID_DROPS = new Set(['wood', 'stone', 'iron_ore', 'crystal_shard']);
// Reviewed local mesh base bounds, including the small grounded nuggets. Keep
// these campaign authoring choices explicit; never infer tree canopy collision.
export const CAMPAIGN_HARVEST_FOOTPRINTS = {
  asset_crystal: {size:{w:2.04,h:1.55,d:1.60},offset:{x:.016,y:.775,z:.024}},
  asset_iron_ore_rock: {size:{w:1.38,h:.85,d:1.24},offset:{x:0,y:.425,z:-.088}},
};
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function hasValidHarvestBox(collision) {
  return collision?.shape === 'box'
    && ['w','h','d'].every(key => finite(collision.size?.[key]) && collision.size[key] > 0)
    && ['x','y','z'].every(key => finite(collision.offset?.[key]));
}

// Campaign composition only. Deliberately not imported by runtime, validators,
// Author drafts, or save restore: an author's explicit non-solid flag is theirs.
// Mutates reviewed campaign descriptors/flags and returns a reviewable report.
export function normalizeCampaignHarvestCollision(world) {
  const assets = new Map((world.visualAssets ?? []).map(asset => [asset.id,asset]));
  const changed = [], skipped = [], footprints = [];
  for (const [id, bounds] of Object.entries(CAMPAIGN_HARVEST_FOOTPRINTS)) {
    const asset = assets.get(id);
    if (asset?.gameplay?.role !== 'harvestable' || !SOLID_DROPS.has(asset.gameplay.harvestable?.dropId) || !hasValidHarvestBox(asset.collision)) continue;
    if (JSON.stringify(asset.collision.size) === JSON.stringify(bounds.size) && JSON.stringify(asset.collision.offset) === JSON.stringify(bounds.offset)) continue;
    footprints.push({id,before:structuredClone(asset.collision),after:{shape:'box',...structuredClone(bounds)}});
    asset.collision = {shape:'box',...structuredClone(bounds)};
  }
  for (const section of world.regions ?? []) {
    for (const prop of section.props ?? []) {
      const asset = assets.get(prop.visualAssetId), settings = asset?.gameplay?.harvestable;
      if (asset?.gameplay?.role !== 'harvestable' || !SOLID_DROPS.has(settings?.dropId)) continue;
      const scale = prop.uniformScale ?? 1;
      if (!hasValidHarvestBox(asset.collision) || !finite(scale) || scale <= 0) {
        skipped.push({id:prop.id,reason:'invalid-solid-descriptor'}); continue;
      }
      if (prop.collisionEnabled !== false) continue;
      prop.collisionEnabled = true;
      changed.push({id:prop.id,regionId:section.id,resourceId:settings.dropId,assetId:asset.id});
    }
    for (const resource of section.resources ?? []) {
      const type = RESOURCE_TYPES[resource.type], half = type?.colliderHalfExtents, scale = resource.uniformScale ?? resource.scale ?? 1;
      if (!type?.solid || !SOLID_DROPS.has(type.resourceId)) continue;
      if (!half || !['x','y','z'].every(key=>finite(half[key])&&half[key]>0) || !finite(type.colliderCenterY) || !finite(scale) || scale <= 0) {
        skipped.push({id:resource.id,reason:'invalid-solid-descriptor'}); continue;
      }
      if (resource.collisionEnabled !== false) continue;
      resource.collisionEnabled = true;
      changed.push({id:resource.id,regionId:section.id,resourceId:type.resourceId});
    }
  }
  return {changed,skipped,footprints};
}
