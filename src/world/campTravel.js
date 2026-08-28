// Pure Camp-start destination resolver. UI renders this model; it does not own
// discovery or topology rules.

export function getCampStartDestinations(worldRegistry, progress = {}) {
  if (!worldRegistry) return [];
  const destinations = [];
  const arrival = worldRegistry.getDefaultExpeditionArrival?.();
  if (arrival) {
    const gate = arrival.gate ?? null;
    destinations.push({
      type: "sectionEntry",
      id: gate?.id ?? arrival.entryId,
      displayName: gate?.displayName ?? "Forest Edge",
      description: "The known entrance to the frontier.",
      sectionId: arrival.sectionId,
      entryId: arrival.entryId,
      feetPosition: { ...arrival.pos },
      facingYaw: arrival.facingYaw ?? 0,
    });
  }

  const unlocked = new Set(progress.unlockedMajorWaypointIds ?? []);
  for (const waypoint of worldRegistry.getAllWaypoints?.() ?? []) {
    if (waypoint.regionId === "camp" || !unlocked.has(waypoint.id)) continue;
    const spawn = worldRegistry.getWaypointSpawnPosition?.(waypoint.id);
    destinations.push({
      type: "waypoint",
      id: waypoint.id,
      displayName: worldRegistry.getAnchorDisplayName(waypoint),
      description: "A discovered Major Waypoint.",
      sectionId: waypoint.sectionId ?? waypoint.regionId,
      feetPosition: spawn ? { x: spawn.x, y: spawn.y ?? 0, z: spawn.z } : { ...waypoint.pos },
      facingYaw: spawn?.facingYaw ?? 0,
      suppressAnchorId: waypoint.id,
    });
  }
  return destinations;
}
