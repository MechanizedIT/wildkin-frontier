import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_REGION_CONFIG,
  createFrontierRegionSampler,
  sampleFrontierRegion,
} from '../src/world/frontierRegion.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

test('province samples and stable seed-specific ids replay independently of query order', () => {
  const points = [[-930, -750], [470, 830], [995, -45], [-241, 618]];
  const forward = points.map(([x, z]) => sampleFrontierRegion(x, z));
  const reverse = [...points].reverse().map(([x, z]) => sampleFrontierRegion(x, z)).reverse();
  assert.deepEqual(forward, reverse);
  const sampler = createFrontierRegionSampler(DEFAULT_FRONTIER_WORLD);
  assert.deepEqual(points.map(([x, z]) => sampler(x, z)), forward);
  assert.ok(forward.every(sample => /^f1:region:[0-9a-f]{8}:-?\d+:-?\d+$/.test(sample.id)));

  const alternate = normalizeFrontierWorld({ edition: 1, seed: 0x13572468 });
  const changed = points.map(([x, z]) => sampleFrontierRegion(x, z, { world: alternate }));
  assert.ok(changed.some((sample, index) => sample.id !== forward[index].id));
  assert.ok(changed.some((sample, index) => sample.height !== forward[index].height));
});

test('Camp apron and connected starter/Skybreak corridor are exact zero-influence reserves', () => {
  for (const [x, z] of [
    [-108, -108], [108, 108], [-108, 108], [108, -108], [0, 0],
    [-75, -275], [75, -275], [-75, -50], [75, -50], [0, -228], [32, -133], [7, -85],
  ]) assert.equal(sampleFrontierRegion(x, z).influence, 0, `reserved ${x},${z}`);
  assert.equal(sampleFrontierRegion(178, 108).influence, 1, '70m outside the Camp apron reaches full influence');
  const halfway = sampleFrontierRegion(143, 108).influence;
  assert.ok(Math.abs(halfway - .5) < 1e-12, `fade midpoint is smooth: ${halfway}`);
});

test('compact all-site blending stays continuous at candidate windows and multi-profile junctions', () => {
  const epsilon = 1e-4;
  for (const [x, z] of [[600, 175], [-600, -730], [325, 600], [-875, -600]]) {
    const a = sampleFrontierRegion(x - epsilon, z - epsilon);
    const b = sampleFrontierRegion(x + epsilon, z + epsilon);
    assert.ok(Math.abs(a.height - b.height) < .001, `height crosses candidate boundary at ${x},${z}`);
    assert.ok(distance(a.colorRGB, b.colorRGB) < .001, `color crosses candidate boundary at ${x},${z}`);
  }

  let junction = null;
  for (let z = -1200; z <= 1200 && !junction; z += 20) for (let x = -1200; x <= 1200; x += 20) {
    const sample = sampleFrontierRegion(x, z);
    if (Math.min(sample.weights.lush, sample.weights.sunscar, sample.weights.ironspine) > .045) { junction = [x, z]; break; }
  }
  assert.ok(junction, 'default seed exposes a three-profile blended junction in the searched extent');
  const center = sampleFrontierRegion(...junction);
  for (const [dx, dz] of [[.1, 0], [-.1, 0], [0, .1], [0, -.1]]) {
    const nearby = sampleFrontierRegion(junction[0] + dx, junction[1] + dz);
    assert.ok(Math.abs(center.height - nearby.height) < .2, 'triple-junction height has no discontinuity');
    assert.ok(distance(center.colorRGB, nearby.colorRGB) < .01, 'triple-junction palette has no discontinuity');
  }
});

test('all broad profiles are finite, normalized and height-bounded across distant coordinates', () => {
  const kinds = new Set();
  let maximum = -Infinity;
  for (let z = -2400; z <= 2400; z += 120) for (let x = -2400; x <= 2400; x += 120) {
    const sample = sampleFrontierRegion(x, z);
    if (sample.kind) kinds.add(sample.kind);
    maximum = Math.max(maximum, sample.height);
    assert.ok(Number.isFinite(sample.height));
    assert.ok(sample.height >= FRONTIER_REGION_CONFIG.minHeight && sample.height <= FRONTIER_REGION_CONFIG.maxHeight);
    assert.ok(sample.colorRGB.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    const sum = sample.weights.lush + sample.weights.sunscar + sample.weights.ironspine;
    assert.ok(Math.abs(sum - (sample.influence === 0 ? 0 : 1)) < 1e-10, `weights sum to ${sum}`);
  }
  assert.deepEqual([...kinds].sort(), ['ironspine', 'lush', 'sunscar']);
  assert.ok(maximum > 65, `Ironspine supports extreme broad height, observed ${maximum.toFixed(2)}m`);
});

test('profile cores have distinct morphology and palettes within one kilometre of Camp', () => {
  const witnesses = new Map();
  let sunscarRidge = null, sunscarTrough = null;
  for (let z = -1000; z <= 1000; z += 20) for (let x = -1000; x <= 1000; x += 20) {
    const sample = sampleFrontierRegion(x, z);
    const ownWeight = sample.weights[sample.kind];
    if (sample.influence === 1 && ownWeight > .985 && !witnesses.has(sample.kind)) witnesses.set(sample.kind, { x, z, sample });
    if (sample.influence === 1 && sample.weights.sunscar > .985) {
      if (!sunscarRidge || sample.height > sunscarRidge.height) sunscarRidge = sample;
      if (!sunscarTrough || sample.height < sunscarTrough.height) sunscarTrough = sample;
    }
  }
  assert.deepEqual([...witnesses.keys()].sort(), ['ironspine', 'lush', 'sunscar']);
  const lush = witnesses.get('lush').sample, iron = witnesses.get('ironspine').sample;
  assert.ok(sunscarRidge.colorRGB[0] > lush.colorRGB[0] + .45, 'Sunscar ridge is visibly pale and warm');
  assert.ok(sunscarTrough.colorRGB[2] > sunscarTrough.colorRGB[1] - .02, 'Sunscar trough retains its mauve cast');
  assert.ok(sunscarRidge.height - sunscarTrough.height > 12, 'Sunscar palette follows meaningful rib relief');
  assert.ok(iron.colorRGB[2] > lush.colorRGB[2] + .1, 'Ironspine core is visibly more mineral-blue');
  assert.ok(iron.height > 20, 'Ironspine core carries broad vertical structure');
});
