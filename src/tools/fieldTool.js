// src/tools/fieldTool.js — authoritative Field Tool visuals, single owner for harvest & combat swings
import * as THREE from "three";
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "../resources/resourceConfig.js";
import { COMBAT_CONFIG } from "../combat/combatConfig.js";

export const SWING_CONFIG = {
  yawWindup: -1.25, // front-right (character right = -X when +Z forward) -> negative yaw gives -X
  yawFollow: 1.25, // front-left (+X) -> positive yaw
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
  yawWindup: -1.28, // mirrored: right (-X) -> left (+X)
  yawFollow: 1.28,
  totalYawSweep: 2.56,
  pitchWindup: -0.32,
  pitchStrike: 0.22,
  rollWindup: -0.12,
  rollStrike: 0.14,
};

export function createFieldTool(playerGroup, gameAudio = null, { onSwingStart = null } = {}) {
  const handAnchor = new THREE.Group();
  handAnchor.name = "rightHandAnchor";
  const externalHand = playerGroup.userData?.externalPlayerModel;
  const handConfig = externalHand?.handAnchor;
  if (externalHand?.handBone) {
    externalHand.handBone.add(handAnchor);
    handAnchor.position.set(handConfig.position?.x ?? 0, handConfig.position?.y ?? 0, handConfig.position?.z ?? 0);
    handAnchor.rotation.set(handConfig.rotation?.x ?? 0, handConfig.rotation?.y ?? 0, handConfig.rotation?.z ?? 0);
  } else {
    // Anatomical right = -X when forward is +Z (player faces +Z).
    handAnchor.position.set(-0.37, 0.27, 0.06);
    playerGroup.add(handAnchor);
  }

  const shoulderWorld = new THREE.Vector3(-0.18, 0.58, 0.02);
  const shoulderLocal = shoulderWorld.clone().sub(handAnchor.position);
  const handLocal = new THREE.Vector3(0, 0, 0);
  const armVec = new THREE.Vector3().subVectors(handLocal, shoulderLocal);
  const armLen = armVec.length();
  const armGeo = new THREE.CylinderGeometry(0.042, 0.032, armLen, 6);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xdcb574, roughness:.8 });
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
  // The rig already supplies an arm and hand. Keep the tool/swing hierarchy
  // while suppressing only the procedural helper geometry.
  if (externalHand) {
    armMesh.visible = false;
    handMesh.visible = false;
    grip.visible = false;
  }

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
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x9d5930, roughness:.82 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.02, 0.39);
  toolGroup.add(handle);

  const blade = new THREE.Shape();
  blade.moveTo(-.16,-.08);blade.lineTo(.12,-.22);blade.quadraticCurveTo(.29,0,.12,.22);blade.lineTo(-.16,.08);blade.closePath();
  const headGeo = new THREE.ExtrudeGeometry(blade,{depth:.12,bevelEnabled:true,bevelSegments:1,bevelSize:.025,bevelThickness:.025,curveSegments:6});headGeo.translate(0,0,-.06);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xcde9e7, roughness:.38,metalness:.25 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.08, 0.88);
  head.rotation.z = 0.16;
  head.rotation.x = 0.12;
  toolGroup.add(head);

  const wedgeGeo = new THREE.CylinderGeometry(0.085, 0.165, 0.30, 5);
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xffc66b, roughness:.5,metalness:.18 });
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
  let sharedCooldown = 0; // single physical tool cadence authority — after ANY impact, shared recovery gates next swing
  let pendingTap = false; // at most one buffered tap
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
  function hardReset() {
    resetSwing();
    cooldown = 0;
    combatCooldown = 0;
    sharedCooldown = 0;
    pendingTap = false;
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
    try { onSwingStart?.({ profile }); } catch {}
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
    const attackHeld = opts.attackHeld ?? opts.holdRequested ?? false;
    const canAttack = opts.canAttack !== undefined ? opts.canAttack : true;
    const onCombatImpact = opts.onCombatImpact ?? null;
    const getCombatTargets = opts.getCombatTargets ?? null;
    const isDodging = opts.isDodging ?? (playerState.mode === "DODGE");

    // Cooldowns tick — single shared physical cadence authority
    if (cooldown > 0) cooldown -= dt;
    if (combatCooldown > 0) combatCooldown -= dt;
    if (sharedCooldown > 0) sharedCooldown -= dt;
    if (combatCooldown < 0) combatCooldown = 0;
    if (cooldown < 0) cooldown = 0;
    if (sharedCooldown < 0) sharedCooldown = 0;
    // Release clears held repetition: if hold released, do not keep queued hold.
    // Tap buffering is limited to one; held does not queue.
    const blockedModes = new Set(["CLIMB", "MANTLE"]);
    const combatModeOk = !blockedModes.has(playerState.mode) && !blockedModes.has(playerState.traversalMode);
    // Shared readiness: tool must not be swinging and shared cadence must be satisfied
    const isReadyForSwing = !isSwinging && sharedCooldown <= 0 && combatCooldown <= 0 && combatModeOk;

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
    // Phase 3.1: Auto Harvest no longer suppressed by combatEngaged; it only controls auto-initiation for resources
    const harvestAllowed = harvestModeOk && speedOk && autoHarvestEnabled;

    // ---- Shared cadence input handling ----
    // Tap buffering: one pending tap max. Held does not queue.
    const harvestImpactT = HARVEST_CONFIG.impactNormalizedTime;
    const canTakeoverPreImpact = isSwinging && activeProfile === "harvest" && swingProgress < harvestImpactT && canAttack && combatModeOk && sharedCooldown <= 0 && combatCooldown <= 0;
    if (attackRequested && !pendingTap) {
      if (canTakeoverPreImpact) {
        // will be handled as takeover below, not buffered
      } else if (!isReadyForSwing) {
        // Buffer one tap while tool is busy or in shared recovery
        pendingTap = true;
      }
    }
    // Hold release must not queue: if attackHeld is false, we do not create pending from hold. PendingTap only from taps.
    // Takeover: BEFORE IMPACT manual may cancel pre-impact harvest swing
    if (isSwinging && activeProfile === "harvest" && (attackRequested || attackHeld) && canAttack && combatModeOk && sharedCooldown <= 0 && combatCooldown <= 0) {
      if (swingProgress < harvestImpactT) {
        resetSwing();
        startSwing("combat");
        pendingTap = false;
      }
    }

    // If not swinging: decide to start combat (pending/hold/tap) or harvest (shared cadence gates all)
    if (!isSwinging) {
      const combatReady = canAttack && combatModeOk && sharedCooldown <= 0 && combatCooldown <= 0;
      let started = false;
      // Combat priority: pending tap, then immediate tap/hold
      if (pendingTap && combatReady) {
        startSwing("combat");
        pendingTap = false;
        started = true;
      } else if ((attackRequested || attackHeld) && combatReady) {
        startSwing("combat");
        pendingTap = false;
        started = true;
      } else if (harvestAllowed && getHarvestTargets) {
        // Harvest must also respect shared cadence — one physical tool
        if (sharedCooldown > 0 || combatCooldown > 0) {
          // Not ready for any swing — idle, keep pendingTap for later combat
          idlePulse += dt * 1.2;
          swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14 + Math.sin(idlePulse) * 0.03, dt * 6);
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, -0.62 + Math.cos(idlePulse * 0.7) * 0.02, dt * 6);
          swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04 + Math.cos(idlePulse * 0.7) * 0.015, dt * 6);
          glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
          // Do not clear pendingTap — will fire when shared cooldown expires if still appropriate
          return;
        }
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
          if (cooldown <= 0 && sharedCooldown <= 0) {
            startSwing("harvest");
            started = true;
          } else {
            idlePulse += dt * 4;
            swingPivot.rotation.z = Math.sin(idlePulse) * 0.03;
          }
          if (!isSwinging && !started) {
            // Still not swinging due to cooldown
          }
        }
        if (!hasTargets) {
          cooldown = 0;
          idlePulse += dt * 1.2;
          swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14 + Math.sin(idlePulse) * 0.03, dt * 6);
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, -0.62 + Math.cos(idlePulse * 0.7) * 0.02, dt * 6);
          swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04 + Math.cos(idlePulse * 0.7) * 0.015, dt * 6);
          glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
          arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
          if (isSwinging) {
            // harvested started
          } else return;
        }
        if (!isSwinging && harvestAllowed && getHarvestTargets) {
          if (activeProfile === "harvest") {
            // fall through
          } else {
            return;
          }
        }
      }
      if (!isSwinging && !started) {
        // Idle pose if no swing started — keep pendingTap buffered, but held not buffered
        // If attackHeld still true, it will attempt again next frame when ready (no extra queue)
        if ((attackRequested || pendingTap) && !combatReady) {
          // combat on shared cooldown: slight pause, do not clear pendingTap
          idlePulse += dt * 3;
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, -0.62, dt * 4);
        } else {
          idlePulse += dt * 1.2;
          swingPivot.rotation.x = THREE.MathUtils.lerp(swingPivot.rotation.x, -0.14 + Math.sin(idlePulse) * 0.03, dt * 6);
          swingPivot.rotation.y = THREE.MathUtils.lerp(swingPivot.rotation.y, -0.62 + Math.cos(idlePulse * 0.7) * 0.02, dt * 6);
          swingPivot.rotation.z = THREE.MathUtils.lerp(swingPivot.rotation.z, 0.04 + Math.cos(idlePulse * 0.7) * 0.015, dt * 6);
        }
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
        arcMat.opacity = Math.max(0, arcMat.opacity - dt * 2);
        return;
      }
    }

    // Progress current swing
    const isCombat = activeProfile === "combat";
    const cfg = isCombat ? COMBAT_SWING_CONFIG : { duration: HARVEST_CONFIG.swingInterval, impact: HARVEST_CONFIG.impactNormalizedTime, yawWindup: SWING_CONFIG.yawWindup, yawFollow: SWING_CONFIG.yawFollow, pitchWindup: SWING_CONFIG.pitchWindup, pitchStrike: SWING_CONFIG.pitchStrike, rollWindup: SWING_CONFIG.rollWindup, rollStrike: SWING_CONFIG.rollStrike };
    const duration = cfg.duration;
    const impactT = cfg.impact;

    swingProgress += dt / duration;
    if (swingProgress < 0) swingProgress = 0;
    if (swingProgress > 1) swingProgress = 1;

    const idleYaw = -0.62; // anatomical right = -X, idle on right side
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
      // Unified impact: one swing may affect both resources and valid creatures
      // Gather combat targets
      let combatTargets = [];
      if (getCombatTargets) {
        try { combatTargets = getCombatTargets() ?? []; } catch {}
      } else if (opts.getCombatTargets) {
        try { combatTargets = opts.getCombatTargets() ?? []; } catch {}
      }
      // Gather resource targets — unified: manual harvest uses range check regardless of Auto Harvest
      let resourceTargets = [];
      if (opts.getResourceHits) {
        try { resourceTargets = opts.getResourceHits() ?? []; } catch {}
      } else if (opts.getManualHarvestTargets) {
        try { resourceTargets = opts.getManualHarvestTargets() ?? []; } catch {}
      } else if (getHarvestTargets) {
        // For unified swing, try manual range check (ignore autoHarvestEnabled for impact)
        // If harvest profile, use auto logic; if combat profile (manual), use range-only
        const useManual = isCombat; // combat/manaual swing should harvest regardless of Auto
        if (useManual && opts.getManualHarvestTargets) {
          try { resourceTargets = opts.getManualHarvestTargets() ?? []; } catch {}
        } else {
          try {
            const res = getHarvestTargets(playerPos, playerState.mode, speed, useManual ? true : autoHarvestEnabled);
            if (Array.isArray(res)) resourceTargets = res;
            else resourceTargets = getHarvestTargets(playerPos, playerState.mode) ?? [];
          } catch (_) {
            try { resourceTargets = getHarvestTargets(playerPos, playerState.mode) ?? []; } catch {}
          }
          // If manual and got empty due to autoHarvestEnabled false, try halo/range fallback if available via opts
          if (useManual && resourceTargets.length === 0 && opts.getHaloTargets) {
            try { resourceTargets = opts.getHaloTargets() ?? []; } catch {}
          }
        }
      }

      // Unified callback preferred
      if (opts.onUnifiedImpact) {
        try { opts.onUnifiedImpact({ resourceHits: resourceTargets, combatHits: combatTargets }); } catch {}
      } else {
        // Backward compat: call individual callbacks if provided — may be called together for unified swing
        if (resourceTargets.length > 0 && onHarvestImpact) {
          try { onHarvestImpact(resourceTargets); } catch {}
        }
        if (onCombatImpact) {
          try { onCombatImpact(combatTargets); } catch {}
        } else if (combatTargets.length > 0 && onHarvestImpact && isCombat) {
          // fallback
        }
        // If neither callback supplied but resourceTargets have harvest, ensure harvest still handled via onHarvestImpact
        if (resourceTargets.length === 0 && combatTargets.length === 0) {
          // no targets, no effect but still consider impact consumed
        }
      }
      // Also emit to optional global resolver for testing
      if (opts.onFieldToolImpact) {
        try { opts.onFieldToolImpact({ resourceHits: resourceTargets, combatHits: combatTargets, profile: activeProfile }); } catch {}
      }
    }

    if (swingProgress >= 1) {
      const finishedProfile = activeProfile;
      resetSwing();
      // ONE physical tool — any finished swing imposes shared recovery before next impact can occur
      sharedCooldown = COMBAT_CONFIG.attackCooldown;
      if (finishedProfile === "combat") combatCooldown = COMBAT_CONFIG.attackCooldown;
      else cooldown = 0;
      combatCooldown = Math.max(combatCooldown, sharedCooldown);
    }
  }

  function requestHarvestSwing() {
    if (isSwinging) return false;
    if (combatCooldown > 0 || sharedCooldown > 0) return false;
    startSwing("harvest");
    return true;
  }
  function requestCombatSwing() {
    if (isSwinging && activeProfile === "combat") return false;
    if (combatCooldown > 0 || sharedCooldown > 0) return false;
    // Cancel harvest if needed — only pre-impact takeover allowed, check progress elsewhere; direct request follows same rule
    if (isSwinging && activeProfile === "harvest") {
      if (swingProgress < HARVEST_CONFIG.impactNormalizedTime) resetSwing();
      else return false;
    }
    startSwing("combat");
    return true;
  }
  function isReadyForSwing() {
    const blockedModes = new Set(["CLIMB", "MANTLE"]);
    // caller may pass playerState, but for pure readiness check: not swinging and shared cooldown clear
    return !isSwinging && sharedCooldown <= 0 && combatCooldown <= 0;
  }

  function isBusy() { return isSwinging; }
  function getActiveProfile() { return activeProfile; }
  function getSwingProgress() { return swingProgress; }

  function dispose() {
    handAnchor.remove(swingPivot);
    playerGroup.remove(handAnchor);
    playerGroup.remove(trailGroup);
  }

  // Dev-only diagnostic for handedness: samples tool head in player-local space
  // Correct basis: player forward = +Z, anatomical right = -X (not +X)
  function diagnoseHandedness() {
    const gripLocal = handAnchor.position.clone(); // anatomical right should be -X
    const headWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    const playerWorld = new THREE.Vector3();
    playerGroup.getWorldPosition(playerWorld);
    const playerQuat = new THREE.Quaternion();
    playerGroup.getWorldQuaternion(playerQuat);
    const invQuat = playerQuat.clone().invert();
    const localHead = headWorld.clone().sub(playerWorld).applyQuaternion(invQuat);
    const result = {
      grip: { x: gripLocal.x, y: gripLocal.y, z: gripLocal.z },
      headCurrent: { x: localHead.x, y: localHead.y, z: localHead.z },
      // When facing away (+Z forward), viewer and character share left/right: right appears viewer's right? Actually facing away viewer matches character: -X appears viewer's right? Need check but logical basis is -X = anatomical right
      basis: "forward=+Z, anatomicalRight=-X, anatomicalLeft=+X",
      expected: {
        start: "character RIGHT-FRONT: local X<0, Z>0",
        middle: "crosses front Z>0 near X~0",
        end: "character LEFT-FRONT: local X>0, Z>0",
        grip: "grip X < 0 (anatomical right)",
        idle: "idle X<0, Z>0 front-right",
      },
      check: {
        gripIsAnatomicalRight: gripLocal.x < 0,
        headInFront: localHead.z > 0,
        idleOnRight: localHead.x < 0 && localHead.z > 0,
      },
      // Human visual acceptance overrides numeric: face player AWAY from camera to verify.
      visualTest: "Face player AWAY from camera (forward +Z away). Tool must be visibly in character's RIGHT hand (-X side) and swing right-front (-X,Z>0) -> across front -> left-front (+X,Z>0). Facing camera should mirror.",
    };
    return result;
  }

  return {
    handAnchor, swingPivot, pivot: swingPivot, toolMount, toolGroup, head, glow, trailGroup, arcMesh, afterimages,
    update, resetSwing, hardReset, requestHarvestSwing, requestCombatSwing, isBusy, getActiveProfile, getSwingProgress, isReadyForSwing,
    get pendingTap() { return pendingTap; }, get sharedCooldown() { return sharedCooldown; }, get combatCooldownState() { return combatCooldown; },
    diagnoseHandedness,
    get isSwinging() { return isSwinging; },
    get activeProfile() { return activeProfile; },
    get swingProgress() { return swingProgress; },
    SWING_CONFIG, COMBAT_SWING_CONFIG,
  };
}
