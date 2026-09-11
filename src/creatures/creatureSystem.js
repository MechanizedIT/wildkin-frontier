// src/creatures/creatureSystem.js — owns all wild creatures, AI, movement, health, respawn
import * as THREE from "three";
import { createWildCreature } from "./createWildCreature.js";
import { RUSHER_CONFIG, SPITTER_CONFIG, COMBAT_CONFIG } from "../combat/combatConfig.js";
import { CREATURE_SPAWNS } from "./creatureConfig.js";
import { TEMPERAMENT, TEMPERAMENT_CONFIG, defensiveShouldRetaliate, skittishShouldFlee, territorialShouldWarn, territorialShouldAttack } from "./temperament.js";
import { findNearestEligible, distanceXZ as distXZpercep, canTargetActor } from "./perception.js";
import { chooseSteeringDirection, isMovementStalled, STEERING_CONFIG } from "./steering.js";

export function createCreatureSystem(scene, physicsWorld, playground, opts = {}) {
  const creatures = [];
  let playerPosRef = { x: 0, y: 0.5, z: 5.5 };
  let playerStateRef = null;
  let isPlayerInvuln = () => false;
  let elapsed = 0;
  let activeRegionSet = null; // null = all active (backwards compat)
  let worldRegistryRef = opts.worldRegistry ?? null;

  function isLiveCreature(creature) {
    return !!creature && !creature.state.isDead && creature.state.aiState !== "RESPAWNING" && !creature.state.bondCaptured;
  }

  const callbacks = {
    onCreatureDamaged: opts.onCreatureDamaged ?? (() => {}),
    onCreatureDied: opts.onCreatureDied ?? (() => {}),
    onPlayerDamage: opts.onPlayerDamage ?? (() => {}),
    onRequestProjectile: opts.onRequestProjectile ?? (() => {}),
  };

  // Use world-driven spawns if provided via opts.spawns or worldRegistry, else fallback to legacy CREATURE_SPAWNS
  const spawnsSource = opts.spawns ?? (worldRegistryRef ? worldRegistryRef.getAllCreatures() : null) ?? CREATURE_SPAWNS;
  for (let i = 0; i < spawnsSource.length; i++) {
    const spawn = spawnsSource[i];
    const c = createWildCreature(scene, physicsWorld, spawn, i);
    // Attach regionId for activation
    c.state.regionId = spawn.regionId ?? spawn.region ?? null;
    c.regionId = c.state.regionId;
    // Ensure homePos already inside region (validation enforces)
    creatures.push(c);
  }

  function isRegionActive(regionId) {
    if (activeRegionSet === null) return true;
    if (!regionId) return true;
    return activeRegionSet.has(regionId);
  }

  function setActiveRegions(activeSet) {
    const nextSet = activeSet ? new Set(activeSet) : null;
    const prevSet = activeRegionSet;
    activeRegionSet = nextSet;
    for (const c of creatures) {
      const wasActive = prevSet === null ? true : (c.state.regionId ? prevSet.has(c.state.regionId) : true);
      const isActive = isRegionActive(c.state.regionId);
      if (wasActive && !isActive) {
        // Deactivating — hide, disable collision, freeze AI timers (no reset, timer stays for reactivation)
        c.state._regionInactive = true;
        c.setVisible(false);
        c.showFocusRing(false);
        if (c.disableCollision) c.disableCollision();
        // Do NOT reset WINDUP/LUNGE — freeze in place to prevent instant attack but preserve state
        // Timers will be frozen in update loop
      } else if (!wasActive && isActive) {
        // Reactivating — restore without duplication, keep frozen state
        c.state._regionInactive = false;
        if (c.state.aiState !== "RESPAWNING" && !c.state.isDead && !c.state.bondCaptured) {
          c.setVisible(true);
          if (c.enableCollision) c.enableCollision();
          // Keep WINDUP/LUNGE as is — will resume next update; no instant reset needed
        } else if (c.state.aiState === "RESPAWNING") {
          // Keep hidden until respawn succeeds
        }
      }
    }
  }

  function getActiveCreatures() {
    if (activeRegionSet === null) return [...creatures];
    return creatures.filter(c => isRegionActive(c.state.regionId));
  }

  function getActiveAliveCreatures() {
    return getActiveCreatures().filter(isLiveCreature);
  }

  function getActiveCreatureCount() { return getActiveCreatures().length; }

  function setPlayerPos(pos) { playerPosRef = pos; }
  function setPlayerState(st) { playerStateRef = st; }
  function setInvulnChecker(fn) { isPlayerInvuln = fn; }
  let playerColliderRef = null;
  function setPlayerCollider(collider) { playerColliderRef = collider ?? null; }

  function getAliveCount() { return creatures.filter(isLiveCreature).length; }
  function getAggroedNearby() {
    return creatures.some(c => isLiveCreature(c) && c.state.isAggroed && distanceXZ(c.state.pos, playerPosRef) < COMBAT_CONFIG.attackRange + 2.5);
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
    return dy <= COMBAT_CONFIG.verticalTolerance + 0.4;
  }

  function isVerticallyValidPos(a, b) {
    const dy = Math.abs((a.y ?? 0.5) - (b.y ?? 0.5));
    return dy <= COMBAT_CONFIG.verticalTolerance + 0.4;
  }

  // --- movement helpers with steering ---

  function probeBlocked(from, angle, distance, radius) {
    // Use Rapier cast if available, else simple AABB check
    if (physicsWorld && physicsWorld.world && physicsWorld.RAPIER && typeof physicsWorld.RAPIER.Ball === "function") {
      try {
        const RAPIER = physicsWorld.RAPIER;
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const to = { x: from.x + Math.cos(angle) * distance, y: from.y, z: from.z + Math.sin(angle) * distance };
        const vel = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
        // Steering probe must NOT treat self or current actor target as wall; exclude self + target collider from world probe.
        // Preserve collision-resolved locomotion — this only affects steering direction choice.
        const exclude = new Set(creatures.filter(cc => cc.collider).map(cc => cc.collider));
        if (playerColliderRef) exclude.add(playerColliderRef);
        const pred = exclude.size > 0 ? (collider) => {
          for (const ex of exclude) if (ex === collider || ex.handle === collider.handle) return false;
          return true;
        } : null;
        const hit = physicsWorld.world.castShape(from, rot, vel, shape, 0, 1.0, true, undefined, undefined, undefined, undefined, pred);
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.toi ?? 0;
          if (toi < 1.0 - 1e-3) return true;
        }
        return false;
      } catch {}
    }
    // fallback AABB
    if (!playground) return false;
    const to = { x: from.x + Math.cos(angle) * distance, y: from.y, z: from.z + Math.sin(angle) * distance };
    const mid = { x: (from.x + to.x) * 0.5, y: from.y, z: (from.z + to.z) * 0.5 };
    for (const o of playground.obstacles ?? []) {
      const h = o.height ?? 1.0;
      if (mid.y > h + radius + 0.2) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius, minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      if (mid.x >= minX && mid.x <= maxX && mid.z >= minZ && mid.z <= maxZ) return true;
    }
    for (const p of playground.platforms ?? []) {
      const h = p.height;
      if (mid.y > h + radius + 0.2) continue;
      const aabb = p.aabb;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius, minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      if (mid.x >= minX && mid.x <= maxX && mid.z >= minZ && mid.z <= maxZ) return true;
    }
    return false;
  }

  function moveWithSteering(creature, targetPos, speed, dt) {
    const st = creature.state;
    const pos = st.pos;
    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-5) return;
    let desiredAngle = Math.atan2(dx, dz); // note: atan2(dx, dz) as used elsewhere? Consistent with facing = atan2(nx,nz)
    // steering hold
    if (st.steerHold > 0 && st.steerAngle !== null) {
      st.steerHold -= dt;
      desiredAngle = st.steerAngle;
      if (st.steerHold <= 0) st.steerAngle = null;
    }
    const desiredDir = { x: Math.sin(desiredAngle), z: Math.cos(desiredAngle) };
    const desiredDist = speed * dt;
    // try direct first
    const from = { x: pos.x, y: pos.y, z: pos.z };
    const radius = st.cfg.capsuleRadius ?? 0.32;
    const probeDist = STEERING_CONFIG.probeDistance;
    const directBlocked = probeBlocked(from, desiredAngle, probeDist, radius);
    if (!directBlocked) {
      // reset steering hold
      st.steerHold = 0;
      st.steerAngle = null;
      st.facing = desiredAngle;
      const res = creature.move({ x: desiredDir.x * desiredDist, y: 0, z: desiredDir.z * desiredDist });
      // check stall
      const corrMag = Math.hypot(res.corrected.x, res.corrected.z);
      if (isMovementStalled({ desiredMag: desiredDist, correctedMag: corrMag })) {
        // consider blocked for next frame -> will probe sides
        st.steerHold = STEERING_CONFIG.holdDuration;
        // keep facing
      }
      // light separation if many creatures overlapping and collision disabled — push a bit
      applySeparation(creature, dt);
      return;
    }
    // direct blocked: probe sides
    const left45 = desiredAngle + Math.PI / 4;
    const right45 = desiredAngle - Math.PI / 4;
    const left90 = desiredAngle + Math.PI / 2.2;
    const right90 = desiredAngle - Math.PI / 2.2;
    const probes = {
      directBlocked: true,
      left45Blocked: probeBlocked(from, left45, probeDist, radius),
      right45Blocked: probeBlocked(from, right45, probeDist, radius),
      left90Blocked: probeBlocked(from, left90, probeDist, radius),
      right90Blocked: probeBlocked(from, right90, probeDist, radius),
    };
    const preferLeft = st._lastSteerLeft ?? null;
    const chosen = chooseSteeringDirection({ desiredAngle, probeResults: probes, preferLeft });
    if (chosen !== null) {
      st.steerAngle = chosen;
      st.steerHold = STEERING_CONFIG.holdDuration;
      st._lastSteerLeft = chosen > desiredAngle;
      st.facing = chosen;
      const dirX = Math.sin(chosen), dirZ = Math.cos(chosen);
      creature.move({ x: dirX * desiredDist, y: 0, z: dirZ * desiredDist });
      applySeparation(creature, dt);
    } else {
      // all blocked: slight random nudge
      st.facing += (Math.random() - 0.5) * 0.2;
    }
  }

  function applySeparation(creature, dt) {
    // light separation when creature colliders disabled — avoid center overlap
    if (creature.collider) return; // only when disabled does separation matter? spec says if disabled, need light separation
    const st = creature.state;
    let sepX = 0, sepZ = 0, count = 0;
    for (const other of creatures) {
      if (other === creature) continue;
      if (other.state.isDead || other.state.aiState === "RESPAWNING") continue;
      const dx = st.pos.x - other.state.pos.x;
      const dz = st.pos.z - other.state.pos.z;
      const d2 = dx * dx + dz * dz;
      const r = STEERING_CONFIG.separationRadius;
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        sepX += (dx / d) * (r - d);
        sepZ += (dz / d) * (r - d);
        count++;
      }
    }
    if (count > 0) {
      sepX /= count; sepZ /= count;
      const len = Math.hypot(sepX, sepZ) || 1;
      const nx = sepX / len, nz = sepZ / len;
      creature.move({ x: nx * STEERING_CONFIG.separationStrength * dt, y: 0, z: nz * STEERING_CONFIG.separationStrength * dt });
    }
  }

  function moveTowards(creature, targetPos, speed, dt) {
    // use steering variant
    moveWithSteering(creature, targetPos, speed, dt);
  }

  function moveAway(creature, targetPos, speed, dt) {
    const pos = creature.state.pos;
    const dx = pos.x - targetPos.x;
    const dz = pos.z - targetPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len, nz = dz / len;
    const awayTarget = { x: pos.x + nx * 2.0, y: pos.y, z: pos.z + nz * 2.0 };
    moveWithSteering(creature, awayTarget, speed, dt);
    creature.state.facing = Math.atan2(nx, nz);
  }

  function wander(creature, dt) {
    const st = creature.state;
    // home/roam bounded wandering
    st.aiTimer += dt;
    // leash check: if far from home, return
    const homeDist = distanceXZ(st.pos, st.homePos);
    if (homeDist > st.leashRadius) {
      st.aiState = "RETURN";
      st.aiTimer = 0;
      return;
    }
    if (homeDist > st.roamRadius + 0.5) {
      // drift toward home
      moveTowards(creature, st.homePos, st.cfg.moveSpeed * 0.45, dt);
      return;
    }
    if (st.aiTimer > 1.2 + Math.random()) {
      // pick random facing but bias toward home if near roam edge
      let newFacing = st.facing + (Math.random() - 0.5) * 0.9;
      if (homeDist > st.roamRadius * 0.6) {
        const toHomeAngle = Math.atan2(st.homePos.x - st.pos.x, st.homePos.z - st.pos.z);
        const diff = Math.atan2(Math.sin(toHomeAngle - newFacing), Math.cos(toHomeAngle - newFacing));
        newFacing += diff * 0.35;
      }
      st.facing = newFacing;
      st.aiTimer = 0;
    }
    const speed = st.cfg.moveSpeed * 0.35;
    const f = st.facing;
    const target = { x: st.pos.x + Math.sin(f) * 0.6, y: st.pos.y, z: st.pos.z + Math.cos(f) * 0.6 };
    moveWithSteering(creature, target, speed, dt);
  }

  function dealDamageToPlayer(creature, sourcePos) {
    if (isPlayerInvuln()) return false;
    const dmg = creature.state.cfg.damage ?? 1;
    const ok = callbacks.onPlayerDamage(dmg, sourcePos);
    return ok;
  }

  function dealDamageToWildkin(attacker, target, sourcePos) {
    if (!target || target.state.isDead || target.state.aiState === "RESPAWNING") return false;
    // owner exclusion already handled
    const dmg = attacker.state.cfg.damage ?? 1;
    const isPlayerAttacker = attacker === "player" || attacker.actorType === "player";
    // use same damageCreature but track source as wildkin
    const source = sourcePos ?? attacker.state.pos;
    // knockback direction from attacker to target
    const dx = target.state.pos.x - source.x;
    const dz = target.state.pos.z - source.z;
    const len = Math.hypot(dx, dz) || 1;
    const dir = { x: dx / len, z: dz / len };
    const ok = damageCreature(target, dmg, source, dir, attacker);
    return ok;
  }

  function damageCreature(creature, amount, sourcePos, knockbackDir, attacker = null) {
    if (!creature || creature.state.bondCaptured || creature.state.bondingHeld) return false;
    if (creature.state.isDead) return false;
    if (creature.state.aiState === "RESPAWNING") return false;
    creature.state.health -= amount;
    // track attacker for retaliation and XP farming
    const attackerId = attacker?.state?.id ?? attacker?.id ?? (attacker === "player" ? "player" : null);
    if (attackerId) {
      creature.state.lastAttackerId = attackerId;
      creature.state.lastHitTime = elapsed;
      const isPlayerAttacker = attackerId === "player" || (typeof attackerId === "string" && attackerId.startsWith("player")) || attacker === "player";
      if (isPlayerAttacker) {
        creature.state.playerDamaged = true;
        creature.state.lastDamagedByPlayer = true;
      }
      // Temperament reactions: separate from XP participation — apply for ANY attacker (player or wildkin)
      if (creature.state.temperament === TEMPERAMENT.DEFENSIVE) {
        creature.state.retaliationTargetId = attackerId;
        creature.state.retaliationRemaining = TEMPERAMENT_CONFIG.DEFENSIVE.retaliationDuration ?? 5.0;
      }
      if (creature.state.temperament === TEMPERAMENT.SKITTISH) {
        creature.state.fleeTime = TEMPERAMENT_CONFIG.SKITTISH.postHitFleeDuration ?? 4.5;
        creature.state.fleeTargetId = attackerId;
      }
    } else if (sourcePos) {
      // legacy player source without attacker object -> assume player
      creature.state.playerDamaged = true;
      creature.state.lastDamagedByPlayer = true;
      creature.state.lastAttackerId = "player";
      if (creature.state.temperament === TEMPERAMENT.DEFENSIVE) {
        creature.state.retaliationTargetId = "player";
        creature.state.retaliationRemaining = TEMPERAMENT_CONFIG.DEFENSIVE.retaliationDuration ?? 5.0;
      }
      if (creature.state.temperament === TEMPERAMENT.SKITTISH) {
        creature.state.fleeTime = TEMPERAMENT_CONFIG.SKITTISH.postHitFleeDuration ?? 4.5;
        creature.state.fleeTargetId = "player";
      }
    }

    creature.state.hurtTime = creature.state.cfg.hurtLock ?? 0.16;
    creature.state.aiState = "HURT";
    creature.state.aiTimer = 0;
    creature.restartVisualAnimation?.("hurt");
    callbacks.onCreatureDamaged(creature, amount);

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

    if (creature.state.health <= 0) {
      killCreature(creature);
    } else {
      // defensive after hit may go to ALERT quickly; skittish will flee
      if (creature.state.temperament === TEMPERAMENT.SKITTISH) {
        // will be handled in update loop via flee
      }
    }
    return true;
  }

  function killCreature(creature) {
    creature.state.isDead = true;
    creature.state.health = 0;
    creature.state.aiState = "DEAD";
    creature.state.aiTimer = 0;
    creature.state.isAggroed = false;
    creature.state.hasWarned = false;
    creature.state.warnTime = 0;
    creature.state.fleeTime = 0;
    creature.state.retaliationRemaining = 0;
    creature.showFocusRing(false);
    creature.setVisualScaleMultiplier(1);
    // immediately disable collision
    if (creature.disableCollision) creature.disableCollision();
    // decide XP spawning elsewhere based on playerDamaged flag — pass flag via callback
    callbacks.onCreatureDied(creature);
    // The Heartwood Guardian is a run-ending encounter. It remains defeated
    // until the expedition reset, while ordinary creatures retain their normal
    // ecology respawn behavior.
    creature.state.noRespawnThisRun = creature.state.visualAssetId === "asset_heartwood_guardian";
    creature.state.respawnRemaining = creature.state.noRespawnThisRun ? Infinity : (creature.state.cfg.respawnSeconds ?? 10);
    creature.state.aiState = "RESPAWNING";
    // hide after short death visual — keep visible for 0.25s then hide in update
    creature._deathVisibleTime = 0.25;
  }

  function tryRespawn(creature, dt) {
    creature.state.respawnRemaining -= dt;
    if (creature.state.respawnRemaining > 0) return false;
    const home = creature.state.homePos ?? creature.state.spawnPos;
    const dist = distanceXZ(home, playerPosRef);
    if (dist < 1.8) {
      creature.state.respawnRemaining = 0.5;
      return false;
    }
    // also check safe distance from other creatures? small separation
    for (const other of creatures) {
      if (other === creature) continue;
      if (other.state.isDead || other.state.aiState === "RESPAWNING") continue;
      if (distanceXZ(home, other.state.pos) < 0.9) {
        creature.state.respawnRemaining = 0.7;
        return false;
      }
    }
    creature.state.isDead = false;
    creature.state.health = creature.state.cfg.health;
    creature.state.aiState = "ROAM";
    creature.state.aiTimer = 0;
    creature.state.hurtTime = 0;
    creature.state.isAggroed = false;
    creature.state.hasWarned = false;
    creature.state.warnTime = 0;
    creature.state.fleeTime = 0;
    creature.state.retaliationTargetId = null;
    creature.state.retaliationRemaining = 0;
    creature.state.playerDamaged = false;
    creature.state.lastAttackerId = null;
    creature.state.facing = Math.random() * Math.PI * 2;
    creature.state.steerHold = 0;
    creature.state.steerAngle = null;
    const startY = home.y + creature.state.cfg.capsuleHalfHeight + creature.state.cfg.capsuleRadius + 0.05;
    const pos = { x: home.x, y: startY, z: home.z };
    creature.setPosition(pos);
    if (creature.enableCollision) creature.enableCollision();
    creature.setVisible(true);
    creature.setVisualScaleMultiplier(0.2);
    creature._respawnPop = 0;
    creature._deathVisibleTime = undefined;
    return true;
  }

  // --- temperament decision helpers ---

  function selectWildkinTarget(attacker) {
    const st = attacker.state;
    const pos = st.pos;
    // aggressive may attack configured hostile species
    const hostile = st.hostileSpecies ?? [];
    const candidates = creatures.filter(c => c !== attacker && !c.state.isDead && c.state.aiState !== "RESPAWNING");
    let best = null;
    let bestDist = Infinity;
    for (const cand of candidates) {
      const cPos = cand.state.pos;
      const d = distanceXZ(pos, cPos);
      if (d > st.noticeRadius + 1) continue;
      if (!isVerticallyValidPos(pos, cPos)) continue;
      // eligibility based on temperament
      let eligible = false;
      if (st.temperament === TEMPERAMENT.AGGRESSIVE) {
        const species = cand.state.speciesTag;
        if (hostile.length > 0) eligible = hostile.includes(species);
        else eligible = true; // fallback allow any
      } else if (st.temperament === TEMPERAMENT.DEFENSIVE) {
        // only if retaliating against attacker
        if (st.retaliationTargetId && cand.state.id === st.retaliationTargetId && st.retaliationRemaining > 0) eligible = true;
      } else if (st.temperament === TEMPERAMENT.TERRITORIAL) {
        // territorial vs wildkin similar to player: needs personal intrusion
        if (d <= st.personalSpaceRadius + 0.5) eligible = true;
      }
      if (!eligible) continue;
      if (d < bestDist) { bestDist = d; best = cand; }
    }
    return best ? { target: best, dist: bestDist } : null;
  }

  function selectPlayerOrWildkinTarget(creature) {
    const st = creature.state;
    const pos = st.pos;
    // choose between player and wildkin targets based on temperament
    let playerCandidate = null;
    let playerDist = distanceXZ(pos, playerPosRef);
    const playerVertOk = isVerticallyValidPos(pos, playerPosRef);
    const wildkinSel = selectWildkinTarget(creature);

    // decide per temperament
    if (st.temperament === TEMPERAMENT.DEFENSIVE) {
      // only attack if retaliating against that specific actor
      if (st.retaliationTargetId) {
        if (st.retaliationTargetId === "player" && playerVertOk && playerDist <= st.noticeRadius) {
          playerCandidate = { pos: playerPosRef, isPlayer: true, dist: playerDist };
        }
        // wildkin already filtered
        // prefer retaliation target
        if (wildkinSel && wildkinSel.target.state.id === st.retaliationTargetId) return { targetPos: wildkinSel.target.state.pos, targetCreature: wildkinSel.target, isPlayer: false, dist: wildkinSel.dist };
        if (playerCandidate && st.retaliationTargetId === "player") return { targetPos: playerPosRef, isPlayer: true, dist: playerDist };
        // if no valid retaliation target, no target
        return null;
      }
      return null; // defensive ignores otherwise
    }

    if (st.temperament === TEMPERAMENT.SKITTISH) {
      // skittish never initiates attack; returns null for attack; flee is separate
      return null;
    }

    if (st.temperament === TEMPERAMENT.TERRITORIAL) {
      // check player intrusion
      const inPersonal = playerDist <= st.personalSpaceRadius && playerVertOk;
      const inNotice = playerDist <= st.noticeRadius && playerVertOk;
      // also wildkin intrusion
      if (wildkinSel && distanceXZ(pos, wildkinSel.target.state.pos) <= st.personalSpaceRadius) {
        return { targetPos: wildkinSel.target.state.pos, targetCreature: wildkinSel.target, isPlayer: false, dist: wildkinSel.dist };
      }
      if (inPersonal) {
        // need warn first
        if (st.hasWarned && st.warnTime >= (TEMPERAMENT_CONFIG.TERRITORIAL.warnDuration ?? 1.0)) {
          return { targetPos: playerPosRef, isPlayer: true, dist: playerDist };
        }
        // else no attack yet (warn)
        return null;
      }
      if (inNotice && st.timeInsideNotice >= (TEMPERAMENT_CONFIG.TERRITORIAL.persistTime ?? 1.2)) {
        if (st.hasWarned && st.warnTime >= (TEMPERAMENT_CONFIG.TERRITORIAL.warnDuration ?? 1.0)) {
          return { targetPos: playerPosRef, isPlayer: true, dist: playerDist };
        }
        return null;
      }
      // else no attack
      if (wildkinSel) return { targetPos: wildkinSel.target.state.pos, targetCreature: wildkinSel.target, isPlayer: false, dist: wildkinSel.dist };
      return null;
    }

    if (st.temperament === TEMPERAMENT.AGGRESSIVE) {
      // may attack player or hostile wildkin
      // choose nearest eligible
      let best = null;
      if (playerVertOk && playerDist <= st.noticeRadius) {
        best = { targetPos: playerPosRef, isPlayer: true, dist: playerDist, targetCreature: null };
      }
      if (wildkinSel) {
        if (!best || wildkinSel.dist < best.dist) {
          best = { targetPos: wildkinSel.target.state.pos, targetCreature: wildkinSel.target, isPlayer: false, dist: wildkinSel.dist };
        }
      }
      return best;
    }
    return null;
  }

  function shouldFlee(creature) {
    const st = creature.state;
    if (st.temperament !== TEMPERAMENT.SKITTISH) return false;
    if (st.fleeTime > 0) return true;
    // also if threat within notice (player or aggressive wildkin)
    const playerDist = distanceXZ(st.pos, playerPosRef);
    if (playerDist <= st.noticeRadius + 1.0 && isVerticallyValidPos(st.pos, playerPosRef)) return true;
    // check nearest aggressive wildkin near
    for (const other of creatures) {
      if (other === creature) continue;
      if (other.state.isDead || other.state.aiState === "RESPAWNING") continue;
      if (other.state.temperament !== TEMPERAMENT.AGGRESSIVE) continue;
      const d = distanceXZ(st.pos, other.state.pos);
      if (d <= 4.5 && isVerticallyValidPos(st.pos, other.state.pos)) return true;
    }
    return false;
  }

  function update(dt) {
    elapsed += dt;
    for (const c of creatures) {
      const st = c.state;
      // Bonding owns a short freeze without changing the creature's AI state;
      // capture then removes it from the live world until the next run reset.
      if (st.bondCaptured) {
        c.setVisible(false);
        c.showFocusRing(false);
        continue;
      }
      if (st.bondingHeld) {
        c.showFocusRing(false);
        c.updateVisual(dt);
        continue;
      }
      // Inactive region — freeze all simulation (no AI, no timers, no respawn, no projectile emission)
      if (st._regionInactive || !isRegionActive(st.regionId)) {
        // Keep hidden; ensure focus ring off
        c.showFocusRing(false);
        // Freeze: do not progress respawn timer, retaliation, flee, etc.
        continue;
      }
      // respawning — only for active regions (inactive already returned)
      if (st.aiState === "RESPAWNING") {
        // handle death visible time before hide
        if (c._deathVisibleTime !== undefined) {
          c._deathVisibleTime -= dt;
          if (c._deathVisibleTime <= 0) {
            c.setVisible(false);
            c._deathVisibleTime = undefined;
          }
        } else {
          c.setVisible(false);
        }
        tryRespawn(c, dt);
        if (st.aiState !== "RESPAWNING") {
          c.setVisible(true);
          st.aiState = "ROAM";
        }
        continue;
      }
      if (st.isDead) continue;

      // timers
      if (st.retaliationRemaining > 0) st.retaliationRemaining = Math.max(0, st.retaliationRemaining - dt);
      else st.retaliationTargetId = null;
      if (st.fleeTime > 0) st.fleeTime = Math.max(0, st.fleeTime - dt);
      if (st.warnTime !== undefined && st.hasWarned) st.warnTime += dt;

      // hurt lock
      if (st.aiState === "HURT") {
        st.hurtTime -= dt;
        st.aiTimer += dt;
        c.updateVisual(dt);
        if (st.hurtTime <= 0) {
          // after hurt, skittish should flee, defensive may retaliate, else alert
          if (st.temperament === TEMPERAMENT.SKITTISH) { st.aiState = "FLEE"; st.aiTimer = 0; st.fleeTime = TEMPERAMENT_CONFIG.SKITTISH.postHitFleeDuration ?? 4.5; }
          else if (st.temperament === TEMPERAMENT.DEFENSIVE && st.retaliationTargetId) { st.aiState = "ALERT"; st.aiTimer = 0; }
          else { st.aiState = "ALERT"; st.aiTimer = 0; }
        }
        continue;
      }

      // leash check
      const homeDist = distanceXZ(st.pos, st.homePos);
      if (homeDist > st.leashRadius) {
        if (st.aiState !== "RETURN" && st.aiState !== "FLEE") {
          st.aiState = "RETURN";
          st.aiTimer = 0;
          st.isAggroed = false;
          st.hasWarned = false;
        }
      }

      // skittish flee has priority
      if (st.temperament === TEMPERAMENT.SKITTISH && shouldFlee(c)) {
        if (st.aiState !== "FLEE") { st.aiState = "FLEE"; st.aiTimer = 0; if (st.fleeTime <= 0) st.fleeTime = TEMPERAMENT_CONFIG.SKITTISH.fleeDuration ?? 3.5; }
      }

      // territorial timeInsideNotice tracking
      if (st.temperament === TEMPERAMENT.TERRITORIAL) {
        const d = distanceXZ(st.pos, playerPosRef);
        if (d <= st.noticeRadius && isVerticallyValidPos(st.pos, playerPosRef)) st.timeInsideNotice = (st.timeInsideNotice ?? 0) + dt;
        else st.timeInsideNotice = 0;
        // warn handling
        if (distanceXZ(st.pos, playerPosRef) <= st.noticeRadius && isVerticallyValidPos(st.pos, playerPosRef)) {
          if (!st.hasWarned && territorialShouldWarn({ dist: d, noticeRadius: st.noticeRadius, personalSpace: st.personalSpaceRadius, timeInsideNotice: st.timeInsideNotice, temperament: st.temperament })) {
            st.aiState = "WARN";
            st.aiTimer = 0;
            st.hasWarned = true;
            st.warnTime = 0;
          }
        }
      }

      // General target selection for aggressive/territorial/defensive is handled in updateRusher/Spitter via selectPlayerOrWildkinTarget
      // For legacy aggro check: keep but temperament overrides

      // AI state machine per type (extended)
      if (st.type === "rusher") {
        updateRusher(c, dt);
      } else if (st.type === "spitter") {
        updateSpitter(c, dt);
      }

      c.updateVisual(dt);
      updateVisualTemperament(c, dt);

      if (c._respawnPop !== undefined) {
        c._respawnPop += dt;
        const dur = 0.36;
        if (c._respawnPop < dur) {
          const t = c._respawnPop / dur;
          const s = 0.2 + (1 - 0.2) * Math.sin(t * Math.PI * 0.5);
          c.setVisualScaleMultiplier(s);
        } else {
          c.setVisualScaleMultiplier(1);
          c._respawnPop = undefined;
        }
      }
    }
  }

  function updateVisualTemperament(c, dt) {
    const st = c.state;
    if (st.aiState === "WARN") {
      // pulse emissive orange for warning
      const pulse = Math.sin(st.aiTimer * 9) * 0.5 + 0.5;
      if (c.mainMesh && c.mainMesh.material) {
        const base = st.type === "rusher" ? 0xe14b2a : 0x7a4de8;
        // lerp color intensity
        c.mainMesh.material.emissive?.setHex?.(pulse > 0.5 ? 0x553300 : 0x331100);
      }
      c.setVisualScaleMultiplier(1 + pulse * 0.08, 1, 1 + pulse * 0.08);
    } else if (c._respawnPop === undefined) {
      c.setVisualScaleMultiplier(1);
    }
    if (st.aiState === "FLEE") {
      // maybe slightly transparent or fast? keep scale normal
    }
    if (st.aiState === "RETURN") {
      // could dim
    }
  }

  function updateRusher(c, dt) {
    const st = c.state;
    const cfg = st.cfg;
    // helper to get target (player or wildkin) based on temperament
    const targetSel = selectPlayerOrWildkinTarget(c);
    const hasTarget = targetSel !== null;
    const targetPos = hasTarget ? targetSel.targetPos : null;
    const isPlayerTarget = hasTarget ? targetSel.isPlayer : false;
    const targetCreature = hasTarget ? targetSel.targetCreature : null;
    const distToTarget = hasTarget ? targetSel.dist : distanceXZ(st.pos, playerPosRef);

    switch (st.aiState) {
      case "ROAM":
        // skittish roam already flee handled; else normal wander
        wander(c, dt);
        // check if temperament wants to initiate
        if (hasTarget) { st.isAggroed = true; st.aiState = "ALERT"; st.aiTimer = 0; }
        // also if defensive retaliation target set, switch to alert
        if (st.temperament === TEMPERAMENT.DEFENSIVE && st.retaliationTargetId) { st.aiState = "ALERT"; st.aiTimer = 0; }
        break;
      case "WARN":
        st.aiTimer += dt;
        // face threat
        if (hasTarget && targetPos) {
          const dx = targetPos.x - st.pos.x;
          const dz = targetPos.z - st.pos.z;
          st.facing = Math.atan2(dx, dz);
        }
        // after warnDuration, go to CHASE if still intruding
        if (st.aiTimer >= (TEMPERAMENT_CONFIG.TERRITORIAL.warnDuration ?? 1.0)) {
          // if still personal space intrusion, attack
          if (hasTarget) { st.aiState = "CHASE"; st.aiTimer = 0; }
          else { st.aiState = "ROAM"; st.hasWarned = false; st.warnTime = 0; st.isAggroed = false; }
        }
        break;
      case "FLEE": {
        // move away from nearest threat
        let threatPos = playerPosRef;
        let bestThreatDist = distanceXZ(st.pos, playerPosRef);
        // check nearest aggressive
        for (const other of creatures) {
          if (other === c) continue;
          if (other.state.isDead || other.state.aiState === "RESPAWNING") continue;
          if (other.state.temperament === TEMPERAMENT.AGGRESSIVE) {
            const d = distanceXZ(st.pos, other.state.pos);
            if (d < bestThreatDist) { bestThreatDist = d; threatPos = other.state.pos; }
          }
        }
        // also wildkin attacker
        if (st.fleeTargetId) {
          const attacker = creatures.find(cc => cc.state.id === st.fleeTargetId);
          if (attacker) threatPos = attacker.state.pos;
        }
        const fleeSpeed = cfg.moveSpeed * getFleeFactor(st);
        moveAway(c, threatPos, fleeSpeed, dt);
        st.fleeTime -= dt;
        // if leash far, also return logic but flee priority
        if (st.fleeTime <= 0) {
          const homeD = distanceXZ(st.pos, st.homePos);
          if (homeD > st.leashRadius * 0.8) st.aiState = "RETURN";
          else st.aiState = "ROAM";
          st.aiTimer = 0;
        }
        break;
      }
      case "RETURN":
        moveTowards(c, st.homePos, cfg.moveSpeed * 0.85, dt);
        if (distanceXZ(st.pos, st.homePos) < 1.2) { st.aiState = "ROAM"; st.aiTimer = 0; st.isAggroed = false; st.hasWarned = false; }
        break;
      case "ALERT":
        st.aiTimer += dt;
        if (hasTarget && targetPos) {
          const dx = targetPos.x - st.pos.x;
          const dz = targetPos.z - st.pos.z;
          st.facing = Math.atan2(dx, dz);
        } else if (!hasTarget) {
          // no valid target -> back to roam
          st.aiState = "ROAM"; st.aiTimer = 0; st.isAggroed = false; break;
        }
        if (st.aiTimer > 0.28) { st.aiState = "CHASE"; st.aiTimer = 0; }
        break;
      case "CHASE": {
        if (!hasTarget) { st.aiState = "RETURN"; st.aiTimer = 0; break; }
        const dx = targetPos.x - st.pos.x;
        const dz = targetPos.z - st.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        st.facing = Math.atan2(dx, dz);
        if (distToTarget <= cfg.attackRange) { st.aiState = "WINDUP"; st.aiTimer = 0; break; }
        moveTowards(c, targetPos, cfg.moveSpeed, dt);
        // check leash
        if (distanceXZ(st.pos, st.homePos) > st.leashRadius) { st.aiState = "RETURN"; break; }
        if (distToTarget <= cfg.attackRange) { st.aiState = "WINDUP"; st.aiTimer = 0; }
        break;
      }
      case "WINDUP":
        st.aiTimer += dt;
        if (hasTarget && targetPos) {
          if (st.aiTimer < cfg.windup * 0.7) {
            const dx = targetPos.x - st.pos.x;
            const dz = targetPos.z - st.pos.z;
            st.facing = Math.atan2(dx, dz);
          } else if (!st.targetLungeDir) {
            const dx = targetPos.x - st.pos.x;
            const dz = targetPos.z - st.pos.z;
            const len = Math.hypot(dx, dz) || 1;
            st.targetLungeDir = { x: dx / len, z: dz / len, targetCreature, isPlayerTarget };
            st.facing = Math.atan2(st.targetLungeDir.x, st.targetLungeDir.z);
          }
        }
        if (st.aiTimer >= cfg.windup) {
          st.aiState = "LUNGE";
          st.aiTimer = 0;
          if (!st.targetLungeDir && hasTarget) {
            const dx = targetPos.x - st.pos.x;
            const dz = targetPos.z - st.pos.z;
            const len = Math.hypot(dx, dz) || 1;
            st.targetLungeDir = { x: dx / len, z: dz / len, targetCreature, isPlayerTarget };
          }
          st._lungeHit = false;
          st._lungeTargetCreature = targetCreature;
          st._lungeIsPlayer = isPlayerTarget;
        }
        break;
      case "LUNGE":
        st.aiTimer += dt;
        {
          const dir = st.targetLungeDir;
          if (dir) {
            const speed = cfg.lungeSpeed ?? (cfg.lungeDistance / cfg.lungeDuration);
            c.move({ x: dir.x * speed * dt, y: 0, z: dir.z * speed * dt });
          }
          if (!st._lungeHit) {
            // check hit against current target (player or wildkin)
            if (st._lungeIsPlayer) {
              const curDist = distanceXZ(st.pos, playerPosRef);
              const vertOk = isVerticallyValid(c);
              if (curDist <= cfg.attackRange + 0.2 && vertOk && st.aiTimer > cfg.lungeDuration * 0.35) {
                if (!isPlayerInvuln()) dealDamageToPlayer(c, st.pos);
                st._lungeHit = true;
              }
            } else if (st._lungeTargetCreature) {
              const tPos = st._lungeTargetCreature.state.pos;
              const curDist = distanceXZ(st.pos, tPos);
              const vertOk = isVerticallyValidPos(st.pos, tPos);
              if (curDist <= cfg.attackRange + 0.35 && vertOk && st.aiTimer > cfg.lungeDuration * 0.35) {
                dealDamageToWildkin(c, st._lungeTargetCreature, st.pos);
                st._lungeHit = true;
              }
            } else {
              // fallback to any valid target in range (for tests)
              const curDist = distanceXZ(st.pos, playerPosRef);
              if (curDist <= cfg.attackRange + 0.2 && st.aiTimer > cfg.lungeDuration * 0.35) {
                if (!isPlayerInvuln()) dealDamageToPlayer(c, st.pos);
                st._lungeHit = true;
              }
            }
          }
          if (st.aiTimer >= cfg.lungeDuration) {
            st.aiState = "RECOVER";
            st.aiTimer = 0;
            st.targetLungeDir = null;
            st._lungeHit = false;
            st._lungeTargetCreature = null;
          }
        }
        break;
      case "RECOVER":
        st.aiTimer += dt;
        if (st.aiTimer >= cfg.recover) {
          // decide next
          if (hasTarget && distToTarget <= cfg.attackRange + 0.5) { st.aiState = "WINDUP"; st.aiTimer = 0; }
          else if (hasTarget) { st.aiState = "CHASE"; st.aiTimer = 0; }
          else { st.aiState = "ROAM"; st.aiTimer = 0; st.isAggroed = false; st.hasWarned = false; }
        }
        break;
      default:
        st.aiState = "ROAM";
        break;
    }
  }

  function getFleeFactor(st) {
    if (st.temperament === TEMPERAMENT.SKITTISH && st.fleeTime > 2.0) return 1.6;
    if (st.temperament === TEMPERAMENT.SKITTISH) return 1.35;
    return 1;
  }

  function updateSpitter(c, dt) {
    const st = c.state;
    const cfg = st.cfg;
    const targetSel = selectPlayerOrWildkinTarget(c);
    const hasTarget = targetSel !== null;
    const targetPos = hasTarget ? targetSel.targetPos : null;
    const isPlayerTarget = hasTarget ? targetSel.isPlayer : false;
    const targetCreature = hasTarget ? targetSel.targetCreature : null;
    const distToTarget = hasTarget ? targetSel.dist : distanceXZ(st.pos, playerPosRef);
    switch (st.aiState) {
      case "ROAM":
        wander(c, dt);
        if (hasTarget) { st.isAggroed = true; st.aiState = "ALERT"; st.aiTimer = 0; }
        if (st.temperament === TEMPERAMENT.DEFENSIVE && st.retaliationTargetId) { st.aiState = "ALERT"; st.aiTimer = 0; }
        break;
      case "WARN":
        st.aiTimer += dt;
        if (hasTarget && targetPos) {
          const dx = targetPos.x - st.pos.x;
          const dz = targetPos.z - st.pos.z;
          st.facing = Math.atan2(dx, dz);
        }
        if (st.aiTimer >= (TEMPERAMENT_CONFIG.TERRITORIAL.warnDuration ?? 1.0)) {
          if (hasTarget) { st.aiState = "REPOSITION"; st.aiTimer = 0; }
          else { st.aiState = "ROAM"; st.hasWarned = false; }
        }
        break;
      case "FLEE": {
        let threatPos = playerPosRef;
        let bestD = distanceXZ(st.pos, playerPosRef);
        for (const other of creatures) {
          if (other === c) continue;
          if (other.state.temperament === TEMPERAMENT.AGGRESSIVE) {
            const d = distanceXZ(st.pos, other.state.pos);
            if (d < bestD) { bestD = d; threatPos = other.state.pos; }
          }
        }
        const fleeSpeed = cfg.moveSpeed * getFleeFactor(st);
        moveAway(c, threatPos, fleeSpeed, dt);
        st.fleeTime -= dt;
        if (st.fleeTime <= 0) {
          if (distanceXZ(st.pos, st.homePos) > st.leashRadius * 0.8) st.aiState = "RETURN";
          else st.aiState = "ROAM";
        }
        break;
      }
      case "RETURN":
        moveTowards(c, st.homePos, cfg.moveSpeed * 0.85, dt);
        if (distanceXZ(st.pos, st.homePos) < 1.2) { st.aiState = "ROAM"; st.aiTimer = 0; st.isAggroed = false; }
        break;
      case "ALERT":
        st.aiTimer += dt;
        if (hasTarget && targetPos) {
          const dx = targetPos.x - st.pos.x;
          const dz = targetPos.z - st.pos.z;
          st.facing = Math.atan2(dx, dz);
        } else if (!hasTarget) { st.aiState = "ROAM"; break; }
        if (st.aiTimer > 0.32) { st.aiState = "REPOSITION"; st.aiTimer = 0; }
        break;
      case "REPOSITION": {
        if (!hasTarget) { st.aiState = "ROAM"; break; }
        const pref = cfg.preferredDistance ?? 4.0;
        const len = distToTarget;
        st.facing = Math.atan2(targetPos.x - st.pos.x, targetPos.z - st.pos.z);
        const diff = len - pref;
        if (Math.abs(diff) < 0.6) { st.aiState = "WINDUP"; st.aiTimer = 0; break; }
        if (diff < 0) moveAway(c, targetPos, cfg.moveSpeed, dt);
        else moveTowards(c, targetPos, cfg.moveSpeed, dt);
        if (distanceXZ(st.pos, st.homePos) > st.leashRadius) st.aiState = "RETURN";
        break;
      }
      case "WINDUP":
        st.aiTimer += dt;
        if (hasTarget && targetPos) {
          const dx = targetPos.x - st.pos.x;
          const dz = targetPos.z - st.pos.z;
          st.facing = Math.atan2(dx, dz);
          st._windupTargetPos = { ...targetPos };
          st._windupTargetCreature = targetCreature;
          st._windupIsPlayer = isPlayerTarget;
        }
        if (st.aiTimer >= cfg.windup) {
          // fire towards windup target (or current if missing)
          const aimPos = st._windupTargetPos ?? targetPos ?? playerPosRef;
          const dx = aimPos.x - st.pos.x;
          const dz = aimPos.z - st.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          const dir = { x: dx / len, y: 0, z: dz / len };
          // pass stored target info via closure? we just fire; projectile will handle targeting via swept hit, direction is initial
          // For wildkin target, we still fire same direction
          const projectileOwner = c;
          // store target hint on creature for testing? not needed
          callbacks.onRequestProjectile(st.pos, dir, projectileOwner);
          st.aiState = "RECOVER";
          st.aiTimer = 0;
          st._windupTargetPos = null;
          st._windupTargetCreature = null;
        }
        break;
      case "RECOVER":
        st.aiTimer += dt;
        if (st.aiTimer >= (cfg.shotCooldown ?? 1.6)) {
          if (hasTarget) {
            const pref = cfg.preferredDistance ?? 4.0;
            if (Math.abs(distToTarget - pref) < 0.9) { st.aiState = "WINDUP"; st.aiTimer = 0; }
            else { st.aiState = "REPOSITION"; st.aiTimer = 0; }
          } else { st.aiState = "ROAM"; }
        }
        break;
      default:
        st.aiState = "ROAM";
        break;
    }
  }

  // Consumers such as targeting and projectile collision should never receive
  // a creature that has been secured into a pending bond.
  function getCreatures() { return creatures.filter((creature) => !creature.state.bondCaptured); }
  function getAliveCreatures() {
    // When region activation is active, only active-region creatures are considered alive for gameplay (targeting, focus rings)
    // Keep inactive out of targeting to prevent invisible attacks
    const alive = creatures.filter(isLiveCreature);
    if (activeRegionSet === null) return alive;
    return alive.filter(c => isRegionActive(c.state.regionId));
  }
  function getAllAliveCreatures() { return creatures.filter(isLiveCreature); }

  function setBondingTarget(id = null) {
    let found = null;
    for (const creature of creatures) {
      const shouldHold = id !== null && creature.state.id === id && isLiveCreature(creature);
      creature.state.bondingHeld = shouldHold;
      if (shouldHold) {
        creature.showFocusRing(false);
        found = creature;
      }
    }
    return found;
  }

  function secureBondTarget(id) {
    const creature = creatures.find((candidate) => candidate.state.id === id) ?? null;
    if (!creature || !isLiveCreature(creature) || !creature.state.bondingHeld) return null;
    creature.state.bondingHeld = false;
    creature.state.bondCaptured = true;
    creature.state.isAggroed = false;
    creature.showFocusRing(false);
    creature.setVisible(false);
    creature.disableCollision?.();
    return creature;
  }

  function reset() {
    for (const c of creatures) {
      c.state.isDead = false;
      c.state.noRespawnThisRun = false;
      c.state.bondingHeld = false;
      c.state.bondCaptured = false;
      c.state.health = c.state.cfg.health;
      c.state.aiState = "ROAM";
      c.state.aiTimer = 0;
      c.state.isAggroed = false;
      c.state.hurtTime = 0;
      c.state.respawnRemaining = 0;
      c.state.facing = Math.random() * Math.PI * 2;
      const home = c.state.homePos ?? c.state.spawnPos;
      const startY = home.y + c.state.cfg.capsuleHalfHeight + c.state.cfg.capsuleRadius + 0.05;
      const pos = { x: home.x, y: startY, z: home.z };
      c.setPosition(pos);
      if (c.enableCollision) c.enableCollision();
      c._regionInactive = false;
      // Respect activeRegionSet if set — if creature's region inactive, keep hidden/disabled
      const shouldBeVisible = isRegionActive(c.state.regionId);
      c.setVisible(shouldBeVisible);
      if (!shouldBeVisible && c.disableCollision) c.disableCollision();
      c.setVisualScaleMultiplier(1);
      c.showFocusRing(false);
      c._respawnPop = undefined;
      c._deathVisibleTime = undefined;
      c.state.targetLungeDir = null;
      c.state.hasWarned = false;
      c.state.warnTime = 0;
      c.state.fleeTime = 0;
      c.state.retaliationTargetId = null;
      c.state.retaliationRemaining = 0;
      c.state.playerDamaged = false;
      c.state.lastAttackerId = null;
      c.state.steerHold = 0;
      c.state.steerAngle = null;
      c.state.timeInsideNotice = 0;
      c.state._regionInactive = false;
    }
    // Re-apply activeRegions to ensure correct visibility after reset
    if (activeRegionSet) setActiveRegions(activeRegionSet);
  }

  function dispose() {
    for (const c of creatures) c.dispose();
    creatures.length = 0;
  }

  function isAnyAggroedNearby() {
    return creatures.some(c => isLiveCreature(c) && c.state.isAggroed && isRegionActive(c.state.regionId) && distanceXZ(c.state.pos, playerPosRef) < 7);
  }
  function isAnyAggroedNearbyActive() { return isAnyAggroedNearby(); }

  function setTemperamentDebugVisible(v) {
    for (const c of creatures) c.setTemperamentDebugVisible?.(v);
  }

  return {
    update, getCreatures, getAliveCreatures, getAllAliveCreatures, damageCreature, setPlayerPos, setPlayerState, setInvulnChecker, setPlayerCollider,
    getAliveCount, isAnyAggroedNearby, isAnyAggroedNearbyActive, reset, dispose, setTemperamentDebugVisible,
    setActiveRegions, getActiveCreatures, getActiveAliveCreatures, getActiveCreatureCount, isRegionActive,
    setBondingTarget, secureBondTarget,
    getActiveRegionSet: () => activeRegionSet ? new Set(activeRegionSet) : null,
    setWorldRegistry: (wr) => { worldRegistryRef = wr; },
    _creatures: creatures,
    _selectTarget: selectPlayerOrWildkinTarget,
    _dealWildkin: dealDamageToWildkin,
  };
}
