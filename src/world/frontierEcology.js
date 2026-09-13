import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { makeFrontierResourceId } from './frontierEcologyState.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';
import { isSkybreakArea } from './frontierLandform.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { hasRegionalPlaceAssets, sampleFrontierRegionalPlaceChunk } from './frontierRegionalPlace.js';
import { hasFrontierLandFootprint } from './frontierContinent.js';
import { FRONTIER_CALDERA_CONFIG, overlapsFrontierCalderaClearLane, sampleFrontierCalderaFeature } from './frontierCaldera.js';
import { FRONTIER_FUNGAL_CONFIG, overlapsFrontierFungalOuting } from './frontierFungalHollow.js';

const EDGE = 3;
const CAMP_CLEARANCE = 6;
const SLOPE_SAMPLE = .8;
const MAX_SLOPE = .42;
const CALDERA_FIXED_MAX_SLOPE = .18;
const FUNGAL_FIXED_MAX_SLOPE = .18;
const FOOTPRINT_RADIUS = Object.freeze({ tree: 1.35, rock: .9, fiber: .55 });
const STAGED_ASSET_FOOTPRINT_RADIUS = Object.freeze({
  asset_berry_bush: 1.29,
  asset_crystal: 1.3,
});
const REGIONAL_ASSET_FOOTPRINT_RADIUS = Object.freeze({
  asset_berry_bush: 1.29,
  asset_crystal: 1.3,
  asset_iron_ore_rock: .93,
});
export const FRONTIER_REGIONAL_RESOURCE_ASSETS = Object.freeze({
  berries: 'asset_berry_bush',
  crystal: 'asset_crystal',
  iron: 'asset_iron_ore_rock',
});
export const FRONTIER_CALDERA_RESOURCE_ANCHORS = Object.freeze({
  crystal: Object.freeze({
    index: 300, cx: 16, cz: -40, x: 846.5, z: -1976,
    type: 'rock', assetId: 'asset_crystal', uniformScale: 1, footprintRadius: 1.3,
  }),
  iron: Object.freeze({
    index: 301, cx: 17, cz: -40, x: 854, z: -1980,
    type: 'rock', assetId: 'asset_iron_ore_rock', uniformScale: 1, footprintRadius: .93,
  }),
});
export const FRONTIER_FUNGAL_BLOSSOM_ANCHORS = FRONTIER_FUNGAL_CONFIG.blossoms;
const MAX_FORAGE_PER_CHUNK = 12;
// Indices 0..31 belong to the ordinary coordinate-seeded attempts. These fixed
// sources use a disjoint saved-ID range so existing depletion records never move.
const SKYBREAK_STAGED_FORAGE = Object.freeze(new Map([
  ['-1,-4', Object.freeze([
    Object.freeze({ index: 100, x: -20, z: -166, type: 'fiber', assetId: 'asset_berry_bush', uniformScale: 1.5 }),
    Object.freeze({ index: 101, x: -22.8, z: -167, type: 'fiber', assetId: 'asset_berry_bush', uniformScale: 1.5 }),
  ])],
  ['0,-4', Object.freeze([
    Object.freeze({ index: 100, x: 42, z: -166, type: 'fiber' }),
  ])],
  ['0,-5', Object.freeze([
    Object.freeze({ index: 100, x: 32, z: -214, type: 'rock', assetId: 'asset_crystal', surfaceKind: 'skybreak-cap', uniformScale: 1.8 }),
  ])],
]));
const TERRACE_MINERAL_ASSET_BY_INDEX = Object.freeze({
  2: 'asset_iron_ore_rock',
  4: 'asset_crystal',
  7: 'asset_iron_ore_rock',
});

function random(cx, cz, index, salt = 0, world = DEFAULT_FRONTIER_WORLD) {
  salt += frontierDomainSeed(world, 'ecology');
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}
function terrainSample(x, z, { getTerrainSample, terrainOptions, world = DEFAULT_FRONTIER_WORLD } = {}) {
  return typeof getTerrainSample === 'function' ? getTerrainSample(x, z) : sampleFrontier(x, z, { ...terrainOptions, world });
}
function provinceMix(sample) {
  const influence = Math.max(0, Math.min(1, Number(sample?.provinceInfluence) || 0));
  const weights = sample?.provinceWeights;
  if (!(influence > 0) || !weights || typeof weights !== 'object') return null;
  const lush = Math.max(0, Number(weights.lush) || 0);
  const sunscar = Math.max(0, Number(weights.sunscar) || 0);
  const ironspine = Math.max(0, Number(weights.ironspine) || 0);
  const total = lush + sunscar + ironspine;
  return total > 0 ? { influence, lush: lush / total, sunscar: sunscar / total, ironspine: ironspine / total } : null;
}
function calderaWeight(sample) {
  return Math.max(0, Math.min(1, Number(sample?.habitatWeights?.[FRONTIER_CALDERA_CONFIG.habitatId]) || 0));
}
function heightAt(x, z, { getHeight, getTerrainSample, terrainOptions, world }) {
  return typeof getHeight === 'function' ? getHeight(x, z) : terrainSample(x, z, { getTerrainSample, terrainOptions, world }).height;
}
function settleSunscarCenter(x, z, cx, cz, options) {
  const mix = provinceMix(terrainSample(x, z, options));
  if (!mix || mix.influence * mix.sunscar < .6) return { x, z };
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  let best = { x, z, height: heightAt(x, z, options) };
  for (const [ox, oz] of [[-8, 0], [8, 0], [0, -8], [0, 8], [-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    const px = x + ox, pz = z + oz;
    if (px < cx * size + EDGE + 2 || px > (cx + 1) * size - EDGE - 2 || pz < cz * size + EDGE + 2 || pz > (cz + 1) * size - EDGE - 2) continue;
    const sample = terrainSample(px, pz, options);
    const candidateMix = provinceMix(sample);
    if (!candidateMix || candidateMix.influence * candidateMix.sunscar < .6) continue;
    const height = heightAt(px, pz, options);
    const dx = (heightAt(px + SLOPE_SAMPLE, pz, options) - heightAt(px - SLOPE_SAMPLE, pz, options)) / (SLOPE_SAMPLE * 2);
    const dz = (heightAt(px, pz + SLOPE_SAMPLE, options) - heightAt(px, pz - SLOPE_SAMPLE, options)) / (SLOPE_SAMPLE * 2);
    if (Number.isFinite(height) && Math.hypot(dx, dz) <= MAX_SLOPE && height < best.height) best = { x: px, z: pz, height };
  }
  return { x: best.x, z: best.z };
}
function hasSunscarPocketCue(x, z, options) {
  const mix = provinceMix(terrainSample(x, z, options));
  if (!mix || mix.influence * mix.sunscar < .6) return true;
  const height = heightAt(x, z, options);
  const neighborHeights = [
    heightAt(x - 8, z, options), heightAt(x + 8, z, options),
    heightAt(x, z - 8, options), heightAt(x, z + 8, options),
  ];
  if (![height, ...neighborHeights].every(Number.isFinite)) return false;
  const neighboringHigh = Math.max(...neighborHeights);
  const localRelief = neighboringHigh - Math.min(height, ...neighborHeights);
  return localRelief < .05 || neighboringHigh - height >= .25;
}
function outsideCampApron(x, z) {
  const b = FRONTIER_TERRAIN_CONFIG.campBounds;
  return x < b.minX - CAMP_CLEARANCE || x > b.maxX + CAMP_CLEARANCE || z < b.minZ - CAMP_CLEARANCE || z > b.maxZ + CAMP_CLEARANCE;
}
function harvestableBerry(visualAssets) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === 'asset_berry_bush');
  return asset?.gameplay?.role === 'harvestable' && asset.gameplay.harvestable ? asset : null;
}
function harvestableAsset(visualAssets, assetId) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === assetId);
  return asset?.gameplay?.role === 'harvestable' && asset.gameplay.harvestable ? asset : null;
}
function harvestableColliderAsset(visualAssets, assetId) {
  const asset = harvestableAsset(visualAssets, assetId);
  const size = asset?.collision?.size;
  return asset?.collision?.shape === 'box'
    && [size?.w, size?.h, size?.d].every(value => Number.isFinite(value) && value > 0) ? asset : null;
}
function terraceMineral(cx, cz, index, kind, visualAssets) {
  if (cx !== 0 || cz !== -3 || kind.type !== 'rock') return kind;
  const assetId = TERRACE_MINERAL_ASSET_BY_INDEX[index];
  if (!assetId) return kind;
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === assetId);
  return asset?.gameplay?.role === 'harvestable' && asset.gameplay.harvestable
    ? { ...kind, visualAsset: asset }
    : kind;
}
function typeFor(sample, roll, berry) {
  // Wetland produces visible low forage; upland favors solid sapwood/rock.
  if (sample.habitatBlend.wetland >= sample.habitatBlend.fernUpland) {
    if (berry && roll < .30) return { type: 'fiber', visualAsset: berry };
    return roll < .68 ? { type: 'fiber' } : { type: 'tree' };
  }
  return roll < .48 ? { type: 'tree' } : roll < .78 ? { type: 'rock' } : { type: 'fiber' };
}

function weightedProvince(mix, roll) {
  return roll < mix.lush ? 'lush' : roll < mix.lush + mix.sunscar ? 'sunscar' : 'ironspine';
}

function regionalTypeFor(sample, rolls, assets) {
  const legacy = typeFor(sample, rolls.type, assets.berry);
  const caldera = calderaWeight(sample);
  if (caldera > 0 && rolls.profile < caldera) {
    if (rolls.type < .84) {
      if (assets.iron && rolls.detail < .16) return { type: 'rock', visualAsset: assets.iron };
      if (assets.crystal && rolls.detail >= .16 && rolls.detail < .23) return { type: 'rock', visualAsset: assets.crystal };
      return { type: 'rock' };
    }
    return { type: 'fiber', tint: '#a46542' };
  }
  const mix = provinceMix(sample);
  if (!mix || rolls.profile >= mix.influence) return legacy;
  const province = weightedProvince(mix, rolls.province);
  if (province === 'lush') {
    if (assets.berry && rolls.detail < .28) return { type: 'fiber', visualAsset: assets.berry };
    return rolls.type < .48 ? { type: 'tree' } : { type: 'fiber' };
  }
  if (province === 'sunscar') {
    if (rolls.type < .74) {
      if (assets.crystal && rolls.detail < .075) return { type: 'rock', visualAsset: assets.crystal };
      if (assets.iron && rolls.detail >= .075 && rolls.detail < .105) return { type: 'rock', visualAsset: assets.iron };
      return { type: 'rock' };
    }
    return { type: 'fiber', tint: '#b89545' };
  }
  if (rolls.type < .68) {
    if (assets.iron && rolls.detail < .18) return { type: 'rock', visualAsset: assets.iron };
    if (assets.crystal && rolls.detail >= .18 && rolls.detail < .23) return { type: 'rock', visualAsset: assets.crystal };
    return { type: 'rock' };
  }
  return rolls.type < .91 ? { type: 'tree' } : { type: 'fiber' };
}

function overlapsCalderaCore(x, z, radius) {
  const dx = x - FRONTIER_CALDERA_CONFIG.center.x;
  const dz = z - FRONTIER_CALDERA_CONFIG.center.z;
  return Math.hypot(dx, dz) < Math.max(FRONTIER_CALDERA_CONFIG.outerRadius.x, FRONTIER_CALDERA_CONFIG.outerRadius.z) + radius;
}

function fixedCalderaResourceForChunk(cx, cz) {
  return Object.values(FRONTIER_CALDERA_RESOURCE_ANCHORS).find(anchor => anchor.cx === cx && anchor.cz === cz) ?? null;
}

function sampleFixedCalderaResource(anchor, options, nearbyRegionalPlaces) {
  const visualAsset = harvestableColliderAsset(options.visualAssets, anchor.assetId);
  if (!visualAsset || overlapsFrontierCalderaClearLane(anchor.x, anchor.z, anchor.footprintRadius)) return null;
  const sample = terrainSample(anchor.x, anchor.z, options);
  const feature = sampleFrontierCalderaFeature(anchor.x, anchor.z);
  if (!Number.isFinite(sample.height) || sample.habitatId !== FRONTIER_CALDERA_CONFIG.habitatId
    || !['bowl', 'breach'].includes(feature.zone)) return null;
  if (!hasFrontierLandFootprint(anchor.x, anchor.z, {
    radius: anchor.footprintRadius,
    getTerrainSample: (x, z) => terrainSample(x, z, options),
    world: options.world,
  }) || !hasFootprintSupport(anchor.x, anchor.z, {
    getHeight: (x, z) => heightAt(x, z, options),
    radius: anchor.footprintRadius,
    maxSlope: CALDERA_FIXED_MAX_SLOPE,
  })) return null;
  if (nearbyRegionalPlaces.some(place => (
    Math.hypot(anchor.x - place.center.x, anchor.z - place.center.z) < place.radius + anchor.footprintRadius
  ))) return null;
  return {
    type: anchor.type,
    visualAsset,
    id: makeFrontierResourceId(anchor.cx, anchor.cz, anchor.index),
    chunkId: `${anchor.cx},${anchor.cz}`,
    placementIndex: anchor.index,
    regionId: 'camp',
    persistentFinite: true,
    calderaFeature: true,
    pos: { x: anchor.x, y: sample.height, z: anchor.z },
    rotY: anchor.index === 300 ? -.18 : .24,
    uniformScale: anchor.uniformScale,
  };
}

function admittedLuminousBlossom(visualAssets) {
  const asset = harvestableAsset(visualAssets, 'asset_luminous_blossom');
  const recipe = asset?.gameplay?.harvestable;
  return recipe?.dropId === 'wildflower' && recipe.maxChunks === 3 && recipe.feedbackProfile === 'fiber' ? asset : null;
}

function sampleFixedFungalBlossom(anchor, visualAsset, options) {
  if (!visualAsset) return null;
  const sample = terrainSample(anchor.x, anchor.z, options);
  const height = heightAt(anchor.x, anchor.z, options);
  if (!Number.isFinite(height) || sample.habitatId !== FRONTIER_FUNGAL_CONFIG.habitatId) return null;
  const sampleTerrain = (x, z) => terrainSample(x, z, options);
  if (!hasFrontierLandFootprint(anchor.x, anchor.z, {
    radius: anchor.footprintRadius,
    getTerrainSample: sampleTerrain,
    world: options.world,
  }) || !hasFootprintSupport(anchor.x, anchor.z, {
    getHeight: (x, z) => heightAt(x, z, options),
    radius: anchor.footprintRadius,
    maxSlope: FUNGAL_FIXED_MAX_SLOPE,
  })) return null;
  return {
    type: 'fiber',
    visualAsset,
    id: makeFrontierResourceId(anchor.cx, anchor.cz, anchor.index),
    chunkId: `${anchor.cx},${anchor.cz}`,
    placementIndex: anchor.index,
    regionId: 'camp',
    persistentFinite: true,
    fungalFeature: true,
    pos: { x: anchor.x, y: height, z: anchor.z },
    rotY: (anchor.index - 400) * .73,
    uniformScale: anchor.scale,
  };
}

/** Pure, per-chunk generated forage. Saved depletion is intentionally excluded. */
export function sampleFrontierForageChunk(cx, cz, { getHeight, getTerrainSample, visualAssets, terrainOptions, world = DEFAULT_FRONTIER_WORLD } = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  const roll = (index, salt = 0) => random(cx, cz, index, salt, world);
  const count = 6 + Math.floor(roll(0, 11) * 3);
  const berry = harvestableBerry(visualAssets);
  const regionalAssets = {
    berry,
    crystal: harvestableAsset(visualAssets, FRONTIER_REGIONAL_RESOURCE_ASSETS.crystal),
    iron: harvestableAsset(visualAssets, FRONTIER_REGIONAL_RESOURCE_ASSETS.iron),
  };
  const nearbyRegionalPlaces = [];
  if (hasRegionalPlaceAssets(visualAssets)) {
    const placeOptions = { getHeight, getTerrainSample, terrainOptions, visualAssets, world };
    for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const place = sampleFrontierRegionalPlaceChunk(cx + dx, cz + dz, placeOptions);
      if (place) nearbyRegionalPlaces.push(place);
    }
  }
  const regionalPlace = nearbyRegionalPlaces.find(place => place.cx === cx && place.cz === cz) ?? null;
  const placements = [];
  // Fixed blossoms publish before ordinary candidates so the per-chunk cap can
  // never displace their stable depletion identities. One exact asset preflight
  // governs all four chunks; invalid art leaves every blossom retryable.
  const blossomAsset = admittedLuminousBlossom(visualAssets);
  for (const anchor of FRONTIER_FUNGAL_BLOSSOM_ANCHORS) {
    if (anchor.cx !== cx || anchor.cz !== cz) continue;
    const fixed = sampleFixedFungalBlossom(anchor, blossomAsset, {
      getHeight, getTerrainSample, visualAssets, terrainOptions, world,
    });
    if (fixed) placements.push(fixed);
  }
  for (let index = 0; index < 32 && placements.length < count; index++) {
    const group = Math.floor(index / 3);
    const camp = FRONTIER_TERRAIN_CONFIG.campBounds;
    const northApproach = cz === Math.floor((camp.minZ - size * 2) / size) && (cx === -1 || cx === 0);
    // The first outbound north chunk inherits a small visible field group from
    // the Camp boundary; every other cluster is still coordinate-seeded.
    const approachCenters = cx < 0
      ? [[-5, (cz + 1) * size - 20], [-15, (cz + 1) * size - 26], [-7, (cz + 1) * size - 33]]
      : [[5, (cz + 1) * size - 20], [15, (cz + 1) * size - 26], [7, (cz + 1) * size - 33]];
    const rawCenterX = northApproach ? approachCenters[group % approachCenters.length][0] : cx * size + EDGE + roll(group, 31) * (size - EDGE * 2);
    const rawCenterZ = northApproach ? approachCenters[group % approachCenters.length][1] : cz * size + EDGE + roll(group, 53) * (size - EDGE * 2);
    const center = northApproach ? { x: rawCenterX, z: rawCenterZ } : settleSunscarCenter(rawCenterX, rawCenterZ, cx, cz, { getHeight, getTerrainSample, terrainOptions, world });
    const centerX = center.x, centerZ = center.z;
    const slot = index % 3;
    const angle = slot * Math.PI * 2 / 3 + roll(group, 137) * .35;
    const radius = 1.75 + roll(index, 151) * .35;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    if (x < cx * size + EDGE || x > (cx + 1) * size - EDGE || z < cz * size + EDGE || z > (cz + 1) * size - EDGE) continue;
    if (!outsideCampApron(x, z)) continue;
    if (!hasSunscarPocketCue(x, z, { getHeight, getTerrainSample, terrainOptions, world })) continue;
    const height = heightAt(x, z, { getHeight, getTerrainSample, terrainOptions, world });
    const dx = (typeof getHeight === 'function' ? getHeight(x + SLOPE_SAMPLE, z) - getHeight(x - SLOPE_SAMPLE, z) : terrainSample(x + SLOPE_SAMPLE, z, { getTerrainSample, terrainOptions, world }).height - terrainSample(x - SLOPE_SAMPLE, z, { getTerrainSample, terrainOptions, world }).height) / (SLOPE_SAMPLE * 2);
    const dz = (typeof getHeight === 'function' ? getHeight(x, z + SLOPE_SAMPLE) - getHeight(x, z - SLOPE_SAMPLE) : terrainSample(x, z + SLOPE_SAMPLE, { getTerrainSample, terrainOptions, world }).height - terrainSample(x, z - SLOPE_SAMPLE, { getTerrainSample, terrainOptions, world }).height) / (SLOPE_SAMPLE * 2);
    if (!Number.isFinite(height) || Math.hypot(dx, dz) > MAX_SLOPE) continue;
    const stagedBerry = northApproach && group === 0 && slot === 0 && berry;
    const sample = terrainSample(x, z, { getTerrainSample, terrainOptions, world });
    const baseKind = stagedBerry ? { type: 'fiber', visualAsset: berry } : regionalTypeFor(sample, {
      type: roll(index, 79), profile: roll(index, 181), province: roll(index, 183), detail: roll(index, 185),
    }, regionalAssets);
    const kind = terraceMineral(cx, cz, index, baseKind, visualAssets);
    const uniformScale = kind.type === 'tree' ? .72 + roll(index, 107) * .08
      : kind.type === 'fiber' ? 1.08 + roll(index, 107) * .14
        : .9 + roll(index, 107) * .14;
    const regional = provinceMix(sample);
    const footprintRadius = regional
      ? (REGIONAL_ASSET_FOOTPRINT_RADIUS[kind.visualAsset?.id] ?? FOOTPRINT_RADIUS[kind.type]) * uniformScale
      : FOOTPRINT_RADIUS[kind.type];
    if (!hasFrontierLandFootprint(x, z, {
      radius: footprintRadius,
      getTerrainSample: (sx, sz) => terrainSample(sx, sz, { getTerrainSample, terrainOptions, world }),
      world,
    })) continue;
    const fungalExclusionRadius = (REGIONAL_ASSET_FOOTPRINT_RADIUS[kind.visualAsset?.id] ?? FOOTPRINT_RADIUS[kind.type]) * uniformScale;
    if (overlapsFrontierFungalOuting(x, z, fungalExclusionRadius)) continue;
    if (overlapsCalderaCore(x, z, footprintRadius) || overlapsFrontierCalderaClearLane(x, z, footprintRadius)) continue;
    if (nearbyRegionalPlaces.some(place => (
      Math.hypot(x - place.center.x, z - place.center.z) < place.radius + footprintRadius
    ))) continue;
    if ((regional || isSkybreakArea(x, z, footprintRadius)) && !hasFootprintSupport(x, z, {
      getHeight: (sx, sz) => typeof getHeight === 'function' ? getHeight(sx, sz) : terrainSample(sx, sz, { getTerrainSample, terrainOptions, world }).height,
      radius: footprintRadius,
      maxSlope: MAX_SLOPE,
    })) continue;
    placements.push({ ...kind, id: makeFrontierResourceId(cx, cz, index), chunkId: `${cx},${cz}`, placementIndex: index, regionId: 'camp', persistentFinite: true, pos: { x, y: height, z }, rotY: roll(index, 97) * Math.PI * 2, uniformScale, tint: kind.tint ?? (kind.type === 'fiber' && !kind.visualAsset ? '#8eb65a' : undefined) });
  }
  for (const resource of regionalPlace?.resources ?? []) {
    if (placements.length >= MAX_FORAGE_PER_CHUNK) break;
    const visualAsset = harvestableAsset(visualAssets, resource.assetId);
    const height = heightAt(resource.x, resource.z, { getHeight, getTerrainSample, terrainOptions, world });
    if (!visualAsset || !Number.isFinite(height)) continue;
    placements.push({
      type: resource.type,
      visualAsset,
      id: makeFrontierResourceId(cx, cz, resource.index),
      chunkId: `${cx},${cz}`,
      placementIndex: resource.index,
      regionId: 'camp',
      persistentFinite: true,
      regionalPlaceId: regionalPlace.id,
      pos: { x: resource.x, y: height, z: resource.z },
      rotY: resource.yaw,
      uniformScale: resource.uniformScale,
    });
  }
  for (const staged of SKYBREAK_STAGED_FORAGE.get(`${cx},${cz}`) ?? []) {
    if (placements.length >= MAX_FORAGE_PER_CHUNK) break;
    const sample = terrainSample(staged.x, staged.z, { getTerrainSample, terrainOptions, world });
    if (staged.surfaceKind && sample.surfaceKind !== staged.surfaceKind) continue;
    const height = typeof getHeight === 'function' ? getHeight(staged.x, staged.z) : sample.height;
    const uniformScale = staged.uniformScale ?? (staged.type === 'rock' ? 1.04 : staged.assetId ? 1.14 : 1.16);
    const radius = (STAGED_ASSET_FOOTPRINT_RADIUS[staged.assetId] ?? FOOTPRINT_RADIUS[staged.type]) * uniformScale;
    if (!Number.isFinite(height) || !hasFrontierLandFootprint(staged.x, staged.z, {
      radius,
      getTerrainSample: (sx, sz) => terrainSample(sx, sz, { getTerrainSample, terrainOptions, world }),
      world,
    }) || !hasFootprintSupport(staged.x, staged.z, {
      getHeight: (sx, sz) => typeof getHeight === 'function' ? getHeight(sx, sz) : terrainSample(sx, sz, { getTerrainSample, terrainOptions, world }).height,
      radius,
      maxSlope: MAX_SLOPE,
    })) continue;
    const visualAsset = staged.assetId ? harvestableAsset(visualAssets, staged.assetId) : null;
    if (staged.assetId && !visualAsset) continue;
    placements.push({
      type: staged.type,
      visualAsset: visualAsset ?? undefined,
      id: makeFrontierResourceId(cx, cz, staged.index),
      chunkId: `${cx},${cz}`,
      placementIndex: staged.index,
      regionId: 'camp',
      persistentFinite: true,
      pos: { x: staged.x, y: height, z: staged.z },
      rotY: roll(staged.index, 97) * Math.PI * 2,
      uniformScale,
      tint: staged.type === 'fiber' && !visualAsset ? '#8eb65a' : undefined,
    });
  }
  const calderaAnchor = fixedCalderaResourceForChunk(cx, cz);
  if (calderaAnchor && placements.length < MAX_FORAGE_PER_CHUNK) {
    const fixed = sampleFixedCalderaResource(calderaAnchor, {
      getHeight, getTerrainSample, visualAssets, terrainOptions, world,
    }, nearbyRegionalPlaces);
    if (fixed) placements.push(fixed);
  }
  return placements;
}
