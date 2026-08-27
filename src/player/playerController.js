import * as THREE from "three";
import { getBandSpeed, classifyMovementBand } from "../movement/movementBands.js";
import { createTraversalController, computeMantleEndpoints } from "../movement/traversalController.js";
import { createPlayerVisuals } from "./playerVisuals.js";

// Phase 1.2 — Rapier KinematicCharacterController migration.
// Wildkin owns intent/speeds/accel/facing/dodge/jump/climb. Rapier owns collision/slide/grounding.

export function createPlayerController(playerMesh, playground, camera, moveCfg, characterPhysics) {
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
    fallHVel: null,
    climbable: null,
    climbTime: 0,
    mantleData: null,
  };

  const tmpDir = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpTargetVel = new THREE.Vector3();
  const tmpCurVel = new THREE.Vector3();
  const tmpDiff = new THREE.Vector3();

  const traversal = createTraversalController(playground, moveCfg);
  const visuals = createPlayerVisuals(playerMesh);

  function syncPosFromPhysics() {
    if (!characterPhysics) return;
    const p = characterPhysics.getPosition();
    state.pos.set(p.x, p.y, p.z);
  }
  if (characterPhysics) syncPosFromPhysics();

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

  function launchFromJumpPad({ direction, horizontalLaunch, verticalLaunch }) {
    if (!direction || !Number.isFinite(horizontalLaunch) || !Number.isFinite(verticalLaunch)) return false;
    const length = Math.hypot(direction.x, direction.z);
    if (length < 1e-6 || horizontalLaunch <= 0 || verticalLaunch <= 0) return false;
    const dirX = direction.x / length;
    const dirZ = direction.z / length;
    traversal.reset();
    state.mode = "JUMP";
    state.jumpData = {
      hVel: { x: dirX * horizontalLaunch, z: dirZ * horizontalLaunch },
      initialSpeed: horizontalLaunch,
      landingRegion: null,
      maxLandingCorrection: 0,
      airTime: (2 * verticalLaunch) / (moveCfg.jumpGravity ?? 12),
      time: 0,
      source: "jumpPad",
    };
    state.airCap = Math.max(moveCfg.airMinSpeedCap ?? moveCfg.walkSpeed, horizontalLaunch);
    state.verticalVelocity = verticalLaunch;
    state.grounded = false;
    state.speed = horizontalLaunch;
    state.vel.set(dirX * horizontalLaunch, 0, dirZ * horizontalLaunch);
    state.facing = Math.atan2(dirX, dirZ);
    state.fallHVel = null;
    state.climbable = null;
    state.mantleData = null;
    return true;
  }

  function syncMesh(dt) {
    playerMesh.position.copy(state.pos);
    let visualMode = state.mode;
    // traversal debug mode override if needed
    const travMode = traversal.getState().mode;
    if (travMode !== "IDLE" && state.mode === "IDLE") visualMode = travMode;
    playerMesh.rotation.y = state.facing;
    visuals.sync(dt, { mode: visualMode, speed: state.speed });
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

    // Phase 3: handle knockback if provided via combatOpts
    if (combatOpts && combatOpts.knockback && combatOpts.knockback.remaining > 0) {
      const kb = combatOpts.knockback;
      const desired = { x: kb.dir.x * kb.speed * fixedDt, y: (state.verticalVelocity * fixedDt), z: kb.dir.z * kb.speed * fixedDt };
      const res = characterPhysics.move(desired);
      syncPosFromPhysics();
      state.grounded = res.grounded;
      if (state.grounded && state.verticalVelocity < 0) state.verticalVelocity = 0;
      // During knockback, facing may stay as is, speed reflects knockback
      state.speed = kb.speed;
      state.vel.set(kb.dir.x * kb.speed, 0, kb.dir.z * kb.speed);
      syncMesh(fixedDt);
      return;
    }

    if (state.dodgeCooldown > 0) state.dodgeCooldown = Math.max(0, state.dodgeCooldown - fixedDt);
    const worldDir = intentToWorldDir(intent);

    // --- JUMP active (authored auto-jump, shares air model with FALL) ---
    if (state.mode === "JUMP" && state.jumpData) {
      const jd = state.jumpData;
      jd.time += fixedDt;
      // shared airborne horizontal control — ignores band speeds, uses airAcceleration/decel + frozen cap
      applyAirborneHorizontalControl(fixedDt, worldDir, jd.hVel);
      state.verticalVelocity -= (moveCfg.jumpGravity ?? 12) * fixedDt;
      const res = rapierMove(jd.hVel.x, jd.hVel.z, state.verticalVelocity, fixedDt);
      const hvLen = Math.hypot(jd.hVel.x, jd.hVel.z);
      if (hvLen > 0.1) state.facing = Math.atan2(jd.hVel.x, jd.hVel.z);
      state.speed = hvLen;

      // landing: grounded + descending; Rapier determines actual landing position — no horizontal magnet
      let landed = false;
      if (res.grounded && state.verticalVelocity <= 0.1) {
        landed = true;
      }
      // timeout fallback (prevents infinite air if grounded never reported)
      if (jd.time > jd.airTime + 0.75) landed = true;

      if (landed) {
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
      // airborne horizontal control with frozen cap
      if (!state.fallHVel) state.fallHVel = { x: state.vel.x, z: state.vel.z };
      applyAirborneHorizontalControl(fixedDt, worldDir, state.fallHVel);
      state.verticalVelocity += (moveCfg.gravity ?? -12) * fixedDt;
      const hvLenBefore = Math.hypot(state.fallHVel.x, state.fallHVel.z);
      const res = rapierMove(state.fallHVel.x, state.fallHVel.z, state.verticalVelocity, fixedDt);
      const hvLen = Math.hypot(state.fallHVel.x, state.fallHVel.z);
      if (hvLen > 0.1) state.facing = Math.atan2(state.fallHVel.x, state.fallHVel.z);
      state.speed = hvLen;
      // keep vel in sync for landing carry
      state.vel.set(state.fallHVel.x, 0, state.fallHVel.z);
      if (res.grounded) {
        state.mode = "IDLE";
        state.fallHVel = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
        state.grounded = true;
      }
      syncMesh(fixedDt);
      return;
    }

    // --- CLIMB active ---
    if (state.mode === "CLIMB" && state.climbable) {
      const climb = state.climbable;
      const approach = climb.approachDir;
      const forwardDot = worldDir ? worldDir.x * approach.x + worldDir.z * approach.z : 0;
      const mag = intent ? intent.moveMagnitude : 0;
      let climbInput = 0;
      if (mag > 0.12) {
        climbInput = forwardDot * mag;
        if (Math.abs(forwardDot) < 0.28) climbInput *= 0.35;
      }
      // No input = pause (not falling)
      if (Math.abs(climbInput) < 1e-4) {
        state.speed = 0;
        state.verticalVelocity = 0;
        // Keep anchored
        const anchorX = climb.x - approach.x * 0.35;
        const anchorZ = climb.z - approach.z * 0.35;
        const snap = { x: anchorX - state.pos.x, y: 0, z: anchorZ - state.pos.z };
        // small snap only
        if (Math.hypot(snap.x, snap.z) > 0.02) {
          characterPhysics.move({ x: snap.x * 0.5, y: 0, z: snap.z * 0.5 });
          syncPosFromPhysics();
        }
        state.facing = Math.atan2(approach.x, approach.z);
        syncMesh(fixedDt);
        return;
      }
      const speed = climbInput >= 0 ? (moveCfg.climbSpeedUp ?? 1.9) : (moveCfg.climbSpeedDown ?? 1.7);
      const dy = climbInput * speed * fixedDt;
      const anchorX = climb.x - approach.x * 0.35;
      const anchorZ = climb.z - approach.z * 0.35;
      const dx = anchorX - state.pos.x;
      const dz = anchorZ - state.pos.z;
      const desired = { x: dx, y: dy, z: dz };
      // limit snap speed
      const maxSnap = 5 * fixedDt;
      if (Math.abs(desired.x) > maxSnap) desired.x = Math.sign(desired.x) * maxSnap;
      if (Math.abs(desired.z) > maxSnap) desired.z = Math.sign(desired.z) * maxSnap;
      state.verticalVelocity = 0;
      characterPhysics.move(desired);
      syncPosFromPhysics();
      state.speed = Math.abs(climbInput * speed);
      state.facing = Math.atan2(approach.x, approach.z);
      state.climbTime += fixedDt;

      const capsuleH = characterPhysics.cfg.capsuleTotalHeight;
      const half = capsuleH / 2;
      const bottomY = half + 0.02;
      const topY = climb.topY + half;
      if (state.pos.y >= topY - 0.08 && climbInput > 0.05) {
        // start mantle
        state.pos.y = topY;
        characterPhysics.setPosition({ x: state.pos.x, y: state.pos.y, z: state.pos.z });
        syncPosFromPhysics();
        const endpoints = computeMantleEndpoints(climb, { x: state.pos.x, y: state.pos.y, z: state.pos.z }, moveCfg);
        state.mantleData = {
          start: endpoints.start,
          end: endpoints.end,
          time: 0,
          duration: moveCfg.mantleDuration ?? 0.28,
          climbable: climb,
        };
        traversal.reset();
        state.mode = "MANTLE";
        state.climbable = null;
        syncMesh(fixedDt);
        return;
      }
      if (state.pos.y <= bottomY + 0.05 && climbInput < -0.08) {
        state.mode = "IDLE";
        state.climbable = null;
        state.climbTime = 0;
        state.verticalVelocity = 0;
        // push away from wall
        const push = { x: -approach.x * 0.5, y: 0, z: -approach.z * 0.5 };
        characterPhysics.move(push);
        syncPosFromPhysics();
        traversal.reset();
        syncMesh(fixedDt);
        return;
      }
      // clamp
      if (state.pos.y < bottomY) {
        const c = bottomY - state.pos.y;
        characterPhysics.move({ x: 0, y: c, z: 0 });
        syncPosFromPhysics();
      }
      if (state.pos.y > topY) {
        const c = topY - state.pos.y;
        characterPhysics.move({ x: 0, y: c, z: 0 });
        syncPosFromPhysics();
      }
      syncMesh(fixedDt);
      return;
    }

    // --- MANTLE active ---
    if (state.mode === "MANTLE" && state.mantleData) {
      const md = state.mantleData;
      md.time += fixedDt;
      const t = Math.min(1, md.time / md.duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const arc = Math.sin(Math.PI * t) * 0.22;
      const target = {
        x: md.start.x + (md.end.x - md.start.x) * eased,
        y: md.start.y + (md.end.y - md.start.y) * eased + arc,
        z: md.start.z + (md.end.z - md.start.z) * eased,
      };
      const desired = { x: target.x - state.pos.x, y: target.y - state.pos.y, z: target.z - state.pos.z };
      // Mantle should be collision-aware; controller will slide/stop if blocked
      if (characterPhysics.isCapsuleAtPositionClear && !characterPhysics.isCapsuleAtPositionClear(target)) {
        // If target blocked, try without arc
        desired.y -= arc;
      }
      characterPhysics.move(desired);
      syncPosFromPhysics();
      state.speed = 1.1;
      if (md.climbable) {
        const a = md.climbable.approachDir;
        state.facing = Math.atan2(a.x, a.z);
      }
      if (t >= 1) {
        // ensure final pos
        const final = { x: md.end.x - state.pos.x, y: md.end.y - state.pos.y, z: md.end.z - state.pos.z };
        characterPhysics.move(final);
        syncPosFromPhysics();
        state.mode = "IDLE";
        state.mantleData = null;
        state.verticalVelocity = 0;
        state.grounded = true;
        traversal.reset();
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

    // --- Climb entries ---
    const climbBottom = traversal.tryStartClimbBottom(worldDir, state.pos, intent.moveMagnitude);
    if (climbBottom) {
      state.mode = "CLIMB";
      state.climbable = climbBottom;
      state.climbTime = 0;
      state.verticalVelocity = 0;
      const approach = climbBottom.approachDir;
      const targetX = climbBottom.x - approach.x * 0.35;
      const targetZ = climbBottom.z - approach.z * 0.35;
      const snap = { x: targetX - state.pos.x, y: 0, z: targetZ - state.pos.z };
      characterPhysics.move(snap);
      syncPosFromPhysics();
      state.facing = Math.atan2(approach.x, approach.z);
      traversal.reset(); // we manage climb ourselves, keep traversal idle
      state.climbable = climbBottom;
      syncMesh(fixedDt);
      return;
    }
    const climbTop = traversal.tryStartClimbTop(worldDir, state.pos, intent.moveMagnitude, state.pos.y);
    if (climbTop) {
      state.mode = "CLIMB";
      state.climbable = climbTop;
      state.climbTime = 0;
      state.verticalVelocity = 0;
      const approach = climbTop.approachDir;
      const targetX = climbTop.x - approach.x * 0.35;
      const targetZ = climbTop.z - approach.z * 0.35;
      const snap = { x: targetX - state.pos.x, y: 0, z: targetZ - state.pos.z };
      characterPhysics.move(snap);
      syncPosFromPhysics();
      state.facing = Math.atan2(approach.x, approach.z);
      traversal.reset();
      state.climbable = climbTop;
      syncMesh(fixedDt);
      return;
    }

    // --- Jump (authored) — preserves actual horizontal velocity and uses shared air model ---
    const band = classifyMovementBand(intent.moveMagnitude, moveCfg);
    const targetSpeed = getBandSpeed(band, moveCfg);
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
      if (state.grounded) {
        state.mode = "IDLE";
        state.fallHVel = null;
        state.airCap = 0;
        state.verticalVelocity = 0;
      }
      syncMesh(fixedDt);
      return;
    }
    const wasGrounded = state.grounded;
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
    };
  }

  return { update, getState, state, traversal, visuals, syncPosFromPhysics, launchFromJumpPad };
}
