// Pure tuning and motion rules for automatic coastal wading/surface swimming.
// The player controller owns the mode and applies this result through Rapier.
export const SURFACE_SWIM_CONFIG = Object.freeze({
  wadeEnterDepth: .18,
  swimEnterDepth: .68,
  swimExitDepth: .54,
  wadeSpeedMultiplier: .62,
  swimSpeed: 1.7,
  swimAcceleration: 7.5,
  floatCenterOffset: .14,
  buoyancySpeed: 4.2,
  surfaceContactAllowance: .08,
  currentStartOffshore: 24,
  currentFullOffshore: 45,
  currentPushSpeed: 1.85,
  maxKnockbackSpeed: 2.4,
  maxCombinedSpeed: 4.25,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function normalizeSurfaceWater(sample) {
  if (!sample || !Number.isFinite(sample.surfaceY) || !Number.isFinite(sample.depth)
    || sample.depth < 0 || !Number.isFinite(sample.offshoreDistance)) return null;
  const ix = Number(sample.inlandDirection?.x), iz = Number(sample.inlandDirection?.z);
  const length = Math.hypot(ix, iz);
  if (!(length > 1e-6)) return null;
  return {
    surfaceY: sample.surfaceY,
    bedY: Number.isFinite(sample.bedY) ? sample.bedY : sample.surfaceY - sample.depth,
    depth: sample.depth,
    offshoreDistance: sample.offshoreDistance,
    inlandDirection: { x: ix / length, z: iz / length },
  };
}

export function isSurfaceSwimming(state) {
  return state?.mode === 'SWIM';
}

export function surfaceWaterMode({ water, positionY, capsuleHalfExtent = .52, grounded = false,
  previousMode = 'IDLE', config = SURFACE_SWIM_CONFIG } = {}) {
  const sample = normalizeSurfaceWater(water);
  if (!sample) return 'DRY';
  const touchingSurface = Number.isFinite(positionY)
    && positionY - capsuleHalfExtent <= sample.surfaceY + config.surfaceContactAllowance;
  if (previousMode === 'SWIM') {
    return grounded && sample.depth <= config.swimExitDepth ? 'WADE' : 'SWIM';
  }
  if (touchingSurface && (!grounded || sample.depth >= config.swimEnterDepth)) return 'SWIM';
  return grounded && sample.depth >= config.wadeEnterDepth ? 'WADE' : 'DRY';
}

export function surfaceCurrentStrength(water, config = SURFACE_SWIM_CONFIG) {
  const sample = normalizeSurfaceWater(water);
  return sample ? smoothstep(config.currentStartOffshore, config.currentFullOffshore, sample.offshoreDistance) : 0;
}

export function resolveSurfaceSwimVelocity({ water, inputDirection, inputMagnitude = 0, velocity = {},
  knockback = null, dt = 0, config = SURFACE_SWIM_CONFIG } = {}) {
  const sample = normalizeSurfaceWater(water);
  if (!sample) return { x: 0, z: 0, currentStrength: 0 };
  const seconds = Math.max(0, Number(dt) || 0);
  const magnitude = clamp(Number(inputMagnitude) || 0, 0, 1);
  const dx = Number(inputDirection?.x) || 0, dz = Number(inputDirection?.z) || 0;
  const directionLength = Math.hypot(dx, dz);
  let x = directionLength > 1e-6 ? dx / directionLength * magnitude * config.swimSpeed : 0;
  let z = directionLength > 1e-6 ? dz / directionLength * magnitude * config.swimSpeed : 0;

  if (knockback?.remaining > 0) {
    const knockbackSpeed = clamp(Number(knockback.speed) || 0, 0, config.maxKnockbackSpeed);
    const kx = Number(knockback.dir?.x) || 0, kz = Number(knockback.dir?.z) || 0;
    const length = Math.hypot(kx, kz);
    if (length > 1e-6) { x += kx / length * knockbackSpeed; z += kz / length * knockbackSpeed; }
  }

  const strength = surfaceCurrentStrength(sample, config);
  const inland = sample.inlandDirection;
  const outwardX = -inland.x, outwardZ = -inland.z;
  const outwardSpeed = Math.max(0, x * outwardX + z * outwardZ);
  x -= outwardX * outwardSpeed * strength;
  z -= outwardZ * outwardSpeed * strength;
  x += inland.x * config.currentPushSpeed * strength;
  z += inland.z * config.currentPushSpeed * strength;
  const combinedSpeed = Math.hypot(x, z);
  if (combinedSpeed > config.maxCombinedSpeed) {
    x *= config.maxCombinedSpeed / combinedSpeed;
    z *= config.maxCombinedSpeed / combinedSpeed;
  }
  // Water is a velocity field, not a fresh impulse added to last tick's
  // already-currented velocity. Accelerate toward the combined desired speed.
  const previousX = Number(velocity.x) || 0, previousZ = Number(velocity.z) || 0;
  const differenceX = x - previousX, differenceZ = z - previousZ;
  const differenceLength = Math.hypot(differenceX, differenceZ);
  const maxStep = config.swimAcceleration * seconds;
  if (differenceLength > maxStep && differenceLength > 1e-6) {
    x = previousX + differenceX / differenceLength * maxStep;
    z = previousZ + differenceZ / differenceLength * maxStep;
  }
  return { x, z, currentStrength: strength };
}

export function surfaceBuoyancyDelta({ water, positionY, dt = 0, config = SURFACE_SWIM_CONFIG } = {}) {
  const sample = normalizeSurfaceWater(water);
  if (!sample || !Number.isFinite(positionY)) return 0;
  const target = sample.surfaceY + config.floatCenterOffset;
  const maxStep = config.buoyancySpeed * Math.max(0, Number(dt) || 0);
  return clamp(target - positionY, -maxStep, maxStep);
}
