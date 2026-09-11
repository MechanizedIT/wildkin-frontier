// Replace only the admitted standard canopy visual. The existing asset identity,
// gameplay role, collider and every instance's transform/flags remain authored.
export function registerEcologyAssets(world) {
  const canopy = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy');
  if (!canopy) throw new Error('Standard canopy must exist before ecology registration');
  canopy.parts = [];
  canopy.model = {
    path: 'assets/models/alien-canopy-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
}
