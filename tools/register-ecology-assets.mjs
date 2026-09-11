// Replace only admitted canopy visuals. The existing asset identity,
// gameplay role, collider and every instance's transform/flags remain authored.
export function registerEcologyAssets(world) {
  const canopy = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy');
  if (!canopy) throw new Error('Standard canopy must exist before ecology registration');
  canopy.parts = [];
  canopy.model = {
    path: 'assets/models/alien-canopy-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
  const tall = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy_tall');
  if (!tall) throw new Error('Tall canopy must exist before ecology registration');
  if (tall.collision != null) throw new Error('Tall canopy visual admission must preserve its non-solid contract');
  tall.parts = [];
  tall.collision = null;
  tall.model = {
    path: 'assets/models/alien-canopy-tall-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
  const spread = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy_spread');
  if (!spread) throw new Error('Spread canopy must exist before ecology registration');
  if (spread.collision != null) throw new Error('Spread canopy visual admission must preserve its non-solid contract');
  spread.parts = [];
  spread.collision = null;
  spread.model = {
    path: 'assets/models/alien-canopy-spread-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
}
