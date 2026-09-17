import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import * as THREE from 'three';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { clearModelAssetCacheForTests, getModelTemplate, preloadVisualModels } from '../src/assets/modelAssetRuntime.js';
import { createFrontierLandformVisual } from '../src/world/frontierLandformVisual.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';

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

describe('frontier Skybreak embedded rock face', () => {
  it('aligns every hull vertex with the fixed visual and uses the reviewed support probe', async () => {
    await preloadFixture();
    const probes = [];
    const face = createFrontierLandformVisual({ cx: 0, cz: -5, visualAssets: [asset], getHeight: (x, z) => { probes.push([x, z]); return 32.9185; } });
    assert.deepEqual(probes, [[19.3369, -224.99]]);
    assert.equal(face.debugCount, 1);
    assert.deepEqual(face.terrainSurfaces.map(s => s.id), ['0,-5:skybreak:rock:0']);
    const chunk = new THREE.Group(); chunk.position.z = -250; chunk.add(face.group); chunk.updateMatrixWorld(true);
    const visual = face.group.children[0], hull = face.terrainSurfaces[0];
    assert.equal(visual.name, 'skybreak_rock_0');
    assert.deepEqual(visual.getWorldPosition(new THREE.Vector3()).toArray(), [20, 32.9185, -226]);
    for (let i = 0; i < asset.collision.vertices.length / 3; i++) {
      const v = new THREE.Vector3(...asset.collision.vertices.slice(i * 3, i * 3 + 3)).applyMatrix4(visual.matrixWorld);
      assert.ok(v.distanceTo(worldHullPoint(hull, i)) < 1e-5);
    }
    face.dispose(); face.dispose(); assert.equal(face.group.children.length, 0);
    const otherWorld = { edition: 1, seed: DEFAULT_FRONTIER_WORLD.seed + 1 };
    assert.equal(createFrontierLandformVisual({ cx: 0, cz: -5, visualAssets: [asset], world: otherWorld }).debugCount, 0);
    assert.equal(createFrontierLandformVisual({ cx: 0, cz: -5, visualAssets: [] }).debugCount, 0);
  });

  it('retires and restores the one stable rock hull with its resident and excludes alternate worlds', async () => {
    await preloadFixture(); const batches = [];
    const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), visualAssets: [asset], physicsWorld: { updateTerrainSurfaces: b => batches.push(b) } });
    const id = '0,-5:skybreak:rock:0';
    runtime.update({ x: 12, z: -228 }, { activeSectionId: 'camp' });
    assert.equal(batches.flatMap(b => b.add).filter(s => s.id === id).length, 1);
    runtime.update({ x: 500, z: 500 }, { activeSectionId: 'camp' });
    assert.ok(batches.at(-1).remove.includes(id));
    runtime.update({ x: 12, z: -228 }, { activeSectionId: 'camp' });
    assert.equal(batches.at(-1).add.filter(s => s.id === id).length, 1);
    runtime.dispose(); assert.ok(batches.at(-1).remove.includes(id));
    const alternateBatches = [];
    const alternate = createFrontierChunkRuntime({ parent: new THREE.Group(), visualAssets: [asset], world: { edition: 1, seed: DEFAULT_FRONTIER_WORLD.seed + 1 }, physicsWorld: { updateTerrainSurfaces: b => alternateBatches.push(b) } });
    alternate.update({ x: 12, z: -228 }, { activeSectionId: 'camp' });
    assert.equal(alternateBatches.flatMap(b => b.add).filter(s => s.id === id).length, 0); alternate.dispose();
  });
});

describe('frontier Ironspine arrival buttresses', () => {
  it('samples the two reviewed full-hull support probes and aligns every visual and hull vertex', async () => {
    await preloadFixture();
    const supportHeights = new Map([
      ['-2078.4716075,-3160.01414625', 8.806664757098867],
      ['-2077.95701125,-3156.54561', 9.1186604452407],
    ]);
    const probes = [];
    const landform = createFrontierLandformVisual({
      cx: -42, cz: -64, visualAssets: [asset],
      getHeight: (x, z) => { probes.push([x, z]); return supportHeights.get(`${x},${z}`) ?? 0; },
    });
    assert.deepEqual(probes, [[-2078.4716075, -3160.01414625], [-2077.95701125, -3156.54561]]);
    assert.equal(landform.debugCount, 2);
    assert.deepEqual(landform.group.children.map(visual => visual.name), ['ironspine_rock_0', 'ironspine_rock_1']);
    assert.deepEqual(landform.terrainSurfaces.map(surface => surface.id), [
      '-42,-64:ironspine:rock:0', '-42,-64:ironspine:rock:1',
    ]);

    const chunk = new THREE.Group(); chunk.position.set(-2100, 0, -3200); chunk.add(landform.group); chunk.updateMatrixWorld(true);
    const expectedPositions = [[-2078, 8.806664757098867, -3159], [-2077, 9.1186604452407, -3156]];
    for (let rock = 0; rock < 2; rock++) {
      const visual = landform.group.children[rock];
      const surface = landform.terrainSurfaces[rock];
      assert.deepEqual(visual.getWorldPosition(new THREE.Vector3()).toArray(), expectedPositions[rock]);
      assert.deepEqual(surface.origin, { x: -2100, z: -3200 });
      for (let point = 0; point < asset.collision.vertices.length / 3; point++) {
        const visualPoint = new THREE.Vector3(...asset.collision.vertices.slice(point * 3, point * 3 + 3)).applyMatrix4(visual.matrixWorld);
        assert.ok(visualPoint.distanceTo(worldHullPoint(surface, point)) < 1e-5, `rock ${rock}, hull vertex ${point} aligns`);
      }
    }
    landform.dispose(); landform.dispose(); assert.equal(landform.group.children.length, 0);
  });

  it('is default-world-only and restores its two stable hulls after resident unload/re-entry', async () => {
    await preloadFixture();
    const idPrefix = '-42,-64:ironspine:rock:';
    assert.equal(createFrontierLandformVisual({ cx: -42, cz: -64, visualAssets: [asset], world: { edition: 1, seed: DEFAULT_FRONTIER_WORLD.seed + 1 } }).debugCount, 0);
    assert.equal(createFrontierLandformVisual({ cx: -41, cz: -64, visualAssets: [asset] }).debugCount, 0);

    const batches = [];
    const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), visualAssets: [asset], physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) } });
    runtime.update({ x: -2078, z: -3159 }, { activeSectionId: 'camp' });
    assert.deepEqual(batches.flatMap(batch => batch.add).filter(surface => surface.id.startsWith(idPrefix)).map(surface => surface.id), [
      '-42,-64:ironspine:rock:0', '-42,-64:ironspine:rock:1',
    ]);
    runtime.update({ x: 500, z: 500 }, { activeSectionId: 'camp' });
    assert.deepEqual(batches.at(-1).remove.filter(id => id.startsWith(idPrefix)), ['-42,-64:ironspine:rock:0', '-42,-64:ironspine:rock:1']);
    runtime.update({ x: -2078, z: -3159 }, { activeSectionId: 'camp' });
    assert.deepEqual(batches.at(-1).add.filter(surface => surface.id.startsWith(idPrefix)).map(surface => surface.id), [
      '-42,-64:ironspine:rock:0', '-42,-64:ironspine:rock:1',
    ]);
    runtime.dispose();
    assert.deepEqual(batches.at(-1).remove.filter(id => id.startsWith(idPrefix)), ['-42,-64:ironspine:rock:0', '-42,-64:ironspine:rock:1']);

    const alternateBatches = [];
    const alternate = createFrontierChunkRuntime({
      parent: new THREE.Group(), visualAssets: [asset],
      world: { edition: 1, seed: DEFAULT_FRONTIER_WORLD.seed + 1 },
      physicsWorld: { updateTerrainSurfaces: batch => alternateBatches.push(batch) },
    });
    alternate.update({ x: -2078, z: -3159 }, { activeSectionId: 'camp' });
    assert.equal(alternateBatches.flatMap(batch => batch.add).filter(surface => surface.id.startsWith(idPrefix)).length, 0);
    alternate.dispose();
  });
});
