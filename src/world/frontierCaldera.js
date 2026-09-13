export const FRONTIER_CALDERA_CONFIG = Object.freeze({
  habitatId: 'emberglass-caldera',
  center: Object.freeze({ x: 850, z: -2000 }),
  outerRadius: Object.freeze({ x: 58, z: 64 }),
  rimRadius: Object.freeze({ x: 46, z: 52 }),
  bowlRadius: Object.freeze({ x: 29, z: 34 }),
  bowlHeight: 10,
  rimRise: 16,
  rampHalfWidth: 4,
  clearLaneHalfWidth: 2,
  rampInnerZ: -1980,
  rampOuterZ: -1936,
  approachOuterZ: -1932,
  bowlRefuge: Object.freeze({ x: 850, z: -1986, radius: 10 }),
  nearButtress: Object.freeze({
    minZ: -1974,
    maxZ: -1964,
    leftX: 845.5,
    leftRadiusX: 2.5,
    leftZ: -1969.5,
    leftRadiusZ: 5.5,
    leftRise: 2.8,
    rightX: 854.5,
    rightRadiusX: 2.5,
    rightZ: -1970.25,
    rightRadiusZ: 4.75,
    rightRise: 2.05,
    leftToe: Object.freeze({ x: 847.05, z: -1968.5, radius: .95, feather: 1.1 }),
    rightToe: Object.freeze({ x: 852.85, z: -1969.5, radius: .77, feather: 1.1 }),
  }),
  innerShoulder: Object.freeze({
    minZ: -1980,
    maxZ: -1961,
    leftX: 839.5,
    leftRadiusX: 5.1,
    leftRise: 5.2,
    rightX: 861.5,
    rightRadiusX: 6,
    rightRise: 3.8,
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

function ellipse(dx, dz, radius) {
  return Math.hypot(dx / radius.x, dz / radius.z);
}

export function overlapsFrontierCalderaClearLane(x, z, radius = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius < 0) return false;
  const config = FRONTIER_CALDERA_CONFIG;
  // True means the point or candidate disk intersects the reserved lane and
  // must be rejected by scenery/life admission.
  return Math.abs(x - config.center.x) < config.clearLaneHalfWidth + radius
    && z + radius >= config.rampInnerZ && z - radius <= config.approachOuterZ;
}

export function sampleFrontierCalderaFeature(x, z) {
  x = Number.isFinite(x) ? x : 0;
  z = Number.isFinite(z) ? z : 0;
  const config = FRONTIER_CALDERA_CONFIG;
  const dx = x - config.center.x, dz = z - config.center.z;
  const outerDistance = ellipse(dx, dz, config.outerRadius);
  const rimDistance = ellipse(dx, dz, config.rimRadius);
  const bowlDistance = ellipse(dx, dz, config.bowlRadius);
  const outerInfluence = smooth((1 - outerDistance) / .18);
  const rawRimInfluence = smooth(1 - Math.abs(rimDistance - 1) / .22);
  const bowlInfluence = smooth((1 - bowlDistance) / .26);
  const southProgress = smooth((z - config.rampInnerZ) / (config.rampOuterZ - config.rampInnerZ));
  const breachProgress = smooth((z - (config.rampInnerZ - 10)) / 10);
  const rampHalfWidth = config.rampHalfWidth + southProgress * 8;
  const rampLateral = smooth((rampHalfWidth - Math.abs(dx)) / 3);
  const rampInfluence = outerInfluence * breachProgress * rampLateral;
  const rimInfluence = rawRimInfluence * (1 - rampInfluence);
  const shoulder = config.innerShoulder;
  const shoulderZ = smooth((z - shoulder.minZ) / 3) * smooth((shoulder.maxZ - z) / 3);
  const protectedHome = config.bowlRefuge;
  const homeDistance = Math.hypot(x - protectedHome.x, z - protectedHome.z);
  const homeClearance = smooth((homeDistance - protectedHome.radius) / 2);
  const shoulderLobe = (centerX, radiusX) => smooth(1 - Math.abs(x - centerX) / radiusX)
    * shoulderZ * homeClearance * outerInfluence;
  const innerShoulderLeft = shoulderLobe(shoulder.leftX, shoulder.leftRadiusX);
  const innerShoulderRight = shoulderLobe(shoulder.rightX, shoulder.rightRadiusX);
  const near = config.nearButtress;
  const toeMask = toe => smooth((toe.radius + toe.feather - Math.hypot(x - toe.x, z - toe.z)) / toe.feather);
  const leftToeMask = toeMask(near.leftToe);
  const rightToeMask = toeMask(near.rightToe);
  const buttressLobe = (centerX, radiusX, centerZ, radiusZ) => {
    if (z <= near.minZ || z >= near.maxZ) return 0;
    const lateral = smooth(1 - Math.abs(x - centerX) / radiusX);
    const longitudinal = smooth(1 - Math.abs(z - centerZ) / radiusZ);
    // The squared lateral fade keeps the first metre beside the exact clear
    // lane gently supported while concentrating visible mass farther out.
    return lateral * lateral * longitudinal * outerInfluence * homeClearance;
  };
  // A footprint-sized zero-rise toe lets the small flank props sit on the
  // existing supported breach floor. The extra feather only removes nearby
  // buttress rise, so it cannot create a step at the reserved lane edge.
  const nearButtressLeft = buttressLobe(near.leftX, near.leftRadiusX, near.leftZ, near.leftRadiusZ)
    * (1 - leftToeMask);
  const nearButtressRight = buttressLobe(near.rightX, near.rightRadiusX, near.rightZ, near.rightRadiusZ)
    * (1 - rightToeMask);
  const nearButtressInfluence = Math.max(nearButtressLeft, nearButtressRight);
  const innerShoulderInfluence = Math.max(innerShoulderLeft, innerShoulderRight, nearButtressInfluence);
  const ramp = outerInfluence > 0 && z >= config.rampInnerZ && Math.abs(dx) <= rampHalfWidth;
  const clearLane = outerInfluence > 0 && overlapsFrontierCalderaClearLane(x, z);
  const zone = outerInfluence <= 0 ? null
    : ramp ? 'breach'
      : bowlDistance <= 1 ? 'bowl'
        : rawRimInfluence > .15 ? 'rim'
          : dz > 0 ? 'approach' : 'shoulder';
  return {
    outerInfluence,
    rimInfluence,
    bowlInfluence,
    rampInfluence,
    innerShoulderInfluence,
    innerShoulderLeft,
    innerShoulderRight,
    nearButtressInfluence,
    nearButtressLeft,
    nearButtressRight,
    nearButtressLeftToe: leftToeMask,
    nearButtressRightToe: rightToeMask,
    ramp,
    clearLane,
    zone,
    dx,
    dz,
  };
}

export function sampleFrontierCalderaProfile(x, z, {
  seed = 0,
  baseHeight = 0,
  habitatWeight = 0,
} = {}) {
  x = Number.isFinite(x) ? x : 0;
  z = Number.isFinite(z) ? z : 0;
  baseHeight = Number.isFinite(baseHeight) ? baseHeight : 0;
  habitatWeight = clamp01(Number.isFinite(habitatWeight) ? habitatWeight : 0);
  const feature = sampleFrontierCalderaFeature(x, z);
  if (habitatWeight === 0) return { height: baseHeight, colorRGB: null, weight: 0, feature };

  const broadHeightAt = (px, pz) => {
    const broad = valueNoise(px + 311, pz - 173, seed ^ 0x6a09e667, 360) * 2 - 1;
    const shelfNoise = valueNoise(px - 97, pz + 229, seed ^ 0xbb67ae85, 125);
    const shelf = smooth((shelfNoise - .18) / .64);
    return Math.max(6, Math.min(24, 9.2 + broad * 2.4 + shelf * 5.4));
  };
  const craterBaseAt = (px, pz, localFeature) => {
    const localBroadHeight = broadHeightAt(px, pz);
    const floorNoise = (valueNoise(px + 41, pz - 67, seed ^ 0x3c6ef372, 95) - .5) * 1.1;
    const bowlHeight = FRONTIER_CALDERA_CONFIG.bowlHeight + floorNoise;
    const shoulderVariation = .88 + valueNoise(px - 53, pz + 101, seed ^ 0xa54ff53a, 150) * .24;
    let target = bowlHeight + FRONTIER_CALDERA_CONFIG.rimRise * shoulderVariation * localFeature.rimInfluence;
    if (localFeature.rampInfluence > 0) {
      const progress = smooth((pz - FRONTIER_CALDERA_CONFIG.rampInnerZ)
        / (FRONTIER_CALDERA_CONFIG.rampOuterZ - FRONTIER_CALDERA_CONFIG.rampInnerZ));
      target = blend(target, blend(bowlHeight, localBroadHeight, progress), localFeature.rampInfluence);
    }
    return target;
  };
  const broadHeight = broadHeightAt(x, z);
  let height = blend(baseHeight, broadHeight, habitatWeight);

  if (feature.outerInfluence > 0) {
    let craterTarget = craterBaseAt(x, z, feature);
    const near = FRONTIER_CALDERA_CONFIG.nearButtress;
    if (feature.nearButtressLeftToe > 0) craterTarget = blend(craterTarget,
      craterBaseAt(near.leftToe.x, near.leftToe.z, sampleFrontierCalderaFeature(near.leftToe.x, near.leftToe.z)),
      feature.nearButtressLeftToe);
    if (feature.nearButtressRightToe > 0) craterTarget = blend(craterTarget,
      craterBaseAt(near.rightToe.x, near.rightToe.z, sampleFrontierCalderaFeature(near.rightToe.x, near.rightToe.z)),
      feature.nearButtressRightToe);
    const innerShoulderRise = feature.innerShoulderLeft * FRONTIER_CALDERA_CONFIG.innerShoulder.leftRise
      + feature.innerShoulderRight * FRONTIER_CALDERA_CONFIG.innerShoulder.rightRise
      + feature.nearButtressLeft * FRONTIER_CALDERA_CONFIG.nearButtress.leftRise
      + feature.nearButtressRight * FRONTIER_CALDERA_CONFIG.nearButtress.rightRise;
    craterTarget += innerShoulderRise;
    height = blend(height, craterTarget, feature.outerInfluence * habitatWeight);
  }

  // These are linear vertex colours. The shared terrain painter converts them
  // to sRGB and overlays its existing grain, so the volcanic target must stay
  // substantially darker than an authored display swatch.
  const macroRust = valueNoise(x + 19, z - 43, seed ^ 0x510e527f, 78);
  const patchRust = valueNoise(x - 31, z + 17, seed ^ 0x1f83d9ab, 11);
  const brokenRust = valueNoise(x + 7, z + 61, seed ^ 0x5be0cd19, 6.5);
  const rustField = smooth((patchRust * .68 + brokenRust * .32 + macroRust * .16 - .58) / .25);
  const localButtressRust = feature.nearButtressLeft * .22 + feature.nearButtressRight * .12;
  const rust = clamp01(rustField * (.45 + macroRust * .45) + localButtressRust);
  const slate = valueNoise(x - 73, z - 29, seed ^ 0xcbbb9d5d, 15) - .5;
  const rimDarken = feature.rimInfluence * .012;
  const charcoal = [.028 + slate * .012, .036 + slate * .014, .047 + slate * .018];
  const rustTarget = [.19 + macroRust * .045, .052 + macroRust * .022, .018];
  const colorRGB = charcoal.map((value, index) => clamp01(blend(value, rustTarget[index], rust) - rimDarken));
  return { height, colorRGB, weight: habitatWeight, feature };
}
