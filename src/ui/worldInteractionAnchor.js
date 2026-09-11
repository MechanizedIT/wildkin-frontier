import * as THREE from 'three';

const HEIGHT = { portalGate: 2.5, gate: 2.5, majorWaypoint: 1.8, extractionBeacon: 1.8, lootChest: 1, resonator: 1.5, campSanctuary: 1.4, storage:1.2, bond: 1.2 };
const projected = new THREE.Vector3();
const boundsCorner = new THREE.Vector3();

// Eight cached envelope corners, never a per-frame mesh traversal. An envelope
// crossing the near plane cannot provide a trustworthy screen reservation.
export function projectInteractionBounds(box, matrixWorld, camera, width, height, output = {}) {
  if (!box || box.isEmpty()) return null;
  camera.updateMatrixWorld();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let i = 0; i < 8; i++) {
    boundsCorner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(matrixWorld).project(camera);
    if (!Number.isFinite(boundsCorner.x) || boundsCorner.z < -1 || boundsCorner.z > 1) return null;
    const x = (boundsCorner.x + 1) * width / 2, y = (1 - boundsCorner.y) * height / 2;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < 0 || left > width || bottom < 0 || top > height) return null;
  Object.assign(output, { left: Math.max(0, left), right: Math.min(width, right), top: Math.max(0, top), bottom: Math.min(height, bottom) });
  return output;
}

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
  const bodyBox = new THREE.Box3(), partBox = new THREE.Box3(), inverse = new THREE.Matrix4(), relative = new THREE.Matrix4(), bodyRect = {};
  let key = '', record = null, root = null, offset = 0, occluders = [], timer = 0, blocked = false;
  let bodyRoot = null;
  const visible = object => { for (let n = object; n; n = n.parent) if (!n.visible) return false; return true; };
  function getPoint(info) {
    const nextKey = `${info?.type}|${info?.id}`;
    if (key !== nextKey || (root && !root.parent) || (record?.creature?.group && record.creature.group !== root)) {
      key = nextKey; record = resolveInteractionRecord(info, { registry, creatures, getBase });
      root = record?.creature?.group ?? scene?.getObjectByName(info?.id) ?? null;
      bodyRoot = null; bodyBox.makeEmpty();
      let bodyTop = null;
      if (record?.creature && root) {
        // The visual is the direct group child containing mainMesh. Focus rings,
        // health bars and taming effects are siblings, not part of this envelope.
        bodyRoot = record.creature.mainMesh ?? (root.isMesh ? root : null);
        while (bodyRoot !== root && bodyRoot?.parent && bodyRoot.parent !== root) bodyRoot = bodyRoot.parent;
        if (bodyRoot) {
          root.updateWorldMatrix(true, true); inverse.copy(root.matrixWorld).invert();
          bodyRoot.traverse(mesh => {
            if (!mesh.isMesh || !mesh.geometry) return;
            if (mesh.isSkinnedMesh) mesh.computeBoundingBox();
            else if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            relative.multiplyMatrices(inverse, mesh.matrixWorld);
            partBox.copy(mesh.isSkinnedMesh ? mesh.boundingBox : mesh.geometry.boundingBox).applyMatrix4(relative);
            bodyBox.union(partBox);
          });
          if (!bodyBox.isEmpty()) {
            bodyTop = box.copy(bodyBox).applyMatrix4(root.matrixWorld).max.y;
            bodyBox.expandByScalar(.12);
          }
        }
      }
      offset = HEIGHT[info?.type] ?? 1.3;
      if (root) {
        root.updateWorldMatrix(true, true);
        if (bodyTop === null) box.setFromObject(root);
        if (bodyTop !== null || !box.isEmpty()) offset = (bodyTop ?? box.max.y) - (record?.pos?.y ?? root.position.y) + .18;
      }
      // A locker is used at its door, below nearby overhead foliage. The pod's
      // roof anchor was hidden by Camp canopy even while its front was visible.
      if (info?.type === 'storage') offset = Math.min(offset, HEIGHT.storage);
      occluders = [];
      scene?.traverse(n => {
        if (!n.isMesh || n.userData?.authorId === info?.id) return;
        let scenery = false;
        for (let parent = n; parent; parent = parent.parent) {
          if (parent === root || parent.userData?.creatureId) return;
          // Batched meshes can carry propId below the selected visual root.
          // Finish exclusions before admitting any part as an occluder.
          if (parent.userData?.propId || parent.userData?.isGround || parent.name === 'player-base') scenery = true;
        }
        if (scenery) occluders.push(n);
      });
      timer = .1; blocked = false;
    }
    if (!record?.pos || (root && (!root.parent || !visible(root))) || record.creature?.state.isDead || record.creature?.state.bondCaptured) return null;
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
  function getBodyRectangle(camera, width, height) {
    if (!bodyRoot || !root?.parent || !visible(root) || record?.creature?.state.isDead || record?.creature?.state.bondCaptured) return null;
    root.updateWorldMatrix(true, false);
    return projectInteractionBounds(bodyBox, root.matrixWorld, camera, width, height, bodyRect);
  }
  return { getPoint, getBodyRectangle, hasBodyEnvelope: () => !bodyBox.isEmpty(), isOccluded };
}

export function placeInteractionLabel(point, size, bounds, obstacles = [], body = null) {
  const gap = 18, { width, height } = size;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  if (width > bounds.right - bounds.left || height > bounds.bottom - bounds.top) return null;
  const candidates = [
    [point.x - width / 2, point.y - height - gap],
    ...(body ? [
      [body.right + gap, (body.top + body.bottom - height) / 2], [body.left - width - gap, (body.top + body.bottom - height) / 2],
      [body.right + gap, body.top + height / 2], [body.left - width - gap, body.top + height / 2],
      [body.right + gap, body.bottom], [body.left - width - gap, body.bottom],
      // A HUD strip can bisect otherwise usable space beside the animal. Try
      // its edges too; all candidates still pass the same complete collision test.
      ...[body.right + gap, body.left - width - gap].flatMap(x => obstacles
        .filter(r => x < r.right + 6 && x + width > r.left - 6)
        .flatMap(r => [r.bottom + 6, r.top - height - 6]
          .filter(y => y >= body.top - height / 2 && y <= body.bottom)
          .map(y => [x, y]))),
    ] : []),
    [point.x + gap, point.y - height / 2],
    [point.x - width - gap, point.y - height / 2],
    [point.x - width / 2, point.y + gap],
  ];
  for (const [x, y] of candidates) {
    const left = clamp(x, bounds.left, bounds.right - width), top = clamp(y, bounds.top, bounds.bottom - height);
    const right = left + width, bottom = top + height;
    if (point.x > left && point.x < right && point.y > top && point.y < bottom) continue;
    if (body && left < body.right + 6 && right > body.left - 6 && top < body.bottom + 6 && bottom > body.top - 6) continue;
    if (obstacles.some(r => left < r.right + 6 && right > r.left - 6 && top < r.bottom + 6 && bottom > r.top - 6)) continue;
    const endX = clamp(point.x, left + 8, right - 8), endY = clamp(point.y, top + 8, bottom - 8);
    return { left, top, endX, endY };
  }
  return null;
}
