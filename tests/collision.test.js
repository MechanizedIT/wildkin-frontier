import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampToBounds, circleVsAABB, isColliding, resolveMovement } from "../src/world/collision.js";

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const obstacles = [
  { x: 4.2, z: 0.6, w: 1.8, h: 1.8, aabb: { minX: 4.2 - 0.9, maxX: 4.2 + 0.9, minZ: 0.6 - 0.9, maxZ: 0.6 + 0.9 } },
];

describe("clampToBounds", () => {
  it("inside stays", () => {
    const r = clampToBounds({ x: 0, z: 0 }, 0.42, bounds);
    assert.equal(r.x, 0);
    assert.equal(r.z, 0);
    assert.equal(r.clamped, false);
  });
  it("outside clamped", () => {
    const r = clampToBounds({ x: 20, z: 0 }, 0.5, bounds);
    assert.equal(r.x, 9.5);
    assert.equal(r.clamped, true);
  });
});

describe("circleVsAABB", () => {
  it("colliding", () => {
    const c = { x: 4.2, z: 0.6, r: 0.5 };
    const aabb = obstacles[0].aabb;
    assert.equal(circleVsAABB(c, aabb).colliding, true);
  });
  it("not colliding", () => {
    const c = { x: 0, z: 0, r: 0.42 };
    assert.equal(circleVsAABB(c, obstacles[0].aabb).colliding, false);
  });
});

describe("isColliding", () => {
  it("detects obstacle", () => {
    assert.equal(isColliding({ x: 4.2, z: 0.6 }, 0.42, obstacles), true);
    assert.equal(isColliding({ x: 0, z: 0 }, 0.42, obstacles), false);
  });
});

describe("resolveMovement", () => {
  it("free movement passes", () => {
    const from = { x: 0, z: 0 };
    const to = { x: 1, z: 0 };
    const res = resolveMovement(from, to, 0.42, obstacles, bounds);
    assert.equal(res.x, 1);
    assert.equal(res.z, 0);
  });
  it("blocked by obstacle stays or slides", () => {
    const from = { x: 2.5, z: 0.6 };
    const to = { x: 4.2, z: 0.6 };
    const res = resolveMovement(from, to, 0.42, obstacles, bounds);
    // Should not end inside obstacle
    assert.equal(isColliding(res, 0.42, obstacles), false);
  });
  it("diagonal slide", () => {
    const from = { x: 2.5, z: -0.5 };
    const to = { x: 4.2, z: 0.6 };
    const res = resolveMovement(from, to, 0.42, obstacles, bounds);
    assert.equal(isColliding(res, 0.42, obstacles), false);
    // Should allow at least one axis
    assert.ok(res.x !== from.x || res.z !== from.z);
  });
  it("bounds clamp", () => {
    const from = { x: 9, z: 0 };
    const to = { x: 15, z: 0 };
    const res = resolveMovement(from, to, 0.42, [], bounds);
    assert.ok(res.x <= 9.58);
  });
});
