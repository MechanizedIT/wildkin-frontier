import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyWildkinAppearance, WILDKIN_BODY_TONE_STRENGTH } from '../src/creatures/wildkinAppearance.js';
import { createWildkinGenome, expressWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { disposeExternalModelInstance } from '../src/assets/modelAssetRuntime.js';

function fixture({ iris = true } = {}) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const texture = new THREE.Texture();
  const body = new THREE.MeshLambertMaterial({ color: 0xb0c090, map: texture, opacity: .82,
    transparent: true, vertexColors: true });
  body.name = 'wildkin_body';
  const eye = new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture, vertexColors: true });
  eye.name = iris ? 'wildkin_iris' : 'eye';
  const root = new THREE.Group(); root.userData.externalModelInstance = true;
  const first = new THREE.Mesh(geometry, body), second = new THREE.Mesh(geometry, [body, eye]);
  root.add(first, second);
  return { root, first, second, geometry, texture, body, eye };
}

test('two Mossling instances express independently while preserving borrowed assets and material properties', () => {
  const a = fixture(), b = fixture();
  // Model instances normally share cached template resources.
  b.first.geometry = a.geometry; b.second.geometry = a.geometry;
  b.first.material = a.body; b.second.material = [a.body, a.eye];
  const genomeA = { ...createWildkinGenome('appearance-a'), baseColor: 'lichen', eyeColor: 'amber' };
  const genomeB = { ...createWildkinGenome('appearance-b'), baseColor: 'dusk', eyeColor: 'violet' };
  const resultA = applyWildkinAppearance(a.root, genomeA), resultB = applyWildkinAppearance(b.root, genomeB);
  assert.equal(resultA.ok, true); assert.equal(resultB.ok, true);
  assert.equal(resultA.materialCloneCount, 2);
  assert.strictEqual(a.first.material, a.second.material[0], 'one source material is cloned once within an instance');
  assert.notStrictEqual(a.first.material, b.first.material, 'instances own separate material clones');
  assert.notStrictEqual(a.first.material, a.body); assert.notStrictEqual(a.second.material[1], a.eye);
  assert.strictEqual(a.first.geometry, a.geometry); assert.strictEqual(a.first.material.map, a.texture);
  assert.equal(a.first.material.name, 'wildkin_body'); assert.equal(a.second.material[1].name, 'wildkin_iris');
  assert.equal(a.first.material.opacity, .82); assert.equal(a.first.material.vertexColors, true);
  const expressionA = expressWildkinGenome(genomeA);
  const expectedBody = a.body.color.clone().multiply(new THREE.Color(0xffffff)
    .lerp(new THREE.Color(expressionA.baseColorHex), WILDKIN_BODY_TONE_STRENGTH));
  assert.equal(a.first.material.color.getHex(), expectedBody.getHex());
  assert.equal(a.second.material[1].color.getHex(), new THREE.Color(expressionA.eyeColorHex).getHex());
  assert.notEqual(a.first.material.color.getHex(), b.first.material.color.getHex());
});

test('validation leaves the model untouched when a required channel or valid genome is absent', () => {
  const missing = fixture({ iris: false });
  const before = [missing.first.material, ...missing.second.material];
  assert.deepEqual(applyWildkinAppearance(missing.root, createWildkinGenome('valid')), {
    ok: false, reason: 'missing-material:wildkin_iris' });
  assert.deepEqual([missing.first.material, ...missing.second.material], before);
  const invalid = fixture();
  const invalidBefore = [invalid.first.material, ...invalid.second.material];
  assert.deepEqual(applyWildkinAppearance(invalid.root, { species: 'mossling', version: 99 }), {
    ok: false, reason: 'invalid-genome' });
  assert.deepEqual([invalid.first.material, ...invalid.second.material], invalidBefore);
  assert.deepEqual(applyWildkinAppearance(new THREE.Group(), createWildkinGenome('valid')), {
    ok: false, reason: 'unsupported-root' });
});

test('admitted V3 expresses body tone only and leaves eye genes invisible', () => {
  const a = fixture(), b = fixture();
  for (const f of [a, b]) {
    f.root.remove(f.second);
    f.root.userData.externalModelPath = 'assets/models/mossling-v3/model.glb';
    f.first.material = a.body;
  }
  a.body.name = 'V3 painted body';
  const genome = { ...createWildkinGenome('v3-tone'), baseColor: 'clay', eyeColor: 'teal' };
  const before = a.body.color.clone();
  const result = applyWildkinAppearance(a.root, genome);
  assert.deepEqual(result.expressedTraits, ['baseColor']);
  assert.equal(result.irisMaterialCount, 0);
  assert.equal(result.materialCloneCount, 1);
  applyWildkinAppearance(b.root, { ...genome, eyeColor: 'violet' });
  assert.notStrictEqual(a.first.material, b.first.material);
  assert.equal(a.first.material.color.getHex(), b.first.material.color.getHex(), 'eye data cannot recolor the body');
  assert.equal(a.body.color.getHex(), before.getHex(), 'the species template stays neutral');
  assert.strictEqual(a.first.material.map, a.texture);
});

test('external instance disposal releases each unique appearance clone once and keeps borrowed resources', () => {
  const f = fixture();
  assert.equal(applyWildkinAppearance(f.root, createWildkinGenome('dispose')).ok, true);
  const bodyClone = f.first.material, irisClone = f.second.material[1];
  let bodyDisposals = 0, irisDisposals = 0, geometryDisposals = 0, textureDisposals = 0;
  bodyClone.addEventListener('dispose', () => bodyDisposals++);
  irisClone.addEventListener('dispose', () => irisDisposals++);
  f.geometry.addEventListener('dispose', () => geometryDisposals++);
  f.texture.addEventListener('dispose', () => textureDisposals++);
  assert.equal(disposeExternalModelInstance(f.root), true);
  assert.deepEqual({ bodyDisposals, irisDisposals, geometryDisposals, textureDisposals },
    { bodyDisposals: 1, irisDisposals: 1, geometryDisposals: 0, textureDisposals: 0 });
});

test('existing instance-owned tint materials are reused, styled and disposed without orphan clones', () => {
  const f = fixture();
  const ownedBody = f.body.clone(), ownedIris = f.eye.clone();
  ownedBody.color.set(0x779955); ownedBody.opacity = .47;
  ownedBody.userData.externalModelInstanceMaterial = true;
  ownedIris.userData.externalModelInstanceMaterial = true;
  f.first.material = ownedBody; f.second.material = [ownedBody, ownedIris];
  const genome = { ...createWildkinGenome('owned-style'), baseColor: 'dusk', eyeColor: 'teal' };
  const beforeBody = ownedBody.color.clone();
  const result = applyWildkinAppearance(f.root, genome);
  assert.equal(result.ok, true); assert.equal(result.materialCloneCount, 0);
  assert.strictEqual(f.first.material, ownedBody); assert.strictEqual(f.second.material[0], ownedBody);
  assert.strictEqual(f.second.material[1], ownedIris);
  const expression = expressWildkinGenome(genome);
  const expectedBody = beforeBody.multiply(new THREE.Color(0xffffff)
    .lerp(new THREE.Color(expression.baseColorHex), WILDKIN_BODY_TONE_STRENGTH));
  assert.equal(ownedBody.color.getHex(), expectedBody.getHex());
  assert.equal(ownedBody.opacity, .47);
  assert.equal(ownedIris.color.getHex(), new THREE.Color(expression.eyeColorHex).getHex());
  let bodyDisposals = 0, irisDisposals = 0;
  ownedBody.addEventListener('dispose', () => bodyDisposals++);
  ownedIris.addEventListener('dispose', () => irisDisposals++);
  assert.equal(disposeExternalModelInstance(f.root), true);
  assert.deepEqual({ bodyDisposals, irisDisposals }, { bodyDisposals: 1, irisDisposals: 1 });
});
