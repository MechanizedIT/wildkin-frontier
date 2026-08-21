// src/tools/fieldTool.js — authoritative Field Tool visuals, single owner for harvest & combat swings
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";
import { COMBAT_CONFIG } from "../combat/combatConfig.js";

export const SWING_CONFIG = {
  yawWindup: 1.25, // front-right (4 o'clock)
  yawFollow: -1.25, // front-left (8 o'clock)
  totalYawSweep: 2.50,
  pitchWindup: -0.28,
  pitchStrike: 0.18,
  rollWindup: -0.10,
  rollStrike: 0.12,
  swingRadius: 0.78,
};

export const COMBAT_SWING_CONFIG = {
  duration: COMBAT_CONFIG.attackDuration, // ~0.46
  impact: COMBAT_CONFIG.attackImpactNormalized, // ~0.46
  yawWindup: 1.28,
  yawFollow: -1.28,
  totalYawSweep: 2.56,
  pitchWindup: -0.32,
  pitchStrike: 0.22,
  rollWindup: -0.12,
  rollStrike: 0.14,
};

export function createFieldTool(playerGroup, gameAudio = null) {
  const handAnchor = new THREE.Group();
  handAnchor.name = "rightHandAnchor";
  handAnchor.position.set(0.26, 0.38, 0.08);
  playerGroup.add(handAnchor);

  const shoulderWorld = new THREE.Vector3(0.18, 0.58, 0.02);
  const shoulderLocal = shoulderWorld.clone().sub(handAnchor.position);
  const handLocal = new THREE.Vector3(0, 0, 0);
  const armVec = new THREE.Vector3().subVectors(handLocal, shoulderLocal);
  const armLen = armVec.length();
  const armGeo = new THREE.CylinderGeometry(0.042, 0.032, armLen, 6);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true });
  const armMesh = new THREE.Mesh(armGeo, armMat);
  armMesh.position.copy(shoulderLocal).add(handLocal).multiplyScalar(0.5);
  armMesh.lookAt(handLocal);
  armMesh.rotateX(Math.PI / 2);
  handAnchor.add(armMesh);

  const handGeo = new THREE.SphereGeometry(0.055, 6, 6);
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd8c4a0, flatShading: true });
  const handMesh = new THREE.Mesh(handGeo, handMat);
  handAnchor.add(handMesh);

  const gripGeo = new THREE.TorusGeometry(0.038, 0.009, 6, 10);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, -0.02, 0.02);
  grip.rotation.x = Math.PI / 2;
  handAnchor.add(grip);

  const swingPivot = new THREE.Group();
  swingPivot.name = "fieldToolSwingPivot";
  handAnchor.add(swingPivot);

  const toolMount = new THREE.Group();
  toolMount.name = "toolMount";
  toolMount.position.set(0, 0, 0);
  swingPivot.add(toolMount);

  const toolGroup = new THREE.Group();
  toolGroup.name = "fieldTool";

  const handleGeo = new THREE.CylinderGeometry(0.075, 0.090, 0.78, 7);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, flatShading: true });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.02, 0.39);
  toolGroup.add(handle);

  const headGeo = new THREE.BoxGeometry(0.40, 0.28, 0.20);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.26 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.08, 0.88);
  head.rotation.z = 0.16;
  head.rotation.x = 0.12;
  toolGroup.add(head);

  const wedgeGeo = new THREE.CylinderGeometry(0.085, 0.165, 0.30, 5);
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xc9d6ff, flatShading: true, emissive: 0x334466, emissiveIntensity: 0.20 });
  const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
  wedge.position.set(0, 0.10, 1.06);
  wedge.rotation.z = Math.PI / 2;
  toolGroup.add(wedge);

  const glowGeo = new THREE.SphereGeometry(0.10, 7, 7);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0.08, 0.88);
  toolGroup.add(glow);

  toolGroup.position.set(0, 0, 0);
  toolGroup.rotation.set(0, 0, 0);
  toolMount.add(toolGroup);

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
  const arcGeo = new THREE.RingGeometry(0.22, 0.88, 26, 1, -1.35, 2.70);
  arcGeo.rotateX(-Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x8ecaff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, -0.20, 0.02);
  trailGroup.add(arcMesh);

  playerGroup.add(trailGroup);
  trailGroup.position.copy(handAnchor.position);

  const history = [];
  const maxHistory = 5;
  let swingProgress = 0;
  let isSwinging = false;
  let activeProfile = null; // 'harvest' | 'combat' | null
  let impactFired = false;
  let whooshFired = false;
  let cooldown = 0; // harvest cooldown (0) and combat cooldown shared? We'll use separate but unified
  let combatCooldown = 0;
  let idlePulse = 0;

  function resetSwing() {
    isSwinging = false;
    activeProfile = null;
    swingProgress = 0;
    impactFired = false;
    whooshFired = false;
    trailGroup.visible = false;
    afterimages.forEach(m => { m.visible = false; m.material.opacity = 0; });
    arcMat.opacity = 0;
    history.length = 0;
  }

  function startSwing(profile) {
    isSwinging = true;
    activeProfile = profile;
    swingProgress = 0;
    impactFired = false;
    whooshFired = false;
    glow.material.opacity = profile === "combat" ? 0.85 : 0.65;
    if (profile === "combat" && glow.material.color) glow.material.color.set(0xff8c42);
    else glow.material.color.set(0x7ec8ff);
    trailGroup.visible = true;
    history.length = 0;
    arcMat.opacity = 0;
    // Combat brighter trail
    if (profile === "combat") {
      arcMat.color.set(0xffb86a);
      afterimages.forEach(m => m.material.color.set(0xffc07a));
    } else {
      arcMat.color.set(0x8ecaff);
      afterimages.forEach(m => m.material.color.set(0xaad8ff));
    }
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
    const isCombat = activeProfile === "combat";
    const trailPeak = isCombat ? 0.62 : 0.48;
    const trailColor = isCombat ? 0xffb86a : 0x8ecaff;
    if (progress > 0.18 && progress < 0.70) {
      const t = (progress - 0.18) / 0.52;
      arcMat.opacity = Math.sin(t * Math.PI) * trailPeak;
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
        const base = isCombat ? 0.62 : 0.52;
        afterimages[i].material.opacity = (base - ageFactor * 0.32) * (1 - (progress - 0.18)/0.56 * 0.28);
        afterimages[i].material.opacity = Math.max(0, Math.min(isCombat ? 0.68 : 0.55, afterimages[i].material.opacity));
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

  // New unified update — supports both harvest and combat with priority
  // Signature supports legacy (old 6-arg harvest) and new object opts
  function update(dt, playerPos, playerState, getTargetsOrOpts, onImpactMaybe, autoHarvestEnabledArg) {
    // Detect which signature is used
    let getHarvestTargets = null;
    let onHarvestImpact = null;
    let opts = {};
    if (typeof getTargetsOrOpts === "function") {
      // Legacy: update(dt, pos, state, getTargets, onImpact, autoHarvestEnabled)
      getHarvestTargets = getTargetsOrOpts;
      onHarvestImpact = onImpactMaybe;
      opts.autoHarvestEnabled = autoHarvestEnabledArg !== undefined ? autoHarvestEnabledArg : true;
      opts.attackRequested = false;
      opts.canAttack = false;
      opts.onCombatImpact = null;
      opts.combatEngaged = false;
      opts.isDodging = playerState.mode === "DODGE";
      opts.getCombatTargets = null;
    } else if (typeof getTargetsOrOpts === "object" && getTargetsOrOpts !== null) {
      opts = getTargetsOrOpts;
      getHarvestTargets = opts.getHarvestTargets ?? null;
      onHarvestImpact = opts.onHarvestImpact ?? null;
    } else {
      // No targets: just idle update
      opts = {};
    }

    const autoHarvestEnabled = opts.autoHarvestEnabled !== undefined ? opts.autoHarvestEnabled : (autoHarvestEnabledArg !== undefined ? autoHarvestEnabledArg : true);
    const combatEngaged = opts.combatEngaged ?? false;
    const attackRequested = opts.attackRequested ?? false;
    const canAttack = opts.canAttack !== undefined ? opts.canAttack : true;
    const onCombatImpact = opts.onCombatImpact ?? null;
    const getCombatTargets = opts.getCombatTargets ?? null;
    const isDodging = opts.isDodging ?? (playerState.mode === "DODGE");

    // Cooldowns tick
    if (cooldown > 0) cooldown -= dt;
    if (combatCooldown > 0) combatCooldown -= dt;
    if (combatCooldown < 0) combatCooldown = 0;
    if (cooldown < 0) cooldown = 0;

    // Dodge / death priority: if dodging and swinging combat before impact, cancel
    if (isSwinging && activeProfile === "combat" && isDodging) {
      const cfg = COMBAT_SWING_CONFIG;
      if (swingProgress < cfg.impact) {
        // Cancel combat swing if dodge before impact (spec)
        resetSwing();
        combatCooldown = COMBAT_CONFIG.attackCooldown * 0.35;
      }
    }

    const speed = playerState.speed ?? 0;
    const maxSpeed = HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25;
    const speedOk = speed <= maxSpeed + 1e-6;
    const harvestModeOk = isHarvestCompatibleMode(playerState.mode);
    const harvestAllowed = harvestModeOk && speedOk && autoHarvestEnabled && !combatEngaged;

    // If not swinging: decide to start combat or harvest (combat priority)
    if (!isSwinging) {
      // Combat priority: if attack requested and canAttack and not in blocked mode
      const blockedModes = new Set(["CLIMB", "MANTLE"]);
      const combatModeOk = !blockedModes.has(playerState.mode) && !blockedModes.has(playerState.traversalMode);
      if (attackRequested && canAttack && combatCooldown <= 0 && combatModeOk) {
        startSwing("combat");
        // progress will tick next
      } else if (harvestAllowed && getHarvestTargets) {
        // Harvest eligibility: need targets
        let targets = [];
        try {
          const res = getHarvestTargets(playerPos, playerState.mode, speed, autoHarvestEnabled);
          if (Array.isArray(res)) targets = res;
          else targets = getHarvestTargets(playerPos, playerState.mode) ?? [];
        } catch (_) {
          try { targets = getHarvestTargets(playerPos, playerState.mode) ?? []; } catch {}
        }
        const hasTargets = targets.length > 0;
        if (hasTargets) {
          if (cooldown <= 0) {
            startSwing("harvest");
          } else {
            idlePulse += dt * 4;
            swingPivot.rotation.z = Math.sin(idlePulse) * 0.03;
            // Not swinging yet, keep idle pose
          }
          // Don't return yet; if we just started swing, fall through to progress
          if (!isSwinging) {
            // Still not swinging due to cooldown: update idle pose and return
            // Idle on right side
            // will handle below
          }
        }
        if (!hasTargets) {
          cooldown = 0;
          idlePulse += dt * 1.2;
          swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14 + Math.sin(idlePulse) * 0.03, dt * 6);
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, 0.62 + Math.cos(idlePulse * 0.7) * 0.02, dt * 6);
          swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04 + Math.cos(idlePulse * 0.7) * 0.015, dt * 6);
          glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
          if (activeProfile !== "combat" && attackRequested) {
            // If we didn't start combat due to cooldown but attack requested, keep idle combat-ready pose? No
          }
          if (isSwinging) {
            // harvested started
          } else return;
        }
        if (!isSwinging && harvestAllowed && getHarvestTargets) {
          // If we started harvest swing, need to progress
          if (activeProfile === "harvest") {
            // fall through
          } else {
            return;
          }
        }
      }
      if (!isSwinging) {
        // Idle pose if no swing started
        if (attackRequested && combatCooldown > 0) {
          // combat on cooldown: slight pause
          idlePulse += dt * 3;
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, 0.62, dt * 4);
        } else {
          idlePulse += dt * 1.2;
          swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14 + Math.sin(idlePulse) * 0.03, dt * 6);
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, 0.62 + Math.cos(idlePulse * 0.7) * 0.02, dt * 6);
          swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04 + Math.cos(idlePulse * 0.7) * 0.015, dt * 6);
        }
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
        arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
        return;
      }
    }

    // If swinging, but active profile is harvest and combat now requested with priority -> cancel harvest and start combat (if before impact)
    if (isSwinging && activeProfile === "harvest" && attackRequested && canAttack && combatCooldown <= 0) {
      // Combat takes priority over active harvest action (spec)
      resetSwing();
      startSwing("combat");
    }

    // Progress current swing
    const isCombat = activeProfile === "combat";
    const cfg = isCombat ? COMBAT_SWING_CONFIG : { duration: HARVEST_CONFIG.swingInterval, impact: HARVEST_CONFIG.impactNormalizedTime, yawWindup: SWING_CONFIG.yawWindup, yawFollow: SWING_CONFIG.yawFollow, pitchWindup: SWING_CONFIG.pitchWindup, pitchStrike: SWING_CONFIG.pitchStrike, rollWindup: SWING_CONFIG.rollWindup, rollStrike: SWING_CONFIG.rollStrike };
    const duration = cfg.duration;
    const impactT = cfg.impact;

    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    const idleYaw = 0.62;
    let pitch, yaw, roll;
    if (isCombat) {
      // Combat: slightly more aggressive, faster windup portion 0.18, strike 0.40, recover 0.42 similar but tuned
      if (swingProgress < 0.18) {
        const t = swingProgress / 0.18;
        pitch = THREE.MathUtils.lerp(-0.14, cfg.pitchWindup, t);
        yaw = THREE.MathUtils.lerp(idleYaw, cfg.yawWindup, t);
        roll = THREE.MathUtils.lerp(0.04, cfg.rollWindup, t);
      } else if (swingProgress < 0.58) {
        const t = (swingProgress - 0.18) / 0.40;
        const eased = 1 - Math.pow(1 - t, 2.8);
        pitch = THREE.MathUtils.lerp(cfg.pitchWindup, cfg.pitchStrike, eased);
        yaw = THREE.MathUtils.lerp(cfg.yawWindup, cfg.yawFollow, eased);
        roll = THREE.MathUtils.lerp(cfg.rollWindup, cfg.rollStrike, Math.sin(t * Math.PI * 0.85));
      } else {
        const t = (swingProgress - 0.58) / 0.42;
        const eased = t * (2 - t);
        pitch = THREE.MathUtils.lerp(cfg.pitchStrike, -0.14, eased);
        yaw = THREE.MathUtils.lerp(cfg.yawFollow, idleYaw, eased);
        roll = THREE.MathUtils.lerp(cfg.rollStrike, 0.04, eased);
      }
    } else {
      if (swingProgress < 0.18) {
        const t = swingProgress / 0.18;
        pitch = THREE.MathUtils.lerp(-0.14, SWING_CONFIG.pitchWindup, t);
        yaw = THREE.MathUtils.lerp(idleYaw, SWING_CONFIG.yawWindup, t);
        roll = THREE.MathUtils.lerp(0.04, SWING_CONFIG.rollWindup, t);
      } else if (swingProgress < 0.58) {
        const t = (swingProgress - 0.18) / 0.40;
        const eased = 1 - Math.pow(1 - t, 2.8);
        pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchWindup, SWING_CONFIG.pitchStrike, eased);
        yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawWindup, SWING_CONFIG.yawFollow, eased);
        roll = THREE.MathUtils.lerp(SWING_CONFIG.rollWindup, SWING_CONFIG.rollStrike, Math.sin(t * Math.PI * 0.85));
      } else {
        const t = (swingProgress - 0.58) / 0.42;
        const eased = t * (2 - t);
        pitch = THREE.MathUtils.lerp(SWING_CONFIG.pitchStrike, -0.14, eased);
        yaw = THREE.MathUtils.lerp(SWING_CONFIG.yawFollow, idleYaw, eased);
        roll = THREE.MathUtils.lerp(SWING_CONFIG.rollStrike, 0.04, eased);
      }
    }
    swingPivot.rotation.x = pitch;
    swingPivot.rotation.y = yaw;
    swingPivot.rotation.z = roll;

    const glowPeak = Math.exp(-Math.pow((swingProgress - impactT) * 10, 2));
    glow.material.opacity = glowPeak * (isCombat ? 1.05 : 0.92);

    recordHistory();
    showTrail(swingProgress);

    // Whoosh slightly before impact
    const whooshOffset = isCombat ? 0.17 : 0.19;
    if (!whooshFired && swingProgress >= impactT - whooshOffset) {
      whooshFired = true;
      if (gameAudio && gameAudio.playWhoosh) gameAudio.playWhoosh();
    }

    if (!impactFired && swingProgress >= impactT) {
      impactFired = true;
      if (isCombat) {
        // Combat impact: use exact targeting, damage creatures
        if (onCombatImpact) {
          let combatTargets = [];
          if (getCombatTargets) {
            try { combatTargets = getCombatTargets(); } catch {}
          } else if (opts.creatures && opts.playerPos && opts.playerFacing !== undefined) {
            // fallback
          }
          // Ensure we pass even if empty; combat impact should be one event
          onCombatImpact(combatTargets);
        } else if (onHarvestImpact) {
          // legacy shouldn't happen
        }
      } else {
        // Harvest impact: check still valid (speed, mode, auto)
        if (!speedOk || !isHarvestCompatibleMode(playerState.mode) || !autoHarvestEnabled || combatEngaged) {
          resetSwing();
          return;
        }
        let impactTargets = [];
        if (getHarvestTargets) {
          try {
            const res = getHarvestTargets(playerPos, playerState.mode, speed, autoHarvestEnabled);
            if (Array.isArray(res)) impactTargets = res;
            else impactTargets = getHarvestTargets(playerPos, playerState.mode) ?? [];
          } catch (_) {
            try { impactTargets = getHarvestTargets(playerPos, playerState.mode) ?? []; } catch {}
          }
        }
        if (impactTargets.length > 0 && onHarvestImpact) {
          onHarvestImpact(impactTargets);
        }
      }
    }

    if (swingProgress >= 1) {
      const finishedProfile = activeProfile;
      resetSwing();
      if (finishedProfile === "combat") combatCooldown = COMBAT_CONFIG.attackCooldown;
      else cooldown = 0;
    }
  }

  function requestHarvestSwing() {
    if (isSwinging) return false;
    if (combatCooldown > 0) return false;
    startSwing("harvest");
    return true;
  }
  function requestCombatSwing() {
    if (isSwinging && activeProfile === "combat") return false;
    if (combatCooldown > 0) return false;
    // Cancel harvest if needed
    if (isSwinging && activeProfile === "harvest") resetSwing();
    startSwing("combat");
    return true;
  }

  function isBusy() { return isSwinging; }
  function getActiveProfile() { return activeProfile; }
  function getSwingProgress() { return swingProgress; }

  function dispose() {
    handAnchor.remove(swingPivot);
    playerGroup.remove(handAnchor);
    playerGroup.remove(trailGroup);
  }

  return {
    handAnchor, swingPivot, pivot: swingPivot, toolMount, toolGroup, head, glow, trailGroup, arcMesh, afterimages,
    update, resetSwing, requestHarvestSwing, requestCombatSwing, isBusy, getActiveProfile, getSwingProgress,
    get isSwinging() { return isSwinging; },
    get activeProfile() { return activeProfile; },
    get swingProgress() { return swingProgress; },
    SWING_CONFIG, COMBAT_SWING_CONFIG,
  };
}
