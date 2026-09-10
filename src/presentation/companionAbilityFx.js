import * as THREE from "three";

const normalize = (id) => String(id ?? "").toLowerCase().replace(/[^a-z]/g, "");

// Bounded visual companion abilities. Root owns the single frame loop and all gameplay effects.
export function createCompanionAbilityFx({ scene } = {}) {
  if (!scene) return { trigger() {}, update() {}, reset() {}, dispose() {} };
  const root = new THREE.Group(); root.name = "companionAbilityFx"; scene.add(root);
  const ringGeo = new THREE.RingGeometry(0.46, 0.51, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const domeGeo = new THREE.SphereGeometry(0.78, 14, 9);
  const petalGeo = new THREE.PlaneGeometry(0.13, 0.24);
  const wispGeo = new THREE.SphereGeometry(0.065, 7, 6);
  const pool = Array.from({ length: 6 }, () => {
    const group = new THREE.Group(); group.visible = false;
    const cyan = new THREE.MeshBasicMaterial({ color: 0x7ce9f1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mint = new THREE.MeshBasicMaterial({ color: 0x9df3c5, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const dome = new THREE.Mesh(domeGeo, cyan); dome.visible = false;
    const ringA = new THREE.Mesh(ringGeo, cyan); const ringB = new THREE.Mesh(ringGeo, amber); ringA.visible = ringB.visible = false;
    ringA.position.y = ringB.position.y = -0.44;
    group.add(dome, ringA, ringB);
    const petals = Array.from({ length: 6 }, (_, i) => { const mesh = new THREE.Mesh(petalGeo, mint); mesh.rotation.z = i * Math.PI / 3; mesh.visible = false; group.add(mesh); return mesh; });
    const wisps = Array.from({ length: 7 }, (_, i) => { const mesh = new THREE.Mesh(wispGeo, cyan); mesh.visible = false; group.add(mesh); return mesh; });
    root.add(group);
    return { group, dome, ringA, ringB, petals, wisps, cyan, amber, mint, active: false, kind: "", age: 0, duration: 0, x: 0, y: 0, z: 0 };
  });
  function clear(entry) { entry.active = false; entry.group.visible = false; entry.dome.visible = entry.ringA.visible = entry.ringB.visible = false; entry.petals.forEach((mesh) => { mesh.visible = false; }); entry.wisps.forEach((mesh) => { mesh.visible = false; }); }
  function trigger(speciesId, position = {}) {
    const kind = normalize(speciesId);
    const entry = pool.find((item) => !item.active) ?? pool.reduce((oldest, item) => item.age > oldest.age ? item : oldest, pool[0]);
    clear(entry); entry.active = true; entry.kind = kind; entry.age = 0;
    entry.duration = kind.includes("tide") ? 3 : kind.includes("moss") ? 1 : kind.includes("ember") ? .7 : .9;
    entry.x = position.x ?? 0; entry.y = position.y ?? 0; entry.z = position.z ?? 0;
    entry.group.position.set(entry.x, entry.y, entry.z); entry.group.visible = true;
    if (kind.includes("tide")) { entry.dome.visible = true; entry.ringA.visible = true; }
    else if (kind.includes("moss")) entry.petals.forEach((mesh) => { mesh.visible = true; });
    else if (kind.includes("ember")) entry.ringB.visible = true;
    else entry.wisps.forEach((mesh) => { mesh.visible = true; });
  }
  function update(dt, { playerPosition = null, hidden = false, reducedMotion = false } = {}) {
    const step = Math.min(Math.max(dt || 0, 0), .1);
    for (const entry of pool) {
      if (!entry.active) continue;
      if (hidden) { entry.group.visible = false; continue; }
      entry.group.visible = true; entry.age += step;
      if (entry.age >= entry.duration) { clear(entry); continue; }
      const t = entry.age / entry.duration;
      if (entry.kind.includes("tide")) {
        if (playerPosition) entry.group.position.set(playerPosition.x ?? 0, playerPosition.y ?? 0, playerPosition.z ?? 0);
        const pulse = reducedMotion ? 1 : 1 + Math.sin(entry.age * 4) * .04;
        entry.dome.scale.setScalar(pulse); entry.dome.material.opacity = .13 * (1 - t * .35);
        entry.ringA.scale.setScalar(.9 + (reducedMotion ? 0 : Math.sin(entry.age * 3) * .06)); entry.ringA.material.opacity = .7 * (1 - t * .25);
      } else if (entry.kind.includes("moss")) {
        entry.petals.forEach((mesh, i) => { const angle = i / entry.petals.length * Math.PI * 2; const lift = reducedMotion ? .28 : t * .9; mesh.position.set(Math.cos(angle) * .22, lift + Math.sin(entry.age * 6 + i) * .035, Math.sin(angle) * .22); mesh.material.opacity = .85 * (1 - t); });
      } else if (entry.kind.includes("ember")) {
        const scale = .5 + t * 8.3; entry.ringB.scale.setScalar(scale); entry.ringB.material.opacity = .9 * (1 - t);
      } else {
        entry.wisps.forEach((mesh, i) => { const angle = i / entry.wisps.length * Math.PI * 2 + entry.age * 1.6; const lift = reducedMotion ? .42 : t * 1.05; mesh.position.set(Math.cos(angle) * (.16 + t * .26), lift + Math.sin(i + entry.age * 5) * .07, Math.sin(angle) * (.16 + t * .26)); mesh.material.opacity = .8 * (1 - t); });
      }
    }
  }
  function reset() { pool.forEach(clear); }
  function dispose() { reset(); root.removeFromParent(); ringGeo.dispose(); domeGeo.dispose(); petalGeo.dispose(); wispGeo.dispose(); pool.forEach((entry) => { entry.cyan.dispose(); entry.amber.dispose(); entry.mint.dispose(); }); }
  return { trigger, update, reset, dispose, group: root };
}
