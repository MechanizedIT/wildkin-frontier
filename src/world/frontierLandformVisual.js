import * as THREE from 'three';
import { createExternalModelVisual, disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { DEFAULT_FRONTIER_WORLD } from './frontierWorld.js';

const TERRACE_CHUNK = Object.freeze({ cx: 0, cz: -3, origin: Object.freeze({ x: 0, z: -150 }) });
const BUTTRESS_ID = 'asset_verdant_cliff_buttress';
const SKYBREAK_CHUNK = Object.freeze({ cx: 0, cz: -5, origin: Object.freeze({ x: 0, z: -250 }) });
// An embedded rock face, not a free-standing scenery placement. The base probe
// is the measured minimum of its full transformed hull footprint. Its lower
// portion joins the existing cliff; route and source footprints remain clear.
const SKYBREAK_ROCKS = Object.freeze([
  Object.freeze({ x: 20, z: -226, baseX: 19.3369, baseZ: -224.9900, scale: .65, yaw: .40 }),
]);
const IRONSPINE_CHUNK = Object.freeze({ cx: -42, cz: -64, origin: Object.freeze({ x: -2100, z: -3200 }) });
// The two adjacent members frame the Ironspine arrival lane. Their support
// probes are measured full-hull minima, so they must keep their explicit base
// coordinates and sample through the normal terrain-height path.
const IRONSPINE_ROCKS = Object.freeze([
  Object.freeze({ x: -2078, z: -3159, baseX: -2078.4716075, baseZ: -3160.01414625, scale: .65, yaw: Math.PI / 2 }),
  Object.freeze({ x: -2077, z: -3156, baseX: -2077.95701125, baseZ: -3156.54561, scale: .65, yaw: 0 }),
]);

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

function transformedHull(asset, spec, baseY, id, chunk) {
  const hull = asset.collision;
  const modelScale = Number.isFinite(asset.model?.scale) ? asset.model.scale : 1;
  const scale = modelScale * spec.scale;
  const cos = Math.cos(spec.yaw), sin = Math.sin(spec.yaw);
  const vertices = new Float32Array(hull.vertices.length);
  for (let index = 0; index < hull.vertices.length; index += 3) {
    const x = hull.vertices[index] * scale;
    const y = hull.vertices[index + 1] * scale;
    const z = hull.vertices[index + 2] * scale;
    vertices[index] = spec.x - chunk.origin.x + x * cos + z * sin;
    vertices[index + 1] = baseY + y;
    vertices[index + 2] = spec.z - chunk.origin.z - x * sin + z * cos;
  }
  return {
    id,
    traversalSurface: 'rock',
    sectionId: 'camp',
    origin: { ...chunk.origin },
    vertices,
    indices: new Uint32Array(hull.indices),
  };
}

/**
 * Creates fixed visual/collision rock faces for Terrace, Skybreak, and Ironspine.
 * Group and hull x/z coordinates are chunk-local. The parent chunk transform
 * and Rapier's surface origin supply the same world translation.
 */
export function createFrontierLandformVisual({ cx, cz, visualAssets, getHeight, world = DEFAULT_FRONTIER_WORLD } = {}) {
  const group = new THREE.Group();
  group.name = `frontier_landform_${cx},${cz}`;
  group.userData.frontierLandformRockCount = 0;
  const terrainSurfaces = [];
  const isTerrace = cx === TERRACE_CHUNK.cx && cz === TERRACE_CHUNK.cz;
  const isSkybreak = cx === SKYBREAK_CHUNK.cx && cz === SKYBREAK_CHUNK.cz
    && world?.edition === DEFAULT_FRONTIER_WORLD.edition && world?.seed === DEFAULT_FRONTIER_WORLD.seed;
  const isIronspine = cx === IRONSPINE_CHUNK.cx && cz === IRONSPINE_CHUNK.cz
    && world?.edition === DEFAULT_FRONTIER_WORLD.edition && world?.seed === DEFAULT_FRONTIER_WORLD.seed;
  if (!isTerrace && !isSkybreak && !isIronspine) {
    return { group, terrainSurfaces, debugCount: 0, dispose() { group.clear(); } };
  }

  const asset = assetById(visualAssets, BUTTRESS_ID);
  const chunk = isTerrace ? TERRACE_CHUNK : (isSkybreak ? SKYBREAK_CHUNK : IRONSPINE_CHUNK);
  const recipe = isTerrace ? ROCKS : (isSkybreak ? SKYBREAK_ROCKS : IRONSPINE_ROCKS);
  const name = isTerrace ? 'terrace' : (isSkybreak ? 'skybreak' : 'ironspine');
  const heightAt = typeof getHeight === 'function' ? getHeight : () => 0;
  const instances = [];
  if (asset?.model && asset?.collision?.shape === 'convexHull') {
    recipe.forEach((spec, index) => {
      const baseX = spec.baseX ?? spec.x;
      const baseZ = spec.baseZ ?? spec.z;
      const sampledHeight = heightAt(baseX, baseZ);
      const baseY = Number.isFinite(sampledHeight) ? sampledHeight : 0;
      const visual = createExternalModelVisual(asset);
      visual.name = `${name}_rock_${index}`;
      visual.position.set(spec.x - chunk.origin.x, baseY, spec.z - chunk.origin.z);
      visual.rotation.y = spec.yaw;
      visual.scale.setScalar(spec.scale);
      group.add(visual);
      instances.push(visual);
      terrainSurfaces.push(transformedHull(asset, spec, baseY, `${cx},${cz}:${name}:rock:${index}`, chunk));
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
