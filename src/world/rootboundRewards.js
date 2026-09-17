// Authored, finite exploration rewards for Rootbound Wildwood.  This module is
// intentionally terrain-free: ecology and discovery project the anchors onto
// whichever supported default-world terrain is currently active.
const chunkFor = value => Math.floor(value / 50);

function anchor(key, index, x, z, type, assetId, uniformScale, yaw = 0) {
  return Object.freeze({
    key, index, x, z, type, assetId, uniformScale, yaw,
    cx: chunkFor(x), cz: chunkFor(z),
  });
}

export const ROOTBOUND_REWARD_POCKETS = Object.freeze([
  Object.freeze({ key: 'meadow-supplies', x: -481, z: 600, radius: 3.3 }),
  Object.freeze({ key: 'gallery-alcove', x: -484, z: 678, radius: 3.5 }),
  Object.freeze({ key: 'lantern-cache', x: -452, z: 680, radius: 3.3 }),
  Object.freeze({ key: 'verge-minerals', x: -419, z: 700, radius: 3.3 }),
  Object.freeze({ key: 'crown-cache', x: -475, z: 716, radius: 3.5 }),
]);

// 600+ is a dedicated finite-resource range.  Ordinary coordinate-seeded
// forage remains 0..31, so depletion IDs for either family never renumber.
export const ROOTBOUND_REWARD_RESOURCES = Object.freeze([
  anchor('meadow-berry-east', 600, -479.1, 600.7, 'fiber', 'asset_berry_bush', 1.05, .18),
  anchor('meadow-berry-west', 601, -482.6, 600.1, 'fiber', 'asset_berry_bush', .98, -.22),
  anchor('meadow-fiber', 602, -481.0, 597.9, 'fiber', null, 1.1, 0),
  anchor('gallery-sapwood', 603, -486.1, 678.4, 'tree', null, .76, .45),
  anchor('gallery-fiber', 604, -484.4, 675.2, 'fiber', null, 1.08, 0),
  anchor('verge-iron', 605, -420.6, 700.9, 'rock', 'asset_iron_ore_rock', 1, -.3),
  anchor('verge-crystal', 606, -417.2, 699.5, 'rock', 'asset_crystal', .82, .2),
]);

export const ROOTBOUND_REWARD_CHESTS = Object.freeze([
  Object.freeze({ key: 'lantern-cache', id: 'f1:d:-10:13:rootbound-lantern-cache', x: -452, z: 680, yaw: -.36, displayName: 'Lantern Root Cache' }),
  Object.freeze({ key: 'crown-cache', id: 'f1:d:-10:14:rootbound-crown-cache', x: -475, z: 716, yaw: .24, displayName: 'Crown Root Cache' }),
]);

export function rootboundResourcesForChunk(cx, cz) {
  return ROOTBOUND_REWARD_RESOURCES.filter(anchor => anchor.cx === cx && anchor.cz === cz);
}
