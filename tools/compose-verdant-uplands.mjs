import { getSurfaceHeight } from "../src/world/terrainSurfaceModel.js";
import { composeVerdantCliffs } from "./compose-verdant-cliffs.mjs";

export const VERDANT_UPLANDS = Object.freeze({
  sectionId: "section_1",
  bounds: Object.freeze({ minX: -70, maxX: 70, minZ: -42, maxZ: 48 }),
  rootfall: Object.freeze({ x: 0, y: 1.35, z: -31, gateZ: -34 }),
  survey: Object.freeze({ x: 7, z: 23, chestX: 8.48, chestY: .18 }),
});

// These were the compact 80m Verdant scatter/edge dressing nodes. They are
// intentionally replaced by the 140x90m composition; stable harvest, chest,
// Survey, Rootfall, and gameplay-prop IDs are retained separately below.
export const VERDANT_REPLACED_SCENERY_IDS = Object.freeze([
  "prop_s1_arrival_tree_l", "prop_s1_arrival_tree_r", "prop_s1_arrival_stones",
  "prop_s1_lookout_arch", "prop_s1_lookout_tree_l", "prop_s1_lookout_tree_r",
  "prop_s1_creek_stone_a", "prop_s1_creek_stone_b", "prop_s1_creek_moons",
  "prop_s1_ore_spire", "prop_s1_ore_cluster", "prop_s1_ore_tree", "prop_s1_ore_launch_stone",
  "prop_s1_hollow_arch", "prop_s1_hollow_root_l", "prop_s1_hollow_root_r", "prop_s1_gate_trail",
  "prop_s1_edge_south_l_a", "prop_s1_edge_south_l_b", "prop_s1_edge_south_r_a", "prop_s1_edge_south_r_b",
  "prop_s1_edge_root_l_a", "prop_s1_edge_root_l_b", "prop_s1_edge_root_r_a", "prop_s1_edge_root_r_b",
  "prop_s1_edge_creek_a", "prop_s1_edge_creek_b", "prop_s1_edge_creek_c", "prop_s1_edge_creek_d",
  "prop_s1_edge_shelf_a", "prop_s1_edge_shelf_b", "prop_s1_edge_shelf_c", "prop_s1_edge_shelf_d",
]);

// This is the complete original gameplay-prop set, separated from scenery by
// the admitted asset role. Their IDs carry encounter/harvest state, so the
// large-scale visual replacement must always recreate them with their source
// gameplay descriptors intact.
export const VERDANT_GAMEPLAY_PROP_SPECS = Object.freeze([
  { id: "prop_s1_creek_mossling", visualAssetId: "asset_wildkin_mossling", x: -40, z: 12, uniformScale: 1, rotY: .15, collisionEnabled: true, role: "wildkin", speciesTag: "mossling" },
  { id: "prop_s1_creek_mossling_b", visualAssetId: "asset_wildkin_mossling", x: -42, z: 3, uniformScale: .9, rotY: -.28, collisionEnabled: true, role: "wildkin", speciesTag: "mossling" },
  { id: "prop_s1_lookout_blossom", visualAssetId: "asset_luminous_blossom", x: -6, z: 13, uniformScale: 1.35, rotY: 0, collisionEnabled: false, role: "harvestable", dropId: "wildflower" },
  // The two iron deposits sit off the wide, climbed shelf path with room to
  // approach either one. Their collision is the source harvest box.
  { id: "prop_s1_ore_vein_a", visualAssetId: "asset_iron_ore_rock", x: 47, z: 15, uniformScale: 1.08, rotY: 0, collisionEnabled: true, role: "harvestable", dropId: "iron_ore" },
  { id: "prop_s1_ore_vein_b", visualAssetId: "asset_iron_ore_rock", x: 52, z: 11, uniformScale: 1.02, rotY: .22, collisionEnabled: true, role: "harvestable", dropId: "iron_ore" },
  // This aggressive actor is deliberately away from the Mossling study shore
  // and the open arrival apron while retaining its persisted encounter ID.
  { id: "prop_s1_hollow_thorn", visualAssetId: "asset_thornprowler", x: -22, z: -8, uniformScale: .9, rotY: .2, collisionEnabled: true, role: "wildkin", speciesTag: "thornprowler" },
  { id: "prop_s1_starter_berries", visualAssetId: "asset_berry_bush", x: -12, z: 21, uniformScale: 1, rotY: .35, collisionEnabled: false, role: "harvestable", dropId: "berries" },
]);

export const VERDANT_MOSSLING_ACTOR_IDS = Object.freeze(
  VERDANT_GAMEPLAY_PROP_SPECS.filter((entry) => entry.speciesTag === "mossling").map((entry) => entry.id),
);

const prop = (id, visualAssetId, x, z, uniformScale = 1, rotY = 0, collisionEnabled = false) => ({
  id, subtype: "visualAsset", visualAssetId, pos: { x, y: 0, z }, rotY, uniformScale,
  visibleInPlay: true, collisionEnabled, opacity: 1,
});

function gameplayProps() {
  return VERDANT_GAMEPLAY_PROP_SPECS.map((entry) => prop(
    entry.id, entry.visualAssetId, entry.x, entry.z, entry.uniformScale, entry.rotY, entry.collisionEnabled,
  ));
}

// These are deliberate woodland masses, rather than a seeded scatter or a
// perimeter necklace. Eighteen of the existing scenic-canopy budget now lives
// in five interior/arrival masses: the lowland reads as a sequence of places
// while the route windows and all gameplay anchors retain working room.
// Every admitted canopy uses the same narrow measured trunk collider, so
// interlocking visual crowns do not turn into a canopy-wide wall.
const WOODLAND_CLUSTERS = Object.freeze([
  // East: contracted outer groups leave room for a foreground pocket below
  // the climb, so the escarpment has a toe, face and distant crest.
  ["east-toe", [[42, 25], [48, 25], [39, 21]]],
  ["east-mid-face", [[62, 17], [64, 10], [57, 16]]],
  ["east-outer-crest", [[64, -5], [62, -11], [59, 2], [65, 6]]],
  ["east-south-face", [[57, -16], [48, -24], [44, -28], [59, -23]]],
  ["east-overlook-edge", [[39, -21]]],
  // West remains a protected water bank, but the large repeated rows are
  // broken into three unequal masses with open shoreline windows.
  ["west-bank-upper", [[-65, 27], [-61, 31], [-66, 19], [-59, 25]]],
  ["west-bank-mid", [[-66, 12], [-63, 7], [-65, 1], [-61, -3]]],
  ["west-bank-lower", [[-65, -12], [-62, -18], [-64, -26]]],
  // Mossling's dry eastern bank has only two framing crowns; its actors,
  // cache, berry tell and calm observation space stay visibly open.
  ["mossling-pocket", [[-51, -1], [-35, 21]]],
  ["hollow-gateway", [[-31, 20]]],
  // Five arrival shoulders reveal the Survey in the middle rather than making
  // a hedge around the gate-to-Survey route and its harvest trees.
  ["arrival-shoulder-west", [[-33, 39], [-29, 34], [-35, 35]]],
  ["arrival-shoulder-east", [[30, 36], [36, 39]]],
  // The missing interior sequence: a main wooded island, sheltered waypoint
  // backdrop, north-return island, and low east-face foreground pocket.
  // The central island stops north of the Thornprowler's 6m working pocket.
  ["central-island", [[-26, 1], [-21, 0], [-17, -2], [-20, 3]]],
  ["lookout-backdrop", [[-15, 7], [-13, 3], [-10, 5]]],
  ["north-return-island", [[-14, -14], [-20, -14], [-13, -15]]],
  ["east-low-face", [[18, 0], [21, -4], [22, 3]]],
  // Rootfall stays the only obvious northern throat. The flanks remain well
  // away from the 16m supported lane, leaving the fallen-root assembly quiet.
  ["rootfall-west-shoulder", [[-52, -29], [-35, -25], [-23, -29], [-20, -34]]],
  ["rootfall-east-shoulder", [[24, -28], [28, -25], [37, -31], [46, -27], [53, -31], [61, -29]]],
]);

function woodlandProps() {
  // Favor the substantial standard canopy. All variants are marked physical:
  // tall/spread trunk descriptors are being supplied separately and must not
  // be silently bypassed through composition flags.
  // Tall fans are reserved for a few silhouette accents. The bulk of each
  // mass is the broader standard crown, with occasional low spread fringe.
  const variants = ["asset_verge_canopy", "asset_verge_canopy", "asset_verge_canopy", "asset_verge_canopy", "asset_verge_canopy", "asset_verge_canopy", "asset_verge_canopy_spread", "asset_verge_canopy"];
  const standardScales = [2.12, 2.36, 2.64, 2.24, 2.58, 2.46];
  const tallScales = [1.54, 1.72, 1.88, 1.62, 1.8, 1.68];
  const spreadScales = [1.84, 2.06, 2.34, 1.96, 2.22, 2.12];
  // Landmark crowns are smaller silhouette breaks within larger masses. They
  // retain the trunk-collider contract while keeping routes and anchor aprons
  // available for actual player movement.
  const landmarkCanopies = new Map([
    ["mossling-pocket-01", { visualAssetId: "asset_verge_canopy_tall", uniformScale: 1.62 }],
    ["arrival-shoulder-west-01", { visualAssetId: "asset_verge_canopy_tall", uniformScale: 1.72 }],
    ["central-island-02", { visualAssetId: "asset_verge_canopy_spread", uniformScale: 1.92 }],
    ["lookout-backdrop-01", { visualAssetId: "asset_verge_canopy_tall", uniformScale: 1.68 }],
    ["east-low-face-03", { visualAssetId: "asset_verge_canopy_tall", uniformScale: 1.74 }],
    ["rootfall-east-shoulder-01", { visualAssetId: "asset_verge_canopy_spread", uniformScale: 1.92 }],
  ]);
  let sequence = 0;
  return WOODLAND_CLUSTERS.flatMap(([cluster, points]) => points.map(([x, z], index) => {
    const landmark = landmarkCanopies.get(`${cluster}-${String(index + 1).padStart(2, "0")}`);
    const variant = landmark?.visualAssetId ?? variants[sequence % variants.length];
    const uniformScale = landmark?.uniformScale ?? (variant === "asset_verge_canopy" ? standardScales[sequence % standardScales.length]
      : variant === "asset_verge_canopy_tall" ? tallScales[sequence % tallScales.length]
      : spreadScales[sequence % spreadScales.length]);
    const result = prop(
      `prop_verdant_woodland_${cluster}_${String(index + 1).padStart(2, "0")}`,
      variant, x, z, uniformScale, ((sequence * .71) % (Math.PI * 2)) - Math.PI, true,
    );
    sequence += 1;
    return result;
  }));
}
const resource = (id, type, x, z) => ({ id, type, level: 1, pos: { x, y: 0, z } });
const route = (id, points, width, options = {}) => ({ id, points, width, feather: 2, ...options });

// Terrain outlines are authored in world metres so the intended silhouette is
// readable here. The terrain model stores normalized points against a center
// and radii, which keeps the same data editable by the Author surface tools.
export function outlinedHeight(id, height, edgeWidth, worldPoints) {
  const xs = worldPoints.map((point) => point.x);
  const zs = worldPoints.map((point) => point.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  const rx = (maxX - minX) / 2, rz = (maxZ - minZ) / 2;
  return {
    id, x, z, rx, rz, height, edgeWidth,
    outline: worldPoints.map((point) => ({ x: Number(((point.x - x) / rx).toFixed(4)), z: Number(((point.z - z) / rz).toFixed(4)) })),
  };
}

const boundary = (id, x, z, w, d) => ({
  id, pos: { x, y: 0, z }, size: { w, h: 3, d }, rotY: 0,
  color: "#273447", opacity: .22, visibleInPlay: false, collisionEnabled: true,
});

const ROOTFALL_PROP_IDS = new Set([
  "prop_rootfall_left", "prop_rootfall_right", "prop_rootfall_middle",
  "prop_rootfall_brace_left", "prop_rootfall_brace_right", "rootfall_cut_west", "rootfall_cut_east",
]);

const SURVEY_PROP_PREFIX = "prop_survey_";

function one(items, id, label) {
  const matches = items.filter((entry) => entry.id === id);
  if (matches.length !== 1) throw new Error(`Verdant uplands requires one ${label}/${id}; found ${matches.length}`);
  return matches[0];
}

function makeSurface() {
  const P = (x, z, elevation) => ({ x, z, elevation });
  return {
    seed: 2101,
    palette: {
      grass: "#789950", grassShade: "#3e6240", path: "#bb955d", pathEdge: "#938154", gravel: "#ad844f",
      rock: "#716d68", water: "#43bdd0", waterFoam: "#e3fbf4", accent: "#f4d768",
    },
    routes: [
      route("verdant-low-spine", [{ x: 0, z: 36 }, { x: 2, z: 29 }, { x: 0, z: 16 }, { x: -2, z: 0 }, { x: 2, z: -19 }], 4, { style: "gravel" }),
      // These wide grades are physical support only. Their narrow approach
      // routes carry the visible gravel so they do not read as gray pads.
      route("verdant-survey-apron", [{ x: -4, z: 23 }, { x: 14, z: 23 }], 18, { elevation: 0, feather: 2, paint: false, scatter: false }),
      route("verdant-arrival-apron", [{ x: 0, z: 36 }, { x: 0, z: 24 }], 8, { elevation: 0, feather: 2, paint: false, scatter: false }),
      route("survey-wreck-footprint", [{ x: 6.3, z: 23 }, { x: 7.7, z: 23 }], 5.8, { elevation: 0, feather: .3, paint: false, scatter: false }),
      route("survey-wreck-approach", [{ x: -.1, z: 24.5 }, { x: 1.2, z: 23.4 }, { x: 3.5, z: 23 }], 2.6, { elevation: 0, feather: .5, style: "gravel", scatter: false }),
      route("verdant-west-hollow", [{ x: -4, z: 18 }, { x: -24, z: 16 }, { x: -42, z: 8 }, { x: -45, z: -8 }, { x: -25, z: -20 }, { x: -4, z: -19 }], 3.4, { style: "gravel" }),
      route("verdant-upland-ascent", [P(18, 17, 0), P(29, 14, .8), P(40, 12, 3)], 3.8, { feather: 2.4, style: "gravel" }),
      route("verdant-upland-contour", [P(40, 12, 3), P(48, 7, 4.2), P(45, -2, 6)], 3.7, { feather: 2.2, style: "gravel" }),
      route("verdant-upland-overlook", [P(45, -2, 6), P(38, -10, 7.1), P(32, -15, 8)], 3.5, { feather: 2, style: "gravel" }),
      route("verdant-upland-descent", [P(32, -15, 8), P(22, -20, 5.5), P(12, -21, 2.7), P(2, -19, 1.35)], 3.8, { feather: 2.4, style: "gravel" }),
      // This wide, constant support lane preserves the accepted Rootfall ground
      // plane while the two flank landforms read as a real north bottleneck.
      // Grade the broad Rootfall support out into the terminal West Hollow
      // segment. A 3m feather keeps the same 1.35m plateau but avoids a
      // one-way uphill lip beyond the character controller's slope limit.
      route("verdant-rootfall-support", [{ x: 0, z: -36 }, { x: 0, z: -26 }], 16, { elevation: 1.35, feather: 3, paint: false, scatter: false }),
      route("rootfall-approach", [{ x: 0, z: -26.5 }, { x: 0, z: -29.4 }], 3, { feather: .45, style: "gravel", scatter: false }),
    ],
    heights: [
      // One connected asymmetrical eastern mass: a broad 3m toe carries a
      // narrower 6m shelf and a broken 8m overlook, instead of oval rings.
      outlinedHeight("verdant-east-foot", 3, 5, [
        { x: 18, z: 20 }, { x: 31, z: 24 }, { x: 47, z: 21 }, { x: 58, z: 12 }, { x: 56, z: 1 }, { x: 52, z: -12 },
        { x: 43, z: -22 }, { x: 31, z: -26 }, { x: 19, z: -22 }, { x: 14, z: -10 }, { x: 17, z: 5 },
      ]),
      outlinedHeight("verdant-east-shelf", 6, 3.6, [
        { x: 37, z: 11 }, { x: 48, z: 10 }, { x: 54, z: 4 }, { x: 52, z: -7 }, { x: 46, z: -15 }, { x: 35, z: -15 }, { x: 30, z: -8 }, { x: 32, z: 2 },
      ]),
      outlinedHeight("verdant-east-overlook", 8, 2.4, [
        { x: 29, z: -8 }, { x: 38, z: -10 }, { x: 40, z: -16 }, { x: 35, z: -21 }, { x: 27, z: -19 }, { x: 24, z: -14 },
      ]),
      // The northern flanks keep the supported Rootfall lane non-bypassable,
      // but their irregular shoulders avoid the old retaining-wall read. The
      // immediate Rootfall footprint remains clear and is still the focal end.
      outlinedHeight("verdant-rootfall-west-flank", 4.8, 3.2, [
        { x: -69, z: -42 }, { x: -11, z: -42 }, { x: -10, z: -35 }, { x: -14, z: -31 }, { x: -17, z: -27 },
        { x: -31, z: -23 }, { x: -40, z: -26 }, { x: -54, z: -25 }, { x: -62, z: -29 },
      ]),
      outlinedHeight("verdant-rootfall-east-flank", 6.2, 3.4, [
        { x: 10, z: -42 }, { x: 68, z: -42 }, { x: 67, z: -34 }, { x: 58, z: -27 }, { x: 45, z: -24 },
        { x: 35, z: -26 }, { x: 22, z: -24 }, { x: 14, z: -28 }, { x: 10, z: -34 },
      ]),
      outlinedHeight("verdant-west-hollow-rim", 1.3, 4.2, [
        { x: -44, z: 29 }, { x: -25, z: 21 }, { x: -22, z: 5 }, { x: -26, z: -14 }, { x: -39, z: -27 }, { x: -48, z: -16 }, { x: -47, z: 8 },
      ]),
    ],
    // North is negative Z: a broad northern bay narrows through a gently
    // offset neck to the south. Five substantially overlapping same-plane
    // ellipses avoid the three tangent-oval read and renderer-radius pinches.
    // There is no elevated water, cascade, or falling-water implication.
    water: [
      { id: "mosslight-north-bay", x: -53, z: -19, rx: 10, rz: 9, depth: .3 },
      { id: "mosslight-north-shoulder", x: -56, z: -12, rx: 10, rz: 8, depth: .3 },
      { id: "mosslight-neck", x: -56, z: -4, rx: 5.5, rz: 9, depth: .3 },
      { id: "mosslight-south-reach", x: -55, z: 4, rx: 5, rz: 9, depth: .3 },
      { id: "mosslight-south-outlet", x: -55, z: 14, rx: 5, rz: 8.5, depth: .3 },
    ],
    detail: { grassDensity: .66, groundcover: "cushion" },
  };
}

function setBounds(region) {
  const { minX, maxX, minZ, maxZ } = VERDANT_UPLANDS.bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  region.size = { width, depth };
  region.bounds = { minX, maxX, minZ, maxZ };
  region.boundaryColliders = [
    boundary("boundary_section_1_north", 0, minZ + .5, width - 1, .5),
    boundary("boundary_section_1_south", 0, maxZ - .5, width - 1, .5),
    boundary("boundary_section_1_west", minX + .5, 3, .5, depth - 1),
    boundary("boundary_section_1_east", maxX - .5, 3, .5, depth - 1),
  ];
}

function rebase(region, entries, excludedIds = new Set()) {
  for (const entry of entries) {
    if (!entry?.pos || excludedIds.has(entry.id)) continue;
    entry.pos.y = Number(getSurfaceHeight(region.surface, entry.pos.x, entry.pos.z).toFixed(4));
    if (entry.homePos) entry.homePos.y = Number(getSurfaceHeight(region.surface, entry.homePos.x, entry.homePos.z).toFixed(4));
    if (entry.runSpawn?.position) {
      const spawn = entry.runSpawn.position;
      spawn.y = Number(getSurfaceHeight(region.surface, spawn.x, spawn.z).toFixed(4));
    }
  }
}

export function composeVerdantUplands(world) {
  const region = world?.regions?.find((entry) => entry.id === VERDANT_UPLANDS.sectionId);
  if (!region) throw new Error("Verdant uplands requires section_1");

  const entry = one(region.entryPoints ?? [], "entry_section_1", "entry point");
  const arrivalGate = one(region.portalGates ?? [], "gate_section_1_camp_arrival", "portal gate");
  const rootfallGate = one(region.portalGates ?? [], "gate_section_1_to_2", "portal gate");
  const surveyChest = one(region.lootChests ?? [], "chest_survey_cartridge", "loot chest");
  const cache = one(region.lootChests ?? [], "chest_parkour_section_1", "loot chest");
  const mosslingCache = one(region.lootChests ?? [], "chest_mossling_secret", "loot chest");
  const rootboundCache = one(region.lootChests ?? [], "chest_secret_section_1", "loot chest");
  const rootfallProps = (region.props ?? []).filter((entry) => ROOTFALL_PROP_IDS.has(entry.id));
  if (rootfallProps.length !== ROOTFALL_PROP_IDS.size) throw new Error("Verdant uplands requires the complete Rootfall assembly");

  setBounds(region);
  region.surface = makeSurface();

  // Replace only the old Verdant scatter; Survey and Rootfall stay owned by
  // their dedicated composers, including their stable state/collider IDs.
  region.props = (region.props ?? []).filter((entry) =>
    !entry.id.startsWith("prop_s1_") && !entry.id.startsWith("prop_verdant_") && !entry.id.startsWith("wildkin_section_1_"),
  );
  const preservedPropIds = new Set(region.props.map((entry) => entry.id));
  region.resources = (region.resources ?? []).filter((entry) => !entry.id.includes("section_1"));

  region.resources.push(
    resource("tree_section_1_arrival_l", "tree", -15, 28), resource("tree_section_1_arrival_r", "tree", 17, 30),
    resource("fiber_section_1_arrival", "fiber", -11, 24), resource("tree_section_1_creek_a", "tree", -39, 18),
    resource("fiber_section_1_creek", "fiber", -40, 8), resource("tree_section_1_hollow", "tree", -42, -8),
    resource("rock_section_1_shelf_a", "rock", 38, 10), resource("rock_section_1_shelf_b", "rock", 53, 1),
    resource("fiber_section_1_shelf", "fiber", 36, 3), resource("rock_section_1_gate", "rock", -9, -22),
  );
  region.props.push(
    // Authored canopy placements frame decisions without becoming a green
    // woodland mass. This is provisional for mobile cost and needs a separate
    // native/overhead review; this composer does not claim a visual pass.
    ...woodlandProps(),
    prop("prop_verdant_arrival_stones", "asset_trail_stones", 1, 28, 1.45),
    prop("prop_verdant_survey_clue", "asset_trail_stones", 17, 17, 1.05, .55),
    prop("prop_verdant_arrival_curtain_root", "asset_fallen_log", -23, 25, 1.14, -.24),
    prop("prop_verdant_berry_hollow", "asset_berry_bush", -39, 6, 1.08, .3),
    prop("prop_verdant_shore_stone_a", "asset_fen_stone", -59, 12, 1.16, .22, true),
    prop("prop_verdant_shore_stone_b", "asset_fen_stone", -57, -14, 1.12, -.16, true),
    prop("prop_verdant_hollow_roots", "asset_fallen_log", -38, -14, 1.25, .38),
    prop("prop_verdant_pool_root_north", "asset_fallen_log", -56, 27, 1.36, .3),
    prop("prop_verdant_pool_root_mid", "asset_fallen_log", -60, -1, 1.28, -.18),
    prop("prop_verdant_pool_root_south", "asset_fallen_log", -53, -27, 1.42, .48),
    prop("prop_verdant_hollow_root_frame", "asset_fallen_log", -35, 2, 1.34, -.52),
    prop("prop_verdant_mossling_gap_root", "asset_fallen_log", -49, 9, 1.55, .24),
    prop("prop_verdant_mossling_gap_stone", "asset_fen_stone", -35, 5, 1.08, -.18, true),
    prop("prop_verdant_east_toe_stone", "asset_fen_stone", 22, 21, 1.28, -.12, true),
    prop("prop_verdant_east_face_stone_a", "asset_fen_stone", 29, 22, 1.3, .22, true),
    prop("prop_verdant_east_face_stone_b", "asset_fen_stone", 53, 17, 1.24, -.2, true),
    prop("prop_verdant_east_face_stone_c", "asset_fen_stone", 58, 7, 1.35, .16, true),
    prop("prop_verdant_east_face_stone_d", "asset_fen_stone", 54, -14, 1.42, -.12, true),
    prop("prop_verdant_east_face_stone_e", "asset_fen_stone", 43, -22, 1.3, .2, true),
    // The existing east roots now sit half-hidden at the bases of the joined
    // fronts. They remain non-physical scenery; this adds no instance or route role.
    prop("prop_verdant_east_face_root_a", "asset_fallen_log", 35.5, 20.1, 1.42, .18),
    prop("prop_verdant_east_face_root_b", "asset_fallen_log", 58.1, 4.6, 1.5, -.44),
    prop("prop_verdant_east_face_root_c", "asset_fallen_log", 26.3, -7.8, 1.46, -.34),
    prop("prop_verdant_shelf_stone", "asset_fen_stone", 53, -4, 1.35, .2, true),
    prop("prop_verdant_overlook_stone", "asset_fen_stone", 29, -14, 1.18, -.2, true),
    prop("prop_verdant_overlook_salvage", "asset_trail_stones", 35, -13, 1.08, .3),
    prop("prop_verdant_shelf_cache_root", "asset_fallen_log", 42, -12, 1.18, -.38),
    prop("prop_verdant_root_flank_west", "asset_fallen_log", -18, -33, 1.6, .18, false),
    prop("prop_verdant_root_flank_east", "asset_fallen_log", 19, -33, 1.65, -.16, false),
    prop("prop_verdant_rootfall_west_outcrop", "asset_fen_stone", -15, -28, 1.3, .28, true),
    prop("prop_verdant_rootfall_east_outcrop", "asset_fen_stone", 15, -28, 1.34, -.22, true),
    prop("prop_verdant_return_root", "asset_fallen_log", -31, -22, 1.45, .16),
    prop("prop_verdant_return_shrub_a", "asset_berry_bush", -34, -18, 1.12, -.2),
    prop("prop_verdant_return_shrub_b", "asset_berry_bush", -28, -26, 1.06, .3),
    prop("prop_verdant_lookout_rest_stone", "asset_fen_stone", -9, 10, 1.1, .18, true),
    prop("prop_verdant_lookout_rest_groundcover", "asset_mushroom_ring", -6, 10, 1.25, -.2),
    // A low, offset rest frames the west-hollow turn and east-toe clue without
    // blocking the low spine or introducing another harvestable/reward.
    prop("prop_verdant_lookout_sightline_root", "asset_fallen_log", -8, 5, 1.16, -.68),
    prop("prop_verdant_lookout_sightline_groundcover", "asset_mushroom_ring", -4.5, 5, 1.12, .28),
    prop("prop_verdant_root_approach_stones", "asset_trail_stones", 0, -24, 1.35),
    ...gameplayProps(),
  );

  // The source visual scatter is replaced above, then this complete gameplay
  // set is rebuilt from its stable IDs. This prevents an expanded scenery
  // cleanup from quietly deleting harvest or encounter behavior again.

  cache.displayName = "Upland Shelf Cache";
  cache.pos = { x: 34, y: 0, z: -14 };
  mosslingCache.displayName = "Mossling Hollow";
  mosslingCache.pos = { x: -39, y: 0, z: 4 };
  rootboundCache.displayName = "Rootbound Cache";
  rootboundCache.pos = { x: -25, y: 0, z: -21 };

  // Explicitly preserve accepted transforms and the Survey's raised chest
  // fixture. Every other content item is grounded on the new shared surface.
  entry.pos = { x: 2, y: 0, z: 29 };
  arrivalGate.pos = { x: 0, y: 0, z: 36 };
  rootfallGate.pos = { x: 0, y: VERDANT_UPLANDS.rootfall.y, z: VERDANT_UPLANDS.rootfall.gateZ };
  surveyChest.pos = { x: VERDANT_UPLANDS.survey.chestX, y: VERDANT_UPLANDS.survey.chestY, z: VERDANT_UPLANDS.survey.z };
  for (const root of rootfallProps) root.pos.y = VERDANT_UPLANDS.rootfall.y;
  rebase(region, region.props, preservedPropIds);
  rebase(region, region.resources);
  rebase(region, region.lootChests, new Set([surveyChest.id]));
  rebase(region, region.creatures);
  rebase(region, region.majorWaypoints);
  rebase(region, region.extractionBeacons);
  composeVerdantCliffs(world);
  return world;
}
