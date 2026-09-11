// The receiver tracks after its region's existing waypoint is discovered.
// It presents that saved state; it never unlocks travel or grants a reward.
export const OBSERVATORY_MOTION = Object.freeze({
  assetId: 'asset_fen_observatory',
  tiltRadians: 8 * Math.PI / 180,
  cycleSeconds: 10,
});

export function createObservatoryMechanisms({scene, registry, progress}) {
  const receivers = [];
  for (const region of registry.data.regions ?? []) {
    const waypoint = region.majorWaypoints?.[0];
    if (!waypoint) continue;
    for (const prop of region.props ?? []) {
      if (prop.visualAssetId !== OBSERVATORY_MOTION.assetId) continue;
      const root = scene.getObjectByName(prop.id);
      const pivot = root?.getObjectByName('ReceiverTiltPivot');
      if (pivot) receivers.push({root, pivot, rest: pivot.rotation.x,
        sectionId: region.id, waypointId: waypoint.id, time: 0});
    }
  }
  function reset() {
    for (const receiver of receivers) {
      receiver.time = 0;
      receiver.pivot.rotation.x = receiver.rest;
    }
  }
  return {
    reset,
    update(dt, {sectionId, paused = false, hidden = false, reducedMotion = false} = {}) {
      if (hidden) { reset(); return; }
      for (const receiver of receivers) {
        if (receiver.sectionId !== sectionId || !receiver.root.visible || !progress.isUnlockedWaypoint(receiver.waypointId)) {
          receiver.time = 0;
          receiver.pivot.rotation.x = receiver.rest;
          continue;
        }
        if (paused) continue;
        if (reducedMotion) receiver.time = 0;
        else receiver.time = (receiver.time + Math.max(0, dt)) % OBSERVATORY_MOTION.cycleSeconds;
        receiver.pivot.rotation.x = receiver.rest + Math.sin(receiver.time * Math.PI * 2 / OBSERVATORY_MOTION.cycleSeconds) * OBSERVATORY_MOTION.tiltRadians;
      }
    },
  };
}
