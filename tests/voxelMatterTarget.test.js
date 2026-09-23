import test from 'node:test';
import assert from 'node:assert/strict';
import { worldToActorPoint, actorToWorldPoint, pickActorSurface, validateActorHit } from '../lab/voxel/matter-target.js';

const sphere=p=>Math.hypot(...p)-1;
function near(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
test('90-degree and arbitrary actor rotations round-trip with translation and nonzero origin',()=>{
  const poses=[{position:[8,3,-7],rotation:{x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2}},
    {position:[-4,9,3],rotation:{x:.2,y:.3,z:.4,w:Math.sqrt(1-.2**2-.3**2-.4**2)}}];
  for(const pose of poses)for(const point of [[.5,.2,-1],[2,-3,4],[-.7,1.1,.3]]){
    const world=actorToWorldPoint(pose,point),local=worldToActorPoint(pose,world);
    local.forEach((v,i)=>near(v,point[i]));
  }
});
test('ray reaches the moved and rotated scalar surface, never old source or false proxy',()=>{
  const pose={position:[12,4,-6],rotation:{x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2}};
  const actor={id:'rock-a',contentRevision:7,pose,readDensity:sphere};
  const origin=[256,0,-256],global=[12,4,-6];
  const hit=pickActorSurface([actor],{originRelative:[global[0]-origin[0]-4,global[1]-origin[1],global[2]-origin[2]],direction:[1,0,0],origin,maxDistance:8});
  assert.ok(hit);assert.equal(hit.actorId,'rock-a');assert.ok(hit.distance>2.9&&hit.distance<3.1);
  assert.equal(validateActorHit(hit,actor),true);
  assert.equal(validateActorHit(hit,{...actor,contentRevision:8}),false);
  assert.equal(pickActorSurface([actor],{originRelative:[-4,0,0],direction:[1,0,0],origin:[0,0,0],maxDistance:8}),null);
  const hollow={...actor,readDensity:()=>1};
  assert.equal(pickActorSurface([hollow],{originRelative:[8,4,-6],direction:[1,0,0],origin:[0,0,0],maxDistance:8}),null);
});
