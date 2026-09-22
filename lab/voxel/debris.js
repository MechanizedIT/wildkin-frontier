// Bounded detached-actor geometry.  This is intentionally separate from the
// streamed chunk mesher: a falling component has a small, immutable density
// snapshot, so its visible mesh and its physics proxy cannot disagree after
// its source voxels have been removed from the world.
import { meshSurfaceNets } from './surface-nets.js';

export const MAX_DEBRIS_SAMPLES = 4096;
export const MAX_COMPOUND_BOXES = 64;

function assertRecord(record) {
  if (!record?.id || !Array.isArray(record.cells) || !record.cells.length || !record.cells.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isSafeInteger))) throw new Error('Invalid debris cells');
  if (!record.position || record.position.length !== 3 || !record.position.every(Number.isFinite)) throw new Error('Invalid debris position');
  if (record.mode === 'smooth') {
    if (!Array.isArray(record.samples) || record.samples.length !== record.cells.length || record.cells.length > MAX_DEBRIS_SAMPLES || ![0.25, 0.5].includes(record.spacing) || !record.samples.every(Number.isFinite)) throw new Error('Invalid smooth debris density snapshot');
  }
}

export function debrisReferenceCenter(record) {
  assertRecord(record);
  const spacing = record.mode === 'smooth' ? record.spacing : 1;
  const offset = record.mode === 'smooth' ? 0 : 0.5;
  return record.cells.reduce((sum, cell) => sum.map((v, axis) => v + (cell[axis] + offset) * spacing / record.cells.length), [0, 0, 0]);
}

function emptyGeometry() { return { positions: new Float32Array(), normals: new Float32Array(), colors: new Float32Array(), indices: new Uint32Array(), referenceCenter: [0, 0, 0], mode: 'empty' }; }

function smoothGeometry(record) {
  const referenceCenter = debrisReferenceCenter(record);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const cell of record.cells) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], cell[axis]); max[axis] = Math.max(max[axis], cell[axis]); }
  // One air-sample margin permits a closed surface even when the component
  // fills its own sample bounds.  Surface Nets operates on cubic fields.
  const origin = min.map(v => v - 1);
  const size = Math.max(...max.map((v, axis) => v - origin[axis])) + 1;
  if (size > 64) throw new Error('Smooth debris density cube exceeds 64 samples per side');
  const n = size + 2, densities = new Float32Array(n ** 3), materials = new Uint8Array(n ** 3);
  densities.fill(1);
  const index = (x, y, z) => (x + 1) + n * ((y + 1) + n * (z + 1));
  for (let i = 0; i < record.cells.length; i++) {
    const local = record.cells[i].map((v, axis) => v - origin[axis]);
    densities[index(...local)] = record.samples[i];
    // Detached Phase 0 support components are wood.  This remains a render
    // material only; source material/drop ownership stays in world state.
    materials[index(...local)] = record.samples[i] < 0 ? 3 : 0;
  }
  const mesh = meshSurfaceNets({ size, densities, materials, spacing: record.spacing });
  const positions = new Float32Array(mesh.positions.length);
  for (let i = 0; i < positions.length; i += 3) for (let axis = 0; axis < 3; axis++) positions[i + axis] = mesh.positions[i + axis] + origin[axis] * record.spacing - referenceCenter[axis];
  return { ...mesh, positions, referenceCenter, mode: 'smooth' };
}

function blockGeometry(record) {
  const referenceCenter = debrisReferenceCenter(record), positions = [], normals = [], colors = [], indices = [];
  const faces = [
    [[-1,0,0], [[0,0,0],[0,0,1],[0,1,1],[0,1,0]]], [[1,0,0], [[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],
    [[0,-1,0], [[0,0,1],[0,0,0],[1,0,0],[1,0,1]]], [[0,1,0], [[0,1,0],[0,1,1],[1,1,1],[1,1,0]]],
    [[0,0,-1], [[0,0,0],[0,1,0],[1,1,0],[1,0,0]]], [[0,0,1], [[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],
  ];
  const cells = new Set(record.cells.map(p => p.join(',')));
  for (const cell of record.cells) for (const [normal, corners] of faces) {
    const neighbour = cell.map((v, axis) => v + normal[axis]).join(','); if (cells.has(neighbour)) continue;
    const base = positions.length / 3;
    for (const corner of corners) { positions.push(...corner.map((v, axis) => cell[axis] + v - referenceCenter[axis])); normals.push(...normal); colors.push(.55, .34, .15); }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colors), indices: new Uint32Array(indices), referenceCenter, mode: 'block' };
}

export function createDebrisGeometry(record) {
  assertRecord(record);
  return record.mode === 'smooth' ? smoothGeometry(record) : blockGeometry(record);
}

export function geometryBounds(geometry) {
  if (!geometry.positions.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < geometry.positions.length; i += 3) for (let axis = 0; axis < 3; axis++) { const v = geometry.positions[i + axis]; min[axis] = Math.min(min[axis], v); max[axis] = Math.max(max[axis], v); }
  return { min, max, center: min.map((v, axis) => (v + max[axis]) / 2), halfExtents: min.map((v, axis) => Math.max(0.025, (max[axis] - v) / 2)) };
}
