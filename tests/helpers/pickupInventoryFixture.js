import { createItemCatalog } from '../../src/inventory/itemCatalog.js';
import { addStack, countItems, removeItems } from '../../src/inventory/slotOperations.js';

// Isolated test authority using the same finite-slot proposals as progress.
// No counter fallback is built into the runtime pickup system.
export function pickupInventoryFixture(resourceDrops, capacity=16) {
  const catalog=createItemCatalog(resourceDrops);
  let slots=Array(capacity).fill(null),fail=false,gathered=0,writes=0;
  const inventory={
    getResources:()=>countItems(slots),
    collect(resources,{gathered:wasGathered=false}={}) {
      let next=slots;const added={},remaining={};
      for(const [id,count] of Object.entries(resources)){const result=addStack(next,id,count,catalog);next=result.slots;if(result.added)added[id]=result.added;if(result.remaining)remaining[id]=result.remaining;}
      if(!Object.keys(added).length)return{ok:false,added:{},remaining:{...resources},reason:'full'};
      writes++;if(fail)return{ok:false,added:{},remaining:{...resources},reason:'storage-write-failed'};
      slots=next;if(wasGathered)gathered+=Object.values(added).reduce((a,b)=>a+b,0);
      return{ok:true,added,remaining,reason:Object.keys(remaining).length?'full':null};
    },
    spend(cost){const result=removeItems(slots,cost);if(!result.ok)return result;writes++;if(fail)return{ok:false,reason:'storage-write-failed'};slots=result.slots;return{ok:true};},
  };
  return{inventory,get slots(){return slots;},set slots(value){slots=value;},set fail(value){fail=value;},get gathered(){return gathered;},get writes(){return writes;}};
}
