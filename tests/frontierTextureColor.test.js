import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import {
  FRONTIER_TEXTURE_COLOR_MAX_AXIS_SAMPLES,
  createFrontierTextureColorSampler,
} from '../src/world/frontierTextureColor.js';

function countedSample() {
  let calls = 0;
  return { sample: (x, z) => { calls++; return sampleFrontier(x, z); }, calls: () => calls };
}

function maxError(actual, expected) {
  return Math.max(...actual.map((value, index) => Math.abs(value - expected[index])));
}

test('far chunks use a bounded global color grid with accurate Sunscar ribs', () => {
  const counted = countedSample();
  const colorAt = createFrontierTextureColorSampler({ origin: { x: -650, z: -350 }, size: 50, sample: counted.sample });
  assert.ok(counted.calls() <= FRONTIER_TEXTURE_COLOR_MAX_AXIS_SAMPLES ** 2);
  let worst = 0;
  for (let z = -349.5; z < -300; z += 1.75) for (let x = -649.5; x < -600; x += 1.75) {
    worst = Math.max(worst, maxError(colorAt(x, z), sampleFrontier(x, z).groundColorRGB));
  }
  assert.ok(worst < .015, `Sunscar grid error ${worst}`);
  const afterBuild = counted.calls();
  for (let index = 0; index < 16_384; index += 1) colorAt(-649.9 + (index % 128) / 128 * 49.8, -349.9 + Math.floor(index / 128) / 128 * 49.8);
  assert.equal(counted.calls(), afterBuild, 'far texture pixels do not re-run the full terrain sample');
});

test('neighbor chunks interpolate identical colors along shared positive and negative edges', () => {
  for (const [leftOrigin, rightOrigin] of [[-650, -600], [600, 650]]) {
    const left = createFrontierTextureColorSampler({ origin: { x: leftOrigin, z: 450 }, sample: sampleFrontier });
    const right = createFrontierTextureColorSampler({ origin: { x: rightOrigin, z: 450 }, sample: sampleFrontier });
    for (let z = 450; z <= 500; z += 1.3) {
      assert.deepEqual(left(rightOrigin, z), right(rightOrigin, z), `shared edge x=${rightOrigin}, z=${z}`);
    }
  }
});

test('reserve and ecotone chunks fall back to exact color samples', () => {
  for (const origin of [{ x: 50, z: -100 }, { x: -150, z: -250 }]) {
    const counted = countedSample();
    const colorAt = createFrontierTextureColorSampler({ origin, sample: counted.sample });
    const afterBuild = counted.calls();
    for (const [ox, oz] of [[.5, .5], [17.25, 31.75], [49.5, 48.25]]) {
      const x = origin.x + ox, z = origin.z + oz;
      assert.deepEqual(colorAt(x, z), sampleFrontier(x, z).groundColorRGB);
    }
    assert.equal(counted.calls(), afterBuild + 3, 'fallback runs one exact sample per requested pixel');
  }
});

test('high regional colors remain finite and within the analytical error bound', () => {
  let witness = null;
  for (let z = -1650; z <= -1450; z += 25) for (let x = -1700; x <= -1450; x += 25) {
    const sample = sampleFrontier(x, z);
    if (sample.land && sample.coastDistance >= 90 && sample.provinceKind === 'ironspine'
      && (!witness || sample.height > witness.height)) witness = { x, z, height: sample.height };
  }
  assert.ok(witness && witness.height > 60);
  const origin = { x: Math.floor(witness.x / 50) * 50, z: Math.floor(witness.z / 50) * 50 };
  const colorAt = createFrontierTextureColorSampler({ origin, sample: sampleFrontier });
  let worst = 0;
  for (let z = origin.z + .5; z < origin.z + 50; z += 2.1) for (let x = origin.x + .5; x < origin.x + 50; x += 2.1) {
    const color = colorAt(x, z);
    assert.ok(color.every(Number.isFinite));
    worst = Math.max(worst, maxError(color, sampleFrontier(x, z).groundColorRGB));
  }
  assert.ok(worst < .015, `high-ridge grid error ${worst}`);
});

test('invalid construction is rejected explicitly', () => {
  assert.throws(() => createFrontierTextureColorSampler(), /invalid-frontier-texture-color-sampler/);
  assert.throws(() => createFrontierTextureColorSampler({ origin: { x: 0, z: 0 }, size: 100, sample: sampleFrontier }), /grid-too-large/);
});
