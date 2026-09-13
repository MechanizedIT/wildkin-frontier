import test from 'node:test';
import assert from 'node:assert/strict';
import { getFrontierPurposePresentation } from '../src/ui/betaShell.js';

const frontierModel = (overrides = {}) => ({
  regionName: 'Frontier',
  isCamp: false,
  objective: { id: 'sunscar-bloom', frontier: true, title: 'Find a Sunscar bloom', abilityHint: 'mossling' },
  ability: { name: 'Bloom', ready: true },
  companions: [{ id: 'moss-a', speciesId: 'mossling', active: true }],
  ...overrides,
});

test('frontier purpose stays compact and yields to active field guidance', () => {
  assert.deepEqual(getFrontierPurposePresentation(frontierModel()), {
    visible: true,
    frontier: true,
    kicker: 'Frontier · Field plan',
    title: 'Find a Sunscar bloom',
    highlightAbility: true,
  });
  assert.equal(getFrontierPurposePresentation(frontierModel({ fieldTaming: { stage: 'lure' } })).visible, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ observation: { complete: false } })).visible, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ observation: { complete: true } })).visible, true);
  assert.deepEqual(getFrontierPurposePresentation({ regionName: 'Camp', objective: { title: 'Legacy objective' } }), {
    visible: true,
    frontier: false,
    kicker: 'Camp · Field plan',
    title: 'Legacy objective',
    highlightAbility: false,
  });
});

test('purpose highlights only a ready active Mossling Bloom outside Camp', () => {
  assert.equal(getFrontierPurposePresentation(frontierModel({ fieldTaming: { stage: 'lure' } })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ observation: { complete: false } })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ observation: { complete: true } })).highlightAbility, true);
  assert.equal(getFrontierPurposePresentation(frontierModel({ isCamp: true })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ ability: { name: 'Bloom', ready: false } })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ ability: { name: 'Cragbreaker', ready: true } })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ companions: [{ id: 'ember-a', speciesId: 'emberhorn', active: true }] })).highlightAbility, false);
  assert.equal(getFrontierPurposePresentation(frontierModel({ objective: { id: 'other', frontier: true, title: 'Other purpose' } })).highlightAbility, false);
});
