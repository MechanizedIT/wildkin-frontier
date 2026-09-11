import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {createPickupSystem} from '../src/resources/pickupSystem.js';
import {createResourceSystem} from '../src/resources/resourceSystem.js';
import {RESOURCE_TYPES} from '../src/resources/resourceConfig.js';
import {pickupInventoryFixture} from './helpers/pickupInventoryFixture.js';
const makeNode=(index=0,regionId='A')=>({id:`source_${index}`,index,regionId,type:RESOURCE_TYPES.fiber,state:{position:{x:index*10,y:0,z:0}},collider:null});

test('full pack and failed commit keep one pending source; partial bonus acceptance spends only committed quantity',()=>{
 const f=pickupInventoryFixture(undefined,1);f.slots=[{id:'fiber',count:19}];const messages=[];
 const ps=createPickupSystem(new THREE.Scene(),null,null,null,{inventory:f.inventory,onCollectionBlocked:r=>messages.push(r)}),node=makeNode();
 const p=ps.spawnPickup(node);assert.equal(ps.spawnPickup(node),p);assert.deepEqual(ps.getPendingYields()[0].resources,{fiber:2});
 f.fail=true;assert.equal(ps.collectPickup(p),false);assert.equal(p.collected,false);assert.equal(f.inventory.getResources().fiber,19);assert.equal(f.gathered,0);assert.equal(ps.hasPendingYield(node),true);
 f.fail=false;assert.equal(ps.collectPickup(p),false);assert.equal(f.inventory.getResources().fiber,20);assert.equal(f.gathered,1);assert.deepEqual(ps.getPendingYields()[0].resources,{fiber:1});
 assert.equal(ps.collectPickup(p),false);assert.equal(f.gathered,1);assert.equal(p.collected,false);assert.equal(ps.spendInventory({fiber:1}),true);
 assert.equal(ps.collectPickup(p),true);assert.equal(ps.collectPickup(p),false);assert.equal(f.inventory.getResources().fiber,20);assert.equal(f.gathered,2);assert.equal(ps.hasPendingYield(node),false);
 assert.deepEqual(messages,['storage-write-failed','full']);
 const snapshot=ps.getInventory();snapshot.fiber=0;ps.resetInventory();assert.equal(ps.getInventory().fiber,20);assert.equal('inventory'in ps,false);
});

test('pool cap, expiry and region cull retain source yields; explicit run abandonment never resets pack',()=>{
 const f=pickupInventoryFixture(),ps=createPickupSystem(new THREE.Scene(),null,null,null,{inventory:f.inventory});const nodes=Array.from({length:40},(_,i)=>makeNode(i));
 for(const node of nodes)ps.spawnPickup(node);assert.equal(ps.getCount(),32);assert.equal(ps.getDebug().pendingSources,40);assert(ps.getPooledCount()<=24);
 const old=ps.getPickups()[0];ps.cullInactiveRegions(new Set(['B']));assert.equal(ps.getCount(),0);assert.equal(ps.getDebug().pendingSources,40);assert.equal(ps.collectPickup(old),false);
 ps.cullInactiveRegions(new Set(['A']));ps.update(0,{x:0,y:.5,z:0});assert.equal(ps.getCount(),1);assert.equal(ps.getPickups()[0].nodeIndex,0);
 const expired=ps.getPickups()[0];expired.age=31;ps.update(0,{x:0,y:.5,z:0});assert.equal(ps.getCount(),0);assert.equal(ps.hasPendingYield(nodes[0]),true);
 ps.update(0,{x:0,y:.5,z:0});assert.equal(ps.getCount(),1);assert.equal(ps.collectPickup(ps.getPickups()[0]),true);assert.equal(f.gathered,1);
 ps.clear();assert.equal(ps.getCount(),0);assert.equal(ps.getDebug().pendingSources,39);
 ps.clear({discardPending:true});assert.equal(ps.getDebug().pendingSources,0);assert.equal(ps.getInventory().fiber,1);assert(ps.getPooledCount()<=24);
});

test('all harvest entry paths and regrowth pause for pending yield, including inactive reset and solid siblings',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
 try{const f=pickupInventoryFixture(),ps=createPickupSystem(new THREE.Scene(),null,null,null,{inventory:f.inventory});
 const rs=createResourceSystem(new THREE.Scene(),{world,RAPIER},['tree','rock','fiber'].map((type,i)=>({id:type,type,regionId:'A',pos:{x:i*5,y:0,z:0}})),{hasPendingYield:ps.hasPendingYield});
 for(const n of rs.nodes){const pos={...n.state.position,y:.5};assert.equal(rs.applyHit(n,node=>{ps.spawnPickup(node);ps.spawnPickup(node)}),true);const remaining=n.state.remainingChunks;
 assert.equal(rs.applyHit(n,ps.spawnPickup),false);assert.equal(n.state.remainingChunks,remaining);assert.equal(rs.isHarvestableInRange(n,pos),false);assert.equal(rs.canAutoHarvestNow(n,pos,'IDLE'),false);assert.equal(rs.getManualTargets(pos).includes(n),false);assert.equal(rs.getHaloTargets(pos,'IDLE').includes(n),false);
 assert.equal(ps.collectPickup(ps.getPickups().find(p=>p.nodeIndex===n.index)),true);
 while(n.state.remainingChunks>0){assert.equal(rs.applyHit(n,ps.spawnPickup),true);if(n.state.remainingChunks>0)ps.collectPickup(ps.getPickups().find(p=>p.nodeIndex===n.index));}
 const timer=n.state.respawnRemaining;rs.update(timer+1,{x:50,y:.5,z:50},'IDLE');assert.equal(n.state.nodeState,'RESPAWNING');assert.equal(n.state.respawnRemaining,timer);rs.setActiveRegions(['B']);rs.resetDepleted();assert.equal(n.state.nodeState,'RESPAWNING');rs.setActiveRegions(['A']);
 ps.collectPickup(ps.getPickups().find(p=>p.nodeIndex===n.index));rs.update(timer+1,{x:50,y:.5,z:50},'IDLE');assert.equal(n.state.nodeState,'READY');assert.equal(n.state.remainingChunks,n.type.maxChunks);if(n.type.solid)assert(n.collider);
 }
 }finally{world.free()}
});

test('missing inventory injection rejects collection rather than creating legacy spendable quantities',()=>{
 const ps=createPickupSystem(new THREE.Scene()),node=makeNode(),p=ps.spawnPickup(node);assert.equal(ps.collectPickup(p),false);assert.equal(p.collected,false);assert.equal(ps.hasPendingYield(node),true);assert.equal(ps.getInventory().fiber,0);assert.equal(ps.spendInventory({fiber:1}),false);
});
