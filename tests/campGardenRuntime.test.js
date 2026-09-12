import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampGarden } from '../src/base/campGarden.js';

test('garden clock persists only active play in bounded quanta and stops when ripe', () => {
  let crop={plotId:'plot',growthSeconds:0}, writes=0, fail=false;
  const progress={getCampCrop:()=>crop&&({...crop}),advanceCampCrop(seconds){
    writes++; assert.ok(seconds>0&&seconds<=5);
    if(fail)return {ok:false}; crop.growthSeconds+=seconds;return {ok:true};
  }};
  const garden=createCampGarden({progress});
  for(let i=0;i<400;i++)garden.update(.25,{active:false});
  assert.equal(writes,0);
  for(let i=0;i<20;i++)garden.update(.25,{active:true});
  assert.equal(crop.growthSeconds,5);assert.equal(writes,1);
  fail=true;
  for(let i=0;i<20;i++)garden.update(.25,{active:true});
  assert.equal(crop.growthSeconds,5);assert.equal(writes,2);
  fail=false;
  for(let i=0;i<340;i++)garden.update(.25,{active:true});
  assert.equal(crop.growthSeconds,90);assert.equal(writes,19);
  for(let i=0;i<200;i++)garden.update(.25,{active:true});
  assert.equal(writes,19);
  crop=null;garden.update(.25,{active:true});
  crop={plotId:'plot',growthSeconds:0};
  garden.update(60,{active:true});
  assert.equal(crop.growthSeconds,0,'one oversized frame cannot simulate offline time');
});

test('garden actions revalidate range, describe authoritative yield, and never mutate while away', () => {
  let inCamp=true, calls=0, crop=null;
  const plot={id:'plot',anchorPos:{x:1,y:.32,z:0},topHeight:.32};
  const progress={getCampCrop:()=>crop,getPackResourceCounts:()=>({berries:1}),getCampCropHarvest:()=>crop?{yield:4,bloomTended:true}:null,
    plantCampCrop(){calls++;crop={plotId:'plot',growthSeconds:0};return {ok:true,crop};},
    harvestCampCrop(){calls++;crop=null;return {ok:true,yield:4,bloomTended:true};}};
  const garden=createCampGarden({progress,getGarden:()=>plot,canGarden:()=>inCamp,getPlayerPosition:()=>({x:0,y:.55,z:0})});
  const plant=garden.describe({id:'plot'});
  assert.equal(plant.label,'PLANT');assert.deepEqual(plant.cost,{berries:1});
  inCamp=false;assert.equal(garden.activate(plant).reason,'out-of-reach');assert.equal(calls,0);
  inCamp=true;garden.activate(plant);
  assert.equal(garden.describe({id:'plot'}).disabled,true);
  crop.growthSeconds=90;
  const harvest=garden.describe({id:'plot'});
  assert.equal(harvest.label,'HARVEST');assert.deepEqual(harvest.reward,{berries:4});
  assert.match(harvest.detail,/Mossling/);
  assert.equal(garden.activate(harvest).ok,true);assert.equal(calls,2);assert.equal(crop,null);
});
