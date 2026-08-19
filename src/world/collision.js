// src/world/collision.js — simple circle vs AABB + bounds, plus sliding helpers
// Pure geometry, no Three.js required.

export function clampToBounds(pos, radius, bounds) {
  const x = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, pos.x));
  const z = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, pos.z));
  return { x, z, clamped: x !== pos.x || z !== pos.z };
}

export function circleVsAABB(circle, aabb) {
  // circle { x, z, r }, aabb { minX, maxX, minZ, maxZ } (already expanded? we test)
  const closestX = Math.max(aabb.minX, Math.min(circle.x, aabb.maxX));
  const closestZ = Math.max(aabb.minZ, Math.min(circle.z, aabb.maxZ));
  const dx = circle.x - closestX;
  const dz = circle.z - closestZ;
  const distSq = dx * dx + dz * dz;
  const rSq = circle.r * circle.r;
  return { colliding: distSq < rSq, dx, dz, distSq, closestX, closestZ };
}

export function isColliding(pos, radius, obstacles) {
  const circle = { x: pos.x, z: pos.z, r: radius };
  for (const ob of obstacles) {
    const aabb = ob.aabb ?? { minX: ob.x - ob.w / 2, maxX: ob.x + ob.w / 2, minZ: ob.z - ob.h / 2, maxZ: ob.z + ob.h / 2 };
    if (circleVsAABB(circle, aabb).colliding) return true;
  }
  return false;
}

// Attempt to move from `from` to `to` with sliding.
// Tries full move, then X-only, then Z-only. Returns allowed position.
export function resolveMovement(from, to, radius, obstacles, bounds) {
  let candidate = { x: to.x, z: to.z };

  // Clamp to bounds first
  const bc = clampToBounds(candidate, radius, bounds);
  candidate.x = bc.x;
  candidate.z = bc.z;

  // If no collision at candidate, accept
  if (!isColliding(candidate, radius, obstacles)) return candidate;

  // Try slide along X
  const tryX = { x: candidate.x, z: from.z };
  const clampX = clampToBounds(tryX, radius, bounds);
  tryX.x = clampX.x;
  tryX.z = clampX.z;
  if (!isColliding(tryX, radius, obstacles)) return tryX;

  // Try slide along Z
  const tryZ = { x: from.x, z: candidate.z };
  const clampZ = clampToBounds(tryZ, radius, bounds);
  tryZ.x = clampZ.x;
  tryZ.z = clampZ.z;
  if (!isColliding(tryZ, radius, obstacles)) return tryZ;

  // Blocked — stay
  return { x: from.x, z: from.z };
}

// For jump/climb, plain bounds clamp without obstacle sliding (jump arcs over obstacles visually).
export function clampPosition(pos, radius, bounds) {
  const c = clampToBounds(pos, radius, bounds);
  return { x: c.x, z: c.z };
}
