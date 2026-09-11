import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_DATA } from './fixtures/crescentWorld.generated.js';
import { createAuthorDraft } from '../src/author/authorDraft.js';
import { resolveAuthorType } from '../src/author/authorTypeRegistry.js';
import { normalizeWorldData } from '../src/world/worldValidator.js';
import { createStaticWorld } from '../src/world/staticWorldBuilder.js';
import { getColliderCenter } from '../src/world/colliderDescriptor.js';

function fixture() {
  const world = structuredClone(WORLD_DATA), region = world.regions[0];
  world.lootTables ??= [];
  world.lootTables.push({ id: 'loot_collision_test', rewards: [{ type: 'xp', amount: 1 }] });
  world.visualAssets ??= [];
  world.visualAssets.push({ id: 'asset_test_vault', displayName: 'Test vault', category: 'Test', version: 1,
    parts: [{ id: 'body', shape: 'box', position: { x: 0, y: .8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2.2, y: 1.6, z: 1.5 }, color: '#888888' }],
    gameplay: { role: 'prop' }, collision: { shape: 'box', size: { w: 2.2, h: 1.6, d: 1.5 }, offset: { x: .1, y: .8, z: -.15 } } });
  region.lootChests ??= [];
  region.lootChests.push({ id: 'test_solid_vault', pos: { x: (region.bounds.minX + region.bounds.maxX) / 2, y: 0, z: (region.bounds.minZ + region.bounds.maxZ) / 2 }, rotY: 0,
    visualAssetId: 'asset_test_vault', lootTableId: 'loot_collision_test', refillSeconds: null, collisionEnabled: true });
  return world;
}

test('solid loot Author rotate/scale/elevation persists and matches runtime obstacle', () => {
  const draft = createAuthorDraft(fixture());
  const original = draft.findObjectById('test_solid_vault').obj.pos;
  const result = draft.updateNormalizedTransform('test_solid_vault', { position: { x: original.x + 2, y: 1.2, z: original.z + 3 }, rotationY: .7, uniformScale: 1.4 });
  assert.ok(result.ok, result.error);
  const found = draft.findObjectById('test_solid_vault'), def = resolveAuthorType(found);
  assert.equal(def.sizeMode, 'uniform');
  const descriptor = def.collision.describe(found), center = getColliderCenter(descriptor);
  assert.ok(descriptor.enabled);
  const normalized = normalizeWorldData(JSON.parse(JSON.stringify(draft.getDraft())));
  const built = createStaticWorld(normalized), obstacle = built.obstacles.find(o => o.id === found.obj.id);
  assert.ok(obstacle);
  assert.equal(obstacle.x, center.x); assert.equal(obstacle.z, center.z);
  assert.equal(obstacle.w, descriptor.size.width); assert.equal(obstacle.h, descriptor.size.depth);
  assert.equal(obstacle.baseY + obstacle.height / 2, center.y);
  assert.equal(obstacle.rotY, .7);
  const root = built.getLootVisualRoot(found.obj.id);
  assert.equal(root.position.y, 1.2); assert.equal(root.scale.x, 1.4);
});

test('legacy loot remains non-solid; explicit Solid toggle uses the same descriptor in Author and Play', () => {
  const world = fixture();
  const chest = world.regions[0].lootChests.find(c => c.id === 'test_solid_vault');
  delete chest.collisionEnabled;
  assert.equal(createStaticWorld(world).obstacles.some(o => o.id === chest.id), false);
  const draft = createAuthorDraft(world);
  assert.ok(draft.updateInspectorField(chest.id, 'collisionEnabled', true).ok);
  assert.ok(resolveAuthorType(draft.findObjectById(chest.id)).collision.describe(draft.findObjectById(chest.id)).enabled);
  assert.ok(draft.updateInspectorField(chest.id, 'collisionEnabled', false).ok);
  assert.equal(createStaticWorld(draft.getDraft()).obstacles.some(o => o.id === chest.id), false);
});
