// Pure terrain-slide steering. The normal provides gravity's downhill tangent;
// input can steer across it but never removes the minimum downhill component.

export function isSlidableTerrainSupport(support) {
  return !!support?.slidable && Number.isFinite(support.normal?.x) && Number.isFinite(support.normal?.y)
    && Number.isFinite(support.normal?.z);
}

export function resolveTerrainSlide({ support, inputDirection, velocity = {}, dt, config }) {
  if (!isSlidableTerrainSupport(support) || !(dt > 0)) return null;
  const normal = support.normal;
  const horizontalLength = Math.hypot(normal.x, normal.z);
  if (horizontalLength < 1e-6) return null;
  // Projection of world gravity onto the support plane, viewed horizontally.
  const downhill = { x: normal.x / horizontalLength, z: normal.z / horizontalLength };
  const inputLength = Math.hypot(inputDirection?.x ?? 0, inputDirection?.z ?? 0);
  const steer = inputLength > 1e-6
    ? { x: inputDirection.x / inputLength, z: inputDirection.z / inputLength }
    : { x: 0, z: 0 };
  const target = {
    x: downhill.x * config.slopeSlideMinSpeed + steer.x * config.slopeSlideSteerSpeed,
    z: downhill.z * config.slopeSlideMinSpeed + steer.z * config.slopeSlideSteerSpeed,
  };
  // Holding uphill may slow the player but cannot turn a steep slope into idle ground.
  const downhillSpeed = target.x * downhill.x + target.z * downhill.z;
  if (downhillSpeed < config.slopeSlideMinSpeed) {
    const correction = config.slopeSlideMinSpeed - downhillSpeed;
    target.x += downhill.x * correction;
    target.z += downhill.z * correction;
  }
  let dx = target.x - (velocity.x ?? 0), dz = target.z - (velocity.z ?? 0);
  const difference = Math.hypot(dx, dz);
  const maxDelta = config.slopeSlideAcceleration * dt;
  if (difference > maxDelta && difference > 1e-6) {
    dx = dx / difference * maxDelta;
    dz = dz / difference * maxDelta;
  }
  let x = (velocity.x ?? 0) + dx;
  let z = (velocity.z ?? 0) + dz;
  const speed = Math.hypot(x, z);
  if (speed > config.slopeSlideMaxSpeed) {
    x = x / speed * config.slopeSlideMaxSpeed;
    z = z / speed * config.slopeSlideMaxSpeed;
  }
  return { x, z, downhill, speed: Math.hypot(x, z) };
}
