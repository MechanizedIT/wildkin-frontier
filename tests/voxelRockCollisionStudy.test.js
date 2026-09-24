import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier.js';
import { collisionStudyFixtures, planOccupancyColliders, planEightSectorControl } from '../lab/voxel/rock-collision-study.js';
import { planRockColliders } from '../lab/voxel/matter-colliders.js';
import { CellularRockPhysics, auditPreparedRockCollision } from '../lab/voxel/matter-physics.js';

let fixtures;
const fixture=name=>(fixtures??=collisionStudyFixtures()).find(f=>f.name===name);
test('named 2.86 m cut and conditioned child reproduce the existing collider HOLD without publication',async()=>{
  await R.init();
  for(const [name,expected] of [['central-cut-2',2.85550655],['conditioned-child-0',2.45175347]]){
    const f=fixture(name),physics=new CellularRockPhysics(R);
    try{
      const colliders=planRockColliders(f.mesh,f.record.localCOM).map(p=>physics.world.createCollider(R.ColliderDesc.convexHull(p)));
      const audit=auditPreparedRockCollision(R,f.mesh,f.record,colliders);
      assert.ok(Math.abs(audit.maxGap-expected)<1e-4);assert.equal(audit.passes,false);
      colliders.forEach(c=>physics.world.removeCollider(c,false));
      const before=JSON.stringify(f.record);
      assert.throws(()=>physics.prepareActor(f.record,f.mesh),/visible-surface gate/);
      assert.equal(physics.actors.size,0);assert.equal(physics.world.bodies.len(),0);
      assert.equal(JSON.stringify(f.record),before);
    }finally{physics.dispose();}
  }
});
test('tight eight-sector reconstruction exposes initial missing support instead of admitting its improved child',async()=>{
  await R.init();const f=fixture('initial-detached'),world=new R.World({x:0,y:0,z:0});
  try{
    const colliders=planEightSectorControl(f.mesh,f.record.localCOM,.1).map(p=>world.createCollider(R.ColliderDesc.convexHull(p)));
    const audit=auditPreparedRockCollision(R,f.mesh,f.record,colliders);
    assert.equal(audit.passes,false);assert.equal(audit.maxGap,Infinity);
  }finally{world.free();}
});
test('occupancy study is deterministic, stays within existing hull/vertex budgets, and leaves its source immutable',()=>{
  for(const name of ['initial-detached','central-cut-2','conditioned-child-0','conditioned-child-1']){
    const f=fixture(name),before=Array.from(f.sample.densities);
    for(const method of ['occupancy-median','occupancy-gap','occupancy-voronoi']){
      const first=planOccupancyColliders(f.mesh,f.sample,method),second=planOccupancyColliders(f.mesh,f.sample,method);
      assert.ok(first.length>0&&first.length<=8);assert.ok(first.every(p=>p.length>=12&&p.length<=192));
      assert.deepEqual(first,second);assert.deepEqual(Array.from(f.sample.densities),before);
    }
  }
});
