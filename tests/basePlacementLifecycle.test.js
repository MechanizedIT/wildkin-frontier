import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import WORLD_DATA from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createBaseSystem } from '../src/base/baseSystem.js';
import { clearModelAssetCacheForTests, registerModelTemplateForTests } from '../src/assets/modelAssetRuntime.js';

function eventTarget(extra={}) {
  const listeners=new Map();
  return Object.assign(extra,{
    addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);},
    removeEventListener(type,listener){listeners.get(type)?.delete(listener);},
    dispatch(type,event={}){for(const listener of [...listeners.get(type)??[]])listener(event);},
    listenerCount(type){return listeners.get(type)?.size??0;},
  });
}

function element() {
  const children=[],queries=new Map();
  return eventTarget({
    hidden:false,className:'',dataset:{},style:{},offsetWidth:240,offsetHeight:180,parentElement:null,
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},contains(){return false;},remove(){},
    append(...nodes){for(const node of nodes){node.parentElement=this;children.push(node);}},
    querySelector(selector){if(!queries.has(selector))queries.set(selector,element());return queries.get(selector);},
    querySelectorAll(){return [];},getClientRects(){return [];},matches(){return false;},
    getBoundingClientRect(){return {left:0,top:0,width:412,height:915,right:412,bottom:915};},
    setPointerCapture(){},closest(){return null;},
    _children:children,
  });
}

const keyEvent=key=>({key,preventDefault(){},stopImmediatePropagation(){}});

test('placement view lifecycle begins after a legal target and closes once for every exit path',()=>{
  const oldWindow=global.window,oldDocument=global.document;
  const viewport=eventTarget(),windowTarget=eventTarget({visualViewport:viewport});
  const documentTarget=eventTarget({hidden:false,activeElement:null,createElement:()=>element()});
  global.window=windowTarget;global.document=documentTarget;
  let base;
  try{
    const template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(2.8,1.7,.4),new THREE.MeshLambertMaterial()));
    registerModelTemplateForTests('assets/models/emergency-barricade-v1/model.glb',{scene:template,animations:[]});
    const registry=createWorldRegistry(WORLD_DATA);
    const progress=createFrontierProgress({worldRegistry:registry,resourceDrops:WORLD_DATA.resourceDrops,isAuthorMode:true,inMemoryAuthor:true});
    progress.collectResources({wood:40,stone:30,fiber:20});
    const originalBank=progress.getBankedResources,originalPlace=progress.placeStructure;
    const order=[],changes=[];let throwBegin=false,throwEnd=false;
    progress.getBankedResources=(...args)=>{order.push('refresh');return originalBank(...args);};
    const app=element(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
    base=createBaseSystem({app,scene,camera,progress,registry,getPlayerState:()=>({pos:{x:0,y:0,z:5}}),isCamp:()=>true,
      onPlacementViewChange(change){changes.push(change);order.push(change.phase);if(change.phase==='begin'&&throwBegin)throw Error('camera begin failed');if(change.phase==='end'&&throwEnd)throw Error('camera end failed');},
    });

    order.length=0;
    const firstOpen=base.open('foundation');assert.equal(firstOpen.ok,true,firstOpen.message);
    assert.equal(order.indexOf('begin')<order.indexOf('refresh'),true,'camera framing begins before preview validation/render');
    assert.equal(changes[0].phase,'begin');assert.equal(changes[0].reason,'open');assert.ok(Number.isFinite(changes[0].target.y));
    windowTarget.dispatch('keydown',keyEvent('Escape'));
    assert.deepEqual(changes.slice(-1).map(({phase,reason})=>[phase,reason]),[['end','cancel']]);
    windowTarget.dispatch('keydown',keyEvent('Escape'));assert.equal(changes.filter(c=>c.phase==='end').length,1,'repeat cancel is idempotent');

    assert.equal(base.open('foundation').ok,true);assert.equal(base.open('foundation').ok,true);
    assert.deepEqual(changes.slice(-3).map(({phase,reason})=>[phase,reason]),[['begin','open'],['end','external'],['begin','open']],'a valid reopen ends the old session before beginning one replacement');
    base.close();

    assert.equal(base.open('foundation').ok,true);
    progress.placeStructure=()=>({placed:false,reason:'storage-write-failed'});
    const endsBeforeFailedPlace=changes.filter(c=>c.phase==='end').length;
    windowTarget.dispatch('keydown',keyEvent('Enter'));
    assert.equal(base.isBlocking(),true,'failed save keeps placement and its camera framing active');
    assert.equal(changes.filter(c=>c.phase==='end').length,endsBeforeFailedPlace);
    progress.placeStructure=originalPlace;
    windowTarget.dispatch('keydown',keyEvent('Enter'));
    assert.equal(base.isBlocking(),false);assert.equal(changes.at(-1).reason,'placed');

    for(const [target,type] of [[windowTarget,'resize'],[windowTarget,'orientationchange'],[viewport,'resize'],[windowTarget,'blur']]){
      assert.equal(base.open('foundation').ok,true);target.dispatch(type);target.dispatch(type);
      assert.equal(base.isBlocking(),false);assert.equal(changes.at(-1).reason,'external');
    }
    assert.equal(base.open('foundation').ok,true);documentTarget.hidden=true;documentTarget.dispatch('visibilitychange');documentTarget.dispatch('visibilitychange');documentTarget.hidden=false;
    assert.equal(base.isBlocking(),false);assert.equal(changes.at(-1).reason,'external');

    assert.equal(base.open('foundation').ok,true);base.update(0,{hidden:true});base.update(0,{hidden:true});
    assert.equal(base.isBlocking(),false,'Author-mode suppression closes placement once');base.update(0,{hidden:false});
    assert.equal(base.open('foundation').ok,true);base.close();base.close();assert.equal(changes.at(-1).reason,'external','public reset/default close restores the view');

    throwBegin=true;const failedOpen=base.open('foundation');throwBegin=false;
    assert.equal(failedOpen.ok,false);assert.equal(base.isBlocking(),false,'begin callback exceptions clean up placement');
    assert.deepEqual(changes.slice(-2).map(({phase,reason})=>[phase,reason]),[['begin','open'],['end','external']]);

    assert.equal(base.open('foundation').ok,true);throwEnd=true;base.dispose();base=null;throwEnd=false;
    assert.equal(changes.at(-1).reason,'external','dispose closes an active session even when presentation cleanup throws');
    assert.equal(windowTarget.listenerCount('resize'),0);assert.equal(windowTarget.listenerCount('orientationchange'),0);assert.equal(windowTarget.listenerCount('blur'),0);assert.equal(viewport.listenerCount('resize'),0);
    assert.equal(changes.filter(c=>c.phase==='begin').length,changes.filter(c=>c.phase==='end').length,'every begun session ends exactly once');
  }finally{
    try{base?.dispose();}catch{}clearModelAssetCacheForTests();global.window=oldWindow;global.document=oldDocument;
  }
});
