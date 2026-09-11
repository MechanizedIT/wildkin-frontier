// Quick slots refer to existing ownership; they never hold duplicate stacks.
export const QUICK_SLOT_COUNT = 5;
export const EQUIPMENT_CATALOG = Object.freeze([
  { id:'omni_tool', name:'Omni-tool', icon:'axe', kind:'tool', actionLabel:'Attack', description:'Harvest resources and defend yourself.' },
  { id:'medkit', name:'Field medkit', icon:'medkit', kind:'consumable', actionLabel:'Heal', description:'Restore health. Selecting does not consume it.' },
  { id:'berry_lure', name:'Berry lure', icon:'berries', kind:'taming', species:'mossling', actionLabel:'Place lure', description:'Approach a Mossling and leave it space to feed.' },
  { id:'woven_snare', name:'Woven snare', icon:'fiber', kind:'taming', species:'tidefin', actionLabel:'Lay snare', description:'Bait a dry bank near a Tidefin.' },
  { id:'calming_chime', name:'Calming chime', icon:'crystal_shard', kind:'taming', species:'skydancer', actionLabel:'Call', description:'Invite a Skydancer to a quiet perch.' },
  { id:'reinforced_tether', name:'Reinforced tether', icon:'iron_ore', kind:'taming', species:'emberhorn', actionLabel:'Tame', description:'Prepare to dodge an Emberhorn charge.' },
  { id:'build_tool', name:'Construction tool', icon:'camp', kind:'building', actionLabel:'Build', description:'Place structures in your Camp clearing.' },
]);
export const EQUIPMENT_BY_ID = Object.freeze(Object.fromEntries(EQUIPMENT_CATALOG.map(item=>[item.id,item])));
const DEFAULT_SLOTS = Object.freeze(['omni_tool','medkit','berry_lure','woven_snare','build_tool']);

export function normalizeLoadout(raw) {
  const source=Array.isArray(raw?.slots)?raw.slots:DEFAULT_SLOTS, seen=new Set();
  const slots=Array.from({length:QUICK_SLOT_COUNT},(_,i)=>{
    const id=source[i]; if(!EQUIPMENT_BY_ID[id]||seen.has(id))return null;
    seen.add(id);return id;
  });
  const selected=Number.isInteger(raw?.selected)&&raw.selected>=0&&raw.selected<QUICK_SLOT_COUNT?raw.selected:0;
  return {slots,selected};
}
export function cloneLoadout(value) { return { slots:[...value.slots], selected:value.selected }; }
export function getEquipmentCount(id, state) {
  const item=EQUIPMENT_BY_ID[id];
  if(!item)return 0;
  if(item.kind==='tool'||item.kind==='building')return 1;
  return item.kind==='consumable'?(state.craftedConsumables?.[id]??0):(state.fieldSupplies?.[id]??0);
}
