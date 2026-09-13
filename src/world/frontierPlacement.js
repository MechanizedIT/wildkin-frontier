// A placement's center can be flat while its footprint crosses a lip. Keep
// this deliberately small and bounded: one center plus the cardinal/diagonal
// ring gives placement owners a shared way to reject unsupported feet.
const FOOTPRINT_DIRECTIONS = Object.freeze([
  [1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2],
]);

/**
 * Returns whether a circular placement footprint has finite, walkable support.
 * `getHeight` is sampled at most nine times (center + cardinal/diagonal ring).
 */
export function hasFootprintSupport(x, z, { getHeight, radius, maxSlope } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || typeof getHeight !== 'function'
    || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(maxSlope) || maxSlope < 0) return false;
  const center = getHeight(x, z);
  if (!Number.isFinite(center)) return false;
  for (const [dx, dz] of FOOTPRINT_DIRECTIONS) {
    const height = getHeight(x + dx * radius, z + dz * radius);
    if (!Number.isFinite(height) || Math.abs(height - center) / radius > maxSlope) return false;
  }
  return true;
}
