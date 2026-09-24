// Provisional soil behavior for the Phase 0.5B bounded dirt-bank fixture.
// Soil excavates directly and loses cohesion locally; it has no bond stress.
export const DIRT_PROFILE=Object.freeze({
  material:2,
  excavationRadius:.98,
  excavationVariation:.09,
  excavationShape:[1.15,.86,.92],
  softness:1.25,
  cohesionRadiusMeters:1.9,
  crumbleSupportLossThreshold:.24,
  supportWindowIntervals:12,
  maxCrumbledProbeUnitsPerEdit:127,
  persistentClodMinProbes:128,
  unsupportedPenalty:.82,
  maxCrumbleSamplesPerEdit:8,
  maxLocalCrumbleWork:12288,
  maxDynamicClods:2,
  crumbleVisualLifetimeSeconds:1.1,
  actorDensity:.32,
  actorFriction:.58,
  detachSpin:[0,0,.72],
});
