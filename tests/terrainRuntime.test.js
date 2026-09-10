import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPickupSystem, PICKUP_CONFIG } from "../src/resources/pickupSystem.js";
import { createXpMoteSystem } from "../src/combat/xpMoteSystem.js";

const slopedPlayground = {
  platforms: [{ aabb: { minX: -2, maxX: 2, minZ: -2, maxZ: 2 }, height: 0 }],
  getGroundHeight(x, z) { return x === 0 && z === 0 ? 0.72 : 0; },
};

test("pickups rest on the active authored terrain query before legacy platform data", () => {
  const system = createPickupSystem(new THREE.Scene(), null, slopedPlayground, () => {});
  const pickup = system.spawnPickup({
    type: { resourceId: "wood", colliderHalfExtents: { x: 0, y: 0, z: 0 } },
    state: { position: { x: 0, y: 0, z: 0 } },
    index: 0,
  });
  pickup.pos.set(0, 0, 0);
  pickup.state = "RESTING";
  system.update(1 / 60, { x: 50, y: 0.5, z: 50 }, () => {});
  assert.equal(pickup.pos.y, 0.72 + PICKUP_CONFIG.restHeight);
});

test("XP motes rest on the active authored terrain query before legacy platform data", () => {
  const system = createXpMoteSystem(new THREE.Scene(), { playground: slopedPlayground });
  system.spawnMotes({ x: 0, y: 0, z: 0 }, 1);
  const mote = system._motes[0];
  mote.pos.set(0, 0, 0);
  mote.state = "REST";
  system.update(1 / 60);
  assert.equal(mote.pos.y, 0.72 + 0.22);
});
