import * as THREE from "three";

// A small presentation-only visibility assist for tall authored props. Candidates
// are indexed once; update only raycasts the fixed static prop mesh list at 10Hz.
export function initializePlayerOcclusion({ scene, camera, getPlayerPosition } = {}) {
  if (!scene || !camera || !getPlayerPosition) return { update() {}, reset() {}, dispose() {} };
  const roots = [];
  const meshToRoot = new Map();
  scene.traverse((object) => {
    if (!object.userData?.propId || !object.userData?.visualAssetId) return;
    const entry = { root: object, meshes: [], faded: false, materialStates: [] };
    object.traverse((child) => { if (child.isMesh) { entry.meshes.push(child); meshToRoot.set(child, entry); } });
    if (entry.meshes.length) roots.push(entry);
  });
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  const cameraPosition = new THREE.Vector3();
  const player = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const candidates = [...meshToRoot.keys()];
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
        material.opacity = faded ? 0.25 : (original?.opacity ?? 1);
        material.depthWrite = !faded && (original?.depthWrite ?? true);
        material.needsUpdate = true;
      }
    }
  }
  function update(dt, { hidden = false } = {}) {
    if (hidden) { roots.forEach((entry) => setFade(entry, false)); return; }
    accumulator += Math.max(0, dt || 0);
    if (accumulator < 0.1) return;
    accumulator = 0;
    const position = getPlayerPosition();
    if (!position) return;
    player.set(position.x ?? 0, (position.y ?? 0.55) + 0.4, position.z ?? 0);
    camera.getWorldPosition(cameraPosition);
    direction.subVectors(player, cameraPosition);
    const distance = direction.length();
    if (distance < 0.1) return;
    direction.multiplyScalar(1 / distance);
    raycaster.set(cameraPosition, direction);
    raycaster.far = Math.max(0, distance - 0.45);
    // Static instance matrices are already prepared by the authoritative render
    // loop. Respect hidden section ancestors, not just each leaf mesh's flag.
    const hits = raycaster.intersectObjects(candidates.filter(effectivelyVisible), false);
    const occluding = new Set();
    for (const hit of hits) {
      const entry = meshToRoot.get(hit.object);
      if (entry && hit.distance < distance - 0.45) occluding.add(entry);
    }
    roots.forEach((entry) => setFade(entry, occluding.has(entry)));
  }
  function reset() { roots.forEach((entry) => setFade(entry, false)); }
  function dispose() {
    for (const entry of roots) {
      for (const state of entry.materialStates) {
        state.mesh.material = state.wasArray ? state.originals : state.originals[0];
        state.clones.forEach((material) => material?.dispose());
      }
      entry.materialStates.length = 0;
    }
  }
  return { update, reset, dispose, candidateCount: roots.length };
}
