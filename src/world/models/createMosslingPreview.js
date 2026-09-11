// Standalone Three.js preview factory for the Blender-authored Mossling.
// Intentionally not wired into production; visualFactory can adopt it after review.
import * as THREE from 'three';
import { MOSSLING_MESH_PARTS, MOSSLING_TRIANGLE_COUNT } from './mosslingMeshData.js';

export function createMosslingPreview() {
  const group = new THREE.Group();
  group.name = 'blender_authored_mossling';
  const materials = new Map();
  for (const part of MOSSLING_MESH_PARTS) {
    let material = materials.get(part.color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.94, metalness: 0, flatShading: true });
      materials.set(part.color, material);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.vertices, 3));
    geometry.setIndex(part.indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.triangles = MOSSLING_TRIANGLE_COUNT;
  group.userData.forward = '+Z';
  return group;
}
