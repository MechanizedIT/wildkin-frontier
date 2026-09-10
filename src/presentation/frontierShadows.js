// One deliberately bounded sun-shadow pass for the portrait play space.
// It never owns a frame loop or changes physics/gameplay visibility.
export function initializeFrontierShadows({ scene, sun, player, playground } = {}) {
  if (!scene || !sun) return { update() {}, dispose() {} };
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.018;
  const camera = sun.shadow.camera;
  camera.left = -28; camera.right = 28; camera.top = 28; camera.bottom = -28;
  camera.near = 1; camera.far = 42;
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  const setMaterialShadows = (root, isPlayer = false) => root?.traverse((object) => {
    if (!object.isMesh) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const transparent = !!material?.transparent || material?.opacity < 0.99;
    const ground = !!object.userData?.groundPatchId || object.name === "legacy_ground";
    object.receiveShadow = ground || (!transparent && !isPlayer);
    object.castShadow = !ground && !transparent && object.name !== "shadow";
  });
  setMaterialShadows(playground);
  setMaterialShadows(player, true);
  function update(authorHidden = false) { sun.castShadow = !authorHidden; }
  function dispose() { sun.castShadow = false; }
  return { update, dispose, sun };
}
