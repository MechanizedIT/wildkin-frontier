import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Small supply nook on the existing Forest Edge -> Lookout return loop.
// Keep harvest IDs (and their persistence) intact; the berry bush is the sole
// new instance. Navigation/activation guidance belongs to the UI owner.
export const STARTER_RESOURCE_MOVES = Object.freeze([
  Object.freeze({ id: 'tree_section_1_arrival_l', type: 'tree', x: -8.5, z: 24 }),
  Object.freeze({ id: 'rock_section_1_shelf_a', type: 'rock', x: -12, z: 21.5 }),
]);
export const STARTER_BERRY_ID = 'prop_s1_starter_berries';

export function composeStarterRoute(world) {
  const region = world.regions.find(entry => entry.id === 'section_1');
  if (!region?.surface) throw new Error('Starter route requires section_1 terrain');
  const berryAsset = world.visualAssets.find(entry => entry.id === 'asset_berry_bush');
  if (berryAsset?.gameplay?.role !== 'harvestable' || berryAsset.gameplay.harvestable?.dropId !== 'berries') {
    throw new Error('Starter route requires the existing renewable berry asset');
  }
  const moves = STARTER_RESOURCE_MOVES.map(move => {
    const matches = region.resources.filter(entry => entry.id === move.id && entry.type === move.type);
    if (matches.length !== 1) throw new Error(`Starter route requires exactly one ${move.id}`);
    return { entry: matches[0], move };
  });
  const berries = region.props.filter(entry => entry.id === STARTER_BERRY_ID);
  if (berries.length > 1 || (berries[0] && berries[0].visualAssetId !== berryAsset.id)) {
    throw new Error('Starter berry ID is duplicated or belongs to another asset');
  }
  const pos = (x, z) => ({ x, y: getSurfaceHeight(region.surface, x, z), z });
  for (const { entry, move } of moves) entry.pos = pos(move.x, move.z);
  const berry = berries[0] ?? {
    id: STARTER_BERRY_ID, subtype: 'visualAsset', visualAssetId: berryAsset.id,
    rotY: .35, uniformScale: 1, visibleInPlay: true, collisionEnabled: false, opacity: 1,
  };
  berry.pos = pos(-12, 25);
  if (!berries.length) region.props.push(berry);
  return world;
}
