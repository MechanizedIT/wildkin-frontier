import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier.js';
import { createInitialRockState, mineWorldRock } from '../lab/voxel/matter-actor.js';
import { actorRockSamples } from '../lab/voxel/matter-actor.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics } from '../lab/voxel/matter-physics.js';

function detached(){
  let state=createInitialRockState();
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    const result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  assert.equal(state.actors.length,1);return state.actors[0];
}

test('dynamic hard-rock actor preparation has no native voxel-collider dependency',async()=>{
  await R.init();let nativeVoxelCalls=0;
  const descriptors=new Proxy(R.ColliderDesc,{get(target,key){
    if(key==='voxels')return ()=>{nativeVoxelCalls++;throw new Error('native voxel collider is not admitted');};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  const runtime={...R,ColliderDesc:descriptors},actor=detached(),physics=new CellularRockPhysics(runtime);
  try{
    const prepared=physics.prepareActor(actor,meshRockSamples(actorRockSamples(actor)));
    assert.ok(prepared.hullCount>0&&prepared.hullCount<=8);
    assert.equal(nativeVoxelCalls,0);
    physics.discard(prepared);
  }finally{physics.dispose();}
});
