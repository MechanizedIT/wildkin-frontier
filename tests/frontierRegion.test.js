import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_REGION_CONFIG,
  createFrontierRegionSampler,
  sampleFrontierRegion,
} from '../src/world/frontierRegion.js';
import { FRONTIER_REGION_CATALOG } from '../src/world/frontierRegionCatalog.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

function colorDistance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function sum(values) { return Object.values(values).reduce((total, value) => total + value, 0); }

test('fixed macro ownership is seed-independent while local relief varies by seed', () => {
  const alternate = normalizeFrontierWorld({ edition: 1, seed: 0x13572468 });
  for (const record of FRONTIER_REGION_CATALOG) {
    const current = sampleFrontierRegion(record.x, record.z);
    const changed = sampleFrontierRegion(record.x, record.z, { world: alternate });
    assert.equal(current.habitatId, record.habitatId);
    assert.equal(current.habitatName, record.name);
    assert.equal(changed.habitatId, current.habitatId);
    if (current.influence > 0) {
      assert.equal(current.id, `f1:habitat:${record.habitatId}`);
      assert.equal(current.kind, record.baseKind);
      assert.equal(changed.id, current.id);
      assert.notEqual(changed.height, current.height, `${record.name} relief varies by world seed`);
    } else {
      assert.equal(current.id, null);
      assert.equal(current.kind, null);
    }
  }
});

test('sampler replay matches direct sampling and normalizes invalid coordinates', () => {
  const points = [[-930, -750], [470, 830], [995, -45], [-241, 618], [850, -2000]];
  const sampler = createFrontierRegionSampler(DEFAULT_FRONTIER_WORLD);
  assert.deepEqual(points.map(([x, z]) => sampler(x, z)), points.map(([x, z]) => sampleFrontierRegion(x, z)));
  assert.deepEqual(sampler(Number.NaN, Infinity), sampleFrontierRegion(0, 0));
  assert.deepEqual(sampleFrontierRegion(undefined, null), sampleFrontierRegion(0, 0));
  const extremeDirect = sampleFrontierRegion(Number.MAX_VALUE, -Number.MAX_VALUE);
  const extremeFactory = sampler(Number.MAX_VALUE, -Number.MAX_VALUE);
  assert.deepEqual(extremeDirect, sampleFrontierRegion(0, 0));
  assert.deepEqual(extremeFactory, extremeDirect);
  assert.ok(Number.isFinite(extremeDirect.height));
  assert.ok(extremeDirect.colorRGB.every(Number.isFinite));
  assert.ok(Object.values(extremeDirect.habitatWeights).every(Number.isFinite));
  assert.ok(Math.abs(sum(extremeDirect.habitatWeights) - 1) < 1e-12);
});

test('Camp apron and starter/Skybreak corridor reserve terrain but retain habitat ownership', () => {
  for (const [x, z] of [
    [-108, -108], [108, 108], [-108, 108], [108, -108], [0, 0],
    [-75, -275], [75, -275], [-75, -50], [75, -50], [0, -228], [32, -133], [7, -85],
  ]) {
    const sample = sampleFrontierRegion(x, z);
    assert.equal(sample.influence, 0, `reserved ${x},${z}`);
    assert.equal(sample.height, 0);
    assert.deepEqual(sample.colorRGB, [0, 0, 0]);
    assert.deepEqual(sample.weights, { lush: 0, sunscar: 0, ironspine: 0 });
    assert.equal(sample.id, null);
    assert.equal(sample.kind, null);
    assert.ok(sample.habitatId);
    assert.ok(Math.abs(sum(sample.habitatWeights) - 1) < 1e-12);
  }
  assert.equal(sampleFrontierRegion(178, 108).influence, 1);
  assert.ok(Math.abs(sampleFrontierRegion(143, 108).influence - .5) < 1e-12);
});

test('distance-gap blending is normalized and continuous across boundaries and a triple junction', () => {
  const epsilon = 1e-3;
  const boundary = [-212.5, 325];
  const a = sampleFrontierRegion(boundary[0] - epsilon, boundary[1] + epsilon);
  const b = sampleFrontierRegion(boundary[0] + epsilon, boundary[1] - epsilon);
  assert.notEqual(a.habitatId, b.habitatId, 'the fixed Heartwood/Rootbound bisector changes owner');
  assert.ok(Math.abs(a.height - b.height) < .01);
  assert.ok(colorDistance(a.colorRGB, b.colorRGB) < .001);

  let junction = null;
  for (let z = -1200; z <= 800 && !junction; z += 10) for (let x = -1200; x <= 800; x += 10) {
    const sample = sampleFrontierRegion(x, z);
    if (Object.keys(sample.habitatWeights).length >= 3) { junction = [x, z]; break; }
  }
  assert.ok(junction, 'fixed sites expose a blended triple junction');
  const center = sampleFrontierRegion(...junction);
  assert.ok(Math.abs(sum(center.habitatWeights) - 1) < 1e-12);
  for (const [dx, dz] of [[.1, 0], [-.1, 0], [0, .1], [0, -.1]]) {
    const nearby = sampleFrontierRegion(junction[0] + dx, junction[1] + dz);
    assert.ok(Math.abs(center.height - nearby.height) < .2);
    assert.ok(colorDistance(center.colorRGB, nearby.colorRGB) < .01);
  }
});

test('habitat weights aggregate into normalized legacy grammar weights', () => {
  const byId = new Map(FRONTIER_REGION_CATALOG.map(record => [record.habitatId, record]));
  for (let z = -4000; z <= 2400; z += 200) for (let x = -3600; x <= 2200; x += 200) {
    const sample = sampleFrontierRegion(x, z);
    assert.ok(Math.abs(sum(sample.habitatWeights) - 1) < 1e-12);
    assert.ok(Object.values(sample.habitatWeights).every(value => value > 0 && value <= 1));
    if (sample.influence > 0) {
      assert.ok(Math.abs(sum(sample.weights) - 1) < 1e-12);
      for (const kind of ['lush', 'sunscar', 'ironspine']) {
        const expected = Object.entries(sample.habitatWeights).reduce((total, [id, weight]) => {
          return total + (byId.get(id).baseKind === kind ? weight : 0);
        }, 0);
        assert.ok(Math.abs(sample.weights[kind] - expected) < 1e-12);
      }
    }
    assert.ok(sample.height >= FRONTIER_REGION_CONFIG.minHeight && sample.height <= FRONTIER_REGION_CONFIG.maxHeight);
  }
});

test('the three retained base grammars keep distinct morphology and palettes', () => {
  const lush = sampleFrontierRegion(-425, 650);
  const sunscarSamples = [];
  const ironSamples = [];
  for (let dz = -300; dz <= 300; dz += 20) {
    sunscarSamples.push(sampleFrontierRegion(-1850, 50 + dz));
    ironSamples.push(sampleFrontierRegion(-2100, -3000 + dz));
  }
  const sunscarHigh = sunscarSamples.reduce((a, b) => a.height > b.height ? a : b);
  const sunscarLow = sunscarSamples.reduce((a, b) => a.height < b.height ? a : b);
  const ironHigh = ironSamples.reduce((a, b) => a.height > b.height ? a : b);
  assert.equal(lush.kind, 'lush');
  assert.equal(sunscarHigh.kind, 'sunscar');
  assert.equal(ironHigh.kind, 'ironspine');
  assert.ok(sunscarHigh.height - sunscarLow.height > 8, 'Sunscar retains directional rib relief');
  assert.ok(sunscarHigh.colorRGB[0] > lush.colorRGB[0] + .3, 'Sunscar remains visibly warm');
  assert.ok(ironHigh.height > 40, 'Ironspine retains broad vertical structure');
  assert.ok(ironHigh.colorRGB[2] > lush.colorRGB[2] + .1, 'Ironspine remains mineral-blue');
});

test('Caldera profile leaves a zero-weight habitat core numerically unchanged', () => {
  const rootbound = sampleFrontierRegion(-425, 650, { disableRootbound: true });
  assert.equal(rootbound.calderaWeight, 0);
  assert.equal(rootbound.calderaFeature, null);
  assert.equal(rootbound.height, 9.955295973644231);
  assert.deepEqual(rootbound.colorRGB, [0.18, 0.43, 0.2]);
  assert.deepEqual(rootbound.weights, { lush: 1, sunscar: 0, ironspine: 0 });
});
