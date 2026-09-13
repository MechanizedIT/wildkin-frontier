const records = [
  ['heartwood-basin', 'Heartwood Basin', 0, 0, 'lush', [0.16, 0.55, 0.24]],
  ['rootbound-wildwood', 'Rootbound Wildwood', -425, 650, 'lush', [0.08, 0.34, 0.16]],
  ['skybreak-tablelands', 'Skybreak Tablelands', 0, -450, 'ironspine', [0.47, 0.57, 0.65]],
  ['sunscar-desert', 'Sunscar Desert', -1850, 50, 'sunscar', [0.86, 0.57, 0.25]],
  ['ironspine-range', 'Ironspine Range', -2100, -3000, 'ironspine', [0.25, 0.31, 0.36]],
  ['shatterfen', 'Shatterfen', -750, 1900, 'lush', [0.16, 0.48, 0.43]],
  ['fungal-hollow', 'Fungal Hollow', -2850, -1250, 'lush', [0.48, 0.25, 0.55]],
  ['emberglass-caldera', 'Emberglass Caldera', 850, -2000, 'ironspine', [0.74, 0.23, 0.14]],
  ['verdant-stair', 'Verdant Stair', -900, -1600, 'ironspine', [0.46, 0.65, 0.25]],
  ['saltglass-headlands', 'Saltglass Headlands', 1525, 1675, 'sunscar', [0.77, 0.76, 0.65]],
];

/** Fixed macro allocation. Topology does not imply a finished habitat. */
export const FRONTIER_REGION_CATALOG = Object.freeze(records.map(([
  habitatId, name, x, z, baseKind, diagnosticColorRGB,
]) => Object.freeze({
  habitatId,
  name,
  x,
  z,
  baseKind,
  diagnosticColorRGB: Object.freeze(diagnosticColorRGB),
  completionStatus: 'topology-only',
})));

const REGION_BY_ID = new Map(FRONTIER_REGION_CATALOG.map(record => [record.habitatId, record]));

export function getFrontierRegionRecord(habitatId) {
  return REGION_BY_ID.get(habitatId) ?? null;
}
