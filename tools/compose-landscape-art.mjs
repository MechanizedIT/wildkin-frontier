import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';

// Idempotent composition of existing artwork; no new interactions or triggers.
export function composeLandscapeArt(world){
  const camp=world.regions.find(r=>r.id==='camp');if(!camp)return;
  Object.assign(camp.surface.palette,{grass:'#719044',grassShade:'#385c37',path:'#d0a166',pathEdge:'#b0af65',rock:'#737f80'});
  const verge=world.regions.find(r=>r.id==='section_1');
  if(verge)Object.assign(verge.surface.palette,{grass:'#789950',grassShade:'#3e6240',path:'#cfa36c',pathEdge:'#acb36c'});
  const replace=(list,entry)=>{const i=list.findIndex(e=>e.id===entry.id);if(i>=0)list[i]=entry;else list.push(entry);};
  replace(camp.surface.heights,{id:'haven-distant-ridge',x:0,z:-24,rx:28,rz:12,height:4.2,plateau:.22});
  const move=(id,x,z,scale)=>{const obj=camp.props.find(p=>p.id===id);if(!obj)return;obj.pos={x,y:getSurfaceHeight(camp.surface,x,z),z};if(scale)obj.uniformScale=scale;};
  move('prop_camp_dropPod',-4.8,1.5,1.35);move('prop_camp_log',-7,3.6,1.1);
  move('prop_camp_frame_l',-5.1,9,.9);move('prop_camp_frame_r',5.4,8,.93);move('prop_camp_frame_spread',-6.7,7.4,.9);move('prop_camp_frame_tall',6.7,6.8,.9);
  const trees=[[-17,-18,1.5],[-12,-19,1.4],[-7,-20,1.6],[-2,-23,1.55],[4,-23,1.4],[9,-20,1.65],[15,-18,1.45],[20,-21,1.4],[-23,-13,1.3],[24,-12,1.5],[-8,-10,1.2],[-4,-12,1.4],[4.5,-12,1.3],[8,-9,1.5],[-12,-7,1.15],[12,-6,1.25]];
  trees.forEach(([x,z,scale],i)=>replace(camp.props,{id:`prop_camp_background_${i}`,subtype:'visualAsset',visualAssetId:i%3===0?'asset_verge_canopy_tall':i%3===1?'asset_verge_canopy_spread':'asset_verge_canopy',pos:{x,y:getSurfaceHeight(camp.surface,x,z),z},rotY:i*.57,uniformScale:scale,visibleInPlay:true,collisionEnabled:false,opacity:1}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const p=new URL('../src/world/data/world.json',import.meta.url),world=JSON.parse(fs.readFileSync(p,'utf8'));composeLandscapeArt(world);fs.writeFileSync(p,JSON.stringify(world)+'\n');console.log('Applied landscape Camp composition.');
}
