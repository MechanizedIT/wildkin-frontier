import { FIELD_RECIPE_BY_ID } from '../base/baseCatalog.js';

// Health stays in combat; persistent stacks stay in progress. Commit the stack
// before applying transient recovery, so failed storage never grants free food.
export function createFieldFoodUse({progress,playerCombat,isActive,onConsumed=()=>{}}){
  return function eat(item){
    const recipe=FIELD_RECIPE_BY_ID[item?.id];
    if(!recipe?.heal)return {ok:false,message:'This item is not field food.'};
    if(!isActive())return {ok:false,message:'Save your Trail ration for an expedition.'};
    const health=playerCombat.getHealth(),max=playerCombat.getMaxHealth();
    if(health<=0)return {ok:false,message:'Recover at Camp before using field food.'};
    if(health>=max)return {ok:false,message:'Health is full. Your Trail ration is kept.'};
    const restored=Math.min(recipe.heal,max-health);
    const result=progress.consumeFieldSupply(item.id,{health:health+restored});
    if(!result.consumed)return {ok:false,message:result.reason==='storage-write-failed'?'Could not save. Your Trail ration was kept.':'No Trail rations. Craft at your Salvage bench: 2 Berries + 1 Fiber.'};
    playerCombat.heal(restored);onConsumed(restored);
    return {ok:true,message:`Trail ration eaten · +${restored} health.`};
  };
}
