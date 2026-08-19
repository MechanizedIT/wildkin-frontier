import * as THREE from "three";

export function createPlayer() {
  const group = new THREE.Group();

  // Body — cylinder
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.62, 8), bodyMat);
  body.position.y = 0.31;
  body.name = "body";
  group.add(body);

  // Head
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe8c8, flatShading: true });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), headMat);
  head.position.y = 0.76;
  head.name = "head";
  group.add(head);

  // Direction cone pointing +Z
  const dirMat = new THREE.MeshStandardMaterial({ color: 0xffd166, flatShading: true });
  const dir = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.44, 8), dirMat);
  dir.rotation.x = Math.PI / 2;
  dir.position.set(0, 0.32, 0.46);
  dir.name = "dir";
  group.add(dir);

  // Top marker for readability from high angle
  const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), topMat);
  top.position.set(0, 0.62, 0.09);
  top.name = "top";
  group.add(top);

  // Contact shadow
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.19 });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.name = "shadow";
  group.add(shadow);

  group.name = "player";
  group.position.set(0, 0.35, 5.5);
  return group;
}
