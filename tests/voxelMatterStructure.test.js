import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSupportedRockSamples } from '../lab/voxel/matter-fixtures.js';
import { rockDomain } from '../lab/voxel/fracture-field.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';
import { buildRockBondGraph, emptyRockStructure, impactRockStructure } from '../lab/voxel/matter-structure.js';
import { createInitialRockState } from '../lab/voxel/matter-actor.js';
import { validateCellularState } from '../lab/voxel/cellular-persistence.js';

function evolve(seed,hits){
  const samples=makeSupportedRockSamples(),domain=rockDomain(seed);let state=emptyRockStructure();
  for(const hit of hits){const graph=buildRockBondGraph(samples,domain,ROCK_PROFILE,state);assert.equal(graph.status,'OK');
    const impact=impactRockStructure(graph,state,hit,domain,ROCK_PROFILE);assert.equal(impact.status,'OK');state=impact.state;}
  return state;
}
const sequence=[[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[0,4,0],[0,4,-.5],[0,3,0],[0,5,0]];

test('bond IDs and same-seed stress/failure evolution are deterministic and seed-variable',()=>{
  const samples=makeSupportedRockSamples(),a=buildRockBondGraph(samples,rockDomain(9212026),ROCK_PROFILE),
    b=buildRockBondGraph(samples,rockDomain(9212026),ROCK_PROFILE),other=buildRockBondGraph(samples,rockDomain(9212027),ROCK_PROFILE);
  assert.deepEqual([...a.edges.keys()],[...b.edges.keys()]);
  assert.deepEqual([...a.edges].map(([id,e])=>[id,e.strength]),[...b.edges].map(([id,e])=>[id,e.strength]));
  const sameA=evolve(9212026,sequence),sameB=evolve(9212026,sequence),different=evolve(9212027,sequence);
  assert.deepEqual(sameA,sameB);assert.notDeepEqual(sameA,different);
  assert.notEqual(sameA.broken.length,different.broken.length);
  assert.notDeepEqual([...a.edges.values()].map(e=>e.strength),[...other.edges.values()].map(e=>e.strength));
});

test('impact stress is strongest nearest the strike and decays through a bounded graph walk',()=>{
  const samples=makeSupportedRockSamples(),domain=rockDomain(9212026),graph=buildRockBondGraph(samples,domain,ROCK_PROFILE),
    result=impactRockStructure(graph,emptyRockStructure(),[0,4,-1.55],domain,ROCK_PROFILE),values=Object.values(result.state.stress),
    bounded={...ROCK_PROFILE,maxStressNodes:2,maxStressBonds:3},boundedGraph=buildRockBondGraph(samples,domain,bounded),
    limited=impactRockStructure(boundedGraph,emptyRockStructure(),[0,4,-1.55],domain,bounded);
  assert.ok(result.visitedNodes<=ROCK_PROFILE.maxStressNodes);assert.ok(result.propagatedBonds<=ROCK_PROFILE.maxStressBonds);
  assert.ok(values.length>0&&values.length<=ROCK_PROFILE.maxStressBonds);assert.ok(Math.max(...values)<=ROCK_PROFILE.impactEnergy+1e-8);
  assert.ok(Math.max(...values)-Math.min(...values)>ROCK_PROFILE.impactEnergy*.2);
  assert.ok([...graph.edges.keys()].some(id=>result.state.stress[id]===undefined),'distant unrelated bonds remain untouched');
  assert.ok(limited.visitedNodes<=bounded.maxStressNodes);assert.ok(limited.propagatedBonds<=bounded.maxStressBonds);
  assert.ok(Object.keys(limited.state.stress).length<=bounded.maxStressBonds);
});

test('narrow contacts weaken bonds and the same hit fails a weak neck before a wide bond',()=>{
  const samples=makeSupportedRockSamples(),domain=rockDomain(9212026),weakProfile={...ROCK_PROFILE,thinConnectionPenalty:.1,unsupportedPenalty:1,impactEnergy:.35,breakThreshold:1},
    strongProfile={...weakProfile,thinConnectionPenalty:1},weakGraph=buildRockBondGraph(samples,domain,weakProfile),
    strongGraph=buildRockBondGraph(samples,domain,strongProfile),weakEdge=[...weakGraph.edges.values()].filter(e=>e.contacts<=2).sort((a,b)=>a.contacts-b.contacts)[0],
    strongEdge=strongGraph.edges.get(weakEdge.id),hit=weakGraph.nodes.get(weakEdge.a).centroid,
    weak=impactRockStructure(weakGraph,emptyRockStructure(),hit,domain,weakProfile),strong=impactRockStructure(strongGraph,emptyRockStructure(),hit,domain,strongProfile);
  assert.ok(weakEdge.strength<strongEdge.strength);assert.ok(weak.newlyBroken.includes(weakEdge.id));assert.ok(!strong.newlyBroken.includes(strongEdge.id));
});

test('stress and broken bonds survive literal state serialization and validation',()=>{
  const structure=evolve(9212026,sequence),state=createInitialRockState();state.world.structure=structure;
  const loaded=validateCellularState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(loaded.world.structure,structure);
  const broken=loaded.world.structure.broken[0];assert.ok(broken);assert.ok(loaded.world.structure.stress[broken]>0);
});
