// Deterministic, rendering-independent resonance interaction.
export const BONDING_CONFIG = Object.freeze({ period: 1.8, target: 0.72, tolerance: 0.18, successes: 3, misses: 3, inputCooldown: 0.3 });
export function createBondingSession(config = BONDING_CONFIG) {
  let elapsed = 0, successes = 0, misses = 0, lastTap = -Infinity, status = "active";
  const phase = () => (Math.sin(elapsed / config.period * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const snapshot = () => ({ elapsed, phase: phase(), successes, misses, status, target: config.target, tolerance: config.tolerance, required: config.successes });
  return {
    update(dt) { if (status === "active" && Number.isFinite(dt) && dt > 0) elapsed += Math.min(dt, 0.1); return snapshot(); },
    tap() {
      if (status !== "active" || elapsed - lastTap < config.inputCooldown) return { ...snapshot(), accepted: false };
      lastTap = elapsed;
      const hit = Math.abs(phase() - config.target) <= config.tolerance;
      if (hit) successes++; else misses++;
      if (successes >= config.successes) status = "success";
      else if (misses >= config.misses) status = "failed";
      return { ...snapshot(), accepted: true, hit };
    },
    cancel() { if (status === "active") status = "cancelled"; return snapshot(); },
    getState: snapshot,
  };
}

export function canBond({ speciesId, secured = [], pending = [], capacity = 1, damaged = false, active = true }) {
  if (!active || !speciesId) return { ok: false, reason: "unavailable" };
  if (damaged) return { ok: false, reason: "Give it space. Return on a new expedition to earn its trust." };
  if (secured.includes(speciesId) || pending.includes(speciesId)) return { ok: false, reason: "This species is already part of your sanctuary." };
  if (pending.length >= capacity) return { ok: false, reason: "Bond capacity full. Extract to secure your new companions." };
  return { ok: true };
}
