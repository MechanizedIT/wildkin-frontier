import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import * as THREE from 'three';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { clearModelAssetCacheForTests, getModelTemplate, preloadVisualModels } from '../src/assets/modelAssetRuntime.js';
import { createFrontierLandformVisual } from '../src/world/frontierLandformVisual.js';

const asset = {
  id: 'asset_verdant_cliff_buttress',
  model: { path: 'assets/models/fixture-terrace-buttress/model.glb', scale: 1, pivot: { x: 0, y: 0, z: 0 } },
  collision: {
    shape: 'convexHull', offset: { x: 0, y: 0, z: 0 },
    vertices: [-1, 0, -1, 1, 0, -1, 1, 3.95, 1, -1, 3.95, 1],
    indices: [0, 2, 1, 0, 3, 2, 0, 1, 3, 1, 2, 3],
  },
};

async function preloadFixture() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x778866 });
  scene.add(new THREE.Mesh(geometry, material));
  await preloadVisualModels([asset], { loader: { loadAsync: async () => ({ scene, animations: [] }) } });
}

function worldHullPoint(surface, pointIndex) {
  const i = pointIndex * 3;
  return new THREE.Vector3(surface.vertices[i] + surface.origin.x, surface.vertices[i + 1], surface.vertices[i + 2] + surface.origin.z);
}

afterEach(() => clearModelAssetCacheForTests());

describe('frontier terrace landform visual', () => {
  it('keeps the visual and chunk-local convex hull transforms aligned, clear, and disposable', async () => {
    await preloadFixture();
    const landform = createFrontierLandformVisual({ cx: 0, cz: -3, visualAssets: [asset], getHeight: (x, z) => 8 + x * .01 + z * .001 });
    const chunk = new THREE.Group(); chunk.position.set(0, 0, -150); chunk.add(landform.group); chunk.updateMatrixWorld(true);

    assert.equal(landform.group.position.length(), 0, 'returned visual stays chunk-local');
    assert.equal(landform.debugCount, 6); assert.equal(landform.group.children.length, 6); assert.equal(landform.terrainSurfaces.length, 6);
    assert.deepEqual(landform.terrainSurfaces.map(surface => surface.id), Array.from({ length: 6 }, (_, index) => `0,-3:terrace:rock:${index}`));
    for (const surface of landform.terrainSurfaces) {
      assert.deepEqual(surface.origin, { x: 0, z: -150 }); assert.equal(surface.sectionId, 'camp');
    }

    // Point zero proves both the south-facing yaw and the east-facing +90° yaw
    // use exactly the same transform for the external visual and Rapier hull.
    for (const index of [0, 4]) {
      const visualPoint = new THREE.Vector3(-1, 0, -1).applyMatrix4(landform.group.children[index].matrixWorld);
      assert.ok(visualPoint.distanceTo(worldHullPoint(landform.terrainSurfaces[index], 0)) < 1e-5, `rock ${index} visual/hull transform matches`);
    }

    const worldX = landform.terrainSurfaces.flatMap(surface => Array.from({ length: surface.vertices.length / 3 }, (_, point) => worldHullPoint(surface, point).x));
    assert.ok(worldX.every(x => x > 26), 'the deliberate x22..26 ramp remains clear of every hull point');
    assert.ok(worldX.every(x => x < 30.5 || x > 33.5), 'the centered 3m fall gap remains clear of every hull point');

    const templateMesh = getModelTemplate(asset.model.path).scene.children[0];
    let geometryDisposed = false, materialDisposed = false;
    templateMesh.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
    templateMesh.material.addEventListener('dispose', () => { materialDisposed = true; });
    landform.dispose(); landform.dispose();
    assert.equal(landform.group.children.length, 0); assert.equal(geometryDisposed, false); assert.equal(materialDisposed, false);

    const batches = [];
    const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), visualAssets: [asset],
      physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) } });
    runtime.update({ x: 32, z: -113 }, { activeSectionId: 'camp' });
    const rockIds = batches[0].add.filter(surface => surface.id.includes(':terrace:rock:')).map(surface => surface.id);
    assert.equal(rockIds.length, 6, 'the streamed resident registers its six matching rock surfaces');
    runtime.update({ x: 500, z: 500 }, { activeSectionId: 'camp' });
    assert.ok(rockIds.every(id => batches[1].remove.includes(id)), 'moving away retires all rock surfaces in the same terrain batch');
    assert.equal(runtime.root.getObjectByName('frontier_landform_0,-3'), undefined);
    runtime.dispose();
  });
});
