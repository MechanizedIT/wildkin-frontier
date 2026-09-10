import * as THREE from "three";

// Compact low-poly expedition suit. Named primary pieces remain stable for tooling.
export function createPlayer() {
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0xe8c987, roughness: 0.78, metalness: 0.04, flatShading: true });
  const suitDark = new THREE.MeshStandardMaterial({ color: 0x31404a, roughness: 0.84, flatShading: true });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc87532, roughness: 0.55, metalness: 0.18, flatShading: true });
  const visor = new THREE.MeshStandardMaterial({ color: 0x223c48, roughness: 0.22, metalness: 0.42, emissive: 0x0c2930, emissiveIntensity: 0.55, flatShading: true });
  const beacon = new THREE.MeshStandardMaterial({ color: 0x9df3d0, emissive: 0x38cda1, emissiveIntensity: 1.35, roughness: 0.3, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.56, 8), suit);
  body.position.y = 0.36; body.name = "body"; group.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.075, 8), suitDark); belt.position.y = 0.17; group.add(belt);
  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.19, 0.035), trim); chestPanel.position.set(0, 0.42, 0.292); chestPanel.rotation.x = -0.08; group.add(chestPanel);
  const chestLight = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), beacon); chestLight.position.set(-0.065, 0.43, 0.315); chestLight.rotation.x = -Math.PI / 2; group.add(chestLight);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 10, 8), suit);
  head.position.y = 0.79; head.scale.set(1, 0.93, 1); head.name = "head"; group.add(head);
  const visorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.205, 10, 7, 0, Math.PI), visor); visorMesh.position.set(0, 0.79, 0.105); visorMesh.scale.set(1, 0.66, 0.48); visorMesh.rotation.y = Math.PI; group.add(visorMesh);
  const helmetBand = new THREE.Mesh(new THREE.TorusGeometry(0.248, 0.022, 5, 10), trim); helmetBand.position.y = 0.79; helmetBand.rotation.x = Math.PI / 2; group.add(helmetBand);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.17), suitDark); backpack.position.set(0, 0.43, -0.285); backpack.rotation.x = -0.08; group.add(backpack);
  const tankGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.30, 6);
  for (const x of [-0.105, 0.105]) { const tank = new THREE.Mesh(tankGeo, trim); tank.position.set(x, 0.48, -0.39); group.add(tank); }
  const packLamp = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 6), beacon); packLamp.position.set(0, 0.59, -0.385); group.add(packLamp);
  const bootGeo = new THREE.BoxGeometry(0.18, 0.20, 0.29);
  for (const [side, x] of [["left", -0.18], ["right", 0.18]]) {
    const leg = new THREE.Group(); leg.name = `${side}Leg`; leg.position.set(x, 0.27, 0.03);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.105, 7, 6), suit); knee.position.y = -0.06; knee.scale.set(0.9, 1.12, 0.8);
    const boot = new THREE.Mesh(bootGeo, suitDark); boot.position.set(0, -0.21, 0.005);
    leg.add(knee, boot); group.add(leg);
  }
  // The other arm belongs to Field Tool's rightHandAnchor; keep it independent.
  const leftArm = new THREE.Group(); leftArm.name = "leftArm"; leftArm.position.set(0.34, 0.61, 0.02);
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.42, 6), suit); leftSleeve.position.y = -0.20; leftSleeve.rotation.z = -0.28; leftArm.add(leftSleeve); group.add(leftArm);
  const dir = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.28, 7), trim); dir.rotation.x = Math.PI / 2; dir.position.set(0, 0.35, 0.47); dir.name = "dir"; group.add(dir);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.065, 8), beacon); top.position.set(0, 1.015, -0.025); top.name = "top"; group.add(top);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x07100d, transparent: true, opacity: 0.26, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.46, 16), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; shadow.name = "shadow"; group.add(shadow);
  group.name = "player"; group.position.set(0, 0.35, 5.5);
  return group;
}
