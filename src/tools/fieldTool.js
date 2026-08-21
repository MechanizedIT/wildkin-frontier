// src/tools/fieldTool.js — visible Field Tool omnitool + broad horizontal sweep + player-space trail + speed-gated harvesting (Phase 2.2)
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";

export const SWING_CONFIG = {
  yawWindup: -1.28,
  yawFollow: 1.28,
  totalYawSweep: 2.56,
  pitchWindup: -0.38,
  pitchStrike: 0.22,
  rollWindup: -0.14,
  rollStrike: 0.18,
};

export function createFieldTool(playerGroup, gameAudio = null) {
  const toolGroup = new THREE.Group();
  toolGroup.name = "fieldTool";

  // Procedural omnitool — hero-sized ~1.85x Phase 2.1 for readability from high camera
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

  // Swing trail — player-space (not child of toolGroup) so it preserves history
  const trailGroup = new THREE.Group();
  trailGroup.visible = false;
  trailGroup.name = "fieldToolTrail";
  // Create 4 afterimage meshes (head ghosts) — positioned in player space
  const afterimages = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(0.38, 0.26, 0.12);
    const m = new THREE.MeshBasicMaterial({ color: 0xaad8ff, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    trailGroup.add(mesh);
    afterimages.push(mesh);
  }
  // Player-space horizontal slash arc — sector showing yaw sweep
  const arcGeo = new THREE.RingGeometry(0.18, 0.72, 20, 1, -1.35, 2.70);
  arcGeo.rotateX(-Math.PI / 2);
  // ring geometry is horizontal around player; offset to pivot height
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x8ecaff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, -0.18, 0);
  // Align arc center to pivot yaw origin
  arcMesh.rotation.y = 0;
  trailGroup.add(arcMesh);

  // Pivot near hand — holds toolGroup only
  const pivot = new THREE.Group();
  pivot.name = "fieldToolPivot";
  pivot.add(toolGroup);
  pivot.position.set(0.32, 0.40, 0.16);
  // Slight tilt so blade extends outward and sideways sweep is visible
  toolGroup.rotation.set(0.18, 0, 0);
  toolGroup.position.set(0, 0.05, 0.06);
  playerGroup.add(pivot);
  // Trail is sibling to pivot in player space, not inheriting pivot rotation
  playerGroup.add(trailGroup);
  // Sync trailGroup origin to pivot position (so arc centered at hand)
  trailGroup.position.copy(pivot.position);

  // History buffer for true afterimages (player-local head positions)
  const history = [];
  const maxHistory = 5;
  // Swing state
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
    // Compute head world position, then convert to player-local for afterimages
    const headWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    const playerWorld = new THREE.Vector3();
    playerGroup.getWorldPosition(playerWorld);
    const local = headWorld.clone().sub(playerWorld);
    // Also store rotation for ghost orientation
    const headQuat = new THREE.Quaternion();
    head.getWorldQuaternion(headQuat);
    const euler = new THREE.Euler().setFromQuaternion(headQuat);
    history.push({ pos: local.clone(), rot: euler.clone(), t: performance.now() });
    if (history.length > maxHistory) history.shift();
  }

  function showTrail(progress) {
    // Arc visible during strike phase
    if (progress > 0.20 && progress < 0.68) {
      const t = (progress - 0.20) / 0.48;
      // peak opacity 0.42
      arcMat.opacity = Math.sin(t * Math.PI) * 0.42;
      // Slight scale pulse
      const s = 0.92 + t * 0.18;
      arcMesh.scale.set(s, s, 1);
      arcMesh.visible = true;
    } else {
      arcMat.opacity *= 0.86;
      if (arcMat.opacity < 0.02) arcMesh.visible = false;
      if (progress >= 0.70) {
        // keep fading but keep group visible briefly for ghosts
      }
    }
    // Afterimages: show last N true historical head positions, fading with age
    // We update afterimages every frame from history buffer
    for (let i = 0; i < afterimages.length; i++) {
      const hIdx = history.length - 1 - i;
      if (hIdx >= 0 && progress > 0.18 && progress < 0.72) {
        const h = history[hIdx];
        const ageFactor = i / afterimages.length; // 0 newest, 1 oldest
        afterimages[i].visible = true;
        afterimages[i].position.copy(h.pos).sub(trailGroup.position); // because trailGroup at pivot pos, but trailGroup itself is at pivot; history pos is from player origin, need offset
        // Alternative: if trailGroup at pivot, subtract pivot position
        // Actually history pos is player-local, trailGroup is at pivot; so convert: local - pivot.position
        afterimages[i].rotation.set(h.rot.x, h.rot.y, h.rot.z);
        afterimages[i].material.opacity = (0.48 - ageFactor * 0.34) * (1 - (progress - 0.20)/0.52 * 0.3);
        afterimages[i].material.opacity = Math.max(0, Math.min(0.52, afterimages[i].material.opacity));
        afterimages[i].scale.set(1 - ageFactor*0.08, 1 - ageFactor*0.08, 1 - ageFactor*0.08);
      } else {
        afterimages[i].material.opacity *= 0.82;
        if (afterimages[i].material.opacity < 0.02) afterimages[i].visible = false;
      }
    }
    if (progress >= 0.72) {
      // fade remaining ghosts
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
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, -0.18, dt * 6);
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, 0, dt * 6);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, 0.05, dt * 6);
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
          pivot.rotation.z = Math.sin(idlePulse) * 0.04;
        }
      } else {
        cooldown = 0;
        idlePulse += dt * 1.2;
        pivot.rotation.x = -0.18 + Math.sin(idlePulse) * 0.04;
        pivot.rotation.y = 0 + Math.cos(idlePulse * 0.7) * 0.03;
        pivot.rotation.z = 0.05 + Math.cos(idlePulse * 0.7) * 0.02;
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
        arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
      }
      return;
    }

    const duration = HARVEST_CONFIG.swingInterval;
    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    // Phase 2.2: Dominant yaw sweep, pitch/roll secondary
    let pitch, yaw, roll;
    if (swingProgress < 0.20) {
      const t = swingProgress / 0.20;
      // windup back and left
      pitch = THREE.MathUtils.lerp(-0.18, SWING_CONFIG.pitchWindup, t);
      yaw = THREE.MathUtils.lerp(0, SWING_CONFIG.yawWindup, t);
      roll = THREE.MathUtils.lerp(0.05, SWING_CONFIG.rollWindup, t);
    } else if (swingProgress < 0.60) {
      const t = (swingProgress - 0.20) / 0.40;
      const eased = 1 - Math.pow(1 - t, 3);
      pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchWindup, SWING_CONFIG.pitchStrike, eased);
      yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawWindup, SWING_CONFIG.yawFollow, eased);
      roll = THREE.MathUtils.lerp(SWING_CONFIG.rollWindup, SWING_CONFIG.rollStrike, Math.sin(t * Math.PI * 0.85));
    } else {
      const t = (swingProgress - 0.60) / 0.40;
      const eased = t * (2 - t);
      pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchStrike, -0.18, eased);
      yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawFollow, 0, eased);
      roll = THREE.MathUtils.lerp(SWING_CONFIG.rollStrike, 0.05, eased);
    }
    pivot.rotation.x = pitch;
    pivot.rotation.y = yaw;
    pivot.rotation.z = roll;

    const glowPeak = Math.exp(-Math.pow((swingProgress - HARVEST_CONFIG.impactNormalizedTime) * 10, 2));
    glow.material.opacity = glowPeak * 0.92;

    // Record history before showing trail so ghosts lag behind
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
    playerGroup.remove(pivot);
    playerGroup.remove(trailGroup);
  }

  return { pivot, toolGroup, glow, trailGroup, arcMesh, afterimages, update, resetSwing, get isSwinging() { return isSwinging; }, SWING_CONFIG };
}
