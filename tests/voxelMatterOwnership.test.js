import test from 'node:test';
import assert from 'node:assert/strict';
import { rockDomain, cutRockSamples } from '../lab/voxel/fracture-field.js';
import { makeSupportedRockSamples } from '../lab/voxel/matter-fixtures.js';
import { analyzeRockConnectivity } from '../lab/voxel/matter-connectivity.js';
import { extractRockIsland, cloneRockSamples } from '../lab/voxel/matter-ownership.js';

test('detachment partitions fixed parcels and scalar geometry without duplicates or loss', () => {
  const before=makeSupportedRockSamples(),after=cloneRockSamples(before),domain=rockDomain(9212026);
  cutRockSamples(after,domain,[.5,1.5,0]);cutRockSamples(after,domain,[-.5,1.5,0]);
  const support=analyzeRockConnectivity(after,domain);
  assert.equal(support.status,'OK');
  const result=extractRockIsland(before,after,support);
  assert.equal(result.status,'OK',result.reason);
  assert.equal(result.audit.initial,result.audit.world+result.audit.actor+result.audit.consumed);
  assert.equal(result.audit.duplicate,0);
  assert.ok(result.audit.unionErrorRate<=.05,`surface/occupancy union error ${result.audit.unionErrorRate}`);
  assert.ok(result.audit.actor>result.audit.world);
});
