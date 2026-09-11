import * as THREE from "three";
import { disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";
import {
  applyVisualTransform,
  createVisual,
  getVisualRecipeKey,
  tagVisualRoot,
} from "../world/visualFactory.js";
import { describeVisualAssetCollider, getColliderCenter } from "../world/colliderDescriptor.js";
import {
  getAuthorVisualRef,
  getAuthorVisualRole,
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
    triggerRadius: found.obj.triggerRadius,
    powerPreset: found.obj.powerPreset,
    markerKind: found.type === "parkourCheckpoint" ? "checkpoint" : found.type === "parkourEnd" ? "end" : found.type === "parkourStart" ? "start" : undefined,
    visualAssets: found.visualAssets ?? [],
  };
}

function addEditorHelperLabel(root, found, normalized) {
  if (typeof document === "undefined") return;
  const label = found.obj.courseId ? `${found.type}: ${found.obj.courseId}` : found.type;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 72;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "rgba(10,14,22,0.86)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "bold 24px system-ui";
  context.fillText(label, 14, 46);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(0, Math.max(1.7, (normalized?.size?.height ?? 0) + 0.35), 0);
  sprite.scale.set(3.8, 0.54, 1);
  sprite.renderOrder = 1000;
  sprite.userData.authorHelperLabel = true;
  root.add(sprite);
}

export function disposeObject3D(root) {
  if (disposeExternalModelInstance(root)) return;
  root.traverse((object) => {
    const geo = object.geometry;
    const isShared = geo?.userData?.isSharedAssetGeometry;
    if (geo && !isShared) geo.dispose?.();
    // Cached materials are also shared — do not dispose them; transient materials are disposed
    const mat = object.material;
    if (!mat) return;
    const isSharedMat = mat.userData?.isSharedAssetMaterial;
    if (Array.isArray(mat)) {
      for (const m of mat) if (!m.userData?.isSharedAssetMaterial) { m.map?.dispose?.(); m.dispose?.(); }
    } else if (!isSharedMat) {
      // Heuristic: asset cached materials have roughness 0.82/metalness 0.05 exactly and flatShading; but we set flag now in visualFactory
      mat.map?.dispose?.();
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
  const visualRole = getAuthorVisualRole(found);
  root.userData.authorVisualRole = visualRole;
  root.userData.editorHelperOnly = visualRole === "editorHelperOnly";
  if (found.obj.courseId) root.userData.courseId = found.obj.courseId;
  if (root.userData.editorHelperOnly) addEditorHelperLabel(root, found, normalized);
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
  if (!descriptor || !['box', 'convexHull'].includes(descriptor.shape)) return proxy;
  if (descriptor.shape === 'convexHull') {
    const key = JSON.stringify([descriptor.vertices, descriptor.indices]);
    if (proxy.geometry?.userData?.colliderKey !== key) {
      proxy.geometry?.dispose?.();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(descriptor.vertices, 3));
      geometry.setIndex(descriptor.indices);geometry.computeBoundingSphere();
      geometry.userData.colliderKey = key;proxy.geometry = geometry;
    }
  } else {
    const { width, height, depth } = descriptor.size;
    const params = proxy.geometry?.parameters;
    if (!params || Math.abs(params.width - width) > 1e-6 || Math.abs(params.height - height) > 1e-6 || Math.abs(params.depth - depth) > 1e-6) {
      proxy.geometry?.dispose?.();
      proxy.geometry = new THREE.BoxGeometry(width, height, depth);
    }
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
    ['box', 'convexHull'].includes(descriptor.shape) &&
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
  const asset = found.visualAssets?.find(entry=>entry.id===found.obj.visualAssetId);
  if (asset?.collision && ['box','convexHull'].includes(descriptor.shape)) {
    return describeVisualAssetCollider({collision:asset.collision, enabled:descriptor.enabled,
      position:normalized.position ?? descriptor.position,
      rotationY:normalized.rotationY ?? descriptor.rotationY,
      uniformScale:normalized.uniformScale ?? found.obj.uniformScale ?? 1});
  }
  return {
    ...descriptor,
    position: { ...normalized.position },
    rotationY: normalized.rotationY ?? descriptor.rotationY ?? 0,
  };
}
