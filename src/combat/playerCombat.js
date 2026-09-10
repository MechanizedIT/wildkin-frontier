// src/combat/playerCombat.js — player health, attack, i-frames, knockback, HUD callbacks
import * as THREE from "three";
import { COMBAT_CONFIG } from "./combatConfig.js";
import { getAttackTargets } from "./combatTargeting.js";

export function createPlayerCombat(opts) {
  const {
    playerMesh,
    characterPhysics,
    gameAudio,
    particleSystem,
    getPlayerState = () => null,
    getCreatures = () => [],
    onHealthChanged = () => {},
    onDeath = () => {},
    onDamageFeedback = () => {},
    scene = null,
  } = opts;

  let health = COMBAT_CONFIG.playerMaxHealth;
  let maxHealth = COMBAT_CONFIG.playerMaxHealth;
  let postHitInvuln = 0;
  let dodgeInvuln = 0;
  let recentAttackTime = -999;
  let recentDamageTime = -999;
  let isDead = false;
  let killCount = 0;

  // Attack state
  let attackActive = false;
  let attackProgress = 0;
  let attackCooldown = 0;
  let impactFired = false;
  let facingLocked = false;
  let lockFacingValue = 0;
  let hitThisSwing = new Set(); // creature ids hit this swing

  // Knockback state
  let knockbackRemaining = 0;
  let knockbackDir = new THREE.Vector3(0, 0, 0);
  let knockbackSpeed = 0;

  // Flash / visual
  let flashTime = 0;
  let screenPulse = 0;

  // Time accumulator for recent windows
  let elapsed = 0;

  // Reference to fieldTool for priority? We'll handle externally

  function canAttack() {
    if (isDead) return false;
    if (attackActive) return false;
    if (attackCooldown > 0) return false;
    const st = getPlayerState();
    if (!st) return true;
    // Cannot attack during climb/jump? Allow but combat vs traversal: movement bands? For now allow only when grounded-ish? Spec says don't root movement, allow attack in any state? But probably block during climb/mantle/jump? We'll allow IDLE/SNEAK/WALK/RUN/FALL/JUMP/DODGE? Actually DODGE may cancel. We'll check mode.
    const blockedModes = new Set(["CLIMB", "MANTLE"]);
    if (blockedModes.has(st.mode)) return false;
    if (blockedModes.has(st.traversalMode)) return false;
    return true;
  }

  function startAttack() {
    if (!canAttack()) return false;
    attackActive = true;
    attackProgress = 0;
    impactFired = false;
    facingLocked = false;
    hitThisSwing.clear();
    recentAttackTime = elapsed;
    // capture facing at start for lock near impact?
    const st = getPlayerState();
    if (st) lockFacingValue = st.facing;
    return true;
  }

  function cancelAttack() {
    if (!attackActive) return;
    attackActive = false;
    attackProgress = 0;
    impactFired = false;
    attackCooldown = COMBAT_CONFIG.attackCooldown * 0.35; // short cooldown on cancel
    facingLocked = false;
    hitThisSwing.clear();
  }

  function getMovementModifier() {
    if (!attackActive) return null;
    // cap to 60-70%
    const factor = COMBAT_CONFIG.attackMovementFactor;
    return { factor, facingLocked: facingLocked, lockFacing: lockFacingValue };
  }

  function isAttacking() { return attackActive; }
  function getAttackProgress() { return attackProgress; }
  function getHealth() { return health; }
  function getMaxHealth() { return maxHealth; }

  function configure(config = {}) {
    const requested = Number(config.maxHealth);
    if (!Number.isFinite(requested)) return false;
    const nextMax = Math.min(20, Math.max(1, Math.floor(requested)));
    if (nextMax === maxHealth) return false;
    // Preserve damage already taken when a persistent health bonus changes.
    const deficit = Math.max(0, maxHealth - health);
    maxHealth = nextMax;
    health = Math.max(0, Math.min(maxHealth, maxHealth - deficit));
    onHealthChanged(health, maxHealth);
    return true;
  }

  function isInvulnerable() {
    if (postHitInvuln > 0) return true;
    if (dodgeInvuln > 0) return true;
    return false;
  }

  function isDodgingInvuln() { return dodgeInvuln > 0; }

  function takeDamage(amount, sourcePos, opts = {}) {
    if (isDead) return false;
    if (isInvulnerable()) return false;
    if (opts.ignoreInvuln) {
      // for testing
    } else if (postHitInvuln > 0 || dodgeInvuln > 0) return false;

    health -= amount;
    if (health < 0) health = 0;
    postHitInvuln = COMBAT_CONFIG.postHitInvulnerability;
    recentDamageTime = elapsed;
    flashTime = 0.18;
    screenPulse = 0.22;

    // Knockback away from source
    if (sourcePos && characterPhysics) {
      const st = getPlayerState();
      const pos = st ? st.pos : playerMesh.position;
      const dx = pos.x - sourcePos.x;
      const dz = pos.z - sourcePos.z;
      const len = Math.hypot(dx, dz) || 1;
      knockbackDir.set(dx / len, 0, dz / len);
      knockbackRemaining = COMBAT_CONFIG.playerKnockbackDuration;
      knockbackSpeed = COMBAT_CONFIG.playerKnockbackDistance / COMBAT_CONFIG.playerKnockbackDuration;
    }

    onHealthChanged(health, maxHealth);
    onDamageFeedback({ health, flash: true });

    // Audio / particles
    if (gameAudio && gameAudio.playHit) gameAudio.playHit();
    else if (gameAudio && gameAudio.playHurt) gameAudio.playHurt();

    if (particleSystem && particleSystem.spawnBurst) {
      // Spawn generic hit burst at player pos
      const st = getPlayerState();
      const mockNode = { state: { position: { x: st.pos.x, y: st.pos.y, z: st.pos.z } }, type: { impactEffectHeight: 0.5, resourceId: "generic" } };
      try { particleSystem.spawnBurst(mockNode, 6); } catch {}
    }

    // Player flash via material
    if (playerMesh) {
      playerMesh.traverse(obj => {
        if (obj.isMesh && obj.material && obj.material.emissive) {
          obj.material._origEmissive = obj.material.emissive.getHex();
        }
      });
    }

    if (health <= 0 && !isDead) {
      isDead = true;
      attackActive = false;
      facingLocked = false;
      // stop further damage
      onDeath({ kills: killCount });
    }
    return true;
  }

  function heal(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || isDead) return false;
    health = Math.min(maxHealth, health + value);
    onHealthChanged(health, maxHealth);
    return true;
  }

  function grantInvulnerability(seconds) {
    const duration = Number(seconds);
    if (!Number.isFinite(duration) || duration <= 0) return false;
    postHitInvuln = Math.max(postHitInvuln, Math.min(5, duration));
    return true;
  }

  function tryApplyAttackHits(playerPos, playerFacing) {
    if (!attackActive || impactFired) return [];
    const creatures = getCreatures();
    const targets = getAttackTargets(playerPos, playerFacing, creatures, {
      range: COMBAT_CONFIG.attackRange,
      arcDegrees: COMBAT_CONFIG.attackArcDegrees,
      verticalTolerance: COMBAT_CONFIG.verticalTolerance,
      maxTargets: COMBAT_CONFIG.maxTargetsPerAttack,
    });
    // Ensure each creature only once per swing
    const hits = [];
    for (const c of targets) {
      if (hitThisSwing.has(c.id)) continue;
      if (c.isDead) continue;
      hitThisSwing.add(c.id);
      hits.push(c);
    }
    return hits;
  }

  function update(dt, intent, playerPos, playerFacing, creatureList) {
    elapsed += dt;

    // Update invuln timers
    if (postHitInvuln > 0) postHitInvuln = Math.max(0, postHitInvuln - dt);
    if (dodgeInvuln > 0) dodgeInvuln = Math.max(0, dodgeInvuln - dt);
    if (flashTime > 0) flashTime = Math.max(0, flashTime - dt);
    if (screenPulse > 0) screenPulse = Math.max(0, screenPulse - dt);

    // Handle knockback decay (will be applied in playerController via modifier; we also apply here as direct physics move fallback)
    if (knockbackRemaining > 0) {
      knockbackRemaining = Math.max(0, knockbackRemaining - dt);
      if (knockbackRemaining <= 0) knockbackDir.set(0, 0, 0);
    }

    // Check dodge invuln activation: if player state switched to DODGE, activate dodge invuln
    const st = getPlayerState();
    if (st && st.mode === "DODGE") {
      // Activate dodge invuln at start of dodge (main portion)
      // Keep dodgeInvuln at configured duration while in dodge; refresh if just entered
      if (dodgeInvuln <= 0.02) {
        // Check cooldown? Set full
        dodgeInvuln = COMBAT_CONFIG.dodgeInvulnerability;
      }
    } else {
      // Decay as per timer above; no extend
    }

    // Attack handling
    // Check for dodge cancel before impact
    if (attackActive && !impactFired && st && st.mode === "DODGE") {
      // Dodge before impact cancels attack
      cancelAttack();
      // Don't start new attack this frame if dodge requested
      return { attackActive, attackProgress, impact: false, hits: [] };
    }

    // If attack active, progress
    if (attackActive) {
      attackProgress += dt / COMBAT_CONFIG.attackDuration;
      if (attackProgress > 1) attackProgress = 1;

      // Facing commit window around impact
      const impactT = COMBAT_CONFIG.attackImpactNormalized;
      const win = COMBAT_CONFIG.facingCommitWindow;
      if (attackProgress >= impactT - win * 0.5 && attackProgress <= impactT + win) {
        facingLocked = true;
      } else if (attackProgress > impactT + win) {
        facingLocked = false;
      }

      // Impact event
      let hits = [];
      if (!impactFired && attackProgress >= impactT) {
        impactFired = true;
        // Resolve targets at this moment
        const pos = playerPos ?? (st ? st.pos : null);
        const facing = playerFacing ?? (st ? st.facing : 0);
        if (pos) {
          hits = tryApplyAttackHits(pos, facing);
          // Call hits handling via callback? For now return hits for system to damage creatures
          recentAttackTime = elapsed; // update on impact as well
          // Play whoosh? FieldTool will handle whoosh at impact; also play here?
        }
        // Even if no hits, impact considered fired
      }

      if (attackProgress >= 1) {
        attackActive = false;
        attackProgress = 0;
        impactFired = false;
        attackCooldown = COMBAT_CONFIG.attackCooldown;
        facingLocked = false;
        hitThisSwing.clear();
      }

      if (hits && hits.length > 0) {
        return { attackActive, attackProgress, impact: impactFired, hits };
      }
      return { attackActive, attackProgress, impact: impactFired && hits.length === 0 ? false : impactFired, hits: hits ?? [] };
    } else {
      // Not attacking: handle cooldown
      if (attackCooldown > 0) attackCooldown = Math.max(0, attackCooldown - dt);

      // Check intent to start attack
      const attackRequested = intent?.attackRequested;
      if (attackRequested && canAttack()) {
        const started = startAttack();
        if (started) {
          // Consume attack externally via callback? We'll signal via return
          // Attack will progress next frame, but also set progress slightly for immediate feedback? Keep 0.
        }
      }
      // Update flash visual
      // Handle player mesh flash
      if (playerMesh && flashTime > 0) {
        const t = flashTime / 0.18;
        // Lerp emissive
        playerMesh.traverse(obj => {
          if (obj.isMesh && obj.material) {
            if (obj.material.emissive) {
              if (t > 0.5) obj.material.emissive.setHex(0xff4444);
              else obj.material.emissive.setHex(0x884444);
            }
            if (obj.material.opacity !== undefined) {
              // ignore
            }
          }
        });
      } else if (playerMesh && flashTime <= 0) {
        // Restore
        playerMesh.traverse(obj => {
          if (obj.isMesh && obj.material && obj.material.emissive && obj.material._origEmissive !== undefined) {
            obj.material.emissive.setHex(obj.material._origEmissive);
          }
        });
      }
      return { attackActive, attackProgress, impact: false, hits: [] };
    }
  }

  function reset() {
    health = maxHealth;
    postHitInvuln = 0;
    dodgeInvuln = 0;
    recentAttackTime = -999;
    recentDamageTime = -999;
    isDead = false;
    attackActive = false;
    attackProgress = 0;
    attackCooldown = 0;
    impactFired = false;
    facingLocked = false;
    hitThisSwing.clear();
    knockbackRemaining = 0;
    knockbackDir.set(0, 0, 0);
    flashTime = 0;
    screenPulse = 0;
    elapsed = 0;
    onHealthChanged(health, maxHealth);
  }

  function isCombatRecentlyActive() {
    const sinceAttack = elapsed - recentAttackTime;
    const sinceDamage = elapsed - recentDamageTime;
    return sinceAttack < COMBAT_CONFIG.combatDisengageDelay || sinceDamage < COMBAT_CONFIG.combatDisengageDelay;
  }

  function isPlayerDead() { return isDead; }

  function getKnockback() {
    if (knockbackRemaining <= 0) return null;
    return { dir: knockbackDir.clone(), remaining: knockbackRemaining, speed: knockbackSpeed };
  }

  return {
    update,
    startAttack,
    cancelAttack,
    canAttack,
    getMovementModifier,
    isAttacking,
    getAttackProgress,
    getHealth,
    getMaxHealth,
    configure,
    takeDamage,
    heal,
    grantInvulnerability,
    isInvulnerable,
    isDodgingInvuln,
    isDead: isPlayerDead,
    isCombatRecentlyActive,
    getKnockback,
    reset,
    tryApplyAttackHits,
    getState: () => ({
      health, maxHealth, postHitInvuln, dodgeInvuln, attackActive, attackProgress, attackCooldown, impactFired, knockbackRemaining, isDead, recentAttackTime, recentDamageTime, elapsed, facingLocked,
    }),
    _internal: { get elapsed() { return elapsed; }, get recentAttackTime() { return recentAttackTime; }, get recentDamageTime() { return recentDamageTime; } },
  };
}
