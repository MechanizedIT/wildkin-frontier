import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
import { writeGeneratedFile } from './write-generated-file.mjs';

export const HEARTWOOD_OPENING_PREFIX = 'prop_camp_heartwood_';

const record = (id, visualAssetId, x, z, rotY, uniformScale, collisionEnabled) => Object.freeze({
  id: `${HEARTWOOD_OPENING_PREFIX}${id}`,
  subtype: 'visualAsset',
  visualAssetId,
  pos: Object.freeze({ x, z }),
  rotY,
  uniformScale,
  visibleInPlay: true,
  collisionEnabled,
  opacity: 1,
});

export const HEARTWOOD_OPENING_PROPS = Object.freeze([
  record('tree_a', 'asset_verge_canopy', -3.6, -38, .22, 1.05, true),
  record('tree_b', 'asset_verge_canopy_tall', 3.8, -41, -.31, .95, true),
  record('tree_c', 'asset_verge_canopy_tall', -4.8, -45, .16, .9, true),
  record('tree_d', 'asset_verge_canopy_spread', 5.5, -47, -.24, .9, true),
  record('reed_a', 'asset_fen_reed', -2.3, -36.5, .2, .9, false),
  record('lily_a', 'asset_fen_lily', -4.5, -40.5, -.4, .85, false),
  record('cloud_a', 'asset_cloudflower', -2.4, -41.5, .1, .9, false),
  record('pebbles_a', 'asset_pebble_cluster', -5, -36.5, .5, 1, false),
  record('reed_b', 'asset_fen_reed', 2.5, -38.2, -.3, 1, false),
  record('reed_c', 'asset_fen_reed', 4.5, -43.5, .6, .85, false),
  record('lily_b', 'asset_fen_lily', 2.3, -44.8, .2, .8, false),
  record('cloud_b', 'asset_cloudflower', 4.4, -38, -.2, .9, false),
  record('reed_d', 'asset_fen_reed', -2.5, -46.5, -.5, .9, false),
  record('mushroom_a', 'asset_mushroom_ring', -4.4, -48, .3, .8, false),
  record('lily_c', 'asset_fen_lily', -2.4, -48.5, .7, .85, false),
  record('pebbles_b', 'asset_pebble_cluster', -4.2, -42.8, -.2, 1, false),
  record('reed_e', 'asset_fen_reed', 4, -45.5, .4, .9, false),
  record('mushroom_b', 'asset_mushroom_ring', 4.2, -48.8, -.6, .75, false),
  record('cloud_c', 'asset_cloudflower', 2.5, -43, .25, .85, false),
  record('reed_f', 'asset_fen_reed', 2.5, -48.5, -.1, .8, false),
]);

export function composeHeartwoodOpening(world) {
  const camp = world?.regions?.find(region => region.id === 'camp');
  if (!camp?.surface || !Array.isArray(camp.props)) return world;
  camp.props = camp.props.filter(prop => !prop.id?.startsWith(HEARTWOOD_OPENING_PREFIX));
  for (const source of HEARTWOOD_OPENING_PROPS) {
    const { x, z } = source.pos;
    camp.props.push({
      ...source,
      pos: { x, y: Number(getSurfaceHeight(camp.surface, x, z).toFixed(4)), z },
    });
  }
  return world;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = new URL('../src/world/data/world.json', import.meta.url);
  const world = JSON.parse(fs.readFileSync(target, 'utf8'));
  composeHeartwoodOpening(world);
  writeGeneratedFile(target, `${JSON.stringify(world)}\n`);
  console.log('Composed the Heartwood opening clearing.');
}
