import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContextualGesture } from '../src/ui/contextualGesture.js';
const feed = { type:'wildkinBed', id:'bed-a', action:'feed', label:'Feed', secondary:{action:'release',label:'Release'} };
test('a nursery press cannot become a different target, stage or delayed attack-equivalent action', () => {
  const gesture = createContextualGesture();
  for (const changed of [{...feed,id:'bed-b'},{...feed,action:'pair',label:'Pair'}]) {
    gesture.begin(feed); assert.equal(gesture.complete(changed,{visible:true}),false);
  }
  gesture.begin(feed); gesture.cancel(); assert.equal(gesture.complete(feed,{visible:true}),false);
  gesture.begin(feed); assert.equal(gesture.complete(feed,{visible:true}),true);
  assert.equal(gesture.complete(feed,{visible:true}),false);
});
test('disabled/hidden targets reject a completed press; keyboard activation still requires visibility', () => {
  const gesture=createContextualGesture();
  gesture.begin(feed);assert.equal(gesture.complete({...feed,disabled:true},{visible:true}),false);
  gesture.begin(feed);assert.equal(gesture.complete(feed,{visible:false}),false);
  assert.equal(gesture.complete(feed,{keyboard:true,visible:false}),false);
  assert.equal(gesture.complete(feed,{keyboard:true,visible:true}),true);
});
test('a secondary release remains independent from disabled primary and cancels with its own stage', () => {
  const gesture=createContextualGesture();
  gesture.begin(feed,true);assert.equal(gesture.complete({...feed,disabled:true},{secondary:true,visible:true}),true);
  gesture.begin(feed,true);assert.equal(gesture.complete({...feed,secondary:null},{secondary:true,visible:true}),false);
  gesture.begin(feed,true);gesture.cancel();assert.equal(gesture.complete(feed,{secondary:true,visible:true}),false);
});
