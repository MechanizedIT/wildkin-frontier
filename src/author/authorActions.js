import {
  getAuthorCapabilities,
  getInspectorFields,
  readNormalizedTransform,
} from "./authorTypeRegistry.js";
import { computeVisualAssetBounds } from "../world/visualFactory.js";

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildInspectorTransform(base, capabilities, values = {}) {
  if (!base || !capabilities) return null;
  const candidate = {
    ...base,
    position: { ...base.position },
    size: base.size ? { ...base.size } : null,
  };
  if (capabilities.draggable) {
    if (finite(values.x)) candidate.position.x = values.x;
    if (finite(values.z)) candidate.position.z = values.z;
  }
  if (capabilities.elevation && finite(values.y)) candidate.position.y = values.y;
  if (capabilities.rotation && finite(values.rotationY)) candidate.rotationY = values.rotationY;
  if (capabilities.resize && capabilities.sizeMode === "box" && candidate.size) {
    if (finite(values.width)) candidate.size.width = values.width;
    if (finite(values.height)) candidate.size.height = values.height;
    if (finite(values.depth)) candidate.size.depth = values.depth;
  }
  if (capabilities.resize && capabilities.sizeMode === "uniform" && finite(values.uniformScale)) {
    candidate.uniformScale = values.uniformScale;
  }
  if (values.moveHomeWithSpawn !== undefined) candidate.moveHomeWithSpawn = !!values.moveHomeWithSpawn;
  return candidate;
}

export function createAuthorActions(draftApi) {
  function placeObject({ kind, subtype, visualAssetId, position, regionId }) {
    return draftApi.createObjectAtPosition(kind, subtype, position, regionId, { visualAssetId });
  }

  function fitAssetCollision(assetId) {
    const asset = draftApi.findVisualAssetById(assetId);
    if (!asset) return { ok: false, error: "Visual Asset not found" };
    try {
      const fitted = computeVisualAssetBounds(asset);
      return draftApi.updateAssetCollision(assetId, { shape: "box", ...fitted });
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  function commitTransform(id, changes = {}) {
    const found = draftApi.findObjectById(id);
    if (!found) return { ok: false, error: "object not found" };
    const base = readNormalizedTransform(found);
    const capabilities = getAuthorCapabilities(found);
    if (!base || !capabilities) return { ok: false, error: "object is not authorable" };
    const values = {
      x: changes.position?.x,
      y: changes.position?.y,
      z: changes.position?.z,
      rotationY: changes.rotationY,
      width: changes.size?.width,
      height: changes.size?.height,
      depth: changes.size?.depth,
      uniformScale: changes.uniformScale,
      moveHomeWithSpawn: changes.moveHomeWithSpawn,
    };
    const candidate = buildInspectorTransform(base, capabilities, values);
    if (changes.regionId !== undefined) candidate.regionId = changes.regionId;
    return draftApi.updateNormalizedTransform(id, candidate);
  }

  function commitInspectorTransform(id, values) {
    const found = draftApi.findObjectById(id);
    if (!found) return { ok: false, error: "object not found" };
    const candidate = buildInspectorTransform(
      readNormalizedTransform(found),
      getAuthorCapabilities(found),
      values,
    );
    if (!candidate) return { ok: false, error: "object is not authorable" };
    return draftApi.updateNormalizedTransform(id, candidate);
  }

  function commitInspectorField(id, key, value) {
    const found = draftApi.findObjectById(id);
    if (!found) return { ok: false, error: "object not found" };
    const fields = getInspectorFields(found);
    const allowedPresentation = new Set(["visibleInPlay", "collisionEnabled", "opacity", "color"]);
    if (!fields.some((field) => field.key === key) && !allowedPresentation.has(key)) {
      return { ok: false, error: `unsupported inspector field ${key}` };
    }
    return draftApi.updateInspectorField(id, key, value);
  }

  return {
    placeObject,
    commitTransform,
    commitInspectorTransform,
    commitInspectorField,
    createVisualAsset: (displayName) => draftApi.createVisualAsset(displayName),
    renameVisualAsset: (assetId, displayName) => draftApi.renameVisualAsset(assetId, displayName),
    deleteVisualAsset: (assetId) => draftApi.deleteVisualAsset(assetId),
    addAssetPart: (assetId, shape) => draftApi.addAssetPart(assetId, shape),
    updateAssetPart: (assetId, partId, patch) => draftApi.updateAssetPart(assetId, partId, patch),
    duplicateAssetPart: (assetId, partId) => draftApi.duplicateAssetPart(assetId, partId),
    deleteAssetPart: (assetId, partId) => draftApi.deleteAssetPart(assetId, partId),
    updateAssetCollision: (assetId, collision) => draftApi.updateAssetCollision(assetId, collision),
    fitAssetCollision,
  };
}
