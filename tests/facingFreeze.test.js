import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Simulate the facing rule isolated: facing updates only when inputMag > 0.18
function simulateFacing(initialFacing, intents, turnSpeed, dt) {
  let facing = initialFacing;
  for (const intent of intents) {
    const inputMag = intent.moveMagnitude ?? Math.hypot(intent.moveX??0, intent.moveY??0);
    const worldDir = intent.worldDir; // {x,z,len}
    if (inputMag > 0.18 && worldDir && worldDir.len > 1e-6) {
      const desiredYaw = Math.atan2(worldDir.x, worldDir.z);
      let yawDiff = desiredYaw - facing;
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      const turnStep = turnSpeed * dt;
      const yawStep = Math.max(-turnStep, Math.min(turnStep, yawDiff));
      facing += yawStep;
    }
  }
  return facing;
}

describe("Facing freeze after input release", () => {
  it("A. Move then release, decelerate to IDLE: facing unchanged after release", () => {
    const turnSpeed = 14;
    const dt = 1/60;
    let facing = 0;
    // Move northeast (worldDir 45°)
    const moveDir = { x: Math.sin(0.78), z: Math.cos(0.78), len: 1 };
    for (let i=0;i<20;i++) {
      facing = simulateFacing(facing, [{ moveMagnitude: 0.85, worldDir: moveDir }], turnSpeed, dt);
    }
    const facingAtRelease = facing;
    // Release: intent mag 0, but speed would still decelerate — facing must not change
    for (let i=0;i<60;i++) {
      facing = simulateFacing(facing, [{ moveMagnitude: 0, worldDir: {x:0,z:0,len:0} }], turnSpeed, dt);
    }
    assert.ok(Math.abs(facing - facingAtRelease) < 1e-6, `facing drifted ${facing} vs ${facingAtRelease}`);
  });

  it("B. Release diagonal WASD does not rotate toward yaw 0", () => {
    const turnSpeed = 14;
    const dt = 1/60;
    let facing = Math.atan2(1,1); // 45° diagonal
    // Already facing diagonal, release
    for (let i=0;i<30;i++) {
      facing = simulateFacing(facing, [{ moveMagnitude: 0, worldDir: {x:0,z:0,len:0} }], turnSpeed, dt);
    }
    assert.ok(Math.abs(facing - Math.atan2(1,1)) < 1e-6, "should not snap to 0");
    assert.ok(Math.abs(facing) > 0.5, "still diagonal");
  });

  it("C. Tiny joystick vectors below threshold do not change facing", () => {
    const turnSpeed = 14;
    const dt = 1/60;
    let facing = 0.9;
    const tinyDir = { x: Math.sin(1.5), z: Math.cos(1.5), len: 0.5 };
    for (let i=0;i<20;i++) {
      facing = simulateFacing(facing, [{ moveMagnitude: 0.12, worldDir: tinyDir }], turnSpeed, dt);
    }
    assert.ok(Math.abs(facing - 0.9) < 1e-6, "tiny magnitude should not turn");
    // Slightly above threshold should turn
    let facing2 = 0.9;
    for (let i=0;i<5;i++) facing2 = simulateFacing(facing2, [{ moveMagnitude: 0.25, worldDir: tinyDir }], turnSpeed, dt);
    assert.ok(Math.abs(facing2 - 0.9) > 0.01, "above threshold should turn");
  });

  it("D. New meaningful input still turns normally", () => {
    const turnSpeed = 14;
    const dt = 1/60;
    let facing = 0;
    const newDir = { x: Math.sin(-1.2), z: Math.cos(-1.2), len: 1 };
    for (let i=0;i<10;i++) facing = simulateFacing(facing, [{ moveMagnitude: 0.80, worldDir: newDir }], turnSpeed, dt);
    assert.ok(Math.abs(facing - 0) > 0.3, "should have turned toward new dir");
  });

  it("E. Keyboard and touch use same rule (moveMagnitude based)", () => {
    const turnSpeed = 14;
    const dt = 1/60;
    // Keyboard intents produce moveMagnitude 0.55/0.9 etc, touch produces 0-1
    const kbIntent = { moveMagnitude: 0.55, worldDir: { x: 1, z: 0, len: 1 } };
    const touchIntent = { moveMagnitude: 0.55, worldDir: { x: 1, z: 0, len: 1 } };
    let f1 = 0, f2 = 0;
    for (let i=0;i<5;i++) { f1 = simulateFacing(f1, [kbIntent], turnSpeed, dt); f2 = simulateFacing(f2, [touchIntent], turnSpeed, dt); }
    assert.ok(Math.abs(f1 - f2) < 1e-9, "keyboard and touch same threshold");
  });
});
