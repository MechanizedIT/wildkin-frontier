import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import * as THREE from 'three';
import { clearModelAssetCacheForTests, getModelTemplate, preloadVisualModels } from '../src/assets/modelAssetRuntime.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';

const canopy = {
  id: 'asset_verge_canopy',
  model: { path: 'assets/models/fixture-scenery-canopy/model.glb', scale: 1.1, pivot: { x: 0, y: 0, z: 0 } },
};

const triangle = (color, offset = 0) => ({
  shape: 'mesh', color,
  position: { x: offset, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
  geometry: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] },
});
const reed = { id: 'asset_fen_reed', parts: [triangle('#ff0000'), triangle('#00ff00', 1)] };
const stone = { id: 'asset_fen_stone', parts: [triangle('#446688')] };

function assertOutwardFaces(surface, center) {
  const vertex = (index) => new THREE.Vector3().fromArray(surface.vertices, index * 3);
  for (let index = 0; index < surface.indices.length; index += 3) {
    const a = vertex(surface.indices[index]), b = vertex(surface.indices[index + 1]), c = vertex(surface.indices[index + 2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const outward = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center);
    assert.ok(normal.dot(outward) > 0, `triangle ${index / 3} faces away from its prism center`);
  }
}

async function preloadFixture() {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#778866' })));
  await preloadVisualModels([canopy], { loader: { loadAsync: async () => ({ scene, animations: [] }) } });
}

afterEach(() => clearModelAssetCacheForTests());

test('scenery aligns external canopies and compact solid cores to world-space terrain surfaces', async () => {
  await preloadFixture();
  const scenery = createFrontierSceneryVisual({
    visualAssets: [canopy, reed, stone],
    specs: [
      { id: 'canopy-a', chunkId: '0,-2', assetId: canopy.id, x: 12, y: 4, z: -88, scale: .8, yaw: Math.PI / 2, kind: 'canopy' },
      { id: 'stone-a', chunkId: '0,-2', assetId: stone.id, x: 16, y: 3, z: -86, scale: 1, yaw: Math.PI / 2, kind: 'low' },
    ],
  });

  assert.equal(scenery.group.position.length(), 0, 'world-space specs need no parent origin');
  assert.equal(scenery.canopyRoots.length, 1);
  assert.deepEqual(scenery.stats, { canopyCount: 1, lowCount: 1, stoneSolidCount: 1, surfaceCount: 2, lowDrawCount: 1, lowTriangleCount: 1033, groundTuftCount: 7, groundTuftTriangleCount: 1032 });
  const trunk = scenery.terrainSurfaces.find(surface => surface.id === 'f2c:canopy-a:trunk');
  const solidStone = scenery.terrainSurfaces.find(surface => surface.id === 'f2c:stone-a:stone');
  assert.deepEqual(trunk.origin, { x: 0, z: 0 }); assert.equal(trunk.sectionId, 'camp');
  assert.deepEqual(solidStone.origin, { x: 0, z: 0 });
  const trunkYs = Array.from(trunk.vertices).filter((_, index) => index % 3 === 1);
  assert.equal(Math.min(...trunkYs), 4);
  assert.ok(Math.abs(Math.max(...trunkYs) - (4 + 2.45 * .8 * 1.1)) < 1e-5, 'trunk uses the same placement and model scale as the visual');
  const trunkXs = Array.from(trunk.vertices).filter((_, index) => index % 3 === 0);
  const trunkZs = Array.from(trunk.vertices).filter((_, index) => index % 3 === 2);
  assert.ok(Math.min(...trunkXs) < 12 && Math.max(...trunkXs) > 12);
  assert.ok(Math.min(...trunkZs) < -88 && Math.max(...trunkZs) > -88);
  assert.equal(solidStone.vertices.length / 3, 8, 'stone uses a compact prism, not a broad decoration hull');
  assertOutwardFaces(trunk, new THREE.Vector3(12, 4 + 2.45 * .8 * 1.1 / 2, -88));
  assertOutwardFaces(solidStone, new THREE.Vector3(16, 3 + 2.15 / 2, -86));
  scenery.dispose();
});

test('low scenery bakes authored part transforms and colors into one owned draw', () => {
  const scenery = createFrontierSceneryVisual({
    visualAssets: [reed],
    specs: [{ id: 'reed-a', chunkId: '0,-2', assetId: reed.id, x: 7, y: 2, z: -90, scale: 2, yaw: Math.PI / 2, kind: 'low' }],
  });
  const mesh = scenery.group.getObjectByName('frontier_scenery_low_props');
  assert.ok(mesh?.isMesh); assert.equal(mesh.material.vertexColors, true); assert.equal(scenery.stats.lowDrawCount, 1);
  assert.equal(mesh.geometry.index, null, 'low geometry normalizes indexed authored parts for the foliage batch');
  assert.ok(mesh.geometry.getAttribute('position').count / 3 > 2, 'the same draw includes the low detail tuft');
  const positions = mesh.geometry.getAttribute('position');
  assert.ok(Math.abs(positions.getX(0) - 7) < 1e-6 && Math.abs(positions.getZ(0) + 90) < 1e-6, 'placement transform is baked into the merged mesh');
  const colors = mesh.geometry.getAttribute('color');
  assert.deepEqual([colors.getX(0), colors.getY(0), colors.getZ(0)], [1, 0, 0]);
  assert.deepEqual([colors.getX(3), colors.getY(3), colors.getZ(3)], [0, 1, 0]);
  let geometryDisposed = false, materialDisposed = false;
  mesh.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  mesh.material.addEventListener('dispose', () => { materialDisposed = true; });
  scenery.dispose(); scenery.dispose();
  assert.equal(geometryDisposed, true); assert.equal(materialDisposed, true);
});

test('staged canopy tufts are bounded and use the injected terrain height', async () => {
  await preloadFixture();
  const scenery = createFrontierSceneryVisual({
    visualAssets: [canopy], getHeight: () => 17,
    specs: [{ id: '0,-2:stage-canopy', chunkId: '0,-2', assetId: canopy.id, x: 4, y: 2, z: -88, scale: 1, yaw: 0, kind: 'canopy' }],
  });
  assert.equal(scenery.stats.groundTuftCount, 4);
  const tuftMesh = scenery.group.getObjectByName('frontier_scenery_low_props');
  const ys = Array.from(tuftMesh.geometry.getAttribute('position').array).filter((_, index) => index % 3 === 1);
  assert.ok(Math.min(...ys) > 16.9 && Math.max(...ys) < 17.7, 'tufts sit on the authoritative terrain sample rather than the spec fallback');
  scenery.dispose();
});

test('dense foliage remains one merged draw and caps at 72 deterministic tufts', () => {
  const specs = Array.from({ length: 28 }, (_, index) => ({
    id: `wet-${index}`, chunkId: '0,-2', assetId: reed.id,
    x: index, y: 3, z: -90, scale: 1, yaw: 0, kind: 'low',
  }));
  const scenery = createFrontierSceneryVisual({ visualAssets: [reed], specs });
  assert.equal(scenery.stats.lowCount, 28);
  assert.equal(scenery.stats.groundTuftCount, 72);
  assert.equal(scenery.stats.lowDrawCount, 1);
  assert.ok(scenery.stats.groundTuftTriangleCount > 0);
  scenery.dispose();
});


test('disposal releases owned low resources without destroying the shared canopy template', async () => {
  await preloadFixture();
  const scenery = createFrontierSceneryVisual({ visualAssets: [canopy], specs: [
    { id: 'canopy-a', chunkId: '0,-2', assetId: canopy.id, x: 0, y: 0, z: 0, scale: 1, yaw: 0, kind: 'canopy' },
  ] });
  const templateMesh = getModelTemplate(canopy.model.path).scene.children[0];
  let geometryDisposed = false, materialDisposed = false;
  templateMesh.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  templateMesh.material.addEventListener('dispose', () => { materialDisposed = true; });
  scenery.dispose(); scenery.dispose();
  assert.equal(scenery.group.children.length, 0);
  assert.equal(geometryDisposed, false); assert.equal(materialDisposed, false);
});
