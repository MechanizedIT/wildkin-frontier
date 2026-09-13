/** Adds immutable generated loot identities while keeping the authored registry authoritative. */
export function createLootRegistryOverlay(baseRegistry, discoveries = []) {
  if (!baseRegistry || !Array.isArray(discoveries)) throw new Error('invalid-loot-registry-overlay');
  const generated = new Map();
  for (const chest of discoveries) {
    if (!chest?.id || generated.has(chest.id) || baseRegistry.getLootChestById?.(chest.id)) throw new Error(`duplicate loot chest ${chest?.id ?? 'unknown'}`);
    generated.set(chest.id, chest);
  }
  const residentIds = new Set();
  const overlay = Object.create(baseRegistry);
  Object.assign(overlay, {
    data: baseRegistry.data,
    _data: baseRegistry._data,
    getAllLootChests: () => [...(baseRegistry.getAllLootChests?.() ?? []), ...generated.values()],
    getLootChestById: id => generated.get(id) ?? baseRegistry.getLootChestById?.(id) ?? null,
    getLootChestsForSection(sectionId) {
      const authored = baseRegistry.getLootChestsForSection?.(sectionId) ?? [];
      const resident = [...residentIds].map(id => generated.get(id)).filter(chest => chest?.sectionId === sectionId);
      return [...authored, ...resident];
    },
    setResidentDiscoveryIds(ids = []) {
      residentIds.clear();
      for (const id of ids) if (generated.has(id)) residentIds.add(id);
    },
    getResidentDiscoveryIds: () => [...residentIds],
  });
  return overlay;
}
