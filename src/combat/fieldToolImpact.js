// src/combat/fieldToolImpact.js — one authoritative Field Tool impact resolver
// A single swing may affect both harvestables and living Wildkin in its arc.

import { getAttackTargets } from "./combatTargeting.js";

export function resolveFieldToolImpact({ playerPos, playerFacing, creatures, resources, combatConfig, harvestSelector }) {
  // creatures: array of creature objects (with state.pos, isDead)
  // resources: result of harvestSelector (already filtered) OR raw nodes + selector
  // Returns { creatureHits: [], resourceHits: [] }

  const creatureHits = [];
  const resourceHits = [];

  // Combat part: use existing targeting (frontal arc + vertical)
  if (creatures && playerPos !== undefined && playerFacing !== undefined) {
    const candidates = creatures.filter(c => !c.state?.isDead && c.state?.aiState !== "RESPAWNING");
    // map to targeting shape (id,pos,isDead)
    const targetingCandidates = candidates.map(c => ({
      id: c.state.id,
      pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z },
      isDead: c.state.isDead,
      _orig: c,
    }));
    const hits = getAttackTargets(playerPos, playerFacing, targetingCandidates, {
      range: combatConfig?.attackRange,
      arcDegrees: combatConfig?.attackArcDegrees,
      verticalTolerance: combatConfig?.verticalTolerance,
      maxTargets: combatConfig?.maxTargetsPerAttack,
    });
    for (const h of hits) {
      const orig = candidates.find(c => c.state.id === h.id);
      if (orig) creatureHits.push(orig);
    }
  }

  // Resource part: use provided harvest hits (already validated) — ensure vertical/arc not needed beyond harvest rules
  if (Array.isArray(resources)) {
    for (const r of resources) resourceHits.push(r);
  } else if (typeof harvestSelector === "function" && playerPos) {
    // fallback: call selector
    try {
      const sel = harvestSelector(playerPos);
      if (Array.isArray(sel)) for (const r of sel) resourceHits.push(r);
    } catch {}
  }

  return { creatureHits, resourceHits };
}

// Once-only per swing helper: tracks hit ids within one swing
export function createImpactTracker() {
  const hitIds = new Set();
  return {
    hasHit(id) { return hitIds.has(id); },
    markHit(id) { hitIds.add(id); },
    clear() { hitIds.clear(); },
    size() { return hitIds.size; },
  };
}
