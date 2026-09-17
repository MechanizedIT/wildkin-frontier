import { createFrontierChunk, sampleFrontier, sampleFrontierHeight } from '../../../../../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD } from '../../../../../src/world/frontierWorld.js';

const points = [[-456, 668], [-452, 672], [-448, 674], [-442, 682], [-458, 666], [-436, 688]];
const chunks = [createFrontierChunk(-10, 13), createFrontierChunk(-9, 13)];
const record = {
  schema: 'rootbound-terrain-facets-r3-integration-evidence-v1',
  world: DEFAULT_FRONTIER_WORLD,
  affectedChunkIds: chunks.map(chunk => chunk.id),
  nonZeroFacetVertices: chunks.map(chunk => ({
    id: chunk.id,
    count: [...chunk.rootboundFacetDeltas].filter(value => Math.abs(value) > 1e-6).length,
    vertexCount: chunk.rootboundFacetDeltas.length,
  })),
  samples: points.map(([x, z]) => ({ x, z, height: sampleFrontierHeight(x, z), facetDeltaM: sampleFrontier(x, z).rootboundFacetDelta })),
  alternateFacetDeltaM: sampleFrontier(-452, 672, { world: { edition: DEFAULT_FRONTIER_WORLD.edition, seed: DEFAULT_FRONTIER_WORLD.seed + 17 } }).rootboundFacetDelta,
  disabledFacetDeltaM: sampleFrontier(-452, 672, { disableRootbound: true }).rootboundFacetDelta,
};
console.log(JSON.stringify(record, null, 2));
