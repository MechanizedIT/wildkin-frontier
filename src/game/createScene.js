import * as THREE from "three";
import { createMovementPlayground } from "../world/createMovementPlayground.js";
import { createPlayer } from "../player/createPlayer.js";
import { initializeFrontierShadows } from "../presentation/frontierShadows.js";

export function createScene(worldData = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d5c58);
  scene.fog = new THREE.FogExp2(0x1d5c58, 0.005);
  scene.add(new THREE.HemisphereLight(0xdbedff, 0x444e76, 0.95));
  const sun = new THREE.DirectionalLight(0xfff2db, 2.0);
  sun.position.set(-7, 13, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb0f4ed, 0.25);
  fill.position.set(8, 5, -8);
  scene.add(fill);
  const playground = createMovementPlayground(worldData);
  scene.add(playground.group);
  const player = createPlayer(worldData?.playerVisual ?? null);
  scene.add(player);
  const shadows = initializeFrontierShadows({ scene, sun, player, playground: playground.group });
  return { scene, ground: playground.group, player, playground, shadows };
}
