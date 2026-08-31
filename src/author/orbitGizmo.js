import * as THREE from "three";

export function createOrbitGizmo({ name = "orbit_gizmo" } = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.renderOrder = 999;
  group.userData.isOrbitGizmo = true;

  const alwaysOnTop = { transparent: true, depthTest: false, depthWrite: false };
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x8ecbff, emissive: 0x4a8fd6, emissiveIntensity: 0.65, opacity: 0.32, ...alwaysOnTop }),
  );
  orb.position.y = 0.26;
  group.add(orb);
  const x = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.06), new THREE.MeshBasicMaterial({ color: 0xff8ea0, opacity: 0.92, ...alwaysOnTop }));
  x.position.y = 0.04;
  group.add(x);
  const z = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.8), new THREE.MeshBasicMaterial({ color: 0x8effa0, opacity: 0.92, ...alwaysOnTop }));
  z.position.y = 0.04;
  group.add(z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0x8ecbff, opacity: 0.7, ...alwaysOnTop }));
  stem.position.y = 0.49;
  group.add(stem);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0x8ecbff, opacity: 0.22, side: THREE.DoubleSide, ...alwaysOnTop }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.08, 0), 1.35, 0xffe08a, 0.28, 0.16);
  arrow.userData.cameraOrientation = true;
  group.add(arrow);
  group.traverse((object) => { object.renderOrder = 999; });
  group.visible = false;
  return group;
}

export function updateOrbitGizmo(gizmo, { target, yaw = 0, scale = 1, visible = true } = {}) {
  if (!gizmo) return null;
  if (target) gizmo.position.copy(target);
  gizmo.rotation.y = yaw;
  const safeScale = Math.max(0.15, Number(scale) || 1);
  gizmo.scale.setScalar(safeScale);
  gizmo.visible = !!visible;
  return gizmo;
}
