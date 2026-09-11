import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {meshRecipePart} from '../tools/mesh-recipe.mjs';
import {createVisualAssetVisual} from '../src/world/visualFactory.js';

test('baked kits reproduce nested, nonuniform and mirrored transforms in the editable visual path', () => {
  for (const mirror of [1, -1]) {
    const parent = new THREE.Group(); parent.position.set(2, 1, -3); parent.scale.set(2 * mirror, .7, 1.3); parent.rotation.y = .45;
    const source = new THREE.Mesh(new THREE.BoxGeometry(.5, 1, .8), new THREE.MeshStandardMaterial({color:'#b17a38', flatShading:true, roughness:.94}));
    source.rotation.set(.2, .5, .6); source.position.set(.6, 1.1, .3); parent.add(source); parent.updateMatrixWorld(true);
    const recipe = meshRecipePart('panel', source);
    const restored = createVisualAssetVisual({id:`transform-${mirror}`,parts:[recipe]}).children[0]; restored.updateMatrixWorld(true);
    const a = source.geometry.getAttribute('position'), b = restored.geometry.getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      const expected = new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(source.matrixWorld);
      const actual = new THREE.Vector3().fromBufferAttribute(b, i).applyMatrix4(restored.matrixWorld);
      assert.ok(expected.distanceTo(actual) < .0002, `vertex ${i} retains the complete source transform`);
    }
    assert.equal(recipe.color, '#b17a38'); assert.equal(recipe.roughness, .94);
    const sourceIndex = source.geometry.index.array;
    assert.deepEqual(recipe.geometry.indices.slice(0,3), mirror < 0 ? [sourceIndex[0],sourceIndex[2],sourceIndex[1]] : Array.from(sourceIndex.slice(0,3)));
    recipe.position.x += 2;
    const edited = createVisualAssetVisual({id:`edited-${mirror}`,parts:[recipe]}).children[0];
    assert.equal(edited.position.x, restored.position.x + 2, 'Author edits still move the serialized part');
  }
});
