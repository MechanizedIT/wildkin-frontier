import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three.module.js';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {createVisualAssetVisual} from '../src/world/visualFactory.js';
import {CAMP_DEBRIS, CAMP_WORKPAD_ROUTE_ID} from '../src/base/campLayout.js';
import {writeGeneratedFile} from './write-generated-file.mjs';

const replace=(items,record)=>{const i=items.findIndex(item=>item.id===record.id);if(i<0)items.push(record);else items[i]=record;};
export const CAMP_CLEARING_ASSET_IDS = Object.freeze(CAMP_DEBRIS.map(record=>`asset_${record.id}`));

export function composeCrashlandCamp(world){
  const camp=world.regions.find(region=>region.id==='camp');if(!camp)return;
  // Automatic defenses have a saved lifecycle, like player construction. These
  // library entries supply visuals; campDefenses owns their compound colliders.
  for(const [id,name,revision] of [
    ['asset_emergency_barricade','Emergency armor panel','emergency-barricade-v1'],
    ['asset_emergency_barricade_post','Emergency armor end post','emergency-barricade-post-v1'],
  ])replace(world.visualAssets,{id,displayName:name,category:'Camp defense assemblies',version:1,parts:[],collision:null,gameplay:{role:'prop'},model:{path:`assets/models/${revision}/model.glb`,scale:1,pivot:{x:0,y:0,z:0}}});

  camp.props=camp.props.filter(prop=>!['fence_camp_west','fence_camp_east'].includes(prop.id));
  // Clear the useful side bay; relocated scenery stays beyond every old tier's
  // accepted square, preserving existing foundations/crates during migration.
  const moves=[
    ['prop_camp_frame_l',-16,11],['prop_camp_frame_spread',-17,7],
    ['prop_camp_frame_r',16,11],['prop_camp_frame_tall',17,7],
    ['prop_camp_frame_rocks_l',-15,4],['prop_camp_frame_rocks_r',15,4],
    ['prop_camp_blossom_l',-14.5,9],['prop_camp_blossom_r',14.5,9],
    ['prop_camp_log',-15,12],['prop_camp_flower',-15,2],
    ['prop_camp_grove_l_b',-14,-1],['prop_camp_grove_r_b',14,-1],
  ];
  for(const [id,x,z] of moves){const prop=camp.props.find(p=>p.id===id);if(prop)prop.pos={x,y:getSurfaceHeight(camp.surface,x,z),z};}
  // A material-only work pad uses the existing route renderer. No terrain
  // grading under potentially saved legacy structures; its ID is buildable.
  replace(camp.surface.routes,{id:CAMP_WORKPAD_ROUTE_ID,points:[{x:-5.2,z:6.3},{x:-5.2,z:8.6}],width:4.8,feather:.7,style:'gravel',scatter:false});

  // Reuse existing authored log, fern and mineral forms for three readable
  // clearable bundles. Their finite final-hit state belongs to Camp progress.
  const sources=[['asset_fallen_log','Tangled rootfall','wood','wood',1.2],['asset_fern','Dense ribbon growth','fiber','fiber',1.65],['asset_pebble_cluster','Loose mineral rubble','stone','stone',1.9]];
  CAMP_DEBRIS.forEach((debris,index)=>{
    const [sourceId,name,dropId,feedbackProfile,scale]=sources[index],source=world.visualAssets.find(asset=>asset.id===sourceId);
    if(!source)throw Error(`Missing Camp debris source ${sourceId}`);
    const id=`asset_${debris.id}`,asset=structuredClone(source);asset.id=id;asset.displayName=name;asset.category='Camp clearing';
    const visual=createVisualAssetVisual(asset),box=new THREE.Box3().setFromObject(visual),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    asset.collision={shape:'box',offset:{x:center.x,y:center.y,z:center.z},size:{w:size.x,h:size.y,d:size.z}};
    asset.gameplay={role:'harvestable',harvestable:{dropId,maxChunks:3,respawnSeconds:240,feedbackProfile}};
    replace(world.visualAssets,asset);
    const {x,z}=debris.pos;
    replace(camp.props,{id:debris.id,subtype:'visualAsset',visualAssetId:id,pos:{x,y:getSurfaceHeight(camp.surface,x,z),z},rotY:index*.8,uniformScale:scale,visibleInPlay:true,collisionEnabled:true,opacity:1});
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const target=new URL('../src/world/data/world.json',import.meta.url),world=JSON.parse(fs.readFileSync(target,'utf8'));
  composeCrashlandCamp(world);writeGeneratedFile(target,JSON.stringify(world)+'\n');console.log('Composed defended Camp work pad and clearing sources.');
}
