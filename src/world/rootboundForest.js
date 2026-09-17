import { PRIMARY, BRANCH, distanceToRoute } from './rootboundShoulders.js';
import { ROOTBOUND_REWARD_POCKETS } from './rootboundRewards.js';
export { ROOTBOUND_REWARD_POCKETS } from './rootboundRewards.js';

// A finite composition, not global scatter. Each patch has a different density,
// scale and opening. Trees are instanced by the existing scenery renderer.
export const ROOTBOUND_FOREST_ASSETS = Object.freeze([
  'asset_rootbound_oak', 'asset_rootbound_birch', 'asset_rootbound_bush', 'asset_rootbound_fern',
  'asset_rootbound_fallen_log', 'asset_fen_stone', 'asset_rootbound_block_thorn',
]);
export const ROOTBOUND_FOREST_LIMITS = Object.freeze({ near: 380, total: 400, trees: 112 });
const fract = n => n - Math.floor(n);
const rand = (x, z, salt) => fract(Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453);

export function rootboundRoom(x, z) {
  if (z < 616) return 'meadow';
  if (z > 704 && x < -445) return 'crown';
  if (x > -433 && z > 662) return 'verge';
  if (x > -469 && z > 659 && z < 704) return 'grove';
  return 'galleries';
}

export function rootboundRouteClearance(x, z) {
  return Math.min(distanceToRoute(x, z, PRIMARY) - 2.7, distanceToRoute(x, z, BRANCH) - 2.2);
}

function clearOpening(x, z, radius) {
  if (Math.hypot((x + 476) / 13, (z - 591) / 17) < 1 + radius / 15) return false;
  if (Math.hypot((x + 449) / 9, (z - 676) / 8) < 1 + radius / 9) return false;
  if (Math.hypot(x + 463, z - 685) < 4.6 + radius) return false;
  // The Crown is reached through a forest, then deliberately opens south and
  // southwest.  This window preserves the hero oak behind the player while
  // allowing the raised basin and its next descent to read at player height.
  if (x >= -482 - radius && x <= -458 + radius && z >= 704 - radius && z <= 718 + radius) return false;
  return ROOTBOUND_REWARD_POCKETS.every(p => Math.hypot(x - p.x, z - p.z) > p.radius + radius);
}

function buildForest() {
  const specs = [];
  // Patch edges drift; larger gaps remain around the meadow and dry Verge.
  for (let z = 569; z < 740; z += 7.5) for (let x = -515; x < -371; x += 7.5) {
    const px = x + (rand(x, z, 1) - .5) * 5.4;
    const pz = z + (rand(x, z, 2) - .5) * 5.4;
    const room = rootboundRoom(px, pz);
    const density = room === 'meadow' ? .65 : room === 'verge' ? .35 : room === 'grove' ? .83 : .91;
    if (rand(x, z, 3) > density * .82 || rootboundRouteClearance(px, pz) < 1.5 || !clearOpening(px, pz, 1.2)) continue;
    const oak = room === 'crown' || rand(x, z, 4) > (room === 'grove' ? .65 : .4);
    const scale = (.67 + rand(x, z, 5) * .48) * (room === 'crown' ? 1.3 : room === 'verge' ? .77 : 1);
    const key = `forest-${Math.round(x)}-${Math.round(z)}`;
    specs.push({ key, x: px, z: pz, assetId: oak ? 'asset_rootbound_oak' : 'asset_rootbound_birch',
      scale, yaw: rand(x, z, 6) * Math.PI * 2, kind: 'low', rootboundForest: true, tree: true, room });
    // Understory is clustered beneath selected crowns; clearings remain clear.
    const clumps = room === 'verge' ? 0 : 1 + (rand(x, z, 7) > .4 ? 1 : 0);
    for (let i = 0; i < clumps; i++) {
      const a = rand(x, z, 10 + i) * Math.PI * 2, r = 2.1 + rand(x, z, 20 + i) * 1.8;
      const bx = px + Math.sin(a) * r, bz = pz + Math.cos(a) * r;
      if (rootboundRouteClearance(bx, bz) < .55 || !clearOpening(bx, bz, .5)) continue;
      specs.push({ key: `${key}-bush-${i}`, x: bx, z: bz, assetId: i === 1 ? 'asset_rootbound_fern' : 'asset_rootbound_bush',
        scale: .55 + rand(x, z, 30 + i) * .6, yaw: a, kind: 'low', rootboundForest: true, room });
    }
  }
  // One exceptional silhouette above the summit. The path passes its root apron.
  specs.push({ key: 'heartroot-living-landmark', x: -470, z: 728, assetId: 'asset_rootbound_oak',
    scale: 2.55, yaw: .62, kind: 'low', rootboundForest: true, tree: true, landmark: true, room: 'crown' });
  // A sparse, asymmetric shelf frames the Thornstone switchback from its
  // approach.  The two near stones sit in the actual branch midground beyond
  // either shoulder of the lane, while the heavier far pair point at the
  // mineral pocket; this makes
  // the Verge a dry rock destination rather than Grove-style tree scatter.
  // Lower rubble links each mass without turning the switchback into a wall.
  for (const [i, [x, z, scale, yaw]] of [
    [-423, 693, 2.25, .18], [-412, 689, 1.75, -.35],
    [-407.8, 694.8, 2.6, .55], [-413.8, 706.8, 2.15, -.48], [-435.5, 699.5, 1.95, .72],
  ].entries()) {
    // Reuse the chunky Rootbound thornstone silhouette for the branch edge.
    specs.push({ key: `verge-shelf-frame-${i}`, x, z, assetId: 'asset_rootbound_block_thorn', scale, yaw,
      kind: 'low', rootboundForest: true, rock: true, room: 'verge' });
    specs.push({ key: `verge-shelf-rubble-${i}`, x: x + 1.4, z: z + 1.1,
      assetId: 'asset_rootbound_block_thorn', scale: scale * .75, yaw: yaw + .4,
      kind: 'low', rootboundForest: true, room: 'verge' });
  }
  // Two high, crossed deadwood silhouettes sit beyond Trailgloam's open
  // bowl.  They make the northeast feel sheltered without occupying its
  // creature apron, reward pocket, or through-route.
  for (const [i, [x, z, scale, yaw]] of [
    [-442, 688, 1.2, .82], [-434, 690, 1.2, -.58],
  ].entries()) specs.push({ key: `grove-fallen-timber-${i}`, x, z, assetId: 'asset_rootbound_fallen_log',
    scale, yaw, kind: 'low', rootboundForest: true, room: 'grove' });
  return Object.freeze(specs.map(Object.freeze));
}
export const ROOTBOUND_FOREST = buildForest();
const FOREST_BY_CHUNK = new Map();
for (const spec of ROOTBOUND_FOREST) {
  const id = `${Math.floor(spec.x / 50)},${Math.floor(spec.z / 50)}`;
  if (!FOREST_BY_CHUNK.has(id)) FOREST_BY_CHUNK.set(id, []);
  FOREST_BY_CHUNK.get(id).push(spec);
}
export const rootboundForestForChunk = (cx, cz) => FOREST_BY_CHUNK.get(`${cx},${cz}`) ?? [];
