import test from 'node:test';
import assert from 'node:assert/strict';
import { MOSSLING_MOTION, mosslingTravelSpeed } from '../src/creatures/mosslingMotion.js';
import { deriveCompanionFollowIntent, MOSSLING_FOLLOW_TUNING, COMPANION_FOLLOW_TUNING } from '../src/companions/companionFollowIntent.js';
import { registerCharacterAssets } from '../tools/register-character-assets.mjs';

function intent(distance, state = {}, tuning = MOSSLING_FOLLOW_TUNING) {
  return deriveCompanionFollowIntent({ player: {x:0,y:0,z:0}, position:{x:0,y:0,z:-distance}, elapsed:0, state, tuning });
}
test('Mossling uses measured Run travel and bounded catch-up at companion size', () => {
  assert.ok(Math.abs(intent(4.4).speed - 1.33) < 1e-10);
  assert.ok(Math.abs(intent(7).speed / (1.9 * .7) - 1.5) < 1e-10);
  assert.ok(Math.abs(intent(15).speed / (1.9 * .7) - 1.7) < 1e-10);
  for (const scale of [.7,.9,1,1.2]) {
    assert.ok(Math.abs(mosslingTravelSpeed(scale) * .35 / (MOSSLING_MOTION.walk * scale) - 1.023076923) < 1e-8);
    assert.ok(Math.abs(mosslingTravelSpeed(scale) * 1.6 / (MOSSLING_MOTION.run * scale) - 1.6) < 1e-8);
  }
  assert.equal(mosslingTravelSpeed(.9, 2), 1.8, 'Author speed edits remain effective');
});
test('near settling walks, turning at rest does not tow Mossling, and other species retain tuning', () => {
  assert.ok(Math.abs(intent(3, {mode:'STROLL'}).speed - .455) < 1e-10);
  const settled = intent(2);
  assert.equal(settled.speed, 0);
  assert.equal(settled.mode, 'SETTLE');
  assert.equal(intent(7, {}, COMPANION_FOLLOW_TUNING).speed, 4.15);
  assert.equal(intent(15, {}, COMPANION_FOLLOW_TUNING).speed, 6.2);
});
test('character registration is idempotent and preserves sibling, collision and placement data', () => {
  const moss = { id:'asset_wildkin_mossling', parts:[{}], collision:{shape:'box'}, gameplay:{wildkin:{moveSpeed:2.8,health:6}} };
  const sibling = {id:'asset_tidefin',model:{path:'unchanged'}};
  const world = {visualAssets:[moss,sibling],regions:[{props:[{id:'moss',uniformScale:.9}]}]};
  registerCharacterAssets(world);
  const once = structuredClone(world);
  registerCharacterAssets(world);
  assert.deepEqual(world, once);
  assert.equal(world.visualAssets[1], sibling);
  assert.deepEqual(moss.collision, {shape:'box'});
  assert.equal(moss.gameplay.wildkin.health, 6);
  assert.deepEqual(moss.model.locomotion,{walk:.65,run:1.9});
});
