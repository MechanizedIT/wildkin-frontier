import * as THREE from "three";
import { getBandSpeed, classifyMovementBand } from "../movement/movementBands.js";
import { createTraversalController } from "../movement/traversalController.js";
import { createPlayerVisuals } from "./playerVisuals.js";
import { createClimbingController, CLIMBING_CONFIG } from '../movement/climbingController.js';
import { calculateFallImpact } from "./fallImpact.js";

// Phase 1.2 — Rapier KinematicCharacterController migration.
// Wildkin owns intent/speeds/accel/facing/dodge/jump/climb. Rapier owns collision/slide/grounding.

export function interpolateRenderPose(previous, current, alpha) {
  const t = Math.max(0, Math.min(1, Number(alpha) || 0));
  const delta = Math.atan2(Math.sin(current.facing - previous.facing), Math.cos(current.facing - previous.facing));
  return {
    position: {
      x: previous.position.x + (current.position.x - previous.position.x) * t,
      y: previous.position.y + (current.position.y - previous.position.y) * t,
      z: previous.position.z + (current.position.z - previous.position.z) * t,
    },
    facing: previous.facing + delta * t,
  };
}

export function resolveJumpPadLaunchVelocity(horizontalVelocity = {}, verticalLaunch = 0, authoredHorizontalVelocity = null) {
  const authored = authoredHorizontalVelocity && Number.isFinite(authoredHorizontalVelocity.x) && Number.isFinite(authoredHorizontalVelocity.z)
    ? authoredHorizontalVelocity
    : null;
  return {
    x: authored ? authored.x : (Number.isFinite(horizontalVelocity.x) ? horizontalVelocity.x : 0),
    y: Math.max(0, Number(verticalLaunch) || 0),
    z: authored ? authored.z : (Number.isFinite(horizontalVelocity.z) ? horizontalVelocity.z : 0),
  };
}

export function createPlayerController(playerMesh, playground, camera, moveCfg, characterPhysics, { climbProbe = null } = {}) {
  const state = {
    mode: "IDLE",
    pos: new THREE.Vector3().copy(playerMesh.position),
    vel: new THREE.Vector3(0, 0, 0),
    verticalVelocity: 0,
    grounded: true,
    facing: 0,
    speed: 0,
    dodgeCooldown: 0,
    dodgeTime: 0,
    dodgeDir: new THREE.Vector3(0, 0, 0),
    // airborne caps
    airCap: 0,
    // internal jump/climb/mantle/fall
    jumpData: null,
    jumpBufferRemaining: 0,
    coyoteRemaining: 0,
    jumpRequestActive: false,
    fallHVel: null,
    climbable: null,
    climbTime: 0,
    climbVelocity: 0,
    mantleData: null,
  };
  let moveSpeedMultiplier = 1;

  const tmpDir = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpTargetVel = new THREE.Vector3();
  const tmpCurVel = new THREE.Vector3();
  const tmpDiff = new THREE.Vector3();

  const traversal = createTraversalController(playground, moveCfg);
  const visuals = createPlayerVisuals(playerMesh);
  const previousPhysicsPose = { position: state.pos.clone(), facing: state.facing };
  const currentPhysicsPose = { position: state.pos.clone(), facing: state.facing };
  const renderedPose = { position: state.pos.clone(), facing: state.facing };
  let airbornePeakFeetY = null;
  let pendingLandingImpact = null;
  const climbing = characterPhysics ? createClimbingController({ state, characterPhysics, probe:climbProbe,
    playground, syncPosition:syncPosFromPhysics, beginAirborneTracking, cancelAirborneTracking,
    resetTraversal:()=>traversal.reset() }) : null;

  function syncPosFromPhysics() {
    if (!characterPhysics) return;
    const p = characterPhysics.getPosition();
    state.pos.set(p.x, p.y, p.z);
  }
  if (characterPhysics) syncPosFromPhysics();

  function getFeetY() {
    const totalHeight = Number(characterPhysics?.cfg?.capsuleTotalHeight) || 0;
    return state.pos.y - totalHeight / 2;
  }

  function beginAirborneTracking(feetY = getFeetY()) {
    if (!Number.isFinite(feetY)) return;
    if (airbornePeakFeetY === null) airbornePeakFeetY = feetY;
    else airbornePeakFeetY = Math.max(airbornePeakFeetY, feetY);
  }

  function updateAirbornePeak() {
    beginAirborneTracking(getFeetY());
  }

  function cancelAirborneTracking() {
    airbornePeakFeetY = null;
  }

  function recordLandingImpact() {
    if (airbornePeakFeetY === null) return;
    const impact = calculateFallImpact(airbornePeakFeetY, getFeetY());
    airbornePeakFeetY = null;
    if (impact && pendingLandingImpact === null) pendingLandingImpact = impact;
  }

  function consumeLandingImpact() {
    const impact = pendingLandingImpact;
    pendingLandingImpact = null;
    return impact;
  }

  function getCameraBasis() {
    camera.getWorldDirection(tmpDir);
    tmpDir.y = 0;
    if (tmpDir.lengthSq() < 1e-6) tmpDir.set(0, 0, -1);
    tmpDir.normalize();
    tmpForward.copy(tmpDir);
    tmpRight.crossVectors(tmpForward, tmpUp).normalize();
    return { forward: tmpForward, right: tmpRight };
  }

  function intentToWorldDir(intent) {
    if (!intent) return { x: 0, z: 0, len: 0 };
    const ix = intent.moveX;
    const iy = intent.moveY;
    const len = Math.hypot(ix, iy);
    if (len < 1e-6) return { x: 0, z: 0, len: 0 };
    const { forward, right } = getCameraBasis();
    const worldX = right.x * ix + forward.x * -iy;
    const worldZ = right.z * ix + forward.z * -iy;
    const wLen = Math.hypot(worldX, worldZ);
    if (wLen < 1e-6) return { x: 0, z: 0, len: 0 };
    return { x: worldX / wLen, z: worldZ / wLen, len: wLen };
  }

  function screenVectorToWorld(sx, sy) {
    const len = Math.hypot(sx, sy);
    if (len < 1e-6) return { x: 0, z: 0 };
    const nx = sx / len;
    const ny = sy / len;
    const { forward, right } = getCameraBasis();
    const wx = right.x * nx + forward.x * -ny;
    const wz = right.z * nx + forward.z * -ny;
    const wLen = Math.hypot(wx, wz);
    if (wLen < 1e-6) return { x: 0, z: 0 };
    return { x: wx / wLen, z: wz / wLen };
  }

  function startDodge(intent, worldDir) {
    let dir = null;
    if (intent.dodgeX !== undefined && intent.dodgeY !== undefined && (Math.abs(intent.dodgeX) > 1e-6 || Math.abs(intent.dodgeY) > 1e-6)) {
      if (intent._fromSwipe) dir = screenVectorToWorld(intent.dodgeX, intent.dodgeY);
      else {
        const sx = intent.dodgeX;
        const sy = intent.dodgeY;
        if (Math.hypot(sx, sy) > 1e-6) dir = screenVectorToWorld(sx, sy);
      }
    }
    if (!dir || (dir.x === 0 && dir.z === 0)) {
      if (worldDir && (worldDir.x !== 0 || worldDir.z !== 0)) dir = worldDir;
      else dir = { x: Math.sin(state.facing), z: Math.cos(state.facing) };
    }
    const len = Math.hypot(dir.x, dir.z);
    if (len < 1e-6) return false;
    state.dodgeDir.set(dir.x / len, 0, dir.z / len);
    state.mode = "DODGE";
    state.dodgeTime = moveCfg.dodgeDuration;
    state.dodgeCooldown = moveCfg.dodgeCooldown;
    state.verticalVelocity = Math.min(state.verticalVelocity, 0);
    return true;
  }

  function launchFromJumpPad({ verticalLaunch, horizontalLaunch = 0, direction = null }) {
    if (!Number.isFinite(verticalLaunch) || verticalLaunch <= 0) return false;
    const horizontal = state.mode === "JUMP" && state.jumpData
      ? state.jumpData.hVel
      : state.mode === "FALL" && state.fallHVel ? state.fallHVel : state.vel;
    const launchMagnitude = Math.max(0, Number(horizontalLaunch) || 0);
    const authoredHorizontal = launchMagnitude > 0 && direction
      && Number.isFinite(direction.x) && Number.isFinite(direction.z)
      ? { x: direction.x * launchMagnitude, z: direction.z * launchMagnitude }
      : null;
    const launchVelocity = resolveJumpPadLaunchVelocity(horizontal, verticalLaunch, authoredHorizontal);
    const horizontalSpeed = Math.hypot(launchVelocity.x, launchVelocity.z);
    climbing?.reset();
    traversal.reset();
    state.mode = "JUMP";
    state.jumpData = {
      hVel: { x: launchVelocity.x, z: launchVelocity.z },
      initialSpeed: horizontalSpeed,
      landingRegion: null,
      maxLandingCorrection: 0,
      airTime: (2 * verticalLaunch) / (moveCfg.jumpGravity ?? 12),
      time: 0,
      source: "jumpPad",
      // An authored thrust is a deterministic traversal vector, not ordinary run carry.
      lockHorizontal: authoredHorizontal !== null,
    };
    state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, horizontalSpeed);
    state.verticalVelocity = verticalLaunch;
    state.grounded = false;
    state.speed = horizontalSpeed;
    state.vel.set(launchVelocity.x, 0, launchVelocity.z);
    if (horizontalSpeed > 0.1) state.facing = Math.atan2(launchVelocity.x, launchVelocity.z);
    state.fallHVel = null;
    state.jumpBufferRemaining = 0;
    state.coyoteRemaining = 0;
    state.climbable = null;
    state.mantleData = null;
    beginAirborneTracking();
    return true;
  }

  function cancelPendingJump() {
    state.jumpBufferRemaining = 0;
    state.coyoteRemaining = 0;
    state.jumpRequestActive = false;
  }

  function resetJumpState() {
    climbing?.reset();
    cancelPendingJump();
    if (["JUMP","FALL","CLIMB","MANTLE"].includes(state.mode)) state.mode = "IDLE";
    state.jumpData = null;
    state.fallHVel = null;
    state.airCap = 0;
    state.verticalVelocity = 0;
    cancelAirborneTracking();
    pendingLandingImpact = null;
  }

  function updateJumpRequestWindow(dt, intent) {
    const requested = !!intent?.jumpRequested;
    state.jumpBufferRemaining = Math.max(0, state.jumpBufferRemaining - dt);
    if (requested && !state.jumpRequestActive) {
      state.jumpBufferRemaining = moveCfg.jumpBufferWindow ?? 0.10;
    }
    state.jumpRequestActive = requested;
    if (state.grounded) state.coyoteRemaining = moveCfg.jumpCoyoteWindow ?? 0.08;
    else state.coyoteRemaining = Math.max(0, state.coyoteRemaining - dt);
  }

  function startOrdinaryJump() {
    const horizontalSpeed = Math.hypot(state.vel.x, state.vel.z);
    const verticalLaunch = moveCfg.jumpInitialVerticalVelocity ?? 5.8;
    state.mode = "JUMP";
    state.jumpData = {
      hVel: { x: state.vel.x, z: state.vel.z },
      initialSpeed: horizontalSpeed,
      landingRegion: null,
      maxLandingCorrection: 0,
      airTime: (2 * verticalLaunch) / (moveCfg.jumpGravity ?? 12),
      time: 0,
      source: "ordinary",
      lockHorizontal: false,
    };
    state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, horizontalSpeed);
    state.verticalVelocity = verticalLaunch;
    state.grounded = false;
    state.fallHVel = null;
    state.jumpBufferRemaining = 0;
    state.coyoteRemaining = 0;
    beginAirborneTracking();
    return true;
  }

  // Persistent movement bonuses apply to normal grounded locomotion only.
  function setMoveSpeedMultiplier(value) {
    moveSpeedMultiplier = Math.max(0.5, Math.min(1.5, Number.isFinite(value) ? value : 1));
    return moveSpeedMultiplier;
  }

  function syncMesh(dt) {
    currentPhysicsPose.position.copy(state.pos);
    currentPhysicsPose.facing = state.facing;
    let visualMode = state.mode;
    // traversal debug mode override if needed
    const travMode = traversal.getState().mode;
    if (travMode !== "IDLE" && state.mode === "IDLE") visualMode = travMode;
    visuals.sync(dt, { mode: visualMode, speed: visualMode === "CLIMB" ? state.climbVelocity : state.speed,
      mantleDuration:state.mantleData?.duration,
      mantleProgress:state.mantleData ? state.mantleData.time/state.mantleData.duration : undefined,
      mantleLiftFraction:CLIMBING_CONFIG.mantleLiftFraction });
  }

  function prepareRender(alpha) {
    const pose = interpolateRenderPose(previousPhysicsPose, currentPhysicsPose, alpha);
    renderedPose.position.set(pose.position.x, pose.position.y, pose.position.z);
    renderedPose.facing = pose.facing;
    playerMesh.position.copy(renderedPose.position);
    playerMesh.rotation.y = renderedPose.facing;
    return getRenderPose();
  }

  function getRenderPose() {
    return { position: renderedPose.position.clone(), facing: renderedPose.facing };
  }

  function snapRenderPose() {
    previousPhysicsPose.position.copy(state.pos);
    currentPhysicsPose.position.copy(state.pos);
    renderedPose.position.copy(state.pos);
    previousPhysicsPose.facing = state.facing;
    currentPhysicsPose.facing = state.facing;
    renderedPose.facing = state.facing;
    playerMesh.position.copy(state.pos);
    playerMesh.rotation.y = state.facing;
    return getRenderPose();
  }

  function rapierMove(hVelX, hVelZ, vertVel, dt) {
    const desired = { x: hVelX * dt, y: vertVel * dt, z: hVelZ * dt };
    const res = characterPhysics.move(desired);
    if (vertVel > 0 && res.corrected.y < desired.y * 0.3) {
      state.verticalVelocity = Math.min(0, state.verticalVelocity);
    }
    state.grounded = res.grounded;
    if (state.grounded && state.verticalVelocity < 0) state.verticalVelocity = 0;
    syncPosFromPhysics();
    return res;
  }

  // Shared airborne horizontal control (Phase 1.2 refinement)
  // Used by both JUMP and FALL. Ignores band speeds; dir only, constant accel/decel, frozen cap.
  function applyAirborneHorizontalControl(dt, worldDir, hVel) {
    const hasInput = worldDir && worldDir.len > 1e-6;
    if (hasInput) {
      const targetX = worldDir.x * state.airCap;
      const targetZ = worldDir.z * state.airCap;
      let diffX = targetX - hVel.x;
      let diffZ = targetZ - hVel.z;
      const diffLen = Math.hypot(diffX, diffZ);
      const maxStep = (moveCfg.airAcceleration ?? 10) * dt;
      if (diffLen > maxStep) {
        diffX = (diffX / diffLen) * maxStep;
        diffZ = (diffZ / diffLen) * maxStep;
      }
      hVel.x += diffX;
      hVel.z += diffZ;
      const curSpeed = Math.hypot(hVel.x, hVel.z);
      if (curSpeed > state.airCap) {
        hVel.x = (hVel.x / curSpeed) * state.airCap;
        hVel.z = (hVel.z / curSpeed) * state.airCap;
      }
    } else {
      const curSpeed = Math.hypot(hVel.x, hVel.z);
      if (curSpeed > 1e-5) {
        const maxStep = (moveCfg.airDeceleration ?? 5) * dt;
        const newSpeed = Math.max(0, curSpeed - maxStep);
        const factor = curSpeed > 1e-6 ? newSpeed / curSpeed : 0;
        hVel.x *= factor;
        hVel.z *= factor;
      }
    }
  }

  function update(dt, intent, combatOpts = null) {
    const fixedDt = Math.min(dt, moveCfg.maxDelta ?? 0.05);
    if (fixedDt <= 0) return;
    if (!characterPhysics) return;
    previousPhysicsPose.position.copy(currentPhysicsPose.position);
    previousPhysicsPose.facing = currentPhysicsPose.facing;

    // Phase 3: handle knockback if provided via combatOpts
    if (combatOpts && combatOpts.knockback && combatOpts.knockback.remaining > 0) {
      const wasGrounded = state.grounded;
      const preMoveFeetY = getFeetY();
      climbing?.detach();
      const kb = combatOpts.knockback;
      if (!state.grounded) state.verticalVelocity += (moveCfg.gravity ?? -12) * fixedDt;
      const desired = { x: kb.dir.x * kb.speed * fixedDt, y: (state.verticalVelocity * fixedDt), z: kb.dir.z * kb.speed * fixedDt };
      const res = characterPhysics.move(desired);
      syncPosFromPhysics();
      state.grounded = res.grounded;
      if (wasGrounded && !res.grounded) {
        state.mode = "FALL";
        state.jumpData = null;
        state.fallHVel = { x: kb.dir.x * kb.speed, z: kb.dir.z * kb.speed };
        state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, kb.speed);
        beginAirborneTracking(preMoveFeetY);
      } else if (!res.grounded && (state.mode === "JUMP" || state.mode === "FALL")) {
        updateAirbornePeak();
      }
      if (res.grounded && (state.mode === "JUMP" || state.mode === "FALL")) {
        recordLandingImpact();
        state.mode = "IDLE";
        state.jumpData = null;
        state.fallHVel = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
        traversal.reset();
      } else if (state.grounded && state.verticalVelocity < 0) state.verticalVelocity = 0;
      // During knockback, facing may stay as is, speed reflects knockback
      state.speed = kb.speed;
      state.vel.set(kb.dir.x * kb.speed, 0, kb.dir.z * kb.speed);
      syncMesh(fixedDt);
      return;
    }

    if (state.dodgeCooldown > 0) state.dodgeCooldown = Math.max(0, state.dodgeCooldown - fixedDt);
    const worldDir = intentToWorldDir(intent);
    updateJumpRequestWindow(fixedDt, intent);

    if (climbing?.update(fixedDt, intent)) { syncMesh(fixedDt); return; }

    const canStartOrdinaryJump = state.mode !== "JUMP" && state.mode !== "DODGE" && state.mode !== "CLIMB" && state.mode !== "MANTLE";
    if (canStartOrdinaryJump && state.jumpBufferRemaining > 0 && (state.grounded || state.coyoteRemaining > 0)) {
      startOrdinaryJump();
    }

    // --- JUMP active (authored auto-jump, shares air model with FALL) ---
    if (state.mode === "JUMP" && state.jumpData) {
      const jd = state.jumpData;
      jd.time += fixedDt;
      // Authored pad thrusts retain their vector through the arc; ordinary jumps keep air control.
      if (!jd.lockHorizontal) applyAirborneHorizontalControl(fixedDt, worldDir, jd.hVel);
      state.verticalVelocity -= (moveCfg.jumpGravity ?? 12) * fixedDt;
      const res = rapierMove(jd.hVel.x, jd.hVel.z, state.verticalVelocity, fixedDt);
      updateAirbornePeak();
      const hvLen = Math.hypot(jd.hVel.x, jd.hVel.z);
      if (hvLen > 0.1) state.facing = Math.atan2(jd.hVel.x, jd.hVel.z);
      state.speed = hvLen;
      state.vel.set(jd.hVel.x, 0, jd.hVel.z);

      // landing: grounded + descending; Rapier determines actual landing position — no horizontal magnet
      let landed = false;
      if (res.grounded && state.verticalVelocity <= 0.1) {
        landed = true;
      }
      // A long arc can become an ordinary fall, never an invented landing.
      if (!landed && jd.time > jd.airTime + 0.75) {
        state.mode = 'FALL'; state.fallHVel = { ...jd.hVel };
        state.jumpData = null; state.grounded = false;
        syncMesh(fixedDt); return;
      }

      if (landed) {
        if (res.grounded) recordLandingImpact();
        state.mode = "IDLE";
        state.jumpData = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
        state.grounded = true;
        state.speed = hvLen * 0.92;
        state.vel.set(jd.hVel.x, 0, jd.hVel.z);
        traversal.reset();
      }
      syncMesh(fixedDt);
      return;
    }

    // --- FALL active (ordinary ledge fall, shares same air model as JUMP) ---
    if (state.mode === "FALL") {
      beginAirborneTracking();
      // airborne horizontal control with frozen cap
      if (!state.fallHVel) state.fallHVel = { x: state.vel.x, z: state.vel.z };
      applyAirborneHorizontalControl(fixedDt, worldDir, state.fallHVel);
      state.verticalVelocity += (moveCfg.gravity ?? -12) * fixedDt;
      const hvLenBefore = Math.hypot(state.fallHVel.x, state.fallHVel.z);
      const res = rapierMove(state.fallHVel.x, state.fallHVel.z, state.verticalVelocity, fixedDt);
      updateAirbornePeak();
      const hvLen = Math.hypot(state.fallHVel.x, state.fallHVel.z);
      if (hvLen > 0.1) state.facing = Math.atan2(state.fallHVel.x, state.fallHVel.z);
      state.speed = hvLen;
      // keep vel in sync for landing carry
      state.vel.set(state.fallHVel.x, 0, state.fallHVel.z);
      if (res.grounded) {
        recordLandingImpact();
        state.mode = "IDLE";
        state.fallHVel = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
        state.grounded = true;
      }
      syncMesh(fixedDt);
      return;
    }

    // --- DODGE active ---
    if (state.mode === "DODGE") {
      state.dodgeTime -= fixedDt;
      const moveDist = moveCfg.dodgeSpeed * fixedDt;
      let vy = state.verticalVelocity;
      if (!state.grounded) {
        state.verticalVelocity += (moveCfg.gravity ?? -12) * fixedDt;
        vy = state.verticalVelocity;
      } else {
        vy = -0.5; // keep grounded
      }
      const desired = { x: state.dodgeDir.x * moveDist, y: vy * fixedDt, z: state.dodgeDir.z * moveDist };
      const res = characterPhysics.move(desired);
      syncPosFromPhysics();
      state.grounded = res.grounded;
      if (state.grounded && state.verticalVelocity < 0) state.verticalVelocity = 0;
      state.facing = Math.atan2(state.dodgeDir.x, state.dodgeDir.z);
      state.speed = moveCfg.dodgeSpeed;
      if (state.dodgeTime <= 0) {
        state.mode = "IDLE";
        state.speed = 0;
        state.vel.set(0, 0, 0);
        if (state.grounded) state.verticalVelocity = 0;
      }
      syncMesh(fixedDt);
      return;
    }

    // --- Ground / air: dodge request ---
    if (intent.dodgeRequested && state.dodgeCooldown <= 0) {
      const dodgeIntent = { ...intent, _fromSwipe: !!intent.dodgeX };
      if (startDodge(dodgeIntent, worldDir)) {
        syncMesh(fixedDt);
        return;
      }
    }

    // Authored entrances share physical movement, exit checks and fall resets.
    const climbBottom = traversal.tryStartClimbBottom(worldDir, state.pos, intent.moveMagnitude);
    const climbTop = climbBottom ? null : traversal.tryStartClimbTop(worldDir, state.pos, intent.moveMagnitude, state.pos.y);
    if ((climbBottom || climbTop) && climbing?.startAuthored(climbBottom || climbTop)) {
      syncMesh(fixedDt); return;
    }

    // --- Jump (authored) — preserves actual horizontal velocity and uses shared air model ---
    const band = classifyMovementBand(intent.moveMagnitude, moveCfg);
    const targetSpeed = getBandSpeed(band, moveCfg) * moveSpeedMultiplier;
    const effSpeed = Math.max(state.speed, targetSpeed);
    const jumpHit = traversal.tryStartJump(worldDir, state.pos, effSpeed, intent.moveMagnitude);
    if (jumpHit) {
      const travState = traversal.getState();
      state.mode = "JUMP";
      // Preserve actual horizontal velocity; cap is max(walkSpeed, initialSpeed) — Run cannot boost cap after takeoff
      const initSpeed = travState.jumpInitialSpeed;
      state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, initSpeed);
      state.jumpData = {
        hVel: { x: travState.jumpHVel.x, z: travState.jumpHVel.z },
        initialSpeed: initSpeed,
        landingRegion: travState.jumpLandingRegion,
        maxLandingCorrection: jumpHit.traversal.maxLandingCorrection,
        airTime: travState.jumpAirTime,
        time: 0,
      };
      state.verticalVelocity = moveCfg.jumpInitialVerticalVelocity ?? 5.8;
      state.grounded = false;
      beginAirborneTracking();
      // keep horizontal vel for shared air model — jumpData.hVel already reflects initialSpeed/direction
      state.vel.set(state.jumpData.hVel.x, 0, state.jumpData.hVel.z);
      if (travState.jumpDirection) state.facing = Math.atan2(travState.jumpDirection.x, travState.jumpDirection.z);
      traversal.reset(); // we own jump now
      syncMesh(fixedDt);
      return;
    }
    // Clear any transient traversal JUMP that didn't convert (should not happen)
    if (traversal.getState().mode === "JUMP") traversal.reset();

    // --- Normal movement (grounded only) ---
    // If we are airborne without an active JUMP, treat as FALL (walk-off). This handles the first frame after leaving ground.
    if (!state.grounded && state.mode !== "JUMP") {
      beginAirborneTracking();
      // Preserve horizontal velocity at the moment of leaving ground; do not boost via bands
      const preSpeedAir = state.speed;
      state.mode = "FALL";
      state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, preSpeedAir);
      state.fallHVel = { x: state.vel.x, z: state.vel.z };
      // Apply shared air control for this frame (cap also affected by combat factor if attacking)
      let airModFactor = 1;
      if (combatOpts && combatOpts.attackActive) airModFactor = combatOpts.attackMovementFactor ?? 0.65;
      // Temporarily adjust cap for attack: we scale airCap? Simpler: apply factor to movement after control
      applyAirborneHorizontalControl(fixedDt, worldDir, state.fallHVel);
      if (airModFactor < 1) {
        const curSpeedAir = Math.hypot(state.fallHVel.x, state.fallHVel.z);
        const capped = Math.min(curSpeedAir, state.airCap * airModFactor);
        if (curSpeedAir > 1e-5 && capped < curSpeedAir) {
          const f = capped / curSpeedAir;
          state.fallHVel.x *= f;
          state.fallHVel.z *= f;
        }
      }
      state.verticalVelocity += (moveCfg.gravity ?? -12) * fixedDt;
      const hvLenAir = Math.hypot(state.fallHVel.x, state.fallHVel.z);
      if (hvLenAir > 0.1) {
        // Facing commit during attack?
        const facingLocked = combatOpts && combatOpts.facingLocked;
        if (!facingLocked) state.facing = Math.atan2(state.fallHVel.x, state.fallHVel.z);
        else if (combatOpts.lockFacing !== undefined) state.facing = combatOpts.lockFacing;
      }
      state.speed = hvLenAir;
      state.vel.set(state.fallHVel.x, 0, state.fallHVel.z);
      rapierMove(state.fallHVel.x, state.fallHVel.z, state.verticalVelocity, fixedDt);
      updateAirbornePeak();
      if (state.grounded) {
        recordLandingImpact();
        state.mode = "IDLE";
        state.fallHVel = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
      }
      syncMesh(fixedDt);
      return;
    }
    const wasGrounded = state.grounded;
    const preMoveFeetY = getFeetY();
    const preSpeed = state.speed;
    // Phase 3: cap locomotion during attack to 60-70% of normal current band speed, no sprint skating
    let effectiveTargetSpeed = targetSpeed;
    if (combatOpts && combatOpts.attackActive) {
      const factor = combatOpts.attackMovementFactor ?? 0.65;
      // Cap to factor of normal, and also never allow sprint speed while attacking
      const capped = targetSpeed * factor;
      // Also ensure sprint (6.0) is not reachable: cap further to walkSpeed maybe 3.3? Spec says no sprint-speed attack skating. So limit to factor*runSpeed but also <= walkSpeed? Use runSpeed*factor (~3.9) still high, but factor 0.65*6=3.9 close to run. Might need additional cap to walkSpeed? We'll cap to Math.min(capped, moveCfg.walkSpeed * 1.1)
      effectiveTargetSpeed = Math.min(capped, moveCfg.walkSpeed * 1.25);
    }
    tmpTargetVel.set(worldDir.x * effectiveTargetSpeed, 0, worldDir.z * effectiveTargetSpeed);
    tmpCurVel.set(state.vel.x, 0, state.vel.z);
    tmpDiff.subVectors(tmpTargetVel, tmpCurVel);
    const diffLen = tmpDiff.length();
    if (diffLen > 1e-5) {
      const accel = targetSpeed > state.speed ? moveCfg.acceleration : moveCfg.deceleration;
      const maxStep = accel * fixedDt;
      if (diffLen <= maxStep) tmpCurVel.copy(tmpTargetVel);
      else {
        tmpDiff.normalize().multiplyScalar(maxStep);
        tmpCurVel.add(tmpDiff);
      }
    }
    state.vel.copy(tmpCurVel);
    state.speed = tmpCurVel.length();

    // Facing driven by meaningful CURRENT INPUT, not residual velocity (fix last-moment rotation after release)
    // Phase 3: facing may briefly commit during attack impact — if facingLocked, skip input-driven rotation
    const facingLocked = combatOpts && combatOpts.facingLocked;
    if (facingLocked && combatOpts.lockFacing !== undefined) {
      state.facing = combatOpts.lockFacing;
    } else {
      const facingThreshold = 0.18; // deadzone+epsilon, covers joystick lift & keyboard key-up
      const inputMag = intent ? (intent.moveMagnitude ?? Math.hypot(intent.moveX ?? 0, intent.moveY ?? 0)) : 0;
      if (inputMag > facingThreshold && worldDir.len > 1e-6) {
        const desiredYaw = Math.atan2(worldDir.x, worldDir.z);
        let yawDiff = desiredYaw - state.facing;
        yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
        const turnStep = moveCfg.turnSpeed * fixedDt;
        const yawStep = Math.max(-turnStep, Math.min(turnStep, yawDiff));
        state.facing += yawStep;
      }
    }

    if (state.speed < 0.05) state.mode = "IDLE";
    else if (band === "sneak") state.mode = "SNEAK";
    else if (band === "walk") state.mode = "WALK";
    else if (band === "run") state.mode = "RUN";

    const gravity = moveCfg.gravity ?? -12;
    if (!state.grounded) {
      state.verticalVelocity += gravity * fixedDt;
    } else if (state.verticalVelocity < 0) {
      state.verticalVelocity = 0;
    }

    rapierMove(state.vel.x, state.vel.z, state.verticalVelocity, fixedDt);

    // Transition to FALL if we just left ground without authored JUMP (walk/fall off ledge)
    if (!state.grounded && wasGrounded && state.mode !== "JUMP") {
      beginAirborneTracking(preMoveFeetY);
      state.mode = "FALL";
      // Preserve actual horizontal velocity at takeoff, cap at max(walkSpeed, preSpeed)
      state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, preSpeed);
      state.fallHVel = { x: state.vel.x, z: state.vel.z };
      // speed stays as preSpeed-derived; no band boost
    }

    syncMesh(fixedDt);
  }

  function getState() {
    const trav = traversal.getState();
    const mode = state.mode !== "IDLE" ? state.mode : trav.mode !== "IDLE" ? trav.mode : state.mode;
    return {
      mode,
      speed: state.speed,
      facing: state.facing,
      pos: state.pos.clone(),
      dodgeCooldown: state.dodgeCooldown,
      traversalMode: state.mode === "JUMP" || state.mode === "FALL" || state.mode === "CLIMB" || state.mode === "MANTLE" ? state.mode : trav.mode,
      grounded: state.grounded,
      verticalVelocity: state.verticalVelocity,
      climbVelocity: state.climbVelocity,
    };
  }

  snapRenderPose();
  return { update, getState, getRenderPose, prepareRender, snapRenderPose, state, traversal, visuals, syncPosFromPhysics, launchFromJumpPad, cancelPendingJump, resetJumpState, consumeLandingImpact, setMoveSpeedMultiplier,
    getClimbInteraction:(dt,options)=>climbing?.interaction(dt,options)??null,
    activateClimb:info=>info?.action==='drop'?climbing?.detach():climbing?.startNatural(info?.candidate),
    cancelClimb:()=>climbing?.detach(), isClimbing:()=>climbing?.isActive()??false };
}
