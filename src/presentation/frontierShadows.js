import { FRONTIER_VIEW_CONFIG as view } from './visualStyle.js';

// One bounded sun-shadow pass follows the explorer across the active region.
// It never owns a frame loop or changes physics/gameplay visibility.
export function initializeFrontierShadows({ scene, sun, player, playground } = {}) {
  if (!scene || !sun) return { update() {}, dispose() {} };
  sun.castShadow = true;
  sun.shadow.mapSize.set(view.shadowMapSize, view.shadowMapSize);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.018;
  const camera = sun.shadow.camera;
  camera.left = -view.shadowHalfExtent; camera.right = view.shadowHalfExtent;
  camera.top = view.shadowHalfExtent; camera.bottom = -view.shadowHalfExtent;
  camera.near = 1; camera.far = 65;
  camera.updateProjectionMatrix();
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  const setMaterialShadows = (root, isPlayer = false) => root?.traverse((object) => {
    if (!object.isMesh) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const transparent = !!material?.transparent || material?.opacity < 0.99;
    const ground = !!object.userData?.isGround || !!object.userData?.groundPatchId || object.name === "legacy_ground";
    object.receiveShadow = ground || (!transparent && !isPlayer);
    object.castShadow = !ground && !transparent && object.name !== "shadow";
  });
  setMaterialShadows(playground);
  setMaterialShadows(player, true);
  function update(authorHidden = false) {
    sun.castShadow = !authorHidden;
    if (authorHidden || !player) return;
    // Preserve the same lighting direction everywhere. The shadow frustum
    // culls distant casters without hiding gameplay objects or their colliders.
    const p = player.position;
    sun.target.position.set(p.x, p.y, p.z);
    sun.position.set(p.x + view.sunOffset.x, p.y + view.sunOffset.y, p.z + view.sunOffset.z);
  }
  update();
  function dispose() { sun.castShadow = false; }
  return { update, dispose, sun };
}
