import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCamera, CAMERA_CONFIG } from '../src/game/createCamera.js';
import { CAMERA_CONFIG_FOLLOW } from '../src/game/config.js';
import { createCameraFollow } from '../src/camera/cameraFollow.js';
import { createConstructionView } from '../src/camera/constructionView.js';

function fixture(aspect = 412 / 915) {
  const camera = createCamera(aspect), player = new THREE.Group();
  player.position.set(0, .522, 2);
  const follow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
  follow.orbitBy(.6, .1); follow.setZoom(.9); follow.snap();
  const read = () => ({ yaw: follow.getYaw(), pitch: follow.getPitch(), zoom: follow.getZoom() });
  return { camera, player, follow, read, view: createConstructionView({ camera, follow, getPlayerPosition: () => player.position }) };
}
const begin = { phase: 'begin', target: { x: 3, y: 0, z: 2 } };
const close = reason => ({ phase: 'end', reason });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('portrait construction frames a nearby bed and restores cancel exactly without moving the player', () => {
  const { camera, player, follow, read, view } = fixture(), before = read(), position = player.position.clone();
  view(begin); view(begin);
  near(follow.getYaw(), -Math.PI / 2);
  camera.updateMatrixWorld();
  const preview = new THREE.Vector3(3, .55, 2).project(camera);
  assert.ok(Math.abs(preview.x) < .05 && preview.y > 0 && preview.y < .65, 'bed is centered in the open upper play area');
  view(close('cancel')); view(close('external'));
  near(read().yaw, before.yaw); near(read().pitch, before.pitch); near(read().zoom, before.zoom);
  assert.deepEqual(player.position, position);
});

test('successful placement retains useful facing while restoring pitch and zoom', () => {
  const { follow, read, view } = fixture(), before = read();
  view(begin); view(close('placed'));
  near(follow.getYaw(), -Math.PI / 2); near(read().pitch, before.pitch); near(read().zoom, before.zoom);
  const after = read(); view(begin); view(close('external'));
  assert.deepEqual(read(), after, 'a subsequent session restores its own starting view');
});

test('orientation close restores portrait pitch before switching to the untouched landscape profile', () => {
  const { camera, follow, read, view } = fixture(), before = read();
  view(begin); camera.aspect = 16 / 9; view(close('external'));
  near(follow.getPitch(), CAMERA_CONFIG_FOLLOW.pitch);
  near(follow.getYaw(), before.yaw); near(follow.getZoom(), before.zoom);
  camera.aspect = 412 / 915; follow.prepareForInput();
  near(follow.getPitch(), before.pitch);
});

test('landscape construction and invalid targets do not alter the camera', () => {
  for (const aspect of [16 / 9, 1]) {
    const { read, view } = fixture(aspect), before = read();
    view(begin); view(close('placed')); assert.deepEqual(read(), before);
  }
  const { read, view } = fixture(), before = read();
  view({ phase: 'begin', target: { x: NaN, z: 2 } }); view(close('external')); assert.deepEqual(read(), before);
});
