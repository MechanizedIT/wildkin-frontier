// Provisional casual Camp economy. Persistent transactions use this same catalog.
export const BASE_CONFIG = Object.freeze({ center: { x: 0, z: 18 }, halfSizes: [6, 9, 12], maxStructures: 64, maxSupply: 99, maxSlope: .3, foundationHeight: .24 });
export const BASE_EXPANSIONS = Object.freeze([{ wood: 12, stone: 8 }, { wood: 24, stone: 16, fiber: 8 }]);
export const BASE_PIECES = Object.freeze([
  { id: 'foundation', name: 'Foundation', icon: '▱', assetId: 'asset_wood_floor', size: [2.6,.24,2.6], cost: { wood: 4, stone: 2 }, description: 'A raised floor. Build walls and furniture on top.' },
  { id: 'wall', name: 'Wall', icon: '▥', assetId: 'asset_wood_wall', size: [2.6,2.25,.3], cost: { wood: 4, fiber: 1 }, description: 'Timber shelter with a solid back.' },
  { id: 'doorway', name: 'Doorway', icon: 'Π', assetId: 'asset_wood_doorway', size: [2.6,2.25,.3], cost: { wood: 4, stone: 1 }, description: 'An open entrance you can walk through.' },
  { id: 'fence', name: 'Low fence', icon: '╫', size: [2.6,.85,.24], cost: { wood: 2, fiber: 1 }, description: 'Arrange a boundary around your clearing.' },
  { id: 'lantern', name: 'Lantern', icon: '✧', assetId: 'asset_path_lantern', size: [.55,1.3,.55], cost: { wood: 1, stone: 2 }, description: 'A warm marker for your home.' },
  { id: 'workbench', name: 'Salvage bench', icon: '⚒', assetId: 'asset_salvage_bench', size: [1.97,1.277,.9965], cost: { wood: 6, stone: 3, fiber: 2 }, description: 'Assemble lures, simple snares and trail food.' },
  { id: 'fabricator', name: 'Matter fabricator', icon: '⚙', assetId: 'asset_matter_fabricator', size: [2.48,1.828,1.086], cost: { wood: 6, iron_ore: 6, crystal_shard: 2 }, description: 'Assembles medicine and reinforced field equipment.' },
  { id: 'resonance', name: 'Resonance bench', icon: '✧', assetId: 'asset_resonance_bench', size: [1.401,1.3,1.485], cost: { stone: 6, iron_ore: 3, crystal_shard: 4 }, description: 'Tunes calming equipment for sensitive Wildkin.' },
  { id: 'bed', name: 'Wildkin bed', icon: '◒', assetId: 'asset_bench', size: [1.9,.55,1.25], cost: { wood: 3, fiber: 5 }, description: 'A soft resting place for a companion.' },
]);
export const BASE_PIECE_BY_ID = Object.freeze(Object.fromEntries(BASE_PIECES.map(p => [p.id,p])));
export const FIELD_RECIPES = Object.freeze([
  { id:'berry_lure', name:'Berry lure', icon:'●', cost:{berries:2,fiber:1}, workbench:false, description:'Mossling: leave a lure, step back and let it eat.' },
  { id:'trail_ration', name:'Trail ration', icon:'berries', cost:{berries:2,fiber:1}, station:'workbench', heal:1, description:'Eat during an expedition to restore 1 health. Kept if health is full.' },
  { id:'woven_snare', name:'Woven snare', icon:'⌗', cost:{fiber:4,wood:1,berries:1}, workbench:false, description:'Tidefin: lay a baited snare along its path.' },
  { id:'calming_chime', name:'Calming chime', icon:'♫', cost:{wood:2,crystal_shard:1,fiber:2}, station:'resonance', workbench:true, description:'Skydancer: call from a quiet distance.' },
  { id:'reinforced_tether', name:'Reinforced tether', icon:'∞', cost:{fiber:4,iron_ore:2}, station:'fabricator', workbench:true, description:'Emberhorn: dodge its charge, tether during recovery.' },
]);
export const FIELD_RECIPE_BY_ID = Object.freeze(Object.fromEntries(FIELD_RECIPES.map(r=>[r.id,r])));
export function getFieldCraftLocation(id) {
  const station = BASE_PIECE_BY_ID[FIELD_RECIPE_BY_ID[id]?.station];
  return station ? `Camp → ${station.name}` : 'Camp → Work → Craft';
}
export function canAfford(resources,cost) { return Object.entries(cost).every(([id,n])=>(resources[id]??0)>=n); }
export function formatCost(cost) { return Object.entries(cost).map(([id,n])=>`${n} ${id.replaceAll('_',' ')}`).join(' · '); }
