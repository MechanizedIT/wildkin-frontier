import test from 'node:test';
import assert from 'node:assert/strict';
import {createRootfallPassage} from '../src/world/rootfallPassage.js';
import {ROOTFALL_CONFIG as C,rootfallPoint} from '../src/world/rootfallConfig.js';
import {createPortalGateSystem} from '../src/world/portalGateSystem.js';
import {createFrontierProgress} from '../src/save/frontierProgress.js';

function fixture(run){
  const prior=globalThis.localStorage,store=new Map();let fail=false;
  globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('quota');store.set(key,value);}};
  const progress=createFrontierProgress();progress.load();
  const gate={id:C.gateId,sectionId:C.sectionId,state:'ruined',pos:{x:0,y:1.35,z:-34},rotY:0,uniformScale:1,triggerRadius:1.85,requirements:{resources:C.braceCost}};
  const leftRoot={id:C.props.left,pos:{x:0,y:1.35,z:-31},rotY:0,uniformScale:1};
  const nodes=C.cutIds.map(id=>({id,state:{remainingChunks:3,nodeState:'READY'}})),masks=new Map(),notices=[];
  const registry={getPortalGateById:id=>id===gate.id?gate:null,getPortalGatesForSection:()=>[gate],getSectionById:()=>({props:[leftRoot]})};
  let section=C.sectionId,pos=rootfallPoint(gate,C.braceAnchor),travelled=0,passage;
  const portals=createPortalGateSystem(registry,{frontierProgress:progress,getActiveSectionId:()=>section,getCargo:()=>progress.getPackResourceCounts(),getPlayerLevel:()=>1,onTravel:()=>++travelled,
    hideRepairInteraction:g=>g.id===C.gateId&&passage.enabled,checkAccess:(g,action)=>passage.access(action)});
  passage=createRootfallPassage({registry,progress,resources:{getNodes:()=>nodes,setRemovedResourceIds:(ids,owner)=>masks.set(owner,[...ids])},getSectionId:()=>section,getPlayerPosition:()=>pos,repairGate:portals.repair,notify:(...a)=>notices.push(a)});
  const hit=node=>{if(!passage.beforeHit(node))return false;node.state.remainingChunks--;passage.afterHit(node);return true;};
  try{run({progress,gate,leftRoot,nodes,masks,notices,passage,portals,hit,fail:value=>fail=value,setSection:value=>section=value,setPosition:value=>pos=value,getTravelled:()=>travelled,store});}
  finally{globalThis.localStorage=prior;}
}

test('Rootfall cuts persist before final yield and repair is guarded, atomic and repeat-safe',()=>fixture(f=>{
  assert.equal(f.portals.repair(C.gateId).reason,'cut-roots-first');
  assert.equal(f.portals.getNearbyInteraction(f.gate.pos),null);
  for(const node of f.nodes){
    assert.equal(f.hit(node),true);assert.equal(f.hit(node),true);
    f.fail(true);assert.equal(f.hit(node),false);assert.equal(node.state.remainingChunks,1);assert.ok(!f.progress.getState().completedPoiIds.includes(node.id));
    f.fail(false);assert.equal(f.hit(node),true);assert.ok(f.progress.getState().completedPoiIds.includes(node.id));assert.ok(f.masks.get('rootfall').includes(node.id));
  }
  assert.equal(f.passage.getState().ready,true);
  f.progress.collectResources(C.braceCost);
  const before=f.progress.getState();f.fail(true);assert.equal(f.passage.activate().reason,'commit-failed');assert.deepEqual(f.progress.getState(),before);assert.equal(f.passage.getState().repaired,false);
  f.fail(false);assert.equal(f.passage.activate().ok,true);assert.equal(f.passage.getState().repaired,true);assert.equal(f.progress.getPackResourceCounts().wood,0);assert.equal(f.passage.activate().reason,'already-active');
  assert.equal(f.portals.activate(C.gateId).reason,'out-of-reach');f.setPosition({...f.gate.pos,y:1.872});assert.equal(f.portals.activate(C.gateId).ok,true);assert.equal(f.getTravelled(),1);
  f.progress.load();f.passage.update(0);assert.equal(f.passage.getState().repaired,true);assert.deepEqual(f.masks.get('rootfall'),C.cutIds);
}));

test('Rootfall masks respect Author/region access, repaired legacy state and gate transform',()=>fixture(f=>{
  f.progress.repairPortalGate(C.gateId,{});f.passage.update(0);assert.deepEqual(f.masks.get('rootfall'),C.cutIds);
  f.passage.update(0,{hidden:true});assert.deepEqual(f.masks.get('rootfall'),[]);assert.equal(f.passage.access().reason,'inactive-passage');assert.equal(f.hit(f.nodes[0]),false);
  f.passage.update(0);f.setSection('camp');assert.equal(f.passage.access().reason,'inactive-passage');assert.deepEqual(f.masks.get('rootfall'),C.cutIds);
  const transformed=rootfallPoint({...f.gate,pos:{x:10,y:2,z:20},rotY:Math.PI/2,uniformScale:2},{x:1,y:.5,z:3});
  assert.ok(Math.abs(transformed.x-16)<1e-8);assert.equal(transformed.y,3);assert.ok(Math.abs(transformed.z-18)<1e-8);
}));

test('authored brace costs are exactly what the world action displays and charges; inaccessible travel is hidden',()=>fixture(f=>{
  for(const node of f.nodes)while(node.state.remainingChunks)f.hit(node);
  f.gate.requirements={resources:{stone:1}};f.progress.collectResources({stone:1});
  const anchor=f.passage.getState().anchor;
  assert.deepEqual(f.passage.getNearbyInteraction(anchor).cost,{stone:1});
  assert.equal(f.passage.activate().ok,true);assert.equal(f.progress.getPackResourceCounts().stone,0);
  f.setPosition({...f.gate.pos,y:10});assert.equal(f.portals.getNearbyInteraction(f.gate.pos),null);assert.equal(f.portals.activate(C.gateId).reason,'out-of-reach');
}));

test('brace control follows the actual retained root transform rather than the separate travel beacon',()=>fixture(f=>{
  const before=f.passage.getState().anchor;
  f.gate.pos.x+=12;assert.deepEqual(f.passage.getState().anchor,before);
  f.leftRoot.pos={x:5,y:2,z:-10};f.leftRoot.rotY=Math.PI/2;f.leftRoot.uniformScale=.8;
  assert.deepEqual(f.passage.getState().anchor,rootfallPoint(f.leftRoot,C.braceOnRoot));
}));
