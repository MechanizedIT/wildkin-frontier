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
