import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER_REGION_CATALOG, getFrontierRegionRecord } from '../src/world/frontierRegionCatalog.js';

const EXPECTED = [
  ['heartwood-basin', 0, 0, 'lush'],
  ['rootbound-wildwood', -425, 650, 'lush'],
  ['skybreak-tablelands', 0, -450, 'ironspine'],
  ['sunscar-desert', -1850, 50, 'sunscar'],
  ['ironspine-range', -2100, -3000, 'ironspine'],
  ['shatterfen', -750, 1900, 'lush'],
  ['fungal-hollow', -2850, -1250, 'lush'],
  ['emberglass-caldera', 850, -2000, 'ironspine'],
  ['verdant-stair', -900, -1600, 'ironspine'],
  ['saltglass-headlands', 1525, 1675, 'sunscar'],
];

test('finite region catalog freezes the exact ten authored macro sites in stable order', () => {
  assert.equal(FRONTIER_REGION_CATALOG.length, 10);
  assert.deepEqual(FRONTIER_REGION_CATALOG.map(({ habitatId, x, z, baseKind }) => [habitatId, x, z, baseKind]), EXPECTED);
  assert.equal(new Set(FRONTIER_REGION_CATALOG.map(record => record.habitatId)).size, 10);
  for (const record of FRONTIER_REGION_CATALOG) {
    assert.ok(Object.isFrozen(record));
    assert.ok(Object.isFrozen(record.diagnosticColorRGB));
    assert.equal(record.completionStatus, 'topology-only');
    assert.equal(getFrontierRegionRecord(record.habitatId), record);
  }
  assert.equal(getFrontierRegionRecord('missing'), null);
});
