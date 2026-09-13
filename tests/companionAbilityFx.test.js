import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCompanionAbilityFx } from '../src/presentation/companionAbilityFx.js';

const activeGroups = (fx) => fx.group.children.filter((group) => group.visible);

test('Tidefin dome follows authoritative ward remaining and clears while presentation is hidden', (t) => {
  const scene = new THREE.Scene();
  const fx = createCompanionAbilityFx({ scene });
  t.after(() => fx.dispose());
  fx.trigger('tidefin', { x: 2, y: 1, z: 3 });
  fx.update(.1, { wardRemaining: 2.4, playerPosition: { x: 4, y: 2, z: 5 } });
  assert.equal(activeGroups(fx).length, 1);
  assert.deepEqual(activeGroups(fx)[0].position.toArray(), [4, 2, 5]);

  for (let index = 0; index < 40; index += 1) fx.update(.1, { wardRemaining: 2.4 });
  assert.equal(activeGroups(fx).length, 1, 'frame age cannot expire an authoritative ward');
  fx.update(0, { wardRemaining: 0, hidden: true });
  assert.equal(activeGroups(fx).length, 0, 'authoritative end clears even behind a modal');
});

test('ward synchronization does not clear other ability FX and standalone preview retains bounded age', (t) => {
  const scene = new THREE.Scene();
  const fx = createCompanionAbilityFx({ scene });
  t.after(() => fx.dispose());
  fx.trigger('mossling');
  fx.trigger('tidefin');
  fx.update(.1, { wardRemaining: 0 });
  assert.equal(activeGroups(fx).length, 1, 'only the stale Tidefin dome clears');

  fx.reset();
  fx.trigger('tidefin');
  for (let index = 0; index < 29; index += 1) fx.update(.1);
  assert.equal(activeGroups(fx).length, 1);
  fx.update(.1);
  assert.equal(activeGroups(fx).length, 0, 'standalone preview still expires without authoritative state');
});
