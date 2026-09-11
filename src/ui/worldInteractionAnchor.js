import * as THREE from 'three';

const HEIGHT = { portalGate: 2.5, gate: 2.5, majorWaypoint: 1.8, extractionBeacon: 1.8, lootChest: 1, resonator: 1.5, campSanctuary: 1.4, bond: 1.2 };
const projected = new THREE.Vector3();

export function resolveInteractionRecord(info, { registry, creatures, getBase } = {}) {
  if (!info) return null;
  if (info.type === 'bond' || info.type === 'companion') {
    const creature = info.target ?? creatures?.getCreatures().find(c => c.state.id === info.id);
    return creature && !creature.state.isDead && !creature.state.bondCaptured ? { pos: creature.state.pos, creature } : null;
  }
  const getters = { portalGate: 'getPortalGateById', gate: 'getPortalGateById', majorWaypoint: 'getWaypointById', extractionBeacon: 'getBeaconById', lootChest: 'getLootChestById' };
  return registry?.[getters[info.type]]?.(info.id)
    ?? registry?.getAllPois?.().find(p => p.id === info.id)
    ?? registry?.data?.regions?.flatMap(r => r.props ?? []).find(p => p.id === info.id)
    ?? getBase?.()?.getModel().structures.find(p => p.id === info.id) ?? null;
}

export function projectInteractionPoint(point, camera, width, height, output = {}) {
  camera.updateMatrixWorld();
  projected.set(point.x, point.y, point.z).project(camera);
  if (!Number.isFinite(projected.x) || projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return null;
  output.x = (projected.x + 1) * width / 2;
  output.y = (1 - projected.y) * height / 2;
  return output;
}

// Presentation only: the authoritative nearby-target selection remains in the
// gameplay owners. Geometry bounds are sampled on target changes, not per frame.
export function createWorldInteractionAnchor({ scene, registry, creatures, getBase } = {}) {
  const box = new THREE.Box3(), point = new THREE.Vector3();
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(), origin = new THREE.Vector3();
  let key = '', record = null, root = null, offset = 0, occluders = [], timer = 0, blocked = false;
  const visible = object => { for (let n = object; n; n = n.parent) if (!n.visible) return false; return true; };
  function getPoint(info) {
    const nextKey = `${info?.type}|${info?.id}`;
    if (key !== nextKey || (root && !root.parent)) {
      key = nextKey; record = resolveInteractionRecord(info, { registry, creatures, getBase });
      root = scene?.getObjectByName(info?.id) ?? null;
      offset = HEIGHT[info?.type] ?? 1.3;
      if (root) {
        root.updateWorldMatrix(true, true); box.setFromObject(root);
        if (!box.isEmpty()) offset = box.max.y - (record?.pos?.y ?? root.position.y) + .18;
      }
      occluders = [];
      scene?.traverse(n => {
        if (!n.isMesh || n.userData?.authorId === info?.id) return;
        for (let parent = n; parent; parent = parent.parent) {
          if (parent === root || parent.userData?.creatureId) return;
          if (parent.userData?.propId || parent.userData?.isGround || parent.name === 'player-base') { occluders.push(n); return; }
        }
      });
      timer = .1; blocked = false;
    }
    if (!record?.pos || (root && !visible(root)) || record.creature?.state.isDead || record.creature?.state.bondCaptured) return null;
    // Creature state owns moving positions; the sampled height follows its body.
    return point.set(record.pos.x, (record.pos.y ?? 0) + offset, record.pos.z);
  }
  function isOccluded(camera, anchor, dt) {
    timer += dt;
    if (timer < .1) return blocked;
    timer = 0; camera.getWorldPosition(origin); direction.subVectors(anchor, origin);
    const distance = direction.length(); ray.set(origin, direction.normalize()); ray.far = Math.max(0, distance - .2);
    const candidates = occluders.filter(n => visible(n) && [].concat(n.material).some(m => m && m.opacity > .5));
    blocked = ray.intersectObjects(candidates, false).length > 0;
    return blocked;
  }
  return { getPoint, isOccluded };
}

export function placeInteractionLabel(point, size, bounds, obstacles = []) {
  const gap = 18, { width, height } = size;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  if (width > bounds.right - bounds.left || height > bounds.bottom - bounds.top) return null;
  const candidates = [
    [point.x - width / 2, point.y - height - gap],
    [point.x + gap, point.y - height / 2],
    [point.x - width - gap, point.y - height / 2],
    [point.x - width / 2, point.y + gap],
  ];
  for (const [x, y] of candidates) {
    const left = clamp(x, bounds.left, bounds.right - width), top = clamp(y, bounds.top, bounds.bottom - height);
    const right = left + width, bottom = top + height;
    if (point.x > left && point.x < right && point.y > top && point.y < bottom) continue;
    if (obstacles.some(r => left < r.right + 6 && right > r.left - 6 && top < r.bottom + 6 && bottom > r.top - 6)) continue;
    const endX = clamp(point.x, left + 8, right - 8), endY = clamp(point.y, top + 8, bottom - 8);
    return { left, top, endX, endY };
  }
  return null;
}
