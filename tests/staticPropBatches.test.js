import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { createVisualAssetVisual } from "../src/world/visualFactory.js";
import { mergeStaticPropVisual } from "../src/world/staticPropBatches.js";

function worldVertices(root) {
  root.updateMatrixWorld(true);
  const points = [];
  root.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      points.push(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld));
    }
  });
  return points;
}

test("runtime static-prop material batches preserve baked vertices, bounds and shared sources", () => {
  const triangle = { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] };
  const asset = {
    id: "batch-proof",
    parts: [
      { id: "a", shape: "mesh", geometry: triangle, position: { x: -1, y: 1, z: 0 }, rotation: { x: 0, y: .3, z: 0 }, scale: { x: 1, y: 2, z: 1 }, color: "#668844" },
      { id: "b", shape: "mesh", geometry: triangle, position: { x: 1, y: .5, z: 0 }, rotation: { x: .2, y: 0, z: 0 }, scale: { x: .6, y: 1, z: .8 }, color: "#668844" },
      { id: "c", shape: "mesh", geometry: triangle, position: { x: 0, y: 2, z: .3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: "#cc8844" },
    ],
  };
  const root = createVisualAssetVisual(asset);
  root.position.set(4, .7, -2); root.rotation.y = .6; root.scale.set(1.2, 1.2, 1.2);
  const before = worldVertices(root);
  const boundsFromVertices = (points) => points.reduce((bounds, point) => bounds.expandByPoint(point), new THREE.Box3());
  const beforeBounds = boundsFromVertices(before);
  const originalGeometry = root.children[0].geometry;
  const result = mergeStaticPropVisual(root);
  const after = worldVertices(root);
  const afterBounds = boundsFromVertices(after);
  assert.deepEqual(result, { merged: true, meshCountBefore: 3, meshCountAfter: 1 });
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].userData.visualAssetId, "batch-proof");
  assert.equal(root.children[0].userData.assetPartId, undefined);
  assert.equal(originalGeometry.userData.isSharedAssetGeometry, true);
  assert.equal(before.length, after.length);
  for (let index = 0; index < before.length; index += 1) assert.ok(before[index].distanceTo(after[index]) < 1e-5);
  assert.ok(beforeBounds.min.distanceTo(afterBounds.min) < 1e-5);
  assert.ok(beforeBounds.max.distanceTo(afterBounds.max) < 1e-5);
  const colors = root.children[0].geometry.getAttribute('color');
  const first = new THREE.Color('#668844'), last = new THREE.Color('#cc8844');
  assert.ok(Math.abs(colors.getX(0) - first.r) < 1e-6);
  assert.ok(Math.abs(colors.getY(0) - first.g) < 1e-6);
  assert.ok(Math.abs(colors.getX(6) - last.r) < 1e-6);
  assert.equal(root.children[0].material.vertexColors, true);
  assert.equal(root.children[0].material.color.getHex(), 0xffffff);
});

test('palette batching retains differences in roughness and source materials', () => {
  const root = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: '#558844', roughness: .9 });
  const brown = new THREE.MeshStandardMaterial({ color: '#885533', roughness: .9 });
  const polished = new THREE.MeshStandardMaterial({ color: '#885533', roughness: .3 });
  // Position/normal-only geometry is the authored mesh path this function owns.
  const geometry = new THREE.BoxGeometry(1, 1, 1); geometry.deleteAttribute('uv');
  for (const material of [green, brown, polished]) root.add(new THREE.Mesh(geometry, material));
  assert.deepEqual(mergeStaticPropVisual(root), { merged: true, meshCountBefore: 3, meshCountAfter: 2 });
  assert.deepEqual(root.children.map(mesh => mesh.material.roughness), [.9, .3]);
  assert.equal(green.color.getHex(), 0x558844);
  assert.equal(green.vertexColors, false);
  assert.equal(geometry.getAttribute('color'), undefined);
});

test("runtime static-prop batches preserve mirrored mesh winding", () => {
  const triangle = { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] };
  const asset = {
    id: "mirror-proof",
    parts: [
      { id: "mirrored", shape: "mesh", geometry: triangle, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: -1, y: 1, z: 1 }, color: "#668844" },
      { id: "ordinary", shape: "mesh", geometry: triangle, position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: "#668844" },
    ],
  };
  const root = createVisualAssetVisual(asset);
  assert.equal(mergeStaticPropVisual(root).merged, true);
  assert.deepEqual(Array.from(root.children[0].geometry.index.array.slice(0, 3)), [0, 2, 1]);
});
