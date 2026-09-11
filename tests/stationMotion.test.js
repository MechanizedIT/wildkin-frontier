import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createStationMotion, STATION_MOTION_CONFIG } from '../src/base/stationMotion.js';

function station(kind) {
  const root = new THREE.Group();
  root.position.set(4, .8, -3);
  root.rotation.y = .7;
  root.scale.setScalar(1.2);
  const geometry = new THREE.BoxGeometry(.1, .1, .1);
  const material = new THREE.MeshStandardMaterial({ color: '#dcd4ba' });
  const shell = new THREE.Mesh(geometry, material);
  shell.name = 'StaticShell';
  root.add(shell);
  const first = new THREE.Mesh(geometry, material), second = new THREE.Mesh(geometry, material);
  if (kind === 'fabricator') {
    first.name = 'FabricatorCarriage'; first.position.set(.37, 1.48, -.015);
    second.name = 'FabricatorNozzle'; second.position.set(0, -.191, 0);
    first.add(second); root.add(first);
  } else if (kind === 'salvage') {
    first.name = 'SalvageViseJaw'; first.position.set(-.397, .938, -.169);
    root.add(first);
  } else {
    first.name = 'ResonanceRotor'; first.position.y = .559;
    second.name = 'ResonanceCrystal'; second.position.y = .647;
    root.add(first, second);
  }
  const anchor = new THREE.Object3D(); anchor.name = 'CraftOutputAnchor'; anchor.position.y = .553;
  root.add(anchor);
  return root;
}

function transforms(root) {
  const result = [];
  root.traverse(node => result.push([node.name, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
  return result;
}

for (const kind of ['fabricator', 'resonance', 'salvage']) {
  test(`${kind}: an active clone leaves the cached template, sibling and shared resources unchanged`, () => {
    const template = station(kind), first = template.clone(true), second = template.clone(true);
    const original = transforms(template), secondOriginal = transforms(second), firstOriginal = transforms(first);
    const controller = createStationMotion(first, kind), sibling = createStationMotion(second, kind);
    const material = template.children[0].material, color = material.color.getHex();
    assert.equal(first.children[0].geometry, template.children[0].geometry);
    assert.equal(first.children[0].material, material);
    assert.equal(controller.play({ outputId: 'test-product' }), true);
    controller.update(.9);
    assert.notDeepEqual(transforms(first), firstOriginal);
    assert.deepEqual(transforms(template), original);
    assert.deepEqual(transforms(second), secondOriginal);
    assert.equal(sibling.isOperating(), false);
    assert.deepEqual(first.position.toArray(), template.position.toArray());
    assert.deepEqual(first.getObjectByName('CraftOutputAnchor').position.toArray(), template.getObjectByName('CraftOutputAnchor').position.toArray());
    assert.equal(material.color.getHex(), color);
    controller.dispose();
    assert.deepEqual(transforms(first), firstOriginal);
    assert.equal(sibling.play(), true);
    sibling.update(.9);
    assert.notDeepEqual(transforms(second), secondOriginal);
    assert.deepEqual(transforms(template), original);
  });

  test(`${kind}: full cycle stays inside admitted clearances, completes once, and restores exact rest transforms`, () => {
    const root = station(kind), before = transforms(root), controller = createStationMotion(root, kind);
    const phases = new Set();
    let completions = 0, moved = false;
    controller.play({ outputId: 'crafted-tool' });
    for (let step = 0; step < 300; step += 1) {
      if (controller.update(.01)) completions += 1;
      phases.add(controller.getState().phase);
      if (kind === 'fabricator') {
        const x = root.getObjectByName('FabricatorCarriage').position.x - .37;
        const y = root.getObjectByName('FabricatorNozzle').position.y + .191;
        assert.ok(x >= -.1 - 1e-12 && x <= .04 + 1e-12);
        assert.ok(y >= -.25 - 1e-12 && y <= 1e-12);
        if (y < -.15) moved = true;
      } else if (kind === 'salvage') {
        const jaw = root.getObjectByName('SalvageViseJaw');
        const x = jaw.position.x + .397;
        assert.ok(x >= -.070 - 1e-12 && x <= 1e-12);
        assert.equal(jaw.position.y, .938);
        assert.equal(jaw.position.z, -.169);
        if (x < -.05) moved = true;
      } else {
        const rotor = root.getObjectByName('ResonanceRotor');
        const crystal = root.getObjectByName('ResonanceCrystal');
        assert.ok(crystal.position.y >= .647 - 1e-12 && crystal.position.y <= .702 + 1e-12);
        assert.equal(rotor.position.y, .559);
        assert.equal(crystal.position.x, 0);
        assert.equal(crystal.position.z, 0);
        if (crystal.position.y > .68 && Math.abs(rotor.quaternion.y) > .2) moved = true;
      }
    }
    assert.equal(moved, true);
    assert.deepEqual(phases, new Set(['preparing', 'working', 'returning', 'complete']));
    assert.equal(completions, 1);
    assert.deepEqual(transforms(root), before);
    assert.deepEqual(controller.getState(), { phase: 'complete', progress: 1, outputId: 'crafted-tool', operating: false });
    assert.equal(controller.update(100), false);
  });

  test(`${kind}: pause freezes both pose and time; reset cancels without reporting completion`, () => {
    const root = station(kind), before = transforms(root), controller = createStationMotion(root, kind);
    controller.play(); controller.update(.85);
    const frozen = transforms(root), state = controller.getState();
    assert.equal(controller.update(50, { paused: true, reducedMotion: true }), false);
    assert.deepEqual(transforms(root), frozen);
    assert.deepEqual(controller.getState(), state);
    controller.update(.1);
    assert.ok(controller.getState().progress > state.progress);
    controller.reset();
    assert.deepEqual(transforms(root), before);
    assert.deepEqual(controller.getState(), { phase: 'idle', progress: 0, outputId: null, operating: false });
    assert.equal(controller.update(50), false);
  });

  test(`${kind}: reduced motion remains visible, reduces travel, and preserves completion timing`, () => {
    const normalRoot = station(kind), reducedRoot = station(kind);
    const normal = createStationMotion(normalRoot, kind), reduced = createStationMotion(reducedRoot, kind);
    normal.play(); reduced.play();
    const half = STATION_MOTION_CONFIG.duration / 2;
    normal.update(half); reduced.update(half, { reducedMotion: true });
    const name = kind === 'fabricator' ? 'FabricatorNozzle' : kind === 'salvage' ? 'SalvageViseJaw' : 'ResonanceCrystal';
    const rest = kind === 'fabricator' ? -.191 : kind === 'salvage' ? -.397 : .647;
    const axis = kind === 'salvage' ? 'x' : 'y';
    const normalTravel = Math.abs(normalRoot.getObjectByName(name).position[axis] - rest);
    const reducedTravel = Math.abs(reducedRoot.getObjectByName(name).position[axis] - rest);
    assert.ok(reducedTravel > 0 && reducedTravel < normalTravel * .4);
    assert.equal(reduced.getState().phase, 'working');
    assert.equal(normal.update(half), true);
    assert.equal(reduced.update(half, { reducedMotion: true }), true);
  });
}

test('salvage jaw closes monotonically, holds without vibration, and releases once', () => {
  const root = station('salvage'), controller = createStationMotion(root, 'salvage');
  const jaw = root.getObjectByName('SalvageViseJaw');
  controller.play();
  let previous = jaw.position.x, heldPosition;
  for (let step = 0; step < 220; step += 1) {
    controller.update(.01);
    const phase = controller.getState().phase;
    if (phase === 'preparing') assert.ok(jaw.position.x <= previous + 1e-12);
    if (phase === 'working') {
      if (heldPosition === undefined) heldPosition = jaw.position.x;
      assert.equal(jaw.position.x, heldPosition);
    }
    if (phase === 'returning') assert.ok(jaw.position.x >= previous - 1e-12);
    previous = jaw.position.x;
  }
  assert.ok(Math.abs(heldPosition - (-.467)) < 1e-12);
  controller.update(.01);
  assert.equal(jaw.position.x, -.397);
});

test('busy play cannot restart a cycle or change its output; completed stations can start a new cycle', () => {
  const controller = createStationMotion(station('fabricator'), 'fabricator');
  assert.equal(controller.play({ outputId: 'first' }), true);
  controller.update(.6);
  const state = controller.getState();
  assert.equal(controller.play({ outputId: 'second' }), false);
  assert.deepEqual(controller.getState(), state);
  assert.equal(controller.update(20), true);
  assert.equal(controller.play({ outputId: 'second' }), true);
  assert.deepEqual(controller.getState(), { phase: 'preparing', progress: 0, outputId: 'second', operating: true });
});

test('invalid deltas do not poison timing; disposing restores pose and never disposes shared resources', () => {
  const root = station('resonance'), before = transforms(root), controller = createStationMotion(root, 'resonance');
  let disposals = 0;
  root.children[0].geometry.addEventListener('dispose', () => { disposals += 1; });
  root.children[0].material.addEventListener('dispose', () => { disposals += 1; });
  controller.play(); controller.update(.7);
  const state = controller.getState(), current = transforms(root);
  for (const dt of [NaN, Infinity, -Infinity, -1, 0, undefined, '2']) assert.equal(controller.update(dt), false);
  assert.deepEqual(controller.getState(), state);
  assert.deepEqual(transforms(root), current);
  controller.dispose(); controller.dispose();
  assert.deepEqual(transforms(root), before);
  assert.equal(controller.play(), false);
  assert.equal(controller.update(100), false);
  assert.equal(controller.isOperating(), false);
  assert.equal(disposals, 0);
  root.getObjectByName('ResonanceCrystal').position.y += .2;
  const reused = transforms(root);
  controller.reset(); controller.update(.1); controller.dispose();
  assert.deepEqual(transforms(root), reused);
});

test('unsupported or incomplete models do not bind or partially mutate the hierarchy', () => {
  assert.equal(createStationMotion(null, 'fabricator'), null);
  const root = station('fabricator'), before = transforms(root);
  assert.equal(createStationMotion(root, 'unknown'), null);
  assert.equal(createStationMotion(root, 'resonance'), null);
  assert.equal(createStationMotion(root, 'salvage'), null);
  assert.deepEqual(transforms(root), before);
  const nozzle = root.getObjectByName('FabricatorNozzle');
  root.attach(nozzle);
  const detached = transforms(root);
  assert.equal(createStationMotion(root, 'fabricator'), null);
  assert.deepEqual(transforms(root), detached);
});
