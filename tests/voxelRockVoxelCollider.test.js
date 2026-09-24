import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier.js';
import { planVoxelCollider, createVoxelDescriptor } from '../lab/voxel/rock-voxel-collider.js';
import { collisionStudyFixtures, occupiedRockPoints } from '../lab/voxel/rock-collision-study.js';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics, auditPreparedRockCollision } from '../lab/voxel/matter-physics.js';
import { LabWorldState } from '../lab/voxel/world-state.js';
await R.init();
const fixtures=collisionStudyFixtures();
test('vendored 0.20.0 native voxel API uses integer lower corners and full size',()=>{
  assert.equal(R.version(),'0.20.0');const world=new R.World({x:0,y:0,z:0});
  try{for(const index of [-2,-1,0,1,2]){
    const c=world.createCollider(R.ColliderDesc.voxels(new Int32Array([index,0,0]),{x:.25,y:.25,z:.25}));
    const ray=new R.Ray({x:-2,y:.125,z:.125},{x:1,y:0,z:0});
    assert.ok(Math.abs(c.castRay(ray,5,true)-(2+index*.25))<1e-6);
    world.removeCollider(c,false);
  }}finally{world.free();}
});
test('quarter-metre collision cells preserve occupied subparcel coverage without mutating authority',()=>{
  for(const f of fixtures){const before=Array.from(f.sample.densities),occupied=occupiedRockPoints(f.sample),fine=planVoxelCollider(f.sample,.25),coarse=planVoxelCollider(f.sample,.5);
    assert.equal(fine.voxelCount,occupied.length);assert.equal(coarse.occupiedParcels,occupied.length);
    const centers=[];for(let i=0;i<fine.coordinates.length;i+=3)centers.push([0,1,2].map(a=>fine.translation[a]+(fine.coordinates[i+a]+.5)*.25));
    assert.deepEqual(centers,occupied);assert.ok(coarse.voxelCount<=fine.voxelCount);
    assert.deepEqual(Array.from(f.sample.densities),before);assert.deepEqual(planVoxelCollider(f.sample,.25).coordinates,fine.coordinates);
  }
});
test('native deep recess remains a rejected collider, not falsely admitted by narrower rays',()=>{
  const f=fixtures.find(f=>f.name==='central-cut-2'),world=new R.World({x:0,y:0,z:0});
  try{for(const spacing of [.25,.5]){const c=world.createCollider(createVoxelDescriptor(R,planVoxelCollider(f.sample,spacing)));
    const a=auditPreparedRockCollision(R,f.mesh,{...f.record,position:[0,0,0],rotation:{x:0,y:0,z:0,w:1}},[c]);
    assert.equal(a.passes,false);assert.ok(a.maxGap>2);world.removeCollider(c,false);
  }}finally{world.free();}
});
test('actual failed native candidate leaves old actor, ownership, rewards, save and products unchanged',async()=>{
  let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
  for(const hit of [[1.55,4,0],[0,4,0]]){const a=state.actors[0];state=mineActorRock(state,a.id,a.contentRevision,hit).state;}
  const physics=new CellularRockPhysics(R),actor=state.actors[0],old=physics.prepareActor(actor,meshRockSamples(actorRockSamples(actor)));physics.installActors([old]);
  let saves=0,installs=0;const original=structuredClone(state),owner=new LabWorldState({save:async()=>{saves++;}},state);
  try{
    await assert.rejects(owner.transactPrepared({expectedRevision:state.revision,
      propose:s=>mineActorRock(s,actor.id,actor.contentRevision,[0,4,-.5]),
      prepare:async(next,own)=>{
        const a=next.actors[0],sample=actorRockSamples(a),mesh=meshRockSamples(sample),body=physics.world.createRigidBody(R.RigidBodyDesc.dynamic());
        body.setEnabled(false);own({body});
        const collider=physics.world.createCollider(createVoxelDescriptor(R,planVoxelCollider(sample,.25)),body);
        const audit=auditPreparedRockCollision(R,mesh,a,[collider]);
        if(!audit.passes)throw Error('Native candidate collision HOLD');return {body};
      },validate:()=>true,install:()=>{installs++;},discard:p=>physics.world.removeRigidBody(p.body)}),/collision HOLD/);
    assert.deepEqual(owner.state,original);assert.equal(saves,0);assert.equal(installs,0);
    assert.equal(physics.actors.get(actor.id),old);assert.equal(old.body.isEnabled(),true);
    assert.equal(physics.world.bodies.len(),1);assert.equal(quantityAudit(owner.state).balanced,true);
  }finally{physics.dispose();}
});
