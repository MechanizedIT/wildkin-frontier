export const FRONTIER_TEXTURE_COLOR_STEP = 2;
export const FRONTIER_TEXTURE_COLOR_MAX_AXIS_SAMPLES = 27;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function colorOf(sample) {
  const color = sample?.groundColorRGB;
  return Array.isArray(color) && color.length === 3 && color.every(Number.isFinite)
    ? color : [0, 0, 0];
}

/**
 * Builds one ephemeral, globally aligned color grid for a streamed chunk.
 * Height, collision and atlas callers continue to use the analytical sample.
 */
export function createFrontierTextureColorSampler({ origin, size = 50, sample } = {}) {
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.z)
    || !Number.isFinite(size) || size <= 0 || typeof sample !== 'function') {
    throw new Error('invalid-frontier-texture-color-sampler');
  }
  const step = FRONTIER_TEXTURE_COLOR_STEP;
  const minX = Math.floor(origin.x / step) * step;
  const minZ = Math.floor(origin.z / step) * step;
  const maxX = Math.ceil((origin.x + size) / step) * step;
  const maxZ = Math.ceil((origin.z + size) / step) * step;
  const nx = Math.round((maxX - minX) / step) + 1;
  const nz = Math.round((maxZ - minZ) / step) + 1;
  if (nx > FRONTIER_TEXTURE_COLOR_MAX_AXIS_SAMPLES || nz > FRONTIER_TEXTURE_COLOR_MAX_AXIS_SAMPLES) {
    throw new Error('frontier-texture-color-grid-too-large');
  }

  const colors = new Float64Array(nx * nz * 3);
  let exact = false;
  for (let iz = 0; iz < nz; iz += 1) for (let ix = 0; ix < nx; ix += 1) {
    const terrain = sample(minX + ix * step, minZ + iz * step);
    if ((terrain?.provinceInfluence ?? 0) < 1) exact = true;
    colors.set(colorOf(terrain), (iz * nx + ix) * 3);
  }

  if (exact) return (x, z) => colorOf(sample(x, z));

  return (x, z) => {
    x = clamp(Number.isFinite(x) ? x : origin.x, minX, maxX);
    z = clamp(Number.isFinite(z) ? z : origin.z, minZ, maxZ);
    const gx = (x - minX) / step, gz = (z - minZ) / step;
    const ix = Math.min(Math.floor(gx), nx - 2), iz = Math.min(Math.floor(gz), nz - 2);
    const tx = gx - ix, tz = gz - iz;
    const a = (iz * nx + ix) * 3, b = a + 3;
    const c = ((iz + 1) * nx + ix) * 3, d = c + 3;
    const result = [0, 0, 0];
    for (let channel = 0; channel < 3; channel += 1) {
      const south = colors[a + channel] + (colors[b + channel] - colors[a + channel]) * tx;
      const north = colors[c + channel] + (colors[d + channel] - colors[c + channel]) * tx;
      result[channel] = south + (north - south) * tz;
    }
    return result;
  };
}
