import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { address, affectedChunks, index3, raycastVoxel, toGlobal, toLocal } from '../lab/voxel/coordinates.js';
import { createGenerator, generatePadded, hashBytes } from '../lab/voxel/generator.js';
import { unsupportedWood } from '../lab/voxel/support.js';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { emptyState, validateState } from '../lab/voxel/persistence.js';
import { LabPhysics } from '../lab/voxel/physics.js';
import { publishBatch } from '../lab/voxel/publication.js';
import { meshGreedy } from '../lab/voxel/js-mesher.js';

test('voxel lab: negative cubic address round trips all axes and exact borders',()=>{
  for(const size of [16,32])for(const x of [-1000001,-65,-33,-32,-17,-16,-1,0,15,16,31,32,1000001])for(const y of [-33,-1,0,32])for(const z of [-32,-1,0,31]){
    const a=address(x,y,z,size);assert.deepEqual(a.chunk.map((v,i)=>v*size+a.local[i]),[x,y,z]);assert.ok(a.local.every(v=>v>=0&&v<size));
  }
  assert.throws(()=>address(1.5,0,0,16));assert.throws(()=>address(Number.MAX_SAFE_INTEGER+1,0,0,16));
  assert.equal(affectedChunks(0,0,0,16).length,8);assert.equal(affectedChunks(-1,-1,-1,16).length,8);assert.equal(affectedChunks(3,4,5,16).length,1);
});
test('voxel lab: greedy surfaces have correct area, all six winding signs and no internal seam faces',()=>{
  for(const size of [16,32]){
    const n=size+2,voxels=new Uint8Array(n**3);
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++)voxels[index3(x+1,y+1,z+1,n)]=1;
    const mesh=meshGreedy({size,voxels});assert.equal(mesh.indices.length,36);
    let area=0;
    for(let i=0;i<mesh.indices.length;i+=3){
      const ids=[...mesh.indices.slice(i,i+3)],p=ids.map(id=>[...mesh.positions.slice(id*3,id*3+3)]),a=p[1].map((v,j)=>v-p[0][j]),b=p[2].map((v,j)=>v-p[0][j]),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      area+=Math.hypot(...cross)/2;assert.ok(cross.reduce((s,v,j)=>s+v*mesh.normals[ids[0]*3+j],0)>0);
    }
    assert.equal(area,6*size*size);voxels.fill(1);assert.equal(meshGreedy({size,voxels}).indices.length,0);
    // Neighbour on +X owns the shared occupied boundary: no hidden face remains.
    voxels.fill(0);for(let z=1;z<=size;z++)for(let y=1;y<=size;y++)for(let x=1;x<=size+1;x++)voxels[index3(x,y,z,n)]=1;
    const seam=meshGreedy({size,voxels});assert.ok(!Array.from({length:seam.normals.length/3},(_,i)=>seam.normals[i*3]).includes(1));
  }
});
test('voxel lab: seeded padded shells agree on every positive and negative axis',()=>{
  for(const size of [16,32]){
    const n=size+2,a=generatePadded(size,[-1,-1,-1],9212026);
    for(let axis=0;axis<3;axis++){
      const c=[-1,-1,-1];c[axis]++;const b=generatePadded(size,c,9212026);
      for(let u=0;u<n;u++)for(let v=0;v<n;v++){
        const p=[0,0,0],q=[0,0,0];p[axis]=size+1;q[axis]=1;p[(axis+1)%3]=q[(axis+1)%3]=u;p[(axis+2)%3]=q[(axis+2)%3]=v;
        assert.equal(a[index3(...p,n)],b[index3(...q,n)]);
        p[axis]=size;q[axis]=0;assert.equal(a[index3(...p,n)],b[index3(...q,n)]);
      }
    }
    assert.equal(hashBytes(a),hashBytes(generatePadded(size,[-1,-1,-1],9212026)));
    assert.notEqual(hashBytes(a),hashBytes(generatePadded(size,[-1,-1,-1],9212027)));
  }
});
test('voxel lab: DDA selects negative cells, axis-aligned and tied edge rays',()=>{
  const read=(x,y,z)=>x===-2&&y===-2&&z===-2?2:0;
  assert.deepEqual(raycastVoxel([-0.5,-1.5,-1.5],[-1,0,0],read).cell,[-2,-2,-2]);
  assert.deepEqual(raycastVoxel([0.5,0.5,0.5],[-1,-1,-1],read).cell,[-2,-2,-2]);
  assert.equal(raycastVoxel([0,0,0],[0,0,0],read),null);assert.equal(raycastVoxel([0,0,0],[1,0,0],read),null);
});
test('voxel lab: bridge is supported until cut; unloaded boundaries fail safely',()=>{
  const base=createGenerator(),read=(x,y,z)=>x===-2&&y===2&&z===-3?0:base(x,y,z);
  assert.equal(unsupportedWood(base).length,0);
  const detached=unsupportedWood(read);assert.equal(detached.length,1);assert.equal(detached[0].length,25);
  assert.equal(unsupportedWood(read,()=>false).length,0);assert.equal(unsupportedWood(read,()=>true,8).length,0);
});
test('voxel lab: failed save preserves voxel, drop and actor ownership; serialized edits reload exactly',async()=>{
  let durable,fail=true;const world=new LabWorldState({save:async next=>{if(fail)throw new Error('quota');durable=structuredClone(next);}});
  await assert.rejects(world.mine([-2,2,-3],'axe'),/quota/);assert.equal(world.state.revision,0);assert.equal(world.read(-2,2,-3),3);assert.equal(world.state.actors.length,0);
  fail=false;await assert.rejects(world.mine([-2,2,-3],'pick'),/needs the axe/);
  await Promise.all([world.mine([-2,2,-3],'axe'),world.mine([0,1,5],'pick'),world.mine([2,1,5],'pick')]);
  assert.equal(world.state.revision,3);assert.equal(world.state.actors.length,1);assert.equal(world.state.drops.length,3);
  const restored=new LabWorldState({save:async()=>{}},structuredClone(durable));assert.deepEqual(restored.state,world.state);assert.equal(restored.read(-2,2,-3),0);
  await restored.collect([1,1,5]);assert.equal(restored.state.inventory['Stone chips'],1);assert.equal(restored.state.inventory['Clay clods'],1);
  await restored.collect([1,1,5]);assert.equal(restored.state.inventory['Stone chips'],1);
  assert.throws(()=>validateState({...emptyState(),edits:{'nope':0}}));
});
test('voxel lab: live Rapier walk, collider replacement, unsupported body and atomic origin transform',async()=>{
  await RAPIER.init();const physics=new LabPhysics(RAPIER);
  const plane={positions:new Float32Array([-20,1,-20,20,1,-20,20,1,20,-20,1,20]),indices:new Uint32Array([0,2,1,0,3,2])};
  physics.replace('floor',[0,0,0],16,plane,1);
  for(let i=0;i<120;i++)physics.step({z:-1});
  assert.ok(physics.grounded);assert.ok(physics.playerGlobal()[2]<8.1);assert.ok(Math.abs(physics.playerGlobal()[1]-1.82)<0.1);
  physics.syncActors([{id:'one',cells:[[0,4,0],[1,4,0]],position:[1,4.5,0.5],rotation:{x:0,y:0,z:0,w:1},status:'ACTIVE'}]);
  const before=physics.playerGlobal(),actorBefore=physics.poses()[0].position;
  physics.shiftOrigin([256,-256,256]);assert.ok(physics.playerGlobal().every((v,i)=>Math.abs(v-before[i])<0.0001));assert.ok(physics.poses()[0].position.every((v,i)=>Math.abs(v-actorBefore[i])<0.0001));
  assert.deepEqual(toGlobal(toLocal([-1000000,1000000,-32],[256,-256,256]),[256,-256,256]),[-1000000,1000000,-32]);
  for(let i=0;i<240;i++)physics.step();
  assert.ok(physics.poses()[0].position[1]<2);assert.equal(physics.actors.size,1);assert.equal(physics.actors.get('one').body.numColliders(),2);
  physics.replace('floor',[0,0,0],16,{positions:new Float32Array(),indices:new Uint32Array()},2);
  const y=physics.playerGlobal()[1];for(let i=0;i<40;i++)physics.step();assert.ok(physics.playerGlobal()[1]<y-1);assert.equal(physics.chunks.get('floor').revision,2);physics.dispose();
});
test('voxel lab: failed neighbouring collider preparation leaves the whole batch intact and retryable',async()=>{
  await RAPIER.init();const physics=new LabPhysics(RAPIER);
  const plane={positions:new Float32Array([0,0,0,1,0,0,0,0,1]),indices:new Uint32Array([0,2,1])};
  const entries=[{key:'a',chunk:[0,0,0],meshRevision:1},{key:'b',chunk:[1,0,0],meshRevision:1}];
  for(const e of entries)physics.replace(e.key,e.chunk,16,plane,1);
  let fail=true,committed=0;
  const callbacks={prepare:e=>{if(fail&&e.key==='b')throw new Error('forced allocation failure');return physics.prepare(e.chunk,16,plane,2);},discard:p=>physics.discard(p),commit:(e,p)=>{physics.commit(e.key,p);e.meshRevision=2;committed++;}};
  assert.equal(publishBatch(entries,callbacks).ok,false);assert.equal(committed,0);assert.ok(entries.every(e=>e.meshRevision===1&&physics.chunks.get(e.key).revision===1));assert.equal(physics.world.colliders.len(),3);
  fail=false;assert.equal(publishBatch(entries,callbacks).ok,true);assert.equal(committed,2);assert.ok(entries.every(e=>e.meshRevision===2&&physics.chunks.get(e.key).revision===2));assert.equal(physics.world.colliders.len(),3);physics.dispose();
});
