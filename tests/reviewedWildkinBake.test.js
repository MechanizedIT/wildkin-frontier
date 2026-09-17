import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWildkinMeshVisual } from '../src/world/wildkinMeshKit.js';
import { meshRecipePart } from '../tools/mesh-recipe.mjs';
import generated from '../src/world/data/world.generated.js';

test('reviewed Emberhorn, Cinderjaw and Thornprowler geometry reaches the recipes loaded by the game', () => {
  const source = JSON.parse(readFileSync(new URL('../src/world/data/world.json', import.meta.url), 'utf8'));
  for (const id of ['asset_wildkin_emberhorn', 'asset_cinderjaw', 'asset_thornprowler']) {
    const model = createWildkinMeshVisual(id), meshes = [];
    model.updateMatrixWorld(true);
    model.traverse(object => { if (object.isMesh) meshes.push(object); });
    // Match the JSON boundary: -0 becomes 0 and undefined optional fields vanish.
    const expected = JSON.parse(JSON.stringify(meshes.map((mesh, i) => meshRecipePart(`mesh_${i}`, mesh))));
    const authored = source.visualAssets.find(asset => asset.id === id);
    const loaded = generated.visualAssets.find(asset => asset.id === id);
    assert.deepEqual(authored.parts, expected, `${id} source recipe contains reviewed geometry`);
    assert.deepEqual(loaded, authored, `${id} runtime-generated recipe matches authored data`);
  }
});
