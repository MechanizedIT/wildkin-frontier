// src/combat/combatSession.js — derived combatEngaged signal + timers for harvest suppression
import { COMBAT_CONFIG } from "./combatConfig.js";

export function createCombatSession(opts = {}) {
  let elapsed = 0;
  let lastAggroTime = -999;
  let lastAttackTime = -999;
  let lastDamageTime = -999;
  const disengageDelay = opts.disengageDelay ?? COMBAT_CONFIG.combatDisengageDelay;

  function notifyAggro() { lastAggroTime = elapsed; }
  function notifyAttack() { lastAttackTime = elapsed; }
  function notifyDamage() { lastDamageTime = elapsed; }

  function update(dt, isAggroedNearby) {
    elapsed += dt;
    if (isAggroedNearby) lastAggroTime = elapsed;
  }

  function isEngaged() {
    const sinceAggro = elapsed - lastAggroTime;
    const sinceAttack = elapsed - lastAttackTime;
    const sinceDamage = elapsed - lastDamageTime;
    // Combat engaged if any recent within delay AND aggro or recent activity
    const recentlyAttacked = sinceAttack < disengageDelay;
    const recentlyDamaged = sinceDamage < disengageDelay;
    const aggroRecently = sinceAggro < 1.0; // aggro considered engaged for short window; but if aggro persists, update keeps lastAggro fresh
    // If aggro is currently true, update already refreshed lastAggro, so check recency
    if (aggroRecently) return true;
    if (recentlyAttacked) return true;
    if (recentlyDamaged) return true;
    return false;
  }

  function reset() {
    elapsed = 0;
    lastAggroTime = -999;
    lastAttackTime = -999;
    lastDamageTime = -999;
  }

  return {
    update,
    isEngaged,
    notifyAggro,
    notifyAttack,
    notifyDamage,
    reset,
    getState: () => ({ elapsed, lastAggroTime, lastAttackTime, lastDamageTime, engaged: isEngaged() }),
  };
}
