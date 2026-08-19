import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyMovementBand, getBandSpeed, normalize2D, clampToUnitCircle, isValidIntent } from "../src/movement/movementBands.js";
import { MOVEMENT_CONFIG } from "../src/game/config.js";
import { mergeIntentsPure } from "../src/input/inputController.js";

describe("classifyMovementBand", () => {
  it("deadzone idle", () => {
    assert.equal(classifyMovementBand(0, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(0.05, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(0.15, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(0.159, MOVEMENT_CONFIG), "idle");
  });
  it("threshold boundaries", () => {
    assert.equal(classifyMovementBand(0.16, MOVEMENT_CONFIG), "sneak");
    assert.equal(classifyMovementBand(0.39, MOVEMENT_CONFIG), "sneak");
    assert.equal(classifyMovementBand(0.40, MOVEMENT_CONFIG), "walk");
    assert.equal(classifyMovementBand(0.69, MOVEMENT_CONFIG), "walk");
    assert.equal(classifyMovementBand(0.70, MOVEMENT_CONFIG), "run");
    assert.equal(classifyMovementBand(1.0, MOVEMENT_CONFIG), "run");
    assert.equal(classifyMovementBand(1.5, MOVEMENT_CONFIG), "run");
  });
  it("invalid inputs idle", () => {
    assert.equal(classifyMovementBand(NaN, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(-0.2, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(undefined, MOVEMENT_CONFIG), "idle");
    assert.equal(classifyMovementBand(null, MOVEMENT_CONFIG), "idle");
  });
});

describe("getBandSpeed", () => {
  it("returns correct speeds and idle 0", () => {
    assert.equal(getBandSpeed("idle", MOVEMENT_CONFIG), 0);
    assert.equal(getBandSpeed("sneak", MOVEMENT_CONFIG), MOVEMENT_CONFIG.sneakSpeed);
    assert.equal(getBandSpeed("walk", MOVEMENT_CONFIG), MOVEMENT_CONFIG.walkSpeed);
    assert.equal(getBandSpeed("run", MOVEMENT_CONFIG), MOVEMENT_CONFIG.runSpeed);
    assert.equal(getBandSpeed("unknown", MOVEMENT_CONFIG), 0);
  });
  it("run meaningfully faster than walk, walk faster than sneak", () => {
    const sneak = getBandSpeed("sneak", MOVEMENT_CONFIG);
    const walk = getBandSpeed("walk", MOVEMENT_CONFIG);
    const run = getBandSpeed("run", MOVEMENT_CONFIG);
    assert.ok(run > walk * 1.5, "run should be meaningfully faster than walk");
    assert.ok(walk > sneak * 1.5, "walk should be faster than sneak");
    assert.ok(run < 10, "run preserves headroom for mounts/buffs (<10)");
  });
});

describe("normalize2D", () => {
  it("zero returns zero", () => {
    const r = normalize2D(0, 0);
    assert.equal(r.x, 0);
    assert.equal(r.y, 0);
    assert.equal(r.mag, 0);
  });
  it("normalizes correctly", () => {
    const r = normalize2D(3, 4);
    assert.ok(Math.abs(r.x - 0.6) < 1e-9);
    assert.ok(Math.abs(r.y - 0.8) < 1e-9);
    assert.equal(r.mag, 5);
  });
  it("diagonal has unit length", () => {
    const r = normalize2D(1, 1);
    assert.ok(Math.abs(Math.hypot(r.x, r.y) - 1) < 1e-9);
    assert.ok(Math.abs(r.mag - Math.SQRT2) < 1e-9);
  });
});

describe("clampToUnitCircle", () => {
  it("inside stays", () => {
    const r = clampToUnitCircle(0.3, 0.4);
    assert.equal(r.x, 0.3);
    assert.equal(r.y, 0.4);
  });
  it("diagonal beyond 1 is clamped", () => {
    const r = clampToUnitCircle(1, 1);
    assert.ok(Math.abs(Math.hypot(r.x, r.y) - 1) < 1e-9);
  });
  it("clamped magnitude is 1", () => {
    const r = clampToUnitCircle(2, 0);
    assert.equal(r.x, 1);
    assert.equal(r.y, 0);
    assert.equal(r.mag, 1);
  });
});

describe("isValidIntent", () => {
  it("valid", () => {
    assert.equal(isValidIntent({ moveX: 0, moveY: 0, moveMagnitude: 0 }), true);
  });
  it("invalid", () => {
    assert.equal(isValidIntent(null), false);
    assert.equal(isValidIntent({ moveX: NaN, moveY: 0, moveMagnitude: 0 }), false);
  });
});

describe("mergeIntentsPure", () => {
  it("touch move wins over keyboard", () => {
    const touch = { moveX: 1, moveY: 0, moveMagnitude: 0.8, movementBand: "run", dodgeRequested: false, dodgeX: 0, dodgeY: 0 };
    const kb = { moveX: 0, moveY: -1, moveMagnitude: 0.5, movementBand: "walk", dodgeRequested: false, dodgeX: 0, dodgeY: 0 };
    assert.equal(mergeIntentsPure(touch, kb), touch);
  });
  it("touch dodge combines with keyboard move", () => {
    const touch = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: true, dodgeX: 1, dodgeY: 0 };
    const kb = { moveX: 0, moveY: -1, moveMagnitude: 0.55, movementBand: "walk", dodgeRequested: false, dodgeX: 0, dodgeY: 0 };
    const merged = mergeIntentsPure(touch, kb);
    assert.equal(merged.dodgeRequested, true);
    assert.equal(merged.moveMagnitude, kb.moveMagnitude);
    assert.equal(merged.dodgeX, 1);
  });
  it("no touch returns keyboard", () => {
    const touch = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0 };
    const kb = { moveX: 0.5, moveY: 0.5, moveMagnitude: 0.5, movementBand: "walk", dodgeRequested: false, dodgeX: 0, dodgeY: 0 };
    assert.equal(mergeIntentsPure(touch, kb), kb);
  });
});
