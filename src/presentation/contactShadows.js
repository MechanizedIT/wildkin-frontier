import * as THREE from "three";

// Soft, inexpensive contact grounding. One instanced draw per visible section,
// derived from runtime transforms; these planes never become physics objects.
export function createContactShadows(scene, registry) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(8,19,24,0.34)"); gradient.addColorStop(.45, "rgba(8,19,24,0.19)"); gradient.addColorStop(1, "rgba(8,19,24,0)");
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(1, 1); geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const batches = new Map(), temp = new THREE.Object3D(), bounds = new THREE.Box3(), size = new THREE.Vector3(), center = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  for (const section of registry.getAllRegions()) {
    const roots = [];
    scene.traverse(node => {
      if (node.userData?.sectionId !== section.id || !node.userData?.propId) return;
      if (node.userData.propSubtype === "water" || node.userData.propSubtype === "groundPatch" || node.userData.visibleInPlay === false) return;
      bounds.setFromObject(node); bounds.getSize(size); bounds.getCenter(center);
      if (bounds.isEmpty() || size.y < .3 || size.x > 12 || size.z > 12) return;
      roots.push({ x: center.x + .14, y: bounds.min.y + .025, z: center.z + .15, xSize: Math.max(.7, size.x * 1.2), zSize: Math.max(.7, size.z * 1.2) });
    });
    const batch = new THREE.InstancedMesh(geometry, material, roots.length);
    roots.forEach((shadow, i) => { temp.position.set(shadow.x, shadow.y, shadow.z); temp.scale.set(shadow.xSize, 1, shadow.zSize); temp.updateMatrix(); batch.setMatrixAt(i, temp.matrix); });
    batch.name = `contactShadows_${section.id}`; batch.userData.betaPresentation = true;
    batch.frustumCulled = false; batch.visible = false; scene.add(batch); batches.set(section.id, batch);
  }
  return { update(sectionId, hidden = false) { for (const [id, batch] of batches) batch.visible = !hidden && id === sectionId; }, dispose() { for (const batch of batches.values()) { scene.remove(batch); batch.dispose(); } geometry.dispose(); material.dispose(); texture.dispose(); } };
}
