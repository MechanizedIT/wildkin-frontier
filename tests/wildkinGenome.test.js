import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWildkinGenome, normalizeWildkinGenome, expressWildkinGenome,
  inheritWildkinGenome, MOSSLING_GENOME_RECIPE,
} from '../src/creatures/wildkinGenome.js';

test('Mossling creation is deterministic and call-order independent', () => {
  const first = createWildkinGenome('river-seed', 'grove');
  createWildkinGenome('other-seed', 'ridge');
  assert.deepEqual(createWildkinGenome('river-seed', 'grove'), first);
  assert.deepEqual(createWildkinGenome(42, 'fen'), createWildkinGenome(42, 'fen'));
});

test('normalization rejects invalid imports and clones the accepted genome', () => {
  const genome = createWildkinGenome('strict', 'grove');
  assert.throws(() => normalizeWildkinGenome({ ...genome, baseColor: '#fff' }), /baseColor/);
  assert.throws(() => normalizeWildkinGenome({ ...genome, crestVariant: 2 }), /crestVariant/);
  assert.throws(() => normalizeWildkinGenome({ ...genome, version: 99 }), /version/);
  assert.throws(() => createWildkinGenome(Number.NaN), /finite/);
  assert.throws(() => createWildkinGenome(Number.POSITIVE_INFINITY), /finite/);
  const clone = normalizeWildkinGenome(genome);
  assert.deepEqual(clone, genome);
  assert.notEqual(clone, genome);
});

test('cross-ecotype inheritance keeps every trait parental while preserving a compatible allele', () => {
  const a = { species:'mossling', version:1, ecotype:'fen', baseColor:'clay', eyeColor:'amber', crestVariant:2, tailVariant:0, marking:'cheek', sizeBand:'petite' };
  const b = { species:'mossling', version:1, ecotype:'grove', baseColor:'fern', eyeColor:'teal', crestVariant:1, tailVariant:2, marking:'stripe', sizeBand:'sturdy' };
  for (let index = 0; index < 16; index += 1) {
    const child = inheritWildkinGenome(a, b, `cross-${index}`, { preserveTrait: 'crestVariant' });
    for (const field of ['ecotype','baseColor','eyeColor','crestVariant','tailVariant','marking','sizeBand']) {
      assert.ok([a[field], b[field]].includes(child[field]), `${field} must be parental`);
    }
    assert.equal(child.crestVariant, a.crestVariant);
  }
});

test('expression resolves approved palettes, named traits, and numeric size scale', () => {
  const expressed = expressWildkinGenome({ species: 'mossling', version: 1, ecotype: 'fen', baseColor: 'fern', eyeColor: 'teal', crestVariant: 0, tailVariant: 1, marking: 'stripe', sizeBand: 'sturdy' });
  assert.equal(expressed.baseColorHex, '#4F7D61');
  assert.equal(expressed.eyeColorName, 'teal');
  assert.equal(expressed.markingName, 'stripe');
  assert.equal(expressed.scale, 1.1);
});

test('inheritance selects parent alleles and can preserve a compatible trait', () => {
  const a = { species:'mossling', version:1, ecotype:'fen', baseColor:'clay', eyeColor:'amber', crestVariant:2, tailVariant:0, marking:'cheek', sizeBand:'petite' };
  const b = { species:'mossling', version:1, ecotype:'fen', baseColor:'fern', eyeColor:'teal', crestVariant:1, tailVariant:2, marking:'stripe', sizeBand:'sturdy' };
  const child = inheritWildkinGenome(a, b, 'offspring', { preserveTrait: 'baseColor' });
  assert.equal(child.baseColor, 'clay');
  for (const field of ['ecotype','baseColor','eyeColor','crestVariant','tailVariant','marking','sizeBand']) assert.ok([a[field], b[field]].includes(child[field]), field);
  assert.ok(MOSSLING_GENOME_RECIPE.variants[child.ecotype].crest.includes(child.crestVariant));
});
