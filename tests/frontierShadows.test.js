import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { initializeFrontierShadows } from '../src/presentation/frontierShadows.js';

test('nearby shadow coverage follows travel and elevation without changing the sun direction', () => {
  const scene = new THREE.Scene(), sun = new THREE.DirectionalLight(), player = new THREE.Group();
  scene.add(sun, player);
  const shadows = initializeFrontierShadows({ scene, sun, player });
  const direction = sun.position.clone().sub(sun.target.position).normalize();
  for (const pos of [[0, .52, 32], [0, 3.02, -30], [-30, 1.3, 18]]) {
    player.position.set(...pos); shadows.update();
    assert.ok(sun.target.position.distanceTo(player.position) < .001);
    assert.ok(sun.position.clone().sub(sun.target.position).normalize().distanceTo(direction) < .001);
  }
  shadows.update(true); assert.equal(sun.castShadow, false);
  shadows.update(false); assert.equal(sun.castShadow, true);
  shadows.dispose(); assert.equal(sun.castShadow, false);
});
