// src/creatures/temperament.js — data-driven temperament decision helpers (pure, testable)
// Separates combat archetype (rusher/spitter HOW) from temperament (WHEN/WHY)

export const TEMPERAMENT = {
  AGGRESSIVE: "AGGRESSIVE",
  TERRITORIAL: "TERRITORIAL",
  DEFENSIVE: "DEFENSIVE",
  SKITTISH: "SKITTISH",
};

export const TEMPERAMENT_CONFIG = {
  [TEMPERAMENT.AGGRESSIVE]: {
    initiatesWithoutHit: true,
    warnBeforeAttack: false,
    retaliates: true,
    flees: false,
  },
  [TEMPERAMENT.TERRITORIAL]: {
    initiatesWithoutHit: false, // needs intrusion/persist
    warnBeforeAttack: true,
    warnDuration: 1.0,
    personalSpace: 2.2,
    persistTime: 1.2,
    retaliates: true,
    flees: false,
  },
  [TEMPERAMENT.DEFENSIVE]: {
    initiatesWithoutHit: false,
    retaliates: true,
    retaliationDuration: 5.0,
    flees: false,
  },
  [TEMPERAMENT.SKITTISH]: {
    initiatesWithoutHit: false,
    flees: true,
    fleeSpeedFactor: 1.35,
    fleeUrgencyFactor: 1.6,
    fleeDuration: 3.5,
    postHitFleeDuration: 4.5,
  },
};

// Pure decision helpers — these operate on plain objects and distances, no THREE/Rapier.

// Aggressive may initiate against eligible living target within notice radius without being hit.
export function aggressiveShouldInitiate({ dist, noticeRadius, isTargetEligible, temperament }) {
  if (temperament !== TEMPERAMENT.AGGRESSIVE) return false;
  if (!isTargetEligible) return false;
  return dist <= noticeRadius;
}

// Territorial: needs personal-space intrusion OR persistent proximity within notice for persistTime
export function territorialShouldWarn({ dist, noticeRadius, personalSpace, timeInsideNotice, temperament }) {
  if (temperament !== TEMPERAMENT.TERRITORIAL) return false;
  if (dist <= personalSpace) return true; // immediate warn on intrusion
  if (dist <= noticeRadius && timeInsideNotice >= (TEMPERAMENT_CONFIG.TERRITORIAL.persistTime ?? 1.0)) return true;
  return false;
}

export function territorialShouldAttack({ dist, personalSpace, hasWarned, warnedTime, warnDuration, temperament }) {
  if (temperament !== TEMPERAMENT.TERRITORIAL) return false;
  if (!hasWarned) return false;
  if (warnedTime < (warnDuration ?? 1.0)) return false; // must complete warning
  return dist <= personalSpace + 0.3; // still inside/near
}

// Defensive: only retaliates against actor that damaged it, for bounded time
export function defensiveShouldRetaliate({ temperament, attackerId, isAttackerAlive, timeSinceHit, retaliationDuration }) {
  if (temperament !== TEMPERAMENT.DEFENSIVE) return false;
  if (!attackerId) return false;
  if (!isAttackerAlive) return false;
  return timeSinceHit <= (retaliationDuration ?? 5.0);
}

// Skittish: flees from approaching threat; more urgently after hit
export function skittishShouldFlee({ temperament, dist, noticeRadius, wasHitRecently, hitRecencyWindow }) {
  if (temperament !== TEMPERAMENT.SKITTISH) return false;
  if (wasHitRecently && hitRecencyWindow !== undefined) return true;
  // flee if approaching / within notice
  return dist <= noticeRadius + 0.5;
}

export function getFleeSpeedFactor({ temperament, wasHit }) {
  if (temperament !== TEMPERAMENT.SKITTISH) return 1;
  if (wasHit) return TEMPERAMENT_CONFIG.SKITTISH.fleeUrgencyFactor ?? 1.6;
  return TEMPERAMENT_CONFIG.SKITTISH.fleeSpeedFactor ?? 1.35;
}

// Helper to test if a wildkin is eligible target based on species/disposition/hostile config
export function isWildkinEligibleTarget({ attacker, target, hostileSpecies = [], allowAllAggressive = false }) {
  if (!target || !attacker) return false;
  if (target.state?.isDead || target.isDead) return false;
  if (target.state?.aiState === "RESPAWNING") return false;
  if (attacker.state?.id === target.state?.id) return false;
  if (attacker.id === target.id) return false;
  // dead/self check
  if (target.state?.id && attacker.state?.id && target.state.id === attacker.state.id) return false;
  const targetSpecies = target.state?.speciesTag ?? target.speciesTag ?? target.type ?? "";
  const attackerSpecies = attacker.state?.speciesTag ?? attacker.speciesTag ?? attacker.type ?? "";
  if (targetSpecies === attackerSpecies && !allowAllAggressive) {
    // same species not hostile by default unless explicitly configured
    if (!hostileSpecies.includes(targetSpecies)) return false;
  }
  if (hostileSpecies.length > 0) {
    return hostileSpecies.includes(targetSpecies);
  }
  // if no hostile list but aggressive+allowAll, allow any different species
  if (allowAllAggressive) return true;
  return false;
}
