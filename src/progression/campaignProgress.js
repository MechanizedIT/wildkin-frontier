// A small, authored campaign spine. It is intentionally event/snapshot based:
// no quest runtime or hidden mutable state is required to show guidance.

export const CAMPAIGN_OBJECTIVES = Object.freeze([
  { id: "first_harvest", chapter: 1, title: "Gather the Frontier", description: "Secure your first recovered matter.", rewards: { resources: { fiber: 2 }, xp: 10 }, when: (s) => total(s?.bankedResources) > 0 },
  { id: "first_extract", chapter: 1, title: "Bring It Home", description: "Complete an expedition extraction.", rewards: { resources: { berries: 2 }, xp: 15 }, when: (s) => !!s?.hasDepartedOnce && total(s?.bankedResources) > 0 },
  { id: "first_upgrade", chapter: 2, title: "Resonance Online", description: "Synchronize a Resonator upgrade.", rewards: { resources: { wood: 3 }, xp: 20 }, when: (s) => Object.values(s?.upgrades ?? {}).some((level) => level > 0) },
  { id: "first_bond", chapter: 2, title: "A New Ally", description: "Secure a bonded Wildkin.", rewards: { resources: { wildflower: 3 }, xp: 25 }, when: (s) => (s?.securedCompanions?.length ?? 0) > 0 },
  { id: "first_repair", chapter: 3, title: "Open the Frontier", description: "Repair an outbound portal gate.", rewards: { resources: { iron_ore: 2 }, xp: 30 }, when: (s) => (s?.repairedPortalGateIds?.length ?? 0) > 0 },
  { id: "frontier_explorer", chapter: 3, title: "Beyond the Forest", description: "Discover three frontier waypoints.", rewards: { resources: { crystal_shard: 2 }, xp: 40 }, when: (s) => (s?.unlockedMajorWaypointIds?.length ?? 0) >= 3 },
  { id: "frontier_finale", chapter: 4, title: "Heartwood Restored", description: "Secure the Heartwood Core after opening the repaired frontier.", rewards: { resources: { crystal_shard: 4, wildflower: 4 }, xp: 75 }, when: (s) => (s?.securedCompanions?.length ?? 0) >= 2 && (s?.repairedPortalGateIds?.length ?? 0) >= 1 && (s?.completedPoiIds ?? []).includes("heartwood_core_secured") },
]);

function total(resources = {}) { return Object.values(resources).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0); }
export function getCampaignObjective(id) { return CAMPAIGN_OBJECTIVES.find((objective) => objective.id === id) ?? null; }
export function deriveCampaignProgress(snapshot = {}) {
  const completed = new Set(snapshot.completedObjectives ?? []);
  return CAMPAIGN_OBJECTIVES.map((objective) => ({ ...objective, completed: completed.has(objective.id), eligible: !!objective.when(snapshot) }));
}
export function getNextCampaignObjective(snapshot = {}) { return deriveCampaignProgress(snapshot).find((objective) => !objective.completed && objective.eligible) ?? deriveCampaignProgress(snapshot).find((objective) => !objective.completed) ?? null; }
