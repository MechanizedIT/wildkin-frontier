export const MINERAL_STRIKE_CONFIG = Object.freeze({
  radius: 4.5,
  maxNodes: 3,
  hitsPerNode: 4,
});

const MINERAL_RESOURCE_IDS = new Set(['stone', 'iron_ore', 'crystal_shard']);

function distanceSquared3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function compareIds(a, b) {
  const left = String(a.id ?? '');
  const right = String(b.id ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Selects active, harvest-ready mineral residents without changing their state. */
export function selectMineralStrikeTargets(nodes, pos) {
  if (!Array.isArray(nodes) || !pos
    || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return [];
  const radiusSquared = MINERAL_STRIKE_CONFIG.radius ** 2;
  return nodes
    .filter(node => {
      const position = node?.state?.position;
      return !node?._removed && !node?._regionInactive
        && node?.state?.nodeState === 'READY'
        && Number.isFinite(node?.state?.remainingChunks) && node.state.remainingChunks > 0
        && MINERAL_RESOURCE_IDS.has(node?.type?.resourceId)
        && position && Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)
        && distanceSquared3D(position, pos) <= radiusSquared;
    })
    .map(node => ({ node, distanceSquared: distanceSquared3D(node.state.position, pos) }))
    .sort((a, b) => a.distanceSquared - b.distanceSquared || compareIds(a.node, b.node))
    .slice(0, MINERAL_STRIKE_CONFIG.maxNodes)
    .map(candidate => candidate.node);
}

/**
 * Applies ordinary harvest transactions to a bounded set of nearby minerals.
 * `applyHit` owns all guards, persistence, drops and presentation callbacks.
 */
export function createMineralStrike({ getNodes = () => [], applyHit = () => false } = {}) {
  return function strike(pos) {
    const targets = selectMineralStrikeTargets(getNodes(), pos);
    let hits = 0;
    let sources = 0;
    let depleted = 0;
    for (const node of targets) {
      const intendedHits = Math.min(
        MINERAL_STRIKE_CONFIG.hitsPerNode,
        Math.max(0, Math.floor(node.state.remainingChunks)),
      );
      let sourceHit = false;
      for (let index = 0; index < intendedHits; index += 1) {
        const accepted = applyHit(node, { feedback: index === intendedHits - 1 });
        if (!accepted) return { hits, sources, depleted, interrupted: true };
        hits += 1;
        if (!sourceHit) {
          sourceHit = true;
          sources += 1;
        }
      }
      if (sourceHit && node.state.remainingChunks <= 0) depleted += 1;
    }
    return { hits, sources, depleted, interrupted: false };
  };
}
