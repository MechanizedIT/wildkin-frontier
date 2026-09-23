import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import * as THREE from '../vendor/three.module.js';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples } from '../lab/voxel/matter-actor.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics } from '../lab/voxel/matter-physics.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';

test('real Rapier rock falls and rotates with a bounded compound, including origin rebase',async()=>{
  await RAPIER.init();let state=createInitialRockState();
  state=mineWorldRock(state,[.5,1.5,0]).state;state=mineWorldRock(state,[-.5,1.5,0]).state;
  const actor=state.actors[0],physics=new CellularRockPhysics(RAPIER);
  try{
    physics.installWorld(physics.prepareWorld(meshRockSamples(actorRockSamples(state.world)),state.revision));
    const actorMesh=meshRockSamples(actorRockSamples(actor));
    const prepared=physics.prepareActor(actor,actorMesh);
    assert.ok(prepared.hullCount>=1&&prepared.hullCount<=8);
    physics.installActors([prepared]);physics.step();const initial=physics.pose(actor.id);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(actorMesh.positions,3));geometry.setIndex(new THREE.BufferAttribute(actorMesh.indices,1));
    const visible=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));visible.updateMatrixWorld();
    for(const [start,direction] of [[[0,4,5],[0,0,-1]],[[5,4,0],[-1,0,0]],[[-5,4,0],[1,0,0]],[[0,9,0],[0,-1,0]]]){
      const ray=new THREE.Raycaster(new THREE.Vector3(...start),new THREE.Vector3(...direction),0,10),meshHit=ray.intersectObject(visible)[0];
      const bodyHit=physics.world.castRay(new RAPIER.Ray(vec(start),vec(direction)),10,true);
      assert.ok(meshHit&&bodyHit,`missing visible/proxy hit ${start}: visible ${!!meshHit}, proxy ${!!bodyHit}`);
      assert.ok(Math.abs(meshHit.distance-bodyHit.timeOfImpact)<=.5,`proxy error ${start}: ${meshHit.distance} vs ${bodyHit.timeOfImpact}`);
    }
    for(let i=0;i<180;i++)physics.step();const fallen=physics.pose(actor.id);
    const beforeCOM=actorToWorldPoint(initial,actor.localCOM),afterCOM=actorToWorldPoint(fallen,actor.localCOM);
    assert.ok(afterCOM[1]<beforeCOM[1]-.4,`${beforeCOM[1]} -> ${afterCOM[1]}`);
    const dot=Math.abs(initial.rotation.x*fallen.rotation.x+initial.rotation.y*fallen.rotation.y+initial.rotation.z*fallen.rotation.z+initial.rotation.w*fallen.rotation.w);
    assert.ok(2*Math.acos(Math.min(1,dot))>.5,'fall should include substantial rotation');
    physics.shiftOrigin([256,128,-256]);const rebased=physics.pose(actor.id);
    assert.ok(rebased.position.every((v,i)=>Math.abs(v-fallen.position[i])<1e-4));
  }finally{physics.dispose();}
});
test('edited rock compound remains close to its visible notched surface',async()=>{
  await RAPIER.init();let state=createInitialRockState();for(const hit of [[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
  const parent=state.actors[0];state=mineActorRock(state,parent.id,parent.contentRevision,[1.55,4,0]).state;
  const actor=state.actors[0],mesh=meshRockSamples(actorRockSamples(actor)),physics=new CellularRockPhysics(RAPIER);
  try{
    physics.installActors([physics.prepareActor(actor,mesh)]);physics.step();
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));g.setIndex(new THREE.BufferAttribute(mesh.indices,1));
    const visible=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));visible.updateMatrixWorld();
    const start=[5,4,0],direction=[-1,0,0],meshHit=new THREE.Raycaster(new THREE.Vector3(...start),new THREE.Vector3(...direction),0,10).intersectObject(visible)[0];
    const bodyHit=physics.world.castRay(new RAPIER.Ray(vec(start),vec(direction)),10,true);
    assert.ok(meshHit&&bodyHit);
    assert.ok(Math.abs(meshHit.distance-bodyHit.timeOfImpact)<=.5,`${meshHit.distance} vs ${bodyHit.timeOfImpact}`);
  }finally{physics.dispose();}
});
test('unsafe conditioned split child collider is rejected before publication',async()=>{
  await RAPIER.init();let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
  let actor=state.actors[0];state=mineActorRock(state,actor.id,actor.contentRevision,[1.55,4,0]).state;
  const hits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],[0,4,-1.5],[0,3,1]];
  for(const hit of hits){actor=state.actors[0];const edit=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.ok(['OK','NO_HIT'].includes(edit.status),edit.reason);state=edit.state;if(edit.split)break;}
  assert.equal(state.actors.length,2);
  const original=state.actors[0],child={...original,position:[0,0,0],rotation:{x:0,y:0,z:0,w:1}},
    mesh=meshRockSamples(actorRockSamples(child)),physics=new CellularRockPhysics(RAPIER);
  try{
    assert.throws(()=>physics.prepareActor(child,mesh),/Rock collider visible-surface gate/);
    assert.equal(physics.actors.size,0);
  }finally{physics.dispose();}
});
function vec(p){return {x:p[0],y:p[1],z:p[2]};}
