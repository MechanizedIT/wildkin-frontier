import { BASE_PIECES, FIELD_RECIPES, formatCost } from '../base/baseCatalog.js';
import { CAMP_CROP_GROWTH_SECONDS } from '../base/campGardenState.js';
import { CAMP_BREEDING_GROWTH_SECONDS } from '../companions/campBreedingState.js';

const piece = id => BASE_PIECES.find(candidate => candidate.id === id);
const lure = FIELD_RECIPES.find(candidate => candidate.id === 'berry_lure');

function count(values, id) {
  const value = Number(values?.[id]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function missingCost(cargo, cost) {
  return Object.fromEntries(Object.entries(cost).flatMap(([id, needed]) => {
    const missing = needed - count(cargo, id);
    return missing > 0 ? [[id, missing]] : [];
  }));
}

function hasAny(cost) {
  return Object.keys(cost).length > 0;
}

function campAction(isCamp, { id, title, returnTitle = `Return for ${title}`, action }) {
  return isCamp
    ? { id, title, description: action }
    : { id: `return-${id}`, title: returnTitle, description: `Go to the Camp arch, tap RETURN TO CAMP, then confirm Return to Camp. ${action}` };
}

function buildPurpose(type, cargo, isCamp) {
  const definition = piece(type);
  const missing = missingCost(cargo, definition.cost);
  if (hasAny(missing)) return {
    id: `gather-${type}`,
    title: `Gather for ${definition.name}`,
    description: `Gather ${formatCost(missing)} outside Camp, then return through the arch.`,
  };
  return campAction(isCamp, {
    id: `build-${type}`,
    title: `Build ${definition.name}`,
    returnTitle: `Return to build`,
    action: type === 'berry_garden'
      ? 'Open Build and place a berry garden beside the occupied Wildkin bed, on clear, dry ground.'
      : `Open Build and place a ${definition.name.toLowerCase()} on clear, dry ground.`,
  });
}

/**
 * Derives one useful next action from existing authoritative state. It owns no
 * quest progress, reward, inventory, care, crop, or companion state.
 */
export function getFrontierPurpose({
  state = null, cargo = {}, spendableResources = cargo, isCamp = false, pendingCompanions = [],
  health = 0, maxHealth = 0, ability = null, activeSpeciesId = null, cropHarvest = null,
  habitatId = null, habitatFeatureKind = null,
} = {}) {
  if (Array.isArray(pendingCompanions) && pendingCompanions.length > 0) return {
    id: 'return-pending-bond',
    title: 'Bring your Wildkin home',
    description: 'Go to the Camp arch, tap RETURN TO CAMP, then confirm Return to Camp to secure the bond.',
  };

  const hurt = Number.isFinite(health) && Number.isFinite(maxHealth) && health < maxHealth;
  if (!isCamp && activeSpeciesId === 'mossling' && hurt && ability?.speciesId === 'mossling' && ability.ready) return {
    id: 'use-bloom',
    title: 'Let Mossling help',
    description: 'Tap Bloom while exploring to restore 2 health.',
    abilityHint: 'mossling',
  };
  if (!isCamp && Number.isFinite(health) && health <= 1 && maxHealth > 1) return {
    id: 'return-low-health',
    title: 'Return to Camp safely',
    description: 'Go to the Camp arch, tap RETURN TO CAMP, then confirm Return to Camp before exploring farther.',
  };

  if (!isCamp && habitatId === 'emberglass-caldera') return habitatFeatureKind === 'emberglass-caldera'
    ? {
      id: 'explore-caldera-breach',
      title: 'Explore the breach',
      description: 'Look for crystal and iron beside the broken rim. Watch the horned Wildkin, leave room to retreat, and choose when to approach.',
    }
    : {
      id: 'explore-caldera-shelves',
      title: 'Explore volcanic shelves',
      description: 'Follow the dark shelves and broken volcanic stone. Look for useful minerals and give territorial Wildkin space.',
    };

  const owned = Array.isArray(state?.ownedWildkin) ? state.ownedWildkin : [];
  const ownsMossling = owned.some(record => record?.speciesId === 'mossling');
  const supplies = state?.fieldSupplies ?? {};
  if (!ownsMossling) {
    if (count(supplies, lure.id) > 0) return {
      id: 'find-mossling',
      title: 'Find a quiet Mossling',
      description: isCamp
        ? 'Walk normally beyond Camp and look for a quiet, leafy Wildkin. Use the berry lure and give it space.'
        : 'Look for a quiet, leafy Wildkin. Use the berry lure and give it space before bonding.',
    };
    const missing = missingCost(spendableResources, lure.cost);
    if (hasAny(missing)) return {
      id: 'gather-berry-lure',
      title: 'Gather lure supplies',
      description: `Gather ${formatCost(missing)} outside Camp for a berry lure.`,
    };
    return campAction(isCamp, {
      id: 'craft-berry-lure', title: 'Craft a berry lure', returnTitle: 'Return to craft a lure',
      action: 'Open Work, choose Craft, and make a berry lure.',
    });
  }

  const structures = Array.isArray(state?.base?.structures) ? state.base.structures : [];
  const hasBed = structures.some(record => record?.type === 'bed');
  const hasGarden = structures.some(record => record?.type === 'berry_garden');
  const establishedAway = !isCamp && activeSpeciesId === 'mossling' && hasBed && hasGarden
    && (!!state?.campCare || !!state?.campBreeding);
  if (establishedAway) return {
    id: 'seek-rootbound-grove',
    title: 'Seek a rootbound grove',
    description: 'Search Lush green country for a living cache. At its root seal, Bloom works even at full health and reveals berries, wildflowers, crystal shards, and field XP.',
  };

  const breeding = state?.campBreeding;
  if (breeding) {
    if ((Number(breeding.growthSeconds) || 0) >= CAMP_BREEDING_GROWTH_SECONDS) return campAction(isCamp, {
      id: 'welcome-young', title: 'Welcome your young', returnTitle: 'Return to the nursery',
      action: 'Approach the occupied Wildkin bed and tap Welcome.',
    });
    return {
      id: 'explore-young-growing', title: 'Explore while it grows',
      description: isCamp ? 'Walk beyond Camp while your young Mossling grows safely in its bed.' : 'Keep exploring while your young Mossling grows safely at Camp.',
    };
  }

  const crop = state?.campCrop;
  if (crop && (Number(crop.growthSeconds) || 0) >= CAMP_CROP_GROWTH_SECONDS) return campAction(isCamp, {
    id: 'harvest-berries', title: 'Harvest ripe berries', returnTitle: 'Return for ripe berries',
    action: `Approach the berry garden and tap Harvest${cropHarvest?.yield ? ` for ${cropHarvest.yield} berries` : ''}.`,
  });

  if (!hasBed) return buildPurpose('bed', spendableResources, isCamp);

  const care = state?.campCare;
  if (!care) {
    if (activeSpeciesId !== 'mossling') return campAction(isCamp, {
      id: 'select-mossling', title: 'Select your Mossling', returnTitle: 'Return to your Mossling',
      action: 'Approach the Camp sanctuary, tap Wildkin, and choose SELECT on a Mossling. Then approach the Wildkin bed.',
    });
    return campAction(isCamp, {
      id: 'settle-mossling', title: 'Settle your Mossling', returnTitle: 'Return to settle Mossling',
      action: 'Approach the Wildkin bed and tap Settle.',
    });
  }

  const nourishment = Math.max(0, Math.min(3, Math.floor(Number(care.nourishment) || 0)));
  if (nourishment < 3) {
    if (count(cargo, 'berries') < 1) return {
      id: 'gather-care-berry', title: 'Gather a care berry',
      description: 'Gather 1 berry outside Camp, then bring it to your settled Mossling.',
    };
    return campAction(isCamp, {
      id: 'feed-mossling', title: 'Feed your Mossling', returnTitle: 'Return to feed Mossling',
      action: `Approach its Wildkin bed and tap Feed. Nourishment: ${nourishment}/3.`,
    });
  }

  if (crop) return {
    id: 'explore-crop-growing', title: 'Explore while berries grow',
    description: isCamp ? 'Walk beyond Camp while the garden ripens.' : 'Keep exploring while your garden ripens at Camp.',
  };

  if (!hasGarden) return buildPurpose('berry_garden', spendableResources, isCamp);

  if (count(cargo, 'berries') < 1) return {
    id: 'gather-plant-berry', title: 'Gather a planting berry',
    description: 'Gather 1 berry outside Camp for your berry garden.',
  };
  return campAction(isCamp, {
    id: 'plant-berry', title: 'Plant a berry', returnTitle: 'Return to plant a berry',
    action: 'Approach the berry garden and tap Plant.',
  });
}
