import { FIELD_RECIPE_BY_ID } from './baseCatalog.js';
import { CONSUMABLE_CATALOG } from '../progression/upgradeCatalog.js';
import { FIELD_PACK_FIT_COST } from './fieldPackConfig.js';

// Recipes share the authoritative costs and supply IDs used by saves/taming.
export const STATION_RECIPE_IDS = Object.freeze({
  workbench: ['berry_lure', 'woven_snare', 'trail_ration', 'fit_field_pack'],
  fabricator: ['medkit', 'reinforced_tether'],
  resonance: ['calming_chime'],
});
export function getStationRecipe(id) {
  if (id === 'fit_field_pack') return {id, name:'Field pack', cost:FIELD_PACK_FIT_COST, icon:'backpack', permanent:true, actionLabel:'Fit'};
  if (id === 'medkit') return {id, name:'Field medkit', cost:CONSUMABLE_CATALOG.medkit.cost, icon:id};
  const recipe = FIELD_RECIPE_BY_ID[id];
  return recipe ? {...recipe, icon:id} : null;
}
