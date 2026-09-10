// src/player/playerVisuals.js — isolated visual feedback (bob/lean/crouch/traversal pose)
// Separated from playerController to keep it from becoming a god object.

import * as THREE from "three";

export function createPlayerVisuals(playerMesh) {
  let timeAcc = 0;
  let bobPhase = 0;
  const leftLeg = playerMesh.getObjectByName("leftLeg");
  const rightLeg = playerMesh.getObjectByName("rightLeg");
  const leftArm = playerMesh.getObjectByName("leftArm");

  function sync(dt, state) {
    timeAcc += dt;
    const mode = state.mode;
    let bobFreq = 0;
    let bobAmp = 0;
    let lean = 0;
    let heightScale = 1;

    switch (mode) {
      case "IDLE":
        bobFreq = 1.1;
        bobAmp = 0.04;
        break;
      case "SNEAK":
        bobFreq = 2.2;
        bobAmp = 0.02;
        heightScale = 0.86;
        break;
      case "WALK":
        bobFreq = 5.6;
        bobAmp = 0.055;
        break;
      case "RUN":
        bobFreq = 8.5;
        bobAmp = 0.09;
        lean = 0.18;
        break;
      case "DODGE":
        bobFreq = 12;
        bobAmp = 0.06;
        lean = 0.32;
        heightScale = 0.92;
        break;
      case "JUMP":
        bobFreq = 0;
        bobAmp = 0;
        lean = 0.12;
        break;
      case "FALL":
        bobFreq = 0;
        bobAmp = 0;
        lean = 0.08;
        break;
      case "CLIMB":
        bobFreq = 4.0;
        bobAmp = 0.015;
        lean = -0.25;
        heightScale = 0.98;
        break;
      case "MANTLE":
        bobFreq = 3.5;
        bobAmp = 0.02;
        lean = -0.18;
        heightScale = 0.98;
        break;
      default:
        bobFreq = 1.1;
        bobAmp = 0.04;
        break;
    }

    bobPhase += dt * bobFreq;

    // Facing already applied by controller via mesh.rotation.y
    // Y bob (only when grounded/climb/mantle; jump y is authoritative)
    if (mode !== "JUMP") {
      // Apply bob as extra offset on top of pos.y already set
      // We add bob by modifying mesh.position.y after controller set it
      // For climb/mantle, bob is subtle
    }

    // Lean
    let targetLean = lean * Math.min(1, (state.speed ?? 0) / 4);
    if (mode === "RUN") targetLean = 0.18;
    if (mode === "DODGE") targetLean = 0.30;
    if (mode === "CLIMB") targetLean = -0.35;
    if (mode === "MANTLE") targetLean = -0.10;
    if (mode === "JUMP") targetLean = 0.12;
    if (mode === "FALL") targetLean = 0.08;
    const currentLean = playerMesh.rotation.x;
    const leanLerp = 1 - Math.exp(-10 * dt);
    playerMesh.rotation.x += (targetLean - currentLean) * leanLerp;

    // Height scale (crouch/squash)
    const targetScaleY = heightScale;
    const curScaleY = playerMesh.scale.y;
    playerMesh.scale.y += (targetScaleY - curScaleY) * (1 - Math.exp(-12 * dt));
    if (mode === "DODGE") {
      const squash = 1 + Math.sin(timeAcc * 22) * 0.06;
      playerMesh.scale.x = 1 + (squash - 1) * 0.5;
      playerMesh.scale.z = 1 + (squash - 1) * 0.5;
    } else {
      playerMesh.scale.x += (1 - playerMesh.scale.x) * 0.15;
      playerMesh.scale.z += (1 - playerMesh.scale.z) * 0.15;
    }

    // Bob is applied by nudging mesh.position.y after controller copy
    // Do it here via delta: caller should have set mesh.position; we add.
    if (mode !== "JUMP") {
      const bobOffset = Math.sin(bobPhase) * bobAmp * ((state.speed ?? 0) > 0.1 ? 1 : 0.4);
      // Only apply if not mantle vertical arc dominating
      if (mode !== "MANTLE") {
        playerMesh.position.y += bobOffset;
      }
    }

    // Limb motion is visual-only. Keep the Field Tool's right-hand chain untouched.
    const moving = mode === "WALK" || mode === "RUN" || mode === "SNEAK";
    const stride = moving ? Math.sin(bobPhase) * (mode === "RUN" ? 0.54 : mode === "WALK" ? 0.34 : 0.18) : 0;
    const limbBlend = 1 - Math.exp(-14 * dt);
    if (leftLeg) leftLeg.rotation.x += (stride - leftLeg.rotation.x) * limbBlend;
    if (rightLeg) rightLeg.rotation.x += (-stride - rightLeg.rotation.x) * limbBlend;
    if (leftArm) leftArm.rotation.x += (-stride * 0.72 - leftArm.rotation.x) * limbBlend;
  }

  // For JUMP mode, caller may want lean facing etc but y is authoritative, so no bob

  return { sync, _debug: () => ({ timeAcc, bobPhase }) };
}
