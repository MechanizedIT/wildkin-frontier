import * as THREE from 'three';
import { disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { createVisualAssetVisual } from './visualFactory.js';

const BOX_INDICES = new Uint32Array([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6,
  2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4,
]);

function collisionSurface(id, asset, position, rotationY = 0) {
  const collision = asset?.collision;
  if (collision?.shape !== 'box') throw new Error(`Signal Cache asset ${asset?.id ?? 'unknown'} needs box collision`);
  const size = collision.size, offset = collision.offset ?? {};
  const hx = size.w / 2, hy = size.h / 2, hz = size.d / 2;
  const ox = offset.x ?? 0, oy = offset.y ?? hy, oz = offset.z ?? 0;
  const cos = Math.cos(rotationY), sin = Math.sin(rotationY);
  const centerX = position.x + ox * cos + oz * sin;
  const centerZ = position.z - ox * sin + oz * cos;
  const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  const vertices = new Float32Array(8 * 3);
  for (let index = 0; index < corners.length; index++) {
    const [x, z] = corners[index];
    const worldX = centerX + x * cos + z * sin;
    const worldZ = centerZ - x * sin + z * cos;
    vertices.set([worldX, position.y + oy - hy, worldZ], index * 3);
    vertices.set([worldX, position.y + oy + hy, worldZ], (index + 4) * 3);
  }
  return { id, sectionId: 'camp', traversalSurface: 'scenery', origin: { x: 0, z: 0 }, vertices, indices: new Uint32Array(BOX_INDICES) };
}

function disposeVisualRoot(root) {
  if (!disposeExternalModelInstance(root)) root?.clear?.();
}

export function createFrontierDiscoveryVisual({ discovery, visualAssets = [] } = {}) {
  const receiverAsset = visualAssets.find(asset => asset?.id === discovery?.receiverAssetId);
  const chestAsset = visualAssets.find(asset => asset?.id === discovery?.visualAssetId);
  if (!receiverAsset || !chestAsset) throw new Error('Signal Cache visual assets missing');
  const group = new THREE.Group();
  group.name = `frontier_discovery_${discovery.id}`;
  group.position.set(discovery.landmarkPos.x, discovery.landmarkPos.y, discovery.landmarkPos.z);
  const receiverRoot = createVisualAssetVisual(receiverAsset);
  receiverRoot.name = `${discovery.id}:receiver`;
  receiverRoot.rotation.y = discovery.rotY ?? 0;
  group.add(receiverRoot);
  const chestRoot = createVisualAssetVisual(chestAsset);
  chestRoot.name = discovery.id;
  chestRoot.rotation.y = discovery.rotY ?? 0;
  chestRoot.position.set(
    discovery.pos.x - discovery.landmarkPos.x,
    discovery.pos.y - discovery.landmarkPos.y,
    discovery.pos.z - discovery.landmarkPos.z,
  );
  group.add(chestRoot);
  const terrainSurfaces = [
    collisionSurface(`${discovery.id}:receiver`, receiverAsset, discovery.landmarkPos, discovery.rotY),
    collisionSurface(`${discovery.id}:chest`, chestAsset, discovery.pos, discovery.rotY),
  ];
  let disposed = false;
  return { group, chestRoot, receiverRoot, terrainSurfaces, dispose() {
    if (disposed) return;
    disposeVisualRoot(receiverRoot);
    disposeVisualRoot(chestRoot);
    group.clear();
    disposed = true;
  } };
}

/** Streams the fixed discovery with terrain residency; save and reward state stay in existing owners. */
export function createFrontierDiscoveryRuntime({
  parent, terrainRuntime, physicsWorld, lootRegistry, discoveries = [], visualAssets = [],
  registerLootMechanism = () => {}, unregisterLootMechanism = () => {},
  onVisualAdded = () => {}, onVisualRemoving = () => {}, onGeometryChanged = () => {},
  createVisual = createFrontierDiscoveryVisual,
} = {}) {
  let lastResidency = null, resident = null, visual = null, disposed = false;

  function retire(removePhysics = true) {
    if (!resident || !visual) return;
    if (removePhysics) physicsWorld?.updateTerrainSurfaces({ remove: visual.terrainSurfaces.map(surface => surface.id) });
    unregisterLootMechanism(resident.id, visual.chestRoot);
    onVisualRemoving(visual.receiverRoot);
    lootRegistry?.setResidentDiscoveryIds([]);
    parent?.remove(visual.group);
    visual.dispose();
    resident = null; visual = null;
    onGeometryChanged();
  }

  function update() {
    if (disposed) return;
    const residency = terrainRuntime?.getResidency?.();
    if (residency === lastResidency) return;
    const chunkIds = new Set(residency?.chunks?.map(chunk => chunk.id) ?? []);
    const next = discoveries.find(discovery => chunkIds.has(discovery.chunkId)) ?? null;
    if (next?.id === resident?.id) { lastResidency = residency; return; }
    if (!next) { retire(); lastResidency = residency; return; }
    const nextVisual = createVisual({ discovery: next, visualAssets });
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    try {
      physicsWorld?.updateTerrainSurfaces({ remove, add: nextVisual.terrainSurfaces });
    } catch (error) {
      nextVisual.dispose();
      throw error;
    }
    retire(false);
    parent?.add(nextVisual.group);
    resident = next; visual = nextVisual;
    lootRegistry?.setResidentDiscoveryIds([next.id]);
    registerLootMechanism(next, nextVisual.chestRoot);
    onVisualAdded(nextVisual.receiverRoot);
    lastResidency = residency;
    onGeometryChanged();
  }

  function dispose() {
    if (disposed) return;
    retire(); lastResidency = null; disposed = true;
  }
  return {
    update, dispose,
    getVisualRoot: id => resident?.id === id ? visual?.chestRoot ?? null : null,
    getDebugState: () => ({ residentId: resident?.id ?? null, colliderCount: visual?.terrainSurfaces?.length ?? 0 }),
  };
}
