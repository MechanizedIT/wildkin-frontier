import test from 'node:test';
import assert from 'node:assert/strict';
import { rockDomain, cutRockSamples } from '../lab/voxel/fracture-field.js';
import { makeSupportedRockSamples } from '../lab/voxel/matter-fixtures.js';
import { analyzeRockConnectivity } from '../lab/voxel/matter-connectivity.js';

test('supported rock is one anchored island before severing', () => {
  const sample=makeSupportedRockSamples(), result=analyzeRockConnectivity(sample,rockDomain(9212026));
  assert.equal(result.status,'OK');assert.equal(result.components.length,1);
  assert.equal(result.components[0].anchored,true);
});

test('fracture removal of neck transfers one unsupported rock island, with no source duplicate', () => {
  const sample=makeSupportedRockSamples(), domain=rockDomain(9212026);
  const cuts=[];for(const hit of [[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5],[0,1.5,-.5]]){
    cuts.push(cutRockSamples(sample,domain,hit));
    const r=analyzeRockConnectivity(sample,domain);if(r.status==='OK'&&r.components.filter(c=>!c.anchored).length===1){
      assert.ok(r.components.find(c=>!c.anchored).cells.length>30);
      assert.equal(new Set(r.components.flatMap(c=>c.cells.map(p=>p.join(',')))).size,r.components.reduce((n,c)=>n+c.cells.length,0));
      return;
    }
  }
  assert.fail(`Rock did not detach after bounded neck cuts: ${JSON.stringify(cuts)}`);
});

test('unknown structural evidence defers instead of assuming support', () => {
  const sample=makeSupportedRockSamples(),domain=rockDomain(9212026);
  const result=analyzeRockConnectivity(sample,domain,{known:([x,y,z])=>y<7});
  assert.equal(result.status,'HOLD');
});
