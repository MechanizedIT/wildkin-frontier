// Permanent, banked-level progression. Material Workshop upgrades are separate.
const node=(id,name,branch,icon,description,prerequisite,minLevel,row,column,effects)=>Object.freeze({id,name,branch,icon,description,prerequisite,minLevel,cost:1,row,column,effects:Object.freeze(effects)});
export const SKILL_CATALOG=Object.freeze([
  node('forager','Green fingers','Forager','fiber','Gather 15% more.',null,1,0,0,{harvestYieldBonus:.15}),
  node('gathering_reach','Long reach','Forager','backpack','Gather drops from farther away.','forager',2,1,0,{magnetRadiusBonus:1}),
  node('careful_cuts','Clean cuts','Forager','axe','Tool damage +15%.','forager',2,2,0,{toolDamageBonus:.15}),
  node('abundance','Abundance','Forager','wildflower','Gather 25% more.','careful_cuts',4,3,0,{harvestYieldBonus:.25}),
  node('warden','Stout heart','Warden','shield','Maximum health +1.',null,1,0,1,{maxHealthBonus:1}),
  node('field_remedy','Field remedy','Warden','medkit','Medkits restore +1 health.','warden',2,1,1,{medkitHealBonus:1}),
  node('wild_strength','Wild strength','Warden','axe','Tool damage +20%.','warden',2,2,1,{toolDamageBonus:.2}),
  node('ironheart','Ironheart','Warden','shield','Maximum health +2.','wild_strength',4,3,1,{maxHealthBonus:2}),
  node('wayfinder','Light feet','Wayfinder','boot','Movement speed +8%.',null,1,0,2,{moveSpeedBonus:.08}),
  node('kindred','Kindred','Wayfinder','paw','Carry one more new Wildkin bond.','wayfinder',2,1,2,{captureCapacityBonus:1}),
  node('quick_bond','Resonance','Wayfinder','skills','Companion cooldowns 15% shorter.','wayfinder',2,2,2,{abilityCooldownReduction:.15}),
  node('wild_harmony','Wild harmony','Wayfinder','crystal_shard','Companion cooldowns 20% shorter.','quick_bond',4,3,2,{abilityCooldownReduction:.2}),
]);
export const SKILL_BY_ID=Object.freeze(Object.fromEntries(SKILL_CATALOG.map(s=>[s.id,s])));
export const getEarnedSkillPoints=level=>Math.min(SKILL_CATALOG.length,1+2*Math.max(0,Math.floor(Number(level)||1)-1));
export function getAvailableSkillPoints(unlocks=[],level=1){return Math.max(0,getEarnedSkillPoints(level)-unlocks.length);}
export function getSkillPurchaseReason(id,unlocks=[],level=1){
  const n=SKILL_BY_ID[id];if(!n)return 'unknown-skill';
  if(unlocks.includes(id))return 'owned';
  if(level<n.minLevel)return 'level-locked';
  if(n.prerequisite&&!unlocks.includes(n.prerequisite))return 'prerequisite';
  if(getAvailableSkillPoints(unlocks,level)<n.cost)return 'no-points';
  return null;
}
export function normalizeSkillUnlocks(raw,level=1){
  const requested=new Set(Array.isArray(raw)?raw:[]),out=[];
  // Canonical topological order means malformed backups cannot grant free capstones.
  for(const n of SKILL_CATALOG)if(requested.has(n.id)&&!getSkillPurchaseReason(n.id,out,level))out.push(n.id);
  return out;
}
export function mergeSkillModifiers(base,unlocks=[]){
  const sum={};for(const id of unlocks)for(const [key,value]of Object.entries(SKILL_BY_ID[id]?.effects??{}))sum[key]=(sum[key]??0)+value;
  return {...base,
    maxHealthBonus:base.maxHealthBonus+(sum.maxHealthBonus??0),
    fieldToolDamageMultiplier:base.fieldToolDamageMultiplier+(sum.toolDamageBonus??0),
    harvestYieldMultiplier:base.harvestYieldMultiplier+(sum.harvestYieldBonus??0),
    pickupMagnetRadius:sum.magnetRadiusBonus?Math.max(base.pickupMagnetRadius,2.9)+sum.magnetRadiusBonus:base.pickupMagnetRadius,
    pickupMagnetSpeed:sum.magnetRadiusBonus?Math.max(base.pickupMagnetSpeed,7):base.pickupMagnetSpeed,
    medkitHeal:base.medkitHeal+(sum.medkitHealBonus??0),
    captureCapacity:Math.min(4,base.captureCapacity+(sum.captureCapacityBonus??0)),
    moveSpeedMultiplier:1+(sum.moveSpeedBonus??0),
    abilityCooldownMultiplier:1-(sum.abilityCooldownReduction??0)
  };
}
