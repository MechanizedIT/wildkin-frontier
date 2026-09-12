import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
// Unintegrated September12 study, deliberately not called by author-beta-world.
// Fix the full-width west-descent/foundry merge before integration; see candidate handoff.

export const EMBERFALL_RAVINE = Object.freeze({
  sectionId: 'section_3',
  bounds: Object.freeze({ minX: -60, maxX: 60, minZ: -60, maxZ: 60 }),
  foundryTie: Object.freeze({ x: -25, z: -4, y: 2.2 }),
  foundryPrefix: 'prop_foundry_habitat_',
  gameplayPropIds: Object.freeze([
    'prop_s3_ore_a', 'prop_s3_crystal', 'prop_s3_barrier',
    'wildkin_emberhorn_1', 'wildkin_emberhorn_2', 'wildkin_cinder_1', 'wildkin_cinder_2',
    'prop_s3_shrine_ore', 'prop_s3_gate_ore', 'prop_s3_route_ore', 'prop_s3_arrival_ore',
  ]),
  resourceIds: Object.freeze(['tree_section_3_01', 'rock_section_3_01', 'fiber_section_3_01']),
  anchorIds: Object.freeze([
    'entry_section_3', 'gate_section_3_to_2', 'gate_section_3_to_4', 'wp_section_3', 'beacon_section_3',
    'chest_secret_section_3', 'chest_parkour_section_3', 'chest_emberhorn_secret',
  ]),
});

const route = (id, points, width, options = {}) => ({
  id, points, width, feather: 2.5, paint: false, scatter: false, ...options,
});

// The outline is written in world metres, while the terrain model stores the
// compact normalized polygon required by Author, renderer, physics and support
// queries. Keeping this helper local makes the level's real footprints legible.
export function outlinedHeight(id, height, edgeWidth, points) {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  const rx = (maxX - minX) / 2, rz = (maxZ - minZ) / 2;
  return {
    id, x, z, rx, rz, height, edgeWidth,
    outline: points.map((point) => ({
      x: Number(((point.x - x) / rx).toFixed(4)),
      z: Number(((point.z - z) / rz).toFixed(4)),
    })),
  };
}

const boundary = (id, x, z, w, d) => ({
  id, pos: { x, y: 0, z }, size: { w, h: 3, d }, rotY: 0,
  color: '#273447', opacity: .22, visibleInPlay: false, collisionEnabled: true,
});

function exactlyOne(items, id, label) {
  const matches = (items ?? []).filter((entry) => entry.id === id);
  if (matches.length !== 1) throw new Error(`Emberfall ravine requires one ${label}/${id}; found ${matches.length}`);
  return matches[0];
}

function setBounds(region) {
  const { minX, maxX, minZ, maxZ } = EMBERFALL_RAVINE.bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  region.size = { width, depth };
  region.bounds = { minX, maxX, minZ, maxZ };
  region.boundaryColliders = [
    boundary('boundary_section_3_north', 0, minZ + .5, width - 1, .5),
    boundary('boundary_section_3_south', 0, maxZ - .5, width - 1, .5),
    boundary('boundary_section_3_west', minX + .5, 0, .5, depth - 1),
    boundary('boundary_section_3_east', maxX - .5, 0, .5, depth - 1),
  ];
}

function cloneFoundrySupport(surface) {
  const ids = new Set(['foundry_habitat_west_back', 'foundry_habitat_east_fold', 'foundry_habitat_rear_fold']);
  return (surface?.heights ?? []).filter((height) => ids.has(height.id)).map((height) => structuredClone(height));
}

function sourceFoundryReturn(surface) {
  const composed = (surface?.routes ?? []).find((entry) => entry.id === 'ember-foundry-protected-return');
  if (composed) return structuredClone(composed);
  const original = (surface?.routes ?? []).find((entry) => entry.id === 'foundry-return');
  if (!original) throw new Error('Emberfall ravine requires the original foundry-return corridor');
  return route('ember-foundry-protected-return', original.points.map((point) => ({
    x: point.x, z: point.z, elevation: Number(getSurfaceHeight(surface, point.x, point.z).toFixed(4)),
  })), 4.8, { feather: 2.8 });
}

function makeSurface(originalSurface) {
  const P = (x, z, elevation) => ({ x, z, elevation });
  return {
    seed: 4109,
    palette: {
      grass: '#917450', grassShade: '#65523e', path: '#927a60', pathEdge: '#8f775e', gravel: '#9e8668',
      rock: '#756055', water: '#4e8a93', waterFoam: '#f7e4b2', accent: '#ffb35d',
    },
    routes: [
      // The low route remains a broad campaign floor. Only short strokes are
      // painted, leaving the ravine as open mineral ground rather than a road.
      route('ember-low-campaign', [P(0, 51, 0), P(0, 46, 0), P(-12, 28, .2), P(-18, 16, .25), P(-4, 12, .15), P(12, 5, .1), P(8, -15, .15), P(0, -45, .9), P(0, -49, .9)], 6.2, { feather: 3 }),
      route('ember-low-campaign-stroke', [{ x: 0, z: 48 }, { x: -10, z: 34 }, { x: -18, z: 16 }, { x: -6, z: 2 }], 3.25, { style: 'gravel', feather: 1.15 }),
      route('ember-court-stroke', [{ x: -18, z: 16 }, { x: -3, z: 12 }, { x: 13, z: 5 }, { x: 8, z: -15 }], 3.45, { style: 'gravel', feather: 1.1 }),
      // A 5.4m clear west lane climbs to the ridge, then a separate inner
      // shoulder returns into the existing foundry island without a drop.
      route('ember-west-ascent', [P(-20, 27, .35), P(-30, 33, 2.5), P(-43, 31, 7), P(-48, 20, 11), P(-39, 11, 12)], 5.4, { feather: 2.8 }),
      route('ember-west-foundry-descent', [P(-39, 11, 12), P(-33, 9, 9.5), P(-28, 5, 6.7), P(-30, 0, 4.5), P(-29, -3, 3.1), P(-25, -4, 2.2)], 5.4, { feather: 2.8 }),
      // The eastern shoulder reaches the retained cache at its existing X/Z,
      // then the different north-east descent completes a full high loop.
      route('ember-east-ascent', [P(14, 19, .1), P(25, 29, 2), P(40, 30, 6), P(49, 18, 11), P(43, 1, 16), P(33, 2, 13), P(28, 8, 12)], 5.6, { feather: 2.8 }),
      route('ember-east-descent', [P(28, 8, 12), P(30, -2, 13), P(37, -9, 12), P(45, -17, 8), P(40, -28, 4), P(28, -32, 1.2), P(12, -29, .3)], 5.6, { feather: 2.8 }),
      sourceFoundryReturn(originalSurface),
    ],
    heights: [
      // Six large authored polygon masses create unequal, broken ravine walls.
      outlinedHeight('ember-west-north-toe', 6.4, 5.2, [
        { x: -57, z: 43 }, { x: -45, z: 48 }, { x: -29, z: 40 }, { x: -25, z: 25 }, { x: -33, z: 13 }, { x: -49, z: 14 }, { x: -58, z: 27 },
      ]),
      outlinedHeight('ember-west-ridge-crest', 12, 4.8, [
        { x: -55, z: 34 }, { x: -47, z: 42 }, { x: -37, z: 39 }, { x: -31, z: 27 }, { x: -35, z: 13 }, { x: -45, z: 8 }, { x: -54, z: 16 },
      ]),
      outlinedHeight('ember-west-inner-buttress', 8.6, 4.6, [
        { x: -45, z: 11 }, { x: -35, z: 13 }, { x: -26, z: 8 }, { x: -24, z: -2 }, { x: -32, z: -8 }, { x: -43, z: -3 }, { x: -49, z: 4 },
      ]),
      outlinedHeight('ember-east-north-toe', 7.5, 5.2, [
        { x: 19, z: 39 }, { x: 34, z: 47 }, { x: 51, z: 39 }, { x: 56, z: 24 }, { x: 49, z: 16 }, { x: 34, z: 20 }, { x: 22, z: 27 },
      ]),
      outlinedHeight('ember-east-summit', 16, 5, [
        { x: 35, z: 30 }, { x: 47, z: 31 }, { x: 55, z: 19 }, { x: 51, z: 5 }, { x: 45, z: -7 }, { x: 34, z: -5 }, { x: 28, z: 7 }, { x: 30, z: 20 },
      ]),
      outlinedHeight('ember-east-descent-tongue', 8.4, 5.1, [
        { x: 35, z: 4 }, { x: 49, z: 1 }, { x: 54, z: -15 }, { x: 46, z: -31 }, { x: 32, z: -38 }, { x: 20, z: -31 }, { x: 24, z: -14 },
      ]),
      // These are the original local support fields. They intentionally keep
      // the admitted foundry pocket, recess and vault relationships low.
      ...cloneFoundrySupport(originalSurface),
    ],
    water: [],
    detail: { grassDensity: .44, groundcover: 'mineral' },
  };
}

function rebase(region, entries, excludedIds = new Set()) {
  for (const entry of entries ?? []) {
    if (!entry?.pos || excludedIds.has(entry.id)) continue;
    entry.pos.y = Number(getSurfaceHeight(region.surface, entry.pos.x, entry.pos.z).toFixed(4));
    if (entry.homePos) entry.homePos.y = Number(getSurfaceHeight(region.surface, entry.homePos.x, entry.homePos.z).toFixed(4));
    if (entry.runSpawn?.position) {
      const spawn = entry.runSpawn.position;
      spawn.y = Number(getSurfaceHeight(region.surface, spawn.x, spawn.z).toFixed(4));
    }
  }
}

export function composeEmberfallRavine(world) {
  const region = world?.regions?.find((entry) => entry.id === EMBERFALL_RAVINE.sectionId);
  if (!region) throw new Error('Emberfall ravine requires section_3');
  for (const id of EMBERFALL_RAVINE.resourceIds) exactlyOne(region.resources, id, 'renewable resource');
  for (const id of EMBERFALL_RAVINE.gameplayPropIds) exactlyOne(region.props, id, 'gameplay prop');
  for (const id of ['entry_section_3']) exactlyOne(region.entryPoints, id, 'entry point');
  for (const id of ['gate_section_3_to_2', 'gate_section_3_to_4']) exactlyOne(region.portalGates, id, 'portal gate');
  for (const id of ['wp_section_3']) exactlyOne(region.majorWaypoints, id, 'waypoint');
  for (const id of ['beacon_section_3']) exactlyOne(region.extractionBeacons, id, 'beacon');
  for (const id of ['chest_secret_section_3', 'chest_parkour_section_3', 'chest_emberhorn_secret']) exactlyOne(region.lootChests, id, 'loot chest');

  const originalSurface = structuredClone(region.surface);
  const foundryY = new Map((region.props ?? [])
    .filter((entry) => entry.id.startsWith(EMBERFALL_RAVINE.foundryPrefix))
    .map((entry) => [entry.id, entry.pos.y]));
  if (foundryY.size !== 27) throw new Error(`Emberfall ravine requires 27 foundry roots; found ${foundryY.size}`);

  setBounds(region);
  region.surface = makeSurface(originalSurface);
  // Existing scenery already supplies the target's mineral markers and
  // north-west foundry dressing. Preserve it rather than adding a parallel
  // rock scatter or introducing new physical route blockers.
  region.jumpPads = [];
  region.parkourStarts = [];
  region.parkourCheckpoints = [];
  region.parkourEnds = [];
  region.parkourCourseZones = [];
  region.traversal = { platforms: [], obstacles: [], climbables: [], jumpTraversals: [] };

  rebase(region, region.props, new Set(foundryY.keys()));
  rebase(region, region.resources);
  rebase(region, region.creatures);
  rebase(region, region.lootChests);
  rebase(region, region.majorWaypoints);
  rebase(region, region.extractionBeacons);
  rebase(region, region.entryPoints);
  rebase(region, region.portalGates);
  for (const [id, y] of foundryY) exactlyOne(region.props, id, 'foundry root').pos.y = y;
  return world;
}
