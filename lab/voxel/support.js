import { key, parseKey } from './coordinates.js';
const NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// Phase 0 fixture: flood the bounded wood structure; terrain is an anchor.
// A missing residency witness is conservatively supported, never detached.
export function unsupportedWood(read, known = () => true, cap = 64, spacing = 1) {
  const remaining = new Set();
  const high=spacing===1?[5,4,-2]:[6/spacing,5/spacing,-1/spacing];
  for (let x = -2/spacing; x <= high[0]; x++) for (let y = 1/spacing; y <= high[1]; y++) for (let z = -4/spacing; z <= high[2]; z++) if (read(x, y, z) === 3) remaining.add(key(x, y, z));
  const detached = [];
  while (remaining.size) {
    const queue = [parseKey(remaining.values().next().value)], cells = []; let supported = false;
    remaining.delete(key(...queue[0]));
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]; cells.push(p);
      for (const d of NEIGHBOURS) {
        const q = p.map((v, a) => v + d[a]);
        if (!known(...q)) supported = true;
        const material = read(...q);
        if (material && material !== 3) supported = true;
        const k = key(...q);
        if (remaining.delete(k)) queue.push(q);
      }
    }
    if (!supported && cells.length <= cap) detached.push(cells);
  }
  return detached;
}
