// Phase 0 only. Never imported by the shipping game.
export const LAB = Object.freeze({
  version: 'phase0-v1', seed: 9212026, voxelMeters: 1,
  fixedStep: 1 / 60, originThreshold: 256, originStride: 256,
  reach: 7, walkSpeed: 5, flySpeed: 18, gravity: -20,
  brushRadius: 0.8, brushDepth: 0.5,
  maxDebris: 4, maxDebrisVoxels: 4096, maxCompoundBoxes: 64, maxDrops: 64,
  smoothProfiles: { desktop: { radiusMeters: 16, verticalMeters: 16 }, mobile: { radiusMeters: 16, verticalMeters: 8 } },
  profiles: {
    desktop: { radiusMeters: 32, dpr: 1, workers: 2, frameBudget: 16.7, hitchBudget: 8, memoryMB: 750 },
    mobile: { radiusMeters: 16, dpr: 1, workers: 1, frameBudget: 33.3, hitchBudget: 12, memoryMB: 300 },
  },
});
export const MATERIALS = Object.freeze([
  { name: 'Air', color: [0, 0, 0] },
  { name: 'Stone', color: [0.48, 0.59, 0.64], tool: 'pick', drop: 'Stone chips' },
  { name: 'Clay', color: [0.73, 0.47, 0.29], tool: 'pick', drop: 'Clay clods' },
  { name: 'Wood', color: [0.55, 0.34, 0.15], tool: 'axe', drop: 'Wood pieces' },
]);
