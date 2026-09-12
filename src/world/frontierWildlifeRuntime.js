import { sampleFrontierWildlifeChunk } from './frontierWildlife.js';

const MAX_LIVE_RESIDENTS = 4;

/** Maps immutable terrain residency to bounded generated Mosslings. */
export function createFrontierWildlifeRuntime({ terrainRuntime, creatureSystem, visualAssets = [], isSourceCaptured = () => false } = {}) {
  const loaded = new Map();
  let lastResidency = null;
  let cachedDesired = [];
  let cachedSources = new Map();
  let disposed = false;

  function desiredChunks() {
    const residency = terrainRuntime?.getResidency?.() ?? { center: null, chunks: [] };
    if (residency === lastResidency) return cachedDesired;
    lastResidency = residency;
    cachedSources = new Map();
    if (!residency.center) { cachedDesired = []; return cachedDesired; }
    cachedDesired = (residency.chunks ?? [])
      .filter((chunk) => Math.abs(chunk.cx - residency.center.cx) <= 1 && Math.abs(chunk.cz - residency.center.cz) <= 1)
      .sort((a, b) => Math.abs(a.cx - residency.center.cx) + Math.abs(a.cz - residency.center.cz) - (Math.abs(b.cx - residency.center.cx) + Math.abs(b.cz - residency.center.cz)) || a.id.localeCompare(b.id));
    return cachedDesired;
  }

  function retire(chunkId) {
    creatureSystem?.removeGeneratedCreaturesByChunk?.(chunkId);
    loaded.delete(chunkId);
  }

  function update() {
    if (disposed) return;
    const wanted = new Map(desiredChunks().map((chunk) => [chunk.id, chunk]));
    for (const chunkId of [...loaded.keys()]) if (!wanted.has(chunkId)) retire(chunkId);
    // Capture writes can occur without a terrain residency change. Re-check the
    // small live set every frame so an accepted source vanishes immediately.
    for (const [chunkId, origins] of loaded) {
      const captured = origins.filter((originId) => isSourceCaptured(originId));
      for (const originId of captured) creatureSystem?.removeGeneratedCreatureByOrigin?.(originId);
      if (captured.length) loaded.set(chunkId, origins.filter((originId) => !captured.includes(originId)));
    }
    // A dead/respawning resident still owns its source and can return through
    // the normal creature lifecycle. Count it against the cap so a temporary
    // death cannot later produce a fifth live animal.
    const residentActors = creatureSystem?.getCreatures?.() ?? creatureSystem?.getAllAliveCreatures?.() ?? [];
    let liveCount = residentActors.filter((creature) => creature.state.isGeneratedResident).length;
    for (const [chunkId, chunk] of wanted) {
      if (liveCount >= MAX_LIVE_RESIDENTS) continue;
      const sources = cachedSources.get(chunkId) ?? sampleFrontierWildlifeChunk(chunk.cx, chunk.cz, { getTerrainSample: terrainRuntime?.sample });
      cachedSources.set(chunkId, sources);
      const presentOrigins = loaded.get(chunkId) ?? [];
      const liveSources = sources.filter((source) => !presentOrigins.includes(source.originId) && !isSourceCaptured(source.originId)).slice(0, Math.max(0, MAX_LIVE_RESIDENTS - liveCount));
      if (!liveSources.length) continue;
      const spawns = liveSources.map((source) => ({ ...source, visualAsset: visualAssets.find((asset) => asset?.id === source.visualAssetId) }));
      const added = creatureSystem?.addGeneratedCreatures?.(spawns) ?? [];
      if (added.length) {
        loaded.set(chunkId, [...presentOrigins, ...added.map((creature) => creature.state.originId)]);
        liveCount += added.length;
      }
    }
  }

  function getDebugState() { return { liveResidentCount: [...loaded.values()].flat().length, residentChunkIds: [...loaded.keys()].sort() }; }
  function dispose() { if (disposed) return; for (const chunkId of [...loaded.keys()]) retire(chunkId); disposed = true; }
  return { update, getDebugState, dispose };
}
