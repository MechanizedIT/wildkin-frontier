// Actual exported lower-trunk vertices fit inside this box for all three forms.
// Instance Solid flags remain authored: background Camp dressing stays scenery.
export const CANOPY_TRUNK_COLLISION = Object.freeze({shape:'box',offset:{x:0,y:1.225,z:0},size:{w:1,h:2.45,d:1}});
export function registerEcologyAssets(world) {
  const canopy = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy');
  if (!canopy) throw new Error('Standard canopy must exist before ecology registration');
  canopy.parts = [];
  canopy.collision = structuredClone(CANOPY_TRUNK_COLLISION);
  canopy.model = {
    path: 'assets/models/alien-canopy-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
  const tall = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy_tall');
  if (!tall) throw new Error('Tall canopy must exist before ecology registration');
  tall.parts = [];
  tall.collision = structuredClone(CANOPY_TRUNK_COLLISION);
  tall.model = {
    path: 'assets/models/alien-canopy-tall-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
  const spread = world.visualAssets.find(asset => asset.id === 'asset_verge_canopy_spread');
  if (!spread) throw new Error('Spread canopy must exist before ecology registration');
  spread.parts = [];
  spread.collision = structuredClone(CANOPY_TRUNK_COLLISION);
  spread.model = {
    path: 'assets/models/alien-canopy-spread-v1/model.glb', scale: 1,
    pivot: { x: 0, y: 0, z: 0 },
  };
}
