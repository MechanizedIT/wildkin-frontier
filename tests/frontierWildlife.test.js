import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import WORLD_DATA from '../src/world/data/world.js';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { identifyCompanion } from '../src/companions/companionCatalog.js';
import { FRONTIER_CALDERA_WILDLIFE_ANCHOR, FRONTIER_FUNGAL_WILDLIFE_ANCHOR, FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR, sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { createFrontierWildlifeRuntime } from '../src/world/frontierWildlifeRuntime.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { sampleFrontierRegionalPlaceChunk } from '../src/world/frontierRegionalPlace.js';
import { FRONTIER_CALDERA_RESOURCE_ANCHORS } from '../src/world/frontierEcology.js';
import { sampleFrontierCalderaFeature } from '../src/world/frontierCaldera.js';
import { FRONTIER_FUNGAL_CONFIG, overlapsFrontierFungalOuting } from '../src/world/frontierFungalHollow.js';

function residency(cx, cz) {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z += 1) for (let x = cx - 2; x <= cx + 2; x += 1) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return Object.freeze({ center: Object.freeze({ cx, cz }), chunks: Object.freeze(chunks) });
}

function owner() {
  const actors = [];
  return {
    actors,
    getCreatures: () => actors,
    getAllAliveCreatures: () => actors,
    addGeneratedCreatures: (spawns) => {
      const added = spawns.filter((spawn) => !actors.some((actor) => actor.state.id === spawn.id)).map((spawn) => ({ state: { ...spawn } }));
      actors.push(...added); return added;
    },
    removeGeneratedCreaturesByChunk: (chunkId) => {
      for (let index = actors.length - 1; index >= 0; index -= 1) if (actors[index].state.generatedChunkId === chunkId) actors.splice(index, 1);
    },
    removeGeneratedCreatureByOrigin: (originId) => {
      const index = actors.findIndex((actor) => actor.state.originId === originId);
      return index < 0 ? null : actors.splice(index, 1)[0];
    },
  };
}

const TRAILGLOAM_ASSET = Object.freeze({
  id: 'asset_wildkin_trailgloam',
  gameplay: Object.freeze({ role: 'wildkin', wildkin: Object.freeze({
    speciesTag: 'trailgloam', archetype: 'rusher', temperament: 'SKITTISH',
    health: 6, moveSpeed: .6060606060606061, damage: 1, respawnSeconds: 28,
    roamRadius: 1.8, noticeRadius: 7, personalSpace: 2, leashRadius: 3, hostileSpecies: Object.freeze([]),
  }) }),
  model: Object.freeze({
    path: 'assets/models/trailgloam-fitted-r1/model.glb', scale: 1, pivot: Object.freeze({ x: 0, y: 0, z: 0 }),
    clips: Object.freeze({ idle: 'Loaded', walk: 'WalkDiagnostic' }),
    locomotion: Object.freeze({ walk: .21212121212121213 }),
  }),
});

test('wildlife rejects a home whose complete movement disk reaches the wet margin', () => {
  const wet = () => ({ height: 4, coastDistance: 1, habitatBlend: { wetland: 0, fernUpland: 1 }, surfaceKind: null });
  assert.deepEqual(sampleFrontierWildlifeChunk(12, 12, { getTerrainSample: wet }), []);
});

test('starter wildlife keeps the first two Mossling identities and adds stable side encounters', () => {
  const [first, second, tidefin] = sampleFrontierWildlifeChunk(0, -2);
  const [again] = sampleFrontierWildlifeChunk(0, -2);
  const [emberhorn] = sampleFrontierWildlifeChunk(0, -3);
  assert.equal(first.originId, 'f1:w:0:-2:0');
  assert.equal(second.originId, 'f1:w:0:-2:1');
  assert.deepEqual(first.pos, { x: 7, y: first.pos.y, z: -85 });
  assert.deepEqual({ roam: first.roamRadius, leash: first.leashRadius, fleeLeash: first.fleeLeashRadius }, { roam: 2.6, leash: 4.2, fleeLeash: 3.5 });
  assert.deepEqual(first.genome, createWildkinGenome(first.originId, 'fen'));
  assert.deepEqual(again, first);
  assert.deepEqual({ id: tidefin.originId, species: tidefin.speciesTag, x: tidefin.pos.x, z: tidefin.pos.z, genome: tidefin.genome, priority: tidefin.residentPriority },
    { id: 'f1:w:0:-2:2', species: 'tidefin', x: 17, z: -79, genome: null, priority: 2 });
  assert.deepEqual({ id: emberhorn.originId, species: emberhorn.speciesTag, x: emberhorn.pos.x, z: emberhorn.pos.z, genome: emberhorn.genome, priority: emberhorn.residentPriority },
    { id: 'f1:w:0:-3:0', species: 'emberhorn', x: 0, z: -111, genome: null, priority: 3 });
});

test('generated side encounters deliberately match shipped catalog behavior', () => {
  const sources = [...sampleFrontierWildlifeChunk(0, -2), ...sampleFrontierWildlifeChunk(0, -3)];
  for (const speciesId of ['tidefin', 'emberhorn']) {
    const source = sources.find((candidate) => candidate.speciesTag === speciesId);
    const asset = WORLD_DATA.visualAssets.find((candidate) => candidate.id === `asset_wildkin_${speciesId}`);
    const shipped = asset.gameplay.wildkin;
    assert.deepEqual({
      type: source.type, speciesTag: source.speciesTag, temperament: source.temperament,
      roamRadius: source.roamRadius, noticeRadius: source.noticeRadius,
      personalSpace: source.personalSpace, leashRadius: source.leashRadius,
      hostileSpecies: source.hostileSpecies,
      health: source.configOverrides.health, moveSpeed: source.configOverrides.moveSpeed,
      damage: source.configOverrides.damage, respawnSeconds: source.configOverrides.respawnSeconds,
    }, {
      type: shipped.archetype, speciesTag: shipped.speciesTag, temperament: shipped.temperament,
      roamRadius: shipped.roamRadius, noticeRadius: shipped.noticeRadius,
      personalSpace: shipped.personalSpace, leashRadius: shipped.leashRadius,
      hostileSpecies: shipped.hostileSpecies,
      health: shipped.health, moveSpeed: shipped.moveSpeed,
      damage: shipped.damage, respawnSeconds: shipped.respawnSeconds,
    });
    assert.equal(source.visualAssetId, asset.id);
  }
});

test('regional wildlife preserves zero-influence Mosslings and gives the Sunscar witness one bounded signature', () => {
  const legacySample = () => ({ height: 4, habitatBlend: { wetland: .3, fernUpland: .7 }, surfaceKind: null });
  const reservedSample = () => ({ ...legacySample(), provinceKind: 'sunscar', provinceInfluence: 0, provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 } });
  assert.deepEqual(
    sampleFrontierWildlifeChunk(1, -1, { getTerrainSample: reservedSample }),
    sampleFrontierWildlifeChunk(1, -1, { getTerrainSample: legacySample }),
  );
  const witnessChunk = { cx: -44, cz: -8 };
  const [witness] = sampleFrontierWildlifeChunk(witnessChunk.cx, witnessChunk.cz);
  assert.equal(sampleFrontier((witnessChunk.cx + .5) * 50, (witnessChunk.cz + .5) * 50).habitatId, 'sunscar-desert');
  assert.deepEqual({ species: witness.speciesTag, signature: witness.regionalSignature, priority: witness.residentPriority },
    { species: 'emberhorn', signature: true, priority: 90 });

  const profileSample = kind => () => ({
    height: 4,
    habitatBlend: { wetland: kind === 'lush' ? 1 : 0, fernUpland: kind === 'lush' ? 0 : 1 },
    surfaceKind: null,
    provinceInfluence: 1,
    provinceWeights: { lush: kind === 'lush' ? 1 : 0, sunscar: kind === 'sunscar' ? 1 : 0, ironspine: kind === 'ironspine' ? 1 : 0 },
  });
  assert.equal(sampleFrontierWildlifeChunk(6, -30, { getTerrainSample: profileSample('lush') })[0].speciesTag, 'tidefin');
  assert.equal(sampleFrontierWildlifeChunk(6, -30, { getTerrainSample: profileSample('sunscar') })[0].speciesTag, 'emberhorn');
  assert.equal(sampleFrontierWildlifeChunk(6, -30, { getTerrainSample: profileSample('ironspine') })[0].speciesTag, 'emberhorn');
});

test('regional wildlife rejects an intersecting full home disk and retries outside the whole bloom', () => {
  const reserved = () => ({
    height: 9, habitatBlend: { wetland: 0, fernUpland: 1 }, surfaceKind: null,
    provinceKind: null, provinceInfluence: 0, provinceWeights: { lush: 0, sunscar: 0, ironspine: 0 },
  });
  const sunscar = () => ({
    ...reserved(), provinceKind: 'sunscar', provinceInfluence: 1,
    provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 },
  });
  const place = sampleFrontierRegionalPlaceChunk(37, -150, { getTerrainSample: sunscar, getHeight: () => 9 });
  const [unreserved] = sampleFrontierWildlifeChunk(37, -150, { getTerrainSample: reserved, visualAssets: WORLD_DATA.visualAssets });
  const [placed] = sampleFrontierWildlifeChunk(37, -150, { getTerrainSample: sunscar, visualAssets: WORLD_DATA.visualAssets });
  assert.ok(place && unreserved && placed);
  const priorDistance = Math.hypot(unreserved.homePos.x - place.center.x, unreserved.homePos.z - place.center.z);
  assert.ok(priorDistance < place.radius + unreserved.leashRadius, 'the prior stable home disk intersects the place');
  assert.notDeepEqual(placed.homePos, unreserved.homePos, 'the candidate loop advances instead of admitting the intersecting home');
  const movementRadius = Math.max(placed.roamRadius, placed.leashRadius, placed.fleeLeashRadius ?? 0);
  assert.ok(Math.hypot(placed.homePos.x - place.center.x, placed.homePos.z - place.center.z) >= place.radius + movementRadius);
});

test('Caldera admits one stable territorial Emberhorn on its complete supported bowl disk', () => {
  const emberAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_wildkin_emberhorn');
  const [source] = sampleFrontierWildlifeChunk(
    FRONTIER_CALDERA_WILDLIFE_ANCHOR.cx,
    FRONTIER_CALDERA_WILDLIFE_ANCHOR.cz,
    { visualAssets: [emberAsset] },
  );
  assert.deepEqual({
    id: source.originId, species: source.speciesTag, temperament: source.temperament,
    x: source.homePos.x, z: source.homePos.z, priority: source.residentPriority,
    roam: source.roamRadius, notice: source.noticeRadius, leash: source.leashRadius,
    health: source.configOverrides.health, speed: source.configOverrides.moveSpeed,
    damage: source.configOverrides.damage, signature: source.regionalSignature,
  }, {
    id: 'f1:w:17:-40:300', species: 'emberhorn', temperament: 'TERRITORIAL',
    x: 850, z: -1986, priority: 1,
    roam: 4.5, notice: 7, leash: 10,
    health: 12, speed: 2.1, damage: 2, signature: true,
  });
  assert.equal(source.visualAssetId, emberAsset.id);
  assert.equal(source.calderaFeature, true);
  assert.equal(hasFootprintSupport(source.homePos.x, source.homePos.z, {
    getHeight: (x, z) => sampleFrontier(x, z).height,
    radius: FRONTIER_CALDERA_WILDLIFE_ANCHOR.movementRadius,
    maxSlope: .32,
  }), true);
  for (let dx = -10; dx <= 10; dx += 2) for (let dz = -10; dz <= 10; dz += 2) {
    if (dx * dx + dz * dz > 100) continue;
    const x = source.homePos.x + dx, z = source.homePos.z + dz;
    const sample = sampleFrontier(x, z);
    assert.equal(sample.habitatId, 'emberglass-caldera');
    assert.ok(['bowl', 'breach'].includes(sampleFrontierCalderaFeature(x, z).zone));
    assert.ok(sample.coastDistance > 10, 'the complete encounter disk remains dry land');
  }
  const ironDistance = Math.hypot(
    source.homePos.x - FRONTIER_CALDERA_RESOURCE_ANCHORS.iron.x,
    source.homePos.z - FRONTIER_CALDERA_RESOURCE_ANCHORS.iron.z,
  );
  assert.ok(ironDistance > source.noticeRadius && ironDistance < source.leashRadius,
    'the nearer useful mineral enters readable danger after the ordinary approach');
});

test('Caldera encounter fails closed, replaces broad generic wildlife, and keeps the fixed core unique', () => {
  const emberAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_wildkin_emberhorn');
  assert.deepEqual(sampleFrontierWildlifeChunk(17, -40), [], 'missing admitted Emberhorn art leaves no invisible fixed threat');
  assert.deepEqual(sampleFrontierWildlifeChunk(17, -40, {
    visualAssets: [{ ...emberAsset, gameplay: { role: 'prop' } }],
  }), [], 'the fixed source requires the admitted Wildkin recipe');

  const regionalSample = calderaWeight => () => ({
    height: 10, coastDistance: 100, land: true, contentLand: true, hasTerrain: true,
    habitatBlend: { wetland: 1, fernUpland: 0 }, surfaceKind: null,
    provinceInfluence: 1, provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 },
    habitatId: 'emberglass-caldera', habitatWeights: { 'emberglass-caldera': calderaWeight },
  });
  const full = sampleFrontierWildlifeChunk(6, -30, { getTerrainSample: regionalSample(1) });
  const zero = sampleFrontierWildlifeChunk(6, -30, { getTerrainSample: regionalSample(0) });
  const legacy = sampleFrontierWildlifeChunk(6, -30, {
    getTerrainSample: () => ({ ...regionalSample(0)(), habitatWeights: undefined }),
  });
  assert.equal(full[0].speciesTag, 'emberhorn');
  assert.equal(full[0].regionalSignature, true);
  assert.deepEqual(zero, legacy, 'zero Caldera weight preserves the exact prior wildlife recipe');

  const fixed = sampleFrontierWildlifeChunk(17, -40, { visualAssets: [emberAsset] });
  assert.deepEqual(fixed.map(source => source.originId), ['f1:w:17:-40:300']);
  for (const [cx, cz] of [[16, -40], [17, -39], [16, -39]]) {
    const ordinary = sampleFrontierWildlifeChunk(cx, cz, {
      getTerrainSample: (x, z) => sampleFrontier(x, z), visualAssets: [emberAsset],
    });
    assert.ok(ordinary.every(source => !source.calderaFeature));
    assert.ok(ordinary.every(source => Math.hypot(source.homePos.x - 850, source.homePos.z + 2000) >= 64 + source.leashRadius),
      'neighboring ordinary movement disks stay outside the fixed crater core');
  }
});

test('Caldera fixed Emberhorn wins residency and stays absent after capture', () => {
  const emberAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_wildkin_emberhorn');
  const captured = new Set();
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({
    terrainRuntime: { getResidency: () => residency(17, -40), sample: sampleFrontier },
    creatureSystem: creatures,
    visualAssets: [emberAsset],
    isSourceCaptured: id => captured.has(id),
  });
  runtime.update();
  assert.ok(creatures.actors.length <= 4);
  assert.ok(creatures.actors.some(actor => actor.state.originId === 'f1:w:17:-40:300'));
  captured.add('f1:w:17:-40:300');
  runtime.update();
  assert.equal(creatures.actors.some(actor => actor.state.originId === 'f1:w:17:-40:300'), false);
  runtime.dispose();
});

test('Fungal Hollow admits one exact aggressive Thornprowler on its full supported home disk', () => {
  const thornAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_thornprowler');
  const [source] = sampleFrontierWildlifeChunk(
    FRONTIER_FUNGAL_WILDLIFE_ANCHOR.cx,
    FRONTIER_FUNGAL_WILDLIFE_ANCHOR.cz,
    { visualAssets: [thornAsset] },
  );
  assert.deepEqual({
    id: source.originId,
    species: source.speciesTag,
    asset: source.visualAssetId,
    type: source.type,
    temperament: source.temperament,
    x: source.homePos.x,
    z: source.homePos.z,
    priority: source.residentPriority,
    roam: source.roamRadius,
    notice: source.noticeRadius,
    personalSpace: source.personalSpace,
    leash: source.leashRadius,
    genome: source.genome,
    overrides: source.configOverrides,
  }, {
    id: 'f1:w:-58:-26:450',
    species: 'thornprowler',
    asset: 'asset_thornprowler',
    type: 'rusher',
    temperament: 'AGGRESSIVE',
    x: -2868,
    z: -1260,
    priority: 1,
    roam: 4.5,
    notice: 7,
    personalSpace: 2,
    leash: 10,
    genome: null,
    overrides: { health: 7, moveSpeed: 2.6, damage: 1, respawnSeconds: 28 },
  });
  assert.equal(source.fungalFeature, true);
  assert.equal(identifyCompanion({ state: source }), null, 'the exact hostile asset has no companion identity or observation path');
  assert.equal(hasFootprintSupport(source.homePos.x, source.homePos.z, {
    getHeight: (x, z) => sampleFrontier(x, z).height,
    radius: FRONTIER_FUNGAL_WILDLIFE_ANCHOR.radius,
    maxSlope: .32,
  }), true);
  for (let dx = -10; dx <= 10; dx += 2) for (let dz = -10; dz <= 10; dz += 2) {
    if (dx * dx + dz * dz > 100) continue;
    const sample = sampleFrontier(source.homePos.x + dx, source.homePos.z + dz);
    assert.equal(sample.habitatId, FRONTIER_FUNGAL_CONFIG.habitatId);
    assert.equal(sample.contentLand, true);
  }
});

test('Thornprowler exact-asset admission fails closed on aliases, recipe drift, and unsafe support', () => {
  const thornAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_thornprowler');
  const recipe = thornAsset.gameplay.wildkin;
  const sample = visualAssets => sampleFrontierWildlifeChunk(-58, -26, { visualAssets });
  assert.deepEqual(sample([]), []);
  assert.deepEqual(sample([{ ...thornAsset, id: 'asset_wildkin_thornprowler' }]), [], 'the canonical asset cannot be aliased');
  assert.deepEqual(sample([{ ...thornAsset, gameplay: { role: 'prop', wildkin: recipe } }]), []);
  assert.deepEqual(sample([{ ...thornAsset, gameplay: { role: 'wildkin', wildkin: { ...recipe, speciesTag: 'mossling' } } }]), []);
  assert.deepEqual(sample([{ ...thornAsset, gameplay: { role: 'wildkin', wildkin: { ...recipe, damage: 0 } } }]), []);
  const anchor = FRONTIER_FUNGAL_WILDLIFE_ANCHOR;
  const steep = (x, z) => ({
    height: x > anchor.x + 1 ? 8 : 0,
    coastDistance: 100,
    land: true,
    contentLand: true,
    habitatId: FRONTIER_FUNGAL_CONFIG.habitatId,
    habitatBlend: { wetland: 1, fernUpland: 0 },
  });
  assert.deepEqual(sampleFrontierWildlifeChunk(-58, -26, {
    visualAssets: [thornAsset], getTerrainSample: steep,
  }), [], 'one unsupported interior step rejects the full home disk');
});

test('ordinary wildlife movement disks remain outside the complete Fungal outing', () => {
  const flatFungal = () => ({
    height: 10,
    coastDistance: 100,
    land: true,
    contentLand: true,
    habitatId: FRONTIER_FUNGAL_CONFIG.habitatId,
    habitatBlend: { wetland: 1, fernUpland: 0 },
  });
  const ordinary = [];
  for (let cz = -28; cz <= -23; cz += 1) for (let cx = -60; cx <= -55; cx += 1) {
    if (cx === -58 && cz === -26) continue;
    ordinary.push(...sampleFrontierWildlifeChunk(cx, cz, { getTerrainSample: flatFungal }));
  }
  assert.ok(ordinary.length > 0);
  assert.ok(ordinary.every(source => {
    const radius = Math.max(source.roamRadius, source.leashRadius, source.fleeLeashRadius ?? 0);
    return !overlapsFrontierFungalOuting(source.homePos.x, source.homePos.z, radius);
  }));
});

test('Fungal resident priority loads the Thornprowler once and normal retirement restores the same origin', () => {
  const thornAsset = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_thornprowler');
  let snapshot = residency(-58, -26);
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({
    terrainRuntime: { getResidency: () => snapshot, sample: sampleFrontier },
    creatureSystem: creatures,
    visualAssets: [thornAsset],
  });
  runtime.update();
  assert.equal(creatures.actors.filter(actor => actor.state.originId === 'f1:w:-58:-26:450').length, 1);
  assert.ok(creatures.actors.length <= 4);
  snapshot = residency(8, 8);
  runtime.update();
  assert.equal(creatures.actors.some(actor => actor.state.originId === 'f1:w:-58:-26:450'), false);
  snapshot = residency(-58, -26);
  runtime.update();
  assert.equal(creatures.actors.filter(actor => actor.state.originId === 'f1:w:-58:-26:450').length, 1);
  runtime.dispose();
});

test('Rootbound admits one exact, cadence-correct Trailgloam source without changing Mossling identities', () => {
  const anchor = FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR;
  assert.deepEqual(sampleFrontierWildlifeChunk(anchor.cx, anchor.cz), [], 'missing art leaves no invisible Trailgloam resident');
  const [source] = sampleFrontierWildlifeChunk(anchor.cx, anchor.cz, { visualAssets: [TRAILGLOAM_ASSET] });
  assert.deepEqual({
    id: source.originId, chunk: source.generatedChunkId, species: source.speciesTag, asset: source.visualAssetId,
    type: source.type, temperament: source.temperament, x: source.homePos.x, z: source.homePos.z,
    roam: source.roamRadius, leash: source.leashRadius, fleeLeash: source.fleeLeashRadius,
    priority: source.residentPriority, feature: source.rootboundTrailgloamFeature, genome: source.genome,
    overrides: source.configOverrides,
  }, {
    id: 'f1:w:-10:13:700', chunk: '-10,13', species: 'trailgloam', asset: 'asset_wildkin_trailgloam',
    type: 'rusher', temperament: 'SKITTISH', x: -463, z: 685,
    roam: 1.8, leash: 3, fleeLeash: 3.3,
    priority: 1, feature: true, genome: null,
    overrides: {
      health: 6, moveSpeed: .6060606060606061, damage: 1, respawnSeconds: 28,
      capsuleRadius: .48, capsuleHalfHeight: .02,
    },
  });
  assert.equal(source.configOverrides.moveSpeed * .35, TRAILGLOAM_ASSET.model.locomotion.walk,
    'the existing rusher ROAM multiplier preserves the fitted WalkDiagnostic cadence');
  assert.deepEqual({
    type: source.type, speciesTag: source.speciesTag, temperament: source.temperament,
    health: source.configOverrides.health, moveSpeed: source.configOverrides.moveSpeed,
    damage: source.configOverrides.damage, respawnSeconds: source.configOverrides.respawnSeconds,
    roamRadius: source.roamRadius, noticeRadius: source.noticeRadius,
    personalSpace: source.personalSpace, leashRadius: source.leashRadius, hostileSpecies: source.hostileSpecies,
  }, {
    type: TRAILGLOAM_ASSET.gameplay.wildkin.archetype, speciesTag: TRAILGLOAM_ASSET.gameplay.wildkin.speciesTag,
    temperament: TRAILGLOAM_ASSET.gameplay.wildkin.temperament, health: TRAILGLOAM_ASSET.gameplay.wildkin.health,
    moveSpeed: TRAILGLOAM_ASSET.gameplay.wildkin.moveSpeed, damage: TRAILGLOAM_ASSET.gameplay.wildkin.damage,
    respawnSeconds: TRAILGLOAM_ASSET.gameplay.wildkin.respawnSeconds, roamRadius: TRAILGLOAM_ASSET.gameplay.wildkin.roamRadius,
    noticeRadius: TRAILGLOAM_ASSET.gameplay.wildkin.noticeRadius, personalSpace: TRAILGLOAM_ASSET.gameplay.wildkin.personalSpace,
    leashRadius: TRAILGLOAM_ASSET.gameplay.wildkin.leashRadius, hostileSpecies: TRAILGLOAM_ASSET.gameplay.wildkin.hostileSpecies,
  }, 'the fixed source mirrors the admitted gameplay recipe except its deliberate flee/capsule boundary');
  assert.ok(Math.abs(source.configOverrides.moveSpeed * 1.6 - .9696969696969697) < 1e-12,
    'existing early SKITTISH FLEE remains intentionally faster than ROAM');
  assert.ok(Math.abs(source.configOverrides.moveSpeed * .85 - .5151515151515151) < 1e-12,
    'existing RETURN remains intentionally faster than ROAM');
  assert.equal(hasFootprintSupport(anchor.x, anchor.z, {
    getHeight: (x, z) => sampleFrontier(x, z).height, radius: anchor.fleeLeashRadius, maxSlope: .32,
  }), true, 'the complete fixed movement disk is supported by current Rootbound terrain');
  assert.deepEqual(sampleFrontierWildlifeChunk(-9, 14).map(entry => entry.originId), ['f1:w:-9:14:0']);
  assert.deepEqual(sampleFrontierWildlifeChunk(-8, 13).map(entry => entry.originId), ['f1:w:-8:13:0']);
});

test('Rootbound Trailgloam fails closed for alternate worlds, recipe drift, and unsafe home support', () => {
  const anchor = FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR;
  const sample = options => sampleFrontierWildlifeChunk(anchor.cx, anchor.cz, options);
  const defaultFallback = sample({ visualAssets: [] });
  const alternateFallback = sample({ visualAssets: [], world: { edition: 1, seed: 17 } });
  assert.deepEqual(sample({ visualAssets: [TRAILGLOAM_ASSET], world: { edition: 1, seed: 17 } }), alternateFallback,
    'an alternate world retains its normal deterministic sampler output');
  assert.deepEqual(sample({ visualAssets: [{ ...TRAILGLOAM_ASSET, id: 'asset_wildkin_mossling' }] }), defaultFallback,
    'a wrong asset identity falls through to the pre-existing default sampler');
  assert.deepEqual(sample({ visualAssets: [{ ...TRAILGLOAM_ASSET, model: { ...TRAILGLOAM_ASSET.model, locomotion: { walk: .3 } } }] }), defaultFallback,
    'a locomotion-contract mismatch also leaves the prior sampler untouched');
  assert.deepEqual(sample({ visualAssets: [{ ...TRAILGLOAM_ASSET, model: { ...TRAILGLOAM_ASSET.model, path: 'assets/models/other/model.glb' } }] }), defaultFallback,
    'a model-package path mismatch also leaves the prior sampler untouched');
  assert.deepEqual(sample({ visualAssets: [{ ...TRAILGLOAM_ASSET, gameplay: { ...TRAILGLOAM_ASSET.gameplay, wildkin: { ...TRAILGLOAM_ASSET.gameplay.wildkin, moveSpeed: .7 } } }] }), defaultFallback,
    'a gameplay recipe drift also leaves the prior sampler untouched');
  assert.deepEqual(sample({
    visualAssets: [TRAILGLOAM_ASSET],
    getTerrainSample: (x, z) => ({
      ...sampleFrontier(x, z),
      height: x > anchor.x + 1 ? 12 : 8,
    }),
  }), defaultFallback, 'one unsafe half-metre interior step falls through instead of suppressing prior sampling');
});

test('Rootbound Trailgloam has one stable resident across ordinary stream retirement', () => {
  let snapshot = residency(-10, 13);
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({
    terrainRuntime: { getResidency: () => snapshot, sample: sampleFrontier },
    creatureSystem: creatures, visualAssets: [TRAILGLOAM_ASSET],
  });
  runtime.update();
  assert.equal(creatures.actors.filter(actor => actor.state.originId === 'f1:w:-10:13:700').length, 1);
  snapshot = residency(8, 8); runtime.update();
  assert.equal(creatures.actors.some(actor => actor.state.originId === 'f1:w:-10:13:700'), false);
  snapshot = residency(-10, 13); runtime.update();
  assert.equal(creatures.actors.filter(actor => actor.state.originId === 'f1:w:-10:13:700').length, 1);
  runtime.dispose();
});

test('runtime bounds live sources, retires unloaded chunks, and never restores a captured source', () => {
  let snapshot = residency(0, -2);
  const captured = new Set();
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => snapshot }, creatureSystem: creatures, isSourceCaptured: (id) => captured.has(id) });
  runtime.update();
  assert.ok(creatures.actors.length > 0 && creatures.actors.length <= 4);
  const target = creatures.actors[0].state;
  const sibling = creatures.actors.find((actor) => actor.state.originId !== target.originId)?.state;
  captured.add(target.originId);
  runtime.update();
  assert.equal(creatures.actors.some((actor) => actor.state.originId === target.originId), false, 'capture is checked without residency change');
  assert.equal(creatures.actors.some((actor) => actor.state.originId === sibling?.originId), true, 'capturing one source leaves its resident sibling intact');
  snapshot = residency(8, 8); runtime.update();
  assert.ok(creatures.actors.length <= 4);
  snapshot = residency(0, -2); runtime.update();
  assert.equal(creatures.actors.some((actor) => actor.state.originId === target.originId), false, 'captured source stays absent after revisit');
  runtime.dispose();
  assert.equal(creatures.actors.length, 0);
});

test('runtime does not exceed the four generated-resident cap', () => {
  const creatures = owner();
  for (let index = 0; index < 4; index += 1) creatures.actors.push({ state: { id: `existing-${index}`, isGeneratedResident: true, generatedChunkId: `old-${index}`, isDead: index === 0 } });
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => residency(0, -2) }, creatureSystem: creatures });
  runtime.update();
  assert.equal(creatures.actors.length, 4);
  runtime.dispose();
});

test('runtime admits at most one ordinary regional signature while retaining lower-draw neighbors', () => {
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({
    terrainRuntime: { getResidency: () => residency(-13, -7), sample: sampleFrontier },
    creatureSystem: creatures,
  });
  runtime.update();
  assert.equal(creatures.actors.filter(actor => actor.state.regionalSignature).length, 1);
  assert.ok(creatures.actors.some(actor => actor.state.speciesTag === 'mossling'));
  assert.ok(creatures.actors.length <= 4);
  runtime.dispose();
});

test('staged animals replace a lower-priority random resident when their chunk enters residency', () => {
  let snapshot = residency(1, -1);
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => snapshot }, creatureSystem: creatures });
  runtime.update();
  assert.deepEqual(creatures.actors.map((actor) => actor.state.originId).sort(), [
    'f1:w:0:-2:0', 'f1:w:0:-2:1', 'f1:w:0:-2:2', 'f1:w:1:-1:0',
  ]);
  snapshot = residency(1, -2);
  runtime.update();
  assert.deepEqual(creatures.actors.map((actor) => actor.state.originId).sort(), [
    'f1:w:0:-2:0', 'f1:w:0:-2:1', 'f1:w:0:-2:2', 'f1:w:0:-3:0',
  ]);
  runtime.update();
  assert.equal(creatures.actors.length, 4, 'unchanged residency does not rebuild resident actors');
  runtime.dispose();
});

test('a chunk fills its remaining stable source when a cap slot later opens', () => {
  const creatures = owner();
  for (let index = 0; index < 3; index += 1) creatures.actors.push({ state: { id: `existing-${index}`, isGeneratedResident: true, generatedChunkId: `old-${index}` } });
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => residency(0, -2) }, creatureSystem: creatures });
  runtime.update();
  assert.deepEqual(creatures.actors.filter((actor) => actor.state.originId).map((actor) => actor.state.originId), ['f1:w:0:-2:0']);
  creatures.actors.splice(0, 1);
  runtime.update();
  assert.deepEqual(creatures.actors.filter((actor) => actor.state.originId).map((actor) => actor.state.originId).sort(), ['f1:w:0:-2:0', 'f1:w:0:-2:1']);
  runtime.dispose();
});

test('generated creature retirement disposes only generated residents and reset retains authored lifecycle', () => {
  const authored = { id: 'authored', type: 'rusher', pos: { x: 0, y: 0, z: 0 }, regionId: 'camp' };
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [authored] });
  const [generated] = system.addGeneratedCreatures([{ id: 'f1:w:0:-2:0', originId: 'f1:w:0:-2:0', generatedChunkId: '0,-2', isGeneratedResident: true, type: 'rusher', pos: { x: 10, y: 0, z: -85 }, regionId: 'camp', genome: createWildkinGenome('f1:w:0:-2:0', 'fen') }]);
  assert.equal(generated.state.isGeneratedResident, true);
  system.setFieldTamingIntent(generated.state.id, { hold: true });
  system.removeGeneratedCreaturesByChunk('0,-2');
  assert.equal(system._creatures.length, 1);
  assert.equal(system._creatures[0].state.id, 'authored');
  system.reset();
  assert.equal(system._creatures.length, 1);
  assert.equal(system._creatures[0].state.aiState, 'ROAM');
  system.dispose();
});

test('staged Mossling flee remains autonomous but turns back at its local boundary', () => {
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [{
    id: 'f1:w:0:-2:0', originId: 'f1:w:0:-2:0', isGeneratedResident: true, type: 'rusher',
    pos: { x: 0, y: 0, z: 0 }, temperament: 'SKITTISH', speciesTag: 'mossling', noticeRadius: 7,
    roamRadius: 2.6, leashRadius: 4.2, fleeLeashRadius: 3.5,
  }] });
  system.setPlayerPos({ x: 0, y: .5, z: -1 }); system.setPlayerState({ mode: 'RUN', speed: 3 });
  for (let frame = 0; frame < 100; frame += 1) system.update(.1);
  const state = system._creatures[0].state;
  assert.ok(Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z) <= 3.9, 'one movement step may cross the 3.5 local boundary before RETURN takes over');
  assert.equal(state.aiState, 'RETURN');
  system.dispose();
});

test('Skybreak crown has one stable ordinary-expression Mossling with a supported home', () => {
  const [mossling] = sampleFrontierWildlifeChunk(0, -5);
  assert.deepEqual({
    id: mossling.originId,
    species: mossling.speciesTag,
    asset: mossling.visualAssetId,
    priority: mossling.residentPriority,
    x: mossling.homePos.x,
    z: mossling.homePos.z,
  }, {
    id: 'f1:w:0:-5:100',
    species: 'mossling',
    asset: 'asset_wildkin_mossling',
    priority: 4,
    x: 9.5,
    z: -231.5,
  });
  assert.deepEqual({ roam: mossling.roamRadius, leash: mossling.leashRadius, fleeLeash: mossling.fleeLeashRadius },
    { roam: 2.4, leash: 2.8, fleeLeash: 2.2 });
  const [ordinary] = sampleFrontierWildlifeChunk(1, -1);
  assert.deepEqual({ roam: ordinary.roamRadius, leash: ordinary.leashRadius, fleeLeash: ordinary.fleeLeashRadius },
    { roam: 4.4, leash: 8.5, fleeLeash: null }, 'ordinary generated Mosslings retain their established ranges');
  assert.deepEqual(mossling.genome, createWildkinGenome(mossling.originId, 'grove'), 'cap placement uses the current normal genome expression path');
  assert.equal(sampleFrontier(9.5, -231.5).surfaceKind, 'skybreak-cap');
  assert.equal(hasFootprintSupport(9.5, -231.5, {
    getHeight: (x, z) => sampleFrontier(x, z).height,
    radius: 3.1,
    maxSlope: .32,
  }), true);
  let steepestStep = 0;
  for (let dx = -3; dx <= 3; dx += .5) for (let dz = -3; dz <= 3; dz += .5) {
    if (dx * dx + dz * dz > 3.1 ** 2) continue;
    const x = mossling.homePos.x + dx, z = mossling.homePos.z + dz;
    const center = sampleFrontier(x, z);
    assert.equal(center.surfaceKind, 'skybreak-cap', `movement disk remains on the cap at ${x},${z}`);
    for (const [ox, oz] of [[.5, 0], [0, .5]]) {
      steepestStep = Math.max(steepestStep, Math.abs(sampleFrontier(x + ox, z + oz).height - center.height) / .5);
    }
  }
  assert.ok(steepestStep <= .32, `every half-metre controller step stays walkable (${steepestStep.toFixed(3)})`);
  assert.deepEqual(sampleFrontierWildlifeChunk(0, -5, {
    getTerrainSample: (x, z) => ({
      height: Math.abs(x - 10.5) < .01 && Math.abs(z + 231.5) < .01 ? 2 : 0,
      habitatBlend: { wetland: 0, fernUpland: 1 },
      surfaceKind: 'skybreak-cap',
    }),
  }), [], 'an unsafe interior step rejects the cap home even when its center and outer ring are level');
  assert.deepEqual(sampleFrontierWildlifeChunk(0, -5, {
    getTerrainSample: () => ({ height: 10, habitatBlend: { wetland: 0, fernUpland: 1 }, surfaceKind: 'skybreak-lowland' }),
  }), [], 'the staged source cannot drift onto a non-cap surface');
});

test('Skybreak crown Mossling flees toward the cliff only to its supported return boundary', () => {
  const source = sampleFrontierWildlifeChunk(0, -5)[0];
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [source] });
  const state = system._creatures[0].state;
  state.aiState = 'FLEE';
  state.fleeTime = 3.5;
  state.fleeThreatPos = { x: 11.8, y: sampleFrontier(11.8, -230).height + .52, z: -230 };
  system.setPlayerPos({ x: 80, y: state.pos.y, z: -230 });
  system.setPlayerState({ mode: 'IDLE', speed: 0 });
  let farthest = 0;
  let returned = false;
  for (let frame = 0; frame < 120; frame += 1) {
    system.update(.1);
    farthest = Math.max(farthest, Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z));
    if (state.aiState === 'RETURN') returned = true;
    if (returned && state.aiState === 'ROAM' && Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z) < 1.2) break;
  }
  assert.ok(farthest < 2.7, `flee stayed within the continuously supported cap interior (${farthest.toFixed(3)}m)`);
  assert.equal(returned, true, 'crossing the cap flee boundary enters the existing return behavior');
  assert.ok(Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z) < 1.2, 'return reaches the supported home interior');
  assert.equal(state.aiState, 'ROAM', 'the cap resident completes return instead of remaining permanently stuck');
  system.dispose();
});

test('Skybreak crown source participates in bounded neighbor selection and stays absent after capture', () => {
  const creatures = owner();
  const captured = new Set();
  const runtime = createFrontierWildlifeRuntime({
    terrainRuntime: { getResidency: () => residency(0, -5) },
    creatureSystem: creatures,
    isSourceCaptured: id => captured.has(id),
  });
  runtime.update();
  assert.ok(creatures.actors.length <= 4);
  assert.ok(creatures.actors.some(actor => actor.state.originId === 'f1:w:0:-5:100'), 'the cap source wins a bounded resident slot');
  captured.add('f1:w:0:-5:100');
  runtime.update();
  assert.equal(creatures.actors.some(actor => actor.state.originId === 'f1:w:0:-5:100'), false);
  runtime.dispose();
});
