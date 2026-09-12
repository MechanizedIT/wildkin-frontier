import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampCareInteraction } from '../src/companions/campCareInteraction.js';

test('nursery action rechecks physical range and Camp state before touching the save owner', () => {
  let camp=true, player={x:0,y:.55,z:0}, calls=0, care=null;
  const bed={id:'bed',anchorPos:{x:2,y:.55,z:0},topHeight:.55,yaw:0};
  const progress={getCampCare:()=>care,getActiveWildkin:()=>({id:'moss',speciesId:'mossling'}),getPackResourceCounts:()=>({berries:1}),
    assignCampWildkin(id,bedId){calls++;care={wildkinId:id,bedId,nourishment:0};return {ok:true,care};},
    feedCampWildkin(){calls++;care.nourishment++;return {ok:true,care};},
    releaseCampWildkin(){calls++;care=null;return {ok:true,care};}};
  const owner=createCampCareInteraction({progress,getBed:id=>id==='bed'?bed:null,canCare:()=>camp,getPlayerPosition:()=>player});
  const settle=owner.describe({id:'bed',type:'wildkinBed'});
  assert.equal(settle.action,'assign');assert.equal(settle.disabled,false);
  player.x=10;
  assert.equal(owner.activate(settle).reason,'out-of-reach');assert.equal(calls,0);
  player.x=0;camp=false;
  assert.equal(owner.activate(settle).reason,'out-of-reach');assert.equal(calls,0);
  camp=true;assert.equal(owner.activate(settle).ok,true);
  const feed=owner.describe({id:'bed'});
  assert.equal(feed.action,'feed');assert.deepEqual(feed.cost,{berries:1});assert.equal(feed.secondary.action,'release');
  assert.equal(owner.activate(feed).ok,true);assert.equal(care.nourishment,1);
  assert.equal(owner.activate({...feed,action:feed.secondary.action}).ok,true);assert.equal(care,null);
  assert.equal(calls,3);
});

test('full nourishment disables payment while preserving a physical release action', () => {
  const care={wildkinId:'moss',bedId:'bed',nourishment:3};
  const owner=createCampCareInteraction({progress:{getCampCare:()=>care,getActiveWildkin:()=>null,getPackResourceCounts:()=>({berries:0})},
    getBed:()=>({id:'bed',anchorPos:{x:0,y:.55,z:0},topHeight:.55}),canCare:()=>true,getPlayerPosition:()=>({x:0,y:.55,z:1})});
  const view=owner.describe({id:'bed'});
  assert.equal(view.label,'NOURISHED');assert.equal(view.disabled,true);assert.equal(view.cost,null);
  assert.equal(view.secondary.action,'release');assert.equal(view.nourishment,3);
});

test('nearby research unlock opens a temporary natural-or-tone choice and commits only fresh matching parents', () => {
  let player={x:0,y:.55,z:1}, care={wildkinId:'settled',bedId:'bed',nourishment:3}, active={id:'selected',speciesId:'mossling'}, saved=false;
  const bed={id:'bed',anchorPos:{x:0,y:.55,z:0},topHeight:.55};
  const guided=()=>({ok:true,parentIds:['settled',active.id],offspring:{genome:{species:'mossling',version:1,ecotype:'fen',baseColor:'clay',eyeColor:'amber',crestVariant:0,tailVariant:0,marking:'none',sizeBand:'standard'}}});
  const progress={getCampCare:()=>care,getActiveWildkin:()=>active,getPackResourceCounts:()=>({berries:0}),getCampBreeding:()=>null,
    getCampBreedingEligibility:(_id,options)=>options?.preserveTrait ? guided() : ({ok:true,parentIds:['settled',active.id]}),
    beginCampBreeding:(_id,options)=>{ if(saved)return {ok:false,reason:'storage-write-failed'}; care=null; return {ok:true,options}; }};
  const interaction=createCampCareInteraction({progress,getBed:()=>bed,canCare:()=>true,getPlayerPosition:()=>player});
  const initial=interaction.describe({id:'bed'});
  assert.equal(initial.action,'choose-pair');assert.equal(initial.secondary.action,'release');assert.equal(initial.bonus,null);
  assert.deepEqual(interaction.activate(initial),{ok:true,choosing:true});
  const choice=interaction.describe({id:'bed'});
  assert.equal(choice.action,'pair');assert.equal(choice.label,'NATURAL');assert.equal(choice.caption,'Young’s body tone');assert.equal(choice.pairChoice,true);
  assert.deepEqual(choice.secondary,{action:'guide-tone',label:'CLAY TONE',color:'#A77B62'});
  active={id:'other',speciesId:'mossling'};
  assert.equal(interaction.activate(choice).reason,'stale-pair-choice');assert.equal(care.nourishment,3);
  active={id:'selected',speciesId:'mossling'};
  assert.equal(interaction.activate(initial).choosing,true);
  const guide=interaction.describe({id:'bed'}).secondary;
  saved=true;assert.equal(interaction.activate({...initial,action:guide.action}).reason,'storage-write-failed');assert.equal(interaction.describe({id:'bed'}).pairChoice,true);
  saved=false;assert.equal(interaction.activate({...initial,action:guide.action}).ok,true);assert.equal(care,null);
});

test('pair choice cancels on leaving range, blocking, author suppression, pause, or reset', () => {
  let near=true;
  const bed={id:'bed',anchorPos:{x:0,y:.55,z:0},topHeight:.55};
  const genome={species:'mossling',version:1,ecotype:'fen',baseColor:'clay',eyeColor:'amber',crestVariant:0,tailVariant:0,marking:'none',sizeBand:'standard'};
  const progress={getCampCare:()=>({wildkinId:'settled',bedId:'bed',nourishment:3}),getActiveWildkin:()=>({id:'selected',speciesId:'mossling'}),getPackResourceCounts:()=>({berries:0}),getCampBreeding:()=>null,
    getCampBreedingEligibility:(_id,options)=>options?.preserveTrait ? ({ok:true,parentIds:['settled','selected'],offspring:{genome}}) : ({ok:true,parentIds:['settled','selected']})};
  const interaction=createCampCareInteraction({progress,getBed:()=>bed,canCare:()=>near,getPlayerPosition:()=>({x:0,y:.55,z:1})});
  const open=()=>interaction.activate(interaction.describe({id:'bed'}));
  open();near=false;interaction.update();assert.equal(interaction.describe({id:'bed'}),null);
  near=true;open();interaction.update({blocked:true});assert.equal(interaction.describe({id:'bed'}).pairChoice,false);
  open();interaction.update({authorSuppress:true});assert.equal(interaction.describe({id:'bed'}).pairChoice,false);
  open();interaction.update({paused:true});assert.equal(interaction.describe({id:'bed'}).pairChoice,false);
  open();interaction.cancelPairChoice();assert.equal(interaction.describe({id:'bed'}).pairChoice,false);
});
