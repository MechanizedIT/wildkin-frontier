// Runtime-only render reduction for static Visual Asset props.
//
// Authoring intentionally continues to use one editable mesh per recipe part.
// Play combines compatible opaque color-only materials through vertex colors
// under the same tagged prop root. Selection, transforms and occlusion retain
// that root; textures, skins and non-color material differences stay separate.

import * as THREE from "three";

function appendGeometry(target, mesh, relativeMatrix) {
  const position = mesh.geometry?.getAttribute("position");
  if (!position) return;
  const normal = mesh.geometry.getAttribute("normal");
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(relativeMatrix);
  const vertexOffset = target.positions.length / 3;
  const vertex = new THREE.Vector3();
  const transformedNormal = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index).applyMatrix4(relativeMatrix);
    target.positions.push(vertex.x, vertex.y, vertex.z);
    if (target.colors) {
      // Three material colors are already in linear working space. Copy those
      // values directly; converting to sRGB here would brighten the palette.
      const color = mesh.material.color;
      target.colors.push(color.r, color.g, color.b);
    }
    if (normal) {
      transformedNormal.fromBufferAttribute(normal, index).applyMatrix3(normalMatrix).normalize();
      target.normals.push(transformedNormal.x, transformedNormal.y, transformedNormal.z);
    } else {
      target.hasNormals = false;
    }
  }

  const indices = mesh.geometry.index;
  const mirrored = relativeMatrix.determinant() < 0;
  if (indices) {
    for (let index = 0; index < indices.count; index += 3) {
      const a = vertexOffset + indices.getX(index);
      const b = vertexOffset + indices.getX(index + 1);
      const c = vertexOffset + indices.getX(index + 2);
      target.indices.push(a, mirrored ? c : b, mirrored ? b : c);
    }
  } else {
    for (let index = 0; index < position.count; index += 3) {
      const a = vertexOffset + index;
      const b = vertexOffset + index + 1;
      const c = vertexOffset + index + 2;
      target.indices.push(a, mirrored ? c : b, mirrored ? b : c);
    }
  }
}

function paletteMaterialKey(material) {
  if (!material?.isMeshStandardMaterial || material.transparent || material.vertexColors
    || material.clippingPlanes?.length || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return null;
  if (Object.keys(material.defines ?? {}).some((name) => name !== 'STANDARD')) return null;
  // Serialization includes every supported non-color material property, so a
  // rough stone and a bright emissive detail cannot accidentally share a draw.
  const data = material.toJSON();
  for (const key of ['metadata', 'uuid', 'name', 'color', 'userData']) delete data[key];
  return JSON.stringify(data);
}

// Never changes serialized recipes or cached source buffers/materials.
export function mergeStaticPropVisual(root) {
  if (!root?.isObject3D) return { merged: false, meshCountBefore: 0, meshCountAfter: 0 };
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const byMaterial = new Map();
  const leaves = [];

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry || Array.isArray(object.material)) return;
    leaves.push(object);
  });
  const supportsMergedAttributes = (mesh) => Object.keys(mesh.geometry.attributes).every((name) => name === "position" || name === "normal");
  const hasTextureDependentMaterial = (material) => ["map", "alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap", "lightMap", "metalnessMap", "normalMap", "roughnessMap"].some((key) => material?.[key]);
  if (leaves.some((mesh) => mesh.isSkinnedMesh || !supportsMergedAttributes(mesh) || hasTextureDependentMaterial(mesh.material))) {
    return { merged: false, meshCountBefore: leaves.length, meshCountAfter: leaves.length };
  }
  for (const object of leaves) {
    const paletteKey = paletteMaterialKey(object.material);
    const key = paletteKey ?? object.material;
    const batch = byMaterial.get(key) ?? {
      material: object.material,
      positions: [],
      normals: [],
      indices: [],
      colors: paletteKey === null ? null : [],
      hasNormals: true,
    };
    const relativeMatrix = rootInverse.clone().multiply(object.matrixWorld);
    appendGeometry(batch, object, relativeMatrix);
    byMaterial.set(key, batch);
  }

  if (leaves.length < 2 || byMaterial.size >= leaves.length) {
    return { merged: false, meshCountBefore: leaves.length, meshCountAfter: leaves.length };
  }

  for (const mesh of leaves) mesh.parent?.remove(mesh);
  for (const batch of byMaterial.values()) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(batch.positions, 3));
    if (batch.hasNormals) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(batch.normals, 3));
    if (batch.colors) geometry.setAttribute("color", new THREE.Float32BufferAttribute(batch.colors, 3));
    geometry.setIndex(batch.indices);
    if (!batch.hasNormals) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.staticPropBatchGeometry = true;
    let material = batch.material;
    if (batch.colors) {
      material = batch.material.clone();
      material.color.setRGB(1, 1, 1);
      material.vertexColors = true;
      // This is owned by this runtime prop, not the shared authored cache.
      delete material.userData.isSharedAssetMaterial;
      material.userData.staticPropBatchMaterial = true;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "static_prop_material_batch";
    // Keep the asset identity available to runtime presentation diagnostics.
    // Part identity is deliberately root-owned after batching: a batch can
    // contain several editable recipe parts, while the play-only root remains
    // the selectable/occlusion unit.
    mesh.userData.staticPropBatch = true;
    mesh.userData.visualAssetId = root.userData.visualAssetId;
    mesh.userData.propId = root.userData.propId;
    root.add(mesh);
  }
  root.userData.staticPropBatch = true;
  root.userData.staticPropBatchMeshCountBefore = leaves.length;
  root.userData.staticPropBatchMeshCountAfter = byMaterial.size;
  return { merged: true, meshCountBefore: leaves.length, meshCountAfter: byMaterial.size };
}
