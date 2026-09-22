import test from 'node:test';
import assert from 'node:assert/strict';
import { raycastSmooth } from '../lab/voxel/smooth-raycast.js';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { emptyState } from '../lab/voxel/persistence.js';
function reader(fn, material=2) { return { density:(x,y,z)=>fn(x,y,z), material:(x,y,z)=>fn(x,y,z)<0?material:0 }; }
function close(a,b,e=.003){assert.ok(Math.abs(a-b)<=e,`${a} ~= ${b}`);}

test('smooth ray: hits interpolated plane across negative axis with physical spacing',()=>{
 const r=reader((x)=>x-3.25,3),hit=raycastSmooth([6.5,1.2,-4],[ -1,0,0],r.density,r.material,.5,7);
 assert.ok(hit);close(hit.point[0],1.625);close(hit.distance,4.875);assert.deepEqual(hit.cell,[3,2,-8]);assert.equal(hit.material,3);assert.ok(hit.normal[0]>.999);
});
test('smooth ray: sphere hit is curved, outward, and agrees from opposite directions',()=>{
 const c=[4.5,4.5,4.5],r=2.75,source=reader((x,y,z)=>Math.hypot(x-c[0],y-c[1],z-c[2])-r,1);
 const a=raycastSmooth([0,4.5,4.5],[1,0,0],source.density,source.material,1,10),b=raycastSmooth([9,4.5,4.5],[-1,0,0],source.density,source.material,1,10);
 assert.ok(a&&b);close(a.point[0],c[0]-r,.11);close(b.point[0],c[0]+r,.11);assert.ok(a.normal[0]<-.99&&b.normal[0]>.99);assert.equal(a.material,1);assert.equal(b.material,1);
});
test('smooth ray: boundary starts and empty rays remain stable',()=>{
 const source=reader((x,y,z)=>x+y+z-1.5,2),hit=raycastSmooth([0,0,0],[1,1,1],source.density,source.material,.25,3);
 assert.ok(hit);close(hit.distance,.216506,.01);assert.deepEqual(hit.cell,[0,0,0]);assert.equal(raycastSmooth([0,0,0],[1,0,0],()=>1,()=>0,1,5),null);
});
test('smooth ray: generator material and mining cell stay paired through sub-cell drift',async()=>{
 for(const spacing of [.5,.25]) for(const x of [.5,2.5]) for(const epsilon of [-.00001,.00001]) {
   const world=new LabWorldState({save:async()=>{}},emptyState({mode:'smooth',spacing})),direction=[0,-Math.sin(.35),-Math.cos(.35)],hit=raycastSmooth([x+epsilon,2.37,8],direction,(...p)=>world.readDensity(...p),(...p)=>world.read(...p),spacing,7);
   assert.ok(hit,`${spacing} ${x} ${epsilon} receives actual terrain hit`);assert.ok(hit.material>0);assert.equal(world.read(...hit.cell),hit.material,'the returned mining sample is solid and has the reported material');
   const result=await world.mine(hit.cell,'pick',()=>true,{center:hit.point.map((v,i)=>v+direction[i]*.35),radius:.8});assert.ok(result&&result.changed.length,'a native scalar hit resolves a real cut');
 }
});
