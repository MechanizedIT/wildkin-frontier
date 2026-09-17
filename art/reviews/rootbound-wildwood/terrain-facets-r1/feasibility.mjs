// Read-only numerical feasibility for one compact Rootbound 2m terrain-facet proposal.
// v1 is retained in ./v1 because it used a cross-chunk support and reconstructed camera.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrontierChunk, sampleFrontier } from '../../../../src/world/frontierTerrain.js';
import { ROOTBOUND_CURATED_SCENERY } from '../../../../src/world/frontierRootbound.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../');
const output = path.join(here, 'feasibility.json');
const sourcePath = path.join(repo, 'src/world/frontierRootbound.js');
const capturePath = path.join(here, '..', 'restart-r2-captures.json');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = vector => { const length = Math.hypot(...vector); if (!(length > 0)) throw new Error('zero-length vector'); return vector.map(value => value / length); };

// A five-by-five vertex subset wholly inside chunk (-9,13), aligned to the recorded destination view; its 2m boundary is zero.
const plan = Object.freeze({
  id: 'rootbound-lantern-threshold-facet-r1',
  bounds: { minX: -440, maxX: -432, minZ: 684, maxZ: 692 },
  center: { x: -436, z: 688 },
  halfExtentM: { x: 4, z: 4 },
  amplitudeM: 0.095,
  chunk: { cx: -9, cz: 13, originX: -450, originZ: 650, stepM: 2 },
});
function deltaAt(x, z) {
  const dx = (x - plan.center.x) / plan.halfExtentM.x;
  const dz = (z - plan.center.z) / plan.halfExtentM.z;
  const fade = smooth(1 - Math.max(Math.abs(dx), Math.abs(dz)));
  return plan.amplitudeM * fade * (1 - 0.4 * dx - 0.3 * dz);
}
function faceNormal(a, b, c) { return normalize(cross(sub(b, a), sub(c, a))); }
function angleDeg(a, b) { return Math.acos(clamp(dot(a, b), -1, 1)) * 180 / Math.PI; }

const chunk = createFrontierChunk(plan.chunk.cx, plan.chunk.cz);
const xs = Array.from(chunk.grid.xs, value => plan.chunk.originX + value);
const zs = Array.from(chunk.grid.zs, value => plan.chunk.originZ + value);
const findIndex = (values, expected) => {
  const index = values.findIndex(value => Math.abs(value - expected) < 1e-6);
  if (index < 0) throw new Error(`missing mesh coordinate ${expected}`);
  return index;
};
const ix0 = findIndex(xs, plan.bounds.minX), ix1 = findIndex(xs, plan.bounds.maxX);
const iz0 = findIndex(zs, plan.bounds.minZ), iz1 = findIndex(zs, plan.bounds.maxZ);
if (ix1 - ix0 !== 4 || iz1 - iz0 !== 4) throw new Error('proposal must cover exactly a 5x5 2m vertex grid');
const meshVertex = (ix, iz) => {
  const index = iz * xs.length + ix;
  return { index, x: xs[ix], z: zs[iz], y: chunk.vertices[index * 3 + 1] };
};
const grid = [];
for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
  const base = meshVertex(ix, iz);
  const query = sampleFrontier(base.x, base.z).height;
  const delta = deltaAt(base.x, base.z);
  grid.push({ ix, iz, localIndex: base.index, x: base.x, z: base.z, baselineHeight: base.y, queryHeight: query, queryMinusMeshM: query - base.y, deltaM: delta, candidateHeight: base.y + delta });
}
const lookup = new Map(grid.map(vertex => [`${vertex.ix},${vertex.iz}`, vertex]));
const triangles = [];
for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) {
  const a = lookup.get(`${ix},${iz}`), b = lookup.get(`${ix + 1},${iz}`), c = lookup.get(`${ix},${iz + 1}`), d = lookup.get(`${ix + 1},${iz + 1}`);
  for (const vertices of [[a, c, b], [b, c, d]]) {
    const base = vertices.map(vertex => [vertex.x, vertex.baselineHeight, vertex.z]);
    const candidate = vertices.map(vertex => [vertex.x, vertex.candidateHeight, vertex.z]);
    const before = faceNormal(...base), after = faceNormal(...candidate);
    triangles.push({ gridVertices: vertices.map(vertex => [vertex.ix, vertex.iz]), normalAngleDeg: angleDeg(before, after) });
  }
}
const changed = grid.filter(vertex => Math.abs(vertex.deltaM) > 1e-12);
const boundary = grid.filter(vertex => vertex.ix === ix0 || vertex.ix === ix1 || vertex.iz === iz0 || vertex.iz === iz1);

const source = fs.readFileSync(sourcePath, 'utf8');
const lifeMatch = source.match(/const PROTECTED_LIFE_POINTS = Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!lifeMatch) throw new Error('could not find PROTECTED_LIFE_POINTS');
const life = JSON.parse(`[${lifeMatch[1].replace(/,\s*$/, '')}]`);
const distanceToGrid = (x, z) => Math.min(...grid.map(vertex => Math.hypot(vertex.x - x, vertex.z - z)));
const nearestLifeVertex = life.map(point => ({ point, distanceM: distanceToGrid(point[0], point[1]) })).sort((a, b) => a.distanceM - b.distanceM)[0];
const curatedDistances = ROOTBOUND_CURATED_SCENERY.map(record => ({ key: record.key, x: record.x, z: record.z, centerToChangedVertexM: distanceToGrid(record.x, record.z) })).sort((a, b) => a.centerToChangedVertexM - b.centerToChangedVertexM);

const captures = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const destination = captures.views.find(capture => capture.name === 'destination');
if (!destination) throw new Error('restart-r2 destination capture missing');
const cameraState = destination.state.camera;
const player = destination.state.pos;
const yaw = cameraState.yaw, pitch = cameraState.pitch, effectiveDistance = cameraState.effectiveDistance;
const center = cameraState.center;
const orbit = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
const camera = center.map((value, index) => value + orbit[index] * effectiveDistance);
const forward = orbit.map(value => -value);
const right = normalize(cross(forward, [0, 1, 0]));
const up = normalize(cross(right, forward));
const fovDeg = 52, widthPx = 412, heightPx = 915, aspect = widthPx / heightPx, tan = Math.tan(fovDeg * Math.PI / 360);
function project(point) {
  const q = sub(point, camera), depthM = dot(q, forward);
  return { depthM, xNdc: dot(q, right) / (depthM * tan * aspect), yNdc: dot(q, up) / (depthM * tan), xPx: (dot(q, right) / (depthM * tan * aspect) + 1) * .5 * widthPx, yPx: (1 - dot(q, up) / (depthM * tan)) * .5 * heightPx };
}
const projection = grid.map(vertex => {
  const baseline = project([vertex.x, vertex.baselineHeight, vertex.z]);
  const candidate = project([vertex.x, vertex.candidateHeight, vertex.z]);
  return { x: vertex.x, z: vertex.z, deltaM: vertex.deltaM, baseline, candidate, verticalPixelDelta: Math.abs(candidate.yPx - baseline.yPx) };
});
const projectionChanged = projection.filter(entry => Math.abs(entry.deltaM) > 1e-12);
const max = values => Math.max(...values);
const min = values => Math.min(...values);
const result = {
  schema: 'rootbound-terrain-facets-r1-feasibility-v2',
  historical: { v1Directory: './v1', reason: 'v1 crossed the chunk boundary and reconstructed a camera from nominal horizontal/vertical dimensions.' },
  inputs: {
    terrainChunk: { ...plan.chunk, actualGrid: { nx: xs.length, nz: zs.length }, proposalLocalIndices: { ix: [ix0, ix1], iz: [iz0, iz1] } },
    meshStepM: 2,
    materialAlreadyFlatShaded: true,
    nativeCamera: { capture: 'restart-r2 destination', player: [player.x, player.y, player.z], center, yaw, pitch, effectiveDistanceM: effectiveDistance, horizontalDistanceM: cameraState.horizontalDistance, configuredHeightM: cameraState.height, fovDeg, framePx: [widthPx, heightPx], orbitDirection: orbit, calculatedCameraPosition: camera, forward, right, up },
  },
  proposal: plan,
  meshVertices: grid,
  triangles,
  summary: {
    selectedMeshVertices: grid.length,
    selectedMeshTriangles: triangles.length,
    changedVertices: changed.length,
    maxAbsDeltaM: max(grid.map(vertex => Math.abs(vertex.deltaM))),
    boundaryMaxAbsDeltaM: max(boundary.map(vertex => Math.abs(vertex.deltaM))),
    queryMeshHeightMaxAbsDeltaM: max(grid.map(vertex => Math.abs(vertex.queryMinusMeshM))),
    normalAngleDeg: { min: min(triangles.map(face => face.normalAngleDeg)), max: max(triangles.map(face => face.normalAngleDeg)), mean: triangles.reduce((sum, face) => sum + face.normalAngleDeg, 0) / triangles.length },
    projection: { changedVerticesInFront: projectionChanged.filter(entry => entry.baseline.depthM > 0 && entry.candidate.depthM > 0).length, changedVerticesInFrame: projectionChanged.filter(entry => Math.abs(entry.candidate.xNdc) <= 1 && Math.abs(entry.candidate.yNdc) <= 1).length, maxVerticalPixelDelta: max(projectionChanged.map(entry => entry.verticalPixelDelta)) },
  },
  protection: { nearestLifeVertex, curatedCenterDistances: curatedDistances, scope: 'Center-to-changed-vertex distances only. Complete transformed visual/collider hull, source/home, route footprint, and terrain-support checks remain source-pass gates.' },
  projection,
  limits: [
    'Read-only proposal: no runtime sampler includes this delta.',
    'This receipt samples actual chunk (-10,13) Float32 mesh vertices and compares sampleFrontier query height at those exact vertices.',
    'A source pass must place one final local term in the shared rootbound height chain so mesh, query, collisions, and terrain support agree.',
    'The native projection uses the recorded destination center/yaw/pitch/effectiveDistance and cameraFollow orbit convention; it is a vertex cue only, not a full geometry/HUD readability proof.',
  ],
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.summary, null, 2));
