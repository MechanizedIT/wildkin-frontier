import { MOSSLING_MOTION } from '../src/creatures/mosslingMotion.js';

// Provisional repaired skin and clips: native gameplay review remains required.
// Stable Author identity, placement, collision and other species are preserved.
export function registerCharacterAssets(world) {
  const asset = world.visualAssets.find(entry => entry.id === 'asset_wildkin_mossling');
  if (!asset) throw new Error('Mossling visual asset must exist before character registration');
  asset.parts = [];
  asset.model = {
    path: 'assets/models/mossling-v3/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
    clips: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Attack', hurt: 'Hurt' },
    locomotion: { walk: MOSSLING_MOTION.walk, run: MOSSLING_MOTION.run },
  };
  asset.gameplay.wildkin.moveSpeed = MOSSLING_MOTION.run;
}
