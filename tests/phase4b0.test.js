import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { WORLD_DATA } from "./fixtures/phase4b1ProofWorld.generated.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";
import { createAuthorActions } from "../src/author/authorActions.js";
import { ASSET_EDIT_CAMERA_STEP, getAssetEditCameraPosition, getAssetEditPanTarget, getAssetEditPartKeyPatch } from "../src/author/authorMode.js";
import { readNormalizedTransform } from "../src/author/authorTypeRegistry.js";
import { syncAuthorVisual } from "../src/author/authorPreview.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createPickupSystem } from "../src/resources/pickupSystem.js";
import { createRuntimeResourcePlacements } from "../src/resources/resourceSystem.js";
import { createResourceNode, hideOneChunk, showAllChunks } from "../src/resources/createResourceNode.js";
import { createVisualAssetResourceType } from "../src/resources/resourceConfig.js";
import { createWildCreature } from "../src/creatures/createWildCreature.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
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
    for (const region of legacy.regions) {
      for (const object of [...(region.jumpPads ?? []), ...(region.portalGates ?? []), ...(region.lootChests ?? []), ...(region.majorWaypoints ?? []), ...(region.extractionBeacons ?? [])]) delete object.visualAssetId;
    }
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

  it("validates asset gameplay roles and their referenced resource drops", () => {
    const unknownDrop = clone(WORLD_DATA);
    const asset = unknownDrop.visualAssets.find((entry) => entry.id === "asset_berry_bush");
    asset.gameplay.harvestable.dropId = "missing_drop";
    assert.throws(() => normalizeWorldData(unknownDrop), /unresolved resource drop/);

    const invalidRole = clone(WORLD_DATA);
    invalidRole.visualAssets[0].gameplay = { role: "vendor" };
    assert.throws(() => normalizeWorldData(invalidRole), /unsupported gameplay role/);
  });
});

describe("Phase 4B.0 — starter primitive kit", () => {
  it("ships every requested low-poly recipe as editable primitives", () => {
    const expected = [
      "asset_chest", "asset_wooden_crate", "asset_berry_bush", "asset_iron_ore_rock", "asset_crystal",
      "asset_furnace", "asset_bench", "asset_table", "asset_chair", "asset_wood_floor", "asset_wood_wall",
      "asset_wood_doorway", "asset_iron_gear", "asset_iron_pickaxe", "asset_iron_sword", "asset_redwood_tree",
      "asset_fern", "asset_flower", "asset_grass_patch", "asset_ruin_arch", "asset_ruin_path",
    ];
    const byId = new Map(WORLD_DATA.visualAssets.map((asset) => [asset.id, asset]));
    for (const id of expected) {
      const asset = byId.get(id);
      assert.ok(asset, `${id} missing`);
      assert.ok(asset.category, `${id} needs a category`);
      assert.ok(asset.parts.length >= 3, `${id} should be a composed primitive recipe`);
      assert.ok(asset.parts.every((part) => VISUAL_ASSET_SHAPES.includes(part.shape)));
    }
    assert.deepEqual(
      WORLD_DATA.resourceDrops.map((drop) => drop.id),
      ["wood", "stone", "fiber", "berries", "iron_ore", "crystal_shard", "wildflower"],
    );
  });
});

describe("Phase 4B.0 — Asset Workbench controls", () => {
  it("maps the documented rotate and vertical shortcuts to local part edits", () => {
    const part = makeAsset().parts[0];
    assert.equal(getAssetEditPartKeyPatch(part, { key: "q", code: "KeyQ" }).rotation.y, -15 * Math.PI / 180);
    assert.equal(getAssetEditPartKeyPatch(part, { key: "e", code: "KeyE" }).rotation.y, 15 * Math.PI / 180);
    assert.deepEqual(getAssetEditPartKeyPatch(part, { key: " ", code: "Space" }), { position: { y: 0.7 } });
    assert.deepEqual(getAssetEditPartKeyPatch(part, { key: "c", code: "KeyC" }), { position: { y: 0.3 } });
    assert.deepEqual(getAssetEditPartKeyPatch(part, { key: " ", code: "Space", shiftKey: true }), { position: { y: 1.5 } });
  });

  it("dollies on the view ray at fixed pitch and pans vertically in camera space", () => {
    const view = { target: { x: 0, y: 1, z: 0 }, yaw: 0, pitch: Math.PI / 6, distance: 10 };
    const far = getAssetEditCameraPosition(view);
    const near = getAssetEditCameraPosition({ ...view, distance: 5 });
    assert.ok(Math.abs((far.y - view.target.y) / (far.z - view.target.z) - Math.tan(view.pitch)) < 1e-9);
    assert.ok(Math.abs((near.y - view.target.y) / (near.z - view.target.z) - Math.tan(view.pitch)) < 1e-9);
    const panned = getAssetEditPanTarget(view, 0, 20);
    assert.ok(panned.y > view.target.y, "vertical pan changes elevation");
    assert.ok(panned.z < view.target.z, "vertical pan also follows camera pitch");
  });

  it("keeps camera orbit independent from the part rotation step", () => {
    assert.equal(ASSET_EDIT_CAMERA_STEP, Math.PI / 4);
    assert.notEqual(ASSET_EDIT_CAMERA_STEP, 15 * Math.PI / 180);
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
    const moveWithinSection = actions.commitTransform(first.id, { position: { x: 0, y: 0, z: 5.5 } });
    assert.ok(moveWithinSection.ok, moveWithinSection.error);
    assert.equal(draft.findObjectById(first.id).region.id, "camp", "overlapping local coordinates must never auto-rehome an object");
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

  it("authors and exports a custom harvestable role with a custom drop", () => withMockStorage(() => {
    const draft = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draft);
    const created = actions.createVisualAsset("Moon Seed Pod");
    assert.ok(created.ok, created.error);
    const drop = actions.createResourceDrop({ id: "moon_seed", displayName: "Moon Seed", color: "#9c7cff" });
    assert.ok(drop.ok, drop.error);
    assert.ok(actions.fitAssetCollision(created.assetId).ok);
    const role = actions.updateVisualAssetSettings(created.assetId, {
      category: "Resources",
      gameplay: {
        role: "harvestable",
        harvestable: { dropId: "moon_seed", maxChunks: 6, respawnSeconds: 24, feedbackProfile: "fiber" },
      },
    });
    assert.ok(role.ok, role.error);
    const placed = actions.placeObject({
      kind: "visualAsset",
      visualAssetId: created.assetId,
      position: { x: 4, y: 0, z: 9 },
      regionId: "camp",
    });
    assert.ok(placed.ok, placed.error);
    assert.ok(actions.commitInspectorField(placed.id, "visibleInPlay", false).ok);
    assert.ok(actions.commitInspectorField(placed.id, "collisionEnabled", false).ok);
    assert.ok(actions.commitInspectorField(placed.id, "opacity", 0.65).ok);
    assert.ok(actions.commitInspectorField(placed.id, "color", "#c8b4ff").ok);

    const exported = normalizeWorldData(JSON.parse(draft.exportStableJson()));
    const exportedAsset = exported.visualAssets.find((asset) => asset.id === created.assetId);
    assert.equal(exportedAsset.category, "Resources");
    assert.deepEqual(exportedAsset.gameplay.harvestable, {
      dropId: "moon_seed", maxChunks: 6, respawnSeconds: 24, feedbackProfile: "fiber",
    });
    assert.equal(exported.resourceDrops.find((entry) => entry.id === "moon_seed").displayName, "Moon Seed");

    const registry = createWorldRegistry(exported);
    const resource = registry.getAllResources().find((entry) => entry.id === placed.id);
    assert.equal(resource.type, "visualAsset");
    assert.equal(resource.resourceDrop.id, "moon_seed");
    const [runtimePlacement] = createRuntimeResourcePlacements([resource]);
    assert.equal(runtimePlacement.visibleInPlay, false);
    assert.equal(runtimePlacement.collisionEnabled, false);
    assert.equal(runtimePlacement.opacity, 0.65);
    assert.equal(runtimePlacement.tint, "#c8b4ff");
    const staticWorld = createStaticWorld(exported);
    assert.equal(staticWorld.group.getObjectByName(placed.id), undefined, "resource runtime must own the harvestable visual");
    assert.equal(staticWorld.obstacles.some((entry) => entry.id === placed.id), false, "resource runtime must own its collider");

    const scene = new THREE.Scene();
    const pickups = createPickupSystem(scene, null, null, null, { resourceDrops: exported.resourceDrops });
    const pickup = pickups.spawnPickup({
      index: 0,
      regionId: "camp",
      type: { resourceId: "moon_seed", solid: false, dropOriginHeight: 0.5 },
      state: { position: { x: 0, y: 0, z: 0 } },
    });
    assert.equal(pickup.resourceId, "moon_seed");
    assert.ok(pickups.collectPickup(pickup));
    assert.equal(pickups.getInventory().moon_seed, 1);

    const session = createExpeditionSession({ resourceDrops: exported.resourceDrops });
    session.setCargo(pickups.getInventory());
    assert.equal(session.snapshotRun().cargo.moon_seed, 1);
    const progress = createFrontierProgress({ resourceDrops: exported.resourceDrops, inMemoryAuthor: true, isAuthorMode: true });
    progress.load();
    const banked = progress.bankRun(session.snapshotRun().cargo, 0, "custom-drop-proof");
    assert.ok(banked.added);
    assert.equal(progress.getBankedResources().moon_seed, 1);
  }));
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
    assert.ok(root.children.length <= asset.parts.length, "runtime rendering never expands the editable recipe");
    if (root.userData.staticPropBatch) assert.ok(root.children.length < asset.parts.length, "a mesh-only recipe groups same-material parts");
    const obstacle = runtime.obstacles.find((entry) => entry.id === campDropPod.id);
    assert.ok(obstacle);
    assert.equal(obstacle.w, asset.collision.size.w);
    assert.equal(obstacle.height, asset.collision.size.h);
  });
});

describe("Phase 4B.0 — behavioral Visual Assets and authoring polish", () => {
  it("non-destructively adds newly shipped asset/drop catalogs to an older saved draft", () => withMockStorage(() => {
    const saved = clone(WORLD_DATA);
    saved.visualAssets = [makeAsset("asset_user_custom")];
    saved.resourceDrops = [{ id: "user_drop", displayName: "User Drop", color: "#123456" }];
    for (const region of saved.regions) {
      region.props = region.props.filter((prop) => prop.subtype !== "visualAsset");
    }
    localStorage.setItem("wildkin.authorDraft", JSON.stringify(saved));
    const draft = createAuthorDraft(WORLD_DATA);
    const loaded = draft.loadPersisted();
    assert.ok(loaded.visualAssets.some((asset) => asset.id === "asset_user_custom"), "user asset is preserved");
    assert.ok(loaded.resourceDrops.some((drop) => drop.id === "user_drop"), "user drop is preserved");
    for (const repoAsset of WORLD_DATA.visualAssets) assert.ok(loaded.visualAssets.some((asset) => asset.id === repoAsset.id), `missing ${repoAsset.id}`);
    for (const repoDrop of WORLD_DATA.resourceDrops) assert.ok(loaded.resourceDrops.some((drop) => drop.id === repoDrop.id), `missing ${repoDrop.id}`);
  }));

  it("restores every authored part transform after harvest respawn and consumes bottom-first", () => {
    const asset = makeAsset("asset_scaled_resource");
    asset.parts[0].scale = { x: 2.2, y: 0.45, z: 1.35 };
    asset.parts.push({
      id: "top",
      shape: "sphere",
      position: { x: 0, y: 1.25, z: 0 },
      rotation: { x: 0.2, y: 0.4, z: 0.1 },
      scale: { x: 0.4, y: 0.8, z: 0.6 },
      color: "#88cc66",
    });
    asset.gameplay = { role: "harvestable", harvestable: { dropId: "wood", maxChunks: 2, respawnSeconds: 10, feedbackProfile: "wood" } };
    const node = createResourceNode("visualAsset", { x: 0, y: 0, z: 0 }, 0, "scaled", {
      visualAsset: asset,
      resourceType: createVisualAssetResourceType(asset),
    });
    const firstRemoved = hideOneChunk(node);
    assert.equal(firstRemoved.userData.assetPartId, "top", "bottom list item is harvested first");
    for (const mesh of node.chunkMeshes) mesh.scale.setScalar(0.01);
    showAllChunks(node);
    assert.deepEqual(node.chunkMeshes[0].scale.toArray(), [2.2, 0.45, 1.35]);
    assert.deepEqual(node.chunkMeshes[1].scale.toArray(), [0.4, 0.8, 0.6]);
    assert.ok(node.chunkMeshes.every((mesh) => mesh.visible));
  });

  it("reorders parts transactionally and round-trips remnant/drop model references", () => withMockStorage(() => {
    const draft = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draft);
    const resource = actions.createVisualAsset("Ordered Resource");
    const remnant = actions.createVisualAsset("Resource Base");
    const pickupModel = actions.createVisualAsset("Sap Pickup");
    assert.ok(actions.addAssetPart(resource.assetId, "sphere").ok);
    const before = draft.findVisualAssetById(resource.assetId).parts.map((part) => part.id);
    assert.ok(actions.reorderAssetPart(resource.assetId, before[0], 1).ok);
    assert.deepEqual(draft.findVisualAssetById(resource.assetId).parts.map((part) => part.id), [before[1], before[0]]);
    const drop = actions.createResourceDrop({ id: "sap", displayName: "Sap", color: "#ffcc66", visualAssetId: pickupModel.assetId });
    assert.ok(drop.ok, drop.error);
    assert.ok(actions.updateVisualAssetSettings(resource.assetId, { gameplay: {
      role: "harvestable",
      harvestable: { dropId: "sap", maxChunks: 2, respawnSeconds: 12, feedbackProfile: "wood", remnantVisualAssetId: remnant.assetId },
    } }).ok);
    const exported = normalizeWorldData(JSON.parse(draft.exportStableJson()));
    assert.equal(exported.resourceDrops.find((entry) => entry.id === "sap").visualAssetId, pickupModel.assetId);
    assert.equal(exported.visualAssets.find((entry) => entry.id === resource.assetId).gameplay.harvestable.remnantVisualAssetId, remnant.assetId);
  }));

  it("projects a Visual Asset Wildkin into existing AI without a static duplicate", () => {
    const data = clone(WORLD_DATA);
    const asset = makeAsset("asset_custom_wildkin");
    asset.gameplay = { role: "wildkin", wildkin: {
      archetype: "rusher", temperament: "TERRITORIAL", speciesTag: "mossling", hostileSpecies: ["blight"],
      health: 7, moveSpeed: 1.6, damage: 2, respawnSeconds: 18,
      roamRadius: 3.5, noticeRadius: 7, personalSpace: 2.4, leashRadius: 11,
    } };
    data.visualAssets.push(asset);
    data.regions[0].props.push({
      id: "custom_wildkin", subtype: "visualAsset", visualAssetId: asset.id,
      pos: { x: 4, y: 0, z: 9 }, rotY: 0.5, uniformScale: 1.4,
      visibleInPlay: false, collisionEnabled: false, opacity: 0.65, color: "#88aa66",
    });
    const normalized = normalizeWorldData(data);
    const registry = createWorldRegistry(normalized);
    const spawn = registry.getAllCreatures().find((entry) => entry.id === "custom_wildkin");
    assert.equal(spawn.type, "rusher");
    assert.equal(spawn.visualAsset.id, asset.id);
    assert.equal(spawn.configOverrides.health, 7);
    assert.equal(createStaticWorld(normalized).group.getObjectByName("custom_wildkin"), undefined);
    const creature = createWildCreature(new THREE.Scene(), null, spawn, 0);
    assert.equal(creature.group.userData.visualRef.id, asset.id);
    assert.equal(creature.state.maxHealth, 7);
    assert.equal(creature.state.temperament, "TERRITORIAL");
    assert.equal(creature.group.visible, false);
    assert.equal(creature.collisionEnabled, false);
    creature.setVisible(true);
    assert.equal(creature.group.visible, false, "instance visibility remains authoritative");
    creature.setVisualScaleMultiplier(0.5);
    assert.equal(Number(creature.group.scale.x.toFixed(3)), 0.7, "animation preserves authored scale");
  });

  it("uses Visual Assets for pickup drops, depleted remnants, Waypoints, and Beacons", () => {
    const data = clone(WORLD_DATA);
    const model = makeAsset("asset_shared_model");
    model.gameplay = { role: "prop" };
    data.visualAssets.push(model);
    data.resourceDrops.push({ id: "relic", displayName: "Relic", color: "#aabbff", visualAssetId: model.id });
    const wp = data.regions.flatMap((region) => region.majorWaypoints)[0];
    const bc = data.regions.flatMap((region) => region.extractionBeacons)[0];
    wp.visualAssetId = model.id; wp.uniformScale = 1.8;
    bc.visualAssetId = model.id; bc.uniformScale = 0.75;
    const normalized = normalizeWorldData(data);
    const staticWorld = createStaticWorld(normalized);
    assert.equal(staticWorld.group.getObjectByName(wp.id).userData.visualRef.id, model.id);
    assert.equal(staticWorld.group.getObjectByName(wp.id).scale.x, 1.8);
    assert.equal(staticWorld.group.getObjectByName(bc.id).userData.visualRef.id, model.id);
    const pickupSystem = createPickupSystem(new THREE.Scene(), null, null, null, { resourceDrops: normalized.resourceDrops, visualAssets: normalized.visualAssets });
    const pickup = pickupSystem.spawnPickup({ index: 0, regionId: "camp", type: { resourceId: "relic", solid: false, dropOriginHeight: 0.5 }, state: { position: { x: 0, y: 0, z: 0 } } });
    assert.equal(pickup.mesh.userData.pickupVisualAssetId, model.id);
    const harvestAsset = { ...makeAsset("asset_harvest_model"), gameplay: { role: "harvestable", harvestable: { dropId: "relic", maxChunks: 1, respawnSeconds: 8, feedbackProfile: "stone", remnantVisualAssetId: model.id } } };
    const node = createResourceNode("visualAsset", { x: 0, y: 0, z: 0 }, 0, "remnant_proof", {
      visualAsset: harvestAsset, remnantVisualAsset: model,
      resourceType: createVisualAssetResourceType(harvestAsset, model),
    });
    assert.equal(node.remnantMesh.name, "customRemnant");
    assert.equal(node.remnantMesh.children.length, model.parts.length);
  });
});
