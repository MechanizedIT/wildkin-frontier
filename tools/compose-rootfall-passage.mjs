import fs from 'node:fs';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {validateConvexCollider} from '../src/world/convexCollider.js';
import {ROOTFALL_CONFIG} from '../src/world/rootfallConfig.js';

export const ROOTFALL_ASSEMBLY = Object.freeze({x:0,z:-31,yaw:0});
const replace=(list,item)=>{const i=list.findIndex(v=>v.id===item.id);if(i<0)list.push(item);else list[i]=item;};
const assetId=name=>`asset_${name.replaceAll('-','_')}`;

// V4 geometry candidate under native review. Persistent state stays with the existing gate/cut owners.
export function composeRootfallPassage(world){
  const region=world.regions.find(r=>r.id===ROOTFALL_CONFIG.sectionId);
  const gate=region?.portalGates.find(g=>g.id===ROOTFALL_CONFIG.gateId);
  if(!region||!gate)throw Error('Rootfall requires its existing region and linked gate');
  if(!world.visualAssets.some(a=>a.id==='asset_path_lantern'))throw Error('Rootfall requires the existing path lantern');
  const manifest=JSON.parse(fs.readFileSync(new URL('../art/source/rootfall-v1/candidate-v4/manifest.json',import.meta.url),'utf8'));
  const {x,z,yaw}=ROOTFALL_ASSEMBLY,y=getSurfaceHeight(region.surface,x,z);
  const props=[['rootfall-left',ROOTFALL_CONFIG.props.left],['rootfall-right',ROOTFALL_CONFIG.props.right],
    ['rootfall-center',ROOTFALL_CONFIG.props.middle],['rootfall-brace-left',ROOTFALL_CONFIG.props.braceLeft],['rootfall-brace-right',ROOTFALL_CONFIG.props.braceRight]];
  for(const [name,id] of props){
    const collision=validateConvexCollider(structuredClone(manifest.colliders[name]),name);
    replace(world.visualAssets,{id:assetId(name),displayName:name.replaceAll('-',' '),category:'Rootfall passage',version:1,parts:[],
      gameplay:{role:'prop'},model:{path:`assets/models/${name}-v1/model.glb`,scale:1,pivot:{x:0,y:0,z:0}},collision});
    replace(region.props,{id,subtype:'visualAsset',visualAssetId:assetId(name),pos:{x,y,z},rotY:yaw,uniformScale:1,
      visibleInPlay:!name.includes('brace'),collisionEnabled:true,opacity:1});
  }
  const seamName='rootfall-seam';
  replace(world.visualAssets,{id:assetId(seamName),displayName:'Rootfall working notch',category:'Rootfall passage',version:1,parts:[],
    model:{path:`assets/models/${seamName}-v1/model.glb`,scale:1,pivot:{x:0,y:0,z:0}},
    collision:{shape:'box',...structuredClone(manifest.seams.targetBox)},
    gameplay:{role:'harvestable',harvestable:{dropId:'wood',maxChunks:3,respawnSeconds:240,feedbackProfile:'wood'}}});
  ROOTFALL_CONFIG.cutIds.forEach((id,i)=>{
    const local=manifest.seams.positions[i];
    replace(region.props,{id,subtype:'visualAsset',visualAssetId:assetId(seamName),pos:{x:x+local[0],y:y+local[1],z:z+local[2]},
      rotY:0,uniformScale:1,visibleInPlay:true,collisionEnabled:false,opacity:1});
  });
  region.props=region.props.filter(p=>!['prop_s1_rootfall_l','prop_s1_rootfall_r'].includes(p.id));
  // Keep the exact gate transform, destinations, state and reciprocal landing.
  // The admitted narrow lantern is ~1.56m tall and .6m wide at scale1.
  gate.displayName='Rootfall Passage';gate.visualAssetId='asset_path_lantern';gate.uniformScale=1;
  gate.requirements={...gate.requirements,resources:{...ROOTFALL_CONFIG.braceCost}};
  delete gate.requirements.minPlayerLevel;
  replace(region.surface.routes,{id:'rootfall-approach',style:'gravel',scatter:false,
    points:[{x:0,z:-26.5},{x:0,z:-29.4}],width:3,feather:.45});
  return world;
}
