import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createRuntimeResourcePlacements } from '../src/resources/resourceSystem.js';
import { getResourceType } from '../src/resources/resourceConfig.js';
import { getHarvestInteractionPoint, getHarvestReach, isHarvestableInRange, isPlayerInsideColliderVolume } from '../src/resources/harvestLogic.js';
import { describeVisualAssetCollider } from '../src/world/colliderDescriptor.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { SKYBREAK_ROUTE } from '../src/world/frontierLandform.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { computeVisualAssetBounds } from '../src/world/visualFactory.js';

test('frontier forage is deterministic, bounded, stable-IDed, and clear of Camp', () => {
  const first = sampleFrontierForageChunk(3, 2), second = sampleFrontierForageChunk(3, 2);
  assert.deepEqual(second, first);
  assert.ok(first.length >= 6 && first.length <= 8);
  assert.equal(new Set(first.map(node => node.id)).size, first.length);
  for (const node of first) {
    assert.match(node.id, /^f1:r:3:2:\d+$/);
    assert.equal(node.chunkId, '3,2');
    assert.equal(node.regionId, 'camp');
    assert.equal(node.persistentFinite, true);
    assert.ok(node.pos.x >= 153 && node.pos.x <= 197 && node.pos.z >= 103 && node.pos.z <= 147);
  }
  assert.deepEqual(sampleFrontierForageChunk(0, 0), []);
});

test('habitats select different broad forage mixes and reject injected steep terrain', () => {
  const wet = sampleFrontierForageChunk(4, -3, { getHeight: () => 1 });
  const dry = sampleFrontierForageChunk(-4, 4, { getHeight: () => 1 });
  assert.notDeepEqual(wet.map(node => node.type), dry.map(node => node.type));
  assert.deepEqual(sampleFrontierForageChunk(3, 3, { getHeight: x => x * 2 }), []);
});

test('north Camp approach starts with a nearby deterministic forage group', () => {
  const approach = sampleFrontierForageChunk(0, -3);
  assert.ok(approach.filter(node => Math.hypot(node.pos.x, node.pos.z + 114) >= 5 && Math.hypot(node.pos.x, node.pos.z + 114) <= 9).length >= 2);
});

test('north terrace rock slots use admitted mineral assets with canonical IDs and sufficient yield', () => {
  const assets = WORLD_DATA.visualAssets.filter(asset => ['asset_iron_ore_rock', 'asset_crystal'].includes(asset.id));
  assert.deepEqual(assets.map(asset => asset.id).sort(), ['asset_crystal', 'asset_iron_ore_rock']);
  const sampled = sampleFrontierForageChunk(0, -3, { visualAssets: assets });
  const minerals = sampled.filter(node => node.visualAsset && assets.includes(node.visualAsset));
  assert.deepEqual(minerals.map(node => [node.placementIndex, node.id, node.type, node.visualAsset.id]), [
    [2, 'f1:r:0:-3:2', 'rock', 'asset_iron_ore_rock'],
    [4, 'f1:r:0:-3:4', 'rock', 'asset_crystal'],
    [7, 'f1:r:0:-3:7', 'rock', 'asset_iron_ore_rock'],
  ]);
  assert.deepEqual(minerals.map(node => [Number(node.pos.x.toFixed(2)), Number(node.pos.z.toFixed(2))]), [
    [4.2, -121.62], [13.74, -124.34], [6, -131.36],
  ]);

  const runtime = createRuntimeResourcePlacements(minerals);
  assert.deepEqual(runtime.map(node => [node.resourceType.resourceId, node.resourceType.maxChunks]), [
    ['iron_ore', 5], ['crystal_shard', 4], ['iron_ore', 5],
  ]);
  assert.ok(runtime.every(node => node.resourceType.solid && node.resourceType.assetCollision === node.visualAsset.collision));
  const yieldByResource = runtime.reduce((totals, node) => {
    totals[node.resourceType.resourceId] = (totals[node.resourceType.resourceId] ?? 0) + node.resourceType.maxChunks;
    return totals;
  }, {});
  assert.ok(yieldByResource.iron_ore >= 8);
  assert.ok(yieldByResource.crystal_shard >= 2);
});

test('missing or non-harvestable mineral assets preserve the ordinary rock recipes', () => {
  const ordinary = sampleFrontierForageChunk(0, -3);
  const invalid = sampleFrontierForageChunk(0, -3, {
    visualAssets: [
      { id: 'asset_iron_ore_rock', gameplay: { role: 'prop' } },
      { id: 'asset_crystal', gameplay: { role: 'harvestable' } },
    ],
  });
  for (const index of [2, 4, 7]) {
    const expected = ordinary.find(node => node.placementIndex === index);
    const actual = invalid.find(node => node.placementIndex === index);
    assert.equal(expected.type, 'rock');
    assert.equal(actual.type, 'rock');
    assert.equal(actual.visualAsset, undefined);
    assert.equal(actual.id, expected.id);
    assert.deepEqual(actual.pos, expected.pos);
  }
});

test('Skybreak stages useful lowland supplies and a cap mineral with reserved persistent IDs', () => {
  const assets = WORLD_DATA.visualAssets.filter(asset => ['asset_berry_bush', 'asset_crystal'].includes(asset.id));
  const chunks = [[-1, -4], [0, -4], [0, -5]].map(([cx, cz]) => sampleFrontierForageChunk(cx, cz, { visualAssets: assets }));
  assert.ok(chunks.every(nodes => nodes.length <= 12), 'ordinary and staged forage remain bounded per chunk');
  const staged = chunks.flat().filter(node => node.placementIndex >= 100);
  assert.deepEqual(staged.map(node => [node.id, node.type, node.visualAsset?.id, node.pos.x, node.pos.z]), [
    ['f1:r:-1:-4:100', 'fiber', 'asset_berry_bush', -20, -166],
    ['f1:r:-1:-4:101', 'fiber', 'asset_berry_bush', -22.8, -167],
    ['f1:r:0:-4:100', 'fiber', undefined, 42, -166],
    ['f1:r:0:-5:100', 'rock', 'asset_crystal', 32, -214],
  ]);
  assert.deepEqual(staged.map(node => [node.id, node.uniformScale]), [
    ['f1:r:-1:-4:100', 1.5],
    ['f1:r:-1:-4:101', 1.5],
    ['f1:r:0:-4:100', 1.16],
    ['f1:r:0:-5:100', 1.8],
  ]);
  const runtime = createRuntimeResourcePlacements(staged);
  assert.deepEqual(runtime.map(node => {
    const resourceType = node.resourceType ?? getResourceType(node.type);
    return [node.id, resourceType.resourceId, resourceType.maxChunks];
  }), [
    ['f1:r:-1:-4:100', 'berries', 4],
    ['f1:r:-1:-4:101', 'berries', 4],
    ['f1:r:0:-4:100', 'fiber', 3],
    ['f1:r:0:-5:100', 'crystal_shard', 4],
  ]);
  const h = (x, z) => sampleFrontier(x, z).height;
  for (const node of staged) {
    const bounds = node.visualAsset ? computeVisualAssetBounds(node.visualAsset) : null;
    const visualRadius = bounds ? Math.hypot(bounds.size.w, bounds.size.d) * .5 * node.uniformScale : .55 * node.uniformScale;
    const collision = node.visualAsset?.collision;
    const collisionRadius = collision ? Math.hypot(collision.size.w, collision.size.d) * .5 * node.uniformScale : 0;
    const radius = Math.max(visualRadius, collisionRadius);
    assert.equal(hasFootprintSupport(node.pos.x, node.pos.z, { getHeight: h, radius, maxSlope: .42 }), true, node.id);
  }
  const berries = staged.filter(node => node.visualAsset?.id === 'asset_berry_bush');
  const distanceToRoute = ({ x, z }) => Math.min(...SKYBREAK_ROUTE.slice(1).map((end, index) => {
    const start = SKYBREAK_ROUTE[index];
    const dx = end.x - start.x, dz = end.z - start.z;
    const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - start.x - dx * t, z - start.z - dz * t);
  }));
  assert.ok(Math.abs(Math.hypot(berries[0].pos.x - berries[1].pos.x, berries[0].pos.z - berries[1].pos.z) - 2.973) < .001, 'berry pair forms one foreground pocket');
  assert.ok(berries.every(node => distanceToRoute(node.pos) > 18), 'full berry thicket stays clear of the ascent route');
  assert.ok(distanceToRoute(staged.find(node => node.id === 'f1:r:0:-4:100').pos) > 8, 'east fiber stays clear of the return route');
  const berryBounds = computeVisualAssetBounds(berries[0].visualAsset);
  assert.deepEqual([
    Number((berryBounds.size.w * berries[0].uniformScale).toFixed(3)),
    Number((berryBounds.size.h * berries[0].uniformScale).toFixed(3)),
    Number((berryBounds.size.d * berries[0].uniformScale).toFixed(3)),
  ], [3.014, 1.846, 2.43]);
  const crystal = runtime.find(node => node.id === 'f1:r:0:-5:100');
  const descriptor = describeVisualAssetCollider({
    collision: crystal.visualAsset.collision,
    uniformScale: crystal.uniformScale,
    position: crystal.pos,
    rotationY: crystal.rotY,
  });
  assert.deepEqual(Object.fromEntries(Object.entries(descriptor.size).map(([key, value]) => [key, Number(value.toFixed(3))])), { width: 3.672, height: 2.79, depth: 2.88 });
  assert.ok(Math.abs(crystal.pos.y - (descriptor.position.y + descriptor.offset.y - descriptor.size.height * .5)) < 1e-9, 'scaled crystal collider stays grounded');
  const crystalNode = {
    type: crystal.resourceType,
    collisionEnabled: crystal.collisionEnabled,
    state: { position: crystal.pos, rotationY: crystal.rotY, uniformScale: crystal.uniformScale, nodeState: 'READY', remainingChunks: 4 },
  };
  const approach = { x: 33.879, z: -214.684 };
  approach.y = h(approach.x, approach.z) + .52;
  assert.equal(isPlayerInsideColliderVolume(approach, crystalNode), false, 'ordinary approach stays outside the scaled collider');
  assert.equal(getHarvestReach(crystalNode), 1.05, 'enlargement retains the ordinary solid-surface strike reach');
  assert.equal(isHarvestableInRange(crystalNode, approach), true, 'fixed cap crystal remains harvestable from supported ground');
  assert.ok(getHarvestInteractionPoint(crystalNode, approach).y >= crystal.pos.y, 'strike point stays above the terrain-grounded base');
  assert.equal(sampleFrontier(32, -214).surfaceKind, 'skybreak-cap');
  assert.equal(sampleFrontierForageChunk(-1, -4).some(node => node.placementIndex >= 100), false, 'asset-backed supplies do not silently degrade to another resource');
  assert.equal(sampleFrontierForageChunk(0, -5).some(node => node.placementIndex >= 100), false, 'the cap crystal requires its admitted harvestable asset');
});
