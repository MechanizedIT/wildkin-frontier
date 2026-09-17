import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../../../../../src/physics/createPhysicsWorld.js';
import { createFrontierChunk, sampleFrontier, sampleFrontierHeight } from '../../../../../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../../../../../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../../../../../src/world/frontierWildlife.js';
import { hasFootprintSupport } from '../../../../../src/world/frontierPlacement.js';
import { sampleFrontierSceneryChunk } from '../../../../../src/world/frontierScenery.js';
import { computeVisualAssetBounds } from '../../../../../src/world/visualFactory.js';
import { WORLD_DATA } from '../../../../../src/world/data/world.generated.js';

await RAPIER.init();
const chunkIds = ['-10,13', '-9,13'];
const chunks = chunkIds.map(id => {
  const [cx, cz] = id.split(',').map(Number);
  return createFrontierChunk(cx, cz);
});
const physics = createPhysicsWorld(RAPIER, { terrainSurfaces: [], groundPatches: [], obstacles: [], platforms: [], boundaries: [] });
physics.setActiveSection('camp');
const add = chunks.map(chunk => ({ ...chunk, sectionId: 'camp' }));
const addResult = physics.updateTerrainSurfaces({ add });
const finalHeight = (x, z) => sampleFrontierHeight(x, z);
const ray = (x, z) => {
  const hit = physics.world.castRay(new RAPIER.Ray({ x, y: 40, z }, { x: 0, y: -1, z: 0 }), 80, true);
  const collider = hit ? physics.world.getCollider(hit.colliderHandle) : null;
  const expectedSurfaceId = x < -450 ? '-10,13' : '-9,13';
  const y = hit ? 40 - hit.timeOfImpact : null;
  return { x, z, expectedSurfaceId, hit: Boolean(hit), reportedSurfaceId: collider ? physics.getColliderSurfaceId(collider) : null,
    y, sampleHeight: finalHeight(x, z), matchesSharedTerrain: y !== null && Math.abs(y - finalHeight(x, z)) < 1e-4 };
};
const contactsBefore = [ray(-452, 672), ray(-448, 674), ray(-442, 682)];
const removeResult = physics.updateTerrainSurfaces({ remove: chunkIds });
const contactsAfterUnload = [ray(-452, 672), ray(-448, 674), ray(-442, 682)];
const reentryResult = physics.updateTerrainSurfaces({ add });
const contactsAfterReentry = [ray(-452, 672), ray(-448, 674), ray(-442, 682)];

const preR3Height = (x, z) => finalHeight(x, z) - (sampleFrontier(x, z).rootboundFacetDelta ?? 0);
const support = (x, z, radius, maxSlope) => ({
  final: hasFootprintSupport(x, z, { getHeight: finalHeight, radius, maxSlope }),
  preR3: hasFootprintSupport(x, z, { getHeight: preR3Height, radius, maxSlope }),
});
const curated = [];
for (const [cx, cz] of [[-10,13],[-9,13]]) {
  for (const spec of sampleFrontierSceneryChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets })) {
    if (!spec.id.startsWith('f1:s:rootbound-wildwood:')) continue;
    const asset = WORLD_DATA.visualAssets.find(item => item.id === spec.assetId);
    const bounds = computeVisualAssetBounds(asset);
    const radius = Math.hypot(bounds.size.w, bounds.size.d) * .5 * spec.scale;
    curated.push({ id: spec.id, assetId: spec.assetId, x: spec.x, z: spec.z, yaw: spec.yaw, scale: spec.scale,
      fullHullRadiusM: radius, support: support(spec.x, spec.z, radius, .42) });
  }
}
const resources = [], homes = [];
for (const [cx, cz] of [[-10,13],[-9,13]]) {
  for (const item of sampleFrontierForageChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets })) {
    if (item.pos.x >= -458 && item.pos.x <= -436 && item.pos.z >= 666 && item.pos.z <= 688) {
      resources.push({ id: item.id, x: item.pos.x, z: item.pos.z, support: support(item.pos.x, item.pos.z, .55, .42) });
    }
  }
  for (const item of sampleFrontierWildlifeChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets })) {
    if (item.homePos.x >= -468 && item.homePos.x <= -426 && item.homePos.z >= 656 && item.homePos.z <= 698) {
      const radius = Math.max(item.roamRadius ?? 0, item.leashRadius ?? 0, item.fleeLeashRadius ?? 0, .32);
      homes.push({ id: item.id, x: item.homePos.x, z: item.homePos.z, radius, support: support(item.homePos.x, item.homePos.z, radius, .32) });
    }
  }
}
const result = {
  schema: 'rootbound-terrain-facets-r3-integration-support-v1',
  scope: { chunkIds, field: [-458, -436, 666, 688], note: 'final uses current shared field; preR3 subtracts only rootboundFacetDelta from the same profile. Full-hull support uses the conservative circumscribed radius of each transformed visual bound.' },
  rapier: { addResult, contactsBefore, removeResult, contactsAfterUnload, reentryResult, contactsAfterReentry },
  curated, resources, homes,
  allScopedSupportParity: [...curated, ...resources, ...homes].every(item => item.support.final === item.support.preR3),
  rapierReentryMatchesFinalSurface: [...contactsBefore, ...contactsAfterReentry].every(item => item.matchesSharedTerrain),
};
console.log(JSON.stringify(result, null, 2));
physics.world.free();
