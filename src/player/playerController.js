import * as THREE from "three";
import { getBandSpeed, classifyMovementBand } from "../movement/movementBands.js";
import { resolveMovement } from "../world/collision.js";
import { createTraversalController } from "../movement/traversalController.js";
import { createPlayerVisuals } from "./playerVisuals.js";

export function createPlayerController(playerMesh, playground, camera, moveCfg) {
  const state = {
    mode: "IDLE",
    pos: new THREE.Vector3().copy(playerMesh.position),
    vel: new THREE.Vector3(0, 0, 0),
    facing: 0,
    speed: 0,
    dodgeCooldown: 0,
    dodgeTime: 0,
    dodgeDir: new THREE.Vector3(0, 0, 0),
  };

  // Reusable temp vectors to avoid per-frame allocation
  const tmpDir = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpTargetVel = new THREE.Vector3();
  const tmpCurVel = new THREE.Vector3();
  const tmpDiff = new THREE.Vector3();

  const traversal = createTraversalController(playground, moveCfg);
  const visuals = createPlayerVisuals(playerMesh);

  function getGroundY(x, z, currentY) {
    const h = playground.getGroundHeight(x, z, currentY ?? state.pos.y);
    return h + 0.36;
  }

  // Ensure pos y is ground-based
  state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y);

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
      if (intent._fromSwipe) {
        dir = screenVectorToWorld(intent.dodgeX, intent.dodgeY);
      } else {
        const sx = intent.dodgeX;
        const sy = intent.dodgeY;
        if (Math.hypot(sx, sy) > 1e-6) {
          dir = screenVectorToWorld(sx, sy);
        }
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
    return true;
  }

  function syncMesh(dt) {
    // Copy position
    playerMesh.position.copy(state.pos);
    // Determine active mode for visuals (traversal overrides grounded)
    const travState = traversal.getState();
    let visualMode = state.mode;
    if (travState.mode !== "IDLE") visualMode = travState.mode;
    playerMesh.rotation.y = state.facing;
    visuals.sync(dt, { mode: visualMode, speed: state.speed });
  }

  function update(dt, intent) {
    const clampedDt = Math.min(dt, moveCfg.maxDelta);
    if (clampedDt <= 0) return;

    if (state.dodgeCooldown > 0) state.dodgeCooldown = Math.max(0, state.dodgeCooldown - clampedDt);

    const worldDir = intentToWorldDir(intent);

    // Delegate to traversal if active
    const travMode = traversal.getState().mode;
    if (travMode === "JUMP") {
      const res = traversal.updateJump(clampedDt, intent, worldDir, state.pos);
      // Update facing to jump direction
      const hv = traversal.getState().jumpHVel;
      if (hv && (hv.x !== 0 || hv.z !== 0)) {
        const len = Math.hypot(hv.x, hv.z);
        if (len > 0.1) state.facing = Math.atan2(hv.x, hv.z);
      }
      state.speed = Math.hypot(hv ? hv.x : 0, hv ? hv.z : 0);
      if (res.landed) {
        state.mode = "IDLE";
        state.speed = res.landingSpeed ?? state.speed * 0.92;
        // carry a bit of horizontal velocity into next frame
        tmpCurVel.set(traversal.getState().jumpHVel?.x ?? 0, 0, traversal.getState().jumpHVel?.z ?? 0);
        state.vel.copy(tmpCurVel);
      }
      syncMesh(clampedDt);
      return;
    }
    if (travMode === "CLIMB") {
      const res = traversal.updateClimb(clampedDt, intent, worldDir, state.pos);
      state.speed = Math.abs((intent.moveMagnitude ?? 0) * (moveCfg.climbSpeedUp ?? 1.9));
      const climbDir = traversal.getState().climbable?.approachDir;
      if (climbDir) state.facing = Math.atan2(climbDir.x, climbDir.z);
      if (res.mantleStarted) {
        // will transition to MANTLE next frame
        state.mode = "MANTLE";
      } else if (!res.stillClimbing) {
        state.mode = "IDLE";
        state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y);
      }
      syncMesh(clampedDt);
      return;
    }
    if (travMode === "MANTLE") {
      const res = traversal.updateMantle(clampedDt, state.pos);
      const climbDir = traversal.getState().climbable?.approachDir;
      if (climbDir) state.facing = Math.atan2(climbDir.x, climbDir.z);
      state.speed = 1.1;
      if (res.finished) {
        state.mode = "IDLE";
        state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y);
      }
      syncMesh(clampedDt);
      return;
    }

    // Grounded: dodge takes precedence and must not convert to jump
    if (state.mode === "DODGE") {
      state.dodgeTime -= clampedDt;
      const moveDist = moveCfg.dodgeSpeed * clampedDt;
      const nextX = state.pos.x + state.dodgeDir.x * moveDist;
      const nextZ = state.pos.z + state.dodgeDir.z * moveDist;
      const from = { x: state.pos.x, z: state.pos.z };
      const to = { x: nextX, z: nextZ };
      const activeObs = playground.getCollisionObstaclesForHeight(state.pos.y);
      const resolved = resolveMovement(from, to, moveCfg.playerRadius, activeObs, playground.bounds);
      state.pos.x = resolved.x;
      state.pos.z = resolved.z;
      state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y) + 0.08;
      state.facing = Math.atan2(state.dodgeDir.x, state.dodgeDir.z);
      state.speed = moveCfg.dodgeSpeed;
      if (state.dodgeTime <= 0) {
        state.mode = "IDLE";
        state.speed = 0;
        state.vel.set(0, 0, 0);
        state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y);
      }
      syncMesh(clampedDt);
      return;
    }

    // Ground locomotion: check dodge request first
    if (intent.dodgeRequested && state.dodgeCooldown <= 0) {
      const dodgeIntent = { ...intent, _fromSwipe: !!intent.dodgeX };
      if (startDodge(dodgeIntent, worldDir)) {
        syncMesh(clampedDt);
        return;
      }
    }

    // Check climb bottom/top entries before jump
    const climbBottom = traversal.tryStartClimbBottom(worldDir, state.pos, intent.moveMagnitude);
    if (climbBottom) {
      state.mode = "CLIMB";
      const approach = climbBottom.approachDir;
      state.pos.x = climbBottom.x - approach.x * 0.35;
      state.pos.z = climbBottom.z - approach.z * 0.35;
      state.facing = Math.atan2(approach.x, approach.z);
      syncMesh(clampedDt);
      return;
    }
    const climbTop = traversal.tryStartClimbTop(worldDir, state.pos, intent.moveMagnitude, state.pos.y);
    if (climbTop) {
      state.mode = "CLIMB";
      const approach = climbTop.approachDir;
      state.pos.x = climbTop.x - approach.x * 0.35;
      state.pos.z = climbTop.z - approach.z * 0.35;
      state.facing = Math.atan2(approach.x, approach.z);
      syncMesh(clampedDt);
      return;
    }

    // Check jump (must not snap to authored start; traversal uses actual pos)
    const band = classifyMovementBand(intent.moveMagnitude, moveCfg);
    const targetSpeed = getBandSpeed(band, moveCfg);
    const effSpeed = Math.max(state.speed, targetSpeed);
    // Avoid triggering jump with negligible intent
    const jumpHit = traversal.tryStartJump(worldDir, state.pos, effSpeed, intent.moveMagnitude);
    if (jumpHit) {
      state.mode = "JUMP";
      // facing already set inside traversal, sync to traversal dir
      const jd = traversal.getState().jumpDirection;
      if (jd) state.facing = Math.atan2(jd.x, jd.z);
      syncMesh(clampedDt);
      return;
    }

    // Normal movement
    tmpTargetVel.set(worldDir.x * targetSpeed, 0, worldDir.z * targetSpeed);
    tmpCurVel.set(state.vel.x, 0, state.vel.z);
    tmpDiff.subVectors(tmpTargetVel, tmpCurVel);
    const diffLen = tmpDiff.length();
    if (diffLen > 1e-5) {
      const accel = targetSpeed > state.speed ? moveCfg.acceleration : moveCfg.deceleration;
      const maxStep = accel * clampedDt;
      if (diffLen <= maxStep) {
        tmpCurVel.copy(tmpTargetVel);
      } else {
        tmpDiff.normalize().multiplyScalar(maxStep);
        tmpCurVel.add(tmpDiff);
      }
    }
    state.vel.copy(tmpCurVel);
    state.speed = tmpCurVel.length();

    if (state.speed > 1e-4) {
      const nextX = state.pos.x + state.vel.x * clampedDt;
      const nextZ = state.pos.z + state.vel.z * clampedDt;
      const from = { x: state.pos.x, z: state.pos.z };
      const to = { x: nextX, z: nextZ };
      const activeObs = playground.getCollisionObstaclesForHeight(state.pos.y);
      const resolved = resolveMovement(from, to, moveCfg.playerRadius, activeObs, playground.bounds);
      state.pos.x = resolved.x;
      state.pos.z = resolved.z;
      const desiredYaw = Math.atan2(worldDir.x, worldDir.z);
      let yawDiff = desiredYaw - state.facing;
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      const turnStep = moveCfg.turnSpeed * clampedDt;
      const yawStep = Math.max(-turnStep, Math.min(turnStep, yawDiff));
      state.facing += yawStep;
    }

    if (state.speed < 0.05) state.mode = "IDLE";
    else if (band === "sneak") state.mode = "SNEAK";
    else if (band === "walk") state.mode = "WALK";
    else if (band === "run") state.mode = "RUN";

    const targetY = getGroundY(state.pos.x, state.pos.z, state.pos.y);
    const yDiff = targetY - state.pos.y;
    if (Math.abs(yDiff) > 0.001) {
      const yStep = Math.sign(yDiff) * Math.min(Math.abs(yDiff), 8 * clampedDt);
      state.pos.y += yStep;
      if (state.mode === "IDLE" && Math.abs(yDiff) < 0.02) state.pos.y = targetY;
    } else {
      state.pos.y = targetY;
    }

    // Stuck resolver: if falling off high platform leaves player inside side collider at ground, push out
    if (playground.resolveStuckPosition) {
      playground.resolveStuckPosition(state.pos, moveCfg.playerRadius, state.pos.y);
      // re-sync Y after push (may be outside platform now)
      state.pos.y = getGroundY(state.pos.x, state.pos.z, state.pos.y);
    }

    syncMesh(clampedDt);
  }

  function getState() {
    const trav = traversal.getState();
    const mode = trav.mode !== "IDLE" ? trav.mode : state.mode;
    return { mode, speed: state.speed, facing: state.facing, pos: state.pos.clone(), dodgeCooldown: state.dodgeCooldown, traversalMode: trav.mode };
  }

  return { update, getState, state, traversal, visuals };
}
