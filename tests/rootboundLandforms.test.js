import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierChunk, sampleFrontier, sampleFrontierHeight, worldToChunk } from '../src/world/frontierTerrain.js';
import { ROOTBOUND_LANDFORM_BRANCH, ROOTBOUND_LANDFORM_ROUTE, sampleRootboundLandform } from '../src/world/rootboundLandforms.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

function meshHeightAt(chunk, x, z) {
  const localX = x - chunk.origin.x, localZ = z - chunk.origin.z, { xs, zs } = chunk.grid;
  const cell = (axis, value) => {
    let index = 0;
    while (index < axis.length - 2 && axis[index + 1] < value) index += 1;
    return index;
  };
  const ix = cell(xs, localX), iz = cell(zs, localZ), tx = (localX - xs[ix]) / (xs[ix + 1] - xs[ix]), tz = (localZ - zs[iz]) / (zs[iz + 1] - zs[iz]);
  const stride = xs.length, a = chunk.vertices[(iz * stride + ix) * 3 + 1], b = chunk.vertices[(iz * stride + ix + 1) * 3 + 1];
  const c = chunk.vertices[((iz + 1) * stride + ix) * 3 + 1], d = chunk.vertices[((iz + 1) * stride + ix + 1) * 3 + 1];
  return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

test('Rootbound landforms build a substantial five-room vertical composition', () => {
  const low = sampleRootboundLandform(-475, 590), gallery = sampleRootboundLandform(-478, 652);
  const hollow = sampleRootboundLandform(-444, 679), verge = sampleRootboundLandform(-415, 694), crown = sampleRootboundLandform(-475, 720);
  assert.equal(low.zone, 'spore-meadow');
  assert.equal(hollow.zone, 'lantern-hollow');
  assert.equal(verge.zone, 'thornstone-verge');
  assert.equal(crown.zone, 'heartroot-crown');
  assert.ok(crown.heightOffset - low.heightOffset > 10, 'Crown rises more than ten metres from the Meadow');
  assert.ok(verge.heightOffset - gallery.heightOffset > 2.5, 'optional Verge has a distinct climb');
  assert.ok(hollow.heightOffset < gallery.heightOffset - 1.4, 'Lantern floor sits below its gallery bench');
  assert.equal(sampleRootboundLandform(-700, 650).heightOffset, 0, 'outside the finite habitat remains neutral');
});

test('Rootbound routes actually climb and all height queries match terrain mesh seams', () => {
  const route = [...ROOTBOUND_LANDFORM_ROUTE, ...ROOTBOUND_LANDFORM_BRANCH];
  const elevations = route.map(point => sampleRootboundLandform(point.x, point.z).heightOffset);
  assert.ok(Math.max(...elevations) - Math.min(...elevations) > 10, 'main and optional routes span real elevation');
  assert.ok(elevations[3] > elevations[0] + 3, 'Gallery approach climbs from the Meadow');
  const chunks = new Map();
  for (const point of route) {
    // Terrain chunks use a two-metre shared vertex grid.  Sample the nearest
    // real vertex, which proves the streamed collision mesh owns this field.
    const x = Math.round(point.x / 2) * 2, z = Math.round(point.z / 2) * 2;
    const { cx, cz } = worldToChunk(x, z), key = `${cx},${cz}`;
    if (!chunks.has(key)) chunks.set(key, createFrontierChunk(cx, cz));
    assert.equal(sampleFrontier(x, z).height, sampleFrontierHeight(x, z));
    assert.ok(Math.abs(meshHeightAt(chunks.get(key), x, z) - sampleFrontierHeight(x, z)) < 1e-5, `mesh shares terrain height at ${x},${z}`);
  }
});

function walkSamples(route, maxStep = 1) {
  const samples = [];
  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1], b = route[index], dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz), steps = Math.ceil(length / maxStep), nx = -dz / length, nz = dx / length;
    for (let step = 0; step <= steps; step += 1) for (const side of [-2.5, 0, 2.5]) {
      const t = step / steps;
      samples.push({ x: a.x + dx * t + nx * side, z: a.z + dz * t + nz * side, side, segment: index });
    }
  }
  return samples;
}

test('Rootbound route grades remain continuous and walkable across their full widths', () => {
  for (const [name, route, limit] of [['primary', ROOTBOUND_LANDFORM_ROUTE, .4], ['verge branch', ROOTBOUND_LANDFORM_BRANCH, .5]]) {
    const samples = walkSamples(route);
    for (const side of [-2.5, 0, 2.5]) {
      const lane = samples.filter(sample => sample.side === side);
      for (let index = 1; index < lane.length; index += 1) {
        if (lane[index].segment !== lane[index - 1].segment && index % 3 !== 0) continue;
        const distance = Math.hypot(lane[index].x - lane[index - 1].x, lane[index].z - lane[index - 1].z);
        if (distance < 1e-6) continue;
        const grade = Math.abs(sampleFrontier(lane[index].x, lane[index].z).height - sampleFrontier(lane[index - 1].x, lane[index - 1].z).height) / distance;
        assert.ok(grade <= limit, `${name} grade ${grade.toFixed(3)} at segment ${lane[index].segment}, side ${side}`);
      }
    }
  }
});

test('Rootbound arbitrary route samples remain on the streamed terrain surface', () => {
  for (const point of [
    { x: -478.4, z: 637.7 }, { x: -469.6, z: 665.1 }, { x: -451.3, z: 691.2 },
    { x: -474.2, z: 714.6 }, { x: -424.7, z: 682.4 }, { x: -416.3, z: 694.8 },
  ]) {
    const { cx, cz } = worldToChunk(point.x, point.z), chunk = createFrontierChunk(cx, cz);
    assert.ok(Math.abs(meshHeightAt(chunk, point.x, point.z) - sampleFrontierHeight(point.x, point.z)) < .13,
      `streamed mesh stays near its analytical terrain at ${point.x},${point.z}`);
  }
});

test('the actual world-data eastern resident keeps its full movement disk on the Verge skirt', () => {
  const resident = sampleFrontierWildlifeChunk(-8, 13, { visualAssets: WORLD_DATA.visualAssets })
    .find(candidate => candidate.id === 'f1:w:-8:13:0');
  assert.ok(resident, 'the authored wildlife fixture remains admitted');
  const radius = Math.max(resident.roamRadius ?? 0, resident.leashRadius ?? 0, resident.fleeLeashRadius ?? 0);
  assert.equal(radius, 8.5, 'test uses the resident’s real leash radius');
  assert.equal(hasFootprintSupport(resident.homePos.x, resident.homePos.z, {
    getHeight: sampleFrontierHeight, radius, maxSlope: .32,
  }), true, 'the entire actual home disk stays safely supported');
});
