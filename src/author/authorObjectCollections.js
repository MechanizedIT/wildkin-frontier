// Canonical collection registry for every region-owned Author object family.
// Enumeration, lookup, hierarchy parity checks, and type resolution share this
// seam so a new section collection cannot silently disappear in Edit.

export const REGION_OBJECT_COLLECTIONS = Object.freeze({
  props: "prop",
  groundPatches: "groundPatch",
  boundaryColliders: "boundaryCollider",
  resources: "resource",
  creatures: "creature",
  majorWaypoints: "majorWaypoint",
  extractionBeacons: "extractionBeacon",
  pois: "poi",
});

export const TRAVERSAL_OBJECT_COLLECTIONS = Object.freeze({
  platforms: "platform",
  obstacles: "obstacle",
  climbables: "climbable",
});

export const SECTION_OBJECT_COLLECTIONS = Object.freeze({
  entryPoints: "entryPoint",
  portalGates: "portalGate",
  jumpPads: "jumpPad",
  parkourStarts: "parkourStart",
  parkourCheckpoints: "parkourCheckpoint",
  parkourEnds: "parkourEnd",
  killVolumes: "killVolume",
  lootChests: "lootChest",
});

export function enumerateRegionAuthorObjects(region) {
  const entries = [];
  for (const [collection, type] of Object.entries(REGION_OBJECT_COLLECTIONS)) {
    for (const obj of region?.[collection] ?? []) entries.push({ obj, region, collection, type });
  }
  for (const [collection, type] of Object.entries(TRAVERSAL_OBJECT_COLLECTIONS)) {
    for (const obj of region?.traversal?.[collection] ?? []) entries.push({ obj, region, collection, type });
  }
  for (const [collection, type] of Object.entries(SECTION_OBJECT_COLLECTIONS)) {
    for (const obj of region?.[collection] ?? []) entries.push({ obj, region, collection, type });
  }
  return entries;
}
