export const FRONTIER_FUNGAL_CONFIG = Object.freeze({
  habitatId: 'fungal-hollow',
  center: Object.freeze({ x: -2850, z: -1250 }),
  bounds: Object.freeze({ minX: -2960, maxX: -2760, minZ: -1380, maxZ: -1140 }),
  hollowDepth: Object.freeze({ min: 3, max: 6 }),
  hollowHalfWidth: Object.freeze({ min: 12, max: 22 }),
  shelfWidth: Object.freeze({ min: 8, max: 16 }),
  branches: Object.freeze([
    Object.freeze({ id: 'west-trunk', points: Object.freeze([
      Object.freeze([-2925, -1160]), Object.freeze([-2900, -1195]), Object.freeze([-2884, -1230]),
      Object.freeze([-2887, -1270]), Object.freeze([-2918, -1325]),
    ]) }),
    Object.freeze({ id: 'east-cut', points: Object.freeze([
      Object.freeze([-2770, -1165]), Object.freeze([-2805, -1198]), Object.freeze([-2823, -1235]),
      Object.freeze([-2820, -1275]), Object.freeze([-2807, -1315]),
    ]) }),
    Object.freeze({ id: 'north-branch', points: Object.freeze([
      Object.freeze([-2887, -1270]), Object.freeze([-2868, -1300]),
      Object.freeze([-2838, -1330]), Object.freeze([-2800, -1360]),
    ]) }),
  ]),
  nearBanks: Object.freeze({
    left: Object.freeze({ x: -2856.5, z: -1249.5, radiusX: 4.5, radiusZ: 12, rise: 2 }),
    right: Object.freeze({ x: -2844, z: -1254, radiusX: 4.5, radiusZ: 9, rise: 1.6 }),
  }),
  supportToes: Object.freeze([
    Object.freeze({ x: -2854, z: -1246.5, radiusX: 1.6, radiusZ: 5.2, feather: 2, targetHeight: 12, routeSafe: false }),
    Object.freeze({ x: -2846, z: -1248.5, radiusX: 2, radiusZ: 5.5, feather: 2, targetHeight: 12.3, routeSafe: false }),
    Object.freeze({ x: -2858, z: -1249, radiusX: 1.6, radiusZ: 2.2, feather: 2, targetHeight: 12.7, routeSafe: true }),
    Object.freeze({ x: -2843.5, z: -1255, radiusX: 4, radiusZ: 5, feather: 3, targetHeight: 13.2, routeSafe: true }),
  ]),
  blossoms: Object.freeze([
    Object.freeze({ index: 400, cx: -57, cz: -25, x: -2847, z: -1241, scale: 1, footprintRadius: .9 }),
    Object.freeze({ index: 401, cx: -58, cz: -25, x: -2855.8, z: -1240.5, scale: 1, footprintRadius: .9 }),
    Object.freeze({ index: 402, cx: -57, cz: -26, x: -2843.5, z: -1255, scale: 1, footprintRadius: .9 }),
    Object.freeze({ index: 403, cx: -58, cz: -26, x: -2860, z: -1255, scale: 1, footprintRadius: .9 }),
  ]),
  outing: Object.freeze({
    exclusion: Object.freeze({ x: -2850, z: -1250, radius: 31 }),
    approach: Object.freeze([
      Object.freeze([-2848, -1216]), Object.freeze([-2850, -1232]),
      Object.freeze([-2849, -1248]), Object.freeze([-2854, -1258]),
    ]),
    returnRoute: Object.freeze([
      Object.freeze([-2854, -1258]), Object.freeze([-2846, -1270]),
      Object.freeze([-2838, -1284]), Object.freeze([-2826, -1298]),
    ]),
    supportedHalfWidth: 3,
    meshSupportMargin: .8,
    transitionWidth: 3,
    thornHome: Object.freeze({ index: 450, cx: -58, cz: -26, x: -2868, z: -1260, radius: 10 }),
  }),
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => a + (b - a) * t;

function hash2(x, z, seed) {
  let value = (Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(z | 0, 0x119de1f3) ^ (seed | 0)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function valueNoise(x, z, seed, scale) {
  const px = x / scale, pz = z / scale;
  const x0 = Math.floor(px), z0 = Math.floor(pz);
  const tx = smooth(px - x0), tz = smooth(pz - z0);
  const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
  return blend(blend(a, b, tx), blend(c, d, tx), tz);
}

function segmentSample(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared > 0 ? clamp01(((x - a[0]) * dx + (z - a[1]) * dz) / lengthSquared) : 0;
  const length = Math.sqrt(lengthSquared) || 1;
  return { distance: Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)),
    tangentX: dx / length, tangentZ: dz / length, progress: t };
}

function polylineSample(x, z, branch) {
  let nearest = null;
  for (let index = 0; index < branch.points.length - 1; index += 1) {
    const sample = segmentSample(x, z, branch.points[index], branch.points[index + 1]);
    if (!nearest || sample.distance < nearest.distance) nearest = { ...sample, segment: index };
  }
  return { ...nearest, progress: (nearest.segment + nearest.progress) / (branch.points.length - 1) };
}

function routeDistance(x, z, points) {
  let distance = Infinity;
  for (let index = 0; index < points.length - 1; index += 1) {
    distance = Math.min(distance, segmentSample(x, z, points[index], points[index + 1]).distance);
  }
  return distance;
}

function ellipseWeight(x, z, lobe) {
  // A broad crown supports a clustered composition; only the outer third
  // carries the bank slope into the surrounding rootwash.
  return smooth((1 - Math.hypot((x - lobe.x) / lobe.radiusX, (z - lobe.z) / lobe.radiusZ)) / .34);
}

function validDisk(x, z, radius) {
  return Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(radius) && radius >= 0;
}

export function overlapsFrontierFungalOuting(x, z, radius = 0) {
  if (!validDisk(x, z, radius)) return false;
  const area = FRONTIER_FUNGAL_CONFIG.outing.exclusion;
  return Math.hypot(x - area.x, z - area.z) < area.radius + radius;
}

export function overlapsFrontierFungalRoute(x, z, radius = 0) {
  if (!validDisk(x, z, radius)) return false;
  const outing = FRONTIER_FUNGAL_CONFIG.outing;
  return Math.min(routeDistance(x, z, outing.approach), routeDistance(x, z, outing.returnRoute))
    < outing.supportedHalfWidth + radius;
}

function routePreservation(x, z) {
  const outing = FRONTIER_FUNGAL_CONFIG.outing;
  const route = Math.min(routeDistance(x, z, outing.approach), routeDistance(x, z, outing.returnRoute));
  return 1 - smooth((route - outing.supportedHalfWidth - outing.meshSupportMargin) / outing.transitionWidth);
}

function homePreservation(x, z) {
  const outing = FRONTIER_FUNGAL_CONFIG.outing;
  const homeDistance = Math.hypot(x - outing.thornHome.x, z - outing.thornHome.z);
  return 1 - smooth((homeDistance - outing.thornHome.radius) / outing.transitionWidth);
}

function blossomPreservation(x, z) {
  const outing = FRONTIER_FUNGAL_CONFIG.outing;
  let weight = 0;
  for (const blossom of FRONTIER_FUNGAL_CONFIG.blossoms) {
    // The east-bank blossom is deliberately grounded on the raised shelf.
    if (blossom.index === 402) continue;
    const distance = Math.hypot(x - blossom.x, z - blossom.z);
    weight = Math.max(weight, 1 - smooth((distance - blossom.footprintRadius - 2) / 2));
  }
  return clamp01(weight);
}

function raisedToeSample(x, z, routeSafe) {
  let weight = 0, targetHeight = 0;
  for (const toe of FRONTIER_FUNGAL_CONFIG.supportToes) {
    if (toe.routeSafe !== routeSafe) continue;
    const distance = Math.hypot((x - toe.x) / toe.radiusX, (z - toe.z) / toe.radiusZ);
    const toeWeight = 1 - smooth((distance - 1) / (toe.feather / Math.max(toe.radiusX, toe.radiusZ)));
    if (toeWeight > weight) {
      weight = toeWeight;
      targetHeight = toe.targetHeight;
    }
  }
  return { weight: clamp01(weight), targetHeight };
}

export function sampleFrontierFungalFeature(x, z) {
  x = Number.isFinite(x) ? x : 0;
  z = Number.isFinite(z) ? z : 0;
  const config = FRONTIER_FUNGAL_CONFIG;
  if (x < config.bounds.minX || x > config.bounds.maxX || z < config.bounds.minZ || z > config.bounds.maxZ) {
    return { active: false, nearestBranchId: null, branchDistance: 0, tangentX: 0, tangentZ: 0,
      progress: 0, edgeInfluence: 0, hollowWeight: 0, shelfWeight: 0, buttressWeight: 0, branchButtress: 0, junctionWeight: 0,
      outingWeight: 0, route: false };
  }
  const samples = config.branches.map(branch => ({ branch, ...polylineSample(x, z, branch) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = samples[0];
  const profiles = samples.map(sample => {
    const widthProgress = .5 + .5 * Math.sin(sample.progress * Math.PI * 2 + sample.branch.id.length);
    const halfWidth = blend(config.hollowHalfWidth.min, config.hollowHalfWidth.max, widthProgress);
    return {
      hollow: smooth(1 - sample.distance / halfWidth),
      shelf: smooth(1 - Math.abs(sample.distance - (halfWidth + 7)) / 8),
      buttress: smooth(1 - Math.abs(sample.distance - (halfWidth + 15)) / 9),
    };
  });
  // A max-union keeps every branch continuous through the shared junction;
  // the nearest record is diagnostic only and never selects a separate height.
  const edgeDistance = Math.min(x - config.bounds.minX, config.bounds.maxX - x,
    z - config.bounds.minZ, config.bounds.maxZ - z);
  const edgeInfluence = smooth(edgeDistance / 20);
  const hollowWeight = Math.max(...profiles.map(profile => profile.hollow)) * edgeInfluence;
  const shelfWeight = Math.max(...profiles.map(profile => profile.shelf)) * edgeInfluence;
  const branchButtress = Math.max(...profiles.map(profile => profile.buttress)) * edgeInfluence;
  const nearLeft = ellipseWeight(x, z, config.nearBanks.left) * edgeInfluence;
  const nearRight = ellipseWeight(x, z, config.nearBanks.right) * edgeInfluence;
  const buttressWeight = Math.max(branchButtress * .68, nearLeft, nearRight);
  const junction = config.branches[0].points[3];
  const junctionWeight = smooth(1 - Math.hypot(x - junction[0], z - junction[1]) / 28) * edgeInfluence;
  return { active: true, nearestBranchId: nearest.branch.id, branchDistance: nearest.distance,
    tangentX: nearest.tangentX, tangentZ: nearest.tangentZ, progress: nearest.progress, edgeInfluence,
    hollowWeight, shelfWeight, buttressWeight, branchButtress, nearBankLeft: nearLeft, nearBankRight: nearRight,
    junctionWeight, outingWeight: smooth(1 - Math.hypot(x - config.center.x, z - config.center.z) / 42),
    route: overlapsFrontierFungalRoute(x, z) };
}

export function sampleFrontierFungalProfile(x, z, {
  seed = 0,
  baseHeight = 0,
  habitatWeight = 0,
} = {}) {
  x = Number.isFinite(x) ? x : 0;
  z = Number.isFinite(z) ? z : 0;
  baseHeight = Number.isFinite(baseHeight) ? baseHeight : 0;
  habitatWeight = clamp01(Number.isFinite(habitatWeight) ? habitatWeight : 0);
  const feature = sampleFrontierFungalFeature(x, z);
  if (habitatWeight === 0) return { height: baseHeight, colorRGB: null, weight: 0, feature };

  const broad = (valueNoise(x + 137, z - 91, seed ^ 0x3c6ef372, 210) - .5) * 3.2;
  const pocketNoise = valueNoise(x - 53, z + 109, seed ^ 0xa54ff53a, 92);
  const pocket = -smooth((pocketNoise - .46) / .38) * 1.6;
  let displacement = broad + pocket;
  let explicitRise = 0;
  if (feature.active) {
    const widthVariation = valueNoise(x + 19, z - 31, seed ^ 0x510e527f, 135);
    const depth = blend(FRONTIER_FUNGAL_CONFIG.hollowDepth.min, FRONTIER_FUNGAL_CONFIG.hollowDepth.max, widthVariation);
    const bankVariation = .82 + valueNoise(x - 77, z + 23, seed ^ 0x1f83d9ab, 105) * .36;
    explicitRise = feature.nearBankLeft * FRONTIER_FUNGAL_CONFIG.nearBanks.left.rise
      + feature.nearBankRight * FRONTIER_FUNGAL_CONFIG.nearBanks.right.rise;
    displacement += -feature.hollowWeight * depth
      + feature.branchButtress * 2.5 * bankVariation;
  }
  const routeClearance = routePreservation(x, z);
  const homeClearance = homePreservation(x, z);
  const blossomClearance = blossomPreservation(x, z);
  const innerToe = raisedToeSample(x, z, false);
  const outerToe = raisedToeSample(x, z, true);
  // The toe is a real raised shelf rather than a zero-displacement clearing.
  // Fixed transforms query this same final terrain height. Route, refuge, and
  // the three non-shelf blossoms retain their smooth supported envelopes.
  displacement += explicitRise;
  displacement = blend(displacement, innerToe.targetHeight - baseHeight, innerToe.weight);
  displacement *= 1 - Math.max(routeClearance, homeClearance, blossomClearance);
  const routeDistanceFromCenter = Math.min(
    routeDistance(x, z, FRONTIER_FUNGAL_CONFIG.outing.approach),
    routeDistance(x, z, FRONTIER_FUNGAL_CONFIG.outing.returnRoute),
  );
  const outerToeRouteWeight = outerToe.weight * smooth(
    (routeDistanceFromCenter - FRONTIER_FUNGAL_CONFIG.outing.supportedHalfWidth) / 4,
  );
  displacement = blend(displacement, outerToe.targetHeight - baseHeight, outerToeRouteWeight);
  displacement *= 1 - routeClearance;
  const height = baseHeight + displacement * habitatWeight;

  const macro = valueNoise(x + 41, z - 67, seed ^ 0x5be0cd19, 88);
  const fleck = valueNoise(x - 17, z + 37, seed ^ 0xcbbb9d5d, 13);
  const tealPatch = smooth((fleck * .72 + macro * .28 - .42) / .42);
  const soil = [.025 + macro * .015, .05 + macro * .02, .033 + macro * .014];
  const tealFloor = [.014, .072, .084];
  const oliveBank = [.052, .068, .022];
  const floorWeight = Math.max(tealPatch * .38, feature.hollowWeight * .8);
  const bankWeight = feature.buttressWeight * .78;
  const colorRGB = soil.map((value, index) => clamp01(blend(
    blend(value, tealFloor[index], floorWeight), oliveBank[index], bankWeight,
  )));
  return { height, colorRGB, weight: habitatWeight, feature };
}
