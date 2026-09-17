// CPU-only preview feasibility for the Rootbound terrain-facets R2 proposal.
// It reads actual current chunk Float32 geometry; it does not modify source/runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrontierChunk, sampleFrontier } from '../../../../src/world/frontierTerrain.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(here, 'parameters.json'), 'utf8'));
const out = path.join(here, 'feasibility.json');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const sub3 = (a, b) => a.map((v, i) => v - b[i]);
const dot3 = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const n = Math.hypot(...a); if (!n) throw new Error('zero vector'); return a.map(v => v / n); };
const angle = (a, b) => Math.acos(clamp(dot3(a, b), -1, 1)) * 180 / Math.PI;
const normal = (a, b, c) => norm(cross(sub3(b, a), sub3(c, a)));
const rect = params.reference.r1Rectangle, [px, pz] = params.reference.destinationPose.playerXZ;
const F = params.localAxes.forwardXZ, R = params.localAxes.cameraRightXZ;
const axis = (x, z) => { const q = [x - px, z - pz]; return { u: dot2(q, F), s: dot2(q, R) }; };
function edgeFade(x, z) {
  const d = Math.min(x - rect.minX, rect.maxX - x, z - rect.minZ, rect.maxZ - z);
  return smooth(d / params.mesh.boundaryFadeM);
}
function candidateAt(x, z) {
  const { u, s } = axis(x, z), fan = params.facetFan, lane = params.lane;
  const forwardFade = smooth((u - fan.nearForwardM) / 1.5) * smooth((fan.farForwardM - u) / 2);
  const left = smooth((-s - lane.sideHalfWidthM) / lane.sideTransitionM);
  const right = smooth((s - lane.sideHalfWidthM) / lane.sideTransitionM);
  const plane = left * (fan.leftPlanePeakM + fan.leftForwardSlope * (u - 4))
    + right * (fan.rightPlaneTroughM + fan.rightForwardSlope * (u - 4));
  const weight = edgeFade(x, z) * forwardFade;
  const colorWeight = weight * Math.max(left, right);
  return { u, s, left, right, weight, deltaM: plane * weight, colorWeight };
}
const chunks = new Map([[-10, createFrontierChunk(-10, 13)], [-9, createFrontierChunk(-9, 13)]]);
function exactVertex(x, z) {
  const cx = x < -450 ? -10 : -9, chunk = chunks.get(cx);
  const ix = Math.round((x - chunk.origin.x) / 2), iz = Math.round((z - chunk.origin.z) / 2);
  const nx = chunk.grid.xs.length, index = iz * nx + ix;
  if (Math.abs(chunk.origin.x + chunk.grid.xs[ix] - x) > 1e-6 || Math.abs(chunk.origin.z + chunk.grid.zs[iz] - z) > 1e-6) throw new Error('non-grid point');
  return { y: chunk.vertices[index * 3 + 1], rgb: Array.from(chunk.colors.slice(index * 3, index * 3 + 3)), cx, ix, iz };
}
const vertices = [];
for (let z = rect.minZ; z <= rect.maxZ; z += 2) for (let x = rect.minX; x <= rect.maxX; x += 2) {
  const base = exactVertex(x, z), term = candidateAt(x, z), q = sampleFrontier(x, z);
  const tint = params.facetFan.colorDeltaRgbAtFullWeight;
  vertices.push({ x, z, ...base, queryMinusMeshM: q.height - base.y, ...term,
    candidateY: base.y + term.deltaM,
    candidateRgb: base.rgb.map((v, i) => clamp(v + tint[i] * term.colorWeight, 0, 1)) });
}
const by = new Map(vertices.map(v => [`${v.x},${v.z}`, v]));
const triangles = [];
for (let z = rect.minZ; z < rect.maxZ; z += 2) for (let x = rect.minX; x < rect.maxX; x += 2) {
  for (const vs of [[by.get(`${x},${z}`), by.get(`${x},${z + 2}`), by.get(`${x + 2},${z}`)], [by.get(`${x + 2},${z}`), by.get(`${x},${z + 2}`), by.get(`${x + 2},${z + 2}`)]]) {
    const before = normal(...vs.map(v => [v.x, v.y, v.z])), after = normal(...vs.map(v => [v.x, v.candidateY, v.z]));
    triangles.push({ vertices: vs.map(v => [v.x, v.z]), normalRotationDeg: angle(before, after), candidateSlope: Math.acos(clamp(after[1], -1, 1)) * 180 / Math.PI });
  }
}
const yaw = params.reference.destinationPose.yaw, pitch = params.reference.destinationPose.pitchRad, d = params.reference.destinationPose.effectiveDistanceM;
const center = [-449, 10.459901237487797, 675], orbit = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
const camera = center.map((v, i) => v + orbit[i] * d), forward = orbit.map(v => -v), right = norm(cross(forward, [0, 1, 0])), up = norm(cross(right, forward));
const tan = Math.tan(params.reference.destinationPose.fovDeg * Math.PI / 360), [w, h] = params.reference.destinationPose.framePx, aspect = w / h;
function project(point) { const q = sub3(point, camera), depth = dot3(q, forward), xn = dot3(q, right) / (depth * tan * aspect), yn = dot3(q, up) / (depth * tan); return { depthM: depth, xPx: (xn + 1) * w / 2, yPx: (1 - yn) * h / 2, inFrame: depth > 0 && Math.abs(xn) <= 1 && Math.abs(yn) <= 1 }; }
const projected = vertices.filter(v => Math.abs(v.deltaM) > .01).map(v => { const a = project([v.x, v.y, v.z]), b = project([v.x, v.candidateY, v.z]); return { x: v.x, z: v.z, deltaM: v.deltaM, baseline: a, candidate: b, verticalPixelDelta: Math.abs(b.yPx - a.yPx) }; });
const n = a => ({ min: Math.min(...a), max: Math.max(...a), mean: a.reduce((s, v) => s + v, 0) / a.length });
const result = { schema: 'rootbound-terrain-facets-r2-feasibility-v1', status: 'read-only CPU proposal', parameters: params, actualChunks: [...chunks.values()].map(c => ({ id: c.id, vertices: c.vertices.length / 3, triangles: c.indices.length / 3 })), summary: {
  vertices: vertices.length, triangles: triangles.length, changedVertices: projected.length, unchangedBoundary: vertices.filter(v => v.x === rect.minX || v.x === rect.maxX || v.z === rect.minZ || v.z === rect.maxZ).every(v => Math.abs(v.deltaM) < 1e-12),
  queryMeshDifferenceM: n(vertices.map(v => Math.abs(v.queryMinusMeshM))), deltaM: n(vertices.map(v => v.deltaM)), normalRotationDeg: n(triangles.map(t => t.normalRotationDeg)), candidateSlopeDeg: n(triangles.map(t => t.candidateSlope)), projection: { inFrame: projected.filter(p => p.candidate.inFrame).length, verticalPixelDelta: n(projected.map(p => p.verticalPixelDelta)), usefulScreen: [40, 372, 150, 640] } }, vertices, triangles, projected,
limits: ['Preview math only; runtime has no candidate height/color term.', 'The central lane mask is a design constraint, not a completed player-footprint/support proof.', 'Future authoritative integration must use one shared final rootbound height/color term so terrain mesh, query, physics surfaces and supports agree.'] };
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.summary, null, 2));
