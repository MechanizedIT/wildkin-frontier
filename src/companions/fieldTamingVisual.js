import * as THREE from "three";
import { getSurfaceHeight, getWaterRadius } from "../world/terrainSurfaceModel.js";

export function findFieldPlacement({ player, registry, sectionId, physicsWorld, ignoreCollider = () => false, secondPerch = false }) {
  // Prefer directly ahead, then the nearest open patch in the forward arc.
  // Shoreline gear can land beside the player's aim without requiring them to
  // face away from the creature they are trying to attract.
  for (const offset of [0, .65, -.65, 1.25, -1.25, Math.PI / 2, -Math.PI / 2]) {
    const point = candidatePlacement({ player: { ...player, facing: player.facing + offset }, registry, sectionId, physicsWorld, ignoreCollider, secondPerch });
    if (point) return point;
  }
  return null;
}
function candidatePlacement({ player, registry, sectionId, physicsWorld, ignoreCollider, secondPerch }) {
  const section = registry.getSectionById(sectionId), surface = section?.surface;
  const angle = player.facing + (secondPerch ? Math.PI / 2 : 0), reach = secondPerch ? 3.4 : 1.5;
  const point = { x: player.pos.x + Math.sin(angle) * reach, z: player.pos.z + Math.cos(angle) * reach };
  point.y = getSurfaceHeight(surface, point.x, point.z);
  if (getWaterRadius(surface, point.x, point.z) < 1.15 || Math.abs(point.y - (player.pos.y - 0.6)) > 1.2) return null;
  const heights = [[0, 0], [.55, 0], [-.55, 0], [0, .55], [0, -.55]].map(([x,z]) => getSurfaceHeight(surface, point.x + x, point.z + z));
  if (Math.max(...heights) - Math.min(...heights) > 0.32) return null;
  const R = physicsWorld?.RAPIER, world = physicsWorld?.world;
  if (R?.Ball && world?.intersectionWithShape) {
    const hit = world.intersectionWithShape({ x: point.x, y: point.y + .55, z: point.z }, { x: 0, y: 0, z: 0, w: 1 }, new R.Ball(.45), undefined, undefined, undefined, undefined, c => !ignoreCollider(c));
    if (hit) return null;
    const from = { x: player.pos.x, y: player.pos.y, z: player.pos.z };
    const hitPath = world.castShape(from, { x: 0, y: 0, z: 0, w: 1 }, { x: point.x - from.x, y: 0, z: point.z - from.z }, new R.Ball(.28), 0, 1, true, undefined, undefined, undefined, undefined, c => !ignoreCollider(c));
    if (hitPath) return null;
  }
  return point;
}

// Bounded prototype gear: berries, woven jaws, chime perch and tether stakes.
// It advertises its role in world space without becoming a static collider.
export function createFieldTamingVisual(scene) {
  let root = null, key = "";
  function clear() {
    root?.traverse(node => { node.geometry?.dispose(); if (node.material) node.material.dispose(); });
    root?.removeFromParent(); root = null; key = "";
  }
  function update(state) {
    if (!state) { clear(); return; }
    const nextKey = `${state.id}:${state.stage}:${state.perch}`;
    if (nextKey !== key) {
      clear(); key = nextKey; root = new THREE.Group(); root.name = "fieldTamingGear"; root.userData.betaPresentation = true;
      const colors = { mossling: 0x94e777, tidefin: 0x53dbe3, emberhorn: 0xffb163, skydancer: 0xcd99ff }, color = colors[state.speciesId];
      function mesh(geometry, tint, x, y, z) { const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: tint })); m.position.set(x,y,z); root.add(m); return m; }
      const ring = mesh(new THREE.TorusGeometry(.72, .065, 5, 20), color, 0, .09, 0); ring.rotation.x = Math.PI / 2;
      if (state.speciesId === "mossling" || state.stage === "offer") {
        for (let i=0;i<5;i++) mesh(new THREE.IcosahedronGeometry(.15,0), i%2 ? 0xfdcf69 : 0xf985a9, Math.sin(i*2.4)*.25, .22, Math.cos(i*2.4)*.25);
      } else if (state.speciesId === "tidefin") {
        for (let i=0;i<6;i++) { const angle=i*Math.PI/3, m=mesh(new THREE.BoxGeometry(.09,state.stage === "trapped" ? .8 : .15,.8),0xb69b72,Math.sin(angle)*.35,.25,Math.cos(angle)*.35); m.rotation.y=angle; }
        mesh(new THREE.IcosahedronGeometry(.19),0xf5d572,0,.28,0);
      } else if (state.speciesId === "skydancer") {
        mesh(new THREE.CylinderGeometry(.35,.5,.25,5),0x706398,0,.14,0);
        for(let i=-1;i<=1;i++) mesh(new THREE.ConeGeometry(.11,.55+Math.abs(i)*.2,4),color,i*.22,.62,0);
      } else {
        for (let i=0;i<3;i++) mesh(new THREE.CylinderGeometry(.07,.1,.75,5),0xe7cda1,Math.sin(i*2.1)*.55,.4,Math.cos(i*2.1)*.55);
      }
      scene.add(root);
    }
    root.position.set(state.point.x, state.point.y + .03, state.point.z);
  }
  return { update, clear };
}
