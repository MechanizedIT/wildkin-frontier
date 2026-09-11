// Local GLB template cache for authored Visual Assets.
// Templates are loaded during bootstrap; callers only ever clone cached data.

import * as THREE from "three";
import { GLTFLoader } from "../../vendor/addons/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/addons/SkeletonUtils.js";

const templates = new Map();
const pendingLoads = new Map();

function normalizeTemplateMaterials(scene) {
  const materialCache = new WeakMap();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const isMultiMaterial = Array.isArray(object.material);
    const source = isMultiMaterial ? object.material : [object.material];
    const normalized = source.map((material) => {
      if (materialCache.has(material)) return materialCache.get(material);
      // Model sources commonly use PBR defaults. The game deliberately uses a
      // matte Lambert response while retaining the artist's base-color texture.
      const next = new THREE.MeshLambertMaterial({
        color: material.color?.clone() ?? new THREE.Color(0xffffff),
        map: material.map ?? null,
        alphaMap: material.alphaMap ?? null,
        emissive: material.emissive?.clone() ?? new THREE.Color(0x000000),
        emissiveMap: material.emissiveMap ?? null,
        opacity: material.opacity ?? 1,
        transparent: material.transparent ?? false,
        alphaTest: material.alphaTest ?? 0,
        side: material.side,
        vertexColors: material.vertexColors ?? false,
        flatShading: true,
      });
      if (next.map) next.map.colorSpace = THREE.SRGBColorSpace;
      if (next.emissiveMap) next.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      next.userData = { ...next.userData, sharedExternalModelMaterial: true };
      materialCache.set(material, next);
      return next;
    });
    object.material = isMultiMaterial ? normalized : normalized[0];
  });
}

function requireModel(asset) {
  if (!asset?.model) throw new Error("Visual Asset model descriptor is required");
  return asset.model;
}

export function getModelTemplate(path) {
  return templates.get(path) ?? null;
}

function createLocalLoader(loader) {
  if (loader) return loader;
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    const base = new URL(globalThis.location?.href ?? "file:///");
    const resolved = new URL(url, base);
    if (resolved.origin !== base.origin) throw new Error(`External model resource is not local: ${url}`);
    return resolved.href;
  });
  return new GLTFLoader(manager);
}

export async function preloadVisualModels(visualAssets = [], { loader: providedLoader, baseUrl } = {}) {
  const descriptors = visualAssets.filter((asset) => asset?.model);
  const loader = createLocalLoader(providedLoader);
  await Promise.all(descriptors.map(async (asset) => {
    const { path } = requireModel(asset);
    if (templates.has(path)) return;
    let pending = pendingLoads.get(path);
    if (!pending) {
      const sourceUrl = baseUrl ? new URL(path, baseUrl).href : `./${path}`;
      pending = loader.loadAsync(sourceUrl).then((gltf) => {
        normalizeTemplateMaterials(gltf.scene);
        const template = { scene: gltf.scene, animations: gltf.animations ?? [] };
        templates.set(path, template);
        return template;
      });
      pendingLoads.set(path, pending);
    }
    try {
      await pending;
    } catch (error) {
      // A retry may be valid after a local asset is repaired; never cache a
      // failed request as a permanent template.
      if (pendingLoads.get(path) === pending) pendingLoads.delete(path);
      throw error;
    }
  }));
}

export function createExternalModelVisual(asset) {
  const descriptor = requireModel(asset);
  const template = templates.get(descriptor.path);
  if (!template) throw new Error(`External model ${descriptor.path} was not preloaded`);
  const root = new THREE.Group();
  const instance = cloneSkeleton(template.scene);
  const pivot = descriptor.pivot ?? { x: 0, y: 0, z: 0 };
  instance.position.set(pivot.x ?? 0, pivot.y ?? 0, pivot.z ?? 0);
  instance.scale.setScalar(descriptor.scale ?? 1);
  root.add(instance);
  root.userData.externalModelInstance = true;
  root.userData.externalModelPath = descriptor.path;
  root.userData.modelAnimationClips = template.animations;
  root.userData.modelClipNames = { ...(descriptor.clips ?? {}) };
  root.userData.modelLocomotionSpeeds = { ...(descriptor.locomotion ?? {}) };
  root.userData.modelScale = descriptor.scale ?? 1;
  return root;
}

export function createVisualAnimationController(root) {
  const clips = root?.userData?.modelAnimationClips;
  if (!clips?.length) return null;
  const mixer = new THREE.AnimationMixer(root);
  const mapped = root.userData.modelClipNames ?? {};
  const authoredSpeeds = root.userData.modelLocomotionSpeeds ?? {};
  const worldScale = new THREE.Vector3();
  const actions = new Map();
  for (const [state, clipName] of Object.entries(mapped)) {
    const clip = clips.find((entry) => entry.name === clipName);
    if (clip) actions.set(state, mixer.clipAction(clip));
  }
  let active = null;
  let activeState = null;
  let disposed = false;
  function play(state, { fadeSeconds = 0.14, restart = false } = {}) {
    const next = actions.get(state) ?? actions.get("idle") ?? null;
    if (!next) return;
    const oneShot = ["attack", "hurt", "jump", "dodge", "mantle"].includes(state);
    next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
    next.clampWhenFinished = oneShot;
    if (next === active && !restart) return;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (active && active !== next) active.crossFadeTo(next, fadeSeconds, false);
    active = next;
    activeState = state;
  }
  play("idle", { fadeSeconds: 0 });
  const controller = {
    play,
    getLocomotionState(speed) {
      if (!actions.has("run") || !(authoredSpeeds.walk > 0)) return "walk";
      root.getWorldScale(worldScale);
      const scale = Math.abs(worldScale.x * root.userData.modelScale);
      return speed > authoredSpeeds.walk * scale * 1.6 ? "run" : "walk";
    },
    setLocomotionSpeed(speed) {
      const authored = authoredSpeeds[activeState];
      if (!active || !(authored > 0) || !Number.isFinite(speed)) return;
      root.getWorldScale(worldScale);
      const scale = Math.abs(worldScale.x * root.userData.modelScale);
      active.setEffectiveTimeScale(scale > 0.001 ? Math.max(0, speed) / (authored * scale) : 0);
    },
    update(dt) { mixer.update(dt); },
    stop() { mixer.stopAllAction(); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); disposed = true; },
    get active() { return active; },
    get activeState() { return activeState; },
    get isDisposed() { return disposed; },
  };
  root.userData.modelAnimationController = controller;
  return controller;
}

// External instances borrow cached template buffers/materials/textures. Removing
// their scene graph must not dispose those shared resources.
export function disposeExternalModelInstance(root) {
  if (!root?.userData?.externalModelInstance) return false;
  root.userData.modelAnimationController?.dispose?.();
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) {
      if (material.userData?.externalModelInstanceMaterial) material.dispose?.();
    }
    if (!object.isSkinnedMesh || !object.skeleton?.boneTexture) return;
    object.skeleton.boneTexture.dispose?.();
    object.skeleton.boneTexture = null;
  });
  root.removeFromParent();
  root.clear();
  return true;
}

export function clearModelAssetCacheForTests() { templates.clear(); pendingLoads.clear(); }
export function registerModelTemplateForTests(path, template) { templates.set(path, template); }
