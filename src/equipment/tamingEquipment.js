import { COMPANIONS, identifyCompanion } from '../companions/companionCatalog.js';
import { getFieldTamingRange } from '../companions/fieldTaming.js';
import { getFieldCraftLocation } from '../base/baseCatalog.js';

export function createTamingEquipmentUse({ companions, progress, creatures, getPlayerPosition }) {
  return item => {
    const active = companions.getFieldTamingState();
    if (active && active.speciesId !== item.species) return { ok: false, message: 'Finish or cancel your current Wildkin attempt first.' };
    if (!active && !(progress.getFieldSupplies()[item.id] > 0)) return { ok: false, message: `No ${item.name.toLowerCase()}. Craft at ${getFieldCraftLocation(item.id)}.` };
    const player = getPlayerPosition();
    const targets = creatures.getActiveAliveCreatures().filter(c => active ? c.state.id === active.id : identifyCompanion(c)?.id === item.species)
      .filter(c => Math.hypot(c.state.pos.x-player.x,c.state.pos.z-player.z) <= getFieldTamingRange(item.species) && Math.abs(c.state.pos.y-player.y) <= 2.2)
      .sort((a,b) => Math.hypot(a.state.pos.x-player.x,a.state.pos.z-player.z)-Math.hypot(b.state.pos.x-player.x,b.state.pos.z-player.z));
    if (!targets.length) return { ok: false, message: !active && item.species === 'mossling'
      ? 'Sneak closer from behind to place the berry lure.'
      : `Approach a ${COMPANIONS.find(c=>c.id===item.species)?.name ?? 'Wildkin'} to use ${item.name.toLowerCase()}.` };
    return { ok: !!companions.beginBond(targets[0].state.id) };
  };
}
