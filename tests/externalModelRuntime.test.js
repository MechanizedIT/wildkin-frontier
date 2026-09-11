import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import * as THREE from "three";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createAuthorDraft, preparePersistedAuthorDraft } from "../src/author/authorDraft.js";
import { createVisualAssetVisual } from "../src/world/visualFactory.js";
import { disposeObject3D } from "../src/author/authorPreview.js";
import { clearModelAssetCacheForTests, createVisualAnimationController, disposeExternalModelInstance, getModelTemplate, preloadVisualModels } from "../src/assets/modelAssetRuntime.js";

function copy(value) { return JSON.parse(JSON.stringify(value)); }
const asset = { id: "asset_fixture_mossling", displayName: "Fixture Mossling", category: "Wildkin", version: 1, model: { path: "assets/models/asset_fixture_mossling/model.glb", scale: 0.8, pivot: { x: 0, y: 0.15, z: 0 }, clips: { idle: "Idle", walk: "Walk", attack: "Attack", hurt: "Hurt" } }, collision: null, gameplay: { role: "prop" } };

function createSkinnedTemplate() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const colorMap = new THREE.DataTexture(new Uint8Array([128, 200, 150, 255]), 1, 1, THREE.RGBAFormat);
  const metallicMap = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  const material = new THREE.MeshStandardMaterial({ color: 0x88cc99, map: colorMap, metalness: 0.8, metalnessMap: metallicMap, roughness: 0.1, roughnessMap: metallicMap });
  const mesh = new THREE.SkinnedMesh(geometry, material); mesh.name = "fixtureSkin";
  const rootBone = new THREE.Bone(); rootBone.name = "root";
  const tipBone = new THREE.Bone(); tipBone.name = "tip"; tipBone.position.y = 1;
  rootBone.add(tipBone); mesh.add(rootBone); mesh.bind(new THREE.Skeleton([rootBone, tipBone])); scene.add(mesh);
  const animations = [
    new THREE.AnimationClip("Idle", 1, []),
    new THREE.AnimationClip("Walk", 1, [new THREE.VectorKeyframeTrack("tip.position", [0, 1], [0, 1, 0, 0, 2, 0])]),
    new THREE.AnimationClip("Attack", 0.25, [new THREE.QuaternionKeyframeTrack("tip.quaternion", [0, 0.25], [0, 0, 0, 1, 0, 0, 0.48, 0.88])]),
    new THREE.AnimationClip("Hurt", 0.2, [new THREE.QuaternionKeyframeTrack("tip.quaternion", [0, 0.2], [0, 0, 0, 1, -0.39, 0, 0, 0.92])]),
  ];
  return { scene, animations, source: { geometry } };
}

async function preloadFixture(template = createSkinnedTemplate()) {
  await preloadVisualModels([asset], { loader: { loadAsync: async () => template } });
  return template;
}
afterEach(() => clearModelAssetCacheForTests());

describe("external local GLB Visual Assets", () => {
  it("coerces a model-only asset to an empty primitive recipe and validates its local path", () => {
    const data = copy(WORLD_DATA); data.visualAssets.push(copy(asset));
    const normalized = normalizeWorldData(data);
    assert.deepEqual(normalized.visualAssets.find((entry) => entry.id === asset.id).parts, []);
    const revised = copy(data); revised.visualAssets.at(-1).model.path = "assets/models/mossling-v2/model.glb";
    assert.equal(normalizeWorldData(revised).visualAssets.at(-1).id, asset.id, "package revision must preserve the stable world asset ID");
    for (const path of ["https://example.test/model.glb", "assets/models/../model.glb", "assets/models/mossling/model.glb?url=external"]) {
      const unsafe = copy(data); unsafe.visualAssets.at(-1).model.path = path;
      assert.throws(() => normalizeWorldData(unsafe), /model path/);
    }
    const invalid = copy(data); invalid.visualAssets.at(-1).model.path = "assets/models/not-allowed.glb";
    assert.throws(() => normalizeWorldData(invalid), /model path/);
  });

  it("shares a pending path load, clears failures for retry, and applies a matte local material template", async () => {
    const fixture = createSkinnedTemplate(); let calls = 0;
    const loader = { loadAsync: async () => { calls += 1; await Promise.resolve(); return fixture; } };
    await Promise.all([preloadVisualModels([asset], { loader }), preloadVisualModels([asset], { loader })]);
    assert.equal(calls, 1);
    const mesh = getModelTemplate(asset.model.path).scene.getObjectByName("fixtureSkin");
    assert.equal(mesh.material.type, "MeshLambertMaterial");
    assert.equal(mesh.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal("metalnessMap" in mesh.material, false);
    assert.equal("roughnessMap" in mesh.material, false);
    clearModelAssetCacheForTests(); let retries = 0;
    const flaky = { loadAsync: async () => { retries += 1; if (retries === 1) throw new Error("missing local file"); return createSkinnedTemplate(); } };
    await assert.rejects(() => preloadVisualModels([asset], { loader: flaky }), /missing local file/);
    await preloadVisualModels([asset], { loader: flaky }); assert.equal(retries, 2);
  });

  it("matches locomotion playback to actual movement and authored instance scale", async () => {
    const fixture = createSkinnedTemplate(); fixture.animations.push(new THREE.AnimationClip("Run", 0.5, []));
    await preloadFixture(fixture);
    const scaled = copy(asset); scaled.model.scale = 0.8; scaled.model.clips.run = "Run"; scaled.model.locomotion = { walk: 1, run: 4 };
    const visual = createVisualAssetVisual(scaled); visual.scale.setScalar(0.5);
    const controller = createVisualAnimationController(visual);
    controller.play("walk", { fadeSeconds: 0 }); controller.setLocomotionSpeed(0.8);
    assert.equal(controller.active.getEffectiveTimeScale(), 2, "0.4-scale mesh needs twice the cycle rate to travel 0.8m/s");
    controller.update(0.1);
    assert.ok(visual.getObjectByName("tip").position.y > 1.19);
    controller.play("attack"); controller.setLocomotionSpeed(3);
    assert.equal(controller.active.getEffectiveTimeScale(), 1, "movement speed must not accelerate attack timing");
    assert.equal(controller.getLocomotionState(0.3), "walk");
    assert.equal(controller.getLocomotionState(1.6), "run", "fast instances use the dedicated run clip");
    controller.play("run"); controller.setLocomotionSpeed(1.6);
    assert.equal(controller.active.getEffectiveTimeScale(), 1, "authored run avoids a rapidly sped-up walk");
  });

  it("clones independently weighted skeletons and disposes only instance bone textures", async () => {
    const template = await preloadFixture();
    const first = createVisualAssetVisual(asset), second = createVisualAssetVisual(asset);
    const firstSkin = first.getObjectByName("fixtureSkin"), secondSkin = second.getObjectByName("fixtureSkin");
    const firstTip = first.getObjectByName("tip"), secondTip = second.getObjectByName("tip");
    assert.notEqual(firstSkin.skeleton, secondSkin.skeleton);
    assert.equal(firstSkin.geometry, template.source.geometry);
    const controller = createVisualAnimationController(first);
    controller.play("walk"); controller.update(0.5);
    assert.ok(firstTip.position.y > 1.4, "walk deforms only the first clone's skeleton");
    assert.equal(secondTip.position.y, 1, "poses do not leak across cloned skeletons");
    controller.play("attack", { restart: true });
    assert.equal(controller.active.loop, THREE.LoopOnce); assert.equal(controller.active.clampWhenFinished, true);
    firstSkin.skeleton.computeBoneTexture(); const boneTexture = firstSkin.skeleton.boneTexture;
    const ownedTintMaterial = firstSkin.material.clone(); ownedTintMaterial.userData.externalModelInstanceMaterial = true; firstSkin.material = ownedTintMaterial;
    let boneTextureDisposed = false, sharedGeometryDisposed = false, ownedMaterialDisposed = false, sharedTextureDisposed = false;
    boneTexture.addEventListener("dispose", () => { boneTextureDisposed = true; });
    template.source.geometry.addEventListener("dispose", () => { sharedGeometryDisposed = true; });
    ownedTintMaterial.addEventListener("dispose", () => { ownedMaterialDisposed = true; });
    getModelTemplate(asset.model.path).scene.getObjectByName("fixtureSkin").material.map.addEventListener("dispose", () => { sharedTextureDisposed = true; });
    assert.equal(disposeExternalModelInstance(first), true);
    assert.equal(controller.isDisposed, true); assert.equal(boneTextureDisposed, true); assert.equal(ownedMaterialDisposed, true); assert.equal(sharedGeometryDisposed, false); assert.equal(sharedTextureDisposed, false);
    assert.equal(secondSkin.geometry, template.source.geometry);
  });

  it("preloads the prepared Author source so a saved external preview stays synchronous", async () => {
    const repository = copy(WORLD_DATA); repository.visualAssets.push(copy(asset));
    const prepared = preparePersistedAuthorDraft(copy(repository), repository).data;
    await preloadVisualModels(prepared.visualAssets, { loader: { loadAsync: async () => createSkinnedTemplate() } });
    assert.doesNotThrow(() => createVisualAssetVisual(prepared.visualAssets.find((entry) => entry.id === asset.id)));
  });

  it("Author preview cleanup releases its skeleton while preserving a sibling preview", async () => {
    await preloadFixture();
    const first = createVisualAssetVisual(asset), second = createVisualAssetVisual(asset);
    const skin = first.getObjectByName("fixtureSkin"); skin.skeleton.computeBoneTexture();
    let released = false, sharedReleased = false;
    skin.skeleton.boneTexture.addEventListener("dispose", () => { released = true; });
    skin.geometry.addEventListener("dispose", () => { sharedReleased = true; });
    disposeObject3D(first);
    assert.equal(released, true); assert.equal(sharedReleased, false);
    assert.ok(second.getObjectByName("fixtureSkin").geometry.getAttribute("position"));
  });

  it("keeps external assets read-only in the primitive authoring actions", () => {
    const data = copy(WORLD_DATA); data.visualAssets.push(copy(asset));
    const result = createAuthorDraft(normalizeWorldData(data)).addAssetPart(asset.id, "box");
    assert.equal(result.ok, false); assert.match(result.error, /read-only/);
  });
});
