// src/combat/combatConfig.js — centralized Phase 3 tuning
export const COMBAT_CONFIG = {
  // Player health
  playerMaxHealth: 5,
  enemyBaseDamage: 1,
  postHitInvulnerability: 0.68, // 0.60-0.75
  playerKnockbackDistance: 0.9, // 0.7-1.1
  playerKnockbackDuration: 0.19, // 0.15-0.25

  // Attack
  attackDuration: 0.46, // 0.42-0.50
  attackImpactNormalized: 0.46, // 0.42-0.50 through swing
  attackCooldown: 0.13, // 0.10-0.18 after recovery
  attackRange: 1.75, // 1.65-1.85
  attackArcDegrees: 160, // 150-170
  maxTargetsPerAttack: 3,
  baseDamage: 1,
  verticalTolerance: 0.85, // strict vertical check: within ~0.85 units of player's attack height vs creature height (platform check)
  verticalToleranceHarsh: 0.9,

  // Movement during attack
  attackMovementFactor: 0.65, // 60-70% cap
  facingCommitWindow: 0.14, // around impact, facing briefly committed

  // Dodge invuln
  dodgeInvulnerability: 0.22, // 0.18-0.26 during fast/main portion

  // Combat engagement
  combatDisengageDelay: 2.0, // 1.5-2.5

  // XP
  xpRusher: 3, // 2-3
  xpSpitter: 4, // 3-4
};

export const RUSHER_CONFIG = {
  id: "rusher",
  health: 3,
  aggroRadius: 5.5, // 5-6
  moveSpeed: 2.5, // 2.2-2.8
  attackRange: 1.2, // 1.1-1.3
  windup: 0.52, // 0.45-0.60
  lungeDuration: 0.25, // 0.20-0.30
  lungeDistance: 1.3,
  lungeSpeed: 5.2, // derived ~ distance/duration
  recover: 0.65, // 0.55-0.75
  damage: 1,
  respawnSeconds: 10, // 8-12
  knockbackDistance: 0.7, // 0.5-0.9
  hurtLock: 0.16, // 0.12-0.22
  // visual
  capsuleRadius: 0.32,
  capsuleHalfHeight: 0.18,
};

export const SPITTER_CONFIG = {
  id: "spitter",
  health: 2,
  aggroRadius: 6.5, // 6-7
  preferredDistance: 4.0, // 3.5-4.5
  moveSpeed: 1.9, // 1.7-2.1
  windup: 0.65, // 0.55-0.75
  shotCooldown: 1.65, // 1.4-1.9
  recover: 0.45,
  projectileSpeed: 4.3, // 3.8-4.8
  projectileRadius: 0.18,
  projectileLifetime: 3.0, // ~3 sec
  damage: 1,
  respawnSeconds: 10,
  knockbackDistance: 0.6,
  hurtLock: 0.16,
  capsuleRadius: 0.30,
  capsuleHalfHeight: 0.16,
};

export const PROJECTILE_CONFIG = {
  radius: 0.18,
  speed: 4.3,
  lifetime: 3.0,
};

export const XP_CONFIG = {
  rusher: 3,
  spitter: 4,
  moteMagnetRadius: 2.2,
  moteMagnetDelay: 0.28,
  moteCollectRadius: 0.45,
  moteLifetime: 30,
};
