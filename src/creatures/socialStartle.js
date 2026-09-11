// One local Mossling alarm. No group registry, recursive propagation or save data.
export const SOCIAL_STARTLE_CONFIG = Object.freeze({ radius: 9, lookSeconds: .4, cooldownSeconds: 6 });

export function isLocalLivePeer(self, other, isActive = () => true) {
  return !!other && other !== self && other.id !== self.id
    && other.regionId === self.regionId && isActive(other.regionId)
    && !other._regionInactive && !other.isDead && !other.bondCaptured
    && other.aiState !== 'RESPAWNING';
}

export function selectStartleRecipient(source, candidates, { isActive = () => true, isTaming = () => false, verticalTolerance = 1.25 } = {}) {
  if (source.speciesTag !== 'mossling' || source.temperament !== 'SKITTISH'
    || source.isDead || source.bondCaptured || source.bondingHeld || source._regionInactive
    || !isActive(source.regionId) || isTaming(source.id) || source.startleCooldown > 0) return null;
  let best = null, bestDistance = Infinity;
  for (const other of candidates) {
    if (!isLocalLivePeer(source, other, isActive) || other.speciesTag !== source.speciesTag
      || other.temperament !== 'SKITTISH' || other.bondingHeld || isTaming(other.id)
      || other.startleCooldown > 0 || ['HURT', 'FLEE', 'STARTLED'].includes(other.aiState)
      || Math.abs(other.pos.y - source.pos.y) > verticalTolerance) continue;
    const distance = Math.hypot(other.pos.x-source.pos.x, other.pos.z-source.pos.z);
    if (distance <= SOCIAL_STARTLE_CONFIG.radius && distance < bestDistance) { best = other; bestDistance = distance; }
  }
  return best;
}

// A frightened animal remembers the last perceived threat, not the hidden
// player's current coordinates. Used by both locomotion archetypes.
export function findPerceivedFleeThreat(self, peers, { isActive = () => true, verticalTolerance = 1.25 } = {}) {
  let best = null, bestDistance = Infinity;
  const player = self.lastKnownPlayerPos;
  if (self.playerDetected && player && Math.abs(player.y-self.pos.y) <= verticalTolerance) {
    const d = Math.hypot(player.x-self.pos.x, player.z-self.pos.z);
    if (d <= self.noticeRadius + 1) { best = { id: 'player', pos: { ...player } }; bestDistance = d; }
  }
  for (const other of peers) {
    if (!isLocalLivePeer(self, other, isActive) || other.bondingHeld
      || other.temperament !== 'AGGRESSIVE' || Math.abs(other.pos.y-self.pos.y) > verticalTolerance) continue;
    const d = Math.hypot(other.pos.x-self.pos.x, other.pos.z-self.pos.z);
    if (d <= 4.5 && d < bestDistance) { best = { id: other.id, pos: { ...other.pos } }; bestDistance = d; }
  }
  return best;
}
