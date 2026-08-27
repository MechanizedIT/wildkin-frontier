// Reusable deterministic Loot Tables + persistent one-time/refill chests.

export function resolveLootTable(lootTable, resourceIds = null) {
  if (!lootTable) return null;
  const resources = {};
  let xp = 0;
  for (const reward of lootTable.rewards ?? []) {
    if (reward.type === "resource" && (!resourceIds || resourceIds.has(reward.id))) {
      resources[reward.id] = (resources[reward.id] ?? 0) + reward.amount;
    } else if (reward.type === "xp") xp += reward.amount;
  }
  return { resources, xp };
}

export function createLootSystem(worldRegistry, opts = {}) {
  const frontierProgress = opts.frontierProgress;
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);
  const grantRewards = opts.grantRewards ?? (() => {});
  const onCourseReward = opts.onCourseReward ?? (() => {});
  const now = opts.now ?? (() => Date.now());

  function getNearbyInteraction(playerPos) {
    let best = null;
    for (const chest of worldRegistry.getLootChestsForSection?.(getActiveSectionId()) ?? []) {
      const distance = Math.hypot(playerPos.x - chest.pos.x, playerPos.z - chest.pos.z);
      if (distance > (chest.triggerRadius ?? 1.45) || (best && best.distance <= distance)) continue;
      const availability = frontierProgress?.getLootChestAvailability?.(chest.id, chest.refillSeconds, now()) ?? { available: true };
      best = {
        id: chest.id,
        type: "lootChest",
        label: availability.available
          ? `OPEN — ${chest.displayName ?? "LOOT CHEST"}`
          : chest.refillSeconds === undefined || chest.refillSeconds === null ? "CHEST EMPTY" : "CHEST REFILLING",
        availability,
        distance,
      };
    }
    if (!best) return null;
    const { distance, ...interaction } = best;
    return interaction;
  }

  function open(chestId) {
    const chest = worldRegistry.getLootChestById?.(chestId);
    if (!chest || chest.sectionId !== getActiveSectionId()) return { ok: false, reason: "inactive-or-missing" };
    const claim = frontierProgress?.claimLootChest?.(chest.id, chest.refillSeconds, now());
    if (!claim?.claimed) return { ok: false, reason: claim?.reason ?? "unavailable", readyAt: claim?.readyAt ?? null };
    const table = worldRegistry.getLootTableById?.(chest.lootTableId);
    const rewards = resolveLootTable(table, new Set((worldRegistry.data.resourceDrops ?? []).map((entry) => entry.id)));
    grantRewards(rewards, chest);
    if (chest.courseId) onCourseReward(chest.courseId, chest);
    return { ok: true, rewards, chest, readyAt: claim.readyAt ?? null };
  }

  return { getNearbyInteraction, open };
}
