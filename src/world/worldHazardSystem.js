// Section-local fatal volume checks. Kill volumes remain ordinary world hazards;
// parkour courses, checkpoints, and their safe-failure behavior are not involved.

export function isInsideKillVolume(position, volume) {
  if (!position || !volume?.pos || !volume?.size) return false;
  const { x, y, z } = position;
  const { w, h, d } = volume.size;
  if (![x, y, z, volume.pos.x, volume.pos.y, volume.pos.z, w, h, d].every(Number.isFinite) || w <= 0 || h <= 0 || d <= 0) return false;
  const angle = Number.isFinite(volume.rotY) ? volume.rotY : 0;
  const dx = x - volume.pos.x;
  const dz = z - volume.pos.z;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return Math.abs(localX) <= w / 2 && Math.abs(localZ) <= d / 2 && Math.abs(y - volume.pos.y) <= h / 2;
}

export function createWorldHazardSystem(worldRegistry, {
  getActiveSectionId = () => null,
  onFatal = () => {},
} = {}) {
  let activeSectionId = null;
  const insideIds = new Set();

  function reset() {
    activeSectionId = null;
    insideIds.clear();
  }

  function update(playerPosition) {
    const sectionId = getActiveSectionId();
    if (sectionId !== activeSectionId) {
      activeSectionId = sectionId;
      insideIds.clear();
    }
    const insideNow = new Set();
    for (const volume of worldRegistry.getKillVolumesForSection?.(sectionId) ?? []) {
      // Historical drafts may retain course metadata. Those retired beds are
      // hidden by the renderer and must not become invisible fatal hazards.
      if (volume.courseId) continue;
      if (!isInsideKillVolume(playerPosition, volume)) continue;
      insideNow.add(volume.id);
      if (!insideIds.has(volume.id)) onFatal({ volume, reason: "fatal_hazard" });
    }
    insideIds.clear();
    for (const id of insideNow) insideIds.add(id);
  }

  return { update, reset, getState: () => ({ activeSectionId, insideIds: [...insideIds] }) };
}
