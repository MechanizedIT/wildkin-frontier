import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RESOURCE_TYPES, HARVEST_CONFIG, createVisualAssetResourceType } from '../src/resources/resourceConfig.js';
import { getHarvestInteractionPoint, isHarvestableInRange, selectTargets, shouldShowHalo, isPlayerInsideColliderVolume } from '../src/resources/harvestLogic.js';
import { createResourceSystem, createRuntimeResourcePlacements } from '../src/resources/resourceSystem.js';
import { createParticleSystem } from '../src/resources/particleSystem.js';
import { normalizeCampaignHarvestCollision, CAMPAIGN_HARVEST_FOOTPRINTS } from '../tools/normalize-harvest-collision.mjs';

const crystalBox={shape:'box',size:{w:.95,h:1.55,d:.8},offset:{x:0,y:.775,z:0}};
const asset=(id,dropId,collision=crystalBox)=>({id,displayName:id,collision,gameplay:{role:'harvestable',harvestable:{dropId,maxChunks:4,respawnSeconds:2,feedbackProfile:'stone'}}});
const crystalType=createVisualAssetResourceType(asset('test_crystal','crystal_shard'));
function pureNode(type=crystalType,position={x:0,y:0,z:0},scale=1.3){return {type,state:{position,uniformScale:scale,rotationY:0,nodeState:'READY',remainingChunks:4}};}
function physicsMock(){let serial=0;const live=new Set();return {live,world:{step(){},createCollider(desc){const c={handle:++serial,desc};live.add(c);return c;},removeCollider(c){live.delete(c);}},RAPIER:{ActiveCollisionTypes:{ALL:0xffffffff},ColliderDesc:{cuboid(x,y,z){return {half:{x,y,z},setTranslation(x,y,z){this.center={x,y,z};return this;},setRotation(q){this.rotation=q;return this;},setFriction(){return this;},setActiveCollisionTypes(){return this;}};}}}};}
function placement(id,type=crystalType,extra={}){return {id,type:'rock',resourceType:{...type,visualAsset:undefined},pos:{x:0,y:0,z:0},uniformScale:1.3,regionId:'test_region',...extra};}

test('scaled strike point keeps comfortable Heartwood reach and true vertical rejection for solid siblings',()=>{
  const p={x:1.443,y:.522,z:0},node=pureNode();
  assert.ok(Math.hypot(p.x,crystalType.interactionHeight*1.3-p.y)>HARVEST_CONFIG.harvestRadius,'original elevated target missed the reported approach');
  assert.deepEqual(getHarvestInteractionPoint(node),{x:0,y:.85,z:0});
  assert.equal(isHarvestableInRange(node,p),true);
  assert.deepEqual(selectTargets([node],p,'IDLE',0,true),[node]);
  assert.equal(shouldShowHalo(node,p,'RUN',4,true),true);
  for(const type of [RESOURCE_TYPES.tree,RESOURCE_TYPES.rock,crystalType,createVisualAssetResourceType(asset('test_ore','iron_ore'))]){
    const high=pureNode(type,{x:0,y:2.4,z:0},1.6);
    assert.equal(isHarvestableInRange(high,{x:.3,y:.522,z:0}),false);
    assert.equal(isHarvestableInRange(high,{x:1.44,y:2.922,z:0}),true);
  }
  assert.equal(getHarvestInteractionPoint(pureNode(RESOURCE_TYPES.fiber,{x:0,y:1,z:0},.8)).y,1.28,'small plants preserve their scaled target');
});

test('runtime manual, auto, halos and harvest effects share the same point; combat burst height stays intact',()=>{
  const scene=new THREE.Scene(),system=createResourceSystem(scene,physicsMock(),[
    placement('crystal'),placement('ore',createVisualAssetResourceType(asset('test_ore','iron_ore')),{pos:{x:.25,y:0,z:0}}),
    placement('upper',crystalType,{pos:{x:.25,y:2.4,z:0}}),placement('other',crystalType,{regionId:'other'}),
  ]);
  system.setActiveRegions(new Set(['test_region']));
  const p={x:1.443,y:.522,z:0},manual=system.getManualTargets(p);
  assert.deepEqual(manual.map(n=>n.id),['ore','crystal']);
  assert.deepEqual(system.getEligibleNodes(p,'IDLE',0,true),manual);
  assert.deepEqual(system.getHaloTargets(p,'RUN',4,true),manual);
  assert.deepEqual(system.getEligibleNodes(p,'RUN',4,true),[],'auto still requires stopping');
  assert.deepEqual(system.getHaloTargets(p,'IDLE',0,false),[]);
  const particles=createParticleSystem(new THREE.Scene());
  particles.spawnBurst(manual[0],4);
  assert.ok(particles._active.every(p=>p.mesh.position.y>=.85&&p.mesh.position.y<1.1));
  particles.spawnBurst({state:{position:{x:0,y:3,z:0}},type:{impactEffectHeight:.45,resourceId:'generic'}},1);
  assert.ok(particles._active.at(-1).mesh.position.y>=3.45&&particles._active.at(-1).mesh.position.y<3.7);
});

test('rotated scaled collider offsets protect occupied respawn volume and region lifecycle preserves explicit non-solid',()=>{
  const type={...crystalType,colliderHalfExtents:{x:.2,y:.5,z:.2},colliderCenterY:.5,colliderOffset:{x:2,y:.5,z:0},assetCollision:{shape:'box',size:{w:.4,h:1,d:.4},offset:{x:2,y:.5,z:0}}};
  const n=pureNode(type,{x:5,y:1,z:7});n.state.rotationY=Math.PI/2;
  const occupied={x:5,y:1.522,z:4.4},away={x:10,y:1.522,z:9};
  assert.equal(isPlayerInsideColliderVolume(occupied,n),true);
  assert.equal(isPlayerInsideColliderVolume({x:5,y:1.522,z:7},n),false);
  const physics=physicsMock(),system=createResourceSystem(new THREE.Scene(),physics,[placement('offset',type,{pos:{x:5,y:1,z:7},rotY:Math.PI/2}),placement('author_false',crystalType,{pos:{x:15,y:0,z:0},collisionEnabled:false})]);
  const solid=system.nodes[0],nonSolid=system.nodes[1];assert.equal(physics.live.size,1);
  while(solid.state.remainingChunks)system.applyHit(solid);
  assert.equal(physics.live.size,0);system.update(3,occupied,'IDLE',0,false);
  assert.equal(solid.state.nodeState,'READY');assert.equal(solid.collider,null);assert.equal(solid._pendingColliderRestore,true);
  system.update(.01,away,'IDLE',0,false);assert.ok(solid.collider);assert.equal(physics.live.size,1);
  system.setActiveRegions([]);assert.equal(physics.live.size,0);assert.equal(system.applyHit(solid),false);
  system.setActiveRegions(['test_region']);system.update(.01,away,'IDLE',0,false);assert.equal(physics.live.size,1);assert.equal(nonSolid.collider,null);
  while(nonSolid.state.remainingChunks)system.applyHit(nonSolid);
  system.update(3,away,'IDLE',0,false);assert.equal(nonSolid.state.nodeState,'READY');assert.equal(nonSolid.collider,null);assert.equal(physics.live.size,1);
});

test('campaign-only normalization opts valid solid siblings in; runtime preserves Author false and invalid/non-solid descriptors',()=>{
  const assets=[asset('crystal','crystal_shard'),asset('ore','iron_ore'),asset('tree','wood'),asset('stone','stone'),asset('fiber','fiber'),asset('invalid','stone',{...crystalBox,size:{w:NaN,h:1,d:1}}),asset('no_box','wood',null)];
  const world={visualAssets:assets,regions:[{id:'section',props:assets.map(a=>({id:`prop_${a.id}`,visualAssetId:a.id,collisionEnabled:false})),resources:[{id:'legacy_tree',type:'tree',collisionEnabled:false},{id:'legacy_rock',type:'rock',collisionEnabled:false},{id:'legacy_fiber',type:'fiber',collisionEnabled:false}]}]};
  const report=normalizeCampaignHarvestCollision(world);
  assert.equal(report.changed.length,6);assert.equal(report.skipped.length,2);
  assert.equal(world.regions[0].props.find(p=>p.id==='prop_fiber').collisionEnabled,false);
  assert.equal(world.regions[0].props.find(p=>p.id==='prop_invalid').collisionEnabled,false);
  assert.equal(world.regions[0].resources[2].collisionEnabled,false);
  assert.equal(normalizeCampaignHarvestCollision(world).changed.length,0,'normalization is idempotent');
  const draftPlacement=createRuntimeResourcePlacements([{id:'user_crystal',type:'rock',pos:{x:0,y:0,z:0},visualAsset:assets[0],collisionEnabled:false}])[0];
  assert.equal(draftPlacement.collisionEnabled,false);
});

test('large box surface targeting shares scale, yaw and offset with impacts and occupied volume, without reaching another floor',()=>{
  const box={shape:'box',size:{w:2.4,h:1.5,d:1},offset:{x:.6,y:.75,z:-.3}};
  const type=createVisualAssetResourceType(asset('large','stone',box)),node=pureNode(type,{x:5,y:2,z:7},1.5);
  node.state.rotationY=Math.PI/3;
  const rotation=new THREE.Matrix4().makeRotationY(node.state.rotationY);
  const world=(x,z)=>new THREE.Vector3((.6+x)*1.5,0,(-.3+z)*1.5).applyMatrix4(rotation).add(new THREE.Vector3(5,2.522,7));
  const p=world(1.85,.2),expected=world(1.2,.2);expected.y=2.85;
  const point=getHarvestInteractionPoint(node,p);
  assert.ok(new THREE.Vector3(point.x,point.y,point.z).distanceTo(expected)<1e-9);
  assert.equal(isHarvestableInRange(node,p),true);
  assert.equal(isHarvestableInRange(node,world(2,.2)),false,'surface reach does not add a full center radius beyond the broad base');
  assert.equal(isHarvestableInRange(node,{...p,y:.522}),false);
  assert.equal(isPlayerInsideColliderVolume(world(1.15,.2),node),true);
  assert.equal(isPlayerInsideColliderVolume(world(2,.2),node),false);
  const physics=physicsMock(),system=createResourceSystem(new THREE.Scene(),physics,[placement('large',type,{pos:node.state.position,uniformScale:1.5,rotY:node.state.rotationY})]);
  const manual=system.getManualTargets(p);assert.equal(manual.length,1);
  assert.deepEqual(system.getEligibleNodes(p,'IDLE',0,true),manual);
  assert.deepEqual(system.getHaloTargets(p,'IDLE',0,true),manual);
  const particles=createParticleSystem(new THREE.Scene());particles.spawnBurst(manual[0],5,p);
  assert.ok(particles._active.every(({mesh})=>Math.abs(mesh.position.x-point.x)<=.225&&Math.abs(mesh.position.z-point.z)<=.225&&mesh.position.y>=point.y&&mesh.position.y<point.y+.25));
  const small=pureNode(RESOURCE_TYPES.rock,{x:0,y:0,z:0},1);
  assert.equal(isHarvestableInRange(small,{x:1.8,y:.522,z:0}),false,'small rock retains center reach');
  node.collisionEnabled=false;assert.equal(getHarvestInteractionPoint(node,p).x,5,'explicit non-solid keeps center target');
  node.collisionEnabled=true;node.type={...type,colliderOffset:{x:.6,y:4,z:-.3}};
  assert.ok(getHarvestInteractionPoint(node,p).y>6,'elevated collider cannot be struck below its actual bottom');
});

test('reviewed campaign footprints cover grounded crystal and ore bases and remain idempotent',()=>{
  const world={visualAssets:[asset('asset_crystal','crystal_shard'),asset('asset_iron_ore_rock','iron_ore')],regions:[]};
  const report=normalizeCampaignHarvestCollision(world);assert.equal(report.footprints.length,2);
  for(const a of world.visualAssets)assert.deepEqual(a.collision,{shape:'box',...CAMPAIGN_HARVEST_FOOTPRINTS[a.id]});
  assert.equal(normalizeCampaignHarvestCollision(world).footprints.length,0);
  const c=world.visualAssets[0].collision,o=world.visualAssets[1].collision;
  assert.ok(c.offset.x-c.size.w/2<=-.9873&&c.offset.x+c.size.w/2>=1.0193&&c.offset.z-c.size.d/2<=-.7623&&c.offset.z+c.size.d/2>=.8104);
  assert.ok(o.offset.x-o.size.w/2<=-.6776&&o.offset.x+o.size.w/2>=.6025&&o.offset.z-o.size.d/2<=-.6935&&o.offset.z+o.size.d/2>=.5178);
});
