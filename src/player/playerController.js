import * as THREE from "three";
import { getBandSpeed, classifyMovementBand } from "../movement/movementBands.js";
import { resolveMovement, clampToBounds } from "../world/collision.js";

export function createPlayerController(playerMesh, playground, camera, moveCfg) {
  const state = {
    mode: "IDLE", // IDLE|SNEAK|WALK|RUN|DODGE|JUMP|CLIMB
    pos: new THREE.Vector3().copy(playerMesh.position),
    vel: new THREE.Vector3(0, 0, 0),
    facing: 0, // yaw rad, 0 = +Z
    speed: 0,
    dodgeCooldown: 0,
    dodgeTime: 0,
    dodgeDir: new THREE.Vector3(0, 0, 0),
    jumpTime: 0,
    jumpDuration: moveCfg.jumpDuration,
    jumpStart: new THREE.Vector3(),
    jumpEnd: new THREE.Vector3(),
    climbTime: 0,
    climbTargetY: 0,
    climbClimbable: null,
  };

  // Ensure pos y is ground-based
  state.pos.y = getGroundY(state.pos.x, state.pos.z);

  let timeAcc = 0;
  let bobPhase = 0;

  function getGroundY(x, z) {
    const h = playground.getGroundHeight(x, z);
    return h + 0.36;
  }

  function getCameraBasis() {
    // Project camera direction onto ground plane
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();
    // forward = dir (points where camera looks, north -Z)
    const forward = dir.clone();
    // right = forward cross up (or cross) => east
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize(); // Wait forward cross up =? forward (0,0,-1) cross up (0,1,0)= (1,0,0) actually? Let's test: (0,0,-1) x (0,1,0)= (1,0,0) correct east. But forward cross up gives -right? Let's compute correctly: right = forward x up? For right-handed, right = cross(forward, up)? Actually camera forward north -Z, up Y, right should be east +X. Cross(forward, up)= ( -Z cross Y) => X? Check: (0,0,-1) x (0,1,0) = (1,0,0) correct. So forward x up = right
    // But we did crossVectors(forward, up) => (forward x up) => right
    // Need to verify: Use right = new THREE.Vector3().crossVectors(forward, up).normalize() gives (1,0,0) good.
    // Actually we used crossVectors(forward, up) but code above is forward.cross(up) => same.
    // Keep.
    return { forward, right };
  }

  function intentToWorldDir(intent) {
    if (!intent) return { x: 0, z: 0, len: 0 };
    const ix = intent.moveX;
    const iy = intent.moveY;
    const len = Math.hypot(ix, iy);
    if (len < 1e-6) return { x: 0, z: 0, len: 0 };
    const { forward, right } = getCameraBasis();
    // iy positive = down/south (+Z). Map -iy to forward so up = forward north
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

  function checkJumpTrigger(worldDir, pos, intent) {
    if (!worldDir || (worldDir.x === 0 && worldDir.z === 0)) return null;
    if (!intent || intent.moveMagnitude < 0.18) return null;
    for (const link of playground.jumpLinks) {
      const dx = pos.x - link.start.x;
      const dz = pos.z - link.start.z;
      const dist = Math.hypot(dx, dz);
      if (dist > (link.radius ?? moveCfg.jumpAutoTriggerRadius)) continue;
      const dot = worldDir.x * link.direction.x + worldDir.z * link.direction.z;
      if (dot < (moveCfg.jumpDirectionDotThreshold ?? 0.35)) continue;
      const linkLen = Math.hypot(link.end.x - link.start.x, link.end.z - link.start.z);
      if (linkLen > moveCfg.jumpMaxDistance) continue;
      return link;
    }
    return null;
  }

  function checkClimbEntry(worldDir, pos, intent) {
    // magnitude must be sufficient and moving into surface
    if (intent.moveMagnitude < 0.18) return null;
    if (!worldDir || (worldDir.x === 0 && worldDir.z === 0)) return null;
    for (const climb of playground.climbables) {
      // horizontal proximity to wall
      const dx = pos.x - climb.x;
      const dz = pos.z - climb.z;
      const horizDist = Math.hypot(dx, dz);
      if (horizDist > moveCfg.climbProximity) continue;
      // dot with approachDir (into wall)
      const dot = worldDir.x * climb.approachDir.x + worldDir.z * climb.approachDir.z;
      if (dot < moveCfg.climbEnterDot) continue;
      // Also check z-specific for south wall: pos must be south of wall
      // For our south-facing ladder, player should be south (z > wall z)
      // Allow generic via dot only
      return climb;
    }
    return null;
  }

  function startDodge(intent, worldDir) {
    let dir = null;
    if (intent.dodgeX !== undefined && intent.dodgeY !== undefined && (Math.abs(intent.dodgeX) > 1e-6 || Math.abs(intent.dodgeY) > 1e-6)) {
      // if dodgeX/Y came from swipe, they are screen-space normalized; convert
      if (intent._fromSwipe) {
        dir = screenVectorToWorld(intent.dodgeX, intent.dodgeY);
      } else {
        // keyboard dodgeX/Y already world-normalized? For keyboard we set dodgeX = moveX etc which is screen/input axes
        // Convert similarly via camera basis
        const sx = intent.dodgeX;
        const sy = intent.dodgeY;
        if (Math.hypot(sx, sy) > 1e-6) {
          dir = screenVectorToWorld(sx, sy);
        }
      }
    }
    // Fallbacks
    if (!dir || (dir.x === 0 && dir.z === 0)) {
      if (worldDir && (worldDir.x !== 0 || worldDir.z !== 0)) dir = worldDir;
      else {
        // use facing
        dir = { x: Math.sin(state.facing), z: Math.cos(state.facing) };
      }
    }
    // normalize
    const len = Math.hypot(dir.x, dir.z);
    if (len < 1e-6) return false;
    state.dodgeDir.set(dir.x / len, 0, dir.z / len);
    state.mode = "DODGE";
    state.dodgeTime = moveCfg.dodgeDuration;
    state.dodgeCooldown = moveCfg.dodgeCooldown;
    // small vertical lift for visual
    return true;
  }

  function startJump(link) {
    state.mode = "JUMP";
    state.jumpTime = 0;
    state.jumpDuration = moveCfg.jumpDuration;
    state.jumpStart.set(link.start.x, getGroundY(link.start.x, link.start.z), link.start.z);
    state.jumpEnd.set(link.end.x, getGroundY(link.end.x, link.end.z), link.end.z);
    // Snap start to ensure arc continuity (player may be slightly offset)
    state.pos.copy(state.jumpStart);
    // facing toward jump direction
    state.facing = Math.atan2(link.direction.x, link.direction.z);
  }

  function startClimb(climb) {
    state.mode = "CLIMB";
    state.climbClimbable = climb;
    state.climbTime = 0;
    // Snap XZ to climb wall anchor (slightly south of wall)
    const offset = 0.35;
    const approach = climb.approachDir;
    // place player slightly away from wall toward approach opposite
    // approach dir is into wall (north). So player should be south of wall.
    state.pos.x = climb.x - approach.x * offset;
    state.pos.z = climb.z - approach.z * offset;
    // keep current Y, will climb up
    state.climbTargetY = climb.topY + 0.36;
    // facing toward wall (north)
    state.facing = Math.atan2(approach.x, approach.z);
  }

  function update(dt, intent) {
    const clampedDt = Math.min(dt, moveCfg.maxDelta);
    if (clampedDt <= 0) return;

    // Cooldown tick
    if (state.dodgeCooldown > 0) state.dodgeCooldown = Math.max(0, state.dodgeCooldown - clampedDt);

    const worldDir = intentToWorldDir(intent);

    // Mode handlers
    if (state.mode === "DODGE") {
      state.dodgeTime -= clampedDt;
      const moveDist = moveCfg.dodgeSpeed * clampedDt;
      const nextX = state.pos.x + state.dodgeDir.x * moveDist;
      const nextZ = state.pos.z + state.dodgeDir.z * moveDist;
      const from = { x: state.pos.x, z: state.pos.z };
      const to = { x: nextX, z: nextZ };
      const resolved = resolveMovement(from, to, moveCfg.playerRadius, playground.obstacles, playground.bounds);
      state.pos.x = resolved.x;
      state.pos.z = resolved.z;
      // slight hover during dodge
      state.pos.y = getGroundY(state.pos.x, state.pos.z) + 0.08;
      // facing stays dodge direction
      state.facing = Math.atan2(state.dodgeDir.x, state.dodgeDir.z);
      state.speed = moveCfg.dodgeSpeed;

      if (state.dodgeTime <= 0) {
        state.mode = "IDLE";
        state.speed = 0;
        state.vel.set(0, 0, 0);
        // snap Y to ground
        state.pos.y = getGroundY(state.pos.x, state.pos.z);
      }
      syncMesh(clampedDt, intent);
      return;
    }

    if (state.mode === "JUMP") {
      state.jumpTime += clampedDt;
      const t = Math.min(1, state.jumpTime / state.jumpDuration);
      // smoothstep
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const x = THREE.MathUtils.lerp(state.jumpStart.x, state.jumpEnd.x, eased);
      const z = THREE.MathUtils.lerp(state.jumpStart.z, state.jumpEnd.z, eased);
      const baseY = THREE.MathUtils.lerp(state.jumpStart.y, state.jumpEnd.y, eased);
      const arc = Math.sin(Math.PI * t) * moveCfg.jumpArcHeight;
      state.pos.set(x, baseY + arc, z);
      state.speed = Math.hypot(state.jumpEnd.x - state.jumpStart.x, state.jumpEnd.z - state.jumpStart.z) / state.jumpDuration;

      if (t >= 1) {
        state.pos.copy(state.jumpEnd);
        state.pos.y = getGroundY(state.pos.x, state.pos.z);
        state.mode = "IDLE";
        state.speed = 0;
      }
      syncMesh(clampedDt, intent);
      return;
    }

    if (state.mode === "CLIMB") {
      const climb = state.climbClimbable;
      // Determine vertical input: forward (north, into wall) = up, back = down
      const forwardDot = worldDir ? worldDir.x * climb.approachDir.x + worldDir.z * climb.approachDir.z : 0;
      const mag = intent.moveMagnitude;
      let climbInput = 0;
      if (mag > 0.12) {
        // Project intent onto approach axis
        climbInput = forwardDot * mag;
        // If moving mostly lateral, reduce vertical
        if (Math.abs(forwardDot) < 0.3) climbInput *= 0.4;
      }
      // Auto climb slowly even if idle slight? Require intentional; if no input, pause
      // For prototype, if no input, stay; if input away from wall, descend/exit
      const awayDot = forwardDot; // negative means away
      if (awayDot < moveCfg.climbExitDot && mag > 0.2) {
        // exit climb backward
        state.mode = "IDLE";
        state.pos.y = getGroundY(state.pos.x, state.pos.z);
        // nudge away
        state.pos.x += -climb.approachDir.x * 0.4;
        state.pos.z += -climb.approachDir.z * 0.4;
      } else {
        // Move vertically
        const dy = climbInput * moveCfg.climbSpeed * clampedDt;
        // If no input, also slowly auto proceed upward at 0.3x speed to prove interaction without friction? But spec says continuing movement moves along; so idle = no movement
        state.pos.y += dy;
        // Clamp between bottom and top
        const bottomY = getGroundY(climb.x - climb.approachDir.x * 0.35, climb.z - climb.approachDir.z * 0.35);
        const topY = climb.topY + 0.36;
        if (state.pos.y >= topY - 0.05) {
          // reached top
          state.pos.y = topY;
          // Place on platform top
          state.pos.x = climb.topPlatform.x;
          state.pos.z = climb.topPlatform.z - 0.5; // slightly south on platform
          state.mode = "IDLE";
          state.pos.y = getGroundY(state.pos.x, state.pos.z);
        } else if (state.pos.y <= bottomY) {
          state.pos.y = bottomY;
          // If at bottom and trying to go further down, exit
          if (climbInput < -0.1) {
            state.mode = "IDLE";
            state.pos.x += -climb.approachDir.x * 0.5;
            state.pos.z += -climb.approachDir.z * 0.5;
          }
        }
      }
      state.speed = Math.abs(climbInput) * moveCfg.climbSpeed;
      // facing toward wall
      state.facing = Math.atan2(climb.approachDir.x, climb.approachDir.z);
      syncMesh(clampedDt, intent);
      return;
    }

    // Ground locomotion
    // Check dodge request first
    if (intent.dodgeRequested && state.dodgeCooldown <= 0) {
      // tag for conversion
      const dodgeIntent = { ...intent, _fromSwipe: true };
      // For touch swipe, dodgeX/Y are screen normalized; for keyboard they are already like move dir but we treat similarly
      // Heuristic: if touch intent has dodge and no move, _fromSwipe true. For keyboard, dodge from keyboardIntent will not have _fromSwipe but screen conversion still works
      if (startDodge(dodgeIntent, worldDir)) {
        syncMesh(clampedDt, intent);
        return;
      }
    }

    // Check climb entry before jump (climb takes precedence when near wall)
    const climbCand = checkClimbEntry(worldDir, state.pos, intent);
    if (climbCand) {
      startClimb(climbCand);
      syncMesh(clampedDt, intent);
      return;
    }

    // Check jump trigger
    const jumpCand = checkJumpTrigger(worldDir, state.pos, intent);
    if (jumpCand) {
      startJump(jumpCand);
      syncMesh(clampedDt, intent);
      return;
    }

    // Normal movement
    const band = classifyMovementBand(intent.moveMagnitude, moveCfg);
    const targetSpeed = getBandSpeed(band, moveCfg);
    const targetVel = new THREE.Vector3(worldDir.x * targetSpeed, 0, worldDir.z * targetSpeed);

    // Acceleration / deceleration toward targetVel
    const curVel2 = new THREE.Vector3(state.vel.x, 0, state.vel.z);
    const diff = new THREE.Vector3().subVectors(targetVel, curVel2);
    const diffLen = diff.length();
    if (diffLen > 1e-5) {
      const accel = targetSpeed > state.speed ? moveCfg.acceleration : moveCfg.deceleration;
      const maxStep = accel * clampedDt;
      if (diffLen <= maxStep) {
        curVel2.copy(targetVel);
      } else {
        diff.normalize().multiplyScalar(maxStep);
        curVel2.add(diff);
      }
    }
    state.vel.copy(curVel2);
    state.speed = curVel2.length();

    // Position integration with collision sliding
    if (state.speed > 1e-4) {
      const nextX = state.pos.x + state.vel.x * clampedDt;
      const nextZ = state.pos.z + state.vel.z * clampedDt;
      const from = { x: state.pos.x, z: state.pos.z };
      const to = { x: nextX, z: nextZ };
      const resolved = resolveMovement(from, to, moveCfg.playerRadius, playground.obstacles, playground.bounds);
      state.pos.x = resolved.x;
      state.pos.z = resolved.z;
      // Update facing to movement direction (quick but slightly smoothed)
      const desiredYaw = Math.atan2(worldDir.x, worldDir.z);
      let yawDiff = desiredYaw - state.facing;
      // wrap to -PI..PI
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      const turnStep = moveCfg.turnSpeed * clampedDt;
      const yawStep = Math.max(-turnStep, Math.min(turnStep, yawDiff));
      state.facing += yawStep;
    }

    // Update mode based on band & speed
    if (state.speed < 0.05) state.mode = "IDLE";
    else if (band === "sneak") state.mode = "SNEAK";
    else if (band === "walk") state.mode = "WALK";
    else if (band === "run") state.mode = "RUN";

    // Ground Y follow
    const targetY = getGroundY(state.pos.x, state.pos.z);
    // Smooth Y when stepping (pop avoidance)
    const yDiff = targetY - state.pos.y;
    if (Math.abs(yDiff) > 0.001) {
      const yStep = Math.sign(yDiff) * Math.min(Math.abs(yDiff), 8 * clampedDt);
      state.pos.y += yStep;
      if (state.mode === "IDLE" && Math.abs(yDiff) < 0.02) state.pos.y = targetY;
    } else {
      state.pos.y = targetY;
    }

    syncMesh(clampedDt, intent);
  }

  function syncMesh(dt, intent) {
    timeAcc += dt;
    // Bob节奏 based on mode
    let bobFreq = 0;
    let bobAmp = 0;
    let lean = 0;
    let heightScale = 1;

    switch (state.mode) {
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
      case "CLIMB":
        bobFreq = 4.0;
        bobAmp = 0.015;
        lean = -0.25; // lean into wall
        heightScale = 0.98;
        break;
    }

    bobPhase += dt * bobFreq;

    // Apply to mesh
    playerMesh.position.copy(state.pos);

    // Y bob (vertical offset already includes ground; add small bob except jump/climb where pos.y is authoritative)
    if (state.mode !== "JUMP" && state.mode !== "CLIMB") {
      playerMesh.position.y += Math.sin(bobPhase) * bobAmp * (state.speed > 0.1 ? 1 : 0.4);
    }

    // Facing
    playerMesh.rotation.y = state.facing;

    // Lean forward based on speed/state
    // Apply lean as rotation.x on inner body? We'll rotate whole group slightly x
    let targetLean = lean * Math.min(1, state.speed / 4);
    if (state.mode === "RUN") targetLean = 0.18;
    if (state.mode === "DODGE") targetLean = 0.30;
    if (state.mode === "CLIMB") targetLean = -0.35;
    // smooth lean
    const currentLean = playerMesh.rotation.x;
    const leanLerp = 1 - Math.exp(-10 * dt);
    playerMesh.rotation.x += (targetLean - currentLean) * leanLerp;

    // Height scale (sneak crouch / dodge squash)
    const targetScaleY = heightScale;
    const curScaleY = playerMesh.scale.y;
    playerMesh.scale.y += (targetScaleY - curScaleY) * (1 - Math.exp(-12 * dt));
    // subtle squash on dodge
    if (state.mode === "DODGE") {
      const squash = 1 + Math.sin(timeAcc * 22) * 0.06;
      playerMesh.scale.x = 1 + (squash - 1) * 0.5;
      playerMesh.scale.z = 1 + (squash - 1) * 0.5;
    } else {
      playerMesh.scale.x += (1 - playerMesh.scale.x) * 0.15;
      playerMesh.scale.z += (1 - playerMesh.scale.z) * 0.15;
    }
  }

  function getState() {
    return { mode: state.mode, speed: state.speed, facing: state.facing, pos: state.pos.clone(), dodgeCooldown: state.dodgeCooldown };
  }

  return { update, getState, state };
}
