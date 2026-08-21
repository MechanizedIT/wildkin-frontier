// src/creatures/creatureSystem.js — owns all wild creatures, AI, movement, health, respawn
import * as THREE from "three";
import { createWildCreature } from "./createWildCreature.js";
import { RUSHER_CONFIG, SPITTER_CONFIG, COMBAT_CONFIG } from "../combat/combatConfig.js";
import { CREATURE_SPAWNS } from "./creatureConfig.js";

export function createCreatureSystem(scene, physicsWorld, playground, opts = {}) {
  const creatures = [];
  let playerPosRef = { x: 0, y: 0.5, z: 5.5 };
  let playerStateRef = null;
  let isPlayerInvuln = () => false;

  const callbacks = {
    onCreatureDamaged: opts.onCreatureDamaged ?? (() => {}),
    onCreatureDied: opts.onCreatureDied ?? (() => {}),
    onPlayerDamage: opts.onPlayerDamage ?? (() => {}),
    onRequestProjectile: opts.onRequestProjectile ?? (() => {}),
  };

  // Create from spawns
  for (let i = 0; i < CREATURE_SPAWNS.length; i++) {
    const spawn = CREATURE_SPAWNS[i];
    const c = createWildCreature(scene, physicsWorld, spawn, i);
    creatures.push(c);
  }

  function setPlayerPos(pos) { playerPosRef = pos; }
  function setPlayerState(st) { playerStateRef = st; }
  function setInvulnChecker(fn) { isPlayerInvuln = fn; }

  function getAliveCount() { return creatures.filter(c => !c.state.isDead && c.state.aiState !== "RESPAWNING").length; }
  function getAggroedNearby() {
    return creatures.some(c => !c.state.isDead && c.state.isAggroed && distanceXZ(c.state.pos, playerPosRef) < COMBAT_CONFIG.attackRange + 2.5);
  }

  function distanceXZ(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function distance3D(a, b) {
    const dx = a.x - b.x, dy = (a.y ?? 0) - (b.y ?? 0), dz = a.z - b.z;
    return Math.hypot(dx, dy, dz);
  }

  function isVerticallyValid(c) {
    const py = playerPosRef.y ?? 0.5;
    const cy = c.state.pos.y ?? 0.5;
    const dy = Math.abs(py - cy);
    return dy <= COMBAT_CONFIG.verticalTolerance + 0.4; // for aggro, more permissive
  }

  function moveTowards(creature, targetPos, speed, dt) {
    const pos = creature.state.pos;
    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-5) return;
    const nx = dx / len, nz = dz / len;
    creature.state.facing = Math.atan2(nx, nz);
    const dist = speed * dt;
    creature.move({ x: nx * dist, y: 0, z: nz * dist });
  }

  function moveAway(creature, targetPos, speed, dt) {
    const pos = creature.state.pos;
    const dx = pos.x - targetPos.x;
    const dz = pos.z - targetPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len, nz = dz / len;
    creature.state.facing = Math.atan2(nx, nz);
    creature.move({ x: nx * speed * dt, y: 0, z: nz * speed * dt });
  }

  function wander(creature, dt) {
    // simple roam: slight random facing drift
    creature.state.aiTimer += dt;
    if (creature.state.aiTimer > 1.2 + Math.random()) {
      creature.state.facing += (Math.random() - 0.5) * 0.9;
      creature.state.aiTimer = 0;
    }
    const speed = creature.state.cfg.moveSpeed * 0.35;
    const f = creature.state.facing;
    creature.move({ x: Math.sin(f) * speed * dt, y: 0, z: Math.cos(f) * speed * dt });
  }

  function dealDamageToPlayer(creature, sourcePos) {
    if (isPlayerInvuln()) return false;
    const dmg = creature.state.cfg.damage ?? 1;
    const ok = callbacks.onPlayerDamage(dmg, sourcePos);
    return ok;
  }

  function damageCreature(creature, amount, sourcePos, knockbackDir) {
    if (creature.state.isDead) return false;
    if (creature.state.aiState === "RESPAWNING") return false;
    creature.state.health -= amount;
    // flash / hurt
    creature.state.hurtTime = creature.state.cfg.hurtLock ?? 0.16;
    creature.state.aiState = "HURT";
    creature.state.aiTimer = 0;
    callbacks.onCreatureDamaged(creature, amount);

    // knockback away from player
    if (knockbackDir) {
      const dist = creature.state.cfg.knockbackDistance ?? 0.7;
      creature.applyKnockback(knockbackDir, dist, 0.18);
    } else if (sourcePos) {
      const dx = creature.state.pos.x - sourcePos.x;
      const dz = creature.state.pos.z - sourcePos.z;
      const len = Math.hypot(dx, dz) || 1;
      const dir = { x: dx / len, z: dz / len };
      creature.applyKnockback(dir, creature.state.cfg.knockbackDistance ?? 0.7, 0.18);
    }

    // visual flash handled in updateVisual later (HURT state)
    if (creature.state.health <= 0) {
      killCreature(creature);
    }
    return true;
  }

  function killCreature(creature) {
    creature.state.isDead = true;
    creature.state.health = 0;
    creature.state.aiState = "DEAD";
    creature.state.aiTimer = 0;
    creature.state.isAggroed = false;
    // clear ring
    creature.showFocusRing(false);
    // disable collider? Keep but will not deal damage
    // death effect placeholder: scale pop then hide
    creature.group.scale.set(1, 1, 1);
    // callback will spawn XP and handle kill count; we hide after short death animation then mark RESPAWNING
    callbacks.onCreatureDied(creature);
    // After death animation (~0.5s), hide and start respawn timer
    creature.state.respawnRemaining = creature.state.cfg.respawnSeconds ?? 10;
    creature.state.aiState = "RESPAWNING";
    // hide mesh after short delay? We'll handle in update: while RESPAWNING, visible false after 0.4s
    setTimeout(() => {
      // not using setTimeout for gameplay, but for visual hide we handle in update tick
    }, 0);
  }

  function tryRespawn(creature, dt) {
    creature.state.respawnRemaining -= dt;
    if (creature.state.respawnRemaining > 0) return false;
    // Check not respawning inside player
    const spawn = creature.state.spawnPos;
    const dist = distanceXZ(spawn, playerPosRef);
    if (dist < 1.8) {
      // defer: keep respawnRemaining small
      creature.state.respawnRemaining = 0.5;
      return false;
    }
    // Reset
    creature.state.isDead = false;
    creature.state.health = creature.state.cfg.health;
    creature.state.aiState = "ROAM";
    creature.state.aiTimer = 0;
    creature.state.hurtTime = 0;
    creature.state.isAggroed = false;
    creature.state.facing = Math.random() * Math.PI * 2;
    const startY = spawn.y + creature.state.cfg.capsuleHalfHeight + creature.state.cfg.capsuleRadius + 0.05;
    const pos = { x: spawn.x, y: startY, z: spawn.z };
    creature.setPosition(pos);
    creature.group.visible = true;
    creature.group.scale.set(0.2, 0.2, 0.2);
    // pop animation will interpolate in updateVisual
    creature._respawnPop = 0;
    return true;
  }

  function update(dt) {
    // Update each creature AI
    for (const c of creatures) {
      const st = c.state;
      // Handle respawning
      if (st.aiState === "RESPAWNING") {
        c.group.visible = false; // hide while waiting
        // Still need to update visual scale pop? Hidden.
        tryRespawn(c, dt);
        if (st.aiState !== "RESPAWNING") {
          // Just respawned: make visible and animate pop in next frames
          c.group.visible = true;
          st.aiState = "ROAM";
        }
        continue;
      }
      if (st.isDead) {
        // Should be RESPAWNING now; if not, keep handling death hide
        continue;
      }

      // Hurt lock
      if (st.aiState === "HURT") {
        st.hurtTime -= dt;
        st.aiTimer += dt;
        c.updateVisual(dt);
        if (st.hurtTime <= 0) {
          st.aiState = "ALERT"; // go back to chase logic
          st.aiTimer = 0;
        }
        continue;
      }

      // General aggro check
      const distToPlayer = distanceXZ(st.pos, playerPosRef);
      const aggroRadius = st.cfg.aggroRadius ?? 5.5;
      const verticallyOk = isVerticallyValid(c);
      if (!st.isAggroed && distToPlayer <= aggroRadius && verticallyOk) {
        st.isAggroed = true;
        st.aiState = "ALERT";
        st.aiTimer = 0;
      }
      if (st.isAggroed && distToPlayer > aggroRadius + 1.5) {
        // de-aggro after distance
        // But keep aggro if recently in combat? For now distance based
        // Also check vertical invalid -> deaggro
        if (!verticallyOk || distToPlayer > aggroRadius + 3.0) {
          st.isAggroed = false;
          st.aiState = "ROAM";
          st.aiTimer = 0;
        }
      }

      // AI state machine per type
      if (st.type === "rusher") {
        updateRusher(c, dt, distToPlayer);
      } else if (st.type === "spitter") {
        updateSpitter(c, dt, distToPlayer);
      }

      c.updateVisual(dt);

      // Pop animation for respawn
      if (c._respawnPop !== undefined) {
        c._respawnPop += dt;
        const dur = 0.36;
        if (c._respawnPop < dur) {
          const t = c._respawnPop / dur;
          const s = 0.2 + (1 - 0.2) * Math.sin(t * Math.PI * 0.5);
          c.group.scale.set(s, s, s);
        } else {
          c.group.scale.set(1, 1, 1);
          c._respawnPop = undefined;
        }
      }
    }
  }

  function updateRusher(c, dt, dist) {
    const st = c.state;
    const cfg = st.cfg;
    switch (st.aiState) {
      case "ROAM":
        wander(c, dt);
        if (st.isAggroed) { st.aiState = "ALERT"; st.aiTimer = 0; }
        break;
      case "ALERT":
        st.aiTimer += dt;
        // face player
        {
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
        }
        if (st.aiTimer > 0.28) {
          st.aiState = "CHASE";
          st.aiTimer = 0;
        }
        break;
      case "CHASE":
        {
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
          if (dist <= cfg.attackRange) {
            st.aiState = "WINDUP";
            st.aiTimer = 0;
            break;
          }
          moveTowards(c, playerPosRef, cfg.moveSpeed, dt);
          // re-evaluate
          if (dist <= cfg.attackRange) {
            st.aiState = "WINDUP";
            st.aiTimer = 0;
          }
        }
        break;
      case "WINDUP":
        st.aiTimer += dt;
        // face player during early windup, commit near end
        if (st.aiTimer < cfg.windup * 0.7) {
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
        } else if (!st.targetLungeDir) {
          // commit direction near end of windup
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.targetLungeDir = { x: dx / len, z: dz / len };
          // also face committed
          st.facing = Math.atan2(st.targetLungeDir.x, st.targetLungeDir.z);
        }
        if (st.aiTimer >= cfg.windup) {
          st.aiState = "LUNGE";
          st.aiTimer = 0;
          if (!st.targetLungeDir) {
            const dx = playerPosRef.x - st.pos.x;
            const dz = playerPosRef.z - st.pos.z;
            const len = Math.hypot(dx, dz) || 1;
            st.targetLungeDir = { x: dx / len, z: dz / len };
          }
          // lunge velocity? We'll handle in LUNGE state per dt
          st._lungeHit = false;
        }
        break;
      case "LUNGE":
        st.aiTimer += dt;
        {
          const prog = st.aiTimer / cfg.lungeDuration;
          // committed movement
          const dir = st.targetLungeDir;
          if (dir) {
            const speed = cfg.lungeSpeed ?? (cfg.lungeDistance / cfg.lungeDuration);
            c.move({ x: dir.x * speed * dt, y: 0, z: dir.z * speed * dt });
          }
          // Check hit at mid-lunge once
          if (!st._lungeHit) {
            const curDist = distanceXZ(st.pos, playerPosRef);
            const vertOk = isVerticallyValid(c);
            if (curDist <= cfg.attackRange + 0.2 && vertOk && st.aiTimer > cfg.lungeDuration * 0.35) {
              if (!isPlayerInvuln()) {
                dealDamageToPlayer(c, st.pos);
                st._lungeHit = true;
              }
            }
          }
          if (st.aiTimer >= cfg.lungeDuration) {
            st.aiState = "RECOVER";
            st.aiTimer = 0;
            st.targetLungeDir = null;
            st._lungeHit = false;
          }
        }
        break;
      case "RECOVER":
        st.aiTimer += dt;
        // slight recoil? No movement
        if (st.aiTimer >= cfg.recover) {
          // Decide next: if still in range and aggro, windup again else chase
          if (dist <= cfg.attackRange + 0.5) {
            st.aiState = "WINDUP";
            st.aiTimer = 0;
          } else if (st.isAggroed) {
            st.aiState = "CHASE";
            st.aiTimer = 0;
          } else {
            st.aiState = "ROAM";
            st.aiTimer = 0;
          }
        }
        break;
      default:
        st.aiState = "ROAM";
        break;
    }
  }

  function updateSpitter(c, dt, dist) {
    const st = c.state;
    const cfg = st.cfg;
    switch (st.aiState) {
      case "ROAM":
        wander(c, dt);
        if (st.isAggroed) { st.aiState = "ALERT"; st.aiTimer = 0; }
        break;
      case "ALERT":
        st.aiTimer += dt;
        {
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
        }
        if (st.aiTimer > 0.32) {
          st.aiState = "REPOSITION";
          st.aiTimer = 0;
        }
        break;
      case "REPOSITION":
        {
          const pref = cfg.preferredDistance ?? 4.0;
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
          const diff = len - pref;
          // If too close move away, if too far move towards, if within 0.6 band start windup
          if (Math.abs(diff) < 0.6) {
            // Good distance: windup
            st.aiState = "WINDUP";
            st.aiTimer = 0;
            break;
          }
          if (diff < 0) {
            // Too close, back away
            moveAway(c, playerPosRef, cfg.moveSpeed, dt);
          } else {
            moveTowards(c, playerPosRef, cfg.moveSpeed, dt);
          }
          // After moving, if now in good band for some time, will windup next frame
          // Also need to check if player too close: if dist < 2.0 immediate windup? We'll stay reposition
        }
        break;
      case "WINDUP":
        st.aiTimer += dt;
        {
          const dx = playerPosRef.x - st.pos.x;
          const dz = playerPosRef.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          st.facing = Math.atan2(dx / len, dz / len);
        }
        if (st.aiTimer >= cfg.windup) {
          // Fire projectile
          const dir = (() => {
            const dx = playerPosRef.x - st.pos.x;
            const dz = playerPosRef.z - st.pos.z;
            const len = Math.hypot(dx, dz) || 1;
            return { x: dx / len, y: 0, z: dz / len };
          })();
          callbacks.onRequestProjectile(st.pos, dir, c);
          st.aiState = "RECOVER";
          st.aiTimer = 0;
        }
        break;
      case "RECOVER":
        st.aiTimer += dt;
        if (st.aiTimer >= (cfg.shotCooldown ?? 1.6)) {
          // Decide: if aggro, reposition or windup again
          const curDist = distanceXZ(st.pos, playerPosRef);
          const pref = cfg.preferredDistance ?? 4.0;
          if (Math.abs(curDist - pref) < 0.9) {
            st.aiState = "WINDUP";
            st.aiTimer = 0;
          } else {
            st.aiState = "REPOSITION";
            st.aiTimer = 0;
          }
        } else if (st.aiTimer > (cfg.recover ?? 0.45)) {
          // small move while cooling?
          // Drift slightly to maintain distance?
        }
        break;
      default:
        st.aiState = "ROAM";
        break;
    }
  }

  function getCreatures() { return creatures; }
  function getAliveCreatures() { return creatures.filter(c => !c.state.isDead && c.state.aiState !== "RESPAWNING"); }

  function reset() {
    for (const c of creatures) {
      c.state.isDead = false;
      c.state.health = c.state.cfg.health;
      c.state.aiState = "ROAM";
      c.state.aiTimer = 0;
      c.state.isAggroed = false;
      c.state.hurtTime = 0;
      c.state.respawnRemaining = 0;
      c.state.facing = Math.random() * Math.PI * 2;
      const spawn = c.state.spawnPos;
      const startY = spawn.y + c.state.cfg.capsuleHalfHeight + c.state.cfg.capsuleRadius + 0.05;
      const pos = { x: spawn.x, y: startY, z: spawn.z };
      c.setPosition(pos);
      c.group.visible = true;
      c.group.scale.set(1, 1, 1);
      c.showFocusRing(false);
      c._respawnPop = undefined;
      c.state.targetLungeDir = null;
    }
  }

  function dispose() {
    for (const c of creatures) c.dispose();
    creatures.length = 0;
  }

  function isAnyAggroedNearby() {
    return creatures.some(c => !c.state.isDead && c.state.isAggroed && distanceXZ(c.state.pos, playerPosRef) < 7);
  }

  return {
    update, getCreatures, getAliveCreatures, damageCreature, setPlayerPos, setPlayerState, setInvulnChecker,
    getAliveCount, isAnyAggroedNearby, reset, dispose,
    _creatures: creatures,
  };
}
