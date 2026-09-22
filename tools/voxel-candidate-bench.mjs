// Isolated Phase 0 raw mesher benchmark. It does not exercise rendering,
// colliders, persistence, or workers; those are measured by the browser lab.
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { generatePadded } from '../lab/voxel/generator.js';
import { meshGreedy } from '../lab/voxel/js-mesher.js';

const wasmBytes = await readFile(new URL('../lab/voxel/candidates/block-mesh-wasm.wasm', import.meta.url));
const { instance: { exports: wasm } } = await WebAssembly.instantiate(wasmBytes);

function meshBlock(size, voxels) {
  const pointer = wasm.alloc_input(voxels.length);
  new Uint8Array(wasm.memory.buffer, pointer, voxels.length).set(voxels);
  wasm.mesh_padded(size, pointer);
  const result = { vertices: wasm.positions_len() / 3, triangles: wasm.indices_len() / 3 };
  wasm.free_input(pointer, voxels.length);
  return result;
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], minMs: sorted[0], maxMs: sorted.at(-1) };
}

const runs = [];
for (const size of [16, 32]) {
  const voxels = generatePadded(size, [0, 0, 0], 9212026, {});
  for (const [name, mesh] of [
    ['js-greedy', (s, v) => { const o = meshGreedy({ size: s, voxels: v }); return { vertices: o.positions.length / 3, triangles: o.indices.length / 3 }; }],
    ['block-mesh-wasm-no-ao-raw-output', meshBlock],
  ]) {
    for (let warmup = 0; warmup < 15; warmup++) mesh(size, voxels);
    const durations = [];
    let shape;
    for (let sample = 0; sample < 75; sample++) {
      const start = performance.now();
      shape = mesh(size, voxels);
      durations.push(performance.now() - start);
    }
    runs.push({ candidate: name, size, paddedVoxels: voxels.length, ...shape, ...stats(durations), samples: durations.length });
  }
}
console.log(JSON.stringify({ environment: { node: process.version, platform: process.platform, arch: process.arch }, runs }, null, 2));
