import test from 'node:test';
import assert from 'node:assert/strict';
import { createSavedProcessClock } from '../src/game/savedProcessClock.js';

function fixture() {
  let process = { id: 'first', progress: 0 }, failures = 0;
  const advances = [];
  const clock = createSavedProcessClock({
    getProcess: () => process, getId: value => value.id, getProgress: value => value.progress,
    duration: 12, maxAdvance: 5,
    advance: seconds => { advances.push(seconds); if (failures) { failures--; return { ok: false }; } process = { ...process, progress: process.progress + seconds }; return { ok: true }; },
  });
  return { clock, advances, get process() { return process; }, set process(value) { process = value; }, fail: () => { failures++; } };
}

test('saved-process clock advances only active capped time in bounded quanta', () => {
  const f = fixture();
  f.clock.update(20, { active: true });
  assert.deepEqual(f.advances, []);
  for (let index = 0; index < 10; index++) f.clock.update(.25, { active: false });
  for (let index = 0; index < 20; index++) f.clock.update(.25, { active: true });
  assert.deepEqual(f.advances, [5]);
});

test('saved-process clock loses one failed quantum and resets partial time for replacement or reduced progress', () => {
  const f = fixture();
  f.fail();
  for (let index = 0; index < 20; index++) f.clock.update(.25, { active: true });
  assert.deepEqual(f.advances, [5]); assert.equal(f.process.progress, 0);
  for (let index = 0; index < 19; index++) f.clock.update(.25, { active: true });
  f.process = { id: 'replacement', progress: 0 };
  f.clock.update(.25, { active: true });
  assert.deepEqual(f.advances, [5]);
  for (let index = 0; index < 20; index++) f.clock.update(.25, { active: true });
  assert.deepEqual(f.advances, [5, 5]);
  f.clock.update(.25, { active: true });
  f.process = { ...f.process, progress: 1 };
  f.clock.update(.25, { active: true });
  assert.deepEqual(f.advances, [5, 5]);
});
