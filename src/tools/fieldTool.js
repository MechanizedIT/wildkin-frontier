// src/tools/fieldTool.js — visible Field Tool omnitool + broad sweeping arc + trail + speed-gated harvesting
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";

export function createFieldTool(playerGroup, gameAudio = null) {
  const toolGroup = new THREE.Group();
  toolGroup.name = "fieldTool";

  // Procedural omnitool: slightly larger for readability
  const handleGeo = new THREE.CylinderGeometry(0.042, 0.052, 0.48, 6);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, flatShading: true });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.06;
  toolGroup.add(handle);

  const headGeo = new THREE.BoxGeometry(0.22, 0.16, 0.12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.22 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.20, 0.02);
  head.rotation.z = 0.18;
  toolGroup.add(head);

  const wedgeGeo = new THREE.CylinderGeometry(0.05, 0.095, 0.17, 5);
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xc9d6ff, flatShading: true, emissive: 0x334466, emissiveIntensity: 0.18 });
  const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
  wedge.position.set(0, 0.34, 0.02);
  wedge.rotation.z = Math.PI / 2;
  toolGroup.add(wedge);

  const glowGeo = new THREE.SphereGeometry(0.06, 6, 6);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0.20, 0.02);
  toolGroup.add(glow);

  // Swing trail — low-cost fan/afterimages
  const trailGroup = new THREE.Group();
  trailGroup.visible = false;
  // Create 3 afterimage meshes (head ghosts)
  const afterimages = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BoxGeometry(0.20, 0.14, 0.06);
    const m = new THREE.MeshBasicMaterial({ color: 0xaad8ff, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    trailGroup.add(mesh);
    afterimages.push(mesh);
  }
  // Arc fan plane
  const arcGeo = new THREE.CircleGeometry(0.42, 12, -0.9, 1.8);
  // orient arc to face outward
  arcGeo.rotateX(Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x8ecaff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, 0.12, 0.06);
  arcMesh.rotation.z = 0.2;
  trailGroup.add(arcMesh);
  toolGroup.add(trailGroup);

  // Pivot near hand
  const pivot = new THREE.Group();
  pivot.name = "fieldToolPivot";
  pivot.add(toolGroup);
  pivot.position.set(0.26, 0.34, 0.12);
  playerGroup.add(pivot);

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
  }

  function startSwing() {
    isSwinging = true;
    swingProgress = 0;
    impactFired = false;
    whooshFired = false;
    glow.material.opacity = 0.55;
    trailGroup.visible = true;
  }

  function showTrail(progress) {
    // Show afterimages during strike phase 0.22 - 0.62
    if (progress > 0.22 && progress < 0.62) {
      const t = (progress - 0.22) / 0.40;
      arcMat.opacity = Math.sin(t * Math.PI) * 0.22;
      arcMesh.scale.set(0.9 + t * 0.15, 0.9 + t * 0.15, 1);
      for (let i = 0; i < afterimages.length; i++) {
        const delay = i * 0.045;
        const p = Math.max(0, Math.min(1, (progress - 0.22 - delay) / 0.25));
        if (p > 0 && p < 1) {
          afterimages[i].visible = true;
          afterimages[i].material.opacity = (1 - p) * 0.28;
          // Position slightly behind head
          const off = -0.07 - i * 0.05;
          afterimages[i].position.set(off, 0.18 + Math.sin(p * Math.PI) * 0.04, 0.02);
          afterimages[i].rotation.z = 0.18 + p * 0.3;
          afterimages[i].rotation.y = p * -0.6;
        } else {
          afterimages[i].visible = false;
        }
      }
    } else {
      arcMat.opacity *= 0.88;
      afterimages.forEach(m => { m.material.opacity *= 0.85; if (m.material.opacity < 0.02) m.visible = false; });
      if (progress >= 0.65) trailGroup.visible = false;
    }
  }

  function update(dt, playerPos, playerState, getTargets, onImpact, autoHarvestEnabled = true) {
    const speed = playerState.speed ?? 0;
    const maxSpeed = HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25;
    const speedOk = speed <= maxSpeed + 1e-6;

    // Gate: incompatible mode, moving too fast, or auto OFF -> abort
    if (!isHarvestCompatibleMode(playerState.mode) || !speedOk || !autoHarvestEnabled) {
      if (isSwinging) resetSwing();
      cooldown = 0;
      // idle pose leaning back
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, -0.18, dt * 6);
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, 0, dt * 6);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, 0.05, dt * 6);
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 2);
      arcMat.opacity = Math.max(0, arcMat.opacity - dt * 3);
      return;
    }

    // Wrapper to pass correct args (3D + speed + auto flag) — getTargets may expect 2 or 4 args, we pass 4
    const wrappedGet = (pos, mode) => {
      try {
        // Try 4-arg version
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

    // Swinging — wide arc
    const duration = HARVEST_CONFIG.swingInterval;
    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    // Broad sweep: combine yaw + pitch + roll
    // Windup (-0.6 rad pitch back, slight yaw -0.35), then fast wide arc across front (yaw sweep 0.7, pitch to 0.75, roll), then recovery
    let pitch, yaw, roll;
    if (swingProgress < 0.18) {
      const t = swingProgress / 0.18;
      pitch = THREE.MathUtils.lerp(-0.18, -0.68, t);
      yaw = THREE.MathUtils.lerp(0, -0.42, t);
      roll = THREE.MathUtils.lerp(0.05, -0.14, t);
    } else if (swingProgress < 0.58) {
      const t = (swingProgress - 0.18) / 0.40;
      const eased = 1 - Math.pow(1 - t, 3); // ease out fast
      pitch = THREE.MathUtils.lerp(-0.68, 0.78, eased);
      yaw = THREE.MathUtils.lerp(-0.42, 0.52, eased);
      roll = THREE.MathUtils.lerp(-0.14, 0.34, Math.sin(t * Math.PI * 0.9));
    } else {
      const t = (swingProgress - 0.58) / 0.42;
      const eased = t * (2 - t);
      pitch = THREE.MathUtils.lerp(0.78, -0.18, eased);
      yaw = THREE.MathUtils.lerp(0.52, 0, eased);
      roll = THREE.MathUtils.lerp(0.34, 0.05, eased);
    }
    pivot.rotation.x = pitch;
    pivot.rotation.y = yaw;
    pivot.rotation.z = roll;

    const glowPeak = Math.exp(-Math.pow((swingProgress - HARVEST_CONFIG.impactNormalizedTime) * 10, 2));
    glow.material.opacity = glowPeak * 0.85;

    showTrail(swingProgress);

    // Whoosh just before impact
    if (!whooshFired && swingProgress >= HARVEST_CONFIG.impactNormalizedTime - 0.14) {
      whooshFired = true;
      if (gameAudio && gameAudio.playWhoosh) gameAudio.playWhoosh();
    }

    // Impact point — re-query with current pos/mode/speed
    if (!impactFired && swingProgress >= HARVEST_CONFIG.impactNormalizedTime) {
      // If player started moving fast during swing, cancel impact
      if (!speedOk || !isHarvestCompatibleMode(playerState.mode) || !autoHarvestEnabled) {
        // abort without impact
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
  }

  return { pivot, toolGroup, glow, trailGroup, arcMesh, afterimages, update, resetSwing, get isSwinging() { return isSwinging; } };
}
