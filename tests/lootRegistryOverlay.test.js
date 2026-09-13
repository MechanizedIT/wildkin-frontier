import test from 'node:test';
import assert from 'node:assert/strict';
import { createLootRegistryOverlay } from '../src/world/lootRegistryOverlay.js';

function fixture() {
  const authored = Object.freeze({ id: 'authored', sectionId: 'field' });
  const generated = Object.freeze({ id: 'f1:d:3:1:0', sectionId: 'camp' });
  const base = {
    data: { marker: true }, _data: { marker: true }, delegated: () => 'base',
    getAllLootChests: () => [authored],
    getLootChestById: id => id === authored.id ? authored : null,
    getLootChestsForSection: id => id === 'field' ? [authored] : [],
    getLootTableById: id => ({ id }),
  };
  return { base, authored, generated, overlay: createLootRegistryOverlay(base, [generated]) };
}

test('overlay exposes all generated identities before residency and delegates the authored registry', () => {
  const { base, authored, generated, overlay } = fixture();
  assert.deepEqual(overlay.getAllLootChests(), [authored, generated]);
  assert.equal(overlay.getLootChestById(generated.id), generated);
  assert.deepEqual(overlay.getLootChestsForSection('camp'), []);
  assert.equal(overlay.getLootTableById('loot').id, 'loot');
  assert.equal(overlay.delegated(), 'base');
  assert.equal(overlay.data, base.data);
});

test('resident lookup changes without removing the persistent generated identity', () => {
  const { generated, overlay } = fixture();
  overlay.setResidentDiscoveryIds([generated.id, 'unknown']);
  assert.deepEqual(overlay.getLootChestsForSection('camp'), [generated]);
  assert.deepEqual(overlay.getResidentDiscoveryIds(), [generated.id]);
  overlay.setResidentDiscoveryIds([]);
  assert.deepEqual(overlay.getLootChestsForSection('camp'), []);
  assert.equal(overlay.getLootChestById(generated.id), generated);
});

test('overlay rejects generated IDs that collide with authored or sibling identities', () => {
  const { base, authored, generated } = fixture();
  assert.throws(() => createLootRegistryOverlay(base, [authored]), /duplicate loot chest authored/);
  assert.throws(() => createLootRegistryOverlay(base, [generated, generated]), /duplicate loot chest f1:d:3:1:0/);
});
