import * as THREE from "three";
import { createMovementPlayground } from "../world/createMovementPlayground.js";
import { createPlayer } from "../player/createPlayer.js";
import { initializeFrontierShadows } from "../presentation/frontierShadows.js";
import { FRONTIER_LIGHTING_CONFIG as light, FRONTIER_VIEW_CONFIG as view } from "../presentation/visualStyle.js";

export function createScene(worldData = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d5c58);
  scene.fog = new THREE.Fog(0x1d5c58, view.fogNear, view.fogFar);
  scene.add(new THREE.HemisphereLight(light.skyColor, light.groundColor, light.skyIntensity));
  const sun = new THREE.DirectionalLight(light.sunColor, light.sunIntensity);
  sun.position.set(-7, 13, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(light.fillColor, light.fillIntensity);
  fill.position.set(8, 5, -8);
  scene.add(fill);
  const playground = createMovementPlayground(worldData);
  scene.add(playground.group);
  const player = createPlayer(worldData?.playerVisual ?? null);
  scene.add(player);
  const shadows = initializeFrontierShadows({ scene, sun, player, playground: playground.group });
  return { scene, ground: playground.group, player, playground, shadows };
}
