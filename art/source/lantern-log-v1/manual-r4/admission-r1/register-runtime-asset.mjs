import fs from 'node:fs';
const path='src/world/data/world.json';
const world=JSON.parse(fs.readFileSync(path,'utf8'));
const id='asset_lantern_log_manual_r4';
if (world.visualAssets.some(asset=>asset.id===id)) throw new Error(`${id} already exists`);
world.visualAssets.push({
  id,
  displayName:'Lantern Grove fungal log',
  category:'Rootbound Ecology',
  version:1,
  parts:[],
  collision:null,
  gameplay:{role:'prop'},
  model:{path:'assets/models/lantern-log-manual-r4-v1/model.glb',scale:1,pivot:{x:0,y:0,z:0}},
});
fs.writeFileSync(path,JSON.stringify(world)+'\n');
