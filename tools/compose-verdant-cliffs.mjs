import fs from 'node:fs';
import { validateConvexCollider } from '../src/world/convexCollider.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Chris accepted the exact V3 rock style on September 12. V4 is not admitted.
// Frozen source/export provenance lives beside the accepted V3 candidate.
const source=new URL('../art/source/verdant-cliff-kit-v1/candidate-v3/final/',import.meta.url);
export const VERDANT_CLIFF_ASSETS=Object.freeze([
  {role:'toe',name:'verdant-cliff-toe',label:'Cliff foot'},
  {role:'buttress',name:'verdant-cliff-buttress',label:'Stepped cliff rock'},
  {role:'ledge',name:'verdant-cliff-ledge',label:'Rock shelf'},
]);
const assetId=name=>`asset_${name.replaceAll('-','_')}`;
const replace=(list,item)=>{const i=list.findIndex(value=>value.id===item.id);if(i<0)list.push(item);else list[i]=item;};

// Three joined eastern fronts use the accepted kit as landform dressing rather
// than punctuation beside the graded routes. Whole-rock hulls intentionally
// close small fissures/underhangs; these are not walk-under arches.
// x,z,scale,yaw. Low pieces taper masses back into the terrain.
export const VERDANT_CLIFF_PLACEMENTS=Object.freeze([
  ['shore_stone_a','toe',-50,11,1.3,-.2],
  ['shore_stone_b','ledge',-47,-15,1.2,2.4],
  ['mossling_gap_stone','toe',-35,5,1,-.5],
  // Lower south face: a 10m run below the ascent, with a low outer toe.
  ['east_toe_stone','toe',25.2,21.3,1.28,.38],
  ['east_face_stone_a','buttress',29.1,21.4,1.34,.24],
  ['cliff_lower_shoulder','buttress',31.4,19.1,1.3,-.04],
  ['east_face_stone_e','buttress',34.0,18.3,1.22,-.22],
  // Middle west face: a continuous 12m wall with the toe tucked into its seam.
  ['east_face_stone_b','buttress',28.7,3.1,1.58,-Math.PI/2+.08],
  ['cliff_west_foot','toe',27.2,.2,1.34,-1.28],
  ['east_face_stone_c','buttress',29.1,-2.0,1.56,-Math.PI/2+.1],
  ['east_face_stone_d','ledge',29.7,-6.4,1.46,-Math.PI/2+.28],
  // Outer shelf: three interlocking pieces turn toward the crest, leaving ore clear.
  ['shelf_stone','buttress',52.0,-3.0,1.5,Math.PI/2-.18],
  ['cliff_outer_shoulder','buttress',56.0,-1.5,1.38,Math.PI/2+.05],
  ['cliff_outer_foot','toe',57.2,2.4,1.16,.74],
  ['overlook_stone','toe',23,-13,.9,-.2],
  ['rootfall_west_outcrop','buttress',-15,-28,1.35,.6],
  ['rootfall_east_outcrop','buttress',15,-28,1.35,-.6],
  ['lookout_rest_stone','toe',-10.5,11,.85,.18],
]);

export function composeVerdantCliffs(world){
  const region=world.regions.find(value=>value.id==='section_1');
  if(!region)throw Error('Verdant cliff dressing requires section_1');
  const byRole=new Map();
  for(const spec of VERDANT_CLIFF_ASSETS){
    const collision=validateConvexCollider(JSON.parse(fs.readFileSync(new URL(`${spec.name}-collider.json`,source),'utf8')),spec.name);
    const asset={id:assetId(spec.name),displayName:spec.label,category:'Verdant cliffs',version:1,parts:[],gameplay:{role:'prop'},
      model:{path:`assets/models/${spec.name}-v1/model.glb`,scale:1,pivot:{x:0,y:0,z:0}},collision};
    replace(world.visualAssets,asset);byRole.set(spec.role,asset);
  }
  for(const [suffix,role,x,z,scale,yaw] of VERDANT_CLIFF_PLACEMENTS){
    const asset=byRole.get(role),vertices=asset.collision.vertices,c=Math.cos(yaw),s=Math.sin(yaw);
    // Sink the footprint into the lowest surrounding support rather than
    // perching an entire rock on its center's sloping terrain sample.
    let floor=getSurfaceHeight(region.surface,x,z);
    for(let i=0;i<vertices.length;i+=3){
      const px=vertices[i]*scale,pz=vertices[i+2]*scale;
      floor=Math.min(floor,getSurfaceHeight(region.surface,x+px*c+pz*s,z-px*s+pz*c));
    }
    replace(region.props,{id:`prop_verdant_${suffix}`,subtype:'visualAsset',visualAssetId:asset.id,
      pos:{x,y:Number((floor-.12).toFixed(4)),z},rotY:yaw,uniformScale:scale,
      visibleInPlay:true,collisionEnabled:true,opacity:1});
  }
  return world;
}
