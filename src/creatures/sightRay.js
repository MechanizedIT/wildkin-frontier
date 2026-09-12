// Shared finite segment for wildlife awareness and player observation. Compute
// direction from the actual raised origin, so the ray ends at the target.
export function createSightSegment(origin, target) {
  const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z;
  const length = Math.hypot(dx, dy, dz);
  return { origin, direction: length < .01 ? { x: 0, y: 0, z: 0 } : { x: dx / length, y: dy / length, z: dz / length }, length };
}
