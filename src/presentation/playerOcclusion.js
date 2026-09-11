import * as THREE from "three";

// A small presentation-only visibility assist for authored props. Candidates
// are indexed at creation; update raycasts the current prop mesh list at 10Hz.
export const PLAYER_OCCLUSION_CONFIG = Object.freeze({
  interval: 0.1, opacity: 0.25, endPadding: 0.45,
  // The upper sightline can clear a sloped rock while it still hides the body.
  // Player position is the capsule center; protect the legs above the feet too.
  heightOffsets: Object.freeze([-0.35, 0.4]),
});
export function initializePlayerOcclusion({ scene, camera, getPlayerPosition } = {}) {
  if (!scene || !camera || !getPlayerPosition) return { update() {}, reset() {}, dispose() {}, register() {}, unregister() {} };
  const roots = [];
  const candidates = [];
  const meshToRoot = new Map();
  const rootToEntry = new Map();
  function register(object) {
    if (!object || rootToEntry.has(object)) return;
    const entry = { root: object, meshes: [], faded: false, materialStates: [] };
    object.traverse((child) => { if (child.isMesh && !meshToRoot.has(child)) { entry.meshes.push(child); candidates.push(child); meshToRoot.set(child, entry); } });
    if (entry.meshes.length) { roots.push(entry); rootToEntry.set(object, entry); }
  }
  function unregister(object) {
    const entry = rootToEntry.get(object);
    if (!entry) return;
    for (const state of entry.materialStates) {
      state.mesh.material = state.wasArray ? state.originals : state.originals[0];
      state.clones.forEach(material => material?.dispose());
    }
    for (const mesh of entry.meshes) { meshToRoot.delete(mesh); candidates.splice(candidates.indexOf(mesh), 1); }
    roots.splice(roots.indexOf(entry), 1); rootToEntry.delete(object);
  }
  scene.traverse((object) => {
    if (object.userData?.naturalBoundary || (object.userData?.propId && object.userData?.visualAssetId)) register(object);
  });
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  const cameraPosition = new THREE.Vector3();
  const player = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const effectivelyVisible = mesh => {
    for (let object = mesh; object; object = object.parent) if (!object.visible) return false;
    return true;
  };
  let accumulator = 0;

  function setFade(entry, faded) {
    if (entry.faded === faded) return;
    entry.faded = faded;
    for (const mesh of entry.meshes) {
      let state = entry.materialStates.find((item) => item.mesh === mesh);
      if (!state) {
        const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const clones = originals.map((material) => material?.clone());
        mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
        state = { mesh, originals, clones, wasArray: Array.isArray(mesh.material) };
        entry.materialStates.push(state);
      }
      for (let i = 0; i < state.clones.length; i += 1) {
        const material = state.clones[i];
        const original = state.originals[i];
        if (!material) continue;
        material.transparent = faded || !!original?.transparent;
        material.opacity = faded ? PLAYER_OCCLUSION_CONFIG.opacity : (original?.opacity ?? 1);
        material.depthWrite = !faded && (original?.depthWrite ?? true);
        material.needsUpdate = true;
      }
    }
  }
  function update(dt, { hidden = false } = {}) {
    if (hidden) { roots.forEach((entry) => setFade(entry, false)); return; }
    accumulator += Math.max(0, dt || 0);
    if (accumulator < PLAYER_OCCLUSION_CONFIG.interval) return;
    accumulator = 0;
    const position = getPlayerPosition();
    if (!position) return;
    camera.getWorldPosition(cameraPosition);
    // Static instance matrices are already prepared by the authoritative render
    // loop. Respect hidden section ancestors, not just each leaf mesh's flag.
    const visibleCandidates = candidates.filter(effectivelyVisible);
    const occluding = new Set();
    for (const offset of PLAYER_OCCLUSION_CONFIG.heightOffsets) {
      player.set(position.x ?? 0, (position.y ?? 0.55) + offset, position.z ?? 0);
      direction.subVectors(player, cameraPosition);
      const distance = direction.length();
      if (distance < 0.1) continue;
      direction.multiplyScalar(1 / distance);
      raycaster.set(cameraPosition, direction);
      raycaster.far = Math.max(0, distance - PLAYER_OCCLUSION_CONFIG.endPadding);
      for (const hit of raycaster.intersectObjects(visibleCandidates, false)) {
        const entry = meshToRoot.get(hit.object);
        if (entry) occluding.add(entry);
      }
    }
    roots.forEach((entry) => setFade(entry, occluding.has(entry)));
  }
  function reset() { roots.forEach((entry) => setFade(entry, false)); }
  function dispose() {
    for (const entry of [...roots]) unregister(entry.root);
  }
  return { update, reset, dispose, register, unregister, get candidateCount() { return roots.length; } };
}
