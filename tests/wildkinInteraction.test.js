import test from 'node:test';
import assert from 'node:assert/strict';
import { describeWildkinInteraction, resolveWildkinInteractionActivation } from '../src/companions/wildkinInteraction.js';

const mossling = { id: 'mossling', name: 'Mossling', taming: { supply: 'berry_lure' } };
const eligible = { ok: true };

test('Wildkin prompt follows the selected hotbar item, not merely owned supplies', () => {
  const input = { species: mossling, eligibility: eligible, actionLabel: 'PLACE BERRIES', detail: 'Use the lure.' };
  const tool = describeWildkinInteraction({ ...input, selectedItem: { id: 'omni_tool', kind: 'tool' } });
  assert.deepEqual({ label: tool.label, action: tool.action, disabled: tool.disabled }, { label: 'ATTACK', action: 'attack', disabled: false });
  const matching = describeWildkinInteraction({ ...input, selectedItem: { id: 'berry_lure', kind: 'taming' } });
  assert.deepEqual({ label: matching.label, action: matching.action, disabled: matching.disabled }, { label: 'PLACE BERRIES', action: 'catch', disabled: false });
  assert.equal(matching.requiredEquipmentId, 'berry_lure');
  const wrong = describeWildkinInteraction({ ...input, selectedItem: { id: 'woven_snare', kind: 'taming' } });
  const empty = describeWildkinInteraction({ ...input, selectedItem: null });
  assert.equal(wrong.action, 'select-taming-item');
  assert.equal(empty.action, 'select-taming-item');
  assert.equal(wrong.disabled, true);
  assert.match(wrong.label, /BERRY LURE/);
});

test('queued catch cannot activate or consume after the selected item changes', () => {
  const catchInfo = { type: 'bond', action: 'catch', requiredEquipmentId: 'berry_lure' };
  assert.equal(resolveWildkinInteractionActivation(catchInfo, { id: 'berry_lure', kind: 'taming' }), 'catch');
  assert.equal(resolveWildkinInteractionActivation(catchInfo, { id: 'woven_snare', kind: 'taming' }), null);
  assert.equal(resolveWildkinInteractionActivation(catchInfo, null), null);
  const attackInfo = { type: 'bond', action: 'attack' };
  assert.equal(resolveWildkinInteractionActivation(attackInfo, { id: 'omni_tool', kind: 'tool' }), 'attack');
  assert.equal(resolveWildkinInteractionActivation(attackInfo, { id: 'medkit', kind: 'consumable' }), null);
});
