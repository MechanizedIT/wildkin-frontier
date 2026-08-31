function hasAsset(visualAssets, id) {
  return !!id && (visualAssets ?? []).some((asset) => asset.id === id);
}

export function resolvePortalGateVisual(gate = {}, effectiveState = gate.state ?? "active", visualAssets = []) {
  const stateAssetId = effectiveState === "ruined" ? gate.ruinedVisualAssetId : gate.activeVisualAssetId;
  const assetId = hasAsset(visualAssets, stateAssetId)
    ? stateAssetId
    : hasAsset(visualAssets, gate.visualAssetId) ? gate.visualAssetId : null;
  return {
    visualRef: assetId ? { kind: "asset", id: assetId } : { kind: "builtin", id: "prop/gate" },
    size: { width: 2.4, height: 2.6, depth: 0.5 },
    sizeMode: assetId ? "uniform" : "box",
    effectiveState,
  };
}

export function resolveJumpPadVisual(pad = {}, visualAssets = []) {
  const assetId = hasAsset(visualAssets, pad.visualAssetId) ? pad.visualAssetId : null;
  return {
    visualRef: assetId ? { kind: "asset", id: assetId } : { kind: "builtin", id: "traversal/jump-pad" },
    size: { width: 1.8, height: 0.25, depth: 1.8 },
    sizeMode: assetId ? "uniform" : "box",
  };
}

export function resolveParkourMarkerVisual(marker = {}, markerKind, visualAssets = []) {
  const assetId = hasAsset(visualAssets, marker.visualAssetId) ? marker.visualAssetId : null;
  const normalizedKind = markerKind === "checkpoint" || markerKind === "end" ? markerKind : "start";
  return {
    visualRef: assetId ? { kind: "asset", id: assetId } : { kind: "builtin", id: `parkour/${normalizedKind}` },
    sizeMode: assetId ? "uniform" : "none",
    markerKind: normalizedKind,
  };
}
