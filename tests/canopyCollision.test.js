import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.generated.js';
import {registerEcologyAssets} from '../tools/register-ecology-assets.mjs';
import {describeVisualAssetCollider,getColliderCenter,getColliderHalfExtents} from '../src/world/colliderDescriptor.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {createPhysicsWorld} from '../src/physics/createPhysicsWorld.js';

await RAPIER.init();
test('all canopy variants have solid scaled trunks, clear canopy shoulders, and retain explicit scenery flags',()=>{
  const data=structuredClone(WORLD_DATA),placements=JSON.stringify(data.regions.map(r=>r.props));
  registerEcologyAssets(data);registerEcologyAssets(data);
  assert.equal(JSON.stringify(data.regions.map(r=>r.props)),placements,'registry never flips authored scenery flags');
  const physics=new RAPIER.World({x:0,y:0,z:0});
  try{
    for(const [i,id] of ['asset_verge_canopy','asset_verge_canopy_tall','asset_verge_canopy_spread'].entries()){
      const asset=data.visualAssets.find(a=>a.id===id),position={x:i*10,y:2,z:0};
      const descriptor=describeVisualAssetCollider({collision:asset.collision,position,uniformScale:2,rotationY:Math.PI/4});
      const center=getColliderCenter(descriptor),half=getColliderHalfExtents(descriptor);
      assert.equal(descriptor.size.height,4.9);assert.equal(center.y,4.45);
      physics.createCollider(RAPIER.ColliderDesc.cuboid(half.x,half.y,half.z).setTranslation(center.x,center.y,center.z).setRotation({x:0,y:Math.sin(Math.PI/8),z:0,w:Math.cos(Math.PI/8)}));
      assert.equal(describeVisualAssetCollider({collision:asset.collision,position,enabled:false}).enabled,false);
    }
    physics.step();
    for(const x of [0,10,20]){
      assert.ok(physics.castRay(new RAPIER.Ray({x,y:3,z:4},{x:0,y:0,z:-1}),8,true),'walking height sees the rotated trunk');
      assert.equal(physics.castRay(new RAPIER.Ray({x:x+2,y:3,z:4},{x:0,y:0,z:-1}),8,true),null,'space beneath wide leaves remains open');
      assert.equal(physics.castRay(new RAPIER.Ray({x,y:7,z:4},{x:0,y:0,z:-1}),8,true),null,'collider does not extend into the crown');
    }
  }finally{physics.free();}
});

test('canopy trunk colliders remain gameplay-solid while every canopy family stays fade-only for camera collision',()=>{
  const obstacles=['asset_verge_canopy','asset_verge_canopy_tall','asset_verge_canopy_spread'].map((visualAssetId,index)=>({
    id:`canopy-${index}`, visualAssetId, x:index*3, z:0, w:1, h:1, height:3, baseY:0,
  }));
  obstacles.push({id:'stone-solid',visualAssetId:'asset_fen_stone',x:12,z:0,w:1,h:1,height:2,baseY:0});
  const physics=createPhysicsWorld(RAPIER,{obstacles,platforms:[],groundPatches:[],terrainSurfaces:[],boundaries:[]});
  try {
    assert.equal(physics.staticColliders.length,6,'fallback and safety floors plus each authored trunk and ordinary solid are gameplay colliders');
    assert.equal(physics.cameraColliders.size,3,'only floors and ordinary solid are camera blockers');
    for(const x of [0,3,6])assert.ok(physics.world.castRay(new RAPIER.Ray({x,y:1,z:3},{x:0,y:0,z:-1}),6,true),'player physics still blocks on each canopy trunk');
  } finally { physics.world.free(); }
});
