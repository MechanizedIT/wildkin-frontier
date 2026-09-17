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
    const entry = { root: object, meshes: [], faded: false, materialStates: [], instanceStates: [] };
    object.traverse((child) => { if (child.isMesh && !meshToRoot.has(child)) { entry.meshes.push(child); candidates.push(child); meshToRoot.set(child, entry); } });
    for (const mesh of entry.meshes) if (mesh.isInstancedMesh) {
      // Per-instance dither keeps an occluding tree see-through without fading
      // its entire grove or switching instanced foliage to sorted transparency.
      const geometry = mesh.geometry, material = mesh.material;
      const ownedGeometry = geometry.clone();
      const visibility = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count).fill(1), 1);
      ownedGeometry.setAttribute('playerVisibility', visibility);
      const ownedMaterial = material.clone();
      const originalCompile = material.onBeforeCompile;
      ownedMaterial.onBeforeCompile = (shader, renderer) => {
        originalCompile?.call(material, shader, renderer);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float playerVisibility;\nvarying float vPlayerVisibility;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlayerVisibility = playerVisibility;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPlayerVisibility;')
          .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif (vPlayerVisibility < 0.99 && mod(floor(gl_FragCoord.x), 2.0) + 2.0 * mod(floor(gl_FragCoord.y), 2.0) > 0.75) discard;');
      };
      ownedMaterial.customProgramCacheKey = () => `${material.customProgramCacheKey()}:player-instance-visibility-v1`;
      mesh.geometry = ownedGeometry; mesh.material = ownedMaterial;
      entry.instanceStates.push({ mesh, geometry, material, ownedGeometry, ownedMaterial, visibility });
    }
    if (entry.meshes.length) { roots.push(entry); rootToEntry.set(object, entry); }
  }
  function unregister(object) {
    const entry = rootToEntry.get(object);
    if (!entry) return;
    for (const state of entry.instanceStates) {
      state.mesh.geometry = state.geometry; state.mesh.material = state.material;
      state.ownedGeometry.dispose(); state.ownedMaterial.dispose();
    }
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
  const localCamera = new THREE.Vector3();
  const inverseWorld = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4(), instanceInverse = new THREE.Matrix4(), instanceCamera = new THREE.Vector3();
  const effectivelyVisible = mesh => {
    for (let object = mesh; object; object = object.parent) if (!object.visible) return false;
    return true;
  };
  let accumulator = 0;

  function setFade(entry, faded) {
    if (entry.faded === faded) return;
    entry.faded = faded;
    for (const mesh of entry.meshes) {
      if (mesh.isInstancedMesh) continue;
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
  function setInstances(entry, occluding = new Map()) {
    for (const state of entry.instanceStates) {
      const hidden = occluding.get(state.mesh); let changed = false;
      for (let index = 0; index < state.mesh.count; index++) {
        const value = hidden?.has(index) ? PLAYER_OCCLUSION_CONFIG.opacity : 1;
        if (state.visibility.array[index] !== value) { state.visibility.array[index] = value; changed = true; }
      }
      if (changed) state.visibility.needsUpdate = true;
    }
  }
  function update(dt, { hidden = false } = {}) {
    if (hidden) { roots.forEach((entry) => { setFade(entry, false); setInstances(entry); }); return; }
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
    const occludingInstances = new Map();
    const obscureInstance = (mesh, index) => { if (!occludingInstances.has(mesh)) occludingInstances.set(mesh, new Set()); occludingInstances.get(mesh).add(index); };
    // A camera inside a one-sided crown sees exit/back faces that the ordinary
    // sightline ray cannot hit. Check each mesh's local bounds too, so entering
    // tall foliage never turns the view into an opaque ceiling. Matrices and
    // geometry are untouched; inactive sections still retain original opacity.
    for(const mesh of visibleCandidates){
      if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      localCamera.copy(cameraPosition).applyMatrix4(inverseWorld.copy(mesh.matrixWorld).invert());
      if (mesh.isInstancedMesh) {
        for (let index = 0; index < mesh.count; index++) {
          mesh.getMatrixAt(index, instanceMatrix);
          instanceCamera.copy(localCamera).applyMatrix4(instanceInverse.copy(instanceMatrix).invert());
          if (mesh.geometry.boundingBox?.containsPoint(instanceCamera)) obscureInstance(mesh, index);
        }
      } else if(mesh.geometry.boundingBox?.containsPoint(localCamera))occluding.add(meshToRoot.get(mesh));
    }
    for (const offset of PLAYER_OCCLUSION_CONFIG.heightOffsets) {
      player.set(position.x ?? 0, (position.y ?? 0.55) + offset, position.z ?? 0);
      direction.subVectors(player, cameraPosition);
      const distance = direction.length();
      if (distance < 0.1) continue;
      direction.multiplyScalar(1 / distance);
      raycaster.set(cameraPosition, direction);
      raycaster.far = Math.max(0, distance - PLAYER_OCCLUSION_CONFIG.endPadding);
      for (const hit of raycaster.intersectObjects(visibleCandidates, false)) {
        if (hit.object.isInstancedMesh && Number.isInteger(hit.instanceId)) { obscureInstance(hit.object, hit.instanceId); continue; }
        const entry = meshToRoot.get(hit.object);
        if (entry) occluding.add(entry);
      }
    }
    roots.forEach((entry) => { setFade(entry, occluding.has(entry)); setInstances(entry, occludingInstances); });
  }
  function reset() { roots.forEach((entry) => { setFade(entry, false); setInstances(entry); }); }
  function dispose() {
    for (const entry of [...roots]) unregister(entry.root);
  }
  return { update, reset, dispose, register, unregister, get candidateCount() { return roots.length; } };
}
