import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVEMENT_CONFIG } from "../src/game/config.js";
import { resolveMovement, isColliding } from "../src/world/collision.js";
import { createMovementPlayground } from "../src/world/createMovementPlayground.js";

describe("elevation — platform side blocking", () => {
  it("walking into elevated platform side cannot place player on top (getGroundHeight)", () => {
    const pg = createMovementPlayground();
    // Approach lowA from south at ground height
    const x = -5.8, z = 0.6; // inside southern part of platA? Actually platA z -1.2 ±1.8 => -3.0 to 0.6, so z=0.5 inside, x -5.8 inside
    const groundYApproach = 0.36;
    const hAtGround = pg.getGroundHeight(x, z, groundYApproach);
    assert.equal(hAtGround, 0, "ground approach should not return elevated height");

    // When on top, same XZ should return height
    const onTopY = 1.25 + 0.36;
    const hOnTop = pg.getGroundHeight(x, z, onTopY);
    assert.equal(hOnTop, 1.25, "on top should return platform height");
  });

  it("high platform side also blocks from ground", () => {
    const pg = createMovementPlayground();
    const x = 2.2, z = -7.0;
    const hGround = pg.getGroundHeight(x, z, 0.36);
    assert.equal(hGround, 0);
    const hTop = pg.getGroundHeight(x, z, 2.4 + 0.36);
    assert.equal(hTop, 2.4);
  });

  it("side colliders are solid when below, not solid when on top", () => {
    const pg = createMovementPlayground();
    const posInside = { x: -5.8, z: -1.2 };
    const radius = MOVEMENT_CONFIG.playerRadius;
    // Below platform, should be colliding with side collider
    assert.equal(pg.isBlockedByPlatformSide(posInside.x, posInside.z, radius, 0.36), true);
    // On top, not blocked
    assert.equal(pg.isBlockedByPlatformSide(posInside.x, posInside.z, radius, 1.25 + 0.36), false);
  });

  it("sliding along side still works", () => {
    const pg = createMovementPlayground();
    // Player approaching lowA from west at ground height — side should block penetration
    const from = { x: -9.0, z: 0.6 };
    const to = { x: -5.8, z: 0.6 }; // directly into platform side
    const active = pg.getCollisionObstaclesForHeight(0.36);
    const resolved = resolveMovement(from, to, MOVEMENT_CONFIG.playerRadius, active, pg.bounds);
    assert.equal(isColliding(resolved, MOVEMENT_CONFIG.playerRadius, active), false);
    assert.ok(resolved.x !== to.x, "should not reach inside side-collider");
    // Diagonal slide: approaching corner, should slide along one axis
    const from2 = { x: -9.0, z: 1.6 };
    const to2 = { x: -5.8, z: -1.0 };
    const res2 = resolveMovement(from2, to2, MOVEMENT_CONFIG.playerRadius, active, pg.bounds);
    assert.equal(isColliding(res2, MOVEMENT_CONFIG.playerRadius, active), false);
    assert.ok(res2.x !== from2.x || res2.z !== from2.z, "diagonal should slide along one axis");
  });

  it("valid traversal landing can place player on elevated surface", () => {
    const pg = createMovementPlayground();
    // Simulate jump landing position inside platB landingRegion
    const landingX = 0.5, landingZ = -1.2;
    // Landing height should be recognized when player is at elevated Y
    const onTopY = 1.25 + 0.36;
    const h = pg.getGroundHeight(landingX, landingZ, onTopY);
    assert.equal(h, 1.25);
    // Also isBlocked check should be false on top
    assert.equal(pg.isBlockedByPlatformSide(landingX, landingZ, MOVEMENT_CONFIG.playerRadius, onTopY), false);
    // But if we move off edge, height drops
    const offX = 5, offZ = 0;
    assert.equal(pg.getGroundHeight(offX, offZ, onTopY), 0);
  });

  it("reported left gap invisible obstruction is not solid on ground", () => {
    const pg = createMovementPlayground();
    // left gap mound top near left jump gap mound: x about -2.5 gap center, ensure not blocked
    // Check gap center is walkable ground
    const gapX = -2.5, gapZ = -1.2;
    const h = pg.getGroundHeight(gapX, gapZ, 0.36);
    assert.equal(h, 0, "gap center should be ground height, not elevated");
    // And collision should not block gap corridor at ground
    const active = pg.getCollisionObstaclesForHeight(0.36);
    // Gap corridor should be free
    assert.equal(isColliding({ x: gapX, z: gapZ }, MOVEMENT_CONFIG.playerRadius, active), false);
    // Slight north of gap, still free
    assert.equal(isColliding({ x: -2.5, z: -2.8 }, MOVEMENT_CONFIG.playerRadius, active), false);
  });
});
