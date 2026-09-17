import fs from 'node:fs';
import path from 'node:path';
import { createFrontierChunk, sampleFrontier, sampleFrontierHeight, worldToChunk } from '../../../../src/world/frontierTerrain.js';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const overview = JSON.parse(fs.readFileSync(path.join(here, 'final-overview.json'), 'utf8'));
const walks = ['walk-across-shoulder.json', 'walk-back-from-shoulder.json'].map(name => ({
  name,
  data: JSON.parse(fs.readFileSync(path.join(here, name), 'utf8')),
}));

function meshHeightAt(chunk, x, z) {
  const localX = x - chunk.origin.x, localZ = z - chunk.origin.z;
  const { xs, zs } = chunk.grid;
  const cell = (axis, value) => {
    let index = 0;
    while (index < axis.length - 2 && axis[index + 1] < value) index += 1;
    return index;
  };
  const ix = cell(xs, localX), iz = cell(zs, localZ), stride = xs.length;
  const tx = (localX - xs[ix]) / (xs[ix + 1] - xs[ix]);
  const tz = (localZ - zs[iz]) / (zs[iz + 1] - zs[iz]);
  const a = chunk.vertices[(iz * stride + ix) * 3 + 1];
  const b = chunk.vertices[(iz * stride + ix + 1) * 3 + 1];
  const c = chunk.vertices[((iz + 1) * stride + ix) * 3 + 1];
  const d = chunk.vertices[((iz + 1) * stride + ix + 1) * 3 + 1];
  return tx + tz <= 1
    ? a + (b - a) * tx + (c - a) * tz
    : b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function absStats(values) {
  const absolute = values.map(Math.abs);
  return { maxAbsM: Math.max(...absolute), meanAbsM: mean(absolute) };
}

const rows = overview.supportRays.map(({ x, z, query, hitHeight, surface }) => {
  const { cx, cz } = worldToChunk(x, z);
  const productionMesh = meshHeightAt(createFrontierChunk(cx, cz), x, z);
  const disabledMesh = meshHeightAt(createFrontierChunk(cx, cz, { disableRootbound: true }), x, z);
  const disabledAnalytic = sampleFrontierHeight(x, z, { disableRootbound: true });
  const productionAnalytic = sampleFrontierHeight(x, z);
  return {
    point: { x, z, surface },
    production: {
      analyticHeightM: productionAnalytic,
      triangleMeshHeightM: productionMesh,
      rapierHitHeightM: hitHeight,
      analyticMinusMeshM: productionAnalytic - productionMesh,
      meshMinusRapierM: productionMesh - hitHeight,
    },
    disableRootboundBaseline: {
      analyticHeightM: disabledAnalytic,
      triangleMeshHeightM: disabledMesh,
      analyticMinusMeshM: disabledAnalytic - disabledMesh,
    },
    recordedOverviewQueryM: query,
  };
});
const walkSummary = Object.fromEntries(walks.map(({ name, data }) => {
  const trace = data.trace;
  const first = trace[0], last = trace.at(-1);
  const ys = trace.map(sample => sample.pos.y);
  return [name.replace('.json', ''), {
    input: data.input,
    key: data.key,
    samples: trace.length,
    elapsedMs: last.ms - first.ms,
    planarDistanceM: Math.hypot(last.pos.x - first.pos.x, last.pos.z - first.pos.z),
    playerYRangeM: { min: Math.min(...ys), max: Math.max(...ys) },
    groundedSamples: trace.filter(sample => sample.grounded).length,
    ungroundedSamples: trace.filter(sample => !sample.grounded).length,
  }];
}));
const result = {
  scope: 'Read-only comparison of recorded production Rapier ray hits with the same production chunk triangle interpolation. Baseline rows use disableRootbound analytic and mesh values only; no baseline Rapier hits were recorded.',
  supportRayCount: rows.length,
  supportRays: rows,
  summary: {
    productionAnalyticMinusMesh: absStats(rows.map(row => row.production.analyticMinusMeshM)),
    productionMeshMinusRapier: absStats(rows.map(row => row.production.meshMinusRapierM)),
    baselineAnalyticMinusMesh: absStats(rows.map(row => row.disableRootboundBaseline.analyticMinusMeshM)),
  },
  walks: walkSummary,
};
fs.writeFileSync(path.join(here, 'mesh-contact-check.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));