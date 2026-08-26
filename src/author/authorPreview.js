import * as THREE from "three";
import {
  applyVisualTransform,
  createVisual,
  getVisualRecipeKey,
  tagVisualRoot,
} from "../world/visualFactory.js";
import { getColliderCenter } from "../world/colliderDescriptor.js";
import {
  getAuthorVisualRef,
  getColliderDescriptor,
  readNormalizedTransform,
  resolveAuthorType,
} from "./authorTypeRegistry.js";

function visualOptions(found, normalized) {
  return {
    objectId: found.obj.id,
    mode: "author",
    size: normalized?.size ?? undefined,
    uniformScale: normalized?.uniformScale,
    poiType: found.collection === "pois" ? found.obj.type : undefined,
    subtype: found.obj.subtype,
    requires: found.obj.requires ?? null,
    visualAssets: found.visualAssets ?? [],
  };
}

export function disposeObject3D(root) {
  root.traverse((object) => {
    const geo = object.geometry;
    const isShared = geo?.userData?.isSharedAssetGeometry;
    if (geo && !isShared) geo.dispose?.();
    // Cached materials are also shared — do not dispose them; transient materials are disposed
    const mat = object.material;
    if (!mat) return;
    const isSharedMat = mat.userData?.isSharedAssetMaterial;
    if (Array.isArray(mat)) {
      for (const m of mat) if (!m.userData?.isSharedAssetMaterial) m.dispose?.();
    } else if (!isSharedMat) {
      // Heuristic: asset cached materials have roughness 0.82/metalness 0.05 exactly and flatShading; but we set flag now in visualFactory
      mat.dispose?.();
    }
  });
}

export function findAuthorVisualRoot(scene, id) {
  let result = null;
  scene.traverse((object) => {
    if (!result && object.userData?.authorVisualRoot && object.userData.authorId === id) result = object;
  });
  return result;
}

export function createAuthorVisual(found, mode = "author") {
  const definition = resolveAuthorType(found);
  const normalized = readNormalizedTransform(found);
  const visualRef = getAuthorVisualRef(found);
  if (!definition || !normalized || !visualRef) return null;
  const options = { ...visualOptions(found, normalized), mode };
  const recipeKey = getVisualRecipeKey(visualRef, options);
  const root = tagVisualRoot(createVisual(visualRef, options), {
    objectId: found.obj.id,
    visualRef,
    recipeKey,
  });
  root.name = found.obj.id;
  applyVisualTransform(root, normalized);
  return root;
}

export function syncAuthorVisual(scene, found, mode = "author") {
  const normalized = readNormalizedTransform(found);
  const visualRef = getAuthorVisualRef(found);
  if (!normalized || !visualRef) return null;
  const options = { ...visualOptions(found, normalized), mode };
  const recipeKey = getVisualRecipeKey(visualRef, options);
  let root = findAuthorVisualRoot(scene, found.obj.id);
  if (!root || root.userData.visualRecipeKey !== recipeKey) {
    if (root?.parent) {
      root.parent.remove(root);
      disposeObject3D(root);
    }
    root = createAuthorVisual(found, mode);
    if (!root) return null;
    scene.add(root);
  }
  applyVisualTransform(root, normalized);
  return root;
}

export function findEditProxies(scene, id) {
  const proxies = [];
  scene.traverse((object) => {
    if (object.userData?.isEditProxy && object.userData.proxyFor === id) proxies.push(object);
  });
  return proxies;
}

export function applyColliderProxyTransform(proxy, descriptor) {
  if (!descriptor || descriptor.shape !== "box") return proxy;
  const { width, height, depth } = descriptor.size;
  const params = proxy.geometry?.parameters;
  if (!params || Math.abs(params.width - width) > 1e-6 || Math.abs(params.height - height) > 1e-6 || Math.abs(params.depth - depth) > 1e-6) {
    proxy.geometry?.dispose?.();
    proxy.geometry = new THREE.BoxGeometry(width, height, depth);
  }
  const center = getColliderCenter(descriptor);
  proxy.position.set(center.x, center.y, center.z);
  proxy.rotation.y = descriptor.rotationY ?? 0;
  proxy.scale.set(1, 1, 1);
  return proxy;
}

export function syncEditProxy(scene, found, isEdit) {
  const descriptor = getColliderDescriptor(found);
  const visibleInPlay = found.obj.visibleInPlay !== false;
  const wanted = !!(
    descriptor?.enabled &&
    descriptor.shape === "box" &&
    descriptor.editProxy?.visibleWhenHidden &&
    !visibleInPlay
  );
  let proxies = findEditProxies(scene, found.obj.id);
  if (!wanted) {
    for (const proxy of proxies) {
      proxy.userData.authorProxyWanted = false;
      proxy.visible = false;
    }
    return proxies[0] ?? null;
  }
  let proxy = proxies.shift();
  for (const duplicate of proxies) {
    duplicate.parent?.remove(duplicate);
    disposeObject3D(duplicate);
  }
  if (!proxy) {
    proxy = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent: true, opacity: 0.42 }),
    );
    proxy.name = `${found.obj.id}__proxy`;
    proxy.userData.authorId = found.obj.id;
    proxy.userData.isEditProxy = true;
    proxy.userData.proxyFor = found.obj.id;
    scene.add(proxy);
  }
  applyColliderProxyTransform(proxy, descriptor);
  proxy.userData.authorProxyWanted = true;
  proxy.visible = !!isEdit;
  return proxy;
}

export function previewColliderDescriptor(found, normalized) {
  const descriptor = getColliderDescriptor(found);
  if (!descriptor || !normalized) return descriptor;
  return {
    ...descriptor,
    position: { ...normalized.position },
    rotationY: normalized.rotationY ?? descriptor.rotationY ?? 0,
  };
}
