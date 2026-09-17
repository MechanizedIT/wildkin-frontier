import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';
import { initializePlayerOcclusion } from '../src/presentation/playerOcclusion.js';
import { sampleFrontierSceneryChunk } from '../src/world/frontierScenery.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';

await RAPIER.init();

test('large legacy Crown forms and new trees share the player-visibility lifecycle', () => {
  const specs = [
    { id: 'f1:s:rootbound-wildwood:heartroot-core', assetId: 'asset_rootbound_heartroot_core_placeholder', x: 0, y: 0, z: 0, scale: 1.6, kind: 'low' },
    { id: 'f1:s:rootbound-wildwood:tree', assetId: 'asset_rootbound_oak', x: 8, y: 0, z: 0, scale: 1, kind: 'low', rootboundTree: true, rootboundForest: true },
    { id: 'f1:s:rootbound-wildwood:fern', assetId: 'asset_rootbound_fern', x: 12, y: 0, z: 0, scale: .5, kind: 'low', rootboundForest: true },
  ];
  const visual = createFrontierSceneryVisual({ specs, visualAssets: WORLD_DATA.visualAssets, canPlaceGroundCover: () => false });
  const assets = visual.occlusionRoots.map(mesh => mesh.userData.frontierScenery.assetId);
  assert.ok(assets.includes('asset_rootbound_heartroot_core_placeholder'), 'legacy summit assembly joins the same visibility owner');
  assert.ok(assets.includes('asset_rootbound_oak'), 'physical forest tree retains visibility handling');
  assert.equal(assets.includes('asset_rootbound_fern'), false, 'ankle-height dressing does not add visibility candidates');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); scene.add(visual.group);
  const visibility = initializePlayerOcclusion({ scene, camera, getPlayerPosition: () => ({ x: 0, y: .5, z: 0 }) });
  const original = visual.occlusionRoots.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material }));
  for (const mesh of visual.occlusionRoots) visibility.register(mesh);
  assert.ok(visual.occlusionRoots.every(mesh => mesh.geometry.getAttribute('playerVisibility')));
  for (const mesh of visual.occlusionRoots) visibility.unregister(mesh);
  assert.ok(original.every(entry => entry.mesh.geometry === entry.geometry && entry.mesh.material === entry.material), 'stream retirement restores shared rendering resources');
  visibility.dispose(); visual.dispose();
});

test('authored Verge stones have actual Rapier cores while adjacent rubble stays decorative', () => {
  const admitted = sampleFrontierSceneryChunk(-9, 13, { visualAssets: WORLD_DATA.visualAssets });
  const stone = admitted.find(spec => spec.id.endsWith(':verge-shelf-frame-0'));
  const rubble = admitted.find(spec => spec.id.endsWith(':verge-shelf-rubble-0'));
  assert.ok(stone?.rootboundRock, 'the actual admitted frame retains its physical role');
  const visual = createFrontierSceneryVisual({ specs: [stone, ...(rubble ? [rubble] : [])], visualAssets: WORLD_DATA.visualAssets, canPlaceGroundCover: () => false });
  assert.equal(visual.terrainSurfaces.length, 1, 'only the major stone publishes a collider');
  const physics = createPhysicsWorld(RAPIER, { terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [] });
  physics.updateTerrainSurfaces({ add: visual.terrainSurfaces });
  physics.world.step();
  const hit = physics.world.castRay(new RAPIER.Ray({ x: stone.x - 6, y: stone.y + .8, z: stone.z }, { x: 1, y: 0, z: 0 }), 12, true);
  assert.ok(hit?.collider, 'a physical query hits the visible stone body');
  assert.equal(physics.getColliderSurfaceId(hit.collider), `f2c:${stone.id}:stone`);
  assert.equal(physics.isTerrainColliderActive(hit.collider), false, 'a stone cannot become slide terrain');
  physics.updateTerrainSurfaces({ remove: visual.terrainSurfaces.map(surface => surface.id) });
  physics.world.step();
  const retired = physics.world.castRay(new RAPIER.Ray({ x: stone.x - 6, y: stone.y + .8, z: stone.z }, { x: 1, y: 0, z: 0 }), 12, true);
  assert.equal(retired, null, 'stream retirement removes the same physical core');
  physics.world.free(); visual.dispose();
});
