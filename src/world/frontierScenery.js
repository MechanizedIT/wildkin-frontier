import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { sampleFrontierForageChunk } from './frontierEcology.js';
import { sampleFrontierWildlifeChunk } from './frontierWildlife.js';

export const FRONTIER_SCENERY_CONFIG = Object.freeze({
  maxNear: 18,
  maxOuter: 16,
  maxOuterDesired: 8,
  maxTotal: 34,
  maxCanopies: 12,
});

const EDGE = 4;
const MAX_SLOPE = .32;
const SLOPE_STEP = .8;
const CAMP_CLEARANCE = 6;
const FORAGE_CLEARANCE = 3.2;
// Solid trunks and stones keep a true walk lane. Soft foliage may frame that
// lane more closely, which is what makes the portrait route read as habitat.
const ROUTE_CLEARANCE = 1.15;
const SOLID_ROUTE_CLEARANCE = 2.1;
const GROUND_COVER_CLEARANCE = Object.freeze({ route: .65, forage: 1.4, wildlife: 1.4 });
const TERRACE_CLEARANCE = Object.freeze({ minX: 18, maxX: 46, minZ: -150, maxZ: -108 });
const NORTH_ROUTE = Object.freeze([
  Object.freeze([0, -56]), Object.freeze([7, -68]), Object.freeze([7, -85]), Object.freeze([20, -95]), Object.freeze([24, -118]),
]);

// This one authored grouping gives the first portrait route a readable leafy
// west wall and damp east verge. It still passes every ordinary clearance rule.
const STAGED = Object.freeze(new Map([
  ['0,-3', Object.freeze([
    Object.freeze({ key: 'tree-north', assetId: 'asset_verge_canopy_tall', x: 6, z: -106, scale: .9, kind: 'canopy' }),
  ])],
  ['0,-2', Object.freeze([
    Object.freeze({ key: 'tree-west-1', assetId: 'asset_verge_canopy', x: 4.85, z: -78.5, scale: .82, yaw: .2, kind: 'canopy' }),
    Object.freeze({ key: 'tree-west-2', assetId: 'asset_verge_canopy_spread', x: 1.8, z: -85, scale: .72, yaw: -.35, kind: 'canopy' }),
    Object.freeze({ key: 'fen-1', assetId: 'asset_fen_reed', x: 8.7, z: -75.8, scale: .42, kind: 'low' }),
    Object.freeze({ key: 'fen-2', assetId: 'asset_fen_lily', x: 8.7, z: -76.8, scale: .55, kind: 'low' }),
    Object.freeze({ key: 'fen-3', assetId: 'asset_mushroom_ring', x: 5.2, z: -77.4, scale: .8, kind: 'low' }),
    Object.freeze({ key: 'fen-4', assetId: 'asset_fen_reed', x: 8.8, z: -78, scale: .5, kind: 'low' }),
    Object.freeze({ key: 'fen-5', assetId: 'asset_fen_lily', x: 9.1, z: -78.1, scale: .5, kind: 'low' }),
    Object.freeze({ key: 'fen-6', assetId: 'asset_fen_stone', x: 9.2, z: -78.8, scale: .32, kind: 'low' }),
    Object.freeze({ key: 'fen-7', assetId: 'asset_fen_reed', x: 9, z: -80, scale: .38, kind: 'low' }),
    Object.freeze({ key: 'fen-8', assetId: 'asset_fen_lily', x: 8.7, z: -79.9, scale: .46, kind: 'low' }),
  ])],
]));

function random(cx, cz, index, salt = 0) {
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}

function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

function routeIsClear(x, z, candidate) {
  if (x >= TERRACE_CLEARANCE.minX && x <= TERRACE_CLEARANCE.maxX && z >= TERRACE_CLEARANCE.minZ && z <= TERRACE_CLEARANCE.maxZ) return false;
  const clearance = candidate.kind === 'ground-cover' ? GROUND_COVER_CLEARANCE.route
    : candidate.kind === 'canopy' || candidate.assetId === 'asset_fen_stone' ? SOLID_ROUTE_CLEARANCE : ROUTE_CLEARANCE;
  for (let i = 1; i < NORTH_ROUTE.length; i++) if (distanceToSegment(x, z, NORTH_ROUTE[i - 1], NORTH_ROUTE[i]) < clearance) return false;
  return true;
}

function outsideCampApron(x, z) {
  const b = FRONTIER_TERRAIN_CONFIG.campBounds;
  return x < b.minX - CAMP_CLEARANCE || x > b.maxX + CAMP_CLEARANCE || z < b.minZ - CAMP_CLEARANCE || z > b.maxZ + CAMP_CLEARANCE;
}

function terrainSample(x, z, options) {
  return typeof options.getTerrainSample === 'function' ? options.getTerrainSample(x, z) : sampleFrontier(x, z, options.terrainOptions);
}

function heightAt(x, z, options) {
  return typeof options.getHeight === 'function' ? options.getHeight(x, z) : terrainSample(x, z, options).height;
}

function hasSafeGround(x, z, options) {
  const h = heightAt(x, z, options);
  if (!Number.isFinite(h)) return false;
  const dx = (heightAt(x + SLOPE_STEP, z, options) - heightAt(x - SLOPE_STEP, z, options)) / (SLOPE_STEP * 2);
  const dz = (heightAt(x, z + SLOPE_STEP, options) - heightAt(x, z - SLOPE_STEP, options)) / (SLOPE_STEP * 2);
  return Number.isFinite(dx) && Number.isFinite(dz) && Math.hypot(dx, dz) <= MAX_SLOPE;
}

function exclusionsFor(cx, cz, options) {
  const forage = sampleFrontierForageChunk(cx, cz, { getHeight: (x, z) => heightAt(x, z, options), terrainOptions: options.terrainOptions });
  const wildlife = [];
  for (let wz = cz - 1; wz <= cz + 1; wz++) for (let wx = cx - 1; wx <= cx + 1; wx++) {
    wildlife.push(...sampleFrontierWildlifeChunk(wx, wz, { getTerrainSample: (x, z) => terrainSample(x, z, options), terrainOptions: options.terrainOptions }));
  }
  return { forage, wildlife };
}

function isClear(x, z, candidate, exclusions) {
  if (!outsideCampApron(x, z) || !routeIsClear(x, z, candidate)) return false;
  const groundCover = candidate.kind === 'ground-cover';
  if (exclusions.forage.some(node => Math.hypot(x - node.pos.x, z - node.pos.z) < (groundCover ? GROUND_COVER_CLEARANCE.forage : FORAGE_CLEARANCE))) return false;
  if (exclusions.wildlife.some(animal => Math.hypot(x - animal.homePos.x, z - animal.homePos.z) < (groundCover ? GROUND_COVER_CLEARANCE.wildlife : animal.roamRadius + 2.5))) return false;
  return true;
}

// Build-only filter: soft grass can occupy roaming ground, while the same
// route, Camp, terrace and encounter sources preserve readable feet/access.
export function createFrontierGroundCoverFilter(options = {}) {
  const exclusions = new Map();
  const candidate = Object.freeze({ kind: 'ground-cover' });
  return (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
    const cx = Math.floor(x / size), cz = Math.floor(z / size), key = `${cx},${cz}`;
    if (!exclusions.has(key)) exclusions.set(key, exclusionsFor(cx, cz, options));
    return isClear(x, z, candidate, exclusions.get(key)) && hasSafeGround(x, z, options);
  };
}

function lowAsset(sample, habitatRoll, detailRoll) {
  const wet = habitatRoll < (sample.habitatBlend?.wetland ?? 0);
  if (wet) return detailRoll < .48 ? 'asset_fen_reed' : detailRoll < .78 ? 'asset_fen_lily' : 'asset_fen_stone';
  return detailRoll < .68 ? 'asset_mushroom_ring' : 'asset_trail_stones';
}

function makeSpec(cx, cz, key, candidate, options) {
  const y = heightAt(candidate.x, candidate.z, options);
  return Object.freeze({
    id: `f2c:s:${cx}:${cz}:${key}`,
    chunkId: `${cx},${cz}`,
    assetId: candidate.assetId,
    x: candidate.x, y, z: candidate.z,
    scale: candidate.scale,
    yaw: candidate.yaw ?? random(cx, cz, Math.round((candidate.x + candidate.z) * 10), 211) * Math.PI * 2,
    kind: candidate.kind,
  });
}

export function sampleFrontierSceneryChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize, exclusions = exclusionsFor(cx, cz, options), specs = [];
  const accept = (key, candidate, curated = false) => {
    if (Math.floor(candidate.x / size) !== cx || Math.floor(candidate.z / size) !== cz) return;
    if (!curated && (candidate.x < cx * size + EDGE || candidate.x > (cx + 1) * size - EDGE || candidate.z < cz * size + EDGE || candidate.z > (cz + 1) * size - EDGE)) return;
    if (!hasSafeGround(candidate.x, candidate.z, options) || !isClear(candidate.x, candidate.z, candidate, exclusions)) return;
    specs.push(makeSpec(cx, cz, key, candidate, options));
  };
  for (const candidate of STAGED.get(`${cx},${cz}`) ?? []) accept(`stage-${candidate.key}`, candidate, true);

  // Three seeded patches make a visible verge/fen rhythm without filling the
  // walking lane with a uniform scatter. Slot zero is the patch silhouette;
  // later slots build its low habitat detail.
  for (let attempt = 0; attempt < 30 && specs.length < 6; attempt++) {
    const group = attempt % 3, slot = Math.floor(attempt / 3);
    const centerX = cx * size + 10 + random(cx, cz, group, 31) * (size - 20);
    const centerZ = cz * size + 10 + random(cx, cz, group, 53) * (size - 20);
    const angle = random(cx, cz, attempt, 71) * Math.PI * 2, radius = slot ? 2.2 + random(cx, cz, attempt, 83) * 5.8 : 0;
    const x = centerX + Math.cos(angle) * radius, z = centerZ + Math.sin(angle) * radius;
    const sample = terrainSample(x, z, options), canopy = !specs.some(spec => spec.kind === 'canopy');
    const canopyRoll = random(cx, cz, attempt, 97);
    const assetId = canopy
      ? (canopyRoll < .34 ? 'asset_verge_canopy' : canopyRoll < .67 ? 'asset_verge_canopy_tall' : 'asset_verge_canopy_spread')
      : lowAsset(sample, random(cx, cz, attempt, 101), random(cx, cz, attempt, 107));
    accept(`seed-${attempt}`, { x, z, assetId, kind: canopy ? 'canopy' : 'low', scale: canopy ? .72 + random(cx, cz, attempt, 113) * .34 : .76 + random(cx, cz, attempt, 127) * .3, yaw: random(cx, cz, attempt, 131) * Math.PI * 2 });
  }
  return specs;
}

export function selectFrontierScenery(residency, options = {}) {
  const center = residency?.center;
  if (!Number.isSafeInteger(center?.cx) || !Number.isSafeInteger(center?.cz)) return [];
  const chunks = [...new Map((residency.chunks ?? []).filter(chunk => Number.isSafeInteger(chunk?.cx) && Number.isSafeInteger(chunk?.cz)).map(chunk => [`${chunk.cx},${chunk.cz}`, chunk])).values()];
  const near = [], outer = [];
  for (const chunk of chunks) {
    const dx = chunk.cx - center.cx, dz = chunk.cz - center.cz;
    const distance = Math.max(Math.abs(dx), Math.abs(dz)), centerDistance = dx * dx + dz * dz;
    const specs = sampleFrontierSceneryChunk(chunk.cx, chunk.cz, options);
    if (distance <= 1) near.push(...specs.map(spec => ({ spec, centerDistance })));
    else if (distance <= 2) outer.push(...specs.filter(spec => spec.kind === 'canopy').slice(0, 1).map(spec => ({ spec, centerDistance })));
  }
  const stableSort = (a, b) => Number(!a.spec.id.includes(':stage-')) - Number(!b.spec.id.includes(':stage-')) || a.centerDistance - b.centerDistance || a.spec.id.localeCompare(b.spec.id);
  near.sort(stableSort); outer.sort((a, b) => a.centerDistance - b.centerDistance || a.spec.id.localeCompare(b.spec.id));
  const nearSpecs = near.map(entry => entry.spec), outerSpecs = outer.map(entry => entry.spec);
  const staged = nearSpecs.filter(spec => spec.id.includes(':stage-'));
  const generalCanopies = nearSpecs.filter(spec => spec.kind === 'canopy' && !spec.id.includes(':stage-')).slice(0, Math.max(0, 4 - staged.filter(spec => spec.kind === 'canopy').length));
  const preferred = new Set([...staged, ...generalCanopies]);
  const chosenNear = [...preferred, ...nearSpecs.filter(spec => !preferred.has(spec) && spec.kind === 'low'), ...nearSpecs.filter(spec => !preferred.has(spec) && spec.kind === 'canopy')].slice(0, FRONTIER_SCENERY_CONFIG.maxNear);
  const canopyRoom = Math.max(0, FRONTIER_SCENERY_CONFIG.maxCanopies - chosenNear.filter(spec => spec.kind === 'canopy').length);
  const chosenOuter = outerSpecs.slice(0, Math.min(FRONTIER_SCENERY_CONFIG.maxOuterDesired, FRONTIER_SCENERY_CONFIG.maxOuter, canopyRoom));
  return Object.freeze([...chosenNear, ...chosenOuter].slice(0, FRONTIER_SCENERY_CONFIG.maxTotal));
}
