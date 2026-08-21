// src/tools/fieldTool.js — visible Field Tool omnitool + broad horizontal sweep + player-space trail + speed-gated harvesting (Phase 2.2 final refinement)
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";

export const SWING_CONFIG = {
  yawWindup: 1.25, // front-right (4 o'clock) start
  yawFollow: -1.25, // front-left (8 o'clock) finish
  totalYawSweep: 2.50,
  pitchWindup: -0.28,
  pitchStrike: 0.18,
  rollWindup: -0.10,
  rollStrike: 0.12,
  swingRadius: 0.68, // radial offset from hand pivot to tool head
};

export function createFieldTool(playerGroup, gameAudio = null) {
  // --- Right-hand procedural attachment (minimal, readable, no rig) ---
  // Player local +X = right, +Z = forward. Hand at right side chest/waist height.
  const handAnchor = new THREE.Group();
  handAnchor.name = "rightHandAnchor";
  handAnchor.position.set(0.26, 0.38, 0.08);
  playerGroup.add(handAnchor);

  // Simple arm: shoulder → hand cylinder
  const shoulderPos = new THREE.Vector3(0.18, 0.58, 0.02);
  const handPos = new THREE.Vector3(0, 0, 0); // handAnchor origin
  const armVec = new THREE.Vector3().subVectors(handPos, shoulderPos);
  const armLen = armVec.length();
  const armGeo = new THREE.CylinderGeometry(0.042, 0.032, armLen, 6);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true });
  const armMesh = new THREE.Mesh(armGeo, armMat);
  // position at midpoint
  armMesh.position.copy(shoulderPos).add(handPos).multiplyScalar(0.5).sub(handAnchor.position);
  // orient toward hand
  armMesh.lookAt(handPos);
  armMesh.rotateX(Math.PI / 2);
  handAnchor.add(armMesh);

  // Hand sphere
  const handGeo = new THREE.SphereGeometry(0.055, 6, 6);
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd8c4a0, flatShading: true });
  const handMesh = new THREE.Mesh(handGeo, handMat);
  handMesh.position.set(0, 0, 0);
  handAnchor.add(handMesh);

  // Grip ring where tool is held
  const gripGeo = new THREE.TorusGeometry(0.038, 0.009, 6, 10);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, -0.02, 0.02);
  grip.rotation.x = Math.PI / 2;
  handAnchor.add(grip);

  // --- Tool hierarchy: handAnchor -> swingPivot -> toolMount (radial offset) -> toolGroup ---
  const swingPivot = new THREE.Group();
  swingPivot.name = "fieldToolSwingPivot";
  handAnchor.add(swingPivot);

  const toolMount = new THREE.Group();
  toolMount.name = "toolMount";
  // Offset outward from pivot so head travels large arc. Mostly forward (+Z) with small right (+X) so sweep stays in front.
  // vx ~0.12 right, vz ~0.64 forward gives both start/end Z positive (front) with right→left sweep.
  toolMount.position.set(0.12, -0.06, 0.64);
  swingPivot.add(toolMount);

  const toolGroup = new THREE.Group();
  toolGroup.name = "fieldTool";

  // Procedural omnitool — hero-sized, slight adjustment for new mount (existing size is good)
  const handleGeo = new THREE.CylinderGeometry(0.075, 0.090, 0.78, 7);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, flatShading: true });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.08;
  toolGroup.add(handle);

  const headGeo = new THREE.BoxGeometry(0.40, 0.28, 0.20);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.26 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.34, 0.03);
  head.rotation.z = 0.16;
  toolGroup.add(head);

  const wedgeGeo = new THREE.CylinderGeometry(0.085, 0.165, 0.30, 5);
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xc9d6ff, flatShading: true, emissive: 0x334466, emissiveIntensity: 0.20 });
  const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
  wedge.position.set(0, 0.58, 0.03);
  wedge.rotation.z = Math.PI / 2;
  toolGroup.add(wedge);

  const glowGeo = new THREE.SphereGeometry(0.10, 7, 7);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0.34, 0.03);
  toolGroup.add(glow);

  // Tool extends outward from mount; orient so blade points roughly outward/forward, not vertical
  toolGroup.position.set(0, 0.04, 0.08);
  toolGroup.rotation.set(0.22, 0, 0.08);
  toolMount.add(toolGroup);

  // Swing trail — player-space (not child of swingPivot) so it preserves history
  const trailGroup = new THREE.Group();
  trailGroup.visible = false;
  trailGroup.name = "fieldToolTrail";
  const afterimages = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(0.38, 0.26, 0.12);
    const m = new THREE.MeshBasicMaterial({ color: 0xaad8ff, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    trailGroup.add(mesh);
    afterimages.push(mesh);
  }
  // Player-space horizontal slash arc — sector showing yaw sweep, centered at hand
  const arcGeo = new THREE.RingGeometry(0.22, 0.88, 26, 1, -1.35, 2.70);
  arcGeo.rotateX(-Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x8ecaff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, -0.20, 0.02);
  arcMesh.rotation.y = 0;
  trailGroup.add(arcMesh);

  // Trail is sibling to handAnchor in player space, not inheriting swing rotation, centered at hand
  playerGroup.add(trailGroup);
  trailGroup.position.copy(handAnchor.position);

  const history = [];
  const maxHistory = 5;
  let swingProgress = 0;
  let isSwinging = false;
  let impactFired = false;
  let whooshFired = false;
  let cooldown = 0;
  let idlePulse = 0;

  function resetSwing() {
    isSwinging = false;
    swingProgress = 0;
    impactFired = false;
    whooshFired = false;
    trailGroup.visible = false;
    afterimages.forEach(m => { m.visible = false; m.material.opacity = 0; });
    arcMat.opacity = 0;
    history.length = 0;
  }

  function startSwing() {
    isSwinging = true;
    swingProgress = 0;
    impactFired = false;
    whooshFired = false;
    glow.material.opacity = 0.65;
    trailGroup.visible = true;
    history.length = 0;
    arcMat.opacity = 0;
  }

  function recordHistory() {
    const headWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    const playerWorld = new THREE.Vector3();
    playerGroup.getWorldPosition(playerWorld);
    const local = headWorld.clone().sub(playerWorld);
    const headQuat = new THREE.Quaternion();
    head.getWorldQuaternion(headQuat);
    const euler = new THREE.Euler().setFromQuaternion(headQuat);
    history.push({ pos: local.clone(), rot: euler.clone(), t: performance.now() });
    if (history.length > maxHistory) history.shift();
  }

  function showTrail(progress) {
    if (progress > 0.18 && progress < 0.70) {
      const t = (progress - 0.18) / 0.52;
      arcMat.opacity = Math.sin(t * Math.PI) * 0.48;
      const s = 0.95 + t * 0.22;
      arcMesh.scale.set(s, s, 1);
      arcMesh.visible = true;
    } else {
      arcMat.opacity *= 0.84;
      if (arcMat.opacity < 0.02) arcMesh.visible = false;
    }
    for (let i = 0; i < afterimages.length; i++) {
      const hIdx = history.length - 1 - i;
      if (hIdx >= 0 && progress > 0.16 && progress < 0.74) {
        const h = history[hIdx];
        const ageFactor = i / afterimages.length;
        afterimages[i].visible = true;
        afterimages[i].position.copy(h.pos).sub(trailGroup.position);
        afterimages[i].rotation.set(h.rot.x, h.rot.y, h.rot.z);
        afterimages[i].material.opacity = (0.52 - ageFactor * 0.32) * (1 - (progress - 0.18)/0.56 * 0.28);
        afterimages[i].material.opacity = Math.max(0, Math.min(0.55, afterimages[i].material.opacity));
        afterimages[i].scale.set(1 - ageFactor*0.07, 1 - ageFactor*0.07, 1 - ageFactor*0.07);
      } else {
        afterimages[i].material.opacity *= 0.80;
        if (afterimages[i].material.opacity < 0.02) afterimages[i].visible = false;
      }
    }
    if (progress >= 0.74) {
      let anyVisible = false;
      for (const m of afterimages) if (m.visible && m.material.opacity > 0.02) anyVisible = true;
      if (!anyVisible && arcMat.opacity < 0.02) trailGroup.visible = false;
    }
  }

  function update(dt, playerPos, playerState, getTargets, onImpact, autoHarvestEnabled = true) {
    const speed = playerState.speed ?? 0;
    const maxSpeed = HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25;
    const speedOk = speed <= maxSpeed + 1e-6;

    if (!isHarvestCompatibleMode(playerState.mode) || !speedOk || !autoHarvestEnabled) {
      if (isSwinging) resetSwing();
      cooldown = 0;
      swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14, dt * 6);
      swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, 0, dt * 6);
      swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04, dt * 6);
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 2);
      arcMat.opacity = Math.max(0, arcMat.opacity - dt * 3);
      return;
    }

    const wrappedGet = (pos, mode) => {
      try {
        const res = getTargets(pos, mode, speed, autoHarvestEnabled);
        if (Array.isArray(res)) return res;
      } catch (_) {}
      return getTargets(pos, mode);
    };

    const targets = wrappedGet(playerPos, playerState.mode);
    const hasTargets = targets.length > 0;

    if (!isSwinging) {
      if (hasTargets) {
        if (cooldown <= 0) {
          startSwing();
        } else {
          cooldown -= dt;
          idlePulse += dt * 4;
          swingPivot.rotation.z = Math.sin(idlePulse) * 0.03;
        }
      } else {
        cooldown = 0;
        idlePulse += dt * 1.2;
        swingPivot.rotation.x = -0.14 + Math.sin(idlePulse) * 0.03;
        swingPivot.rotation.y = 0 + Math.cos(idlePulse * 0.7) * 0.02;
        swingPivot.rotation.z = 0.04 + Math.cos(idlePulse * 0.7) * 0.015;
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
        arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
      }
      return;
    }

    const duration = HARVEST_CONFIG.swingInterval;
    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    // Exaggerated horizontal sweep: dominant yaw around hand pivot, pitch/roll secondary
    // Right-front (4 o'clock) at +1.25 rad → sweep across front to left-front (8 o'clock) at -1.25
    // Use faster ease through middle for visual speed, longer follow-through.
    let pitch, yaw, roll;
    if (swingProgress < 0.18) {
      const t = swingProgress / 0.18;
      pitch = THREE.MathUtils.lerp(-0.14, SWING_CONFIG.pitchWindup, t);
      yaw = THREE.MathUtils.lerp(0, SWING_CONFIG.yawWindup, t);
      roll = THREE.MathUtils.lerp(0.04, SWING_CONFIG.rollWindup, t);
    } else if (swingProgress < 0.58) {
      const t = (swingProgress - 0.18) / 0.40;
      // easeOut cubic but with slight early acceleration for dramatic mid-speed
      const eased = 1 - Math.pow(1 - t, 2.8);
      pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchWindup, SWING_CONFIG.pitchStrike, eased);
      yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawWindup, SWING_CONFIG.yawFollow, eased);
      roll = THREE.MathUtils.lerp(SWING_CONFIG.rollWindup, SWING_CONFIG.rollStrike, Math.sin(t * Math.PI * 0.85));
    } else {
      const t = (swingProgress - 0.58) / 0.42;
      const eased = t * (2 - t);
      pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchStrike, -0.14, eased);
      yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawFollow, 0, eased);
      roll = THREE.MathUtils.lerp(SWING_CONFIG.rollStrike, 0.04, eased);
    }
    swingPivot.rotation.x = pitch;
    swingPivot.rotation.y = yaw;
    swingPivot.rotation.z = roll;

    const glowPeak = Math.exp(-Math.pow((swingProgress - HARVEST_CONFIG.impactNormalizedTime) * 10, 2));
    glow.material.opacity = glowPeak * 0.92;

    recordHistory();
    showTrail(swingProgress);

    if (!whooshFired && swingProgress >= HARVEST_CONFIG.impactNormalizedTime - 0.19) {
      whooshFired = true;
      if (gameAudio && gameAudio.playWhoosh) gameAudio.playWhoosh();
    }

    if (!impactFired && swingProgress >= HARVEST_CONFIG.impactNormalizedTime) {
      if (!speedOk || !isHarvestCompatibleMode(playerState.mode) || !autoHarvestEnabled) {
        resetSwing();
        return;
      }
      impactFired = true;
      const impactTargets = wrappedGet(playerPos, playerState.mode);
      if (impactTargets.length > 0 && onImpact) {
        onImpact(impactTargets);
      }
    }

    if (swingProgress >= 1) {
      resetSwing();
      cooldown = 0;
    }
  }

  function dispose() {
    handAnchor.remove(swingPivot);
    playerGroup.remove(handAnchor);
    playerGroup.remove(trailGroup);
  }

  return { handAnchor, swingPivot, pivot: swingPivot, toolMount, toolGroup, head, glow, trailGroup, arcMesh, afterimages, update, resetSwing, get isSwinging() { return isSwinging; }, SWING_CONFIG };
}
