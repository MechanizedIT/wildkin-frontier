import test from 'node:test';
import assert from 'node:assert/strict';
import { matterActorProductChanges } from '../lab/voxel/matter-product-reuse.js';

test('unrelated world edits reuse unchanged actor products and explicit invalidation rebuilds them',()=>{
  const previous=[{id:'settled-rock',contentRevision:4},{id:'second-rock',contentRevision:2}],
    unchanged=[{id:'settled-rock',contentRevision:4},{id:'second-rock',contentRevision:2}],
    reused=matterActorProductChanges(previous,unchanged);
  assert.deepEqual(reused.prepare,[]);assert.deepEqual(reused.retire,[]);assert.deepEqual(reused.reuse,['settled-rock','second-rock']);
  const changed=matterActorProductChanges(previous,[{id:'settled-rock',contentRevision:5},{id:'new-rock',contentRevision:1}]);
  assert.deepEqual(changed.prepare.map(actor=>actor.id),['settled-rock','new-rock']);assert.deepEqual(changed.retire,['settled-rock','new-rock','second-rock']);
  const invalidated=matterActorProductChanges(previous,unchanged,['settled-rock']);
  assert.deepEqual(invalidated.prepare.map(actor=>actor.id),['settled-rock']);assert.deepEqual(invalidated.retire,['settled-rock']);
  assert.deepEqual(invalidated.reuse,['second-rock']);
});
