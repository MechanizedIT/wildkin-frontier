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
  const checkAccess = opts.checkAccess ?? (() => ({ ok: true }));
  const transientChestIds = new Set(opts.transientChestIds ?? []);
  const transientClaims = new Set();
  function availabilityFor(chest) {
    if (transientClaims.has(chest.id)) return { available: false, readyAt: null };
    return frontierProgress?.getLootChestAvailability?.(chest.id, chest.refillSeconds, now()) ?? { available: true };
  }

  function getNearbyInteraction(playerPos) {
    let best = null;
    for (const chest of worldRegistry.getLootChestsForSection?.(getActiveSectionId()) ?? []) {
      const distance = Math.hypot(playerPos.x - chest.pos.x, playerPos.z - chest.pos.z);
      if (Math.abs((playerPos.y ?? 0.5) - (chest.pos.y ?? 0)) > 2.1) continue;
      if (distance > (chest.triggerRadius ?? 1.45) || (best && best.distance <= distance)) continue;
      const availability = availabilityFor(chest);
      const access = checkAccess(chest);
      best = {
        id: chest.id,
        type: "lootChest",
        label: access.ok === false ? access.label ?? "SEALED CACHE" : availability.available
          ? `OPEN — ${chest.displayName ?? "LOOT CHEST"}`
          : `${chest.refillSeconds === undefined || chest.refillSeconds === null ? "CHEST EMPTY" : "CHEST REFILLING"} — ${chest.displayName ?? "Loot chest"}`,
        availability,
        detail: access.ok === false ? access.reason : undefined,
        disabled: access.busy === true,
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
    const position = opts.getPlayerPos?.();
    if (position && (Math.hypot(position.x - chest.pos.x, position.z - chest.pos.z) > (chest.triggerRadius ?? 1.45) + 0.25 || Math.abs(position.y - (chest.pos.y ?? 0)) > 2.1)) return { ok: false, reason: "out-of-range" };
    const access = checkAccess(chest);
    if (access.ok === false) return { ok: false, reason: "locked", detail: access.reason };
    const table = worldRegistry.getLootTableById?.(chest.lootTableId);
    if (!table) return { ok: false, reason: "missing-loot-table" };
    if (!availabilityFor(chest).available) return { ok: false, reason: "unavailable" };
    const offered = resolveLootTable(table, new Set((worldRegistry.data.resourceDrops ?? []).map((entry) => entry.id)));
    const claim = frontierProgress?.claimLootRewards?.(chest.id, chest.refillSeconds, offered, now());
    if (!claim?.ok) return { ok: false, reason: claim?.reason ?? "unavailable", readyAt: claim?.readyAt ?? null };
    if (transientChestIds.has(chest.id) && !claim.partial) transientClaims.add(chest.id);
    const rewards = claim.rewards;
    grantRewards({ ...rewards, partial: !!claim.partial }, chest);
    if (chest.courseId && !claim.partial) onCourseReward(chest.courseId, chest);
    return { ok: true, rewards, chest, partial:!!claim.partial, readyAt: claim.readyAt ?? null };
  }

  return {
    getNearbyInteraction, open,
    restoreTransientClaims(ids) { transientClaims.clear();for(const id of ids??[])if(transientChestIds.has(id))transientClaims.add(id); },
    getAvailability(id) { const chest = worldRegistry.getLootChestById?.(id); return chest ? availabilityFor(chest) : { available: false }; },
    reset: () => transientClaims.clear(),
  };
}
