import * as THREE from 'three';

const rounded = (value, digits = 4) => Number(value.toFixed(digits));

// Both world authoring and focused rebakes use this exact serialization path.
// Bake the complete linear transform into vertices: decomposing a rotated
// child beneath a nonuniform parent loses shear. Keep the part's useful pivot.
export function meshRecipePart(id, mesh) {
  mesh.updateWorldMatrix(true, false);
  const pivot = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
  const linear = mesh.matrixWorld.clone().setPosition(0, 0, 0);
  const geometry = mesh.geometry.clone().applyMatrix4(linear);
  const positions = geometry.getAttribute('position');
  const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({length: positions.count}, (_, i) => i);
  // Mirrored parents flip Three's front-face state; flattened recipes need
  // the equivalent winding so the same outside faces remain visible.
  if (linear.determinant() < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const part = {
    id, shape: 'mesh',
    geometry: {positions: Array.from(positions.array, value => rounded(value)), indices},
    position: {x: rounded(pivot.x), y: rounded(pivot.y), z: rounded(pivot.z)},
    rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1},
    color: mesh.material?.color ? `#${mesh.material.color.getHexString()}` : '#ffffff',
    flatShading: Boolean(mesh.material?.flatShading),
    roughness: Number.isFinite(mesh.material?.roughness) ? rounded(mesh.material.roughness, 3) : undefined,
    side: mesh.material?.side,
  };
  geometry.dispose();
  return part;
}
