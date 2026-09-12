export const FALL_IMPACT_CONFIG = Object.freeze({
  safeDropMeters: 2.4,
  additionalDamageStepMeters: 1.8,
  baseDamage: 1,
  maxDamage: 4,
});

export function calculateFallImpact(peakFeetY, landingFeetY, config = FALL_IMPACT_CONFIG) {
  if (!Number.isFinite(peakFeetY) || !Number.isFinite(landingFeetY)) return null;
  const dropMeters = Math.max(0, peakFeetY - landingFeetY);
  if (dropMeters <= config.safeDropMeters) return null;
  const extraSteps = Math.floor((dropMeters - config.safeDropMeters) / config.additionalDamageStepMeters);
  const damage = Math.min(config.maxDamage, config.baseDamage + extraSteps);
  return { damage, dropMeters, peakFeetY, landingFeetY };
}
