import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompanionAbilityPresentation, getFrontierPurposePresentation } from '../src/ui/betaShell.js';

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

test('Tidal Ward readout follows active seconds, then returns to cooldown and ready states', () => {
  const base = frontierModel({
    objective: { frontier: true, title: 'Cross the guarded pass' },
    companions: [{ id: 'tide-a', speciesId: 'tidefin', active: true }],
  });
  const active = getCompanionAbilityPresentation({ ...base, ability: {
    speciesId: 'tidefin', name: 'Tidal Ward', ready: false, cooldown: 26,
    activeRemaining: 2.04, activeDuration: 3,
  } });
  assert.deepEqual(active, {
    visible: true, active: true, disabled: true, wardSeconds: 3, cooldown: 0,
    label: 'Tidal Ward', ariaLabel: 'Tidal Ward active. Protected for 3 seconds remaining.',
  });
  assert.equal(getCompanionAbilityPresentation({ ...base, ability: {
    speciesId: 'tidefin', name: 'Tidal Ward', ready: false, activeRemaining: 1.99,
  } }).wardSeconds, 2);
  assert.equal(getCompanionAbilityPresentation({ ...base, ability: {
    speciesId: 'tidefin', name: 'Tidal Ward', ready: false, activeRemaining: .01,
  } }).wardSeconds, 1);

  const cooldown = getCompanionAbilityPresentation({ ...base, ability: {
    speciesId: 'tidefin', name: 'Tidal Ward', ready: false, cooldown: 23.1,
    activeRemaining: 0, activeDuration: 3,
  } });
  assert.equal(cooldown.active, false);
  assert.equal(cooldown.cooldown, 24);
  assert.equal(cooldown.label, 'Tidal Ward 24s');
  assert.equal(cooldown.ariaLabel, 'Tidal Ward, 24 seconds until ready.');

  const ready = getCompanionAbilityPresentation({ ...base, ability: {
    speciesId: 'tidefin', name: 'Tidal Ward', ready: true, cooldown: 0, activeRemaining: 0,
  } });
  assert.equal(ready.disabled, false);
  assert.equal(ready.label, 'Tidal Ward');
  assert.equal(ready.ariaLabel, 'Tidal Ward ready.');
});

test('ability HUD hides for blocking surfaces and ignores stale ward fields on other abilities', () => {
  const stale = getCompanionAbilityPresentation(frontierModel({ ability: {
    speciesId: 'mossling', name: 'Bloom', ready: true, cooldown: 0, activeRemaining: 2,
  } }));
  assert.equal(stale.active, false);
  assert.equal(stale.disabled, false);
  assert.equal(getCompanionAbilityPresentation(frontierModel({ isCamp: true })).visible, false);
  assert.equal(getCompanionAbilityPresentation(frontierModel({ ability: null })).visible, false);
  assert.equal(getCompanionAbilityPresentation(frontierModel({ fieldTaming: { stage: 'lure' } })).visible, false);
  assert.equal(getCompanionAbilityPresentation(frontierModel(), { opened: true }).visible, false);
  assert.equal(getCompanionAbilityPresentation(frontierModel(), { welcome: true }).visible, false);
});
