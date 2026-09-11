// Provisional calibration of the repaired Mossling's measured in-place clips.
// Speeds are metres/second at the GLB's native size; instance size scales travel.
export const MOSSLING_MOTION = Object.freeze({
  walk: 0.65,
  run: 1.9,
  companionScale: 0.7,
  catchupCadence: 1.5,
  recoverCadence: 1.7,
  acceleration: 2.4,
});

export function mosslingTravelSpeed(scale = 1, authoredMoveSpeed = MOSSLING_MOTION.run) {
  return authoredMoveSpeed * scale;
}
