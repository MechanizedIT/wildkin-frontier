import { EQUIPMENT_CATALOG, EQUIPMENT_BY_ID, getEquipmentCount } from './equipmentCatalog.js';
import { iconMarkup } from '../ui/itemIcons.js';

export function equipmentIcon(id, size = 36) {
  const item = EQUIPMENT_BY_ID[id];
  if (!item) return '<span class="equipment-empty-mark" aria-hidden="true">+</span>';
  if (id === 'build_tool') return `<svg class="item-icon" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 5h20v23H5z" fill="#438e9c" stroke="#d5f3e8" stroke-width="2"/><path d="M9 10h12v12H9zM9 16h12M15 10v12" stroke="#eaffee" fill="none"/><path d="m22 3 6 3-9 20-5-1z" fill="#ffcb65" stroke="#734629"/></svg>`;
  if (id === 'woven_snare' || id === 'reinforced_tether') return `<svg class="item-icon" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="15" cy="15" rx="10" ry="8" fill="none" stroke="${id === 'woven_snare' ? '#e2a44f' : '#8ac9d0'}" stroke-width="5"/><ellipse cx="15" cy="15" rx="5" ry="4" fill="none" stroke="#714d2d" stroke-width="2"/><path d="M24 16c-1 10 5 4 4 12" fill="none" stroke="#e7c383" stroke-width="4"/>${id === 'reinforced_tether' ? '<path d="m3 9 7-5 4 5-7 5z" fill="#cadfe4"/>' : ''}</svg>`;
  if (id === 'calming_chime') return `<svg class="item-icon" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 8h20M16 3v5M10 9v16M16 9v19M22 9v13" stroke="#b9edf0" stroke-width="3"/><path d="m16 13 4 6-4 6-4-6z" fill="#ab8ef0"/></svg>`;
  return iconMarkup(item.icon, { size, label: item.name });
}

export function quickSlotsMarkup(state, { assigning = false, selectedId = null } = {}) {
  const loadout = state.loadout;
  if (!loadout) return '';
  return loadout.slots.map((id, slot) => {
    const item = EQUIPMENT_BY_ID[id], count = getEquipmentCount(id, state);
    return `<button type="button" class="equipment-slot ${!assigning && slot === loadout.selected ? 'is-selected' : ''} ${item && !count ? 'is-empty' : ''}" ${assigning ? `data-assign-slot="${slot}" ${selectedId ? '' : 'disabled'}` : `data-action="selectQuickSlot" data-id="${slot}"`} aria-label="${assigning ? 'Assign to' : 'Select'} slot ${slot + 1}: ${item?.name ?? 'Empty'}${item && !['tool','building'].includes(item.kind) ? `, ${count} available` : ''}" aria-pressed="${slot === loadout.selected}"><kbd>${slot + 1}</kbd>${equipmentIcon(id)}${item && !['tool','building'].includes(item.kind) ? `<b class="equipment-count">${count}</b>` : ''}</button>`;
  }).join('');
}

export function equipmentInventoryMarkup(state, selectedId = null) {
  const selected = EQUIPMENT_BY_ID[selectedId];
  return `<section class="equipment-inventory"><div class="equipment-inventory-items" aria-label="Owned tools and field supplies">${EQUIPMENT_CATALOG.map(item => {
    const count = getEquipmentCount(item.id, state);
    return `<button type="button" data-equipment-id="${item.id}" class="equipment-item ${item.id === selectedId ? 'is-selected' : ''}" aria-pressed="${item.id === selectedId}">${equipmentIcon(item.id, 36)}<span><strong>${item.name}</strong><small>${item.kind === 'tool' || item.kind === 'building' ? 'OWNED' : count ? `${count} packed` : '0 · Craft at Camp'}</small></span></button>`;
  }).join('')}</div><div class="equipment-assignment"><strong>${selected ? `${selected.name} → choose a slot` : 'Tap an item, then choose its quick slot'}</strong><div class="equipment-assignment-slots">${quickSlotsMarkup(state, { assigning: true, selectedId })}</div><p>${selected?.description ?? 'Selection never uses or spends an item.'}</p></div></section>`;
}
