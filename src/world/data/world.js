// src/world/data/world.js — data-driven world definition (Phase 3.5A)
// Source of truth for region/pocket identity, bounds, adjacency, and authored content.
// Migrates the existing systems-test playground through the normalized data path — no second loader.
// All assets/data remain packaged locally; no runtime network requests.

export const WORLD_DATA = {
  version: "3.5A",
  camp: {
    id: "camp",
    pos: { x: 0, y: 0, z: 9.5 },
    radius: 2.5,
    description: "Placeholder Camp — drop pod, Matter Resonator, frontier gate (no gameplay yet)",
  },
  regions: [
    {
      id: "south_basin",
      displayName: "South Basin",
      // Activation volume — player XZ inside determines current region
      bounds: { minX: -12.5, maxX: 12.5, minZ: 2.5, maxZ: 11.5 },
      neighbors: ["central_basin"],
      pockets: [],
      // Static world placeholders (visuals/collision still via playground for Phase 3.5A, but data exists)
      ground: { type: "plain", color: 0x7bb26a },
      props: [],
      // Resources — 7 nodes in south (z >2.5)
      resources: [
        { id: "tree_south_01", type: "tree", pos: { x: 1.2, y: 0, z: 4.2 } },
        { id: "tree_south_02", type: "tree", pos: { x: -9.0, y: 0, z: 6.5 } },
        { id: "tree_south_03", type: "tree", pos: { x: 8.8, y: 0, z: 3.2 } },
        { id: "rock_south_01", type: "rock", pos: { x: 3.2, y: 0, z: 2.6 } },
        { id: "rock_south_02", type: "rock", pos: { x: 4.6, y: 0, z: 3.4 } },
        { id: "fiber_south_01", type: "fiber", pos: { x: 0.2, y: 0, z: 4.6 } },
        { id: "fiber_south_02", type: "fiber", pos: { x: -2.2, y: 0, z: 6.0 } },
      ],
      // Creatures — 3 in south, includes breeding breathing room skittish near spawn
      creatures: [
        {
          id: "rusher_near",
          type: "rusher",
          temperament: "SKITTISH",
          speciesTag: "fang",
          pos: { x: -1.2, y: 0, z: 6.8 },
          homePos: { x: -1.2, y: 0, z: 6.8 },
          roamRadius: 3.0,
          noticeRadius: 5.0,
          personalSpace: 1.8,
          leashRadius: 6.5,
        },
        {
          id: "rusher_mid_1",
          type: "rusher",
          temperament: "TERRITORIAL",
          speciesTag: "fang",
          pos: { x: -6.0, y: 0, z: 3.8 },
          homePos: { x: -6.0, y: 0, z: 3.8 },
          roamRadius: 2.5,
          noticeRadius: 6.0,
          personalSpace: 2.6,
          leashRadius: 7.0,
        },
        {
          id: "rusher_mid_2",
          type: "rusher",
          temperament: "DEFENSIVE",
          speciesTag: "fang",
          pos: { x: 7.0, y: 0, z: 4.5 },
          homePos: { x: 7.0, y: 0, z: 4.5 },
          roamRadius: 2.8,
          noticeRadius: 5.5,
          personalSpace: 2.0,
          leashRadius: 7.5,
        },
      ],
      traversal: {
        platforms: [],
        obstacles: [],
        jumpTraversals: [],
        climbables: [],
      },
      majorWaypoints: [
        // data only — no gameplay yet
        { id: "wp_south_gate", type: "majorWaypoint", pos: { x: 0, y: 0, z: 8.2 } },
      ],
      extractionBeacons: [
        { id: "beacon_south_01", type: "extractionBeacon", pos: { x: -2.0, y: 0, z: 5.0 } },
      ],
      pois: [
        { id: "poi_south_chest", type: "chest", pos: { x: 4.0, y: 0, z: 7.0 }, requires: null },
      ],
    },
    {
      id: "central_basin",
      displayName: "Central Basin",
      bounds: { minX: -12.5, maxX: 12.5, minZ: -4.0, maxZ: 2.5 },
      neighbors: ["south_basin", "north_highlands"],
      pockets: [],
      ground: { type: "plain", color: 0x7bb26a },
      props: [],
      resources: [
        { id: "tree_central_01", type: "tree", pos: { x: -8.6, y: 0, z: 1.8 } },
        { id: "tree_central_02", type: "tree", pos: { x: 6.2, y: 0, z: -1.8 } },
        { id: "rock_central_01", type: "rock", pos: { x: 7.2, y: 0, z: 0.8 } },
        { id: "fiber_central_01", type: "fiber", pos: { x: -7.2, y: 0, z: -1.2 } },
        { id: "fiber_central_02", type: "fiber", pos: { x: 1.0, y: 0, z: -3.8 } },
        { id: "fiber_central_03", type: "fiber", pos: { x: 8.4, y: 0, z: -2.4 } },
      ],
      creatures: [
        {
          id: "spitter_outer_1",
          type: "spitter",
          temperament: "AGGRESSIVE",
          speciesTag: "spit",
          pos: { x: 1.0, y: 0, z: 2.0 },
          homePos: { x: 1.0, y: 0, z: 2.0 },
          roamRadius: 2.2,
          noticeRadius: 6.5,
          personalSpace: 2.2,
          leashRadius: 8.0,
          hostileSpecies: ["flutter"],
        },
        {
          id: "rusher_hunter",
          type: "rusher",
          temperament: "AGGRESSIVE",
          speciesTag: "fang",
          pos: { x: -9.2, y: 0, z: -3.8 },
          homePos: { x: -9.2, y: 0, z: -3.8 },
          roamRadius: 3.2,
          noticeRadius: 7.0,
          personalSpace: 2.0,
          leashRadius: 9.0,
          hostileSpecies: ["flutter"],
        },
      ],
      traversal: {
        // Low platforms and jump gaps live in central basin (authored data mirrors playground)
        platforms: [
          { id: "lowA", x: -5.8, z: -1.2, w: 4.2, h: 3.6, height: 1.25 },
          { id: "lowB", x: 0.8, z: -1.2, w: 4.0, h: 3.4, height: 1.25 },
        ],
        obstacles: [
          { id: "obs_center_east", x: 4.2, z: 0.6, w: 1.8, h: 1.8, height: 1.0 },
          { id: "obs_center_wall", x: -3.5, z: 2.2, w: 2.4, h: 0.6, height: 1.1 },
        ],
        jumpTraversals: [
          {
            id: "gap_east_01",
            triggerCenter: { x: -3.70, z: -1.2 },
            triggerRadius: 1.45,
            direction: { x: 1, z: 0 },
            landingRegion: { minX: -1.2, maxX: 2.2, minZ: -2.4, maxZ: 0.1, height: 1.25 },
            minTakeoffSpeed: 2.2,
            maxLandingCorrection: 1.4,
            landingPlatformId: "lowB",
          },
          {
            id: "gap_west_01",
            triggerCenter: { x: -1.25, z: -0.4 },
            triggerRadius: 1.45,
            direction: { x: -1, z: 0 },
            landingRegion: { minX: -7.6, maxX: -3.9, minZ: -2.4, maxZ: 0.3, height: 1.25 },
            minTakeoffSpeed: 2.2,
            maxLandingCorrection: 1.4,
            landingPlatformId: "lowA",
          },
        ],
        climbables: [],
      },
      majorWaypoints: [],
      extractionBeacons: [
        { id: "beacon_central_01", type: "extractionBeacon", pos: { x: 0.5, y: 0, z: -1.0 } },
      ],
      pois: [
        { id: "poi_central_barrier", type: "barrier", pos: { x: -5.0, y: 0, z: 0.5 }, requires: { type: "companionAbility", id: "breakBarrier" } },
      ],
    },
    {
      id: "north_highlands",
      displayName: "North Highlands",
      bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: -4.0 },
      neighbors: ["central_basin"],
      pockets: [],
      ground: { type: "plain", color: 0x7bb26a },
      props: [],
      resources: [
        { id: "tree_north_01", type: "tree", pos: { x: 2.2, y: 2.4, z: -7.2 } },
        { id: "rock_north_01", type: "rock", pos: { x: -1.8, y: 0, z: -4.8 } },
        { id: "rock_north_02", type: "rock", pos: { x: -3.0, y: 0, z: -4.5 } },
        { id: "fiber_north_01", type: "fiber", pos: { x: -4.2, y: 0, z: -8.2 } },
        { id: "fiber_north_02", type: "fiber", pos: { x: 4.0, y: 0, z: -5.8 } },
      ],
      creatures: [
        {
          id: "spitter_outer_2",
          type: "spitter",
          temperament: "SKITTISH",
          speciesTag: "flutter",
          pos: { x: -6.8, y: 0, z: -4.2 },
          homePos: { x: -6.8, y: 0, z: -4.2 },
          roamRadius: 2.5,
          noticeRadius: 5.0,
          personalSpace: 1.6,
          leashRadius: 7.0,
        },
      ],
      traversal: {
        platforms: [
          { id: "high", x: 2.2, z: -7.2, w: 4.4, h: 3.8, height: 2.4 },
        ],
        obstacles: [],
        jumpTraversals: [],
        climbables: [
          {
            id: "ladder_south_high",
            x: 2.2,
            z: -5.05,
            w: 1.9,
            h: 0.5,
            bottomY: 0,
            topY: 2.4,
            topPlatform: { x: 2.2, z: -7.2, w: 4.4, h: 3.8, topY: 2.4, aabb: { minX: 0.0, maxX: 4.4, minZ: -9.1, maxZ: -5.3 } },
            wallNormal: { x: 0, z: 1 },
            approachDir: { x: 0, z: -1 },
            topEntryRegion: { minX: 1.25, maxX: 3.15, minZ: -6.0, maxZ: -5.25 },
            mantleExit: { x: 2.2, z: -6.4 },
          },
        ],
      },
      majorWaypoints: [
        { id: "wp_north_peak", type: "majorWaypoint", pos: { x: 2.2, y: 2.4, z: -7.2 } },
      ],
      extractionBeacons: [],
      pois: [
        { id: "poi_north_island", type: "chest", pos: { x: 8.0, y: 0, z: -8.5 }, requires: { type: "companionAbility", id: "swim" } },
      ],
    },
  ],
  // Global anchors for convenience (mirrors region-owned but also top-level for registry)
  startAnchorId: "camp_gate",
};

export default WORLD_DATA;
