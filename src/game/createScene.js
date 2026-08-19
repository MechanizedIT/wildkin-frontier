import * as THREE from "three";
import { createMovementPlayground } from "../world/createMovementPlayground.js";
import { createPlayer } from "../player/createPlayer.js";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ecae6);
  scene.fog = new THREE.Fog(0x8ecae6, 18, 36);

  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(6, 12, 4);
  scene.add(dir);

  const hemi = new THREE.HemisphereLight(0xddeeff, 0x2a3a2a, 0.35);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  const playground = createMovementPlayground();
  scene.add(playground.group);

  const player = createPlayer();
  scene.add(player);

  const ground = playground.group;

  return { scene, ground, player, playground };
}
