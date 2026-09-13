import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';
import { createExternalModelVisual, disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { createGroundCoverClusterGeometry } from '../presentation/groundFoliage.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';

const CANOPY_TRUNK = Object.freeze({ width: 1.1, height: 2.45, depth: 1.1 });
// The visible Fen monolith is 1.65m wide including its decorative feet. Keep
// its physical core narrow enough to match the stone rather than becoming a
// broad invisible obstacle around the moss and scattered foot pieces.
const FEN_STONE_CORE = Object.freeze({ width: .92, height: 2.15, depth: .78 });
export const FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE = 12.5;
const MAX_GROUND_CLUSTERS = 640;
const GROUND_CLUSTER_TRIANGLES = 16;
const BOX_INDICES = new Uint32Array([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6,
  2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4,
]);

function assetById(visualAssets, id) {
  if (visualAssets instanceof Map) return visualAssets.get(id) ?? null;
  return (visualAssets ?? []).find(asset => asset?.id === id) ?? null;
}

function finite(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967295;
}
function worldHash(value, world) {
  const salt = frontierDomainSeed(world, 'scenery-grass');
  return salt ? hash(`${value}:${salt}`) : hash(value);
}

function surfaceBox({ id, x, y, z, yaw, scale, size }) {
  const halfW = size.width * scale * .5;
  const halfD = size.depth * scale * .5;
  const top = y + size.height * scale;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const corners = [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]];
  const vertices = new Float32Array(8 * 3);
  for (let index = 0; index < 4; index++) {
    const [localX, localZ] = corners[index];
    const worldX = x + localX * cos + localZ * sin;
    const worldZ = z - localX * sin + localZ * cos;
    vertices.set([worldX, y, worldZ], index * 3);
    vertices.set([worldX, top, worldZ], (index + 4) * 3);
  }
  return { id, sectionId: 'camp', traversalSurface: 'scenery', origin: { x: 0, z: 0 }, vertices, indices: new Uint32Array(BOX_INDICES) };
}

function authoredPartGeometry(part) {
  const source = part?.geometry;
  if (part?.shape !== 'mesh' || !Array.isArray(source?.positions) || !Array.isArray(source?.indices)) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3));
  geometry.setIndex(source.indices);
  geometry.computeVertexNormals();
  const nonIndexed = geometry.toNonIndexed();
  geometry.dispose();
  return nonIndexed;
}

function partMatrix(part) {
  const position = part.position ?? {};
  const rotation = part.rotation ?? {};
  const scale = part.scale ?? {};
  return new THREE.Matrix4().compose(
    new THREE.Vector3(finite(position.x), finite(position.y), finite(position.z)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(finite(rotation.x), finite(rotation.y), finite(rotation.z), 'XYZ')),
    new THREE.Vector3(finite(scale.x, 1), finite(scale.y, 1), finite(scale.z, 1)),
  );
}

function placementMatrix(spec) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(finite(spec.x), finite(spec.y), finite(spec.z)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, finite(spec.yaw), 0, 'XYZ')),
    new THREE.Vector3(finite(spec.scale, 1), finite(spec.scale, 1), finite(spec.scale, 1)),
  );
}

function addVertexColor(geometry, color) {
  const value = new THREE.Color(color ?? '#ffffff');
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) colors.set([value.r, value.g, value.b], index * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Builds only the bounded, streamed presentation/collider payload. It owns no
 * residency, physics update, or terrain sampling; callers rebuild it from an
 * immutable spec list and submit terrainSurfaces through their existing owner.
 */
export function createFrontierSceneryVisual({ specs = [], visualAssets = [], getHeight, canPlaceGroundCover, world = DEFAULT_FRONTIER_WORLD } = {}) {
  const group = new THREE.Group();
  group.name = 'frontier_scenery';
  const terrainSurfaces = [];
  const canopyRoots = [];
  const lowAssetGeometries = new Map();
  const lowBatches = new Map();
  const lowMeshes = [];
  let canopyCount = 0;
  let lowCount = 0;
  let stoneSolidCount = 0;
  let groundClusterCount = 0;
  const heightAt = typeof getHeight === 'function' ? getHeight : null;
  const canPlace = typeof canPlaceGroundCover === 'function' ? canPlaceGroundCover : () => true;
  const groundGeometry = createGroundCoverClusterGeometry({ grass: '#86aa58' });
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: .92, metalness: 0, side: THREE.DoubleSide });
  const groundMesh = new THREE.InstancedMesh(groundGeometry, groundMaterial, MAX_GROUND_CLUSTERS);
  const groundDummy = new THREE.Object3D();
  let groundDisposed = false;
  groundMesh.name = 'frontier_scenery_ground_cover';
  groundMesh.castShadow = groundMesh.receiveShadow = true;

  function disposeGround() {
    if (groundDisposed) return;
    groundMesh.dispose();
    groundGeometry.dispose();
    groundMaterial.dispose();
    groundDisposed = true;
  }

  function geometryFor(asset) {
    if (lowAssetGeometries.has(asset)) return lowAssetGeometries.get(asset);
    const parts = [];
    try {
      for (const part of asset.parts) {
        const geometry = authoredPartGeometry(part);
        if (!geometry) continue;
        try {
          geometry.applyMatrix4(partMatrix(part));
          parts.push(addVertexColor(geometry, part.color));
        } catch (error) {
          geometry.dispose();
          throw error;
        }
      }
      const geometry = parts.length ? mergeGeometries(parts) : null;
      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        lowAssetGeometries.set(asset, geometry);
      }
      return geometry;
    } finally {
      parts.forEach(geometry => geometry.dispose());
    }
  }

  function disposeLowAssets() {
    lowMeshes.forEach(mesh => mesh.dispose());
    lowAssetGeometries.forEach(geometry => geometry.dispose());
    lowMeshes.length = 0;
    lowAssetGeometries.clear();
  }

  function addGroundClusters(spec, desiredCount) {
    const wet = spec.assetId.startsWith('asset_fen_');
    const staged = spec.id.includes(':stage-');
    const regional = spec.groundCover;
    const influence = Math.max(0, Math.min(1, finite(regional?.influence)));
    const dry = influence * Math.max(0, Math.min(1, finite(regional?.dryWeight)));
    const high = influence * Math.max(0, Math.min(1, finite(regional?.highWeight)));
    desiredCount = Math.max(0, Math.min(desiredCount, Math.round(desiredCount * finite(regional?.density, 1))));
    const patchRadius = spec.kind === 'canopy' ? 6 : 4.5;
    const attempts = desiredCount * 5;
    for (let index = 0, accepted = 0; index < attempts && accepted < desiredCount && groundClusterCount < MAX_GROUND_CLUSTERS; index++) {
      const seed = `${spec.id}:ground-cover:${index}`;
      const ring = index % 4;
      const angle = ((index / desiredCount) * Math.PI * 2) + (worldHash(`${seed}:angle`, world) - .5) * .48;
      const radius = patchRadius * ([.32, .56, .78, .98][ring] + (worldHash(`${seed}:radius`, world) - .5) * .1);
      const x = spec.x + Math.cos(angle) * radius;
      const z = spec.z + Math.sin(angle) * radius;
      if (!canPlace(x, z)) continue;
      const y = finite(heightAt?.(x, z), finite(spec.y));
      const scale = (wet ? .60 : .66) + worldHash(`${seed}:scale`, world) * .24;
      groundDummy.position.set(x, y, z);
      groundDummy.rotation.y = worldHash(`${seed}:yaw`, world) * Math.PI * 2;
      groundDummy.scale.setScalar(scale);
      groundDummy.updateMatrix();
      groundMesh.setMatrixAt(groundClusterCount, groundDummy.matrix);
      const tone = new THREE.Color(wet ? '#6d9872' : '#86aa58').lerp(new THREE.Color(staged ? '#b0c970' : '#759b69'), worldHash(`${seed}:tone`, world) * .28);
      // The existing geometry has its own green vertex color. Tint ratios
      // compensate that base to express straw/mineral grass in dry provinces.
      tone.r *= 1 + dry * 2.8 - high * .2;
      tone.g *= 1 + dry * .05 - high * .2;
      tone.b *= 1 - dry * .15 + high * .12;
      groundMesh.setColorAt(groundClusterCount, tone);
      groundClusterCount++; accepted++;
    }
  }

  try {
    for (const rawSpec of specs) {
      const spec = rawSpec ?? {};
      if (!spec.id || !spec.assetId || !Number.isFinite(spec.x) || !Number.isFinite(spec.y) || !Number.isFinite(spec.z)) continue;
      const asset = assetById(visualAssets, spec.assetId);
      const scale = finite(spec.scale, 1);
      const yaw = finite(spec.yaw);
      if (scale <= 0 || !asset) continue;

      if (spec.kind === 'canopy' && asset.model) {
        const root = createExternalModelVisual(asset);
        root.name = `frontier_scenery_${spec.id}`;
        root.position.set(spec.x, spec.y, spec.z);
        root.rotation.y = yaw;
        root.scale.setScalar(scale);
        group.add(root);
        canopyRoots.push(root);
        canopyCount++;
        const modelScale = finite(asset.model?.scale, 1) * scale;
        terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:trunk`, x: spec.x, y: spec.y, z: spec.z, yaw, scale: modelScale, size: CANOPY_TRUNK }));
        continue;
      }

      if (spec.kind !== 'low' || !asset.parts?.length) continue;
      if (!geometryFor(asset)) continue;
      const cellX = Math.floor(spec.x / FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE);
      const cellZ = Math.floor(spec.z / FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE);
      const renderCellId = `${cellX},${cellZ}`;
      const batchKey = `${renderCellId}\u0000${asset.id}`;
      if (!lowBatches.has(batchKey)) lowBatches.set(batchKey, { asset, renderCellId, specs: [] });
      lowBatches.get(batchKey).specs.push({ ...spec, scale, yaw });
      lowCount++;
      if (spec.assetId === 'asset_fen_stone') {
        terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:stone`, x: spec.x, y: spec.y, z: spec.z, yaw, scale, size: FEN_STONE_CORE }));
        stoneSolidCount++;
      }
    }
  } catch (error) {
    disposeLowAssets();
    for (const root of canopyRoots) disposeExternalModelInstance(root);
    disposeGround();
    group.clear();
    throw error;
  }

  const patchSpecs = [...specs].filter(spec => spec?.id && Number.isFinite(spec.x) && Number.isFinite(spec.z))
    .sort((a, b) => Number(b.id.includes(':stage-')) - Number(a.id.includes(':stage-'))
      || Number(a.id.startsWith('f2c:i:')) - Number(b.id.startsWith('f2c:i:'))
      || a.id.localeCompare(b.id));
  try {
    for (const spec of patchSpecs) addGroundClusters(spec, spec.id.includes(':stage-') ? 28 : 13);
    if (groundClusterCount) {
      groundMesh.count = groundClusterCount;
      groundMesh.instanceMatrix.needsUpdate = true;
      groundMesh.instanceColor.needsUpdate = true;
      group.add(groundMesh);
    }
  } catch (error) {
    disposeLowAssets();
    for (const root of canopyRoots) disposeExternalModelInstance(root);
    disposeGround();
    group.clear();
    throw error;
  }

  let lowMaterial = null;
  let lowTriangleCount = 0;
  if (lowBatches.size) {
    try {
      lowMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: .92, metalness: 0 });
      for (const { asset, renderCellId, specs: batchSpecs } of lowBatches.values()) {
        const geometry = lowAssetGeometries.get(asset);
        const mesh = new THREE.InstancedMesh(geometry, lowMaterial, batchSpecs.length);
        lowMeshes.push(mesh);
        mesh.name = 'frontier_scenery_low_props';
        mesh.userData.frontierScenery = { assetId: asset.id, renderCellId, specIds: batchSpecs.map(spec => spec.id) };
        mesh.castShadow = mesh.receiveShadow = true;
        for (let index = 0; index < batchSpecs.length; index++) mesh.setMatrixAt(index, placementMatrix(batchSpecs[index]));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        group.add(mesh);
        lowTriangleCount += geometry.getAttribute('position').count / 3 * batchSpecs.length;
      }
    } catch (error) {
      disposeLowAssets();
      lowMaterial?.dispose();
      for (const root of canopyRoots) disposeExternalModelInstance(root);
      disposeGround();
      group.clear();
      throw error;
    }
  }

  const stats = Object.freeze({
    canopyCount,
    lowCount,
    stoneSolidCount,
    surfaceCount: terrainSurfaces.length,
    lowDrawCount: lowMeshes.length,
    lowTriangleCount,
    lowGeometryCount: lowAssetGeometries.size,
    lowGeometryVertexCount: [...lowAssetGeometries.values()].reduce((sum, geometry) => sum + geometry.getAttribute('position').count, 0),
    lowInstanceCount: lowMeshes.reduce((sum, mesh) => sum + mesh.count, 0),
    groundDrawCount: groundClusterCount ? 1 : 0,
    groundClusterCount,
    groundClusterTriangleCount: groundClusterCount * GROUND_CLUSTER_TRIANGLES,
  });
  let disposed = false;
  return {
    group,
    terrainSurfaces,
    canopyRoots,
    stats,
    dispose() {
      if (disposed) return;
      for (const root of canopyRoots) disposeExternalModelInstance(root);
      disposeLowAssets();
      lowMaterial?.dispose();
      disposeGround();
      group.clear();
      disposed = true;
    },
  };
}
