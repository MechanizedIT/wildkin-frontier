import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrontierProgress} from '../src/save/frontierProgress.js';
import {createExpeditionSession} from '../src/session/expeditionSession.js';
import {createExpeditionPersistence} from '../src/session/expeditionPersistence.js';

test('background checkpoint preserves imported run; pending failed death retries without erasing the live record',()=>{
 globalThis.document=new EventTarget();document.hidden=false;globalThis.window=new EventTarget();
 let raw=null,fail=false,health=2;
 globalThis.localStorage={getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw Error('quota');raw=value;}};
 const progress=createFrontierProgress(),session=createExpeditionSession({initialStatus:'camp'});progress.load();progress.collectResources({wood:3});
 const run={runId:'restore_run',startAnchorId:'entry',sectionId:'section_1',feet:{x:0,y:0,z:0},facingYaw:0,health:2,xp:4,companions:[],corePending:false,kills:0,maxDepth:1,newWaypoints:[],newBeacons:[]};
 const controller=createExpeditionPersistence({progress,session,getPlayerState:()=>({pos:{x:0,y:.54,z:0},facing:0,grounded:true,mode:'WALK'}),getHealth:()=>health,getXp:()=>4,getSectionId:()=> 'section_1',getExtras:()=>({companions:[],coreSecured:false}),validateFeet:()=>({x:0,y:0,z:0}),capsuleExtent:.52});
 const imported=progress.exportSave().payload;imported.progress.activeRun=run;
 assert.equal(progress.importSave(imported).ok,true);window.dispatchEvent(new Event('pagehide'));assert.equal(JSON.parse(raw).activeRun.runId,run.runId);
 controller.destroy();session.restoreActiveRun(run);
 const active=createExpeditionPersistence({progress,session,getPlayerState:()=>({pos:{x:0,y:.54,z:0},facing:0,grounded:true,mode:'WALK'}),getHealth:()=>health,getXp:()=>4,getSectionId:()=> 'section_1',getExtras:()=>({companions:[],coreSecured:false}),validateFeet:()=>({x:0,y:0,z:0}),capsuleExtent:.52});
 active.checkpoint();health=0;fail=true;
 assert.equal(progress.endRunWithoutRewards(run.runId).ok,false);
 let attempts=0;
 active.setPendingResolution(()=>{attempts++;const result=progress.endRunWithoutRewards(run.runId);if(result.ok){active.setPendingResolution(null);session.resetToCamp();}return result;});
 active.update(3,true);assert.equal(JSON.parse(raw).activeRun.runId,run.runId);assert.equal(session.isActive(),true);
 fail=false;document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
 assert.equal(attempts,2);assert.equal(JSON.parse(raw).activeRun,null);assert.equal(session.isCamp(),true);assert.equal(progress.getPackResourceCounts().wood,3);
 active.destroy();delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;
});

test('safe feet from a prior run cannot become a new airborne run checkpoint',()=>{
 globalThis.document=new EventTarget();document.hidden=false;globalThis.window=new EventTarget();
 let provider=null,stored=null,mode='WALK';
 const progress={setRunSnapshotProvider:value=>{provider=value;},getActiveRun:()=>stored,
   checkpointRun:()=>{const next=provider?.();if(next)stored=next;return {ok:true};}};
 const session=createExpeditionSession({initialStatus:'active',initialRegionId:'camp'});
 const controller=createExpeditionPersistence({progress,session,getPlayerState:()=>({pos:{x:0,y:.54,z:0},facing:0,grounded:true,mode}),
   getHealth:()=>4,getXp:()=>0,getSectionId:()=> 'camp',getExtras:()=>({companions:[],coreSecured:false}),
   validateFeet:feet=>({...feet,y:0}),capsuleExtent:.52});
 controller.checkpoint();const priorRunId=stored.runId;
 session.resetToCamp();session.beginRun('camp_gate');mode='JUMP';
 controller.checkpoint();
 assert.equal(stored.runId,priorRunId);assert.notEqual(stored.runId,session.getRunId());
  controller.destroy();delete globalThis.document;delete globalThis.window;
});

test('an invalid landing retains same-run safe feet while saving live damage and run changes',()=>{
 globalThis.document=new EventTarget();document.hidden=false;globalThis.window=new EventTarget();
 let provider=null,stored=null,valid=true,health=5,xp=4;
 const pending=[{id:'pending-1'}];let core=false;
 const progress={setRunSnapshotProvider:value=>{provider=value;},getActiveRun:()=>stored,
   checkpointRun:()=>{const next=provider?.();if(next)stored=structuredClone(next);return {ok:true};}};
 const session=createExpeditionSession({initialStatus:'active',initialRegionId:'camp'});
 session.setCargo({wood:3});const cargoBefore=session.getCargo();
 const controller=createExpeditionPersistence({progress,session,getPlayerState:()=>({pos:{x:12,y:35.52,z:-229},facing:.4,grounded:true,mode:'WALK'}),
   getHealth:()=>health,getXp:()=>xp,getSectionId:()=> 'camp',getExtras:()=>({companions:pending,coreSecured:core}),
   validateFeet:feet=>valid?{...feet,y:35}:null,capsuleExtent:.52});
 controller.checkpoint();const safeFeet={...stored.feet};
 health=1;xp=9;core=true;pending.push({id:'pending-2'});session.addKill();session.addDiscoveryWaypoint('skybreak-crown');valid=false;
 controller.checkpoint();
 assert.deepEqual(stored.feet,safeFeet,'unsafe feet fall back to the supported checkpoint');
 assert.equal(stored.health,1,'fall damage is not rolled back');assert.equal(stored.xp,9);
 assert.deepEqual(stored.companions,pending);assert.equal(stored.corePending,true);
 assert.equal(stored.kills,1);assert.deepEqual(stored.newWaypoints,['skybreak-crown']);
 assert.deepEqual(session.getCargo(),cargoBefore,'checkpoint does not alter live cargo');
 controller.destroy();delete globalThis.document;delete globalThis.window;
});

test('an unsafe same-run section transition retains its prior section snapshot without mixing coordinates',()=>{
 globalThis.document=new EventTarget();document.hidden=false;globalThis.window=new EventTarget();
 let provider=null,stored=null,sectionId='camp',valid=true,health=5;
 const progress={setRunSnapshotProvider:value=>{provider=value;},getActiveRun:()=>stored,
   checkpointRun:()=>{const next=provider?.();if(next)stored=structuredClone(next);return {ok:true};}};
 const session=createExpeditionSession({initialStatus:'active',initialRegionId:'camp'});
 const controller=createExpeditionPersistence({progress,session,getPlayerState:()=>({pos:{x:0,y:.52,z:0},facing:0,grounded:true,mode:'WALK'}),
   getHealth:()=>health,getXp:()=>4,getSectionId:()=>sectionId,getExtras:()=>({companions:[],coreSecured:false}),
   validateFeet:feet=>valid?{...feet,y:0}:null,capsuleExtent:.52});
 controller.checkpoint();const prior=structuredClone(stored);
 sectionId='section_2';valid=false;health=1;controller.checkpoint();
 assert.deepEqual(stored,prior,'the old section record remains intact when no same-section safe position exists');
 controller.destroy();delete globalThis.document;delete globalThis.window;
});
