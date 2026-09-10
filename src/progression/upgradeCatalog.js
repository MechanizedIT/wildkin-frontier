// Persistent Resonator upgrades. Data stays separate from save mutation so UI
// and gameplay can use the same source of truth.

import { MATTER_ATTRACTOR_I } from "./matterAttractor.js";

const tiers = (id, displayName, description, entries) => Object.freeze({
  id, displayName, description,
  tiers: Object.freeze(entries.map((entry, index) => Object.freeze({ level: index + 1, ...entry }))),
});

export const UPGRADE_CATALOG = Object.freeze([
  tiers("matter_attractor", "Matter Attractor", "Recovered matter pulls toward you from farther away.", [
    { minPlayerLevel: 1, cost: MATTER_ATTRACTOR_I.cost, modifiers: { pickupMagnetRadius: 3.9, pickupMagnetSpeed: 8.2 } },
    { minPlayerLevel: 2, cost: { wood: 12, fiber: 10, crystal_shard: 3 }, modifiers: { pickupMagnetRadius: 4.8, pickupMagnetSpeed: 10 } },
    { minPlayerLevel: 4, cost: { wood: 18, iron_ore: 8, crystal_shard: 6 }, modifiers: { pickupMagnetRadius: 6, pickupMagnetSpeed: 12 } },
  ]),
  tiers("field_tool", "Field Tool Calibration", "Improves harvesting efficiency and Field Tool damage.", [
    { minPlayerLevel: 1, cost: { wood: 6, stone: 6, fiber: 4 }, modifiers: { fieldToolDamageMultiplier: 1.15, harvestYieldMultiplier: 1.15 } },
    { minPlayerLevel: 3, cost: { wood: 10, iron_ore: 6, crystal_shard: 2 }, modifiers: { fieldToolDamageMultiplier: 1.3, harvestYieldMultiplier: 1.3 } },
    { minPlayerLevel: 5, cost: { iron_ore: 12, crystal_shard: 7, wildflower: 6 }, modifiers: { fieldToolDamageMultiplier: 1.5, harvestYieldMultiplier: 1.5 } },
  ]),
  tiers("vitality", "Frontier Vitality", "Raises maximum health for longer expeditions.", [
    { minPlayerLevel: 1, cost: { berries: 6, fiber: 6, stone: 4 }, modifiers: { maxHealthBonus: 1 } },
    { minPlayerLevel: 3, cost: { berries: 10, iron_ore: 4, wildflower: 4 }, modifiers: { maxHealthBonus: 2 } },
    { minPlayerLevel: 5, cost: { berries: 14, crystal_shard: 5, wildflower: 8 }, modifiers: { maxHealthBonus: 3 } },
  ]),
  tiers("capture_capacity", "Wildkin Shelter", "Expands the number of newly bonded Wildkin that can be secured from one expedition.", [
    { minPlayerLevel: 1, cost: { wood: 8, fiber: 8, berries: 4 }, modifiers: { captureCapacity: 2 } },
    { minPlayerLevel: 3, cost: { wood: 14, fiber: 12, iron_ore: 5 }, modifiers: { captureCapacity: 3 } },
    { minPlayerLevel: 5, cost: { wood: 20, crystal_shard: 6, wildflower: 8 }, modifiers: { captureCapacity: 4 } },
  ]),
  tiers("field_medicine", "Field Medicine", "Improves crafted medkit recovery.", [
    { minPlayerLevel: 1, cost: { fiber: 8, berries: 8, wildflower: 3 }, modifiers: { medkitHeal: 2 } },
    { minPlayerLevel: 3, cost: { fiber: 12, berries: 12, crystal_shard: 2 }, modifiers: { medkitHeal: 3 } },
    { minPlayerLevel: 5, cost: { fiber: 16, berries: 16, crystal_shard: 5 }, modifiers: { medkitHeal: 4 } },
  ]),
]);

export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADE_CATALOG.map((upgrade) => [upgrade.id, upgrade])));

export function getUpgradeDefinition(id) { return UPGRADE_BY_ID[id] ?? null; }
export function getUpgradeTier(id, level) {
  const definition = getUpgradeDefinition(id);
  const normalized = Math.floor(Number(level));
  if (!definition || !Number.isFinite(normalized) || normalized < 1) return null;
  return definition.tiers[normalized - 1] ?? null;
}

export function getUpgradeModifiers(upgrades = {}) {
  const modifiers = { pickupMagnetRadius: 0, pickupMagnetSpeed: 0, fieldToolDamageMultiplier: 1, harvestYieldMultiplier: 1, maxHealthBonus: 0, captureCapacity: 1, medkitHeal: 1 };
  for (const definition of UPGRADE_CATALOG) {
    const tier = getUpgradeTier(definition.id, upgrades[definition.id]);
    if (!tier) continue;
    for (const [key, value] of Object.entries(tier.modifiers ?? {})) {
      if (key.endsWith("Multiplier")) modifiers[key] = value;
      else modifiers[key] = value;
    }
  }
  return modifiers;
}

export const CONSUMABLE_CATALOG = Object.freeze({
  medkit: Object.freeze({ id: "medkit", displayName: "Field Medkit", cost: Object.freeze({ fiber: 3, berries: 2 }) }),
});
