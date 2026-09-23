import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { cloneRockSamples, parcelBits, rockMeshUnionAudit } from '../lab/voxel/matter-ownership.js';
import { cutRockSamples, rockDomain } from '../lab/voxel/fracture-field.js';
import { conditionRockSamples, normalizeRockScalarTopology } from '../lab/voxel/matter-conditioning.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';

const domain=rockDomain(9212026),hits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],[0,4,-1.5],[0,3,1],
  [0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
function probes(sample){let count=0;for(let z=0;z<12;z++)for(let y=0;y<12;y++)for(let x=0;x<12;x++)count+=parcelBits(sample,[x,y,z]).filter(Boolean).length;return count;}
function setup(){let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]]){
  const result=mineWorldRock(state,hit);assert.equal(result.status,'OK');state=result.state;}
  const actor=state.actors[0],first=mineActorRock(state,actor.id,actor.contentRevision,[1.55,4,0]);assert.equal(first.status,'OK');return first.state;
}
test('bounded rock conditioning fractures the narrow connection before the old split, without duplicating matter or surface',()=>{
  let conditioned=setup(),control=setup(),firstSplit=-1,preSplit=null;
  for(const [step,hit] of hits.entries()){
    const a=conditioned.actors[0],c=control.actors[0];if(step===7)preSplit=actorRockSamples(a);
    const r=mineActorRock(conditioned,a.id,a.contentRevision,hit),u=mineActorRock(control,c.id,c.contentRevision,hit,{conditioning:false});
    assert.ok(['OK','NO_HIT'].includes(r.status),r.reason);assert.ok(['OK','NO_HIT'].includes(u.status),u.reason);
    conditioned=r.state;control=u.state;assert.equal(quantityAudit(conditioned).balanced,true);
    if(r.split){firstSplit=step;break;}
  }
  assert.equal(firstSplit,7);
  assert.equal(conditioned.actors.length,2);
  const before=actorRockSamples(control.actors[0]);assert.ok(probes(before)>conditioned.actors.reduce((n,a)=>n+probes(actorRockSamples(a)),0));
  const raw=cloneRockSamples(preSplit);cutRockSamples(raw,domain,hits[firstSplit]);
  const normalized=normalizeRockScalarTopology(raw,hits[firstSplit],domain);assert.equal(normalized.status,'OK');
  const adjusted=conditionRockSamples(normalized.sample,hits[firstSplit],ROCK_PROFILE,domain);assert.equal(adjusted.status,'OK');
  const union=rockMeshUnionAudit(adjusted.sample,conditioned.actors.map(actorRockSamples));
  assert.equal(union.matches,true,JSON.stringify(union));
});
test('rock cut and conditioner leave an adjacent foreign material and remote patch untouched',()=>{
  const state=setup(),sample=actorRockSamples(state.actors[0]),copy=cloneRockSamples(sample);
  const remote=[];for(let i=0;i<copy.densities.length;i++)if(copy.densities[i]<0&&copy.position(i)[0]<-1){remote.push(i);copy.materials[i]=2;}
  const before=remote.map(i=>copy.densities[i]),hit=[1.55,4,0];cutRockSamples(copy,domain,hit);
  const normalized=normalizeRockScalarTopology(copy,hit,domain);assert.equal(normalized.status,'OK');
  const conditioned=conditionRockSamples(normalized.sample,hit,ROCK_PROFILE,domain);assert.equal(conditioned.status,'OK');
  assert.deepEqual(remote.map(i=>conditioned.sample.densities[i]),before);
  assert.ok(remote.every(i=>conditioned.sample.materials[i]===2));
});
test('aggressive cohesion/thickness threshold HOLDS at the local quantity cap',()=>{
  let state=setup();for(let i=0;i<7;i++){const actor=state.actors[0],r=mineActorRock(state,actor.id,actor.contentRevision,hits[i]);assert.ok(['OK','NO_HIT'].includes(r.status));state=r.state;}
  const sample=actorRockSamples(state.actors[0]),hit=hits[7],copy=cloneRockSamples(sample);cutRockSamples(copy,domain,hit);
  const result=conditionRockSamples(copy,hit,{...ROCK_PROFILE,maxConditionedProbesPerEdit:0},domain);
  assert.equal(result.status,'HOLD');assert.match(result.reason,/budget/);
  assert.equal(quantityAudit(state).balanced,true);
});
