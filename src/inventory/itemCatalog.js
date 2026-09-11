import { getResourceDrops } from '../resources/resourceDropCatalog.js';
import { EQUIPMENT_CATALOG } from '../equipment/equipmentCatalog.js';

export const INVENTORY_CONFIG = Object.freeze({ packSlots: [16, 20, 24], podSlots: 24, crateSlots: 24, lockerSlots: 36, resourceStack: 20, foodStack: 5, tamingStack: 3 });

// The caller supplies the world's resource definitions; Author resources remain
// first-class items. Permanent tool/build actions are not portable item stacks.
export function createItemCatalog(resourceDrops) {
  const entries = getResourceDrops(resourceDrops).map(item => ({ id: item.id, name: item.displayName ?? item.id, icon: item.id, kind: 'resource', stackLimit: INVENTORY_CONFIG.resourceStack }));
  for (const item of EQUIPMENT_CATALOG) {
    if (!['consumable', 'food', 'taming'].includes(item.kind)) continue;
    if (entries.some(entry => entry.id === item.id)) throw new Error(`Resource and equipment item ID conflict: ${item.id}`);
    entries.push({ id: item.id, name: item.name, icon: item.icon, kind: item.kind, stackLimit: item.kind === 'taming' ? INVENTORY_CONFIG.tamingStack : INVENTORY_CONFIG.foodStack });
  }
  return Object.freeze(Object.fromEntries(entries.map(item => [item.id, Object.freeze(item)])));
}
