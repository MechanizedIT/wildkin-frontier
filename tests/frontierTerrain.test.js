import test from 'node:test';
import assert from 'node:assert/strict';
import {
  config, chunkKey, worldToChunk, sampleFrontier, sampleFrontierHeight, createFrontierChunk, isCampChunk, isSkybreakDetailChunk,
} from '../src/world/frontierTerrain.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { SKYBREAK_ANCHORS, SKYBREAK_BOUNDS, sampleFrontierLandform } from '../src/world/frontierLandform.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

await RAPIER.init();

test('chunk ownership floors negative coordinates and keys are stable', () => {
  assert.deepEqual(worldToChunk(-0.01, -50), { cx: -1, cz: -1 });
  assert.deepEqual(worldToChunk(-50, 50), { cx: -1, cz: 1 });
  assert.equal(chunkKey(-2, 3), '-2,3');
  assert.equal(isCampChunk(-1, -1), true);
  assert.equal(isCampChunk(1, 0), false);
});

function assertEastWestSeam(leftCoords, rightCoords) {
  const left = createFrontierChunk(...leftCoords, { seed: 1234 });
  const right = createFrontierChunk(...rightCoords, { seed: 1234 });
  const stride = config.segments + 1;
  for (let iz = 0; iz <= config.segments; iz++) {
    const a = iz * stride + config.segments;
    const b = iz * stride;
    assert.equal(left.vertices[a * 3 + 1], right.vertices[b * 3 + 1]);
    assert.deepEqual(Array.from(left.normals.slice(a * 3, a * 3 + 3)), Array.from(right.normals.slice(b * 3, b * 3 + 3)));
    assert.deepEqual(Array.from(left.colors.slice(a * 3, a * 3 + 3)), Array.from(right.colors.slice(b * 3, b * 3 + 3)));
  }
}

function assertNorthSouthSeam(southCoords, northCoords) {
  const south = createFrontierChunk(...southCoords, { seed: 1234 });
  const north = createFrontierChunk(...northCoords, { seed: 1234 });
  const stride = config.segments + 1;
  for (let ix = 0; ix <= config.segments; ix++) {
    const a = config.segments * stride + ix;
    const b = ix;
    assert.equal(south.vertices[a * 3 + 1], north.vertices[b * 3 + 1]);
    assert.deepEqual(Array.from(south.normals.slice(a * 3, a * 3 + 3)), Array.from(north.normals.slice(b * 3, b * 3 + 3)));
    assert.deepEqual(Array.from(south.colors.slice(a * 3, a * 3 + 3)), Array.from(north.colors.slice(b * 3, b * 3 + 3)));
  }
}

test('positive and negative chunk seams share coherent heights, normals, and colors', () => {
  assertEastWestSeam([1, 2], [2, 2]);
  assertEastWestSeam([-4, 2], [-3, 2]);
  assertEastWestSeam([-1, -2], [0, -2]);
  assertNorthSouthSeam([2, 1], [2, 2]);
  assertNorthSouthSeam([-3, -4], [-3, -3]);
});

test('world descriptors preserve the default terrain and alternate seeds stay seamless', () => {
  const points = [[-125, 24], [87.5, -73], [-1, -92], [13, -89], [24, -128]];
  for (const [x, z] of points) assert.deepEqual(sampleFrontier(x, z, { world: DEFAULT_FRONTIER_WORLD }), sampleFrontier(x, z));
  const legacy = createFrontierChunk(2, -4);
  const described = createFrontierChunk(2, -4, { world: DEFAULT_FRONTIER_WORLD });
  assert.deepEqual(described.vertices, legacy.vertices);
  assert.deepEqual(described.normals, legacy.normals);
  assert.deepEqual(described.colors, legacy.colors);

  const alternate = normalizeFrontierWorld({ edition: 1, seed: 0x13572468 });
  const west = createFrontierChunk(-1, 3, { world: alternate });
  const east = createFrontierChunk(0, 3, { world: alternate });
  const stride = config.segments + 1;
  for (let iz = 0; iz <= config.segments; iz += 1) {
    const a = (iz * stride + config.segments) * 3, b = iz * stride * 3;
    assert.equal(west.vertices[a + 1], east.vertices[b + 1]);
    assert.deepEqual(Array.from(west.normals.slice(a, a + 3)), Array.from(east.normals.slice(b, b + 3)));
    assert.deepEqual(Array.from(west.colors.slice(a, a + 3)), Array.from(east.colors.slice(b, b + 3)));
  }
  assert.notDeepEqual(alternate, DEFAULT_FRONTIER_WORLD);
  assert.notDeepEqual(Array.from(west.vertices), Array.from(createFrontierChunk(-1, 3).vertices));
});

test('height-only sampling is strictly identical across ordinary seeds, Camp, coast, ocean, and negative coordinates', () => {
  const alternateWorld = normalizeFrontierWorld({ edition: 1, seed: 0x13572468 });
  const cases = [
    { points: [[-125, 24], [87.5, -73], [-251.75, 412.125]], options: { seed: 77 } },
    { points: [[-125, 24], [87.5, -73], [318.25, 219.75]], options: { seed: 9002 } },
    { points: [[112, -184], [-640, -335], [-920, 710]], options: { world: alternateWorld } },
    { points: [[-20, -20], [20, 20], [50.001, 12]], options: { campHeight: (x, z) => x < 0 ? -24 : 31 } },
    { points: [[0, 0], [-700, -700], [-1750, -1625], [1600, 1600], [-1600, 850]], options: {} },
  ];
  for (const { points, options } of cases) for (const [x, z] of points) {
    assert.equal(sampleFrontierHeight(x, z, options), sampleFrontier(x, z, options).height, `height at ${x},${z}`);
  }
});

test('height-only sampling preserves exact detailed Skybreak corners, triangles, and seam curves', () => {
  const points = [
    [-50, -250], [0, -250], [-50, -200], [0, -200],
    [-21.37, -238.62], [12.41, -228.77], [37.22, -199.46], [7.35, -195.64],
    [-49.999, -221.25], [49.999, -178.25], [42.04, -200], [42.08, -150.001],
  ];
  for (const options of [{ seed: 77 }, { seed: 9002 }]) for (const [x, z] of points) {
    assert.equal(sampleFrontierHeight(x, z, options), sampleFrontier(x, z, options).height, `detailed height at ${x},${z}`);
  }
});

test('camp boundary honors callback and blends smoothly outside the footprint', () => {
  const campHeight = (x, z) => 3 + x * 0.01 - z * 0.005;
  const inside = sampleFrontier(50, 12, { seed: 77, campHeight });
  const edge = sampleFrontier(50.001, 12, { seed: 77, campHeight });
  const outside = sampleFrontier(70, 12, { seed: 77, campHeight });
  assert.equal(inside.height, campHeight(50, 12));
  assert.ok(Math.abs(edge.height - inside.height) < 0.2);
  assert.ok(outside.height >= config.minHeight && outside.height <= config.maxHeight);
});

test('camp callback preserves finite negative and raised heights', () => {
  const campHeight = (x, z) => x < 0 ? -24 : 31;
  assert.equal(sampleFrontier(-20, -20, { campHeight }).height, -24);
  assert.equal(sampleFrontier(20, 20, { campHeight }).height, 31);
});

test('rolling transition leaves authored Camp samples exact', () => {
  const campHeight = (x, z) => 2 + x * .01 - z * .005;
  const campColor = (x, z) => [.31 + x * .0001, .42, .23 - z * .0001];
  for (const [x, z] of [[-50, -50], [0, -50], [50, -50], [-50, 0], [0, 0], [50, 0], [-50, 50], [0, 50], [50, 50]]) {
    const sample = sampleFrontier(x, z, { campHeight, campColor });
    assert.equal(sample.height, campHeight(x, z), `Camp height at ${x},${z}`);
    assert.deepEqual(sample.groundColorRGB, campColor(x, z), `Camp color at ${x},${z}`);
  }
});

test('rolling transition preserves the established north terrace heights and colors', () => {
  const protectedSamples = [
    [0, -110, 5.976246171775798, [0.2116608418951089, 0.4063237283856889, 0.2258699957356585]],
    [24, -114, 4.740649634730418, [0.20735338402259554, 0.40514384722774666, 0.2572142519074377]],
    [24, -128, 8.728540728938814, [0.41412660002245155, 0.40596330159194055, 0.21776682500367636]],
    [32, -133, 8.403194422750774, [0.2473124600670787, 0.4453855524939219, 0.20983640071581616]],
    [42, -133, 7.603701842446358, [0.2411153673051308, 0.438051617881679, 0.21450407177979924]],
  ];
  for (const [x, z, expectedHeight, expectedColor] of protectedSamples) {
    const sample = sampleFrontier(x, z);
    assert.equal(sample.height, expectedHeight, `protected height at ${x},${z}`);
    assert.deepEqual(sample.groundColorRGB, expectedColor, `protected color at ${x},${z}`);
  }
});

test('Skybreak surface kinds add bounded placement semantics without changing terrain numerics', () => {
  const cap = sampleFrontier(SKYBREAK_ANCHORS.crown.x, SKYBREAK_ANCHORS.crown.z);
  assert.equal(cap.surfaceKind, 'skybreak-cap');
  assert.equal(sampleFrontier(SKYBREAK_ANCHORS.entryShelf.x, SKYBREAK_ANCHORS.entryShelf.z).surfaceKind, 'skybreak-cap');
  assert.equal(sampleFrontier(-18, -184).surfaceKind, 'skybreak-shoulder');
  assert.equal(sampleFrontier(39, -173).surfaceKind, 'skybreak-shoulder');
  assert.equal(sampleFrontier(20, -161).surfaceKind, 'skybreak-lowland');
  assert.equal(sampleFrontier(10, -153).surfaceKind, null, 'open ground inside the conservative envelope is not invented lowland');
  assert.equal(sampleFrontier(SKYBREAK_BOUNDS.minX - .01, (SKYBREAK_BOUNDS.minZ + SKYBREAK_BOUNDS.maxZ) / 2).surfaceKind, null, 'outside the selected landform remains unclassified');
  assert.equal(sampleFrontier(0, 0).surfaceKind, null, 'Camp stays unclassified');
  assert.equal(sampleFrontier(32, -133).surfaceKind, null, 'the older terrace keeps no Skybreak classification');
  assert.deepEqual({ height: cap.height, habitatBlend: cap.habitatBlend, groundColorRGB: cap.groundColorRGB }, {
    height: 34.97317886352539,
    habitatBlend: { fernUpland: 0.6882182924140188, wetland: 0.3117817075859813 },
    groundColorRGB: [0.2013102526199903, 0.3972535216471834, 0.16559947587781892],
  }, 'surface semantics do not change height, habitat, or color');
});

test('rolling color cue distinguishes the framed dry rise and wet bowl without replacing terrain state', () => {
  const dry = sampleFrontier(-1, -92);
  assert.equal(dry.height, 5.494323904627238);
  assert.deepEqual(dry.habitatBlend, { fernUpland: 0.6234028315053738, wetland: 0.3765971684946262 });
  assert.ok(dry.groundColorRGB[0] - 0.20468154570303375 >= .06, 'dry rise is visibly warmer');
  assert.ok(dry.groundColorRGB[1] - 0.39847548187059145 >= .045, 'dry rise is visibly lighter');

  const wet = sampleFrontier(13, -89);
  assert.equal(wet.height, 2.8704643258524505);
  assert.deepEqual(wet.habitatBlend, { fernUpland: 0.3722008489302384, wetland: 0.6277991510697616 });
  assert.ok(wet.groundColorRGB[0] - 0.18555495788824488 <= -.05, 'wet bowl is visibly darker');
  assert.ok(wet.groundColorRGB[2] - 0.27102618973310634 >= .02, 'wet bowl is visibly cooler');
});

test('a distant Sunscar province changes broad height and palette through the shared terrain sample', () => {
  const arrival = sampleFrontier(-640, -335);
  const trough = sampleFrontier(-640, -405);
  const ridge = sampleFrontier(-640, -355);
  assert.equal(arrival.provinceKind, 'sunscar');
  assert.equal(arrival.provinceId, 'f1:region:c825941b:-2:-1');
  assert.equal(arrival.provinceInfluence, 1);
  assert.ok(arrival.provinceWeights.sunscar > .999);
  assert.ok(ridge.height > 18 && ridge.height <= config.maxHeight, `ridge height ${ridge.height}`);
  assert.ok(ridge.height - arrival.height > 8, 'a mineral rib rises visibly within 20m north of the fixed portrait witness');
  assert.ok(ridge.groundColorRGB[0] > trough.groundColorRGB[0] + .25, 'pale ridge separates from mauve-tan trough');
  assert.ok(trough.groundColorRGB[2] > trough.groundColorRGB[1] - .04, 'trough retains its mauve cast');
});

test('the fixed Sunscar view crosses multiple asymmetric ribs instead of one broad stripe', () => {
  const crossSection = [];
  for (let z = -455; z <= -215; z += 2) crossSection.push(sampleFrontier(-640, z).height);
  const peaks = [];
  for (let index = 1; index < crossSection.length - 1; index += 1) {
    if (crossSection[index] > 14 && crossSection[index] > crossSection[index - 1]
      && crossSection[index] >= crossSection[index + 1]) peaks.push(index);
  }
  assert.ok(peaks.length >= 2 && peaks.length <= 3, `expected two or three complete ribs, found ${peaks.length}`);
  for (let index = 1; index < peaks.length; index += 1) {
    const spacing = (peaks[index] - peaks[index - 1]) * 2;
    assert.ok(spacing >= 75 && spacing <= 100, `rib spacing ${spacing}m`);
  }
  assert.ok(Math.max(...crossSection) - Math.min(...crossSection) > 12, 'ribs retain meaningful local relief');
});

test('the fixed north-facing Sunscar approach shows a raised but walkable near flank', () => {
  const heights = [];
  for (let z = -335; z >= -375; z -= 5) heights.push(sampleFrontier(-640, z).height);
  const steps = heights.slice(1).map((height, index) => Math.abs(height - heights[index]) / 5);
  assert.ok(heights[4] - heights[0] > 8, 'the crest becomes visible within the first 20m north');
  assert.ok(Math.max(...steps.slice(0, 4)) < .75, `near flank grade ${Math.max(...steps.slice(0, 4))}`);
  assert.ok(new Set(heights.map(height => height.toFixed(3))).size === heights.length, 'the basin-to-flank profile has no clipped flat steps');
});

test('province metadata does not reuse the authored section regionId field', () => {
  const sample = sampleFrontier(870, -350);
  assert.ok(sample.provinceId.startsWith('f1:region:'));
  assert.ok(['lush', 'sunscar', 'ironspine'].includes(sample.provinceKind));
  assert.equal(Object.hasOwn(sample, 'regionId'), false);
  assert.ok(Number.isFinite(sample.provinceInfluence));
  assert.ok(Math.abs(Object.values(sample.provinceWeights).reduce((sum, value) => sum + value, 0) - 1) < 1e-10);
});

function terrainSlope(x, z, distance = .8) {
  const dx = (sampleFrontier(x + distance, z).height - sampleFrontier(x - distance, z).height) / (distance * 2);
  const dz = (sampleFrontier(x, z + distance).height - sampleFrontier(x, z - distance).height) / (distance * 2);
  return Math.hypot(dx, dz);
}

test('both staged Mossling clearings and the northbound route remain safely graded', () => {
  const clearings = [[7, -85], [20, -95]];
  for (const [cx, cz] of clearings) {
    let steepest = 0;
    for (let x = cx - 3.5; x <= cx + 3.5; x += .5) for (let z = cz - 3.5; z <= cz + 3.5; z += .5) {
      if (Math.hypot(x - cx, z - cz) <= 3.5) steepest = Math.max(steepest, terrainSlope(x, z));
    }
    assert.ok(steepest <= .32, `Mossling clearing at ${cx},${cz} slope ${steepest.toFixed(3)}`);
  }

  const route = [[0, -56], [7, -68], [7, -85], [20, -95], [24, -118]];
  let steepestRoute = 0;
  for (let segment = 1; segment < route.length; segment += 1) {
    const [ax, az] = route[segment - 1], [bx, bz] = route[segment];
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      steepestRoute = Math.max(steepestRoute, terrainSlope(ax + (bx - ax) * t, az + (bz - az) * t));
    }
  }
  assert.ok(steepestRoute <= .32, `northbound route slope ${steepestRoute.toFixed(3)}`);
});

test('mesh vertices, normals and colors are finite and repeatable', () => {
  const first = createFrontierChunk(-3, 4, { seed: 9001 });
  const second = createFrontierChunk(-3, 4, { seed: 9001 });
  assert.deepEqual(Array.from(first.vertices), Array.from(second.vertices));
  assert.deepEqual(Array.from(first.indices), Array.from(second.indices));
  for (const array of [first.vertices, first.normals, first.colors]) for (const value of array) assert.ok(Number.isFinite(value));
  assert.ok(first.vertices.every((value, i) => i % 3 !== 1 || (value >= config.minHeight && value <= config.maxHeight)));
  assert.notDeepEqual(Array.from(first.vertices), Array.from(createFrontierChunk(-3, 4, { seed: 9002 }).vertices));
});

function vertexAt(chunk, localX, localZ) {
  for (let i = 0; i < chunk.vertices.length; i += 3) {
    if (Math.abs(chunk.vertices[i] - localX) < 1e-5 && Math.abs(chunk.vertices[i + 2] - localZ) < 1e-5) {
      return Array.from(chunk.vertices.slice(i, i + 3));
    }
  }
  return null;
}

function meshHeightAt(chunk, worldX, worldZ) {
  const xs = Array.from(chunk.grid.xs), zs = Array.from(chunk.grid.zs);
  const localX = Math.max(0, Math.min(config.chunkSize, worldX - chunk.origin.x));
  const localZ = Math.max(0, Math.min(config.chunkSize, worldZ - chunk.origin.z));
  const cell = (axis, value) => {
    let i = 0;
    while (i + 1 < axis.length && axis[i + 1] <= value + 1e-6) i += 1;
    return Math.min(i, axis.length - 2);
  };
  const ix = cell(xs, localX), iz = cell(zs, localZ), stride = xs.length;
  const tx = (localX - xs[ix]) / (xs[ix + 1] - xs[ix]);
  const tz = (localZ - zs[iz]) / (zs[iz + 1] - zs[iz]);
  const a = chunk.vertices[(iz * stride + ix) * 3 + 1];
  const b = chunk.vertices[(iz * stride + ix + 1) * 3 + 1];
  const c = chunk.vertices[((iz + 1) * stride + ix) * 3 + 1];
  const d = chunk.vertices[((iz + 1) * stride + ix + 1) * 3 + 1];
  if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
  return b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

test('Skybreak detail uses bounded variable grids and the public query matches its actual triangles', () => {
  assert.equal(isSkybreakDetailChunk(-1, -5), true);
  assert.equal(isSkybreakDetailChunk(0, -4), true);
  assert.equal(isSkybreakDetailChunk(0, -3), false);
  const chunks = [[-1, -5], [0, -5], [-1, -4], [0, -4]].map(coords => createFrontierChunk(...coords, { seed: 77 }));
  assert.ok(chunks.every(chunk => chunk.grid.zs.length === 51));
  assert.ok(chunks.every(chunk => chunk.indices.length / 3 <= 5200), 'detail remains four bounded chunks');
  assert.ok(chunks[1].grid.xs.length > chunks[0].grid.xs.length, 'the east grid carries the terrace edge breakpoint');
  for (const [x, z] of [[-21.37, -238.62], [12.41, -228.77], [37.22, -199.46], [7.35, -195.64]]) {
    const { cx, cz } = worldToChunk(x, z);
    const chunk = chunks.find(candidate => candidate.id === chunkKey(cx, cz));
    assert.ok(chunk);
    assert.ok(Math.abs(sampleFrontier(x, z, { seed: 77 }).height - meshHeightAt(chunk, x, z)) < 1e-5, `triangle query at ${x},${z}`);
  }
});

test('Skybreak detailed edges follow each neighbor actual curve including the preserved terrace breakpoint', () => {
  const pairs = [
    [createFrontierChunk(-2, -4, { seed: 77 }), createFrontierChunk(-1, -4, { seed: 77 }), [[-50, -248.7], [-50, -221.25], [-50, -199.4], [-50, -151.2]]],
    [createFrontierChunk(0, -4, { seed: 77 }), createFrontierChunk(1, -4, { seed: 77 }), [[50, -247.3], [50, -213.7], [50, -178.25], [50, -152.1]]],
    [createFrontierChunk(0, -5, { seed: 77 }), createFrontierChunk(0, -4, { seed: 77 }), [[3.2, -200], [18.75, -200], [42.04, -200]]],
    [createFrontierChunk(0, -6, { seed: 77 }), createFrontierChunk(0, -5, { seed: 77 }), [[1.3, -250], [21.7, -250], [47.4, -250]]],
    [createFrontierChunk(0, -4, { seed: 77 }), createFrontierChunk(0, -3, { seed: 77 }), [[19.7, -150], [42.04, -150], [42.08, -150], [42.55, -150], [47.3, -150]]],
  ];
  for (const [a, b, points] of pairs) for (const [x, z] of points) {
    assert.ok(Math.abs(meshHeightAt(a, x, z) - meshHeightAt(b, x, z)) < 1e-5, `shared curve ${a.id}/${b.id} at ${x},${z}`);
  }
});

test('rocky terrace uses a bounded deterministic mesh while preserving every chunk border', () => {
  const terrace = createFrontierChunk(0, -3, { seed: 77 });
  const repeat = createFrontierChunk(0, -3, { seed: 77 });
  assert.deepEqual(terrace.vertices, repeat.vertices);
  assert.deepEqual(terrace.indices, repeat.indices);
  assert.ok(terrace.indices.length / 3 < 2500);
  assert.deepEqual(terrace.bounds.min.x, 0);
  assert.deepEqual(terrace.bounds.max.x, config.chunkSize);
  const west = createFrontierChunk(-1, -3, { seed: 77 });
  const east = createFrontierChunk(1, -3, { seed: 77 });
  const south = createFrontierChunk(0, -4, { seed: 77 });
  const north = createFrontierChunk(0, -2, { seed: 77 });
  for (let p = 0; p <= config.chunkSize; p += 2) {
    assert.equal(vertexAt(terrace, 0, p)[1], vertexAt(west, 50, p)[1]);
    assert.equal(vertexAt(terrace, 50, p)[1], vertexAt(east, 0, p)[1]);
    assert.equal(vertexAt(terrace, p, 0)[1], vertexAt(south, p, 50)[1]);
    assert.equal(vertexAt(terrace, p, 50)[1], vertexAt(north, p, 0)[1]);
  }
});

test('left terrace ramp is broad and gentle while south and right lips remain real cliffs', () => {
  let steepestRamp = 0;
  for (const x of [22, 24, 26]) for (let z = -128; z < -116; z += 1) {
    steepestRamp = Math.max(steepestRamp, Math.atan(Math.abs(sampleFrontier(x, z + 1).height - sampleFrontier(x, z).height)) * 180 / Math.PI);
  }
  assert.ok(steepestRamp < 25, `ramp slope ${steepestRamp.toFixed(2)}° stays walkable`);
  assert.ok(sampleFrontier(32, -133).height - sampleFrontier(32, -123.9).height > 2.7);
  assert.ok(sampleFrontier(41.9, -133).height - sampleFrontier(42.1, -133).height > 2.7);
  const cliffColor = sampleFrontier(32, -124.04).groundColorRGB;
  assert.ok(Math.max(...cliffColor) - Math.min(...cliffColor) < 0.09, 'the exposed face is muted gray');
});

test('ramp crown joins the grassy shelf without an analytic trough', () => {
  const route = [];
  for (let x = 24; x <= 32; x += 0.25) {
    route.push(sampleFrontier(x, -133).height);
    assert.equal(sampleFrontierLandform(x, -133).heightOffset, 3, `route height at x=${x}`);
  }
  let largestLocalDip = 0;
  for (let i = 1; i < route.length - 1; i++) {
    largestLocalDip = Math.max(largestLocalDip, Math.min(route[i - 1], route[i + 1]) - route[i]);
  }
  assert.ok(largestLocalDip < 0.03, `largest crown join dip was ${largestLocalDip.toFixed(3)}m`);
  const join = sampleFrontier(27, -133).height;
  assert.ok(Math.abs(join - (sampleFrontier(26, -133).height + sampleFrontier(28, -133).height) / 2) < 0.12);
});

function terracePhysics(t) {
  const physics = createPhysicsWorld(RAPIER, { terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [] });
  t.after(() => physics.world.free());
  physics.updateTerrainSurfaces({ add: [{ ...createFrontierChunk(0, -3), sectionId: 'field' }] });
  return physics;
}

test('Rapier walks the ramp grounded, then a south-lip step becomes airborne and lands below', t => {
  const physics = terracePhysics(t);
  const half = 1.04 / 2;
  const rampStart = { x: 24, z: -114 };
  const ramp = createCharacterPhysics(RAPIER, physics.world, { ...rampStart, y: sampleFrontier(rampStart.x, rampStart.z).height + half + 0.03 });
  let groundedSteps = 0;
  for (let i = 0; i < 240; i++) {
    const result = ramp.move({ x: 0, y: -0.08, z: -0.1 });
    if (result.grounded) groundedSteps++;
  }
  assert.ok(groundedSteps > 230, `ramp remains grounded for ${groundedSteps}/240 steps`);
  assert.ok(ramp.getPosition().z < -128, `ramp reaches its upper shelf at z=${ramp.getPosition().z.toFixed(2)}`);

  const top = { x: 32, z: -127 };
  const cliff = createCharacterPhysics(RAPIER, physics.world, { ...top, y: sampleFrontier(top.x, top.z).height + half + 0.03 });
  const startFeet = cliff.getPosition().y - half;
  let airborne = false, landedFeet = null, vy = -0.2;
  for (let i = 0; i < 240; i++) {
    vy -= 12 / 60;
    const result = cliff.move({ x: 0, y: vy / 60, z: i < 45 ? 0.12 : 0 });
    if (!result.grounded) airborne = true;
    if (airborne && result.grounded) { landedFeet = cliff.getPosition().y - half; break; }
  }
  assert.equal(airborne, true, 'the narrow lip does not become a long slide');
  assert.ok(landedFeet !== null, 'the character lands in the lower clearing');
  assert.ok(startFeet - landedFeet > 2.6 && startFeet - landedFeet < 3.8, `actual drop was ${(startFeet - landedFeet).toFixed(2)}m`);
});

test('center support keeps a real Rapier 40 degree incline walkable', t => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => world.free());
  const angle = -40 * Math.PI / 180;
  world.createCollider(RAPIER.ColliderDesc.cuboid(4, .1, 4).setRotation({
    x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2),
  }));
  world.step();
  const character = createCharacterPhysics(RAPIER, world, { x: 0, y: 1, z: 0 });
  let groundedSteps = 0;
  for (let i = 0; i < 60; i++) {
    if (character.move({ x: .01, y: -.08, z: 0 }).grounded) groundedSteps++;
  }
  assert.ok(groundedSteps > 50, `40 degree incline remains supported for ${groundedSteps}/60 steps`);
  assert.equal(character.hasGroundSupport(), true);
});
