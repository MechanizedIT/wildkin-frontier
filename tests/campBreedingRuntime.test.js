import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampBreedingGrowth } from '../src/companions/campBreedingGrowth.js';
import { createCampCareInteraction } from '../src/companions/campCareInteraction.js';

test('young active growth pauses, commits bounded time and caps at maturity without wall-clock catchup', () => {
  let breeding={offspring:{id:'young'},growthSeconds:0},writes=0,fail=false;
  const clock=createCampBreedingGrowth({getCampBreeding:()=>breeding,advanceCampBreeding(seconds){writes++;if(!fail)breeding.growthSeconds+=seconds;}});
  for(let i=0;i<40;i++)clock.update(.25,{active:false});
  assert.equal(writes,0);
  clock.update(100,{active:true});assert.equal(writes,0);
  for(let i=0;i<19;i++)clock.update(.25,{active:true});
  assert.equal(breeding.growthSeconds,5);assert.equal(writes,1);
  fail=true;for(let i=0;i<20;i++)clock.update(.25,{active:true});
  assert.equal(breeding.growthSeconds,5);assert.equal(writes,2);
  fail=false;clock.update(.25,{active:true});assert.equal(writes,2);
  breeding={offspring:{id:'next-young'},growthSeconds:119};
  for(let i=0;i<4;i++)clock.update(.25,{active:true});
  assert.equal(breeding.growthSeconds,120);
  clock.update(100,{active:true});assert.equal(writes,3);
});

test('physical nursery routes pair, growing and welcome without remote or premature activation', () => {
  let breeding=null,care={bedId:'bed',wildkinId:'mother',nourishment:3},near=true,calls=0;
  const progress={getCampCare:()=>care,getActiveWildkin:()=>({id:'father',speciesId:'mossling'}),getPackResourceCounts:()=>({berries:3}),
    getCampBreeding:()=>breeding,getCampBreedingEligibility:()=>({ok:true}),
    beginCampBreeding(){calls++;care=null;breeding={bedId:'bed',growthSeconds:0};return{ok:true,care:null};},
    welcomeCampYoung(){calls++;if(breeding.growthSeconds<120)return{ok:false,reason:'growing'};breeding=null;care={bedId:'bed',wildkinId:'young',nourishment:0};return{ok:true,care};}};
  const interaction=createCampCareInteraction({progress,getBed:()=>({id:'bed',anchorPos:{x:0,y:.55,z:0},topHeight:.55}),canCare:()=>near,getPlayerPosition:()=>({x:0,y:.55,z:1})});
  const pair=interaction.describe({id:'bed'});assert.equal(pair.label,'PAIR');assert.equal(pair.disabled,false);
  near=false;assert.equal(interaction.activate(pair).reason,'out-of-reach');assert.equal(calls,0);
  near=true;assert.equal(interaction.activate(pair).ok,true);
  const young=interaction.describe({id:'bed'});assert.equal(young.label,'GROWING');assert.equal(young.secondary,null);assert.equal(young.growthStage,1);
  assert.equal(interaction.activate(young).reason,'growing');
  breeding.growthSeconds=120;const ready=interaction.describe({id:'bed'});assert.equal(ready.label,'WELCOME');assert.equal(ready.disabled,false);
  assert.equal(interaction.activate(ready).ok,true);assert.equal(care.wildkinId,'young');
});
