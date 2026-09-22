import test from 'node:test';
import assert from 'node:assert/strict';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { emptyState, validateState } from '../lab/voxel/persistence.js';
import { unsupportedWood } from '../lab/voxel/support.js';
import { LAB } from '../lab/voxel/config.js';
import { generateSmoothPadded } from '../lab/voxel/generator.js';
import { index3 } from '../lab/voxel/coordinates.js';

const postMeters=[-1.5,2.5,-2.5];
function fixture(spacing, save=async()=>{}) { return new LabWorldState({ save },emptyState({mode:'smooth',spacing})); }
function postCell(spacing) { return postMeters.map(v=>Math.round(v/spacing)); }
function supported(world,spacing) { return unsupportedWood((...p)=>world.read(...p),()=>true,LAB.maxDebrisVoxels,spacing); }

test('smooth state: both density resolutions cut the SDF bridge into one bounded durable actor',async()=>{
  for(const spacing of [.5,.25]) {
    let saved;const world=fixture(spacing,async state=>{saved=structuredClone(state);});const cell=postCell(spacing);
    assert.equal(world.read(...cell),3,`${spacing}m fixture exposes a wood post`);
    assert.deepEqual(supported(world,spacing),[],`${spacing}m bridge begins supported`);
    const result=await world.mine(cell,'axe',()=>true,{center:postMeters,radius:.8});
    assert.equal(result.detached,1);assert.equal(world.state.actors.length,1);const actor=world.state.actors[0];
    assert.equal(actor.mode,'smooth');assert.equal(actor.spacing,spacing);assert.ok(actor.cells.length>0&&actor.cells.length<=LAB.maxDebrisVoxels,'detached component stays within cap');assert.equal(world.read(...cell),0,'the cut source is removed');
    assert.ok(actor.cells.every(p=>world.readDensity(...p)>=0),'detached source density is removed before the save commits');
    validateState(saved);const restored=fixture(spacing,async()=>{});restored.state=structuredClone(saved);assert.deepEqual(restored.state,world.state,'density edits and exact actor snapshot round-trip');
  }
});

test('smooth state: a failed durability write leaves the spherical cut and debris ownership atomic',async()=>{
  const spacing=.5,world=fixture(spacing,async()=>{throw new Error('quota');}),before=structuredClone(world.state),cell=postCell(spacing);
  await assert.rejects(world.mine(cell,'axe',()=>true,{center:postMeters,radius:.8}),/quota/);
  assert.deepEqual(world.state,before);assert.equal(world.read(...cell),3);assert.deepEqual(supported(world,spacing),[]);
});

test('smooth generated scalar/material shells agree across negative borders after persisted edits',()=>{
 for(const spacing of [.5,.25])for(const size of [16,32]){
  const n=size+2,edits={'0,-1,-1':0},densityEdits={'0,-1,-1':.625},a=generateSmoothPadded(size,[-1,-1,-1],LAB.seed,spacing,edits,densityEdits);
  for(let axis=0;axis<3;axis++){
   const chunk=[-1,-1,-1];chunk[axis]++;const b=generateSmoothPadded(size,chunk,LAB.seed,spacing,edits,densityEdits);
   for(let u=0;u<n;u++)for(let v=0;v<n;v++)for(const [pa,pb]of [[size+1,1],[size,0]]){
    const p=[0,0,0],q=[0,0,0];p[axis]=pa;q[axis]=pb;p[(axis+1)%3]=q[(axis+1)%3]=u;p[(axis+2)%3]=q[(axis+2)%3]=v;
    assert.equal(a.densities[index3(...p,n)],b.densities[index3(...q,n)]);assert.equal(a.materials[index3(...p,n)],b.materials[index3(...q,n)]);
   }
  }
  assert.equal(a.densities[index3(size+1,size,size,n)],.625);
 }
});
