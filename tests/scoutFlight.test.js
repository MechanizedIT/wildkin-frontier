import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolveScoutFlight } from '../src/movement/scoutFlight.js';
import { createScoutStorage } from '../src/dev/scoutSession.js';
import { createPlayerController } from '../src/player/playerController.js';
import { createPlayerCombat } from '../src/combat/playerCombat.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createKeyboardInput } from '../src/input/keyboardInput.js';
import { MOVEMENT_CONFIG } from '../src/game/config.js';

test('scout displacement is bounded, diagonal-normalized and stays above terrain/water', () => {
  const p={x:0,y:10,z:0};
  const diagonal=resolveScoutFlight(p,{x:1,z:1},0,false,1,()=>0);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-.4)<1e-8,'a long tick caps at .05s with no diagonal boost');
  const high=resolveScoutFlight(p,{x:1,z:0},-1,true,.05,()=>20);
  assert.equal(high.x,1);assert.equal(high.y,20.54);
  assert.equal(resolveScoutFlight({x:0,y:-100,z:0},{x:0,z:0},-1,false,.05,()=>-14).y,-1.46);
  assert.equal(resolveScoutFlight({x:9999.9,y:499.9,z:0},{x:1,z:0},1,true,.05,()=>0).x,10000);
  assert.equal(resolveScoutFlight({x:0,y:499.9,z:0},{x:0,z:0},1,false,.05,()=>0).y,500);
});

test('real player owner enters flight from traversal, moves its body and exits through ordinary falling', () => {
  let position={x:0,y:.52,z:0},moves=0,sets=0;
  const physics={cfg:{capsuleTotalHeight:1.04},getPosition:()=>({...position}),setPosition:p=>{sets++;position={...p};},move:d=>{moves++;const y=Math.max(.52,position.y+d.y);position={x:position.x+d.x,y,z:position.z+d.z};return{corrected:d,grounded:y===.52};}};
  const camera=new THREE.PerspectiveCamera();camera.lookAt(0,0,-1);
  const controller=createPlayerController(new THREE.Group(),{getGroundHeight:()=>0,jumpTraversals:[],climbables:[]},camera,MOVEMENT_CONFIG,physics);
  const idle={moveX:0,moveY:0,moveMagnitude:0,movementBand:'idle'};
  controller.state.mode='JUMP';controller.state.jumpData={};controller.state.verticalVelocity=5;
  for(let i=0;i<60;i++)controller.update(1/60,{...idle,moveY:-1,moveMagnitude:1},{debugFlight:{vertical:1,fast:false,floorAt:()=>0},knockback:{remaining:1}});
  assert.equal(controller.getState().mode,'FLY');assert.equal(moves,0);assert.equal(sets,60);
  assert.ok(position.z < -7.9 && position.y > 6.5);assert.equal(controller.state.jumpData,null);
  controller.prepareRender(1);assert.ok(Math.abs(controller.getRenderPose().position.z-position.z)<1e-8);
  const airborne=position.y;controller.update(1/60,idle);
  assert.equal(controller.getState().mode,'FALL');assert.ok(position.y<airborne);assert.equal(moves,1);
  for(let i=0;i<160;i++)controller.update(1/60,idle);
  assert.equal(controller.getState().grounded,true);assert.equal(controller.state.mode,'IDLE');
  controller.update(1/60,{...idle,jumpRequested:true});assert.equal(controller.state.mode,'JUMP','ordinary jump remains available after landing');
});

test('scout protection is independent from ward timers and ordinary damage resumes outside scout', () => {
  let suppressed=true,healthChanges=0,deaths=0;
  const combat=createPlayerCombat({playerMesh:new THREE.Group(),isDamageSuppressed:()=>suppressed,onHealthChanged:()=>healthChanges++,onDeath:()=>deaths++});
  assert.equal(combat.isInvulnerable(),true);assert.equal(combat.takeDamage(99,null,{ignoreInvuln:true}),false);
  assert.equal(combat.getHealth(),5);assert.equal(healthChanges,0);assert.equal(deaths,0);assert.equal(combat.getWardRemaining(),0);
  suppressed=false;assert.equal(combat.isInvulnerable(),false);assert.equal(combat.takeDamage(1,null),true);assert.equal(combat.getHealth(),4);
});

test('scout storage loads a real complete save, isolates resource/atlas commits, and discards on reopening', () => {
  let saved=null,writes=0;
  const ordinary={getItem:()=>saved,setItem:(_k,v)=>{writes++;saved=v;}};
  const make=storage=>createFrontierProgress({storage,resourceDrops:['wood','fiber','stone','berries'].map(id=>({id,displayName:id}))});
  const p=make(ordinary);p.load();assert.equal(p.collectResources({berries:17,wood:1}).ok,true);
  const original=saved,baselineWrites=writes;
  const memory=createScoutStorage(ordinary),scout=make(memory);scout.load();
  assert.deepEqual(scout.exportSave().payload,p.exportSave().payload);
  assert.equal(scout.collectResources({berries:4}).ok,true);
  assert.equal(scout.commitFrontierResourceState('f1:r:-1:-2:0',0).changed,true);
  assert.equal(scout.getPackResourceCounts().berries,21);assert.equal(saved,original);assert.equal(writes,baselineWrites);
  const samePage=make(memory);samePage.load();assert.equal(samePage.getPackResourceCounts().berries,21);
  const reopened=make(createScoutStorage(ordinary));reopened.load();assert.equal(reopened.getPackResourceCounts().berries,17);
  assert.deepEqual(reopened.exportSave().payload,p.exportSave().payload);
});

test('flight keys reuse keyboard ownership and clear on blocking, blur and key-up', t => {
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  const listeners=new Map();
  globalThis.window={addEventListener:(n,f)=>{const a=listeners.get(n)??[];a.push(f);listeners.set(n,a);},removeEventListener:()=>{}};
  globalThis.document={activeElement:null,addEventListener(){},removeEventListener(){}};
  const keyboard=createKeyboardInput(MOVEMENT_CONFIG);
  t.after(()=>{keyboard.destroy();globalThis.window=oldWindow;globalThis.document=oldDocument;});
  const fire=(type,key,target={})=>{for(const f of listeners.get(type)??[])f({key,code:'Key'+key?.toUpperCase(),target,preventDefault(){}});};
  fire('keydown',' ');fire('keydown','shift');assert.deepEqual(keyboard.getFlightIntent(),{vertical:1,fast:true});
  fire('keydown','c');assert.equal(keyboard.getFlightIntent().vertical,0);fire('keyup',' ');assert.equal(keyboard.getFlightIntent().vertical,-1);
  keyboard.setEnabled(false);assert.deepEqual(keyboard.getFlightIntent(),{vertical:0,fast:false});keyboard.setEnabled(true);
  fire('keydown',' ',{tagName:'INPUT'});assert.equal(keyboard.getFlightIntent().vertical,0);
  fire('keydown','q');fire('keydown','e');assert.equal(keyboard.getFlightIntent().vertical,0,'interaction and companion keys never change altitude');
  fire('keydown',' ');fire('blur','');assert.equal(keyboard.getFlightIntent().vertical,0);
});
