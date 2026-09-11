import test from "node:test";
import assert from "node:assert/strict";
import { deriveCompanionFollowIntent } from "../src/companions/companionFollowIntent.js";

const player = { x: 0, y: 0.52, z: 0 };

test("companion follow uses relaxed hysteresis before catch-up", () => {
  const settled = deriveCompanionFollowIntent({ position: { x: 0.4, y: 0.5, z: -2.1 }, player, elapsed: 0, state: {} });
  assert.equal(settled.mode, "SETTLE");
  const strolling = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -4.4 }, player, elapsed: 1, state: settled.nextState });
  assert.equal(strolling.mode, "STROLL");
  const catchup = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -7.1 }, player, elapsed: 2, state: strolling.nextState });
  assert.equal(catchup.mode, "CATCHUP");
  assert.ok(catchup.speed > strolling.speed);
});

test("companion formation remains behind the player's current facing", () => {
  const north = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: 0 }, player, playerFacing: 0, elapsed: 3, state: {} });
  assert.ok(north.anchor.z < player.z);
  const east = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: 0 }, player, playerFacing: Math.PI / 2, elapsed: 3, state: {} });
  assert.ok(east.anchor.x < player.x);
});

test("a settled companion ignores a small player turn until real separation opens follow", () => {
  const settled = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -2.1 }, player, playerFacing: 0, elapsed: 0, state: {} });
  const afterTurn = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -2.1 }, player, playerFacing: Math.PI * 0.8, elapsed: 0.2, state: settled.nextState });
  assert.equal(afterTurn.mode, "SETTLE");
  assert.deepEqual(afterTurn.target, settled.nextState.settledPoint);
});

test("idle attention waits, then returns to a real settle before another forage", () => {
  const initial = deriveCompanionFollowIntent({ position: { x: 0.4, y: 0.5, z: -2.1 }, player, elapsed: 0, state: {} });
  const attend = deriveCompanionFollowIntent({ position: { x: 0.4, y: 0.5, z: -2.1 }, player, elapsed: 1.5, state: initial.nextState });
  assert.equal(attend.mode, "ATTEND");
  const midway = deriveCompanionFollowIntent({ position: { x: 0.4, y: 0.5, z: -2.1 }, player, elapsed: 2.1, state: attend.nextState });
  assert.equal(midway.mode, "ATTEND");
  assert.deepEqual(midway.target, attend.target);
  const settledAgain = deriveCompanionFollowIntent({ position: { x: 0.4, y: 0.5, z: -2.1 }, player, elapsed: 3.3, state: attend.nextState });
  assert.equal(settledAgain.mode, "SETTLE");
});

test("companion only teleports when truly separated, preserving ordinary obstacle recovery", () => {
  const recover = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -15 }, player, elapsed: 4, state: {} });
  assert.equal(recover.mode, "RECOVER");
  assert.equal(recover.shouldTeleport, false);
  const teleport = deriveCompanionFollowIntent({ position: { x: 0, y: 0.5, z: -25 }, player, elapsed: 4, state: recover.nextState });
  assert.equal(teleport.shouldTeleport, true);
});
