import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
import { applyFenBankSurfaceAndGrounding } from './compose-shatterfen-bank.mjs';

export const SHATTERFEN_UPLANDS = Object.freeze({
  sectionId: 'section_2',
  bounds: Object.freeze({ minX: -50, maxX: 50, minZ: -50, maxZ: 50 }),
  protectedResourceIds: Object.freeze([
    'rock_section_2_arrival', 'fiber_section_2_arrival', 'tree_section_2_shallows',
    'fiber_section_2_shallows', 'rock_section_2_observatory', 'tree_section_2_far_bank', 'rock_section_2_gate',
  ]),
  protectedHarvestPropIds: Object.freeze([
    'prop_s2_causeway_crystal', 'prop_s2_observatory_crystal', 'prop_s2_farbank_blossom',
  ]),
  wildkinPropIds: Object.freeze(['prop_s2_tidefin_a', 'prop_s2_tidefin_b', 'prop_s2_farbank_thorn']),
  protectedAnchorIds: Object.freeze([
    'entry_section_2', 'gate_section_2_to_1', 'gate_section_2_to_3', 'wp_section_2', 'beacon_section_2',
    'chest_secret_section_2', 'chest_parkour_section_2', 'chest_tidefin_secret',
  ]),
});

const prop = (id, visualAssetId, x, z, uniformScale = 1, rotY = 0, collisionEnabled = false) => ({
  id, subtype: 'visualAsset', visualAssetId, pos: { x, y: 0, z }, rotY, uniformScale,
  visibleInPlay: true, collisionEnabled, opacity: 1,
});

const route = (id, points, width, options = {}) => ({ id, points, width, feather: 1.6, ...options });

// Keep the terrain description in world metres. The terrain field converts
// this to its normalized editable outline representation, so Renderer,
// Rapier, Author, and support queries stay on the same terrain transaction.
export function outlinedHeight(id, height, edgeWidth, points) {
  const xs = points.map((point) => point.x), zs = points.map((point) => point.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2, rx = (maxX - minX) / 2, rz = (maxZ - minZ) / 2;
  return { id, x, z, rx, rz, height, edgeWidth,
    outline: points.map((point) => ({ x: Number(((point.x - x) / rx).toFixed(4)), z: Number(((point.z - z) / rz).toFixed(4)) })),
  };
}

const boundary = (id, x, z, w, d) => ({
  id, pos: { x, y: 0, z }, size: { w, h: 3, d }, rotY: 0,
  color: '#273447', opacity: .22, visibleInPlay: false, collisionEnabled: true,
});

function setBounds(region) {
  const { minX, maxX, minZ, maxZ } = SHATTERFEN_UPLANDS.bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  region.size = { width, depth };
  region.bounds = { minX, maxX, minZ, maxZ };
  region.boundaryColliders = [
    boundary('boundary_section_2_north', 0, minZ + .5, width - 1, .5),
    boundary('boundary_section_2_south', 0, maxZ - .5, width - 1, .5),
    boundary('boundary_section_2_west', minX + .5, 0, .5, depth - 1),
    boundary('boundary_section_2_east', maxX - .5, 0, .5, depth - 1),
  ];
}

function makeSurface() {
  const P = (x, z, elevation) => ({ x, z, elevation });
  return {
    seed: 3209,
    palette: {
      grass: '#4f8277', grassShade: '#315d59', path: '#b8a675', pathEdge: '#d4c69a', gravel: '#ad9974',
      rock: '#53686b', water: '#2a95a7', waterFoam: '#8ccfcc', shore: '#4d7a75', accent: '#5ba8aa',
    },
    routes: [
      route('fen-return-silt', [{ x: 0, z: 36 }, { x: -4, z: 29 }, { x: -7, z: 22 }, { x: -5, z: 15 }, { x: -2, z: 8 }, { x: -5, z: 0 }, { x: -9, z: -8 }], 3.7, { style: 'gravel' }),
      // Broad invisible grades provide the companion-safe crossing and make
      // water crossings physical ground rather than painted road strips.
      route('fen-creek-west-crossing', [{ x: -9, z: 19 }, { x: -11, z: 17 }, { x: -13, z: 16 }], 6.2, { elevation: .72, paint: false, scatter: false, feather: 2.4 }),
      route('fen-creek-east-crossing', [{ x: -3, z: 12 }, { x: 5, z: 12 }, { x: 10, z: 10 }], 5.8, { elevation: .72, paint: false, scatter: false, feather: 2.2 }),
      route('fen-tidefin-bank', [{ x: -13, z: 16 }, { x: -17, z: 13 }, { x: -24, z: 11 }, { x: -34, z: 5 }], 3.45, { style: 'gravel' }),
      route('fen-observatory-forecourt', [P(8, 12, .8), P(14, 10, 1.2), P(18, 12, 1.2)], 4.1, { style: 'gravel', feather: 2 }),
      // The middle and upper grades deliberately travel north/east of the
      // retained convex Fen-bank outcrops. The outcrops keep their own
      // admitted placement and collision contract rather than becoming route
      // decorations or invisible blockers.
      route('fen-observatory-middle-grade', [P(18, 12, 1.2), P(21, 17, 1.55), P(24, 22, 1.8), P(32, 22, 2.1), P(36, 18, 2.2), P(34, 16, 2.2)], 3.5, { paint: false, scatter: false, feather: 1.8 }),
      route('fen-observatory-high-loop', [P(34, 16, 2.2), P(40, 13, 2.75), P(42, 6, 3.3), P(38, 2, 2.8), P(34, 4, 2.55), P(34, 10, 3), P(34, 16, 2.2)], 3.25, { paint: false, scatter: false, feather: 1.7 }),
      route('fen-far-bank-shoulder', [P(-9, -8, .35), P(-18, -14, 1.1), P(-28, -15, 1.55), P(-34, -20, 2.3), P(-39, -27, 3.3), P(-44, -34, 4.25)], 3.7, { paint: false, scatter: false, feather: 2.2 }),
      route('fen-wreck-return-descent', [P(-44, -34, 4.25), P(-35, -31, 3.3), P(-24, -30, 2.15), P(-13, -32, 1.25), P(0, -34, .72)], 3.8, { paint: false, scatter: false, feather: 2.2 }),
      route('fen-gate-spur', [{ x: 0, z: -34 }, { x: -7, z: -31 }, { x: -15, z: -29 }], 3.25, { paint: false, scatter: false }),
      route('fen-wreck-cache-shelf', [{ x: -44, z: -34 }, { x: -46, z: -36 }], 4.3, { elevation: 4.25, paint: false, scatter: false, feather: 1.4 }),
      // These short paint-only strokes keep forks and thresholds legible
      // without converting the whole supported grade into a tan circuit.
      route('fen-middle-silt-stroke', [{ x: 18, z: 12 }, { x: 21, z: 17 }, { x: 24, z: 22 }], 3.2, { style: 'gravel', scatter: false, feather: 1.2 }),
      route('fen-high-silt-stroke-a', [{ x: 34, z: 16 }, { x: 40, z: 13 }], 2.9, { style: 'gravel', scatter: false, feather: 1.1 }),
      route('fen-high-silt-stroke-b', [{ x: 38, z: 2 }, { x: 34, z: 4 }], 2.7, { style: 'gravel', scatter: false, feather: 1.1 }),
      route('fen-far-silt-stroke-a', [{ x: -9, z: -8 }, { x: -18, z: -14 }], 3.2, { style: 'gravel', scatter: false, feather: 1.2 }),
      route('fen-far-silt-stroke-b', [{ x: -28, z: -15 }, { x: -34, z: -20 }], 3.15, { style: 'gravel', scatter: false, feather: 1.2 }),
      route('fen-wreck-silt-stroke', [{ x: -35, z: -31 }, { x: -24, z: -30 }], 3.2, { style: 'gravel', scatter: false, feather: 1.2 }),
      route('fen-gate-silt-stroke', [{ x: 0, z: -34 }, { x: -7, z: -31 }], 2.8, { style: 'gravel', scatter: false, feather: 1 }),
    ],
    heights: [
      outlinedHeight('fen-tidefin-dry-crescent', 1.28, 3, [
        { x: -36, z: 13 }, { x: -30, z: 16 }, { x: -22, z: 15 }, { x: -18, z: 10 }, { x: -20, z: 5 }, { x: -28, z: 5 }, { x: -34, z: 8 },
      ]),
      outlinedHeight('fen-observatory-forecourt-land', 1.2, 2.6, [
        { x: 13, z: 15 }, { x: 18, z: 19 }, { x: 28, z: 19 }, { x: 32, z: 14 }, { x: 31, z: 5 }, { x: 27, z: 1 }, { x: 18, z: 2 }, { x: 13, z: 7 },
      ]),
      outlinedHeight('fen-observatory-middle-plate', 2.2, 2, [
        { x: 25, z: 18 }, { x: 35, z: 17 }, { x: 39, z: 12 }, { x: 35, z: 7 }, { x: 30, z: 8 }, { x: 27, z: 12 },
      ]),
      outlinedHeight('fen-observatory-rear-plate', 3.3, 1.8, [
        { x: 32, z: 13 }, { x: 42, z: 12 }, { x: 44, z: 5 }, { x: 38, z: 1 }, { x: 33, z: 4 }, { x: 31, z: 8 },
      ]),
      outlinedHeight('fen-northeast-peat-tongue', .9, 5.2, [
        { x: 11, z: -23 }, { x: 18, z: -26 }, { x: 30, z: -22 }, { x: 33, z: -16 },
        { x: 28, z: -8 }, { x: 17, z: -6 }, { x: 10, z: -11 }, { x: 8, z: -18 },
      ]),
      outlinedHeight('fen-far-bank-low-cut', 1.55, 3.4, [
        { x: -39, z: -9 }, { x: -24, z: -8 }, { x: -16, z: -13 }, { x: -16, z: -24 }, { x: -25, z: -29 }, { x: -36, z: -25 }, { x: -40, z: -18 },
      ]),
      outlinedHeight('fen-wreck-lookout', 4.45, 3, [
        { x: -50, z: -28 }, { x: -43, z: -23 }, { x: -35, z: -27 }, { x: -36, z: -38 }, { x: -42, z: -44 }, { x: -50, z: -42 },
      ]),
      outlinedHeight('fen-emberfall-gate-bank', .72, 3, [
        { x: -15, z: -27 }, { x: 11, z: -27 }, { x: 15, z: -34 }, { x: 10, z: -40 }, { x: -12, z: -40 }, { x: -17, z: -34 },
      ]),
    ],
    // Unequal overlapping reaches visually read as one western drainage. The
    // dry crescent remains a deliberate interruption for snare play, rather
    // than a water physics shortcut through the Tidefin bank.
    water: [
      // V3 compresses the west into two visibly joined reaches. The dry
      // crescent still interrupts the Tidefin lane, while the overlaps run
      // around its north and west sides instead of forming stepping gaps.
      { id: 'fen-creek-south-reach', x: -25, z: 22, rx: 6.9, rz: 4.5, depth: .34 },
      { id: 'fen-quietwater-north-lobe', x: -30.5, z: 19, rx: 7.5, rz: 6.8, depth: .34 },
      { id: 'fen-quietwater-west-link', x: -37, z: 10, rx: 2, rz: 10.5, depth: .36 },
      { id: 'fen-quietwater-south-lobe', x: -30, z: 1, rx: 4.4, rz: 4.2, depth: .34 },
      { id: 'fen-creek-middle-reach', x: -38, z: 5, rx: 3.2, rz: 4.8, depth: .38 },
      { id: 'fen-creek-north-bend', x: -22.5, z: -4, rx: 6.5, rz: 6, depth: .33 },
      // One long north-east indentation nests against the existing peat
      // tongue; it replaces the former decorative pair of detached pools.
      { id: 'fen-peat-north-indentation', x: 30, z: -19, rx: 7.5, rz: 8.3, depth: .23 },
    ],
    detail: { grassDensity: .55, groundcover: 'fan' },
  };
}

const PRESERVED_PROP_IDS = new Set([
  ...SHATTERFEN_UPLANDS.protectedHarvestPropIds,
  ...SHATTERFEN_UPLANDS.wildkinPropIds,
  'prop_s2_observatory_arch',
]);

function replacementScenery() {
  return [
    prop('prop_shatterfen_arrival_panel_a', 'asset_survey_panel_debris', -6, 27, .82, .38),
    prop('prop_shatterfen_arrival_panel_b', 'asset_survey_panel_debris', 7, 25, .68, -.7),
    prop('prop_shatterfen_arrival_reed_l', 'asset_fen_reed', -10, 30, 1.35),
    prop('prop_shatterfen_arrival_reed_r', 'asset_fen_reed', 12, 29, 1.28),
    prop('prop_shatterfen_crossing_stone_w', 'asset_fen_stone', -19, 22.5, 1.08, .2),
    prop('prop_shatterfen_crossing_stone_e', 'asset_fen_stone', 40, 22, 1.02, -.16),
    prop('prop_shatterfen_tidefin_rim_reed_a', 'asset_fen_reed', -38.2, 20.4, 1.55),
    prop('prop_shatterfen_tidefin_rim_reed_b', 'asset_fen_reed', -39.8, 10.2, 1.62),
    prop('prop_shatterfen_tidefin_rim_lily', 'asset_fen_lily', -36.8, -1.8, 1.5),
    prop('prop_shatterfen_tidefin_bank_stone', 'asset_fen_stone', -21, 17, 1.05, .18),
    prop('prop_shatterfen_observatory_toe', 'asset_fen_stone', 39.5, 20, 1.15, -.12),
    prop('prop_shatterfen_observatory_high_stone', 'asset_fen_stone', 46, 10, 1.2, .25),
    prop('prop_shatterfen_observatory_lily', 'asset_fen_lily', 12, 5, 1.42),
    prop('prop_shatterfen_farbank_reed', 'asset_fen_reed', -39, -15, 1.5),
    prop('prop_shatterfen_farbank_stone', 'asset_fen_stone', -20, -23, 1.16, -.2),
    // Measured GLB bounds: panel 2.11 x .455 x 1.41m, cargo frame
    // 1.41 x .75 x 1.054m at scale 1. These grounded scales compose an
    // 8.1 x 5.2m oblique footprint without inventing a hull model.
    prop('prop_shatterfen_wreck_frame', 'asset_survey_cargo_frame', -42.3, -31.2, 3.2, .36),
    prop('prop_shatterfen_wreck_panel_a', 'asset_survey_panel_debris', -44.3, -30.7, 2.1, -.22),
    prop('prop_shatterfen_wreck_panel_b', 'asset_survey_panel_debris', -40.2, -32.5, 1.55, .92),
    // The prior crystal asset registers as crystal_shard. A Fen stone is a
    // non-harvestable scenic buttress, so it cannot create a fourth prop node.
    prop('prop_shatterfen_wreck_crystal', 'asset_fen_stone', -47.2, -29.2, 1.05, .14),
    prop('prop_shatterfen_gate_stone_l', 'asset_fen_stone', -10, -38, 1.12, .18),
    prop('prop_shatterfen_gate_stone_r', 'asset_fen_stone', 10, -38, 1.1, -.18),
    // Twenty grouped additions: the existing pieces are repositioned first,
    // then these prop-role-only reeds/lilies/stones shape wet edges and the
    // two east faces. All are non-solid scenery, never route blockers.
    prop('prop_shatterfen_west_reed_c', 'asset_fen_reed', -39.4, 19, 1.45, .2),
    prop('prop_shatterfen_west_reed_d', 'asset_fen_reed', -40.5, 11.5, 1.68, -.2),
    prop('prop_shatterfen_west_reed_e', 'asset_fen_reed', -38.5, 8.2, 1.38, .12),
    prop('prop_shatterfen_west_reed_f', 'asset_fen_reed', -38.3, .4, 1.56, -.18),
    prop('prop_shatterfen_west_lily_b', 'asset_fen_lily', -37.4, 18.2, 1.26, .1),
    prop('prop_shatterfen_west_lily_c', 'asset_fen_lily', -37, 9, 1.34, -.2),
    prop('prop_shatterfen_peat_reed_a', 'asset_fen_reed', 27, -23, 1.48, .1),
    prop('prop_shatterfen_peat_reed_b', 'asset_fen_reed', 28.7, -21.5, 1.6, -.2),
    prop('prop_shatterfen_peat_reed_c', 'asset_fen_reed', 34, -14.6, 1.42, .24),
    prop('prop_shatterfen_peat_lily_a', 'asset_fen_lily', 29.5, -22.2, 1.24, .2),
    prop('prop_shatterfen_peat_lily_b', 'asset_fen_lily', 35.2, -13.8, 1.3, -.15),
    prop('prop_shatterfen_east_reed_a', 'asset_fen_reed', 45, 14, 1.42, -.1),
    prop('prop_shatterfen_east_reed_b', 'asset_fen_reed', 45, 3, 1.54, .18),
    prop('prop_shatterfen_east_reed_c', 'asset_fen_reed', 41, 20, 1.36, -.2),
    prop('prop_shatterfen_east_lily_a', 'asset_fen_lily', 43, 1, 1.25, .1),
    prop('prop_shatterfen_east_face_a', 'asset_fen_stone', 43.2, 20.4, 1.12, .22),
    prop('prop_shatterfen_east_face_b', 'asset_fen_stone', 44.8, 18.2, 1.24, -.14),
    prop('prop_shatterfen_east_face_c', 'asset_fen_stone', 43.8, 16.4, 1.14, .3),
    prop('prop_shatterfen_east_face_d', 'asset_fen_stone', 38.4, -12.5, 1.2, -.22),
    prop('prop_shatterfen_east_face_e', 'asset_fen_stone', 40.2, -14.5, 1.1, .17),
  ];
}

function exactlyOne(items, id, label) {
  const matches = (items ?? []).filter((entry) => entry.id === id);
  if (matches.length !== 1) throw new Error(`Shatterfen uplands requires one ${label}/${id}; found ${matches.length}`);
  return matches[0];
}

function rebase(region, entries) {
  for (const entry of entries ?? []) {
    if (!entry?.pos) continue;
    entry.pos.y = Number(getSurfaceHeight(region.surface, entry.pos.x, entry.pos.z).toFixed(4));
    if (entry.homePos) entry.homePos.y = Number(getSurfaceHeight(region.surface, entry.homePos.x, entry.homePos.z).toFixed(4));
    if (entry.runSpawn?.position) {
      const spawn = entry.runSpawn.position;
      spawn.y = Number(getSurfaceHeight(region.surface, spawn.x, spawn.z).toFixed(4));
    }
  }
}

export function composeShatterfenUplands(world) {
  const region = world?.regions?.find((entry) => entry.id === SHATTERFEN_UPLANDS.sectionId);
  if (!region) throw new Error('Shatterfen uplands requires section_2');
  for (const id of SHATTERFEN_UPLANDS.protectedResourceIds) exactlyOne(region.resources, id, 'renewable resource');
  for (const id of [...SHATTERFEN_UPLANDS.protectedHarvestPropIds, ...SHATTERFEN_UPLANDS.wildkinPropIds, 'prop_s2_observatory_arch']) exactlyOne(region.props, id, 'gameplay prop');
  for (const id of ['entry_section_2']) exactlyOne(region.entryPoints, id, 'entry point');
  for (const id of ['gate_section_2_to_1', 'gate_section_2_to_3']) exactlyOne(region.portalGates, id, 'portal gate');
  for (const id of ['wp_section_2']) exactlyOne(region.majorWaypoints, id, 'waypoint');
  for (const id of ['beacon_section_2']) exactlyOne(region.extractionBeacons, id, 'beacon');
  for (const id of ['chest_secret_section_2', 'chest_parkour_section_2', 'chest_tidefin_secret']) exactlyOne(region.lootChests, id, 'chest');
  for (const assetId of ['asset_fen_reed', 'asset_fen_stone', 'asset_fen_lily', 'asset_crystal', 'asset_survey_panel_debris', 'asset_survey_cargo_frame', 'asset_chest']) {
    if (!world.visualAssets?.some((asset) => asset.id === assetId)) throw new Error(`Shatterfen uplands requires ${assetId}`);
  }

  setBounds(region);
  region.surface = makeSurface();
  // V2 has no authored pad/course challenge. Clear these legacy containers so
  // a full Author import cannot retain invisible old course mechanics beside
  // the ordinary graded routes.
  region.jumpPads = [];
  region.parkourStarts = [];
  region.parkourCheckpoints = [];
  region.parkourEnds = [];
  region.parkourCourseZones = [];
  region.traversal = { platforms: [], obstacles: [], climbables: [], jumpTraversals: [] };
  // Fen-bank outcrops are admitted static art with their own collision assets.
  // Keep them as a family while replacing the old generic perimeter scatter.
  region.props = region.props.filter((entry) => PRESERVED_PROP_IDS.has(entry.id) || entry.id.startsWith('prop_fen_bank_'));
  region.props.push(...replacementScenery());
  const supply = {
    id: 'chest_shatterfen_wreck_supply', displayName: 'Wreck Supply Cache', pos: { x: -44, y: 0, z: -34 }, rotY: .28,
    lootTableId: 'loot_shatterfen_parkour', refillSeconds: 86400, triggerRadius: 1.4, secret: true, visualAssetId: 'asset_chest',
  };
  region.lootChests = region.lootChests.filter((entry) => entry.id !== supply.id);
  region.lootChests.push(supply);
  if (region.sectionProfile?.expected?.secrets) region.sectionProfile.expected.secrets = { ...region.sectionProfile.expected.secrets, max: 4 };

  // All protected X/Z values remain authoritative. This is deliberately a Y
  // rebase only, through the same terrain field used by rendering and physics.
  rebase(region, region.props);
  rebase(region, region.resources);
  rebase(region, region.lootChests);
  rebase(region, region.creatures);
  rebase(region, region.majorWaypoints);
  rebase(region, region.extractionBeacons);
  rebase(region, region.entryPoints);
  rebase(region, region.portalGates);
  // Terrain replacement strips prior paint routes and changes support under
  // the retained bank hulls. Reapply only that bank's narrow surface/foot
  // transaction; the bank composer remains the sole owner of its assets.
  applyFenBankSurfaceAndGrounding(world);
  return world;
}
