import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import * as THREE from 'three';
import { clearModelAssetCacheForTests, getModelTemplate, preloadVisualModels } from '../src/assets/modelAssetRuntime.js';
import { createFrontierGroundPatchCache, createFrontierSceneryVisual, createFrontierSceneryVisualJob,
  FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE } from '../src/world/frontierSceneryVisual.js';

const canopy = {
  id: 'asset_verge_canopy',
  model: { path: 'assets/models/fixture-scenery-canopy/model.glb', scale: 1.1, pivot: { x: 0, y: 0, z: 0 } },
};

test('regional groundcover reduces density and warms tint within the same visual and collider owners', () => {
  const spec = { id: 'regional-patch', assetId: 'asset_fen_reed', x: -640, y: 33, z: -335, scale: 1, yaw: 0, kind: 'low' };
  const lush = createFrontierSceneryVisual({ specs: [spec], visualAssets: [reed], getHeight: () => 33 });
  const dry = createFrontierSceneryVisual({ specs: [{ ...spec, groundCover: { density: .2, influence: 1, dryWeight: 1, highWeight: 0 } }], visualAssets: [reed], getHeight: () => 33 });
  assert.ok(dry.stats.groundClusterCount > 0 && dry.stats.groundClusterCount < lush.stats.groundClusterCount);
  assert.equal(dry.stats.groundDrawCount, 1);
  assert.deepEqual(dry.terrainSurfaces, lush.terrainSurfaces);
  const a = lush.group.getObjectByName('frontier_scenery_ground_cover').instanceColor;
  const b = dry.group.getObjectByName('frontier_scenery_ground_cover').instanceColor;
  assert.ok(b.getX(0) / b.getY(0) > a.getX(0) / a.getY(0), 'dry expression raises straw red relative to green');
  lush.dispose(); dry.dispose();
});

const triangle = (color, offset = 0) => ({
  shape: 'mesh', color,
  position: { x: offset, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
  geometry: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] },
});
const reed = { id: 'asset_fen_reed', parts: [triangle('#ff0000'), triangle('#00ff00', 1)] };
const stone = { id: 'asset_fen_stone', parts: [triangle('#446688')] };
const cloudflower = { id: 'asset_cloudflower', parts: [triangle('#ead7a8')] };
const trailStones = { id: 'asset_trail_stones', parts: [triangle('#8a7662')] };

function legacyLowAttributes(assets, specs) {
  const values = { position: [], normal: [], color: [] };
  for (const spec of specs) {
    const asset = assets.find(candidate => candidate.id === spec.assetId);
    const placement = new THREE.Matrix4().compose(
      new THREE.Vector3(spec.x, spec.y, spec.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spec.yaw, 0, 'XYZ')),
      new THREE.Vector3(spec.scale, spec.scale, spec.scale),
    );
    for (const part of asset.parts) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.geometry.positions, 3));
      geometry.setIndex(part.geometry.indices);
      geometry.computeVertexNormals();
      const normalized = geometry.toNonIndexed();
      geometry.dispose();
      const partTransform = new THREE.Matrix4().compose(
        new THREE.Vector3(part.position.x, part.position.y, part.position.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(part.rotation.x, part.rotation.y, part.rotation.z, 'XYZ')),
        new THREE.Vector3(part.scale.x, part.scale.y, part.scale.z),
      );
      normalized.applyMatrix4(placement.clone().multiply(partTransform));
      values.position.push(...normalized.getAttribute('position').array);
      values.normal.push(...normalized.getAttribute('normal').array);
      const color = new THREE.Color(part.color);
      for (let index = 0; index < normalized.getAttribute('position').count; index++) values.color.push(color.r, color.g, color.b);
      normalized.dispose();
    }
  }
  return Object.fromEntries(Object.entries(values).map(([name, entries]) => [name, Array.from(new Float32Array(entries))]));
}

function instancedLowAttributes(scenery, specs) {
  const byId = new Map();
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const position = new THREE.Vector3(), normal = new THREE.Vector3();
  for (const mesh of scenery.group.children.filter(child => child.isInstancedMesh && child.name === 'frontier_scenery_low_props')) {
    const positions = mesh.geometry.getAttribute('position');
    const normals = mesh.geometry.getAttribute('normal');
    const colors = mesh.geometry.getAttribute('color');
    for (let instance = 0; instance < mesh.count; instance++) {
      mesh.getMatrixAt(instance, matrix); normalMatrix.getNormalMatrix(matrix);
      const values = { position: [], normal: [], color: Array.from(colors.array) };
      for (let index = 0; index < positions.count; index++) {
        position.fromBufferAttribute(positions, index).applyMatrix4(matrix);
        normal.fromBufferAttribute(normals, index).applyNormalMatrix(normalMatrix);
        values.position.push(position.x, position.y, position.z);
        values.normal.push(normal.x, normal.y, normal.z);
      }
      byId.set(mesh.userData.frontierScenery.specIds[instance], values);
    }
  }
  return Object.fromEntries(['position', 'normal', 'color'].map(name => [name, specs.flatMap(spec => byId.get(spec.id)[name])]));
}

function groundAttributes(scenery) {
  const mesh = scenery.group.getObjectByName('frontier_scenery_ground_cover');
  if (!mesh) return { matrices: [], colors: [] };
  return {
    matrices: Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)),
    colors: Array.from(mesh.instanceColor.array.slice(0, mesh.count * 3)),
  };
}

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
  assert.deepEqual(scenery.stats, { canopyCount: 1, lowCount: 1, stoneSolidCount: 1, surfaceCount: 2,
    lowDrawCount: 1, lowTriangleCount: 1, lowGeometryCount: 1, lowGeometryVertexCount: 3, lowInstanceCount: 1,
    groundDrawCount: 1, groundClusterCount: 26, groundClusterTriangleCount: 416 });
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

test('low scenery keeps authored parts in one owned draw beside instanced ground cover', () => {
  const scenery = createFrontierSceneryVisual({
    visualAssets: [reed],
    specs: [{ id: 'reed-a', chunkId: '0,-2', assetId: reed.id, x: 7, y: 2, z: -90, scale: 2, yaw: Math.PI / 2, kind: 'low' }],
  });
  const mesh = scenery.group.getObjectByName('frontier_scenery_low_props');
  assert.ok(mesh?.isInstancedMesh); assert.equal(mesh.material.vertexColors, true); assert.equal(scenery.stats.lowDrawCount, 1);
  assert.equal(mesh.geometry.index, null, 'low geometry normalizes indexed authored parts for the foliage batch');
  assert.equal(mesh.geometry.getAttribute('position').count / 3, 2, 'ground cover stays outside the authored low-prop draw');
  const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
  const placed = new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), 0).applyMatrix4(matrix);
  assert.ok(Math.abs(placed.x - 7) < 1e-6 && Math.abs(placed.z + 90) < 1e-6, 'the local recipe and instance matrix retain the world placement');
  const colors = mesh.geometry.getAttribute('color');
  assert.deepEqual([colors.getX(0), colors.getY(0), colors.getZ(0)], [1, 0, 0]);
  assert.deepEqual([colors.getX(3), colors.getY(3), colors.getZ(3)], [0, 1, 0]);
  const groundMesh = scenery.group.getObjectByName('frontier_scenery_ground_cover');
  let geometryDisposed = false, materialDisposed = false, groundDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  mesh.material.addEventListener('dispose', () => { materialDisposed = true; });
  groundMesh.addEventListener('dispose', () => { groundDisposals++; });
  scenery.dispose(); scenery.dispose();
  assert.equal(geometryDisposed, true); assert.equal(materialDisposed, true);
  assert.equal(groundDisposals, 1, 'the ground instance buffers are retired exactly once');
});

test('per-build low assets preserve legacy world geometry attributes and stone surfaces', () => {
  const specs = [
    { id: 'reed-equivalence-a', chunkId: '0,-2', assetId: reed.id, x: 7.25, y: 2.5, z: -90.75, scale: 1.3, yaw: .71, kind: 'low' },
    { id: 'stone-equivalence', chunkId: '-1,0', assetId: stone.id, x: -4.2, y: 1.1, z: 6.8, scale: .8, yaw: -.43, kind: 'low' },
    { id: 'reed-equivalence-b', chunkId: '0,0', assetId: reed.id, x: 3.4, y: -.2, z: 8.1, scale: .65, yaw: 2.17, kind: 'low' },
  ];
  const expected = legacyLowAttributes([reed, stone], specs);
  const scenery = createFrontierSceneryVisual({ visualAssets: [reed, stone], specs, canPlaceGroundCover: () => false });
  const actual = instancedLowAttributes(scenery, specs);
  for (const name of ['position', 'normal', 'color']) {
    assert.equal(actual[name].length, expected[name].length);
    const tolerance = name === 'color' ? 0 : name === 'normal' ? 2e-6 : 2e-5;
    for (let index = 0; index < expected[name].length; index++) {
      assert.ok(Math.abs(actual[name][index] - expected[name][index]) <= tolerance, `${name}[${index}] stays within the Float32 instancing tolerance`);
    }
  }
  assert.equal(scenery.stats.lowDrawCount, 3);
  assert.equal(scenery.stats.lowGeometryCount, 2);
  assert.equal(scenery.stats.lowGeometryVertexCount, 9);
  assert.equal(scenery.stats.lowInstanceCount, 3);
  assert.deepEqual(scenery.terrainSurfaces.map(surface => ({ id: surface.id, vertices: Array.from(surface.vertices), indices: Array.from(surface.indices) })), [{
    id: 'f2c:stone-equivalence:stone',
    vertices: [-4.404435634613037,1.100000023841858,6.362994194030762,-3.7354369163513184,1.100000023841858,6.669811248779297,
      -3.9955642223358154,1.100000023841858,7.237005710601807,-4.664563179016113,1.100000023841858,6.9301886558532715,
      -4.404435634613037,2.819999933242798,6.362994194030762,-3.7354369163513184,2.819999933242798,6.669811248779297,
      -3.9955642223358154,2.819999933242798,7.237005710601807,-4.664563179016113,2.819999933242798,6.9301886558532715],
    indices: [0,1,2,0,2,3,4,6,5,4,7,6,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4],
  }]);
  scenery.dispose();
});

test('negative render-cell batches have complete native frustum bounds and share one asset geometry', () => {
  const specs = [
    { id: 'negative-west', chunkId: '-3,-2', assetId: reed.id, x: -124, y: 2, z: -86, scale: 1.2, yaw: .4, kind: 'low' },
    { id: 'negative-east', chunkId: '-3,-2', assetId: reed.id, x: -119, y: 4, z: -82, scale: .7, yaw: -1.1, kind: 'low' },
    { id: 'neighbor', chunkId: '-2,-2', assetId: reed.id, x: -96, y: 1, z: -78, scale: 1, yaw: .2, kind: 'low' },
  ];
  const scenery = createFrontierSceneryVisual({ visualAssets: [reed], specs, canPlaceGroundCover: () => false });
  const meshes = scenery.group.children.filter(child => child.isInstancedMesh && child.name === 'frontier_scenery_low_props');
  assert.equal(FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE, 12.5);
  assert.equal(meshes.length, 2); assert.strictEqual(meshes[0].geometry, meshes[1].geometry);
  const negative = meshes.find(mesh => mesh.userData.frontierScenery.renderCellId === '-10,-7');
  assert.equal(negative.boundingBox.clone().expandByScalar(.001).containsPoint(new THREE.Vector3(-124, 2, -86)), true);
  assert.equal(negative.boundingBox.clone().expandByScalar(.001).containsPoint(new THREE.Vector3(-119, 4, -82)), true);
  assert.ok(negative.boundingBox.min.y <= 2 && negative.boundingBox.max.y >= 4.6);
  assert.ok(negative.boundingSphere.radius > 3, 'the batch sphere spans both complete instances');
  scenery.group.updateMatrixWorld(true);
  const visibleCamera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  visibleCamera.position.set(-121, 18, -50); visibleCamera.lookAt(-121, 2, -84); visibleCamera.updateMatrixWorld(true);
  const visibleFrustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(visibleCamera.projectionMatrix, visibleCamera.matrixWorldInverse));
  assert.equal(visibleFrustum.intersectsObject(negative), true);
  const awayCamera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  awayCamera.position.set(100, 18, 45); awayCamera.lookAt(100, 2, 80); awayCamera.updateMatrixWorld(true);
  const awayFrustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(awayCamera.projectionMatrix, awayCamera.matrixWorldInverse));
  assert.equal(awayFrustum.intersectsObject(negative), false);
  scenery.dispose();
});

test('repeated render-cell batches retire instance buffers and shared asset geometry exactly once', () => {
  const scenery = createFrontierSceneryVisual({ visualAssets: [reed], canPlaceGroundCover: () => false, specs: [
    { id: 'shared-a', chunkId: '-1,0', assetId: reed.id, x: -25, y: 0, z: 10, scale: 1, yaw: 0, kind: 'low' },
    { id: 'shared-b', chunkId: '0,0', assetId: reed.id, x: 25, y: 0, z: 10, scale: 1, yaw: 0, kind: 'low' },
  ] });
  const meshes = scenery.group.children.filter(child => child.isInstancedMesh && child.name === 'frontier_scenery_low_props');
  assert.equal(scenery.stats.lowDrawCount, 2); assert.equal(scenery.stats.lowGeometryCount, 1);
  assert.equal(scenery.stats.lowGeometryVertexCount, 6); assert.equal(scenery.stats.lowInstanceCount, 2);
  let geometryDisposals = 0, instanceDisposals = 0;
  meshes[0].geometry.addEventListener('dispose', () => { geometryDisposals++; });
  for (const mesh of meshes) mesh.addEventListener('dispose', () => { instanceDisposals++; });
  scenery.dispose(); scenery.dispose();
  assert.equal(instanceDisposals, 2); assert.equal(geometryDisposals, 1);
});

test('temporary raw parts are disposed when local asset compilation fails', () => {
  const originalApply = THREE.BufferGeometry.prototype.applyMatrix4;
  const originalDispose = THREE.BufferGeometry.prototype.dispose;
  const originalInstanceDispose = THREE.InstancedMesh.prototype.dispose;
  const rawParts = new Set(), disposed = new Set();
  let transforms = 0, groundDisposals = 0;
  THREE.BufferGeometry.prototype.applyMatrix4 = function(matrix) {
    rawParts.add(this);
    if (++transforms === 2) throw new Error('compile-fixture');
    return originalApply.call(this, matrix);
  };
  THREE.BufferGeometry.prototype.dispose = function() {
    if (rawParts.has(this)) disposed.add(this);
    return originalDispose.call(this);
  };
  THREE.InstancedMesh.prototype.dispose = function() {
    if (this.name === 'frontier_scenery_ground_cover') groundDisposals++;
    return originalInstanceDispose.call(this);
  };
  try {
    assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed], canPlaceGroundCover: () => false,
      specs: [{ id: 'prototype-failure', assetId: reed.id, x: 0, y: 0, z: 0, scale: 1, yaw: 0, kind: 'low' }] }), /compile-fixture/);
  } finally {
    THREE.BufferGeometry.prototype.applyMatrix4 = originalApply;
    THREE.BufferGeometry.prototype.dispose = originalDispose;
    THREE.InstancedMesh.prototype.dispose = originalInstanceDispose;
  }
  assert.equal(rawParts.size, 2);
  assert.equal(disposed.size, rawParts.size, 'every temporary raw part is released on the exception path');
  assert.equal(groundDisposals, 1, 'early compilation failure retires the ground instance buffers');
});

test('ground placement failure retires ground instance buffers exactly once', () => {
  const originalSetColorAt = THREE.InstancedMesh.prototype.setColorAt;
  const originalInstanceDispose = THREE.InstancedMesh.prototype.dispose;
  let groundDisposals = 0;
  THREE.InstancedMesh.prototype.setColorAt = function() { throw new Error('ground-fixture'); };
  THREE.InstancedMesh.prototype.dispose = function() {
    if (this.name === 'frontier_scenery_ground_cover') groundDisposals++;
    return originalInstanceDispose.call(this);
  };
  try {
    assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed],
      specs: [{ id: 'ground-failure', assetId: reed.id, x: 0, y: 0, z: 0, scale: 1, yaw: 0, kind: 'low' }] }), /ground-fixture/);
  } finally {
    THREE.InstancedMesh.prototype.setColorAt = originalSetColorAt;
    THREE.InstancedMesh.prototype.dispose = originalInstanceDispose;
  }
  assert.equal(groundDisposals, 1);
});

test('compiled geometry and a partial instance batch are released when matrix preparation fails', () => {
  const originalSetMatrixAt = THREE.InstancedMesh.prototype.setMatrixAt;
  const originalInstanceDispose = THREE.InstancedMesh.prototype.dispose;
  let lowInstanceDisposals = 0, groundDisposals = 0, geometryDisposals = 0;
  let lowMatrixCalls = 0;
  THREE.InstancedMesh.prototype.setMatrixAt = function(index, matrix) {
    if (this.count !== 1 || ++lowMatrixCalls === 1) return originalSetMatrixAt.call(this, index, matrix);
    this.geometry.addEventListener('dispose', () => { geometryDisposals++; });
    throw new Error('matrix-fixture');
  };
  THREE.InstancedMesh.prototype.dispose = function() {
    if (this.name === 'frontier_scenery_ground_cover') groundDisposals++;
    else lowInstanceDisposals++;
    return originalInstanceDispose.call(this);
  };
  try {
    assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed], canPlaceGroundCover: () => false,
      specs: [{ id: 'matrix-failure', chunkId: '0,0', assetId: reed.id, x: 1, y: 2, z: 3, scale: 1, yaw: 0, kind: 'low' }] }), /matrix-fixture/);
  } finally {
    THREE.InstancedMesh.prototype.setMatrixAt = originalSetMatrixAt;
    THREE.InstancedMesh.prototype.dispose = originalInstanceDispose;
  }
  assert.equal(lowInstanceDisposals, 1, 'the partial instance batch is released');
  assert.equal(groundDisposals, 1, 'late batching failure retires the ground instance buffers');
  assert.equal(geometryDisposals, 1, 'the compiled shared geometry is released');
});

test('admitted Skybreak flowers and trail stones stay in the existing nonsolid low-prop batch', () => {
  const scenery = createFrontierSceneryVisual({
    visualAssets: [cloudflower, trailStones],
    specs: [
      { id: 'skybreak-cap-flower', chunkId: '0,-5', assetId: cloudflower.id, x: 18, y: 35, z: -221, scale: .8, yaw: 0, kind: 'low' },
      { id: 'skybreak-east-stones', chunkId: '0,-5', assetId: trailStones.id, x: 36, y: 28, z: -220, scale: .6, yaw: 0, kind: 'low' },
    ],
  });
  assert.equal(scenery.stats.lowCount, 2);
  assert.equal(scenery.stats.lowDrawCount, 2);
  assert.equal(scenery.stats.surfaceCount, 0, 'cloudflowers and trail stones do not add a collision surface');
  assert.equal(scenery.stats.stoneSolidCount, 0);
  scenery.dispose();
});

test('a regional bloom formation batches each local asset with only its two compact stone solids', () => {
  const assets = [stone, cloudflower, trailStones];
  const ids = [stone.id, stone.id, cloudflower.id, cloudflower.id, cloudflower.id, trailStones.id, trailStones.id];
  const scenery = createFrontierSceneryVisual({
    visualAssets: assets, canPlaceGroundCover: () => false,
    specs: ids.map((assetId, index) => ({
      id: `f2c:p:test-bloom:${index}`, regionalPlaceId: 'test-bloom', chunkId: '-5,-2',
      assetId, x: -225 + index, y: 12, z: -70 + index * .2, scale: assetId === stone.id ? .6 : assetId === cloudflower.id ? .75 : .8,
      yaw: index * .17, kind: 'low',
    })),
  });
  assert.equal(scenery.stats.lowCount, 7);
  assert.equal(scenery.stats.lowDrawCount, 3);
  assert.equal(scenery.stats.stoneSolidCount, 2);
  assert.equal(scenery.stats.surfaceCount, 2);
  assert.equal(scenery.stats.groundDrawCount, 0);
  scenery.dispose();
});

test('staged ground cover is bounded and uses the injected terrain height', async () => {
  await preloadFixture();
  const scenery = createFrontierSceneryVisual({
    visualAssets: [canopy], getHeight: () => 17,
    specs: [{ id: '0,-2:stage-canopy', chunkId: '0,-2', assetId: canopy.id, x: 4, y: 2, z: -88, scale: 1, yaw: 0, kind: 'canopy' }],
  });
  assert.equal(scenery.stats.groundClusterCount, 28);
  const groundMesh = scenery.group.getObjectByName('frontier_scenery_ground_cover');
  const matrix = new THREE.Matrix4(); groundMesh.getMatrixAt(0, matrix);
  assert.equal(new THREE.Vector3().setFromMatrixPosition(matrix).y, 17, 'clusters sit on the authoritative terrain sample rather than the spec fallback');
  scenery.dispose();
});

test('ground cover caps at 640 deterministic clusters in one instanced draw', () => {
  const specs = Array.from({ length: 70 }, (_, index) => ({
    id: `wet-${index}`, chunkId: '0,-2', assetId: reed.id,
    x: index, y: 3, z: -90, scale: 1, yaw: 0, kind: 'low',
  }));
  const scenery = createFrontierSceneryVisual({ visualAssets: [reed], specs });
  assert.equal(scenery.stats.lowCount, 70);
  assert.equal(scenery.stats.groundClusterCount, 640);
  assert.equal(scenery.stats.lowDrawCount, 6);
  assert.equal(scenery.stats.groundDrawCount, 1);
  assert.equal(scenery.stats.groundClusterTriangleCount, 10240);
  scenery.dispose();
});

test('runtime ground patch cache preserves capped output and reuses complete overlapping patches', () => {
  const owner = Object.freeze({ name: 'terrain-owner' });
  const cache = createFrontierGroundPatchCache({ owner, maxEntries: 64 });
  const specs = Array.from({ length: 51 }, (_, index) => ({
    id: `cache-${String(index).padStart(2, '0')}`, assetId: reed.id, x: index * 6, y: 2, z: 20, scale: 1, yaw: 0, kind: 'low',
  }));
  let coldPlaceCalls = 0, coldHeightCalls = 0;
  const cold = createFrontierSceneryVisual({ specs, visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
    canPlaceGroundCover: () => { coldPlaceCalls++; return true; }, getHeight: () => { coldHeightCalls++; return 4; } });
  const stateless = createFrontierSceneryVisual({ specs, visualAssets: [reed], canPlaceGroundCover: () => true, getHeight: () => 4 });
  assert.equal(cold.stats.groundClusterCount, 640); assert.deepEqual(groundAttributes(cold), groundAttributes(stateless));
  assert.equal(coldPlaceCalls, 650, 'the cache completes the final 13-record patch before global truncation');
  assert.equal(coldHeightCalls, 650);

  let warmPlaceCalls = 0, warmHeightCalls = 0;
  const overlapSpecs = [...specs.slice(1, 50), { ...specs[50], id: 'cache-51', x: 306 }];
  const warm = createFrontierSceneryVisual({ specs: overlapSpecs, visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
    canPlaceGroundCover: () => { warmPlaceCalls++; return true; }, getHeight: () => { warmHeightCalls++; return 4; } });
  assert.equal(warmPlaceCalls, 13, '49 overlapping patches reuse cached acceptance while one new patch is prepared');
  assert.equal(warmHeightCalls, 13);
  assert.equal(cache.getDebugState().maxPatchRecords, 13);
  cold.dispose(); stateless.dispose(); warm.dispose();
});

test('ground patch cache is bounded, prunable, and rejects changed owner/world contracts', () => {
  const owner = {};
  const cache = createFrontierGroundPatchCache({ owner, maxEntries: 2 });
  for (let index = 0; index < 3; index++) {
    const scenery = createFrontierSceneryVisual({ visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
      specs: [{ id: `bounded-${index}:stage-`, assetId: reed.id, x: index * 8, y: 0, z: 0, kind: 'low',
        groundCover: { density: 100 } }] });
    scenery.dispose();
  }
  assert.deepEqual(cache.getDebugState(), { entryCount: 2, maxEntries: 2, maxPatchRecords: 28 });
  cache.prune(['bounded-2:stage-']);
  assert.equal(cache.getDebugState().entryCount, 1);
  assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: {},
    specs: [{ id: 'wrong-owner', assetId: reed.id, x: 0, y: 0, z: 0, kind: 'low' }] }), /owner\/world contract changed/);
  assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
    world: { edition: 1, seed: 123 }, specs: [{ id: 'wrong-world', assetId: reed.id, x: 0, y: 0, z: 0, kind: 'low' }] }), /owner\/world contract changed/);
  cache.clear(); assert.equal(cache.getDebugState().entryCount, 0);
});

test('failed ground preparation does not publish a partial cache entry', () => {
  const owner = {}, cache = createFrontierGroundPatchCache({ owner });
  let calls = 0;
  assert.throws(() => createFrontierSceneryVisual({ visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
    canPlaceGroundCover: () => { if (++calls === 3) throw new Error('cache-prepare-fixture'); return true; },
    specs: [{ id: 'failed-cache', assetId: reed.id, x: 0, y: 0, z: 0, kind: 'low' }] }), /cache-prepare-fixture/);
  assert.equal(cache.getDebugState().entryCount, 0);
  const retry = createFrontierSceneryVisual({ visualAssets: [reed], groundPatchCache: cache, groundPatchOwner: owner,
    canPlaceGroundCover: () => { calls++; return true; }, specs: [{ id: 'failed-cache', assetId: reed.id, x: 0, y: 0, z: 0, kind: 'low' }] });
  assert.equal(calls, 16, 'retry prepares all 13 candidates after the failed partial attempt');
  retry.dispose();
});

test('incremental visual job matches synchronous output and transfers result ownership', () => {
  const specs = [
    { id: 'job-a', chunkId: '-1,0', assetId: reed.id, x: -4, y: 2, z: 3, scale: .8, yaw: .2, kind: 'low' },
    { id: 'job-b', chunkId: '0,0', assetId: stone.id, x: 4, y: 3, z: 5, scale: 1.1, yaw: -.3, kind: 'low' },
  ];
  const synchronous = createFrontierSceneryVisual({ specs, visualAssets: [reed, stone], getHeight: (x, z) => x * .01 + z * .02 });
  const job = createFrontierSceneryVisualJob({ specs, visualAssets: [reed, stone], getHeight: (x, z) => x * .01 + z * .02 });
  assert.deepEqual(job.getState(), { status: 'pending', workCompleted: 0, hasResult: false });
  assert.equal(job.step(1).status, 'pending');
  while (job.getState().status === 'pending') job.step(1);
  assert.equal(job.getState().hasResult, true);
  const incremental = job.takeResult();
  assert.deepEqual(incremental.stats, synchronous.stats);
  assert.deepEqual(groundAttributes(incremental), groundAttributes(synchronous));
  assert.deepEqual(incremental.terrainSurfaces, synchronous.terrainSurfaces);
  let groundDisposals = 0;
  incremental.group.getObjectByName('frontier_scenery_ground_cover').addEventListener('dispose', () => { groundDisposals++; });
  assert.equal(job.cancel().status, 'transferred'); assert.equal(groundDisposals, 0, 'job cancellation cannot destroy a transferred visual');
  incremental.dispose(); incremental.dispose(); assert.equal(groundDisposals, 1);
  synchronous.dispose();
});

test('incremental visual cancellation retires partially accumulated resources exactly once', () => {
  const originalInstanceDispose = THREE.InstancedMesh.prototype.dispose;
  let groundDisposals = 0, lowDisposals = 0;
  THREE.InstancedMesh.prototype.dispose = function() {
    if (this.name === 'frontier_scenery_ground_cover') groundDisposals++;
    if (this.name === 'frontier_scenery_low_props') lowDisposals++;
    return originalInstanceDispose.call(this);
  };
  try {
    const job = createFrontierSceneryVisualJob({ visualAssets: [reed], canPlaceGroundCover: () => false, specs: [
      { id: 'cancel-a', assetId: reed.id, x: -4, y: 0, z: 0, kind: 'low' },
      { id: 'cancel-b', assetId: reed.id, x: 14, y: 0, z: 0, kind: 'low' },
    ] });
    job.step(133);
    assert.equal(job.getState().status, 'pending');
    job.cancel(); job.cancel();
    assert.equal(job.getState().status, 'cancelled');
  } finally {
    THREE.InstancedMesh.prototype.dispose = originalInstanceDispose;
  }
  assert.equal(lowDisposals, 1, 'the completed first render-cell batch is retired');
  assert.equal(groundDisposals, 1, 'the partial job ground instance buffers are retired once');
});

test('dense infill cannot displace established ordinary or whole-place ground dressing', () => {
  const originalSpecs = [
    { id: 'f2c:s:-5:9:seed-4', chunkId: '-5,9', assetId: reed.id, x: -223, y: 3, z: 480, scale: 1, yaw: .2, kind: 'low' },
    { id: 'f2c:p:f1:p:-5:9:lush-root-cache:stone', regionalPlaceId: 'f1:p:-5:9:lush-root-cache', chunkId: '-5,9',
      assetId: stone.id, x: -221, y: 3, z: 479, scale: .42, yaw: -.3, kind: 'low' },
  ];
  const baseline = createFrontierSceneryVisual({ visualAssets: [reed, stone], specs: originalSpecs });
  const baselineGround = baseline.group.getObjectByName('frontier_scenery_ground_cover');
  const baselineMatrices = Array.from(baselineGround.instanceMatrix.array.slice(0, baselineGround.count * 16));
  const baselineColors = Array.from(baselineGround.instanceColor.array.slice(0, baselineGround.count * 3));
  const infill = Array.from({ length: 60 }, (_, index) => ({
    id: `f2c:i:-5:9:${index}`, chunkId: '-5,9', assetId: reed.id,
    x: -240 + index * .2, y: 3, z: 460 + index * .1, scale: 1, yaw: 0, kind: 'low',
  }));
  const dense = createFrontierSceneryVisual({ visualAssets: [reed, stone], specs: [...originalSpecs, ...infill] });
  const denseGround = dense.group.getObjectByName('frontier_scenery_ground_cover');
  assert.equal(dense.stats.groundClusterCount, 640);
  assert.deepEqual(Array.from(denseGround.instanceMatrix.array.slice(0, baselineGround.count * 16)), baselineMatrices);
  assert.deepEqual(Array.from(denseGround.instanceColor.array.slice(0, baselineGround.count * 3)), baselineColors);
  baseline.dispose(); dense.dispose();
});

test('injected ground-cover policy can exclude a whole patch without affecting low props', () => {
  const scenery = createFrontierSceneryVisual({
    visualAssets: [reed], canPlaceGroundCover: () => false,
    specs: [{ id: 'blocked-reed', chunkId: '0,-2', assetId: reed.id, x: 7, y: 2, z: -90, scale: 1, yaw: 0, kind: 'low' }],
  });
  assert.equal(scenery.stats.lowDrawCount, 1);
  assert.equal(scenery.stats.groundDrawCount, 0);
  assert.equal(scenery.stats.groundClusterCount, 0);
  assert.equal(scenery.group.getObjectByName('frontier_scenery_ground_cover'), undefined);
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
