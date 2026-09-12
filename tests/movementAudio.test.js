import test from "node:test";
import assert from "node:assert/strict";
import { createMovementAudio } from "../src/audio/movementAudio.js";

function state(mode = "IDLE", grounded = mode !== "JUMP" && mode !== "FALL", verticalVelocity = 0) {
  return { mode, grounded, verticalVelocity };
}

function harness() {
  const calls = [];
  const audio = {
    playJump: () => calls.push(["jump"]),
    playLand: intensity => calls.push(["land", intensity]),
    playDodge: () => calls.push(["dodge"]),
  };
  return { calls, movement: createMovementAudio({ gameAudio: audio }) };
}

test("multiple fixed updates emit one jump and one landing cue", () => {
  const { calls, movement } = harness();
  movement.update(1 / 60, state());
  movement.update(1 / 60, state("JUMP", false, 5.6));
  movement.update(1 / 60, state("JUMP", false, 2));
  movement.update(1 / 60, state("FALL", false, -3.5));
  movement.update(1 / 60, state("FALL", false, -4.2));
  movement.update(1 / 60, state("FALL", false, -4.8));
  movement.update(1 / 60, state("IDLE", true, 0));
  assert.deepEqual(calls.map(([kind]) => kind), ["jump", "land"]);
  assert.ok(calls[1][1] > 0 && calls[1][1] <= 1);
});

test("tiny grounded flicker does not create a landing cue", () => {
  const { calls, movement } = harness();
  movement.update(1 / 60, state());
  movement.update(1 / 60, state("FALL", false, -0.1));
  movement.update(1 / 60, state("IDLE", true, 0));
  assert.deepEqual(calls, []);
});

test("reset makes the first update silent", () => {
  const { calls, movement } = harness();
  movement.update(1 / 60, state());
  movement.update(1 / 60, state("JUMP", false, 5));
  movement.reset();
  movement.update(1 / 60, state("JUMP", false, 5));
  assert.deepEqual(calls, [["jump"]]);
  movement.reset(state());
  movement.update(1 / 60, state("JUMP", false, 5));
  assert.deepEqual(calls, [["jump"], ["jump"]], "a supplied grounded reset pose preserves the very next real jump edge");
});

test("held dodge emits only on entry", () => {
  const { calls, movement } = harness();
  movement.update(1 / 60, state());
  movement.update(1 / 60, state("DODGE", true, 0));
  movement.update(1 / 60, state("DODGE", true, 0));
  movement.update(1 / 60, state("DODGE", true, 0));
  assert.deepEqual(calls, [["dodge"]]);
});
