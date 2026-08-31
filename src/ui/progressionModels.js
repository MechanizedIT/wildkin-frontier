import { getPlayerLevelProgress } from "../progression/playerLevel.js";
import { getResourceDrops } from "../resources/resourceDropCatalog.js";

export function getCarriedXpViewModel(carriedXp) {
  const count = Math.max(0, Math.floor(Number(carriedXp) || 0));
  return { count, visible: count > 0 };
}

export function getMatterResonatorViewModel({ state = {}, resourceDrops = [] } = {}) {
  const drops = getResourceDrops(resourceDrops);
  const bank = state.bankedResources ?? {};
  return {
    storage: drops.map((drop) => ({
      id: drop.id,
      displayName: drop.displayName,
      count: Math.max(0, Math.floor(Number(bank[drop.id]) || 0)),
    })),
    progression: getPlayerLevelProgress(state.bankedXp ?? 0),
    matterAttractorI: !!state.matterAttractorI,
  };
}
