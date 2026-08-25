// src/resources/createResourceNode.js — resource lifecycle wrapper around shared VisualFactory output
import * as THREE from "three";
import { RESOURCE_TYPES } from "./resourceConfig.js";
import {
  applyVisualTransform,
  createVisual,
  getVisualRecipeKey,
  tagVisualRoot,
} from "../world/visualFactory.js";

function createRemnant(typeId, feedbackProfile = typeId, remnantVisualAsset = null, visualAssets = []) {
  if (remnantVisualAsset) {
    const remnant = createVisual(
      { kind: "asset", id: remnantVisualAsset.id },
      { objectId: `${remnantVisualAsset.id}_remnant`, visualAssets },
    );
    remnant.name = "customRemnant";
    return remnant;
  }
  if (typeId === "tree" || feedbackProfile === "wood") {
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40, 0.44, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3a1a, flatShading: true }),
    );
    stump.position.y = 0.11;
    stump.name = "stump";
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.03, 9),
      new THREE.MeshStandardMaterial({ color: 0xc9a86a }),
    );
    ring.position.y = 0.11;
    ring.name = "stumpRing";
    stump.add(ring);
    return stump;
  }
  if (typeId === "rock" || feedbackProfile === "stone") {
    const rubble = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.20, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x7a7a7a, flatShading: true }),
    );
    rubble.position.y = 0.10;
    rubble.name = "rubble";
    const pebblePositions = [[-0.22, -0.16], [0.19, -0.08], [0.05, 0.24]];
    for (const [x, z] of pebblePositions) {
      const pebble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({ color: 0x9a9a9a }),
      );
      pebble.position.set(x, 0.12, z);
      rubble.add(pebble);
    }
    return rubble;
  }
  const patch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.06, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a6a3a, flatShading: true }),
  );
  patch.position.y = 0.03;
  patch.name = "cutPatch";
  for (let i = 0; i < 4; i++) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.18, 4),
      new THREE.MeshStandardMaterial({ color: 0x7ab87a }),
    );
    const angle = (i / 4) * Math.PI * 2;
    stem.position.set(Math.cos(angle) * 0.18, 0.09, Math.sin(angle) * 0.18);
    patch.add(stem);
  }
  return patch;
}

export function createResourceNode(typeId, position, index = 0, objectId = null, transform = {}) {
  const type = transform.resourceType ?? RESOURCE_TYPES[typeId];
  if (!type) throw new Error(`Unknown resource type ${typeId}`);

  const id = objectId ?? `${typeId}_${index}`;
  const rotationY = transform.rotationY ?? 0;
  const uniformScale = transform.uniformScale ?? 1;
  const visualAsset = transform.visualAsset ?? type.visualAsset ?? null;
  const remnantVisualAsset = transform.remnantVisualAsset ?? type.remnantVisualAsset ?? null;
  const visualAssets = [visualAsset, remnantVisualAsset].filter(Boolean);
  const visualRef = visualAsset
    ? { kind: "asset", id: visualAsset.id }
    : { kind: "builtin", id: `resource/${typeId}` };
  const visualOptions = { objectId: id, visualAssets: visualAssets.length ? visualAssets : undefined };
  const group = tagVisualRoot(new THREE.Group(), {
    objectId: id,
    visualRef,
    recipeKey: getVisualRecipeKey(visualRef, visualOptions),
  });
  group.name = `resource_${typeId}_${index}`;
  applyVisualTransform(group, {
    position: { x: position.x, y: position.y ?? 0, z: position.z },
    rotationY,
    uniformScale,
    sizeMode: "uniform",
  });

  const state = {
    id,
    typeId: type.id,
    resourceId: type.resourceId,
    maxChunks: type.maxChunks,
    remainingChunks: type.maxChunks,
    nodeState: "READY",
    respawnRemaining: 0,
    position: { x: position.x, y: position.y ?? 0, z: position.z },
    rotationY,
    uniformScale,
  };

  const visualRoot = createVisual(visualRef, visualOptions);
  visualRoot.name = "resourceReadyVisual";
  group.add(visualRoot);
  const chunkMeshes = [];
  visualRoot.traverse((object) => {
    if (!object.isMesh) return;
    if (visualAsset || object.name.includes("_chunk_") || object.name.includes("_tuft_")) chunkMeshes.push(object);
  });

  const originalChunkTransforms = chunkMeshes.map((mesh) => ({
    pos: mesh.position.clone(),
    scale: mesh.scale.clone(),
    rot: mesh.rotation.clone(),
    opacity: mesh.material?.opacity ?? 1,
    transparent: mesh.material?.transparent ?? false,
  }));
  const visualRootBaseScale = visualRoot.scale.clone();
  const visualRootBaseRotation = visualRoot.rotation.clone();

  const remnantMesh = createRemnant(typeId, type.feedbackProfile, remnantVisualAsset, visualAssets);
  remnantMesh.visible = false;
  group.add(remnantMesh);

  const haloGeo = new THREE.RingGeometry(0.72, 0.90, 24);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMesh = new THREE.Mesh(
    haloGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  haloMesh.position.y = 0.02;
  haloMesh.visible = false;
  haloMesh.name = "halo";
  group.add(haloMesh);

  const respawnGroup = new THREE.Group();
  respawnGroup.name = "respawnProgress";
  respawnGroup.visible = false;
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.025, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    );
    tick.position.set(Math.cos(angle) * 0.72, 0.04, Math.sin(angle) * 0.72);
    tick.rotation.y = -angle;
    tick.visible = false;
    respawnGroup.add(tick);
    ticks.push(tick);
  }
  const bgRingGeo = new THREE.RingGeometry(0.70, 0.74, 24);
  bgRingGeo.rotateX(-Math.PI / 2);
  const bgRing = new THREE.Mesh(
    bgRingGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  bgRing.position.y = 0.025;
  bgRing.name = "respawnBg";
  respawnGroup.add(bgRing);
  group.add(respawnGroup);

  Object.assign(group.userData, {
    resourceState: state,
    resourceType: type,
    chunkMeshes,
    remnantMesh,
    haloMesh,
    respawnGroup,
    respawnTicks: ticks,
    mainVisual: visualRoot,
    originalChunkTransforms,
    visualRootBaseScale,
    visualRootBaseRotation,
  });

  return {
    group, state, type, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks,
    mainVisual: visualRoot, visualRoot, originalChunkTransforms,
    visualRootBaseScale, visualRootBaseRotation,
  };
}

export function hideOneChunk(node) {
  for (let i = node.chunkMeshes.length - 1; i >= 0; i--) {
    if (node.chunkMeshes[i].visible) {
      node.chunkMeshes[i].visible = false;
      return node.chunkMeshes[i];
    }
  }
  return null;
}

export function showAllChunks(node) {
  for (let index = 0; index < node.chunkMeshes.length; index++) {
    const mesh = node.chunkMeshes[index];
    const original = node.originalChunkTransforms?.[index]
      ?? node.group?.userData?.originalChunkTransforms?.[index];
    mesh.visible = true;
    if (original) {
      mesh.position.copy(original.pos);
      mesh.scale.copy(original.scale);
      mesh.rotation.copy(original.rot);
      if (mesh.material) {
        mesh.material.transparent = original.transparent;
        mesh.material.opacity = original.opacity;
      }
    } else if (mesh.material) {
      mesh.material.transparent = false;
      mesh.material.opacity = 1;
    }
  }
}
