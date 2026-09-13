import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';

const FIXED_DT = 1 / 60;

function createTerritorial(type) {
  let projectiles = 0;
  const system = createCreatureSystem(new THREE.Scene(), null, null, {
    spawns: [{
      id: `territorial-${type}`, type, temperament: 'TERRITORIAL', regionId: 'camp',
      pos: { x: 0, y: 0, z: 0 }, homePos: { x: 0, y: .5, z: 0 }, facingYaw: 0,
      roamRadius: 0, noticeRadius: 7, personalSpace: 2, leashRadius: 10,
    }],
    onPlayerDamage: () => true,
    onRequestProjectile: () => { projectiles += 1; },
  });
  system.setActiveRegions(['camp']);
  system.setPlayerPos({ x: 0, y: .5, z: 4.1 });
  system.setPlayerState({ pos: { x: 0, y: .5, z: 4.1 }, mode: 'WALK', speed: 1 });
  return { system, creature: system.getCreatures()[0], getProjectiles: () => projectiles };
}

function advanceToWarning(fixture) {
  for (let frame = 0; frame < 180 && fixture.creature.state.aiState !== 'WARN'; frame += 1) {
    fixture.system.update(FIXED_DT);
  }
  assert.equal(fixture.creature.state.aiState, 'WARN');
}

test('fixed-step territorial warning completes on the same clock used by target eligibility', (t) => {
  for (const [type, engageState] of [['rusher', 'CHASE'], ['spitter', 'REPOSITION']]) {
    const fixture = createTerritorial(type);
    t.after(() => fixture.system.dispose());
    advanceToWarning(fixture);

    // Entry advances aiTimer immediately, but warnTime starts next frame. This
    // is the exact 59-frame phase that previously reset WARN back to ROAM.
    for (let frame = 0; frame < 59; frame += 1) fixture.system.update(FIXED_DT);
    assert.equal(fixture.creature.state.aiState, 'WARN', `${type} retains the complete warning frame`);
    assert.ok(fixture.creature.state.aiTimer >= 1);
    assert.ok(fixture.creature.state.warnTime < 1);

    fixture.system.update(FIXED_DT);
    assert.equal(fixture.creature.state.aiState, engageState, `${type} escalates once warnTime completes`);

    const observed = new Set([fixture.creature.state.aiState]);
    for (let frame = 0; frame < 180; frame += 1) {
      fixture.system.update(FIXED_DT);
      observed.add(fixture.creature.state.aiState);
    }
    if (type === 'rusher') {
      assert.ok(observed.has('WINDUP'));
      assert.ok(observed.has('LUNGE'));
    } else {
      assert.ok(observed.has('WINDUP'));
      assert.ok(fixture.getProjectiles() > 0);
    }
  }
});

test('leaving territorial notice during WARN still releases the encounter', (t) => {
  const fixture = createTerritorial('rusher');
  t.after(() => fixture.system.dispose());
  advanceToWarning(fixture);
  fixture.system.setPlayerPos({ x: 0, y: .5, z: 20 });
  fixture.system.setPlayerState({ pos: { x: 0, y: .5, z: 20 }, mode: 'WALK', speed: 1 });

  for (let frame = 0; frame < 61; frame += 1) fixture.system.update(FIXED_DT);
  assert.equal(fixture.creature.state.aiState, 'ROAM');
  assert.equal(fixture.creature.state.hasWarned, false);
  assert.equal(fixture.creature.state.isAggroed, false);
});
