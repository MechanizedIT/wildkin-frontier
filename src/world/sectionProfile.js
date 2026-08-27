// Read-only section design summary. This never places or balances content.

function levelOf(entry) {
  return Math.max(1, Math.floor(Number(entry?.level ?? entry?.tier) || 1));
}

function rangeStatus(actual, target) {
  if (!target) return "none";
  const min = Number.isFinite(target.min) ? target.min : -Infinity;
  const max = Number.isFinite(target.max) ? target.max : Infinity;
  return actual >= min && actual <= max ? "ok" : "warning";
}

function expectedStatus(actual, expected) {
  if (expected === undefined || expected === null) return "none";
  if (Number.isFinite(expected)) return actual === expected ? "ok" : "warning";
  return rangeStatus(actual, expected);
}

export function summarizeSection(worldData, sectionOrId) {
  const section = typeof sectionOrId === "string"
    ? worldData.regions.find((entry) => entry.id === sectionOrId)
    : sectionOrId;
  if (!section) return null;
  const resources = [
    ...(section.resources ?? []),
    ...(section.props ?? []).filter((prop) => {
      if (prop.subtype !== "visualAsset") return false;
      return worldData.visualAssets?.find((asset) => asset.id === prop.visualAssetId)?.gameplay?.role === "harvestable";
    }),
  ];
  const wildkin = [
    ...(section.creatures ?? []),
    ...(section.props ?? []).filter((prop) => {
      if (prop.subtype !== "visualAsset") return false;
      return worldData.visualAssets?.find((asset) => asset.id === prop.visualAssetId)?.gameplay?.role === "wildkin";
    }),
  ];
  const profile = section.sectionProfile ?? {};
  const expected = profile.expected ?? {};
  const resourceValue = resources.reduce((sum, entry) => sum + levelOf(entry), 0);
  const wildkinLevels = wildkin.map(levelOf);
  const counts = {
    waypoint: (section.majorWaypoints ?? []).length,
    extractionBeacons: (section.extractionBeacons ?? []).length,
    secrets: (section.lootChests ?? []).filter((chest) => chest.secret !== false && !chest.courseId).length,
    parkourCourses: new Set((section.parkourStarts ?? []).map((entry) => entry.courseId)).size,
    outboundPortals: (section.portalGates ?? []).filter((gate) => gate.targetSectionId && gate.targetSectionId !== "camp").length,
  };
  return {
    id: section.id,
    displayName: section.displayName ?? section.id,
    tier: profile.tier ?? 1,
    recommendedLevel: profile.recommendedLevel ?? { min: 1, max: 1 },
    resourceValue,
    resourceTarget: profile.resourceValueTarget ?? null,
    resourceStatus: rangeStatus(resourceValue, profile.resourceValueTarget),
    wildkinCount: wildkin.length,
    wildkinCountTarget: profile.wildkinCountTarget ?? null,
    wildkinCountStatus: rangeStatus(wildkin.length, profile.wildkinCountTarget),
    wildkinLevelRange: wildkinLevels.length
      ? { min: Math.min(...wildkinLevels), max: Math.max(...wildkinLevels) }
      : null,
    wildkinLevelTarget: profile.wildkinLevelTarget ?? null,
    counts,
    countStatus: {
      waypoint: expectedStatus(counts.waypoint, expected.waypoint),
      extractionBeacons: expectedStatus(counts.extractionBeacons, expected.extractionBeacons),
      secrets: expectedStatus(counts.secrets, expected.secrets),
      parkourCourses: expectedStatus(counts.parkourCourses, expected.parkourCourses),
      outboundPortals: expectedStatus(counts.outboundPortals, expected.outboundPortals),
    },
  };
}
