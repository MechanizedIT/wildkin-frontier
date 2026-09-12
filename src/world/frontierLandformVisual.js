import * as THREE from 'three';
import { createExternalModelVisual, disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';

const TERRACE_CHUNK = Object.freeze({ cx: 0, cz: -3, origin: Object.freeze({ x: 0, z: -150 }) });
const BUTTRESS_ID = 'asset_verdant_cliff_buttress';

// The accepted buttress is about 4m high at unit scale, with its detailed face
// toward local +Z. Each south instance is tucked into the 3m terrain face so
// its detailed face breaks the cliff silhouette, with a matching hull. East instances use that same face
// with a +90 degree yaw. The omitted 30.5..33.5 range is the deliberate fall gap.
const ROCKS = Object.freeze([
  Object.freeze({ x: 29.0, z: -123.65, baseZ: -122.75, scale: .80, yaw: 0 }),
  Object.freeze({ x: 35.0, z: -123.65, baseZ: -122.75, scale: .80, yaw: .03 }),
  Object.freeze({ x: 38.2, z: -123.70, baseZ: -122.75, scale: .79, yaw: -.07 }),
  Object.freeze({ x: 40.5, z: -123.70, baseZ: -122.75, scale: .78, yaw: .05 }),
  Object.freeze({ x: 42.20, z: -142.2, baseX: 43.16, scale: .76, yaw: Math.PI / 2 }),
  Object.freeze({ x: 42.20, z: -133.1, baseX: 43.16, scale: .72, yaw: Math.PI / 2 + .06 }),
]);

function assetById(visualAssets, id) {
  if (visualAssets instanceof Map) return visualAssets.get(id) ?? null;
  return (visualAssets ?? []).find((asset) => asset?.id === id) ?? null;
}

function transformedHull(asset, spec, baseY, id) {
  const hull = asset.collision;
  const modelScale = Number.isFinite(asset.model?.scale) ? asset.model.scale : 1;
  const scale = modelScale * spec.scale;
  const cos = Math.cos(spec.yaw), sin = Math.sin(spec.yaw);
  const vertices = new Float32Array(hull.vertices.length);
  for (let index = 0; index < hull.vertices.length; index += 3) {
    const x = hull.vertices[index] * scale;
    const y = hull.vertices[index + 1] * scale;
    const z = hull.vertices[index + 2] * scale;
    vertices[index] = spec.x - TERRACE_CHUNK.origin.x + x * cos + z * sin;
    vertices[index + 1] = baseY + y;
    vertices[index + 2] = spec.z - TERRACE_CHUNK.origin.z - x * sin + z * cos;
  }
  return {
    id,
    sectionId: 'camp',
    origin: { ...TERRACE_CHUNK.origin },
    vertices,
    indices: new Uint32Array(hull.indices),
  };
}

/**
 * Creates the bounded visual/collision dressing for the Rocky Terrace only.
 * Group and hull x/z coordinates are chunk-local. The parent chunk transform
 * and Rapier's surface origin supply the same world translation.
 */
export function createFrontierLandformVisual({ cx, cz, visualAssets, getHeight } = {}) {
  const group = new THREE.Group();
  group.name = `frontier_landform_${cx},${cz}`;
  group.userData.frontierLandformRockCount = 0;
  const terrainSurfaces = [];
  const isTerrace = cx === TERRACE_CHUNK.cx && cz === TERRACE_CHUNK.cz;
  if (!isTerrace) {
    return { group, terrainSurfaces, debugCount: 0, dispose() { group.clear(); } };
  }

  const asset = assetById(visualAssets, BUTTRESS_ID);
  const heightAt = typeof getHeight === 'function' ? getHeight : () => 0;
  const instances = [];
  if (asset?.model && asset?.collision?.shape === 'convexHull') {
    ROCKS.forEach((spec, index) => {
      const baseX = spec.baseX ?? spec.x;
      const baseZ = spec.baseZ ?? spec.z;
      const sampledHeight = heightAt(baseX, baseZ);
      const baseY = Number.isFinite(sampledHeight) ? sampledHeight : 0;
      const visual = createExternalModelVisual(asset);
      visual.name = `terrace_rock_${index}`;
      visual.position.set(spec.x - TERRACE_CHUNK.origin.x, baseY, spec.z - TERRACE_CHUNK.origin.z);
      visual.rotation.y = spec.yaw;
      visual.scale.setScalar(spec.scale);
      group.add(visual);
      instances.push(visual);
      terrainSurfaces.push(transformedHull(asset, spec, baseY, `${cx},${cz}:terrace:rock:${index}`));
    });
  }
  group.userData.frontierLandformRockCount = instances.length;
  let disposed = false;
  return {
    group,
    terrainSurfaces,
    debugCount: instances.length,
    dispose() {
      if (disposed) return;
      for (const visual of instances) disposeExternalModelInstance(visual);
      group.clear();
      disposed = true;
    },
  };
}
