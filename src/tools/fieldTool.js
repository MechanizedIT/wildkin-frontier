// src/tools/fieldTool.js — visible Field Tool omnitool + automatic swing cadence + multi-target impact
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";

export function createFieldTool(playerGroup) {
  const toolGroup = new THREE.Group();
  toolGroup.name = "fieldTool";

  // Procedural omnitool: short handle + chunky multifunction head + accent glow
  const handleGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.42, 6);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, flatShading: true });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.06;
  toolGroup.add(handle);

  const headGeo = new THREE.BoxGeometry(0.18, 0.14, 0.10);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.22 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.18, 0.02);
  head.rotation.z = 0.18;
  toolGroup.add(head);

  // Wedge bit
  const wedgeGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.14, 5);
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xc9d6ff, flatShading: true, emissive: 0x334466, emissiveIntensity: 0.18 });
  const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
  wedge.position.set(0, 0.30, 0.02);
  wedge.rotation.z = Math.PI / 2;
  toolGroup.add(wedge);

  // accent glow
  const glowGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0.18, 0.02);
  toolGroup.add(glow);

  // Pivot: tool is attached to player's right side, slightly forward
  const pivot = new THREE.Group();
  pivot.name = "fieldToolPivot";
  pivot.add(toolGroup);
  // position pivot at hand height relative to player center (player center at ~0.52)
  pivot.position.set(0.26, 0.34, 0.12);
  playerGroup.add(pivot);

  // Swing state
  let swingProgress = 0; // 0..1 within current swing
  let isSwinging = false;
  let impactFired = false;
  let cooldown = 0;
  let idlePulse = 0;

  function resetSwing() {
    isSwinging = false;
    swingProgress = 0;
    impactFired = false;
  }

  function startSwing() {
    isSwinging = true;
    swingProgress = 0;
    impactFired = false;
    glow.material.opacity = 0.55;
  }

  function update(dt, playerPos, playerState, getTargets, onImpact) {
    // Do not harvest during incompatible states
    if (!isHarvestCompatibleMode(playerState.mode)) {
      // abort swing, reset
      if (isSwinging) resetSwing();
      cooldown = 0;
      // idle pose
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, -0.18, dt * 6);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, 0.05, dt * 6);
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 2);
      return;
    }

    const targets = getTargets(playerPos, playerState.mode);
    const hasTargets = targets.length > 0;

    if (!isSwinging) {
      if (hasTargets) {
        if (cooldown <= 0) {
          startSwing();
        } else {
          cooldown -= dt;
          // subtle anticipatory wiggle while waiting
          idlePulse += dt * 4;
          pivot.rotation.z = Math.sin(idlePulse) * 0.04;
        }
      } else {
        cooldown = 0;
        // idle breathing
        idlePulse += dt * 1.2;
        pivot.rotation.x = -0.18 + Math.sin(idlePulse) * 0.04;
        pivot.rotation.z = 0.05 + Math.cos(idlePulse * 0.7) * 0.02;
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
      }
      // ensure tool visible even when idle
      return;
    }

    // Swinging
    const duration = HARVEST_CONFIG.swingInterval;
    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    // Arc: rotate around pivot X from -0.45 -> 0.95 -> -0.15 (overshoot then settle)
    // Use smooth curve: windup then strike
    let swingAngle;
    if (swingProgress < 0.18) {
      const t = swingProgress / 0.18;
      swingAngle = THREE.MathUtils.lerp(-0.18, -0.62, t);
    } else if (swingProgress < 0.58) {
      const t = (swingProgress - 0.18) / 0.40;
      // ease out
      const eased = 1 - Math.pow(1 - t, 3);
      swingAngle = THREE.MathUtils.lerp(-0.62, 0.82, eased);
    } else {
      const t = (swingProgress - 0.58) / 0.42;
      swingAngle = THREE.MathUtils.lerp(0.82, -0.18, t);
    }
    pivot.rotation.x = swingAngle;
    // small side wobble during strike
    if (swingProgress > 0.18 && swingProgress < 0.60) {
      pivot.rotation.z = 0.10 + Math.sin(swingProgress * Math.PI * 3) * 0.06;
    }
    // head glow peaks at impact
    const glowPeak = Math.exp(-Math.pow((swingProgress - HARVEST_CONFIG.impactNormalizedTime) * 10, 2));
    glow.material.opacity = glowPeak * 0.85;

    // Impact point
    if (!impactFired && swingProgress >= HARVEST_CONFIG.impactNormalizedTime) {
      impactFired = true;
      // Re-query at impact (eligibility may have shifted)
      const impactTargets = getTargets(playerPos, playerState.mode);
      if (impactTargets.length > 0 && onImpact) {
        onImpact(impactTargets);
      }
    }

    if (swingProgress >= 1) {
      resetSwing();
      cooldown = 0; // next swing after one cadence? Since duration == interval, no extra cooldown
      // If still has targets, startSwing will trigger next frame
    }
  }

  function dispose() {
    playerGroup.remove(pivot);
  }

  return { pivot, toolGroup, glow, update, resetSwing, get isSwinging() { return isSwinging; } };
}
