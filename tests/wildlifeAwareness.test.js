import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canNoticeQuietPlayer } from '../src/creatures/perception.js';

const observer = {pos:{x:0,y:.5,z:0},facing:0};
function noticed(x,z,mode='SNEAK',sight=true,y=.5) {
  return canNoticeQuietPlayer({observer,player:{pos:{x,y,z},mode,speed:mode==='IDLE'?0:1},noticeRadius:6,lineOfSight:()=>sight});
}
test('quiet rear approach stays unnoticed, but crossing the animal view or touching close space is detected',()=>{
  assert.equal(noticed(0,-3),false);
  assert.equal(noticed(3,0),false);
  assert.equal(noticed(0,3),true);
  assert.equal(noticed(0,-.8),true);
  assert.equal(noticed(0,-3,'WALK'),true);
  assert.equal(noticed(0,-3,'IDLE'),false);
});
test('quiet frontal vision respects walls, elevation and range',()=>{
  assert.equal(noticed(0,3,'SNEAK',false),false);
  assert.equal(noticed(0,3,'SNEAK',true,4),false);
  assert.equal(noticed(0,7),false);
  assert.equal(noticed(0,4),true);
});
