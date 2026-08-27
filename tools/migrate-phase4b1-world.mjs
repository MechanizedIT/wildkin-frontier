import fs from "node:fs";

const path = new URL("../src/world/data/world.json", import.meta.url);
const previous = JSON.parse(fs.readFileSync(path, "utf8"));

function ground(id, size, color) {
  return { id, pos: { x: 0, y: -0.5, z: 0 }, size: { w: size, h: 0.5, d: size }, color, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 };
}

function boundaries(prefix, half) {
  return [
    { id: `${prefix}_north`, pos: { x: 0, y: 0, z: -half }, size: { w: half * 2, h: 3, d: 0.5 }, rotY: 0, color: "#445568", opacity: 0.35, visibleInPlay: false, collisionEnabled: true },
    { id: `${prefix}_south`, pos: { x: 0, y: 0, z: half }, size: { w: half * 2, h: 3, d: 0.5 }, rotY: 0, color: "#445568", opacity: 0.35, visibleInPlay: false, collisionEnabled: true },
    { id: `${prefix}_west`, pos: { x: -half, y: 0, z: 0 }, size: { w: 0.5, h: 3, d: half * 2 }, rotY: 0, color: "#445568", opacity: 0.35, visibleInPlay: false, collisionEnabled: true },
    { id: `${prefix}_east`, pos: { x: half, y: 0, z: 0 }, size: { w: 0.5, h: 3, d: half * 2 }, rotY: 0, color: "#445568", opacity: 0.35, visibleInPlay: false, collisionEnabled: true },
  ];
}

const emptyTraversal = () => ({ platforms: [], obstacles: [], climbables: [], jumpTraversals: [] });

const world = {
  version: "4B.1",
  camp: {
    id: "camp",
    pos: { x: 0, y: 0, z: 0 },
    playerSpawn: { position: { x: 0, y: 0, z: 12 }, facingYaw: Math.PI },
    radius: 4,
    frontierGateId: "gate_camp_frontier",
    description: "100x100 persistent Camp proof shell",
  },
  frontierGateId: "gate_camp_frontier",
  defaultExpeditionEntry: { sectionId: "section_1", entryId: "entry_section_1" },
  resourceDrops: previous.resourceDrops,
  visualAssets: previous.visualAssets,
  lootTables: [
    { id: "loot_secret_section_1", displayName: "Section 1 Secret", rewards: [{ type: "resource", id: "iron_ore", amount: 2 }, { type: "xp", amount: 8 }] },
    { id: "loot_parkour_section_1", displayName: "Parkour Cache", rewards: [{ type: "resource", id: "crystal_shard", amount: 1 }, { type: "xp", amount: 12 }] },
  ],
  regions: [
    {
      id: "camp", displayName: "Camp", sectionType: "camp", size: { width: 100, depth: 100 },
      bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, neighbors: [], pockets: [], ground: { type: "plain", color: "#66885f" },
      groundPatches: [ground("ground_camp", 100, "#66885f")], boundaryColliders: boundaries("boundary_camp", 49.5),
      props: [
        { id: "prop_camp_dropPod", subtype: "visualAsset", visualAssetId: "asset_drop_pod", pos: { x: -6, y: 0, z: 9 }, rotY: 0, uniformScale: 1, visibleInPlay: true, collisionEnabled: true, opacity: 1 },
        { id: "prop_camp_resonator", subtype: "resonator", pos: { x: 6, y: 0, z: 9 }, size: { w: 1.5, h: 1.4, d: 1.5 }, rotY: 0, visibleInPlay: true, collisionEnabled: true, opacity: 1 },
        { id: "fence_camp_west", subtype: "fence", pos: { x: -14, y: 0, z: 0 }, size: { w: 0.5, h: 1.3, d: 28 }, rotY: 0, visibleInPlay: true, collisionEnabled: true, opacity: 1 },
        { id: "fence_camp_east", subtype: "fence", pos: { x: 14, y: 0, z: 0 }, size: { w: 0.5, h: 1.3, d: 28 }, rotY: 0, visibleInPlay: true, collisionEnabled: true, opacity: 1 },
      ],
      resources: [], creatures: [], majorWaypoints: [], extractionBeacons: [],
      pois: [{ id: "poi_camp_resonator", type: "resonator", pos: { x: 6, y: 0, z: 9 }, requires: null }],
      traversal: emptyTraversal(),
      entryPoints: [{ id: "entry_camp", pos: { x: 0, y: 0, z: -5 }, facingYaw: 0 }],
      portalGates: [{ id: "gate_camp_frontier", displayName: "Frontier Gate", pos: { x: 0, y: 0, z: -8 }, rotY: Math.PI, entryId: "entry_camp", targetSectionId: "section_1", targetEntryId: "entry_section_1", state: "active", triggerRadius: 1.85 }],
      jumpPads: [], parkourStarts: [], parkourCheckpoints: [], killVolumes: [], lootChests: [], sectionProfile: null,
    },
    {
      id: "section_1", displayName: "Section 1 Proof", sectionType: "expedition", size: { width: 50, depth: 50 },
      bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 }, neighbors: [], pockets: [], ground: { type: "plain", color: "#6f9b69" },
      groundPatches: [ground("ground_section_1", 50, "#6f9b69")], boundaryColliders: boundaries("boundary_section_1", 24.5),
      props: [{ id: "prop_section_1_marker", subtype: "visualAsset", visualAssetId: "asset_ruin_path", pos: { x: -8, y: 0, z: 8 }, rotY: 0, uniformScale: 0.8, visibleInPlay: true, collisionEnabled: false, opacity: 1 }],
      resources: [
        { id: "tree_section_1_01", type: "tree", level: 1, pos: { x: -10, y: 0, z: 14 } },
        { id: "rock_section_1_01", type: "rock", tier: 1, pos: { x: 9, y: 0, z: 13 } },
        { id: "fiber_section_1_01", type: "fiber", level: 1, pos: { x: -5, y: 0, z: 5 } },
      ],
      creatures: [{ id: "rusher_section_1_01", type: "rusher", level: 1, temperament: "TERRITORIAL", speciesTag: "fang", pos: { x: -12, y: 0, z: -4 }, homePos: { x: -12, y: 0, z: -4 }, roamRadius: 2.5, noticeRadius: 5.5, personalSpace: 1.9, leashRadius: 7 }],
      majorWaypoints: [{ id: "wp_section_1", type: "majorWaypoint", pos: { x: 0, y: 0, z: 9 }, displayName: "Section 1 Waypoint", runSpawn: { position: { x: 0, y: 0, z: 12 }, facingYaw: Math.PI } }],
      extractionBeacons: [{ id: "beacon_section_1", type: "extractionBeacon", pos: { x: -16, y: 0, z: 1 }, displayName: "Section 1 Beacon" }],
      pois: [],
      traversal: { platforms: [
        { id: "platform_section_1_takeoff", x: 8, y: 0, baseY: 0, z: -3, w: 3, h: 3, height: 0.35, rotY: 0 },
        { id: "platform_section_1_landing", x: 8, y: 0, baseY: 0, z: -14, w: 4, h: 4, height: 0.35, rotY: 0 },
      ], obstacles: [{ id: "overlap_blocker_section_1", x: 12, y: 0, baseY: 0, z: 8, w: 2, h: 2, height: 2, rotY: 0 }], climbables: [], jumpTraversals: [] },
      entryPoints: [{ id: "entry_section_1", pos: { x: 0, y: 0, z: 20 }, facingYaw: Math.PI }],
      portalGates: [{ id: "gate_section_1_to_2", displayName: "Section 2 Gate", pos: { x: 0, y: 0, z: -21 }, rotY: Math.PI, entryId: "entry_section_1", targetSectionId: "section_2", targetEntryId: "entry_section_2", state: "ruined", triggerRadius: 1.85, visualAssetId: "asset_ruin_arch", requirements: { minPlayerLevel: 2, resources: { wood: 2, stone: 2 } } }],
      jumpPads: [{ id: "jump_pad_section_1", pos: { x: 8, y: 0.35, z: -3 }, rotY: Math.PI, triggerRadius: 1.15, horizontalLaunch: 7, verticalLaunch: 5.8, cooldown: 1, visualAssetId: "asset_frontier_launch_pad" }],
      parkourStarts: [{ id: "parkour_start_section_1", courseId: "course_section_1", pos: { x: 8, y: 0, z: 1 }, rotY: Math.PI, triggerRadius: 1.2, respawnPosition: { x: 8, y: 0, z: 1 }, respawnFacingYaw: Math.PI }],
      parkourCheckpoints: [{ id: "parkour_checkpoint_section_1", courseId: "course_section_1", pos: { x: 8, y: 0.35, z: -8 }, rotY: Math.PI, triggerRadius: 1.2, respawnPosition: { x: 8, y: 0.35, z: -8 }, respawnFacingYaw: Math.PI }],
      killVolumes: [{ id: "kill_volume_section_1", courseId: "course_section_1", pos: { x: 3, y: 0.6, z: -8 }, size: { w: 3, h: 1.2, d: 5 } }],
      lootChests: [
        { id: "chest_secret_section_1", displayName: "Hidden Cache", pos: { x: -19, y: 0, z: -13 }, rotY: 0, lootTableId: "loot_secret_section_1", refillSeconds: null, secret: true, visualAssetId: "asset_chest" },
        { id: "chest_parkour_section_1", displayName: "Parkour Cache", pos: { x: 8, y: 0.35, z: -16 }, rotY: 0, lootTableId: "loot_parkour_section_1", refillSeconds: 86400, courseId: "course_section_1", secret: false, visualAssetId: "asset_chest" },
      ],
      sectionProfile: { tier: 1, recommendedLevel: { min: 1, max: 3 }, resourceValueTarget: { min: 3, max: 8 }, wildkinCountTarget: { min: 1, max: 3 }, wildkinLevelTarget: { min: 1, max: 2 }, expected: { waypoint: 1, extractionBeacons: { min: 1, max: 1 }, secrets: { min: 1, max: 1 }, parkourCourses: { min: 1, max: 1 }, outboundPortals: { min: 1, max: 1 } } },
    },
    {
      id: "section_2", displayName: "Section 2 Proof", sectionType: "expedition", size: { width: 50, depth: 50 },
      bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 }, neighbors: [], pockets: [], ground: { type: "plain", color: "#596a8e" },
      groundPatches: [ground("ground_section_2", 50, "#596a8e")], boundaryColliders: boundaries("boundary_section_2", 24.5), props: [],
      resources: [{ id: "rock_section_2_01", type: "rock", level: 2, pos: { x: -9, y: 0, z: 11 } }],
      creatures: [{ id: "spitter_section_2_01", type: "spitter", level: 2, temperament: "DEFENSIVE", speciesTag: "spit", hostileSpecies: [], pos: { x: -12, y: 0, z: -5 }, homePos: { x: -12, y: 0, z: -5 }, roamRadius: 2, noticeRadius: 5, personalSpace: 2, leashRadius: 7 }],
      majorWaypoints: [{ id: "wp_section_2", type: "majorWaypoint", pos: { x: 0, y: 0, z: 9 }, displayName: "Section 2 Waypoint", runSpawn: { position: { x: 0, y: 0, z: 12 }, facingYaw: Math.PI } }],
      extractionBeacons: [], pois: [],
      traversal: { platforms: [], obstacles: [{ id: "overlap_blocker_section_2", x: 12, y: 0, baseY: 0, z: 8, w: 5, h: 1.5, height: 1, rotY: Math.PI / 2 }], climbables: [], jumpTraversals: [] },
      entryPoints: [{ id: "entry_section_2", pos: { x: 0, y: 0, z: 20 }, facingYaw: Math.PI }],
      portalGates: [], jumpPads: [], parkourStarts: [], parkourCheckpoints: [], killVolumes: [], lootChests: [],
      sectionProfile: { tier: 2, recommendedLevel: { min: 2, max: 4 }, resourceValueTarget: { min: 1, max: 4 }, wildkinCountTarget: { min: 1, max: 2 }, wildkinLevelTarget: { min: 2, max: 3 }, expected: { waypoint: 1, extractionBeacons: { min: 0, max: 1 }, secrets: { min: 0, max: 0 }, parkourCourses: { min: 0, max: 0 }, outboundPortals: { min: 0, max: 0 } } },
    },
  ],
};

fs.writeFileSync(path, `${JSON.stringify(world, null, 2)}\n`);
