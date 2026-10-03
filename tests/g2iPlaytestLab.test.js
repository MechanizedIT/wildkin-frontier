import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createG2ISetup, getG2IConfig, createG2IStorage, isolateG2IProgress, grantG2IPrerequisites, g2iScenarioUrl } from '../src/dev/g2iPlaytestLab.js';
import { createFieldTaming } from '../src/companions/fieldTaming.js';
import { COMPANIONS } from '../src/companions/companionCatalog.js';
import { createTamingEquipmentUse } from '../src/equipment/tamingEquipment.js';
import { CREATURE_SPAWNS } from '../src/creatures/creatureConfig.js';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem, createRuntimeResourcePlacements } from '../src/resources/resourceSystem.js';
import { createFieldTool } from '../src/tools/fieldTool.js';

await RAPIER.init();

test('lab requires exact opt-in and no conflicting scout/author mode', () => {
  for (const query of ['', '?dev=1', '?g2i=0', '?g2i=true', '?g2i=1&author=1', '?g2i=1&scout=1']) assert.equal(getG2IConfig(query).enabled, false);
  assert.equal(getG2IConfig('?g2i=1').enabled, true);
  assert.equal(getG2IConfig('?g2i=1&scenario=999').scenario, 1);
  assert.equal(createG2ISetup(WORLD, getG2IConfig('')).world, WORLD);
});

test('each reset recreates identical placements; canonical world and gameplay settings stay unchanged', () => {
  const before = JSON.stringify(WORLD);
  for (let scenario = 1; scenario <= 3; scenario++) {
    const config = getG2IConfig(`?g2i=1&scenario=${scenario}`);
    const first = createG2ISetup(WORLD, config), baseline = structuredClone(first);
    first.world.regions[1].resources[0].pos.x = 999;
    assert.deepEqual(createG2ISetup(WORLD, config), baseline);
  }
  assert.equal(JSON.stringify(WORLD), before);
  const registry = createWorldRegistry(createG2ISetup(WORLD, getG2IConfig('?g2i=1')).world);
  const actor = registry.getAllCreatures().find(c => c.id === 'g2i-hostile');
  const template = CREATURE_SPAWNS.find(c => c.id === 'rusher_hunter');
  for (const key of ['type', 'temperament', 'noticeRadius', 'roamRadius', 'leashRadius']) assert.equal(actor[key], template[key]);
  assert.equal(registry.getAllResources().find(r => r.id === 'g2i-rock').type, 'rock');
});

test('lab placement runs the production resource and Field Tool during combat engagement', () => {
  const setup = createG2ISetup(WORLD, getG2IConfig('?g2i=1'));
  const registry = createWorldRegistry(setup.world);
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const placements = createRuntimeResourcePlacements(registry.getAllResources().filter(r => r.id === 'g2i-rock'));
    const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, placements);
    const tool = createFieldTool(new THREE.Group());
    const pos = { ...setup.feet, y: setup.feet.y + .522 };
    let hits = 0;
    for (let i = 0; i < 180; i++) tool.update(1 / 60, pos, { mode: 'IDLE', speed: 0, facing: setup.facingYaw }, {
      combatEngaged: true, autoHarvestEnabled: true, canAttack: true,
      getHarvestTargets: resources.getEligibleNodes, getManualHarvestTargets: () => resources.getManualTargets(pos),
      onUnifiedImpact({ resourceHits }) { for (const node of resourceHits) if (resources.applyHit(node)) hits++; },
    });
    assert.equal(hits, resources.nodes[0].type.maxChunks);
    assert.equal(resources.nodes[0].state.nodeState, 'RESPAWNING');
  } finally { world.free(); }
});

test('demo progress, grants, resets, settings and transfer cannot reach ordinary saves', () => {
  const owner = createG2IStorage(); owner.setItem('wildkin.settings', 'owner settings');
  const original = createFrontierProgress({ resourceDrops: WORLD.resourceDrops, storage: owner }); original.load(); original.collectResources({ berries: 8 });
  const saved = owner.getItem(original.getStorageKey());
  const memory = createG2IStorage();
  const demo = isolateG2IProgress(createFrontierProgress({ resourceDrops: WORLD.resourceDrops, storage: memory })); demo.load();
  grantG2IPrerequisites(demo, 3);
  assert.equal(demo.getFieldSupplies().berry_lure, 1);
  demo.collectResources({ stone: 3 }); demo.save(); memory.setItem('wildkin.settings', 'demo settings');
  assert.equal(demo.exportSave().reason, 'demo-session');
  assert.equal(demo.importSave(original.exportSave().payload).reason, 'demo-session');
  demo.clear();
  assert.equal(owner.getItem(original.getStorageKey()), saved);
  assert.equal(owner.getItem('wildkin.settings'), 'owner settings');
  const normal = createFrontierProgress({ resourceDrops: WORLD.resourceDrops, storage: owner }); normal.load(); assert.equal(normal.getPackResourceCounts().berries, 8);
});

test('starter setup uses asset-hydrated actor, actual equipment targeting and production taming owner', () => {
  const setup = createG2ISetup(WORLD, getG2IConfig('?g2i=1&scenario=3'));
  const actor = createWorldRegistry(setup.world).getAllCreatures().find(c => c.id === 'g2i-mossling');
  assert.equal(actor.speciesTag, 'mossling'); assert.equal(actor.configOverrides.moveSpeed, 1.9);
  const progress = createFrontierProgress({ resourceDrops: WORLD.resourceDrops, storage: createG2IStorage() }); progress.load(); grantG2IPrerequisites(progress, 3);
  const target = { state: { id: actor.id, pos: actor.pos, health: 6 } };
  const player = { pos: setup.feet, grounded: true, speed: 0 };
  let intent = null;
  const taming = createFieldTaming({ getPlayer: () => player, getTarget: () => target, getSectionId: () => 'section_1',
    isActive: () => true, canStart: () => ({ ok: true }), consume: progress.consumeFieldSupply,
    placePoint: () => ({ x: -10, y: 0, z: 33.5 }), setIntent: (id, value) => intent = { id, ...value }, clearIntent() {}, capture() {} });
  const use = createTamingEquipmentUse({ progress, companions: { getFieldTamingState: taming.getState,
    beginBond: id => taming.begin(id, COMPANIONS[0]) }, creatures: { getActiveAliveCreatures: () => [{ ...target, state: { ...target.state, visualAssetId: actor.visualAsset.id, speciesTag: 'mossling' } }] }, getPlayerPosition: () => player.pos });
  assert.equal(use({ id: 'berry_lure', species: 'mossling' }).ok, true);
  assert.equal(taming.getState().stage, 'lure'); assert.equal(progress.getFieldSupplies().berry_lure, 0);
  assert.equal(intent.id, actor.id);
});

test('scenario navigation retains explicit lab opt-in and drops conflicting developer modes', () => {
  assert.equal(g2iScenarioUrl('http://localhost/?g2i=1&scout=1&author=1&dev=1', 2), 'http://localhost/?g2i=1&scenario=2');
});
