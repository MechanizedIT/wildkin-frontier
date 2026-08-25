import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";
import { createAuthorActions } from "../src/author/authorActions.js";
import { readNormalizedTransform } from "../src/author/authorTypeRegistry.js";
import { syncAuthorVisual } from "../src/author/authorPreview.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import {
  VISUAL_ASSET_SHAPES,
  createVisual,
  getVisualRecipeKey,
  getVisualSignature,
} from "../src/world/visualFactory.js";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function withMockStorage(fn) {
  const original = global.localStorage;
  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  try { return fn(); } finally { global.localStorage = original; }
}

function makeAsset(id = "asset_test") {
  return {
    id,
    displayName: "Test Asset",
    version: 1,
    parts: [{
      id: "body",
      shape: "box",
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: "#aabbcc",
    }],
    collision: null,
  };
}

describe("Phase 4B.0 — Visual Asset schema", () => {
  it("normalizes optional visualAssets and validates the canonical recipe", () => {
    const legacy = clone(WORLD_DATA);
    delete legacy.visualAssets;
    legacy.regions.flatMap((region) => region.props).forEach((prop) => {
      if (prop.subtype === "visualAsset") {
        prop.subtype = "box";
        prop.size = { w: 1, h: 1, d: 1 };
        delete prop.visualAssetId;
        delete prop.uniformScale;
      }
    });
    assert.deepEqual(normalizeWorldData(legacy).visualAssets, []);
    assert.equal(normalizeWorldData(WORLD_DATA).visualAssets[0].id, "asset_drop_pod");
  });

  it("rejects duplicate assets/parts, unsupported shapes, invalid scale, and unresolved instances", () => {
    const duplicateAsset = clone(WORLD_DATA);
    duplicateAsset.visualAssets.push(clone(duplicateAsset.visualAssets[0]));
    assert.throws(() => normalizeWorldData(duplicateAsset), /duplicate Visual Asset id/);

    const duplicatePart = clone(WORLD_DATA);
    duplicatePart.visualAssets[0].parts.push(clone(duplicatePart.visualAssets[0].parts[0]));
    assert.throws(() => normalizeWorldData(duplicatePart), /duplicate part id/);

    const unsupported = clone(WORLD_DATA);
    unsupported.visualAssets[0].parts[0].shape = "torus";
    assert.throws(() => normalizeWorldData(unsupported), /unsupported shape/);

    const invalidScale = clone(WORLD_DATA);
    invalidScale.visualAssets[0].parts[0].scale.y = 0;
    assert.throws(() => normalizeWorldData(invalidScale), /scale.y must be positive/);

    const unresolved = clone(WORLD_DATA);
    unresolved.regions[0].props.find((prop) => prop.subtype === "visualAsset").visualAssetId = "asset_missing";
    assert.throws(() => normalizeWorldData(unresolved), /unresolved Visual Asset/);
  });
});

describe("Phase 4B.0 — VisualFactory asset source", () => {
  it("renders all six primitive shapes with stable part metadata", () => {
    const asset = makeAsset();
    asset.parts = VISUAL_ASSET_SHAPES.map((shape, index) => ({
      id: shape,
      shape,
      position: { x: index * 0.2, y: 0.5, z: 0 },
      rotation: { x: 0, y: index * 0.1, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: "#aabbcc",
    }));
    const root = createVisual({ kind: "asset", id: asset.id }, { visualAssets: [asset], objectId: "proof" });
    assert.equal(root.children.length, 6);
    assert.deepEqual(root.children.map((child) => child.userData.assetPartId), VISUAL_ASSET_SHAPES);
    assert.match(getVisualSignature(root), /BoxGeometry/);
    assert.match(getVisualSignature(root), /CapsuleGeometry/);
    assert.equal(root.userData.visualAssetId, asset.id);
  });

  it("is deterministic, recipe-keyed, and fails missing canonical assets explicitly", () => {
    const asset = makeAsset();
    const ref = { kind: "asset", id: asset.id };
    const first = createVisual(ref, { visualAssets: [asset], objectId: "one" });
    const second = createVisual(ref, { visualAssets: [asset], objectId: "two" });
    assert.equal(getVisualSignature(first), getVisualSignature(second));
    const keyBefore = getVisualRecipeKey(ref, { visualAssets: [asset] });
    asset.parts[0].color = "#ff0000";
    const keyAfter = getVisualRecipeKey(ref, { visualAssets: [asset] });
    assert.notEqual(keyBefore, keyAfter);
    assert.throws(() => createVisual({ kind: "asset", id: "asset_missing" }, { visualAssets: [] }), /not found/);
  });
});

describe("Phase 4B.0 — production Author actions and preview reconciliation", () => {
  it("creates/edits/undoes an asset transactionally, places two references, and keeps instance transforms independent", () => withMockStorage(() => {
    const draft = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draft);
    const created = actions.createVisualAsset("Test Totem");
    assert.ok(created.ok, created.error);
    assert.equal(draft.findVisualAssetById(created.assetId).parts.length, 1);

    for (const shape of ["cylinder", "cone", "sphere", "capsule", "icosahedron"]) {
      const added = actions.addAssetPart(created.assetId, shape);
      assert.ok(added.ok, added.error);
    }
    const body = draft.findVisualAssetById(created.assetId).parts[0];
    const edited = actions.updateAssetPart(created.assetId, body.id, {
      position: { x: 0.4, y: 0.7, z: -0.2 },
      rotation: { y: Math.PI / 4 },
      scale: { x: 1.5, y: 0.8, z: 1.1 },
      color: "#ff8844",
    });
    assert.ok(edited.ok, edited.error);
    assert.equal(draft.findVisualAssetById(created.assetId).parts[0].color, "#ff8844");
    assert.ok(draft.undo().ok);
    assert.notEqual(draft.findVisualAssetById(created.assetId).parts[0].color, "#ff8844");
    assert.ok(draft.redo().ok);

    const first = actions.placeObject({ kind: "visualAsset", visualAssetId: created.assetId, position: { x: 4, y: 0, z: 9 }, regionId: "camp" });
    const second = actions.placeObject({ kind: "visualAsset", visualAssetId: created.assetId, position: { x: 5.5, y: 0, z: 9 }, regionId: "camp" });
    assert.ok(first.ok && second.ok, first.error ?? second.error);
    assert.equal(draft.findObjectById(first.id).obj.visualAssetId, created.assetId);
    assert.equal(draft.findObjectById(second.id).obj.visualAssetId, created.assetId);
    const duplicated = draft.duplicateObject(first.id);
    assert.ok(duplicated.ok, duplicated.error);
    assert.equal(draft.findObjectById(duplicated.newId).obj.visualAssetId, created.assetId);
    assert.ok(!draft.findObjectById(duplicated.newId).obj.parts, "duplicated instance must remain a recipe reference");

    const recipeBefore = clone(draft.findVisualAssetById(created.assetId));
    const secondFound = draft.findObjectById(second.id);
    const moved = actions.commitTransform(second.id, {
      position: { x: 6, y: 0.3, z: 9.2 },
      rotationY: 0.8,
      uniformScale: 1.4,
    });
    assert.ok(moved.ok, moved.error);
    assert.deepEqual(draft.findVisualAssetById(created.assetId), recipeBefore);
    assert.notDeepEqual(readNormalizedTransform(draft.findObjectById(first.id)), readNormalizedTransform(draft.findObjectById(second.id)));
    const rehome = actions.commitTransform(first.id, { position: { x: 0, y: 0, z: 5.5 } });
    assert.ok(rehome.ok, rehome.error);
    assert.equal(draft.findObjectById(first.id).region.id, "p1_forest_edge");
  }));

  it("rebuilds every shared preview root on recipe edit while preserving world transforms", () => withMockStorage(() => {
    const draft = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draft);
    const created = actions.createVisualAsset("Shared Proof");
    const first = actions.placeObject({ kind: "visualAsset", visualAssetId: created.assetId, position: { x: 4, y: 0, z: 8.2 }, regionId: "camp" });
    const second = actions.placeObject({ kind: "visualAsset", visualAssetId: created.assetId, position: { x: 5.5, y: 0, z: 8.2 }, regionId: "camp" });
    const scene = new THREE.Scene();
    const firstRoot = syncAuthorVisual(scene, draft.findObjectById(first.id));
    const secondRoot = syncAuthorVisual(scene, draft.findObjectById(second.id));
    const firstPosition = firstRoot.position.clone();
    const secondPosition = secondRoot.position.clone();
    const partId = draft.findVisualAssetById(created.assetId).parts[0].id;
    assert.ok(actions.updateAssetPart(created.assetId, partId, { color: "#00ff88" }).ok);
    const rebuiltFirst = syncAuthorVisual(scene, draft.findObjectById(first.id));
    const rebuiltSecond = syncAuthorVisual(scene, draft.findObjectById(second.id));
    assert.notEqual(rebuiltFirst, firstRoot);
    assert.notEqual(rebuiltSecond, secondRoot);
    assert.ok(rebuiltFirst.position.equals(firstPosition));
    assert.ok(rebuiltSecond.position.equals(secondPosition));
  }));

  it("blocks deleting referenced assets, fits a simple collider, and round-trips stable export", () => withMockStorage(() => {
    const draft = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draft);
    const created = actions.createVisualAsset("Collision Proof");
    const fitted = actions.fitAssetCollision(created.assetId);
    assert.ok(fitted.ok, fitted.error);
    const collision = draft.findVisualAssetById(created.assetId).collision;
    assert.equal(collision.shape, "box");
    assert.ok(collision.size.w > 0 && collision.size.h > 0 && collision.size.d > 0);
    const placed = actions.placeObject({ kind: "visualAsset", visualAssetId: created.assetId, position: { x: 4, y: 0, z: 10 }, regionId: "camp" });
    assert.ok(placed.ok, placed.error);
    const rejected = actions.deleteVisualAsset(created.assetId);
    assert.equal(rejected.ok, false);
    assert.match(rejected.error, /1 instance/);
    const exported = draft.exportStableJson();
    const reloaded = normalizeWorldData(JSON.parse(exported));
    assert.deepEqual(reloaded.visualAssets.find((asset) => asset.id === created.assetId).collision, collision);
  }));

  it("rotates a local collision offset and scales the native box without using visual geometry", () => {
    const data = clone(WORLD_DATA);
    const asset = makeAsset("asset_offset_proof");
    asset.collision = { shape: "box", offset: { x: 1, y: 0.5, z: 0 }, size: { w: 1, h: 1, d: 2 } };
    data.visualAssets.push(asset);
    data.regions[0].props.push({
      id: "prop_offset_proof",
      subtype: "visualAsset",
      visualAssetId: asset.id,
      pos: { x: 4, y: 0, z: 9 },
      rotY: Math.PI / 2,
      uniformScale: 2,
      visibleInPlay: true,
      collisionEnabled: true,
    });
    const runtime = createStaticWorld(normalizeWorldData(data));
    const obstacle = runtime.obstacles.find((entry) => entry.id === "prop_offset_proof");
    assert.ok(Math.abs(obstacle.x - 4) < 1e-6);
    assert.ok(Math.abs(obstacle.z - 7) < 1e-6);
    assert.equal(obstacle.w, 2);
    assert.equal(obstacle.height, 2);
    assert.equal(obstacle.h, 4);
  });
});

describe("Phase 4B.0 — Drop Pod/runtime proof", () => {
  it("migrates Camp Drop Pod to one shared recipe and native box collision", () => {
    const campDropPod = WORLD_DATA.regions.find((region) => region.id === "camp").props.find((prop) => prop.id === "prop_camp_dropPod");
    assert.equal(campDropPod.subtype, "visualAsset");
    assert.equal(campDropPod.visualAssetId, "asset_drop_pod");
    assert.ok(!campDropPod.parts, "instance must not copy primitive recipe data");
    const asset = WORLD_DATA.visualAssets.find((entry) => entry.id === campDropPod.visualAssetId);
    assert.ok(asset.parts.length >= 3);
    assert.equal(asset.collision.shape, "box");
    const runtime = createStaticWorld(WORLD_DATA);
    const root = runtime.group.getObjectByName(campDropPod.id);
    assert.equal(root.userData.visualRef.kind, "asset");
    assert.equal(root.children.length, asset.parts.length);
    const obstacle = runtime.obstacles.find((entry) => entry.id === campDropPod.id);
    assert.ok(obstacle);
    assert.equal(obstacle.w, asset.collision.size.w);
    assert.equal(obstacle.height, asset.collision.size.h);
  });
});
