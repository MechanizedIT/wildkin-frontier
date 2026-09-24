import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier.js';
import { createInitialRockState, mineWorldRock, actorRockSamples } from '../lab/voxel/matter-actor.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics, auditPreparedRockCollision } from '../lab/voxel/matter-physics.js';

function detached(){
  let state=createInitialRockState();
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    const result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  assert.equal(state.actors.length,1);return state;
}

test('A.3 surface-equivalence audit is diagnostic while the bounded A.4 proxy remains admissible',async()=>{
  await R.init();const state=detached(),actor=state.actors[0],physics=new CellularRockPhysics(R),mesh=meshRockSamples(actorRockSamples(actor));
  try{
    const prepared=physics.prepareActor(actor,mesh),audit=auditPreparedRockCollision(R,mesh,actor,prepared.colliders);
    assert.ok(prepared.hullCount>0&&prepared.hullCount<=8);
    assert.match(prepared.proxyPolicy,/gameplay proxy; scalar surface remains mining authority/);
    assert.ok(audit.compared>0,'the prior visible-vs-proxy audit remains available for inspection');
    physics.installActors([prepared]);
    assert.ok(physics.pose(actor.id),'proxy admission does not depend on exact visible-surface equivalence');
  }finally{physics.dispose();}
});
