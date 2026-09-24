import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraRelativePan } from '../lab/voxel/camera-relative-pan.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('WASD pan follows camera yaw on the ground plane',()=>{
  let delta=cameraRelativePan(new Set(['KeyW']),0,2);near(delta[0],0);near(delta[1],-2);
  delta=cameraRelativePan(new Set(['KeyD']),0,2);near(delta[0],2);near(delta[1],0);
  delta=cameraRelativePan(new Set(['KeyW']),Math.PI/2,2);near(delta[0],-2);near(delta[1],0);
  delta=cameraRelativePan(new Set(['KeyD']),Math.PI/2,2);near(delta[0],0);near(delta[1],-2);
});
test('opposite directions cancel, diagonals are normalized, and no keys do not move',()=>{
  assert.deepEqual(cameraRelativePan(new Set(),1,3),[0,0]);
  assert.deepEqual(cameraRelativePan(new Set(['KeyW','KeyS']),0,3),[0,0]);
  const diagonal=cameraRelativePan(new Set(['KeyW','KeyD']),0,3);
  near(Math.hypot(...diagonal),3);near(diagonal[0],3/Math.sqrt(2));near(diagonal[1],-3/Math.sqrt(2));
});
