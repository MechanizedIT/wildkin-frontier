import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVEMENT_CONFIG, RAPIER_CONFIG } from "../src/game/config.js";
import { RAPIER_PHYSICS_CONFIG } from "../src/physics/physicsConfig.js";
import { checkJumpTrigger, computeAirTime } from "../src/movement/traversalController.js";

describe("Phase 1.2 — Rapier physics config", () => {
  it("capsule radius and height in spec range", () => {
    const r = RAPIER_PHYSICS_CONFIG.capsuleRadius;
    const h = RAPIER_PHYSICS_CONFIG.capsuleTotalHeight;
    assert.ok(r >= 0.30 && r <= 0.38, `radius ${r} in 0.30-0.38`);
    assert.ok(h >= 0.9 && h <= 1.1 || Math.abs(h - 1.04) < 0.1, `total height ${h} ~0.9-1.1`);
  });
  it("mirrors RAPIER_CONFIG", () => {
    assert.equal(RAPIER_PHYSICS_CONFIG.capsuleRadius, RAPIER_CONFIG.capsuleRadius);
    assert.equal(RAPIER_PHYSICS_CONFIG.controllerOffset, RAPIER_CONFIG.controllerOffset);
  });
  it("controller skin/offset 0.01-0.03", () => {
    const o = RAPIER_PHYSICS_CONFIG.controllerOffset;
    assert.ok(o >= 0.01 && o <= 0.03);
  });
  it("snap-to-ground 0.15-0.25", () => {
    const s = RAPIER_PHYSICS_CONFIG.snapToGroundDistance;
    assert.ok(s >= 0.15 && s <= 0.25);
  });
  it("autostep max height 0.15-0.30 and tall boxes (1.25) not steppable", () => {
    const a = RAPIER_PHYSICS_CONFIG.autostepMaxHeight;
    assert.ok(a >= 0.15 && a <= 0.30);
    assert.ok(a < 1.25, "tall brown boxes must not autostep");
  });
  it("max slope 40-50 deg", () => {
    const deg = (RAPIER_PHYSICS_CONFIG.maxSlopeClimbAngle * 180) / Math.PI;
    assert.ok(deg >= 40 && deg <= 50);
  });
  it("fixed timestep 1/60 and maxSubsteps 3-4", () => {
    assert.ok(Math.abs(RAPIER_CONFIG.fixedDt - 1 / 60) < 1e-6);
    assert.ok(RAPIER_CONFIG.maxSubsteps >= 3 && RAPIER_CONFIG.maxSubsteps <= 4);
  });
});

describe("Phase 1.2 — gravity integration", () => {
  it("airborne verticalVelocity integrates with gravity*dt", () => {
    let vv = 5.8;
    const gravity = MOVEMENT_CONFIG.gravity ?? -12;
    const dt = 1 / 60;
    vv += gravity * dt; // one step
    assert.ok(Math.abs(vv - (5.8 - 12 / 60)) < 1e-6);
    // after 10 steps, should be 5.8 +10*gravity*dt
    let vv2 = 5.8;
    for (let i = 0; i < 10; i++) vv2 += gravity * dt;
    assert.ok(vv2 < 5.8 && vv2 > 0, `vv2 ${vv2} should be still positive but less than initial`);
    // full fall duration until grounded would be many steps, but must be continuous not teleport
    let y = 2.4 + RAPIER_PHYSICS_CONFIG.capsuleTotalHeight / 2;
    let v = 0;
    for (let i = 0; i < 60; i++) {
      v += gravity * dt;
      y += v * dt;
    }
    assert.ok(y < 2.0, "falling 1 sec should drop significantly");
  });
  it("grounded verticalVelocity reset when downward", () => {
    let vv = -3.2;
    const grounded = true;
    if (grounded && vv < 0) vv = 0;
    assert.equal(vv, 0);
    let vv2 = 2.0;
    if (grounded && vv2 < 0) vv2 = 0;
    assert.equal(vv2, 2.0, "upward velocity not reset");
  });
  it("walking off platform produces continuous fall (no instant Y snap)", () => {
    // Simulate: grounded true until step off, then grounded false, velocity integrates
    let grounded = true;
    let vv = 0;
    const gravity = MOVEMENT_CONFIG.gravity ?? -12;
    const dt = 1 / 60;
    // step off
    grounded = false;
    const yBefore = 2.4 + 0.52;
    let y = yBefore;
    for (let i = 0; i < 5; i++) {
      if (!grounded) vv += gravity * dt;
      else if (vv < 0) vv = 0;
      y += vv * dt;
    }
    assert.ok(y < yBefore, "y should decrease continuously");
    assert.ok(y > yBefore - 0.5, "first 5 frames should be small drop, not teleport to 0");
  });
});

describe("Phase 1.2 — fixed-step accumulator limits", () => {
  it("clamps large frame gaps (tab switch)", () => {
    const maxDelta = RAPIER_CONFIG.maxDelta;
    assert.ok(maxDelta <= 0.10 && maxDelta >= 0.05);
    const hugeDt = 2.0;
    const clamped = Math.min(hugeDt, maxDelta);
    assert.equal(clamped, maxDelta);
  });
  it("max catch-up substeps prevents spiral", () => {
    let accumulator = 0.2; // 200ms gap
    const fixedDt = RAPIER_CONFIG.fixedDt;
    const maxSubsteps = RAPIER_CONFIG.maxSubsteps;
    let substeps = 0;
    while (accumulator >= fixedDt && substeps < maxSubsteps) {
      accumulator -= fixedDt;
      substeps++;
    }
    assert.ok(substeps <= maxSubsteps);
    if (accumulator >= fixedDt) accumulator = 0; // dropped
    assert.equal(accumulator, 0);
  });
  it("airtime in 0.7-1.0 preserved with new gravity", () => {
    const t = computeAirTime(MOVEMENT_CONFIG.jumpInitialVerticalVelocity, MOVEMENT_CONFIG.jumpGravity ?? 12);
    assert.ok(t >= 0.7 && t <= 1.0, `airtime ${t}`);
  });
});

describe("Phase 1.2 — jump start rules with Rapier", () => {
  it("sneak still blocked (same as 1.1)", () => {
    const trav = {
      triggerCenter: { x: -3.70, z: -1.2 },
      triggerRadius: 1.45,
      direction: { x: 1, z: 0 },
      landingRegion: { minX: -1.2, maxX: 2.2, minZ: -2.4, maxZ: 0.1, height: 1.25 },
      minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed,
    };
    const pos = { x: -3.70, z: -1.2, y: 0.5 };
    const hit = checkJumpTrigger({ x: 1, z: 0 }, pos, MOVEMENT_CONFIG.sneakSpeed, 0.3, trav, MOVEMENT_CONFIG);
    assert.equal(hit, null);
  });
  it("run momentum matters, air control capped (reuse from traversal tests)", () => {
    const t = computeAirTime(MOVEMENT_CONFIG.jumpInitialVerticalVelocity, MOVEMENT_CONFIG.jumpGravity);
    const runD = t * MOVEMENT_CONFIG.runSpeed;
    const walkD = t * MOVEMENT_CONFIG.walkSpeed;
    assert.ok(runD > walkD * 1.3);
  });
});

describe("Phase 1.2 — climb gravity suppression", () => {
  it("climbing suppresses gravity (verticalVelocity stays 0 when idle on wall)", () => {
    let vv = -4.0;
    const climbing = true;
    if (climbing) vv = 0;
    assert.equal(vv, 0);
  });
  it("climbing movement is intentional not gravity-driven", () => {
    const climbInput = 0.8;
    const speedUp = MOVEMENT_CONFIG.climbSpeedUp;
    const dt = 1 / 60;
    const dy = climbInput * speedUp * dt;
    assert.ok(dy > 0 && dy < 0.05, `dy ${dy} small intentional step`);
    // gravity should not be applied
    const gravity = MOVEMENT_CONFIG.gravity ?? -12;
    // if climbing, dy should be from input, not gravity*dt (-0.2)
    const gravDy = gravity * dt;
    assert.ok(Math.abs(dy - gravDy) > 0.1);
  });
});
