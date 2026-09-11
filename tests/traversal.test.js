import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVEMENT_CONFIG } from "../src/game/config.js";
import {
  isInsideRegionXZ,
  closestPointInRegion,
  computeAirTime,
  computeJumpDistance,
  checkJumpTrigger,
  findJumpCandidate,
  checkClimbBottomEntry,
  checkClimbTopEntry,
  computeMantleEndpoints,
  createTraversalController,
} from "../src/movement/traversalController.js";

// Minimal mock playground for pure tests
function makeMockPlayground() {
  const platH = 1.25;
  return {
    getGroundHeight(x, z, y) {
      // lowA at -5.8,-1.2 ; lowB at 0.8,-1.2
      if (x >= -7.9 && x <= -3.7 && z >= -3.0 && z <= 0.6) {
        if (y !== undefined && y < platH - 0.45) return 0;
        return platH;
      }
      if (x >= -1.2 && x <= 2.8 && z >= -2.9 && z <= 0.5) {
        if (y !== undefined && y < platH - 0.45) return 0;
        return platH;
      }
      if (x >= 0.0 && x <= 4.4 && z >= -9.1 && z <= -5.3) {
        if (y !== undefined && y < 2.4 - 0.45) return 0;
        return 2.4;
      }
      return 0;
    },
    jumpTraversals: [
      {
        id: "gap_east_01",
        triggerCenter: { x: -3.70, z: -1.2 },
        triggerRadius: 1.45,
        direction: { x: 1, z: 0 },
        landingRegion: { minX: -1.2, maxX: 2.2, minZ: -2.4, maxZ: 0.1, height: platH },
        minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed,
        maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection,
      },
      {
        id: "gap_west_01",
        triggerCenter: { x: -1.25, z: -0.4 },
        triggerRadius: 1.45,
        direction: { x: -1, z: 0 },
        landingRegion: { minX: -7.6, maxX: -3.9, minZ: -2.4, maxZ: 0.3, height: platH },
        minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed,
        maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection,
      },
    ],
    climbables: [
      {
        id: "ladder_south_high",
        x: 2.2,
        z: -5.05,
        w: 1.9,
        h: 0.5,
        bottomY: 0,
        topY: 2.4,
        topPlatform: { x: 2.2, z: -7.2, w: 4.4, h: 3.8, topY: 2.4, aabb: { minX: 0, maxX: 4.4, minZ: -9.1, maxZ: -5.3 } },
        wallNormal: { x: 0, z: 1 },
        approachDir: { x: 0, z: -1 },
        topEntryRegion: { minX: 1.25, maxX: 3.15, minZ: -6.0, maxZ: -5.25 },
        mantleExit: { x: 2.2, z: -6.4 },
      },
    ],
  };
}

describe("jump — airtime & distance", () => {
  it("airtime in readable 0.7-1.0 for running jump", () => {
    const t = computeAirTime(MOVEMENT_CONFIG.jumpInitialVerticalVelocity, MOVEMENT_CONFIG.jumpGravity);
    assert.ok(t >= 0.7 && t <= 1.0, `airtime ${t} should be 0.7-1.0`);
  });
  it("run distance > walk distance", () => {
    const air = computeAirTime(MOVEMENT_CONFIG.jumpInitialVerticalVelocity, MOVEMENT_CONFIG.jumpGravity);
    const runD = computeJumpDistance(MOVEMENT_CONFIG.runSpeed, air);
    const walkD = computeJumpDistance(MOVEMENT_CONFIG.walkSpeed, air);
    const sneakD = computeJumpDistance(MOVEMENT_CONFIG.sneakSpeed, air);
    assert.ok(runD > walkD, `run ${runD} > walk ${walkD}`);
    assert.ok(walkD > sneakD, `walk ${walkD} > sneak ${sneakD}`);
    assert.ok(runD > walkD * 1.3, "run meaningfully farther");
  });
});

describe("jump — validity gating", () => {
  it("sneak below threshold does not trigger representative gap", () => {
    const pg = makeMockPlayground();
    const worldDir = { x: 1, z: 0 };
    const pos = { x: -3.70, z: -1.2, y: 0.36 };
    const sneakSpeed = MOVEMENT_CONFIG.sneakSpeed; // below the configured takeoff threshold
    const hit = checkJumpTrigger(worldDir, pos, sneakSpeed, 0.30, pg.jumpTraversals[0], MOVEMENT_CONFIG);
    assert.equal(hit, null);
  });
  it("walk may trigger conservative short jump if reachable", () => {
    const pg = makeMockPlayground();
    const worldDir = { x: 1, z: 0 };
    const pos = { x: -3.70, z: -1.2, y: 0.36 };
    const walkSpeed = MOVEMENT_CONFIG.walkSpeed;
    // This legacy unassisted jump uses actual ground momentum. Keep the
    // landing within walking reach as tuning changes, unlike launch pads
    // whose authored impulse is independent of the player's ground speed.
    const walkReach = computeJumpDistance(walkSpeed, computeAirTime(MOVEMENT_CONFIG.jumpInitialVerticalVelocity, MOVEMENT_CONFIG.jumpGravity));
    const shortGap = { ...pg.jumpTraversals[0], landingRegion: { ...pg.jumpTraversals[0].landingRegion, minX: pos.x + walkReach * .85 } };
    const hit = checkJumpTrigger(worldDir, pos, walkSpeed, 0.55, shortGap, MOVEMENT_CONFIG);
    assert.ok(hit !== null, "walk should trigger a gap within its actual momentum reach");
    const beyondReach = { ...shortGap, landingRegion: { ...shortGap.landingRegion, minX: pos.x + walkReach + 1 } };
    assert.equal(checkJumpTrigger(worldDir, pos, walkSpeed, 0.55, beyondReach, MOVEMENT_CONFIG), null, "slower walking must not snap across an unreachable gap");
  });
  it("run triggers farther jump", () => {
    const pg = makeMockPlayground();
    const worldDir = { x: 1, z: 0 };
    const pos = { x: -3.70, z: -1.2, y: 0.36 };
    const runSpeed = MOVEMENT_CONFIG.runSpeed;
    const hit = checkJumpTrigger(worldDir, pos, runSpeed, 0.90, pg.jumpTraversals[0], MOVEMENT_CONFIG);
    assert.ok(hit !== null);
  });
  it("invalid direction (away) does not trigger", () => {
    const pg = makeMockPlayground();
    const worldDir = { x: -1, z: 0 };
    const pos = { x: -3.70, z: -1.2, y: 0.36 };
    const hit = checkJumpTrigger(worldDir, pos, MOVEMENT_CONFIG.runSpeed, 0.90, pg.jumpTraversals[0], MOVEMENT_CONFIG);
    assert.equal(hit, null);
  });
  it("out of trigger radius does not trigger", () => {
    const pg = makeMockPlayground();
    const worldDir = { x: 1, z: 0 };
    const farPos = { x: 5, z: 5, y: 0.36 };
    const hit = checkJumpTrigger(worldDir, farPos, MOVEMENT_CONFIG.runSpeed, 0.90, pg.jumpTraversals[0], MOVEMENT_CONFIG);
    assert.equal(hit, null);
  });
  it("no landing region / unreachable does not trigger", () => {
    const pg = makeMockPlayground();
    // craft a traversal whose landing is too far for any speed
    const farTrav = {
      id: "far",
      triggerCenter: { x: 0, z: 0 },
      triggerRadius: 2,
      direction: { x: 1, z: 0 },
      landingRegion: { minX: 20, maxX: 22, minZ: -1, maxZ: 1, height: 1.25 },
      minTakeoffSpeed: 2.2,
      maxLandingCorrection: 0.5,
    };
    const pos = { x: 0, z: 0, y: 0.36 };
    const hit = checkJumpTrigger({ x: 1, z: 0 }, pos, MOVEMENT_CONFIG.runSpeed, 0.90, farTrav, MOVEMENT_CONFIG);
    assert.equal(hit, null);
  });
});

describe("jump — actual current position preserved", () => {
  it("jump starts from supplied current position, not fixed authored start", () => {
    const pg = makeMockPlayground();
    const ctrl = createTraversalController(pg, MOVEMENT_CONFIG);
    const worldDir = { x: 1, z: 0 };
    // offset from authored trigger center by 0.4 units
    const pos = { x: -3.40, z: -1.05, y: 1.61 }; // on platA top (1.25+0.36)
    const speed = MOVEMENT_CONFIG.runSpeed;
    const res = ctrl.tryStartJump(worldDir, { ...pos }, speed, 0.90);
    assert.ok(res !== null, "should start");
    const st = ctrl.getState();
    assert.ok(Math.abs(st.jumpStartPos.x - pos.x) < 1e-6 && Math.abs(st.jumpStartPos.z - pos.z) < 1e-6, "start pos must equal current pos not authored start");
    assert.notEqual(st.jumpStartPos.x, pg.jumpTraversals[0].triggerCenter.x);
  });
  it("preserves approach momentum: run horizontal velocity > walk", () => {
    const pg = makeMockPlayground();
    const ctrlWalk = createTraversalController(pg, MOVEMENT_CONFIG);
    const ctrlRun = createTraversalController(pg, MOVEMENT_CONFIG);
    const posW = { x: -3.70, z: -1.2, y: 1.61 };
    const posR = { x: -3.70, z: -1.2, y: 1.61 };
    ctrlWalk.tryStartJump({ x: 1, z: 0 }, posW, MOVEMENT_CONFIG.walkSpeed, 0.55);
    ctrlRun.tryStartJump({ x: 1, z: 0 }, posR, MOVEMENT_CONFIG.runSpeed, 0.90);
    const vw = Math.hypot(ctrlWalk.getState().jumpHVel.x, ctrlWalk.getState().jumpHVel.z);
    const vr = Math.hypot(ctrlRun.getState().jumpHVel.x, ctrlRun.getState().jumpHVel.z);
    assert.ok(vr > vw, `run vel ${vr} > walk vel ${vw}`);
  });
});

describe("jump — air control capped", () => {
  it("air control cannot instantly reverse direction", () => {
    const pg = makeMockPlayground();
    const ctrl = createTraversalController(pg, MOVEMENT_CONFIG);
    const pos = { x: -3.70, z: -1.2, y: 1.61 };
    ctrl.tryStartJump({ x: 1, z: 0 }, { ...pos }, MOVEMENT_CONFIG.runSpeed, 0.90);
    const before = { ...ctrl.getState().jumpHVel };
    // try to steer hard opposite in one frame
    const intent = { moveX: -1, moveY: 0, moveMagnitude: 0.90 };
    const worldDirReverse = { x: -1, z: 0 };
    const p = { ...pos, x: -3.2, z: -1.2, y: 2.0 };
    ctrl.updateJump(0.016, intent, worldDirReverse, p);
    const after = ctrl.getState().jumpHVel;
    // Should not have reversed sign in one frame; x should remain positive or slightly reduced but not negative large
    assert.ok(after.x > 0, `should not reverse in one frame, x=${after.x} vs before ${before.x}`);
    // max step = accel*airFactor*dt ≈ 28*0.28*0.016 ≈0.125
    const delta = Math.hypot(after.x - before.x, after.z - before.z);
    assert.ok(delta <= 0.30, `air step capped to small value, delta=${delta}`);
  });
});

describe("climb — entry & mantle", () => {
  it("bottom entry recognized when moving into wall", () => {
    const pg = makeMockPlayground();
    const climb = pg.climbables[0];
    const worldDir = { x: 0, z: -1 }; // north into wall
    const pos = { x: 2.2, z: -4.6, y: 0.36 };
    assert.equal(checkClimbBottomEntry(worldDir, pos, 0.6, climb, MOVEMENT_CONFIG), true);
  });
  it("bottom entry rejected when far", () => {
    const pg = makeMockPlayground();
    const climb = pg.climbables[0];
    const worldDir = { x: 0, z: -1 };
    const pos = { x: 0, z: 0, y: 0.36 };
    assert.equal(checkClimbBottomEntry(worldDir, pos, 0.6, climb, MOVEMENT_CONFIG), false);
  });
  it("top entry recognized inside topEntryRegion moving south", () => {
    const pg = makeMockPlayground();
    const climb = pg.climbables[0];
    const worldDirSouth = { x: 0, z: 1 }; // south toward ladder edge
    const posOnTop = { x: 2.2, z: -5.6, y: 2.76 };
    assert.equal(checkClimbTopEntry(worldDirSouth, posOnTop, 0.6, posOnTop.y, climb, MOVEMENT_CONFIG), true);
  });
  it("top entry rejected outside region", () => {
    const pg = makeMockPlayground();
    const climb = pg.climbables[0];
    const worldDirSouth = { x: 0, z: 1 };
    const posFar = { x: 0, z: -5.6, y: 2.76 };
    assert.equal(checkClimbTopEntry(worldDirSouth, posFar, 0.6, posFar.y, climb, MOVEMENT_CONFIG), false);
  });
  it("downward input descends instead of instant detach", () => {
    const pg = makeMockPlayground();
    const ctrl = createTraversalController(pg, MOVEMENT_CONFIG);
    // Start climb from bottom
    const worldDirUp = { x: 0, z: -1 };
    const pos = { x: 2.2, z: -4.6, y: 0.36 };
    const climb = ctrl.tryStartClimbBottom(worldDirUp, pos, 0.6);
    assert.ok(climb);
    // Simulate climbing up a bit
    const upIntent = { moveX: 0, moveY: -1, moveMagnitude: 0.8 };
    const p = { x: 2.2 - 0 * 0.35, z: -5.05 + 0.35, y: 1.5 };
    ctrl.updateClimb(0.1, upIntent, worldDirUp, p);
    const yUp = p.y;
    assert.ok(yUp > 1.5, "should move up");
    // Now downward intent
    const downDir = { x: 0, z: 1 };
    const downIntent = { moveX: 0, moveY: 1, moveMagnitude: 0.7 };
    const beforeY = p.y;
    const res = ctrl.updateClimb(0.12, downIntent, downDir, p);
    assert.ok(res.stillClimbing, "should still be climbing when moving down");
    assert.ok(p.y < beforeY, `should descend: before ${beforeY} after ${p.y}`);
  });
  it("mantle endpoint is small ledge offset, not platform center teleport", () => {
    const pg = makeMockPlayground();
    const climb = pg.climbables[0];
    const currentPos = { x: 2.2, z: -5.05 + 0.35, y: 2.76 };
    const endpoints = computeMantleEndpoints(climb, currentPos, MOVEMENT_CONFIG);
    const centerDist = Math.hypot(endpoints.end.x - climb.topPlatform.x, endpoints.end.z - climb.topPlatform.z);
    // Should be near edge, not at exact center (but platform center is 2.2,-7.2). Our end is ~2.2,-6.4, distance to center ~0.8, not zero but not deep teleport to center (6.4 vs 7.2 diff 0.8)
    const distToWall = Math.abs(endpoints.end.z - climb.z);
    assert.ok(distToWall < 1.5 && distToWall > 0.3, `mantle end should be near lip, distToWall=${distToWall}`);
    // Ensure mantle duration in spec range
    assert.ok(MOVEMENT_CONFIG.mantleDuration >= 0.20 && MOVEMENT_CONFIG.mantleDuration <= 0.35);
    // End should not be platform center exactly (2.2,-7.2)
    assert.ok(!(Math.abs(endpoints.end.x - climb.topPlatform.x) < 0.05 && Math.abs(endpoints.end.z - climb.topPlatform.z) < 0.05), "should not teleport to platform center");
  });
});
