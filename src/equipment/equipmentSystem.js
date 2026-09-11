import { EQUIPMENT_BY_ID, getEquipmentCount } from './equipmentCatalog.js';

// Slots only reference the save owner's items. This module owns input routing,
// not stacks, healing, taming or building rules.
export function createEquipmentSystem({ progress, cancelTool = () => {}, setToolEquipped = () => {}, heal, beginTaming, openBuild, isCamp = () => false, canUse = () => true, notify = () => {} }) {
  let waitForRelease = false, usedUntilRelease = false, lastId;
  const selectedItem = () => EQUIPMENT_BY_ID[progress.getLoadout().slots[progress.getLoadout().selected]] ?? null;
  function sync() {
    const id = selectedItem()?.id ?? null;
    if (id === lastId) return;
    if (lastId !== undefined) cancelTool();
    lastId = id; setToolEquipped(id === 'omni_tool');
  }
  function cancel() { cancelTool(); waitForRelease = true; }
  function select(slot) {
    const result = progress.selectQuickSlot(Number(slot));
    if (result.ok) { cancel(); sync(); }
    return { ok: !!result.ok, message: result.reason === 'storage-write-failed' ? 'Could not save your selection.' : undefined };
  }
  function assign(slot, id) {
    const result = progress.assignQuickSlot(Number(slot), id);
    if (result.ok) { cancel(); sync(); }
    return { ok: !!result.ok, message: result.ok ? 'Quick slot updated.' : result.reason === 'item-unavailable' ? 'Craft this item at Camp before assigning it.' : 'Could not save that slot.' };
  }
  function use() {
    if (!canUse()) return { ok: false };
    const item = selectedItem();
    if (!item) return { ok: false, message: 'This slot is empty. Open Pack → Equipment to assign an item.' };
    if (item.kind === 'tool') return { ok: true, tool: true };
    if (item.kind === 'building') return isCamp() ? openBuild() : { ok: false, message: 'Return to Camp to build in your clearing.' };
    if (item.kind === 'taming') return beginTaming(item);
    if (!getEquipmentCount(item.id, progress.getState())) return { ok: false, message: 'No medkits. Craft one at Camp with 3 Fiber and 2 Berries.' };
    return heal();
  }
  function routeInput({ requested = false, held = false, down = held, blocked = false } = {}) {
    sync();
    if (blocked) { cancel(); return { handled: requested, toolAllowed: false }; }
    if (!down) { waitForRelease = false; usedUntilRelease = false; }
    if (waitForRelease) return { handled: requested, toolAllowed: false };
    if (selectedItem()?.kind === 'tool') return { handled: false, toolAllowed: true };
    if (requested && !usedUntilRelease) { usedUntilRelease = down; const result = use(); if (result?.message) notify(result.message, result.ok); }
    return { handled: requested, toolAllowed: false };
  }
  sync();
  return { select, assign, selectedItem, sync, cancel, use, routeInput, isToolEquipped: () => selectedItem()?.kind === 'tool' };
}
