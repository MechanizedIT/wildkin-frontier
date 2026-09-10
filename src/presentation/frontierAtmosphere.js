import * as THREE from "three";

const PALETTES = {
  camp: { fog: 0x265947, mote: 0xffcf7c },
  section_1: { fog: 0x1d5c58, mote: 0x76f3d1 },
  section_2: { fog: 0x224b66, mote: 0x7fd6ff },
  section_3: { fog: 0x756051, mote: 0xffa967 },
  section_4: { fog: 0x646c8e, mote: 0xd8b8ff },
  section_5: { fog: 0x253e49, mote: 0xf7d17d },
  default: { fog: 0x215c56, mote: 0x82efcb },
};

// Decorative only: a single bounded pooled Points draw call follows the explorer.
export function createFrontierAtmosphere({ scene, getPlayerPos = null, getSectionId = null, count = 72 } = {}) {
  if (!scene) throw new Error("createFrontierAtmosphere requires a scene");
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const k = i * 3, s = i * 4;
    seeds[s] = ((i * 47) % 97) / 97; seeds[s + 1] = ((i * 73) % 89) / 89;
    seeds[s + 2] = ((i * 29) % 83) / 83; seeds[s + 3] = 0.55 + ((i * 19) % 41) / 100;
    positions[k] = (seeds[s] - 0.5) * 18; positions[k + 1] = 0.35 + seeds[s + 1] * 3.8; positions[k + 2] = (seeds[s + 2] - 0.5) * 18;
    color.setHex(PALETTES.default.mote).multiplyScalar(seeds[s + 3]); colors[k] = color.r; colors[k + 1] = color.g; colors[k + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, sizeAttenuation: true });
  const motes = new THREE.Points(geometry, material);
  motes.name = "frontierAtmosphereMotes";
  scene.add(motes);
  let time = 0, activePalette = PALETTES.default;
  function update(dt, context = {}) {
    time += Math.min(Math.max(dt || 0, 0), 0.1);
    const player = context.playerPosition ?? getPlayerPos?.();
    const palette = PALETTES[context.sectionId ?? getSectionId?.()] ?? PALETTES.default;
    if (palette !== activePalette) { activePalette = palette; if (scene.fog?.color) scene.fog.color.setHex(palette.fog); if (scene.background) scene.background.setHex(palette.fog); }
    if (!player) return;
    const px = player.x ?? 0, py = player.y ?? 0, pz = player.z ?? 0;
    for (let i = 0; i < count; i++) {
      const k = i * 3, s = i * 4;
      positions[k] = px + (seeds[s] - 0.5) * 18 + Math.sin(time * (0.42 + seeds[s + 3]) + i) * 0.38;
      positions[k + 1] = py + 0.20 + seeds[s + 1] * 3.8 + Math.sin(time * 0.75 + i * 0.63) * 0.13;
      positions[k + 2] = pz + (seeds[s + 2] - 0.5) * 18 + Math.cos(time * (0.36 + seeds[s + 3]) + i) * 0.38;
      color.setHex(activePalette.mote).multiplyScalar(seeds[s + 3]); colors[k] = color.r; colors[k + 1] = color.g; colors[k + 2] = color.b;
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
  }
  function dispose() { scene.remove(motes); geometry.dispose(); material.dispose(); }
  return { motes, update, dispose };
}
