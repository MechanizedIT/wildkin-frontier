import * as THREE from 'three';
import { expressWildkinGenome } from './wildkinGenome.js';

export const WILDKIN_BODY_TONE_STRENGTH = 0.78;
export const WILDKIN_BODY_MATERIAL = 'wildkin_body';
export const WILDKIN_IRIS_MATERIAL = 'wildkin_iris';

const failure = reason => ({ ok: false, reason });

// Applies admitted Mossling material channels to one external-model
// instance. Geometry, textures, scale, rigging and unexpressed genome fields
// remain borrowed or unchanged.
export function applyWildkinAppearance(root, genome) {
  if (!root?.userData?.externalModelInstance) return failure('unsupported-root');

  let expression;
  try { expression = expressWildkinGenome(genome); }
  catch { return failure('invalid-genome'); }

  if (root.userData.wildkinAppearanceApplied) return failure('already-applied');
  // V3 has one textured material shared by fur, leaves and flowers. Its only
  // admitted expression is a whole-body tone. Rejected eye-overlay candidates
  // must not make an eye-color gene look like a shipped visual feature.
  const bodyOnly = root.userData.externalModelPath === 'assets/models/mossling-v3/model.glb';
  const slots = [];
  const channelCounts = new Map([[WILDKIN_BODY_MATERIAL, 0], [WILDKIN_IRIS_MATERIAL, 0]]);
  root.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material, index) => {
      if (!material || (!bodyOnly && !channelCounts.has(material.name))) return;
      const channel = bodyOnly ? WILDKIN_BODY_MATERIAL : material.name;
      channelCounts.set(channel, channelCounts.get(channel) + 1);
      slots.push({ object, index, isArray: Array.isArray(object.material), source: material });
    });
  });
  if (bodyOnly && new Set(slots.map(slot => slot.source)).size !== 1) return failure('unsupported-body-materials');
  for (const [name, count] of channelCounts) {
    if (!count && !(bodyOnly && name === WILDKIN_IRIS_MATERIAL)) return failure(`missing-material:${name}`);
  }

  const clones = new Map();
  let materialCloneCount = 0;
  const bodyMultiplier = new THREE.Color(0xffffff)
    .lerp(new THREE.Color(expression.baseColorHex), WILDKIN_BODY_TONE_STRENGTH);
  for (const { source } of slots) {
    if (clones.has(source)) continue;
    const material = source.userData?.externalModelInstanceMaterial ? source : source.clone();
    if (material !== source) {
      material.name = source.name;
      material.userData = { ...material.userData, externalModelInstanceMaterial: true };
      materialCloneCount++;
    }
    clones.set(source, material);
  }
  // Styling begins only after every channel and replacement has been resolved.
  // Existing authored tint/opacity clones remain owned by this instance and
  // stay reachable by the normal external-model disposer.
  for (const [source, material] of clones) {
    if ((bodyOnly || source.name === WILDKIN_BODY_MATERIAL) && material.color) material.color.multiply(bodyMultiplier);
    if (!bodyOnly && source.name === WILDKIN_IRIS_MATERIAL && material.color) material.color.set(expression.eyeColorHex);
  }

  for (const slot of slots) {
    const replacement = clones.get(slot.source);
    if (slot.isArray) {
      const materials = [...slot.object.material];
      materials[slot.index] = replacement;
      slot.object.material = materials;
    } else slot.object.material = replacement;
  }
  root.userData.wildkinAppearanceApplied = true;
  return { ok: true, expressedTraits: bodyOnly ? ['baseColor'] : ['baseColor', 'eyeColor'],
    materialCloneCount,
    bodyMaterialCount: channelCounts.get(WILDKIN_BODY_MATERIAL),
    irisMaterialCount: channelCounts.get(WILDKIN_IRIS_MATERIAL) };
}
