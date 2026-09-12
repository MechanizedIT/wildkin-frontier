import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreatureObservation } from '../src/companions/creatureObservation.js';
import { OBSERVATION_CATALOG, getObservationJournal } from '../src/companions/observationCatalog.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';

function fixture() {
  let value = null, fail = false, writes = 0;
  globalThis.localStorage = { getItem: () => value, setItem: (_key, next) => { writes++; if (fail) throw Error('quota'); value = next; } };
  const progress = createFrontierProgress(); progress.load();
  const player = { pos: { x: 0, y: .5, z: -4 }, mode: 'SNEAK', speed: 1, grounded: true };
  const creature = (id, species='mossling', z=0) => ({ state: { id, visualAssetId: `asset_wildkin_${species}`, regionId: 'verge', pos: { x: 0, y: .5, z }, playerDetected: false } });
  const targets = [creature('moss')], seen = [], view = { visible: true, sight: true };
  const observation = createCreatureObservation({ getPlayer: () => player, getCreatures: () => targets, getProgress: progress.getState,
    discoverSpecies: progress.discoverSpecies, earnClue: progress.earnObservationClue,
    isVisible: () => view.visible, hasSight: () => view.sight, onClue: (s, stage) => seen.push([s.id, stage]) });
  const tick = (seconds, options={}) => { for (let i=0; i<Math.round(seconds*60); i++) observation.update(1/60, { sectionId: 'verge', runId: 'run1', ...options }); };
  return { progress, observation, player, targets, creature, view, seen, tick, fail: v => { fail=v; }, writes: () => writes, saved: () => value };
}

test('two earned notes persist through reload and transfer, without consuming supplies or changing inventory', () => {
  const f=fixture(), before=f.progress.getInventoryState(); f.tick(3);
  assert.deepEqual(f.progress.getState().observationClues,{mossling:1});
  assert.equal(f.observation.getModel().stage,2); f.tick(7);
  assert.equal(f.observation.getModel().complete,true); assert.equal(f.seen.length,2);
  const writes=f.writes(); f.tick(20); assert.equal(f.writes(),writes,'no recurring completed-stage writes');
  assert.deepEqual(f.progress.getInventoryState(),before);
  f.progress.load(); assert.equal(f.progress.getState().observationClues.mossling,2);
  const backup=f.progress.exportSave().payload; f.progress.clear();
  assert.equal(f.progress.importSave(backup).ok,true); assert.equal(getObservationJournal('mossling',f.progress.getState()).length,2);
});

test('all species use their explicit two-stage durations', () => {
  for (const [species, definition] of Object.entries(OBSERVATION_CATALOG)) {
    const f=fixture(); f.targets[0]=f.creature(species,species);
    f.tick(definition.seconds[0]-.1); assert.deepEqual(f.progress.getState().observationClues,{});
    f.tick(.1); assert.equal(f.progress.getState().observationClues[species],1);
    f.tick(definition.seconds[1]); assert.equal(f.progress.getState().observationClues[species],2);
  }
});

test('blocked vision, outside camera, wrong section, height and dead or captured creatures earn no encounters', () => {
  for (const mutate of [f=>f.view.sight=false, f=>f.view.visible=false, f=>f.targets[0].state.regionId='other', f=>f.targets[0].state.pos.y=8, f=>f.targets[0].state.isDead=true, f=>f.targets[0].state.bondCaptured=true, f=>f.targets[0].state.aiState='RESPAWNING', f=>f.targets[0].state.pos.z=30]) {
    const f=fixture(); mutate(f); f.tick(15); assert.equal(f.observation.getModel(),null); assert.deepEqual(f.progress.getState().discoveredSpecies,[]);
  }
});

test('authoritative detection, rushing and airborne footing pause knowledge but permit a visible encounter', () => {
  for (const mutate of [f=>f.targets[0].state.playerDetected=true, f=>f.targets[0].state.playerDetected=undefined, f=>f.player.mode='RUN', f=>f.player.grounded=false, f=>{f.player.mode='IDLE';f.player.speed=1;}]) {
    const f=fixture(); mutate(f); f.tick(15); assert.equal(f.observation.getModel().progress,0);
    assert.deepEqual(f.progress.getState().discoveredSpecies,['mossling']); assert.deepEqual(f.progress.getState().observationClues,{});
  }
});

test('pause and taming freeze timing and cannot acquire new targets or encounter records', () => {
  const f=fixture(); f.tick(10,{paused:true}); assert.equal(f.observation.getModel(),null);
  f.tick(1); const initial=f.observation.getModel().progress;
  f.tick(20,{paused:true}); f.tick(20,{taming:true}); assert.equal(f.observation.getModel().progress,initial);
  f.tick(2); assert.equal(f.progress.getState().observationClues.mossling,1);
});

test('sticky creature retains brief view loss, then discards unfinished timing on target or species change', () => {
  const f=fixture(); f.tick(1); f.targets.push(f.creature('closer','tidefin',-2)); f.tick(.5);
  assert.equal(f.observation.getModel().id,'moss'); const partial=f.observation.getModel().progress;
  f.view.sight=false; f.tick(1); assert.equal(f.observation.getModel().progress,partial);
  f.view.sight=true; f.tick(.5); assert.ok(f.observation.getModel().progress>partial);
  f.targets.shift(); f.tick(2.1); assert.equal(f.observation.getModel().speciesId,'tidefin'); assert.ok(f.observation.getModel().progress<.1);
  f.targets[0]=f.creature('closer','emberhorn',-2); f.tick(2.1); assert.equal(f.observation.getModel().speciesId,'emberhorn'); assert.ok(f.observation.getModel().progress<.1);
});

test('section, run, Author and expedition loss reset unfinished observation, preserving earned notes', () => {
  for (const options of [{sectionId:'other'},{runId:'run2'},{hidden:true},{active:false}]) {
    const f=fixture(); f.tick(4); assert.equal(f.progress.getState().observationClues.mossling,1);
    f.tick(.1,options); f.tick(.1); assert.ok(f.observation.getModel().progress<.04);
    assert.equal(f.progress.getState().observationClues.mossling,1);
  }
});

test('failed clue writes roll back and retry at bounded intervals with no false completion', () => {
  const f=fixture(); f.tick(1); f.fail(true); const inventory=f.progress.getInventoryState(); f.tick(2);
  assert.deepEqual(f.progress.getState().observationClues,{}); assert.equal(f.seen.length,0);
  const writes=f.writes(); f.tick(1); assert.equal(f.writes(),writes);
  f.fail(false); f.tick(1.1); assert.equal(f.progress.getState().observationClues.mossling,1);
  assert.deepEqual(f.progress.getInventoryState(),inventory); assert.equal(f.seen.length,1);
});

test('earned clue and discovery are one rollback-safe, idempotent transaction', () => {
  const f=fixture(); f.fail(true);
  assert.equal(f.progress.discoverSpecies('mossling'),false); assert.deepEqual(f.progress.getState().discoveredSpecies,[]);
  assert.equal(f.progress.earnObservationClue('mossling',1).ok,false); assert.deepEqual(f.progress.getState().observationClues,{});
  f.fail(false); assert.equal(f.progress.earnObservationClue('mossling',2).ok,false);
  assert.equal(f.progress.earnObservationClue('mossling',1).ok,true); assert.deepEqual(f.progress.getState().discoveredSpecies,['mossling']);
  const writes=f.writes(); assert.equal(f.progress.earnObservationClue('mossling',1).added,false); assert.equal(f.writes(),writes);
});

test('optional old-save schema, secured guides and strict bounded observation import preserve ownership', () => {
  const f=fixture(), backup=f.progress.exportSave().payload;
  delete backup.progress.observationClues; assert.equal(f.progress.importSave(backup).ok,true);
  for (const bad of [null,[],{mossling:3},{mossling:1.2},{mossling:-1},{unknown:1},{mossling:'2'}]) {
    const payload=structuredClone(backup); payload.progress.observationClues=bad;
    const before=f.saved(); assert.equal(f.progress.importSave(payload).ok,false); assert.equal(f.saved(),before);
  }
  assert.equal(getObservationJournal('mossling',{securedCompanions:['mossling']}).length,0);
  assert.deepEqual(f.progress.getState().observationClues,{});
});

test('invalid persisted clue schema is preserved raw, and a failed backup write keeps old clues', () => {
  const f=fixture(); f.progress.earnObservationClue('mossling',1);
  const backup=f.progress.exportSave().payload; backup.progress.observationClues={tidefin:2};
  f.fail(true); assert.equal(f.progress.importSave(backup).ok,false);
  assert.deepEqual(f.progress.getState().observationClues,{mossling:1});
  f.fail(false);
  const raw=structuredClone(backup.progress); raw.observationClues={mossling:400};
  let stored=JSON.stringify(raw);
  globalThis.localStorage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
  const p=createFrontierProgress();p.load();assert.equal(p.getStorageStatus().saved,false);
  assert.equal(stored,JSON.stringify(raw),'invalid save is not normalized over irreplaceable progress');
});

test('completed nearby species yields to unfinished acquisition and to a newly visible unfinished species', () => {
  const f=fixture();
  f.progress.earnObservationClue('mossling',1); f.progress.earnObservationClue('mossling',2);
  f.tick(.1); assert.equal(f.observation.getModel().speciesId,'mossling','completed subject remains available when alone');
  f.targets.push(f.creature('tide','tidefin',1));
  f.tick(.1); assert.equal(f.observation.getModel().speciesId,'tidefin','5m unfinished subject outranks 4m completed one');
  f.observation.reset(); f.tick(.1); assert.equal(f.observation.getModel().speciesId,'tidefin','initial acquisition also prefers unfinished species');
  f.tick(13); assert.equal(f.progress.getState().observationClues.tidefin,2);
});

test('newly completed study yields on its next step while unfinished timing stays sticky', () => {
  const f=fixture(); f.tick(1); f.targets.push(f.creature('tide','tidefin',-1));
  f.tick(8.9); assert.equal(f.observation.getModel().speciesId,'mossling','unfinished study is not stolen by a closer animal');
  f.tick(.1); assert.equal(f.observation.getModel().complete,true);
  f.tick(1/60); assert.equal(f.observation.getModel().speciesId,'tidefin');
  assert.ok(f.progress.getState().discoveredSpecies.includes('tidefin'));
});

test('owned Mosslings still need two earned field notes, while completed notes yield to unfinished wildlife', () => {
  const f=fixture(); f.progress.secureCompanions(['mossling']);
  f.tick(2.9); assert.equal(f.progress.getState().observationClues.mossling,undefined);
  f.tick(.1); assert.equal(f.progress.getState().observationClues.mossling,1);
  f.tick(7); assert.equal(f.progress.getState().observationClues.mossling,2);
  assert.equal(getObservationJournal('mossling',f.progress.getState()).length,2);
  for (const speciesId of Object.keys(OBSERVATION_CATALOG)) {
    assert.equal(getObservationJournal(speciesId,{securedCompanions:[speciesId]}).length,0, `${speciesId} ownership cannot fabricate research`);
  }
  f.observation.reset(); f.tick(.1); assert.equal(f.observation.getModel().speciesId,'mossling'); assert.equal(f.observation.getModel().complete,true);
  const tide=f.creature('tide','tidefin',1); tide.state.regionId='other'; f.targets.push(tide);
  f.tick(.1); assert.equal(f.observation.getModel().speciesId,'mossling','ineligible unfinished target cannot displace known subject');
  tide.state.regionId='verge'; f.tick(.1); assert.equal(f.observation.getModel().speciesId,'tidefin');
  assert.deepEqual(f.progress.getState().observationClues,{mossling:2},'ownership never invents sibling research stages');
});
