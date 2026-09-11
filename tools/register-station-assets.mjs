// Reviewed local models retain stable Author IDs and simple collision metadata.
export function registerStationAssets(world) {
  for (const [id,name,revision,w,h,d] of [
    ['asset_salvage_bench','Salvage bench','salvage-bench-v1',1.97,1.277,.9965],
    ['asset_matter_fabricator','Matter fabricator','matter-fabricator-v1',2.48,1.828,1.086],
    ['asset_resonance_bench','Resonance bench','resonance-bench-v1',1.401,1.3,1.485],
  ]) {
    const descriptor={id,displayName:name,category:'Camp stations',version:1,parts:[],
      collision:{shape:'box',offset:{x:0,y:h/2,z:0},size:{w,h,d}},gameplay:{role:'prop'},
      model:{path:`assets/models/${revision}/model.glb`,scale:1,pivot:{x:0,y:0,z:0}}};
    const index=world.visualAssets.findIndex(asset=>asset.id===id);
    if(index<0)world.visualAssets.push(descriptor);else world.visualAssets[index]=descriptor;
  }
}
