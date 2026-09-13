export const CONSTRUCTION_VIEW_CONFIG = Object.freeze({ pitch: 42 * Math.PI / 180, zoom: 1 });

// Only the temporary restoration snapshot lives here. cameraFollow still owns
// every camera value and the normal frame loop applies its collision handling.
export function createConstructionView({ camera, follow, getPlayerPosition }) {
  let previous = null;
  return function onPlacementViewChange({ phase, target, reason }) {
    if (phase === 'begin') {
      if (previous || camera.aspect >= 1) return;
      const player = getPlayerPosition();
      if (![target?.x, target?.z, player?.x, player?.z].every(Number.isFinite)) return;
      follow.prepareForInput();
      previous = { yaw: follow.getYaw(), pitch: follow.getPitch(), zoom: follow.getZoom() };
      const yaw = Math.atan2(player.x - target.x, player.z - target.z);
      follow.orbitBy(yaw - follow.getYaw(), CONSTRUCTION_VIEW_CONFIG.pitch - follow.getPitch());
      follow.setZoom(CONSTRUCTION_VIEW_CONFIG.zoom);
      follow.snap();
    } else if (phase === 'end' && previous) {
      const saved = previous;
      previous = null;
      // Resize changes camera.aspect before base closes, but no frame/profile
      // sync intervenes. Restore the old active pitch before snap switches it.
      follow.orbitBy(reason === 'placed' ? 0 : saved.yaw - follow.getYaw(), saved.pitch - follow.getPitch());
      follow.setZoom(saved.zoom);
      follow.snap();
    }
  };
}
