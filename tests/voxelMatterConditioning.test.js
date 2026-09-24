import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRockState, mineWorldRock, mineActorRock, quantityAudit } from '../lab/voxel/matter-actor.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';

const splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0]];
function detach(){
  let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    const result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  const actor=state.actors[0],first=mineActorRock(state,actor.id,actor.contentRevision,[1.55,4,0]);
  assert.equal(first.status,'OK');return first.state;
}
test('hard-rock chips remove little material; stress accumulates separately until a mostly intact structural split',()=>{
  let state=detach(),control=structuredClone(state),start=state.actors[0],beforeReward=state.rewards.stoneUnits;
  for(const [index,hit] of splitHits.entries()){
    const actor=state.actors[0],result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    const controlActor=control.actors[0],noFracture=mineActorRock(control,controlActor.id,controlActor.contentRevision,hit,
      {rockProfile:{...ROCK_PROFILE,maxFractureCandidates:0}});
    assert.equal(result.status,'OK',result.reason);assert.equal(noFracture.status,'OK');
    assert.ok(result.cut.removedSamples<8,`strike ${index+1} removed ${result.cut.removedSamples} scalar samples`);
    assert.ok(result.stress.propagatedBonds<=ROCK_PROFILE.maxStressBonds);
    if(!result.split){assert.equal(result.state.actors[0].id,start.id);}
    state=result.state;control=noFracture.state;
    if(result.split){
      assert.ok(index>=1,'the detached rock takes several visible mining strikes before its first large fracture');
      assert.ok(result.fractureMetrics.largePieces.length>=2);
      assert.ok(result.fractureMetrics.largePieces.every(n=>n>=ROCK_PROFILE.persistentPieceMinProbes));
      assert.equal(result.fractureMetrics.seamSamples,0,'fracture partitions existing matter without deleting a plane of stone');
      assert.ok(result.fractureMetrics.maskOccupancyErrorRate<=.05);
      assert.equal(state.rewards.stoneUnits,control.rewards.stoneUnits,'the same chip earns the same reward without fracture');
      assert.ok(result.remainingQuantity/state.initialQuantity>.9,'more than 90% of original matter remains');
      assert.equal(quantityAudit(state).balanced,true);
      assert.ok(state.actors.every(actor=>actor.parentId===start.id));
      break;
    }
  }
  assert.equal(state.actors.length,2);
});

test('a fractured child can split again without turning fracture or quantized residuals into rewards',()=>{
  let state=detach(),firstParent=state.actors[0];
  for(const hit of splitHits){const actor=state.actors[0],result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.equal(result.status,'OK',result.reason);state=result.state;if(result.split)break;}
  assert.equal(state.actors.length,2);
  const child=state.actors[0],childId=child.id,rewardBefore=state.rewards.stoneUnits,
    beforeAudit=quantityAudit(state),recursive=mineActorRock(state,childId,child.contentRevision,[0,4,0]);
  assert.equal(recursive.status,'OK',recursive.reason);assert.equal(recursive.split,true);
  assert.equal(recursive.cut.removedSamples,0,'the recursive strike fractures structure without removing material in this fixture');
  assert.equal(recursive.state.rewards.stoneUnits,rewardBefore,'fracture and previously quantized residual probes grant no reward');
  assert.equal(recursive.state.retired.filter(id=>id===childId).length,1);
  const grandchildren=recursive.state.actors.filter(actor=>actor.parentId===childId);
  assert.ok(grandchildren.length>=2);assert.ok(grandchildren.every(actor=>actor.structure.hitSequence>0));
  assert.equal(quantityAudit(recursive.state).total,beforeAudit.total);
  assert.equal(quantityAudit(recursive.state).balanced,true);
});
