import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { createInitialRockState, mineWorldRock, actorRockSamples } from '../lab/voxel/matter-actor.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics } from '../lab/voxel/matter-physics.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';
import { cutRockSamples, rockDomain } from '../lab/voxel/fracture-field.js';
import { pickActorSurface, readRockScalar } from '../lab/voxel/matter-target.js';

const vec=p=>({x:p[0],y:p[1],z:p[2]});
function detached(){let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]])state=mineWorldRock(state,hit).state;return state;}

test('bounded convex gameplay proxies fall, rotate, and remain finite on static terrain',async()=>{
  await RAPIER.init();const state=detached(),actor=state.actors[0],physics=new CellularRockPhysics(RAPIER);
  try{
    physics.installWorld(physics.prepareWorld(meshRockSamples(actorRockSamples(state.world)),state.revision));
    const mesh=meshRockSamples(actorRockSamples(actor)),prepared=physics.prepareActor(actor,mesh);
    assert.ok(prepared.hullCount>=1&&prepared.hullCount<=8);assert.match(prepared.proxyPolicy,/gameplay proxy/);
    physics.installActors([prepared]);const initial=physics.pose(actor.id);for(let i=0;i<240;i++)physics.step();
    const rested=physics.pose(actor.id),beforeCOM=actorToWorldPoint(initial,actor.localCOM),afterCOM=actorToWorldPoint(rested,actor.localCOM);
    assert.ok(afterCOM[1]<beforeCOM[1]-.4,`${beforeCOM[1]} -> ${afterCOM[1]}`);
    const dot=Math.abs(initial.rotation.x*rested.rotation.x+initial.rotation.y*rested.rotation.y+initial.rotation.z*rested.rotation.z+initial.rotation.w*rested.rotation.w);
    assert.ok(2*Math.acos(Math.min(1,dot))>.5,'the falling body should rotate substantially');
    assert.ok(rested.position.every(Number.isFinite)&&Object.values(rested.rotation).every(Number.isFinite));
    for(let i=0;i<120;i++)physics.step();const stable=physics.pose(actor.id);
    assert.ok(stable.position.every(Number.isFinite));assert.ok(stable.position[1]>-2,'the rock remains above the floor instead of falling through');
    physics.shiftOrigin([256,128,-256]);const rebased=physics.pose(actor.id);
    assert.ok(rebased.position.every((v,i)=>Math.abs(v-stable.position[i])<1e-4));
  }finally{physics.dispose();}
});

test('known deep-recess witness is a proxy hit but a precision-mining miss',async()=>{
  // Reuse the already documented A.3 central-notch witness as a fixed
  // gameplay-separation fixture; this does not search or retune colliders.
  await RAPIER.init();const state=detached(),source=state.actors[0],sample=actorRockSamples(source),domain=rockDomain(9212026);
  for(const hit of [[1.55,4,0],[0,4,0],[0,4,-.5],[0,3,0],[0,5,0]])cutRockSamples(sample,domain,hit);
  const record={...source,densities:Array.from(sample.densities),materials:Array.from(sample.materials)},surface=actorRockSamples(record),
    target={id:source.id,contentRevision:source.contentRevision,poseRevision:source.poseRevision,
      pose:{position:source.position,rotation:source.rotation},readDensity:p=>readRockScalar(surface,p)},
    physics=new CellularRockPhysics(RAPIER),prepared=physics.prepareActor(record,meshRockSamples(surface));
  try{
    assert.ok(prepared.hullCount<=8);assert.match(prepared.proxyPolicy,/scalar surface remains mining authority/);
    const start=[0,3.5,-5],direction=[0,0,1],hit=pickActorSurface([target],{originRelative:start,direction,maxDistance:5.5});
    const ray=new RAPIER.Ray(vec(start),vec(direction)),proxyDistances=prepared.colliders.map(c=>c.castRay(ray,8,true)).filter(Number.isFinite);
    assert.equal(hit,null,'the visible scalar surface lies beyond the mining range through this empty recess');
    assert.ok(proxyDistances.some(distance=>distance<5.5),'the coarse convex proxy overlaps this documented recess');
  }finally{physics.discard(prepared);physics.dispose();}
});
