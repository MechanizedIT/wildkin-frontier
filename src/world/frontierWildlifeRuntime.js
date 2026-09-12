import { sampleFrontierWildlifeChunk } from './frontierWildlife.js';

const MAX_LIVE_RESIDENTS = 4;

/** Maps immutable terrain residency to bounded generated Wildkin. */
export function createFrontierWildlifeRuntime({ terrainRuntime, creatureSystem, visualAssets = [], isSourceCaptured = () => false } = {}) {
  const loaded = new Map();
  let lastResidency = null;
  let cachedDesired = [];
  let cachedSources = new Map();
  let desiredSourceSet = [];
  let lastActorSignature = '';
  let disposed = false;

  function desiredChunks() {
    const residency = terrainRuntime?.getResidency?.() ?? { center: null, chunks: [] };
    if (residency === lastResidency) return cachedDesired;
    lastResidency = residency;
    cachedSources = new Map();
    desiredSourceSet = [];
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

  function generatedActors() {
    const actors = creatureSystem?.getCreatures?.() ?? creatureSystem?.getAllAliveCreatures?.() ?? [];
    return actors.filter((creature) => creature.state.isGeneratedResident);
  }

  function actorSignature(actors = generatedActors()) {
    return actors.map((creature) => creature.state.originId ?? creature.state.id).sort().join('|');
  }

  function chooseSources(chunks) {
    const center = lastResidency?.center;
    const candidates = [];
    for (const chunk of chunks) {
      const sources = cachedSources.get(chunk.id) ?? sampleFrontierWildlifeChunk(chunk.cx, chunk.cz, { getTerrainSample: terrainRuntime?.sample });
      cachedSources.set(chunk.id, sources);
      const distance = Math.abs(chunk.cx - center.cx) + Math.abs(chunk.cz - center.cz);
      for (const source of sources) if (!isSourceCaptured(source.originId)) candidates.push({ source, distance });
    }
    candidates.sort((a, b) => (a.source.residentPriority ?? 100) - (b.source.residentPriority ?? 100)
      || a.distance - b.distance || a.source.originId.localeCompare(b.source.originId));
    return candidates.slice(0, MAX_LIVE_RESIDENTS).map((entry) => entry.source);
  }

  function reconcile(wanted) {
    const chosenIds = new Set(desiredSourceSet.map((source) => source.originId));
    const actorIds = new Set(generatedActors().map((creature) => creature.state.originId));
    for (const [chunkId, origins] of loaded) {
      const retained = [];
      for (const originId of origins) {
        if (!actorIds.has(originId)) continue;
        if (!wanted.has(chunkId) || !chosenIds.has(originId) || isSourceCaptured(originId)) {
          creatureSystem?.removeGeneratedCreatureByOrigin?.(originId);
        } else retained.push(originId);
      }
      if (retained.length) loaded.set(chunkId, retained); else loaded.delete(chunkId);
    }
    let liveCount = generatedActors().length;
    for (const source of desiredSourceSet) {
      if (liveCount >= MAX_LIVE_RESIDENTS) break;
      const present = loaded.get(source.generatedChunkId) ?? [];
      if (present.includes(source.originId) || isSourceCaptured(source.originId)) continue;
      const visualAsset = visualAssets.find((asset) => asset?.id === source.visualAssetId);
      const added = creatureSystem?.addGeneratedCreatures?.([{ ...source, visualAsset }]) ?? [];
      if (!added.length) continue;
      loaded.set(source.generatedChunkId, [...present, ...added.map((creature) => creature.state.originId)]);
      liveCount += added.length;
    }
    lastActorSignature = actorSignature();
  }

  function update() {
    if (disposed) return;
    const previousResidency = lastResidency;
    const chunks = desiredChunks();
    const residencyChanged = lastResidency !== previousResidency;
    const wanted = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    for (const chunkId of [...loaded.keys()]) if (!wanted.has(chunkId)) retire(chunkId);
    // Capture writes can occur without a terrain residency change. Re-check the
    // small live set every frame so an accepted source vanishes immediately.
    let captureStateChanged = false;
    for (const [chunkId, origins] of loaded) {
      const captured = origins.filter((originId) => isSourceCaptured(originId));
      for (const originId of captured) creatureSystem?.removeGeneratedCreatureByOrigin?.(originId);
      if (captured.length) {
        captureStateChanged = true;
        loaded.set(chunkId, origins.filter((originId) => !captured.includes(originId)));
      }
    }
    const actorsChanged = actorSignature() !== lastActorSignature;
    if (!residencyChanged && !actorsChanged && !captureStateChanged) return;
    // A dead/respawning actor remains in getCreatures() and therefore owns one
    // of these four slots. Reconcile only when residency, capture membership or
    // actor membership changes; ordinary per-frame AI never rebuilds actors.
    desiredSourceSet = chooseSources(chunks);
    reconcile(wanted);
  }

  function getDebugState() { return { liveResidentCount: [...loaded.values()].flat().length, residentChunkIds: [...loaded.keys()].sort() }; }
  function dispose() { if (disposed) return; for (const chunkId of [...loaded.keys()]) retire(chunkId); disposed = true; }
  return { update, getDebugState, dispose };
}
