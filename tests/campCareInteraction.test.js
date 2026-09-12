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
