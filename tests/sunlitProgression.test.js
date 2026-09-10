import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrontierProgress} from '../src/save/frontierProgress.js';
import {getAvailableSkillPoints,normalizeSkillUnlocks,SKILL_CATALOG,mergeSkillModifiers} from '../src/progression/skillCatalog.js';
import {getUpgradeModifiers} from '../src/progression/upgradeCatalog.js';
const drops=['wood','stone','fiber','berries','iron_ore','crystal_shard','wildflower'].map(id=>({id}));
function stored(run){const old=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};try{run(values);}finally{globalThis.localStorage=old;}}
const create=()=>createFrontierProgress({resourceDrops:drops});
test('skills award choice from secured levels only and never overspend',()=>stored(()=>{
  const p=create();assert.equal(p.getState().skillPointsAvailable,1);
  assert.equal(p.purchaseSkill('abundance').purchased,false);
  assert.equal(p.purchaseSkill('forager').purchased,true);
  assert.equal(p.purchaseSkill('forager').reason,'owned');
  assert.equal(p.purchaseSkill('warden').reason,'no-points');
  p.bankRun({},50,'level-2');assert.equal(p.getState().skillPointsAvailable,2);
  assert.equal(p.purchaseSkill('gathering_reach').purchased,true);
  assert.equal(p.purchaseSkill('careful_cuts').purchased,true);
  assert.equal(p.getState().skillPointsAvailable,0);
  assert.ok(p.getModifiers().harvestYieldMultiplier>1);
}));
test('skill purchase failure rolls back point and unlock',()=>stored(()=>{
  const p=create(),before=p.getState();globalThis.localStorage.setItem=()=>{throw Error('full');};
  assert.equal(p.purchaseSkill('warden').reason,'storage-write-failed');assert.deepEqual(p.getState(),before);
}));
test('old saves receive unspent points; skills survive reload and backup',()=>stored(values=>{
  values.set('wildkin.frontierProgress',JSON.stringify({version:2,bankedXp:200,upgrades:{vitality:1}}));
  const p=create();p.load();assert.equal(p.getState().skillPointsAvailable,5);
  p.purchaseSkill('warden');p.purchaseSkill('field_remedy');
  const backup=p.exportSave().payload,q=create();q.load();assert.deepEqual(q.getState().skillUnlocks,['warden','field_remedy']);
  assert.equal(q.getModifiers().maxHealthBonus,2);assert.equal(q.getModifiers().medkitHeal,2);
  assert.equal(q.importSave(backup).ok,true);assert.equal(q.getState().skillPointsAvailable,3);
}));
test('import normalization cannot grant duplicate, overspent or orphan skills',()=>{
  assert.deepEqual(normalizeSkillUnlocks(['abundance','careful_cuts','invalid'],5),[]);
  assert.deepEqual(normalizeSkillUnlocks(['forager','forager','warden'],1),['forager']);
  assert.equal(getAvailableSkillPoints([],Infinity),12);
  const all=SKILL_CATALOG.map(n=>n.id),m=mergeSkillModifiers(getUpgradeModifiers({field_tool:3,vitality:3,capture_capacity:3,field_medicine:3,matter_attractor:3}),all);
  assert.equal(m.captureCapacity,4);assert.equal(m.maxHealthBonus,6);assert.equal(m.medkitHeal,5);
  assert.ok(m.fieldToolDamageMultiplier>1.8);assert.equal(m.moveSpeedMultiplier,1.08);assert.equal(m.abilityCooldownMultiplier,.65);
});
