export const key = (x, y, z) => `${x},${y},${z}`;
export const parseKey = (value) => value.split(',').map(Number);
export const index3 = (x, y, z, n) => x + n * (y + n * z);
export function address(x, y, z, size) {
  if (![16, 32].includes(size) || ![x, y, z].every(Number.isSafeInteger)) throw new RangeError('Unsafe voxel address');
  const chunk = [x, y, z].map(v => Math.floor(v / size));
  const local = [x, y, z].map((v, i) => v - chunk[i] * size);
  return { chunk, local, key: key(...chunk), index: index3(...local, size) };
}
export function affectedChunks(x, y, z, size) {
  // Face, edge and corner neighbours consume the one-voxel AO shell.
  const { chunk, local } = address(x, y, z, size);
  const offsets = local.map(v => [0, ...(v === 0 ? [-1] : v === size - 1 ? [1] : [])]);
  const result = [];
  for (const dx of offsets[0]) for (const dy of offsets[1]) for (const dz of offsets[2]) result.push(key(chunk[0] + dx, chunk[1] + dy, chunk[2] + dz));
  return result;
}
export function toLocal(global, origin) { return global.map((v, i) => v - origin[i]); }
export function toGlobal(local, origin) { return local.map((v, i) => v + origin[i]); }
export function raycastVoxel(start, direction, read, maxDistance = 7) {
  const length = Math.hypot(...direction);
  if (!length) return null;
  const d = direction.map(v => v / length), cell = start.map(Math.floor), normal = [0, 0, 0];
  const step = d.map(Math.sign);
  const delta = d.map(v => v === 0 ? Infinity : Math.abs(1 / v));
  const next = d.map((v, i) => v === 0 ? Infinity : ((v > 0 ? cell[i] + 1 : cell[i]) - start[i]) / v);
  let distance = 0;
  while (distance <= maxDistance) {
    const material = read(...cell);
    if (material) return { cell: [...cell], material, distance, normal: [...normal] };
    let axis = next[0] <= next[1] && next[0] <= next[2] ? 0 : next[1] <= next[2] ? 1 : 2;
    distance = next[axis]; cell[axis] += step[axis]; next[axis] += delta[axis];
    normal.fill(0); normal[axis] = -step[axis];
  }
  return null;
}
