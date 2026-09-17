import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierChunk, sampleFrontier, sampleFrontierHeight, worldToChunk } from '../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { ROOTBOUND_CURATED_SCENERY, FRONTIER_ROOTBOUND_CONFIG, sampleFrontierRootboundFeature } from '../src/world/frontierRootbound.js';
import { sampleFrontierSceneryChunk, selectFrontierScenery } from '../src/world/frontierScenery.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';
import { computeVisualAssetBounds } from '../src/world/visualFactory.js';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import * as THREE from 'three';

function meshHeightAt(chunk, x, z) {
  const localX = x - chunk.origin.x, localZ = z - chunk.origin.z;
  const xs = chunk.grid.xs, zs = chunk.grid.zs;
  const cell = (axis, value) => {
    let index = 0;
    while (index < axis.length - 2 && axis[index + 1] < value) index += 1;
    return index;
  };
  const ix = cell(xs, localX), iz = cell(zs, localZ), stride = xs.length;
  const tx = (localX - xs[ix]) / (xs[ix + 1] - xs[ix]);
  const tz = (localZ - zs[iz]) / (zs[iz + 1] - zs[iz]);
  const a = chunk.vertices[(iz * stride + ix) * 3 + 1], b = chunk.vertices[(iz * stride + ix + 1) * 3 + 1];
  const c = chunk.vertices[((iz + 1) * stride + ix) * 3 + 1], d = chunk.vertices[((iz + 1) * stride + ix + 1) * 3 + 1];
  return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

function meshSampler(points) {
  const chunks = new Map();
  for (const point of points) {
    const { cx, cz } = worldToChunk(point.x, point.z), key = `${cx},${cz}`;
    if (!chunks.has(key)) chunks.set(key, createFrontierChunk(cx, cz));
  }
  return (x, z) => {
    const { cx, cz } = worldToChunk(x, z), key = `${cx},${cz}`;
    return meshHeightAt(chunks.get(key) ?? createFrontierChunk(cx, cz), x, z);
  };
}

test('Rootbound circuit has finite room grammar and neutral exterior', () => {
  assert.equal(sampleFrontierRootboundFeature(-438, 676).zone, 'lantern-hollow');
  assert.equal(sampleFrontierRootboundFeature(-447, 679).zone, 'thornstone-verge');
  assert.equal(sampleFrontierRootboundFeature(-700, 650).active, false);
  const terrain = sampleFrontier(-438, 676);
  assert.equal(terrain.habitatFeatureKind, 'rootbound-wildwood');
  assert.equal(terrain.habitatFeatureZone, 'lantern-hollow');
  assert.ok(terrain.habitatFeatureInfluence > 0);
  assert.equal(FRONTIER_ROOTBOUND_CONFIG.habitatId, terrain.habitatId);
});

test('Rootbound terrain keeps supported source identities and grounds every admitted resource and home', () => {
  const baseline = {
    getTerrainSample: (x, z) => sampleFrontier(x, z, { disableRootbound: true }),
    getHeight: (x, z) => sampleFrontier(x, z, { disableRootbound: true }).height,
  };
  const sourceOptions = { visualAssets: WORLD_DATA.visualAssets };
  const fingerprint = options => {
    const entries = [];
    for (let cz = 10; cz <= 15; cz++) for (let cx = -12; cx <= -6; cx++) {
      entries.push(...sampleFrontierForageChunk(cx, cz, options), ...sampleFrontierWildlifeChunk(cx, cz, options));
    }
    return entries.map(entry => [entry.id, entry.pos.x, entry.pos.z]).sort((a, b) => a[0].localeCompare(b[0]));
  };
  const actualSources = fingerprint(sourceOptions), oldSources = fingerprint({ ...sourceOptions, ...baseline });
  const oldById = new Map(oldSources.map(entry => [entry[0], entry]));
  for (const entry of actualSources) if (oldById.has(entry[0])) assert.deepEqual(entry, oldById.get(entry[0]), 'retained depletion/home IDs never move horizontally');
  // Steep new outer banks deliberately reject unsupported old scatter. They
  // retain their existing IDs in saved depletion; the new physical surface
  // must never revive an old ID at another coordinate to refill a quota.
  assert.ok(actualSources.length >= oldSources.length * .9, 'the region retains its living resource coverage');
  for (const entry of oldSources) if (entry[1] < -525 || entry[1] > -325 || entry[2] < 550 || entry[2] > 750)
    assert.ok(actualSources.some(item => item[0] === entry[0]), 'exterior sources stay present');

  const forage = [], wildlife = [];
  for (let cz = 10; cz <= 15; cz++) for (let cx = -12; cx <= -6; cx++) {
    forage.push(...sampleFrontierForageChunk(cx, cz, sourceOptions));
    wildlife.push(...sampleFrontierWildlifeChunk(cx, cz, sourceOptions));
  }
  const height = (x, z) => sampleFrontier(x, z).height;
  for (const resource of forage) {
    const bounds = resource.visualAsset ? computeVisualAssetBounds(resource.visualAsset) : null;
    const visualRadius = bounds ? Math.hypot(bounds.size.w, bounds.size.d) * .5 * resource.uniformScale : .55 * resource.uniformScale;
    const collision = resource.visualAsset?.collision;
    const collisionRadius = collision ? Math.hypot(collision.size.w, collision.size.d) * .5 * resource.uniformScale : 0;
    assert.equal(hasFootprintSupport(resource.pos.x, resource.pos.z, {
      getHeight: height, radius: Math.max(visualRadius, collisionRadius), maxSlope: .42,
    }), true, `${resource.id} has final full footprint support`);
  }
  const affectedResidents = wildlife.filter(resident => resident.homePos.x >= FRONTIER_ROOTBOUND_CONFIG.protectedBounds.minX
    && resident.homePos.x <= FRONTIER_ROOTBOUND_CONFIG.protectedBounds.maxX
    && resident.homePos.z >= FRONTIER_ROOTBOUND_CONFIG.protectedBounds.minZ
    && resident.homePos.z <= FRONTIER_ROOTBOUND_CONFIG.protectedBounds.maxZ);
  const points = [];
  for (const resident of affectedResidents) {
    const movementRadius = Math.max(resident.roamRadius ?? 0, resident.leashRadius ?? 0, resident.fleeLeashRadius ?? 0);
    for (let dx = -movementRadius - .5; dx <= movementRadius + .5; dx += 1) for (let dz = -movementRadius - .5; dz <= movementRadius + .5; dz += 1) {
      if (dx * dx + dz * dz <= (movementRadius + .5) ** 2) points.push({ x: resident.homePos.x + dx, z: resident.homePos.z + dz });
    }
  }
  const getMeshHeight = meshSampler(points);
  for (const resident of affectedResidents) {
    const radius = Math.max(resident.roamRadius ?? 0, resident.leashRadius ?? 0, resident.fleeLeashRadius ?? 0);
    assert.equal(hasFootprintSupport(resident.homePos.x, resident.homePos.z, { getHeight: sampleFrontierHeight, radius, maxSlope: .32 }), true, `${resident.id} analytical home support`);
    assert.equal(hasFootprintSupport(resident.homePos.x, resident.homePos.z, { getHeight: getMeshHeight, radius, maxSlope: .32 }), true, `${resident.id} mesh home support`);
  }
  for (const point of points) assert.ok(Math.abs(sampleFrontierHeight(point.x, point.z) - getMeshHeight(point.x, point.z)) < .12,
    `resident movement disk grounds on the mesh at ${point.x},${point.z}`);
});

test('Rootbound profile colors apply only to the protected default world', () => {
  const alternate = { edition: DEFAULT_FRONTIER_WORLD.edition, seed: DEFAULT_FRONTIER_WORLD.seed + 17 };
  for (const [x, z] of [[-445, 665], [-800, 650]]) {
    assert.deepEqual(sampleFrontier(x, z, { world: alternate }).groundColorRGB,
      sampleFrontier(x, z, { world: alternate, disableRootbound: true }).groundColorRGB, `alternate ${x},${z}`);
  }
  assert.deepEqual(sampleFrontier(-800, 650).groundColorRGB,
    sampleFrontier(-800, 650, { disableRootbound: true }).groundColorRGB, 'default exterior');
  assert.deepEqual(sampleFrontier(-475, 590).groundColorRGB,
    sampleFrontier(-475, 590, { disableRootbound: true }).groundColorRGB, 'arrival clearing retains its original palette');
  const residency = { center: { cx: -9, cz: 13 }, chunks: [] };
  for (let cz = 12; cz <= 14; cz++) for (let cx = -10; cx <= -8; cx++) residency.chunks.push({ cx, cz });
  const sceneryOptions = { world: alternate, visualAssets: WORLD_DATA.visualAssets };
  const alternateScenery = selectFrontierScenery(residency, sceneryOptions);
  assert.deepEqual(alternateScenery, selectFrontierScenery(residency, { ...sceneryOptions, disableRootbound: true }));
  assert.equal(alternateScenery.some(spec => spec.id.startsWith('f1:s:rootbound-wildwood:')), false);
});

test('resident protection plates fade without a terrain step at their boundaries', () => {
  const points = [[-400, 675], [-350, 675], [-425, 700], [-450, 725], [-500, 725]];
  for (const [x, z] of points) {
    const left = sampleFrontier(x - .01, z).height;
    const right = sampleFrontier(x + .01, z).height;
    const lower = sampleFrontier(x, z - .01).height;
    const upper = sampleFrontier(x, z + .01).height;
    assert.ok(Math.abs(left - right) < .04, `${x},${z} x seam`);
    assert.ok(Math.abs(lower - upper) < .04, `${x},${z} z seam`);
  }
});

test('curated Rootbound props use existing admission and remain localized', () => {
  const specs = [];
  for (let cz = 11; cz <= 14; cz++) for (let cx = -11; cx <= -7; cx++) {
    specs.push(...sampleFrontierSceneryChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets }));
  }
  const curated = specs.filter(spec => spec.id.startsWith('f1:s:rootbound-wildwood:') && !spec.rootboundForest);
  assert.ok(curated.length >= 18, 'supported curated assemblies remain after opening the Crown outlook');
  assert.ok(curated.every(spec => ROOTBOUND_CURATED_SCENERY.some(entry => entry.key === spec.id.split(':').at(-1))), 'no duplicate replacement identities');
  assert.ok(curated.every(spec => spec.x >= -525 && spec.x <= -325 && spec.z >= 550 && spec.z <= 750));
  assert.ok(curated.every(spec => WORLD_DATA.visualAssets.some(asset => asset.id === spec.assetId && asset.gameplay?.role === 'prop')));
  for (let index = 0; index < curated.length; index += 1) for (let other = index + 1; other < curated.length; other += 1) {
    const leftKey = curated[index].id.split(':').at(-1), rightKey = curated[other].id.split(':').at(-1);
    const intentionalGroveCluster = [leftKey, rightKey].every(key => key.startsWith('lantern-colony-') || key.startsWith('lantern-margin-'));
    // Heartroot is now one overlapping root web, like the existing Grove colony.
    const intentionalRootWeb = [leftKey, rightKey].every(key => key.startsWith('heartroot-'));
    const intentionalGalleryEdge = [leftKey, rightKey].every(key => key.startsWith('edge-gallery-') || ['gallery-shelter-west', 'gallery-shelter-east', 'gallery-terminus'].includes(key))
      || [leftKey, rightKey].every(key => ['gallery-east-rib', 'edge-gallery-east-02'].includes(key));
    const distance = Math.hypot(curated[index].x - curated[other].x, curated[index].z - curated[other].z);
    assert.ok(distance >= (intentionalGroveCluster || intentionalRootWeb || intentionalGalleryEdge ? .8 : 1.8), `${curated[index].id} and ${curated[other].id} remain compositionally distinct`);
  }
  const connected = curated.filter(spec => spec.id.includes(':edge-gallery-') || spec.id.includes(':edge-grove-'));
  assert.ok(connected.length >= 4, 'supported edge assemblies frame the new terrain');
  assert.deepEqual(connected.map(spec => ({ key: spec.id.split(':').at(-1), assetId: spec.assetId, x: spec.x, z: spec.z, scale: spec.scale, yaw: spec.yaw, kind: spec.kind })).sort((a, b) => a.key.localeCompare(b.key)), [
    { key:'edge-gallery-west-01', assetId:'asset_rootbound_block_root', x:-484.6, z:625, scale:3.3, yaw:.3, kind:'low' },
    { key:'edge-gallery-east-01', assetId:'asset_rootbound_block_leaf', x:-472.5, z:630, scale:3.25, yaw:-.32, kind:'low' },
    { key:'edge-gallery-west-02', assetId:'asset_rootbound_block_leaf', x:-483, z:652, scale:3.55, yaw:.18, kind:'low' },
    { key:'edge-gallery-east-02', assetId:'asset_rootbound_block_root', x:-470.9, z:650, scale:3.3, yaw:-.28, kind:'low' },
    { key:'edge-gallery-west-03', assetId:'asset_rootbound_block_root', x:-486, z:660.5, scale:3.45, yaw:.1, kind:'low' },
    { key:'edge-gallery-east-03', assetId:'asset_rootbound_block_leaf', x:-467.5, z:656.5, scale:3.35, yaw:-.2, kind:'low' },
    { key:'edge-gallery-west-04', assetId:'asset_rootbound_block_leaf', x:-486, z:672, scale:3.45, yaw:.28, kind:'low' },
    { key:'edge-gallery-east-04', assetId:'asset_rootbound_block_root', x:-466, z:659, scale:3.2, yaw:-.14, kind:'low' },
    { key:'edge-grove-east-01', assetId:'asset_rootbound_block_leaf', x:-425, z:660, scale:3.15, yaw:-.24, kind:'low' },
    { key:'edge-grove-east-02', assetId:'asset_rootbound_block_root', x:-424, z:669, scale:3, yaw:.18, kind:'low' },
    { key:'edge-grove-rear-01', assetId:'asset_rootbound_block_leaf', x:-439.5, z:696, scale:3.35, yaw:.08, kind:'low' },
    { key:'edge-grove-rear-02', assetId:'asset_rootbound_block_root', x:-450, z:710, scale:3.2, yaw:-.22, kind:'low' },
    { key:'edge-grove-west-01', assetId:'asset_rootbound_block_leaf', x:-472.5, z:688, scale:2.8, yaw:.18, kind:'low' },
    { key:'edge-grove-west-02', assetId:'asset_rootbound_block_root', x:-476.5, z:693.5, scale:2.85, yaw:-.16, kind:'low' },
  ].filter(entry => connected.some(spec => spec.id.endsWith(':' + entry.key))).sort((a, b) => a.key.localeCompare(b.key)));
  const byKey = new Map(curated.map(spec => [spec.id.split(':').at(-1), spec]));
  assert.ok(byKey.has('arrival-canopy'));
  assert.ok(curated.every(spec => Number.isFinite(spec.y)), 'admitted assemblies follow the raised ground');
  const retained = new Map(ROOTBOUND_CURATED_SCENERY.map(candidate => [candidate.key, candidate]));
  assert.deepEqual([...['lantern-log', 'lantern-ring-a', 'lantern-ring-b', 'thorn-a', 'thorn-b'].map(key => retained.get(key))], [
    { key: 'lantern-log', assetId: 'asset_fallen_log', x: -444, z: 678, scale: .95, yaw: .45, kind: 'low' },
    { key: 'lantern-ring-a', assetId: 'asset_mushroom_ring', x: -442, z: 678, scale: .9, yaw: .2, kind: 'low' },
    { key: 'lantern-ring-b', assetId: 'asset_mushroom_ring', x: -444, z: 681, scale: .85, yaw: -.4, kind: 'low' },
    { key: 'thorn-a', assetId: 'asset_fen_stone', x: -448, z: 679, scale: .85, yaw: .1, kind: 'low' },
    { key: 'thorn-b', assetId: 'asset_fen_stone', x: -446, z: 679, scale: .8, yaw: -.35, kind: 'low' },
  ], 'existing Rootbound record fingerprints remain exact');
  assert.deepEqual([...['lantern-colony-r4', 'lantern-colony-lily', 'lantern-colony-ring', 'lantern-colony-pebbles'].map(key => retained.get(key))], [
    { key: 'lantern-colony-r4', assetId: 'asset_lantern_log_manual_r4', x: -440, z: 688, scale: 1.35, yaw: .55, kind: 'low' },
    { key: 'lantern-colony-lily', assetId: 'asset_fen_lily', x: -441, z: 688, scale: 1.05, yaw: .2, kind: 'low' },
    { key: 'lantern-colony-ring', assetId: 'asset_mushroom_ring', x: -441, z: 687, scale: .82, yaw: .2, kind: 'low' },
    { key: 'lantern-colony-pebbles', assetId: 'asset_pebble_cluster', x: -438, z: 688, scale: 1.05, yaw: .2, kind: 'low' },
  ], 'one bounded rear colony is the only new Rootbound composition');
  assert.deepEqual([...['lantern-margin-left-spread', 'lantern-margin-back-tall', 'lantern-margin-back-spread'].map(key => retained.get(key))], [
    { key: 'lantern-margin-left-spread', assetId: 'asset_verge_canopy_spread', x: -445, z: 683, scale: .52, yaw: .2, kind: 'canopy' },
    { key: 'lantern-margin-back-tall', assetId: 'asset_verge_canopy_tall', x: -439, z: 688, scale: .48, yaw: .12, kind: 'canopy' },
    { key: 'lantern-margin-back-spread', assetId: 'asset_verge_canopy_spread', x: -443, z: 686, scale: .5, yaw: .1, kind: 'canopy' },
  ], 'R2 adds only the reviewed three-canopy Lantern Grove margin');
  const r4 = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_lantern_log_manual_r4');
  assert.deepEqual(r4?.model, { path: 'assets/models/lantern-log-manual-r4-v1/model.glb', scale: 1, pivot: { x: 0, y: 0, z: 0 } });
  assert.equal(r4?.collision, null);
  assert.equal(r4?.gameplay?.role, 'prop');
  assert.equal(r4?.parts?.length, 10, 'the low-scenery runtime recipe retains the R4 palette partitions');
  assert.equal(r4?.parts?.reduce((total, part) => total + part.geometry.indices.length / 3, 0), 1390, 'the baked recipe retains every admitted R4 triangle');
  const incompleteKit = WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_fen_stone');
  assert.equal(sampleFrontierSceneryChunk(-8, 12, { visualAssets: incompleteKit })
    .some(spec => spec.id.startsWith('f1:s:rootbound-wildwood:') && !spec.rootboundForest), false, 'original assemblies fail closed without their curated kit');
});


test('Rootbound facet field is a shared default-world height surface with exact chunk seams', () => {
  const points = [[-456, 668], [-452, 672], [-448, 674], [-442, 682], [-458, 666], [-436, 688]];
  for (const [x, z] of points) {
    const implicit = sampleFrontier(x, z);
    const explicit = sampleFrontier(x, z, { world: DEFAULT_FRONTIER_WORLD });
    assert.equal(implicit.rootboundFacetDelta, explicit.rootboundFacetDelta, 'default world gate at ' + x + ',' + z);
  }
  assert.ok(Math.abs(sampleFrontier(-452, 672).rootboundFacetDelta) < .01, 'new contour route suppresses the old local bump');
  for (const [x, z] of [[-458, 666], [-436, 688], [-458, 678], [-447, 688]]) {
    assert.equal(sampleFrontier(x, z).rootboundFacetDelta, 0, 'field edge remains seam-neutral at ' + x + ',' + z);
  }
  const alternate = { edition: DEFAULT_FRONTIER_WORLD.edition, seed: DEFAULT_FRONTIER_WORLD.seed + 17 };
  assert.equal(sampleFrontier(-452, 672, { world: alternate }).rootboundFacetDelta, 0, 'alternate world stays neutral');
  assert.equal(sampleFrontier(-452, 672, { disableRootbound: true }).rootboundFacetDelta, 0, 'disabled Rootbound stays neutral');

  const left = createFrontierChunk(-10, 13), right = createFrontierChunk(-9, 13);
  assert.ok(left.rootboundFacetDeltas.some(value => Math.abs(value) > .01));
  assert.ok(right.rootboundFacetDeltas.some(value => Math.abs(value) > .01));
  const getMeshHeight = meshSampler(points);
  for (const [x, z] of points) {
    assert.ok(Math.abs(sampleFrontierHeight(x, z) - getMeshHeight(x, z)) < 1e-5, 'facet query equals mesh at ' + x + ',' + z);
  }
  for (const z of [666, 670, 674, 678, 682, 686, 688]) {
    const leftIndex = left.grid.zs.findIndex(value => value === z) * left.grid.xs.length + left.grid.xs.findIndex(value => value === 50);
    const rightIndex = right.grid.zs.findIndex(value => value === z) * right.grid.xs.length;
    assert.equal(left.rootboundFacetDeltas[leftIndex], right.rootboundFacetDeltas[rightIndex], 'shared chunk edge at -450,' + z);
  }
});


test('Rootbound facet chunks use a render-only per-face material while physics keeps the shared chunk', () => {
  const batches = [];
  const runtime = createFrontierChunkRuntime({
    parent: new THREE.Group(),
    physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) },
    visualAssets: WORLD_DATA.visualAssets,
  });
  runtime.update({ x: -449, z: 675 }, { activeSectionId: 'camp' });
  const group = runtime.root.getObjectByName('frontier_chunk_-9,13');
  const ground = group?.getObjectByName('frontier_ground');
  assert.ok(ground, 'active facet chunk has a visible ground mesh');
  assert.equal(ground.geometry.index, null, 'only the visual ground geometry is duplicated per face');
  assert.equal(ground.material.vertexColors, true, 'baked map receives restrained per-face multiplier');
  const neighbor = runtime.root.getObjectByName('frontier_chunk_-8,13')?.getObjectByName('frontier_ground');
  assert.ok(neighbor?.geometry.index, 'zero-delta neighbor keeps its indexed render geometry');
  assert.notEqual(neighbor.material.vertexColors, true, 'zero-delta neighbor keeps the original baked-map material');
  const physicsChunk = batches.flatMap(batch => batch.add ?? []).find(surface => surface.id === '-9,13');
  assert.ok(physicsChunk?.rootboundFacetDeltas instanceof Float32Array, 'physics receives the authoritative indexed chunk');
  assert.ok(physicsChunk.indices.length > 0, 'physics source remains indexed');
  const colors = ground.geometry.getAttribute('color');
  const positions = ground.geometry.getAttribute('position');
  const deltaAt = vertex => {
    const x = Math.round(positions.getX(vertex) * 1e5), z = Math.round(positions.getZ(vertex) * 1e5);
    for (let index = 0; index < physicsChunk.vertices.length; index += 3) {
      if (Math.round(physicsChunk.vertices[index] * 1e5) === x && Math.round(physicsChunk.vertices[index + 2] * 1e5) === z) {
        return physicsChunk.rootboundFacetDeltas[index / 3];
      }
    }
    return null;
  };
  let testedTint = false, testedWhite = false;
  for (let vertex = 0; vertex < positions.count; vertex += 3) {
    const mean = (deltaAt(vertex) + deltaAt(vertex + 1) + deltaAt(vertex + 2)) / 3;
    const s = Math.max(-1, Math.min(1, mean / .36));
    const expected = [1 + s * .065, 1 + s * .10, 1 + s * .065];
    assert.ok(Math.abs(colors.getX(vertex) - expected[0]) < 1e-6);
    assert.ok(Math.abs(colors.getY(vertex) - expected[1]) < 1e-6);
    assert.ok(Math.abs(colors.getZ(vertex) - expected[2]) < 1e-6);
    if (Math.abs(mean) > 1e-6) testedTint = true;
    else testedWhite = true;
  }
  assert.equal(testedTint, true, 'an authored face receives the approved correlated RGB shift');
  assert.equal(testedWhite, true, 'a zero-relief face remains white');
  runtime.update({ x: -300, z: 600 }, { activeSectionId: 'camp' });
  assert.equal(runtime.root.getObjectByName('frontier_chunk_-9,13'), undefined, 'streamed facet render unloads normally');
  runtime.dispose();
});





test('Rootbound shoulders change real terrain while full and height-only samplers agree with mesh vertices', () => {
  for (const [x, z] of [[-484, 642], [-504, 672], [-408, 688]]) {
    const before = sampleFrontierHeight(x, z, { disableRootbound: true });
    const height = sampleFrontierHeight(x, z);
    assert.ok(height - before > .25, `visible physical shoulder at ${x},${z}`);
    assert.equal(height, sampleFrontier(x, z).height);
    const { cx, cz } = worldToChunk(x, z), chunk = createFrontierChunk(cx, cz);
    assert.ok(Math.abs(meshHeightAt(chunk, x, z) - height) < 2e-6);
    assert.ok(Number.isFinite(meshHeightAt(chunk, x, z)));
  }
});
