// Isolated Phase 0 adapter for the published @voxelize/wasm-mesher package.
// It intentionally converts the lab's padded x-fast Uint8Array rather than
// changing the lab contract to Voxelize's column-oriented Uint32 format.
import init, {
  mesh_chunk_full,
} from '../vendor/voxelize-wasm-mesher-3.0.0/voxelize_wasm_mesher.js';

const MATERIAL_COLORS = [
  [0, 0, 0],
  [0.48, 0.59, 0.64],
  [0.73, 0.47, 0.29],
  [0.55, 0.34, 0.15],
];

const DIRECTIONS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function block(id, name, isEmpty = false) {
  return {
    id, name, rotatable: false, yRotatable: false, isEmpty,
    isFluid: false, isWaterloggable: false, isWaterloggingFluid: false,
    isOpaque: !isEmpty, isSeeThrough: isEmpty,
    isTransparent: [false, false, false, false, false, false],
    transparentStandalone: false, occludesFluid: false, isPlant: false,
    stackGroup: 0, isAnimated: false,
    // The Voxelize greedy path still requires a cardinal face descriptor for
    // each exterior direction, even though full-cube faces provide positions.
    faces: isEmpty ? [] : DIRECTIONS.map((dir, index) => ({
      name: `face-${index}`, independent: false, isolated: false,
      textureGroup: null, dir,
      corners: [
        { pos: [0, 0, 0], uv: [0, 0] }, { pos: [0, 0, 0], uv: [1, 0] },
        { pos: [0, 0, 0], uv: [0, 1] }, { pos: [0, 0, 0], uv: [1, 1] },
      ], range: { startU: 0, endU: 1, startV: 0, endV: 1 }, emissive: 0,
    })),
    aabbs: isEmpty ? [] : [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }],
    dynamicPatterns: null,
  };
}

const REGISTRY = { blocksById: [
  [0, block(0, 'air', true)], [1, block(1, 'stone')],
  [2, block(2, 'soil')], [3, block(3, 'wood')],
] };

function normalsFor(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
    let nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1; nx /= length; ny /= length; nz /= length;
    for (const offset of [a, b, c]) { normals[offset] = nx; normals[offset + 1] = ny; normals[offset + 2] = nz; }
  }
  return normals;
}

export async function createVoxelizeCandidate() {
  await init();
  return {
    name: '@voxelize/wasm-mesher@3.0.0',
    mesh({ size, voxels }) {
      const side = size + 2;
      if (!(voxels instanceof Uint8Array) || voxels.length !== side ** 3) throw new Error('Expected padded Uint8Array');
      // Voxelize stores x-major, z-fast; lab storage is x-fast, then y, then z.
      const converted = new Uint32Array(voxels.length);
      for (let z = 0; z < side; z++) for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) converted[x * side * side + y * side + z] = voxels[x + y * side + z * side * side];
      const lights = new Uint32Array(converted.length);
      const chunks = Array(9).fill(null);
      chunks[4] = { voxels: converted, lights, shape: [side, side, side], min: [0, 0, 0] };
      const result = mesh_chunk_full({ chunks, min: [1, 1, 1], max: [size + 1, size + 1, size + 1], registry: REGISTRY, config: { chunkSize: side } });
      const positionData = [], indexData = [], colorData = [];
      let base = 0;
      for (const geometry of result.geometries) {
        const color = MATERIAL_COLORS[geometry.voxel] ?? MATERIAL_COLORS[0];
        for (let i = 0; i < geometry.positions.length; i += 3) {
          const ao = ((geometry.lights[i / 3] >>> 16) & 0x3);
          const shade = 1 - ao * 0.18;
          positionData.push(geometry.positions[i] - 1, geometry.positions[i + 1] - 1, geometry.positions[i + 2] - 1);
          colorData.push(color[0] * shade, color[1] * shade, color[2] * shade);
        }
        for (const index of geometry.indices) indexData.push(index + base);
        base += geometry.positions.length / 3;
      }
      const positions = new Float32Array(positionData), indices = new Uint32Array(indexData);
      return { positions, normals: normalsFor(positions, indices), colors: new Float32Array(colorData), indices, timings: { conversionBytes: converted.byteLength, geometryCount: result.geometries.length } };
    },
  };
}
