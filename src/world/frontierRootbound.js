import { sampleRootboundShoulder } from './rootboundShoulders.js';
import { ROOTBOUND_LANDFORM_BRANCH, ROOTBOUND_LANDFORM_ROUTE, ROOTBOUND_SUBREGIONS, sampleRootboundLandform } from './rootboundLandforms.js';
export { ROOTBOUND_LANDFORM_BRANCH, ROOTBOUND_LANDFORM_ROUTE, ROOTBOUND_SUBREGIONS, sampleRootboundLandform } from './rootboundLandforms.js';
// Finite Rootbound relief and curated scenery. This module deliberately knows
// no ecology or runtime owners: the terrain sampler remains acyclic.
export const FRONTIER_ROOTBOUND_CONFIG = Object.freeze({
  habitatId: 'rootbound-wildwood',
  bounds: Object.freeze({ minX: -525, maxX: -325, minZ: 550, maxZ: 750 }),
  crown: Object.freeze({ x: -468, z: 717 }),
  hollow: Object.freeze({ x: -445, z: 678, radiusX: 20, radiusZ: 16 }),
  protectedBounds: Object.freeze({ minX: -550, maxX: -300, minZ: 525, maxZ: 775 }),
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const ROOTBOUND_FACET_FIELD = Object.freeze({
  minX: -458, maxX: -436, minZ: 666, maxZ: 688, step: 2,
  values: Object.freeze([
    Object.freeze([0,0,0,0,0,0,0,0,0,0,0,0]),
    Object.freeze([0,-.08,-.16,-.10,.04,.12,.08,-.04,-.12,-.06,.05,0]),
    Object.freeze([0,-.12,-.22,-.14,.10,.24,.18,.01,-.17,-.13,.02,0]),
    Object.freeze([0,-.05,-.16,-.06,.18,.32,.26,.06,-.13,-.20,-.05,0]),
    Object.freeze([0,.08,-.04,.10,.28,.36,.20,-.08,-.24,-.18,-.02,0]),
    Object.freeze([0,.14,.04,.18,.31,.22,.04,-.20,-.30,-.14,.06,0]),
    Object.freeze([0,.08,-.06,.04,.22,.12,-.12,-.28,-.22,-.04,.12,0]),
    Object.freeze([0,-.05,-.18,-.10,.08,-.02,-.24,-.32,-.16,.06,.14,0]),
    Object.freeze([0,-.10,-.24,-.14,.02,-.12,-.26,-.20,-.04,.18,.12,0]),
    Object.freeze([0,-.04,-.12,-.02,.16,.08,-.06,.02,.12,.24,.10,0]),
    Object.freeze([0,.04,.02,.12,.22,.16,.04,.10,.22,.28,.12,0]),
    Object.freeze([0,0,0,0,0,0,0,0,0,0,0,0]),
  ]),
});

function rootboundFacetVertex(ix, iz, protectDefaultLife) {
  const value = ROOTBOUND_FACET_FIELD.values[iz]?.[ix] ?? 0;
  if (!value) return 0;
  const x = ROOTBOUND_FACET_FIELD.minX + ix * ROOTBOUND_FACET_FIELD.step;
  const z = ROOTBOUND_FACET_FIELD.minZ + iz * ROOTBOUND_FACET_FIELD.step;
  return value * (1 - (protectDefaultLife ? lifePreservation(x, z) : 0));
}

function sampleRootboundFacetDelta(x, z, protectDefaultLife) {
  const field = ROOTBOUND_FACET_FIELD;
  if (x < field.minX || x > field.maxX || z < field.minZ || z > field.maxZ) return 0;
  const fx = (x - field.minX) / field.step, fz = (z - field.minZ) / field.step;
  const ix = Math.min(field.values[0].length - 2, Math.max(0, Math.floor(fx)));
  const iz = Math.min(field.values.length - 2, Math.max(0, Math.floor(fz)));
  const tx = clamp01(fx - ix), tz = clamp01(fz - iz);
  const a = rootboundFacetVertex(ix, iz, protectDefaultLife);
  const b = rootboundFacetVertex(ix + 1, iz, protectDefaultLife);
  const c = rootboundFacetVertex(ix, iz + 1, protectDefaultLife);
  const d = rootboundFacetVertex(ix + 1, iz + 1, protectDefaultLife);
  return tx + tz <= 1
    ? a + (b - a) * tx + (c - a) * tz
    : b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => a + (b - a) * t;
const inBounds = (x, z, bounds) => x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;

function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? clamp01(((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

const RIDGES = Object.freeze([
  Object.freeze({ id: 'gallery-west', points: Object.freeze([[-478, 719], [-474, 716], [-470, 714]]), width: 7, rise: 2.1 }),
  Object.freeze({ id: 'gallery-east', points: Object.freeze([[-472, 721], [-468, 718], [-465, 715]]), width: 6, rise: 1.75 }),
  Object.freeze({ id: 'lantern-bank', points: Object.freeze([[-440, 682], [-436, 684], [-433, 686]]), width: 4, rise: 1.35 }),
]);
// Default-world forage and resident homes touched by the finite circuit. These
// are a terrain-side snapshot, kept here to avoid importing either generator.
const PROTECTED_LIFE_POINTS = Object.freeze([
  [-462.7986367856807,612.522192213737],[-486.3830629563711,667.460710964266],
  [-504.82120675690055,684.0168388668075],[-504.7219863251589,680.7507116697242],
  [-465.4,637.2],[-468.3,638.2],[-467.8,635.1],[-404.7,614.8],[-407.8,615.6],[-404.1,632.3],[-407.2,633.8],[-406.9,630.2],[-390.5,631.5],[-393.8,632.3],[-393,629],
  [-463.6,670.1],[-467,671],[-466,667.8],[-440.5,670.9],[-443.3,672.2],[-443,668.9],[-432.6,676.4],[-435.5,677.8],[-435,674.6],[-429,666.1],[-432.2,666.9],
  [-378.8,688],[-381.9,689.1],[-381.2,685.8],[-377.4,684.1],[-380.5,685.2],[-380,682],[-380.1,686.5],[-405.8,728.3],[-405.1,725.1],[-404.7,711.9],[-387.1,712.9],[-390.4,713.4],[-389.3,710.5],
]);

function lifePreservation(x, z) {
  let distanceSq = Infinity;
  for (const [px, pz] of PROTECTED_LIFE_POINTS) {
    const dx = x - px, dz = z - pz;
    distanceSq = Math.min(distanceSq, dx * dx + dz * dz);
  }
  const distance = Math.sqrt(distanceSq);
  const pointProtection = 1 - smooth((distance - 2.1) / 2.4);
  // Three protected resident plates retain their pre-existing selection surface.
  // This is deliberately a small set of broad stable plates, not many tiny holes.
  const plates = [[-400, -350, 650, 700], [-450, -400, 700, 750], [-500, -450, 700, 750]];
  let plateProtection = 0;
  for (const [minX, maxX, minZ, maxZ] of plates) {
    const dx = Math.max(minX - x, 0, x - maxX), dz = Math.max(minZ - z, 0, z - maxZ);
    // A four metre smooth skirt keeps the preserved resident plate from
    // becoming a mesh seam or a Rapier step at its edge.
    plateProtection = Math.max(plateProtection, 1 - smooth(Math.hypot(dx, dz) / 4));
  }
  return Math.max(pointProtection, plateProtection);
}

/** A bounded height/color profile, neutral outside Rootbound's authored loop. */
export function sampleFrontierRootboundFeature(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !inBounds(x, z, FRONTIER_ROOTBOUND_CONFIG.bounds)) {
    return { active: false, edgeInfluence: 0, ridgeWeight: 0, hollowWeight: 0, crownWeight: 0, thornWeight: 0, landformWeight: 0, zone: null };
  }
  const b = FRONTIER_ROOTBOUND_CONFIG.bounds;
  const edgeInfluence = smooth(Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z) / 18);
  const ridgeWeight = Math.max(...RIDGES.map(ridge => smooth(1 - Math.min(...ridge.points.slice(0, -1)
    .map((point, index) => segmentDistance(x, z, point, ridge.points[index + 1]))) / ridge.width))) * edgeInfluence;
  const hollow = FRONTIER_ROOTBOUND_CONFIG.hollow;
  const hollowWeight = smooth((1 - Math.hypot((x - hollow.x) / hollow.radiusX, (z - hollow.z) / hollow.radiusZ)) / .28) * edgeInfluence;
  const crownWeight = smooth(1 - Math.hypot(x - FRONTIER_ROOTBOUND_CONFIG.crown.x, z - FRONTIER_ROOTBOUND_CONFIG.crown.z) / 27) * edgeInfluence;
  const thornWeight = smooth(1 - Math.hypot((x + 447) / 12, (z - 679) / 10)) * edgeInfluence;
  const landform = sampleRootboundLandform(x, z);
  const zone = thornWeight > .3 ? 'thornstone-verge' : hollowWeight > .3 ? 'lantern-hollow'
    : landform.influence > .15 ? landform.zone : ridgeWeight > .3 ? 'root-gallery' : 'spore-meadow';
  return { active: true, edgeInfluence, ridgeWeight, hollowWeight, crownWeight, thornWeight,
    landformWeight: landform.influence, zone };
}

export function sampleFrontierRootboundProfile(x, z, { baseHeight = 0, habitatWeight = 0, protectDefaultLife = true } = {}) {
  const feature = sampleFrontierRootboundFeature(x, z);
  const weight = clamp01(habitatWeight);
  if (!weight || !feature.active) return { height: baseHeight, colorRGB: null, colorWeight: 0, weight: 0, feature };
  const preserveLife = protectDefaultLife ? lifePreservation(x, z) : 0;
  const shoulder = sampleRootboundShoulder(x, z);
  const landform = sampleRootboundLandform(x, z);
  const shoulderDeltaM = shoulder.amount * (1 - preserveLife);
  // The new field owns the playable contours.  Fade the earlier narrow
  // shoulder accents beneath it so their legacy overlaps cannot create an
  // unseen grade spike across a four-metre walking lane.
  const legacyWeight = 1 - smooth((landform.influence - .35) / .65);
  const displacement = landform.heightOffset
    + (feature.ridgeWeight * 3.1 + feature.crownWeight * 2.2 + feature.thornWeight * 1.35 - feature.hollowWeight * 1.1) * (1 - preserveLife) * legacyWeight;
  // The literal R3 lattice is protected at its shared two-metre vertices and
  // then interpolated on the terrain's own diagonal, keeping query, mesh and
  // streamed physics on the same surface.
  const facetDeltaM = sampleRootboundFacetDelta(x, z, protectDefaultLife) * legacyWeight;
  // Keep the original clearing palette. Rootbound colour only gathers around
  // relief and the hollow, with the dark wet floor restricted to that pocket.
  const colorWeight = Math.max(feature.ridgeWeight * .58, feature.crownWeight * .72,
    feature.hollowWeight * .52, feature.thornWeight * .48, shoulder.coverage * .65,
    // Region composition applies the shared profile only when it receives an
    // authored colour surface.  A tiny colour weight makes the large landform
    // field continuous without changing the intentionally neutral Meadow.
    smooth((landform.heightOffset - .12) / .75) * .5);
  const floor = [.20, .29, .18], root = [.17, .11, .055], thorn = [.14, .18, .17];
  const landformPalette = {
    'root-gallery': [.22, .27, .13],
    'lantern-hollow': [.13, .22, .16],
    'thornstone-verge': [.29, .28, .20],
    'heartroot-crown': [.29, .31, .12],
  }[feature.zone] ?? floor;
  const colorRGB = colorWeight > 0
    ? floor.map((value, index) => blend(blend(landformPalette[index], root[index], feature.ridgeWeight + feature.crownWeight * .5 + shoulder.coverage * .25), thorn[index], feature.thornWeight))
    : null;
  return { height: baseHeight + (displacement + facetDeltaM + shoulderDeltaM) * weight, colorRGB, colorWeight, weight, feature,
    facetDeltaM: facetDeltaM * weight };
}

export function rootboundCircuitChunk(cx, cz) {
  return Number.isSafeInteger(cx) && Number.isSafeInteger(cz) && cx >= -11 && cx <= -7 && cz >= 11 && cz <= 14;
}

export const ROOTBOUND_CURATED_SCENERY = Object.freeze([
  { key: 'arrival-canopy', assetId: 'asset_verge_canopy_tall', x: -470, z: 590, scale: .9, yaw: -.2, kind: 'canopy' },
  { key: 'arrival-log', assetId: 'asset_fallen_log', x: -465, z: 587, scale: .8, yaw: -.65, kind: 'low' },
  { key: 'gallery-log', assetId: 'asset_fallen_log', x: -479, z: 708, scale: .95, yaw: -.65, kind: 'low' },
  { key: 'lantern-log', assetId: 'asset_fallen_log', x: -444, z: 678, scale: .95, yaw: .45, kind: 'low' },
  { key: 'lantern-ring-a', assetId: 'asset_mushroom_ring', x: -442, z: 678, scale: .9, yaw: .2, kind: 'low' },
  { key: 'lantern-ring-b', assetId: 'asset_mushroom_ring', x: -444, z: 681, scale: .85, yaw: -.4, kind: 'low' },
  { key: 'thorn-a', assetId: 'asset_fen_stone', x: -448, z: 679, scale: .85, yaw: .1, kind: 'low' },
  { key: 'thorn-b', assetId: 'asset_fen_stone', x: -446, z: 679, scale: .8, yaw: -.35, kind: 'low' },
  { key: 'lantern-colony-r4', assetId: 'asset_lantern_log_manual_r4', x: -440, z: 688, scale: 1.35, yaw: .55, kind: 'low' },
  { key: 'lantern-colony-lily', assetId: 'asset_fen_lily', x: -441, z: 688, scale: 1.05, yaw: .2, kind: 'low' },
  { key: 'lantern-colony-ring', assetId: 'asset_mushroom_ring', x: -441, z: 687, scale: .82, yaw: .2, kind: 'low' },
  { key: 'lantern-colony-pebbles', assetId: 'asset_pebble_cluster', x: -438, z: 688, scale: 1.05, yaw: .2, kind: 'low' },
  { key: 'lantern-margin-left-spread', assetId: 'asset_verge_canopy_spread', x: -445, z: 683, scale: .52, yaw: .2, kind: 'canopy' },
  { key: 'lantern-margin-back-tall', assetId: 'asset_verge_canopy_tall', x: -439, z: 688, scale: .48, yaw: .12, kind: 'canopy' },
  { key: 'lantern-margin-back-spread', assetId: 'asset_verge_canopy_spread', x: -443, z: 686, scale: .5, yaw: .1, kind: 'canopy' },
  { key: 'meadow-west-edge', assetId: 'asset_rootbound_block_leaf', x: -490, z: 600.5, scale: 3.4, yaw: 0.2, kind: 'low' },
  { key: 'meadow-east-rootline', assetId: 'asset_rootbound_block_root', x: -469, z: 603, scale: 3.1, yaw: -0.4, kind: 'low' },
  { key: 'gallery-west-rib', assetId: 'asset_rootbound_block_root', x: -487, z: 645, scale: 2.7, yaw: 0.2, kind: 'low' },
  { key: 'gallery-east-rib', assetId: 'asset_rootbound_block_leaf', x: -470, z: 649, scale: 2.7, yaw: -0.3, kind: 'low' },
  { key: 'gallery-north-collar', assetId: 'asset_rootbound_block_leaf', x: -480, z: 697, scale: 2.7, yaw: 0.1, kind: 'low' },
  { key: 'verge-west-seam', assetId: 'asset_rootbound_block_thorn', x: -424, z: 675, scale: 1.8, yaw: 0.2, kind: 'low' },
  { key: 'verge-east-shards', assetId: 'asset_rootbound_block_thorn', x: -409, z: 694, scale: 2, yaw: -0.2, kind: 'low' },
  { key: 'gallery-west-rib-2', assetId: 'asset_rootbound_block_root', x: -488.5, z: 656, scale: 2.7, yaw: 0.1, kind: 'low' },
  { key: 'gallery-west-rib-3', assetId: 'asset_rootbound_block_leaf', x: -489, z: 676.5, scale: 2.7, yaw: 0.2, kind: 'low' },
  { key: 'gallery-east-rib-2', assetId: 'asset_rootbound_block_leaf', x: -457.5, z: 664, scale: 2.7, yaw: -0.25, kind: 'low' },
  { key: 'gallery-east-rib-3', assetId: 'asset_rootbound_block_root', x: -462, z: 691, scale: 2.7, yaw: -0.2, kind: 'low' },
  { key: 'verge-seam-2', assetId: 'asset_rootbound_block_thorn', x: -405, z: 704, scale: 1.6, yaw: 0.2, kind: 'low' },
  { key: 'verge-seam-3', assetId: 'asset_rootbound_block_thorn', x: -416, z: 701, scale: 1.5, yaw: -0.2, kind: 'low' },
  // Room-scale enclosure assembled from existing low-prop recipes.
  {"key":"gallery-shelter-west","assetId":"asset_rootbound_gallery_shelter_placeholder","x":-484.34,"z":646.86,"yaw":-1.19029,"scale":1,"kind":"low"},
  {"key":"gallery-shelter-east","assetId":"asset_rootbound_gallery_shelter_placeholder","x":-474.56,"z":643.14,"yaw":-1.19029,"scale":1,"kind":"low"},
  {"key":"gallery-terminus","assetId":"asset_rootbound_gallery_lintel_placeholder","x":-477.84,"z":661.86,"yaw":-1.19029,"scale":1,"kind":"low"},
  // The hero oak supplies the summit mass.  Removing the former overlapping
  // placeholder/web bundle opens the southern overlook; this single real
  // buttress gives the player a right-hand foreground without closing it.
  { key: 'crown-outlook-right-buttress', assetId: 'asset_rootbound_block_root', x: -455, z: 713, scale: 3.1, yaw: -.42, kind: 'low' },
  {"key":"edge-gallery-west-01","assetId":"asset_rootbound_block_root","x":-484.6,"z":625,"yaw":0.3,"scale":3.3,"kind":"low"},
  {"key":"edge-gallery-east-01","assetId":"asset_rootbound_block_leaf","x":-472.5,"z":630,"yaw":-0.32,"scale":3.25,"kind":"low"},
  {"key":"edge-gallery-west-02","assetId":"asset_rootbound_block_leaf","x":-483,"z":652,"yaw":0.18,"scale":3.55,"kind":"low"},
  {"key":"edge-gallery-east-02","assetId":"asset_rootbound_block_root","x":-470.9,"z":650,"yaw":-0.28,"scale":3.3,"kind":"low"},
  {"key":"edge-gallery-west-03","assetId":"asset_rootbound_block_root","x":-486,"z":660.5,"yaw":0.1,"scale":3.45,"kind":"low"},
  {"key":"edge-gallery-east-03","assetId":"asset_rootbound_block_leaf","x":-467.5,"z":656.5,"yaw":-0.2,"scale":3.35,"kind":"low"},
  {"key":"edge-gallery-west-04","assetId":"asset_rootbound_block_leaf","x":-486,"z":672,"yaw":0.28,"scale":3.45,"kind":"low"},
  {"key":"edge-gallery-east-04","assetId":"asset_rootbound_block_root","x":-466,"z":659,"yaw":-0.14,"scale":3.2,"kind":"low"},
  {"key":"edge-grove-east-01","assetId":"asset_rootbound_block_leaf","x":-425,"z":660,"yaw":-0.24,"scale":3.15,"kind":"low"},
  {"key":"edge-grove-east-02","assetId":"asset_rootbound_block_root","x":-424,"z":669,"yaw":0.18,"scale":3,"kind":"low"},
  {"key":"edge-grove-rear-01","assetId":"asset_rootbound_block_leaf","x":-439.5,"z":696,"yaw":0.08,"scale":3.35,"kind":"low"},
  {"key":"edge-grove-rear-02","assetId":"asset_rootbound_block_root","x":-450,"z":710,"yaw":-0.22,"scale":3.2,"kind":"low"},
  {"key":"edge-grove-west-01","assetId":"asset_rootbound_block_leaf","x":-472.5,"z":688,"yaw":0.18,"scale":2.8,"kind":"low"},
  {"key":"edge-grove-west-02","assetId":"asset_rootbound_block_root","x":-476.5,"z":693.5,"yaw":-0.16,"scale":2.85,"kind":"low"},
]);
