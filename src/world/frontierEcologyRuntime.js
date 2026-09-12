import { sampleFrontierForageChunk } from './frontierEcology.js';
import { createRuntimeResourcePlacements } from '../resources/resourceSystem.js';

/** Maps terrain residency to the existing resource owner; it owns no save data. */
export function createFrontierEcologyRuntime({ terrainRuntime, resourceSystem, visualAssets, getHeight } = {}) {
  const loaded = new Set();
  let lastResidency = null;
  let disposed = false;
  function update() {
    if (disposed) return;
    const residency = terrainRuntime?.getResidency?.() ?? { center: null, chunks: [] };
    if (residency === lastResidency) return;
    lastResidency = residency;
    const chunks = (residency.chunks ?? []).filter(chunk => residency.center && Math.abs(chunk.cx - residency.center.cx) <= 1 && Math.abs(chunk.cz - residency.center.cz) <= 1);
    const wanted = new Map(chunks.map(chunk => [chunk.id, chunk]));
    for (const id of [...loaded]) if (!wanted.has(id)) { resourceSystem.removePlacementsByChunk(id); loaded.delete(id); }
    for (const [id, chunk] of wanted) if (!loaded.has(id)) {
      const sampled = sampleFrontierForageChunk(chunk.cx, chunk.cz, { getHeight: getHeight ?? terrainRuntime.getHeight, visualAssets });
      const placements = createRuntimeResourcePlacements(sampled).map((placement, index) => ({ ...placement, chunkId: sampled[index].chunkId, placementIndex: sampled[index].placementIndex, persistentFinite: true, regionId: 'camp' }));
      resourceSystem.addPlacements(placements);
      loaded.add(id);
    }
  }
  function getDebugState() { return { residentChunkCount: loaded.size, residentChunkIds: [...loaded].sort() }; }
  function dispose() { if (disposed) return; for (const id of loaded) resourceSystem.removePlacementsByChunk(id); loaded.clear(); lastResidency = null; disposed = true; }
  return { update, getDebugState, dispose };
}
