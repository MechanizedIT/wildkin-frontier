import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCameraFollow } from '../src/camera/cameraFollow.js';
import { CAMERA_CONFIG } from '../src/game/createCamera.js';
import { CAMERA_CONFIG_FOLLOW } from '../src/game/config.js';

const radians = degrees => degrees * Math.PI / 180;
const base = { horizontalDistance: 8, height: 6, focusHeight: 1 };
const config = { pitch: radians(32), portraitPitch: radians(36), minPitch: radians(20), maxPitch: radians(64), landscapeZoom: .85, portraitZoom: 1.5 };

test('portrait initializes at the wider production pitch and requested distance', () => {
  const camera = new THREE.PerspectiveCamera(); camera.aspect = .6;
  const target = new THREE.Object3D(); target.position.set(2, 3, 4);
  const follow = createCameraFollow(camera, target, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
  follow.snap();
  const state = follow._debug();
  assert.equal(state.portrait, true);
  assert.equal(state.pitch, radians(36));
  assert.equal(state.requestedDistance, CAMERA_CONFIG.distance * 1.5);
  assert.ok(Math.abs(state.requestedDistance - 11.591) < .001, `expected 11.591m, got ${state.requestedDistance}`);
  follow.setZoom(.8); follow.prepareForInput();
  assert.ok(
    Math.abs(follow._debug().requestedDistance - CAMERA_CONFIG.distance * 1.5 * .8) < 1e-12,
    'portrait multiplier composes with independent user zoom',
  );
});

test('orientation changes keep yaw and independent manual pitch preferences', () => {
  const camera = new THREE.PerspectiveCamera(); camera.aspect = .6;
  const target = new THREE.Object3D();
  const follow = createCameraFollow(camera, target, config, base);
  follow.orbitBy(.7, .08); follow.prepareForInput();
  const portraitPitch = follow.getPitch();
  camera.aspect = 1.8; follow.prepareForInput();
  assert.equal(follow.getYaw(), .7);
  assert.equal(follow.getPitch(), radians(32), 'landscape retains its existing initial profile');
  assert.equal(follow._debug().requestedDistance, Math.hypot(8, 5) * .85, 'landscape keeps its existing distance multiplier');
  follow.orbitBy(0, -.05); const landscapePitch = follow.getPitch();
  camera.aspect = .6; follow.prepareForInput();
  assert.equal(follow.getYaw(), .7);
  assert.equal(follow.getPitch(), portraitPitch, 'portrait inspection preference returns after landscape');
  camera.aspect = 1.8; follow.prepareForInput();
  assert.equal(follow.getPitch(), landscapePitch, 'landscape inspection preference returns after portrait');
});

test('portrait profile retains collision distance and focus recovery', () => {
  const camera = new THREE.PerspectiveCamera(); camera.aspect = .6;
  const target = new THREE.Object3D();
  let recovered = 0;
  const probe = { recoverFocus: ({ focus }) => { recovered++; return { focus, status: 'clear' }; }, resolveDistance: ({ requestedDistance }) => requestedDistance - 2 };
  const follow = createCameraFollow(camera, target, config, base, { collisionProbe: probe });
  follow.snap();
  const state = follow._debug();
  assert.ok(recovered > 0);
  assert.equal(state.requestedDistance, Math.hypot(8, 5) * 1.5);
  assert.equal(state.effectiveDistance, state.requestedDistance - 2);
});
