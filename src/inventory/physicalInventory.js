import { createInventoryPanel } from '../ui/inventoryPanel.js';
import { POD_LOCKER_ID } from './inventoryState.js';
import { LEGACY_SUPPLIES_ID } from './inventoryActions.js';

export const STORAGE_REACH = 3.2;

// Owns proximity, the chosen crafting source and UI selection. Saved quantities
// remain exclusively in frontier progress.
export function createPhysicalInventory({ app, progress, registry, getPlayerState, isCamp, canOpen, onBlockingChanged, onChanged = () => {}, onOpenJournal = null }) {
  const pod = registry.getSectionById('camp')?.props?.find(p => p.id === 'prop_camp_dropPod');
  let craftSourceId = null;
  const catalog = progress.getItemCatalog();
  function record(id) {
    if (id === POD_LOCKER_ID || id === LEGACY_SUPPLIES_ID) return pod;
    return progress.getBaseState().structures.find(piece => piece.id === id) ?? null;
  }
  function canAccess(id) {
    const object = record(id), pos = getPlayerState().pos;
    return Boolean(isCamp() && object && Math.hypot(pos.x-object.pos.x,pos.z-object.pos.z) <= STORAGE_REACH && Math.abs(pos.y-object.pos.y) <= 2.1);
  }
  const getCraftSourceId = () => craftSourceId && canAccess(craftSourceId) ? craftSourceId : null;
  progress.setInventoryAccess({ canAccessContainer: canAccess, getCraftStorageId: getCraftSourceId });
  function legacySlots() {
    return Object.entries(progress.getInventoryState().legacy).filter(([id,count]) => Object.hasOwn(catalog,id) && count > 0).sort(([a],[b])=>a.localeCompare(b)).map(([id,count]) => ({ id, count:Math.min(count,catalog[id].stackLimit),totalCount:count }));
  }
  function model(storageId) {
    const inventory = progress.getInventoryState();
    let storage = null, alternateStorage = null;
    if (storageId && canAccess(storageId)) {
      if (storageId === LEGACY_SUPPLIES_ID) {
        storage = { id:storageId,label:'Legacy supplies',slots:legacySlots(),withdrawOnly:true };
        alternateStorage = { id:POD_LOCKER_ID,label:'Pod locker' };
      } else {
        storage = inventory.containers.find(c=>c.id===storageId) ?? null;
        if (storageId === POD_LOCKER_ID && legacySlots().length) alternateStorage = { id:LEGACY_SUPPLIES_ID,label:'Legacy supplies' };
      }
    }
    return { pack:{id:'backpack',label:'Backpack',slots:inventory.pack},storage,catalog,alternateStorage };
  }
  function action(type,payload) {
    let result;
    if (type === 'sort') result = progress.inventory.sort(payload.id);
    else if (type === 'transfer' && payload.fromId === LEGACY_SUPPLIES_ID) {
      const stack=legacySlots()[payload.fromIndex];
      result=stack && stack.id===payload.itemId && payload.toId === 'backpack' ? progress.inventory.takeLegacy(stack.id,payload.count ?? stack.count) : {ok:false,reason:'empty-source'};
    } else if (type === 'transfer') result=progress.inventory.transfer(payload.fromId,payload.fromIndex,payload.toId,{toIndex:payload.toIndex,count:payload.count});
    else result={ok:false,reason:'invalid-action'};
    if (result.ok) onChanged();
    return result;
  }
  const panel = createInventoryPanel({app,getModel:model,onAction:action,onBlockingChanged,onOpenJournal});
  function open(id = null) {
    if (!canOpen() || (id && !canAccess(id))) return false;
    if (id && id !== LEGACY_SUPPLIES_ID) craftSourceId=id;
    panel.open(id);return true;
  }
  return {
    open, close:panel.close, isOpen:panel.isOpen, canAccess, getCraftSourceId,
    openObject(id) { return open(id === pod?.id ? POD_LOCKER_ID : id); },
    getNearbyInteraction(pos) {
      if (!isCamp()) return null;
      const candidates=progress.getInventoryState().containers.map(c=>({container:c,object:record(c.id)})).filter(({object})=>object);
      let best=null,distance=STORAGE_REACH;
      for(const {container,object} of candidates) {
        const d=Math.hypot(pos.x-object.pos.x,pos.z-object.pos.z);
        if(d<=distance && canAccess(container.id)){distance=d;best={type:'storage',id:object.id,label:container.label};}
      }
      return best;
    },
    update() { if(craftSourceId && !canAccess(craftSourceId))craftSourceId=null;panel.update(); },
    destroy:panel.destroy,
  };
}
