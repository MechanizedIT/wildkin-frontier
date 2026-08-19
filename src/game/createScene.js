import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ecae6);
  scene.fog = new THREE.Fog(0x8ecae6, 18, 36);

  // Lighting — simple, performant, no post-processing
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(6, 12, 4);
  scene.add(dir);

  const hemi = new THREE.HemisphereLight(0xddeeff, 0x2a3a2a, 0.35);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  // Ground / island — low-poly, readable
  const groundGeo = new THREE.CylinderGeometry(6, 6.6, 0.7, 8);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x7bb26a,
    flatShading: true,
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.35;
  scene.add(ground);

  // Trim ring to sell island edge
  const ringGeo = new THREE.CylinderGeometry(6.6, 7.0, 0.25, 8);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x5f8a52, flatShading: true });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -0.72;
  scene.add(ring);

  // Props to establish scale/depth — primitives only
  addProps(scene);

  // Placeholder player marker — primitive-based, orientation readable (faces +Z)
  const player = createPlayerMarker();
  player.position.set(0, 0.35, 0);
  scene.add(player);

  // Subtle grid helper is intentionally NOT used — keep scene clean.

  return { scene, ground, player };
}

function addProps(scene) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, flatShading: true });
  const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2f6d3a, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x7ec8e3, flatShading: true, emissive: 0x0a2a3a, emissiveIntensity: 0.15 });

  // Rocks — low-poly dodecahedrons
  const rockPositions = [
    { x: -3.2, z: 1.8, s: 0.55 },
    { x: 2.8, z: -1.4, s: 0.45 },
    { x: -1.6, z: -3.1, s: 0.4 },
  ];
  for (const p of rockPositions) {
    const g = new THREE.DodecahedronGeometry(p.s, 0);
    const m = new THREE.Mesh(g, rockMat);
    m.position.set(p.x, p.s * 0.55, p.z);
    m.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    scene.add(m);
  }

  // Trees — cone + cylinder
  const treePositions = [
    { x: -2.4, z: -2.0 },
    { x: 3.0, z: 1.2 },
    { x: 1.4, z: 3.1 },
  ];
  for (const p of treePositions) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6), trunkMat);
    trunk.position.set(p.x, 0.35, p.z);
    scene.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.1, 6), treeFoliageMat);
    foliage.position.set(p.x, 1.15, p.z);
    scene.add(foliage);
  }

  // Crystals — octahedrons
  const crystalPositions = [
    { x: -0.9, z: 2.6 },
    { x: 2.0, z: -2.6 },
  ];
  for (const p of crystalPositions) {
    const g = new THREE.OctahedronGeometry(0.32, 0);
    const m = new THREE.Mesh(g, crystalMat);
    m.position.set(p.x, 0.35, p.z);
    m.rotation.y = Math.random() * Math.PI;
    scene.add(m);
  }

  // Scale markers — tiny posts at cardinal extents
  const markerMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0 });
  const markerPositions = [
    { x: 0, z: 4.2 },
    { x: 0, z: -4.2 },
    { x: 4.2, z: 0 },
    { x: -4.2, z: 0 },
  ];
  for (const p of markerPositions) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), markerMat);
    m.position.set(p.x, 0.22, p.z);
    scene.add(m);
  }
}

function createPlayerMarker() {
  const group = new THREE.Group();

  // Base — slightly flattened capsule-like cylinder
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.55, 8), bodyMat);
  body.position.y = 0.28;
  group.add(body);

  // Head
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe8c8, flatShading: true });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), headMat);
  head.position.y = 0.72;
  group.add(head);

  // Direction indicator — cone pointing +Z (forward), clearly readable for Phase 1 movement
  const dirMat = new THREE.MeshStandardMaterial({ color: 0xffd166, flatShading: true });
  const dir = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 8), dirMat);
  dir.rotation.x = Math.PI / 2;
  dir.position.set(0, 0.32, 0.45);
  group.add(dir);

  // Tiny highlight on top to read orientation from high angle
  const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), topMat);
  top.position.set(0, 0.58, 0.1);
  group.add(top);

  // Shadow plate — fake contact shadow for readability (no realtime shadows in Phase 0)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  group.name = "player-marker";
  return group;
}
