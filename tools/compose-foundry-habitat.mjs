import { makeMeshKit, chippedBox, facetedRings } from '../src/world/facetedMeshKit.js';
import { getSurfaceHeight, getPathDistance, getRouteDistance } from '../src/world/terrainSurfaceModel.js';
import { meshRecipePart } from './mesh-recipe.mjs';

// Build-time composition, after composeOvernightHabitats. No runtime hooks,
// filesystem writes, new rewards or changed existing gameplay instance IDs.
const PREFIX = 'foundry_habitat_';
export const FOUNDRY_HABITAT_ASSET_IDS = Object.freeze([
  'asset_foundry_habitat_shelf_0', 'asset_foundry_habitat_shelf_1',
  'asset_foundry_habitat_shelf_2', 'asset_foundry_habitat_shelf_3',
  'asset_foundry_habitat_shelf_4', 'asset_foundry_habitat_shelf_5',
  'asset_foundry_habitat_mineral_grove', 'asset_foundry_habitat_recess_left',
  'asset_foundry_habitat_recess_right', 'asset_foundry_habitat_recess_back',
  'asset_foundry_habitat_recess_lintel', 'asset_foundry_habitat_ground_details',
]);
const C = { basalt: '#49424d', plum: '#594a53', top: '#71606a', dark: '#29252e',
  mineral: '#503c3c', tip: '#e88539', tipLight: '#eeaa50', cushion: '#80553e',
  cushionTop: '#ab7043', gravel: '#8e7b69', gravelLight: '#b29a7b' };

export const FOUNDRY_SHELVES = Object.freeze([
  // x,z,width,height,depth,yaw; chunky sides frame, never divide, the return.
  [-35.8,-10.8,6.8,2.8,5.4,.14], [-37.9,-18.1,7.6,3.5,5.8,-.16],
  [-16.2,-18.9,5.8,2.5,4.8,.18], [-14.8,-24.0,6.0,3.2,4.8,-.19],
  [-36.8,-30.9,7.8,3.4,5.4,.12], [-31.7,-42.2,8.6,4.0,5.8,-.13],
]);
const GROVES = [
  [-30.7,-9.3,1.15,.7],[-31.6,-18.7,1.0,-.4],[-18,-14,.9,.2],
  [-20.8,-23,1.0,1.1],[-31,-30.7,1.2,.6],[-20.2,-33.3,.85,-.5],
  [-31.5,-36.3,1.05,.3],
];
const CUSHIONS = [
  [-31,-8,1.9],[-32,-15,1.5],[-31,-19,1.2],[-24,-7,1.0],
  [-24,-17,1.3],[-19,-17,1.2],[-19,-21,1.5],[-20,-28,1.2],
  [-33,-28,1.6],[-32,-34,1.4],[-22,-35,1.0],[-29,-40,1.5],
  [-30.7,-5.8,1.5],[-29.6,-13.5,1.3],[-23,-18.5,1.1],[-22,-22,1.4],
  [-28,-27.5,1.1],[-24,-28,1.3],[-19.8,-29.7,1.2],[-21.7,-8.1,1.15],
  [-18.8,-5.8,1.1],[-32,-24.5,1.25],[-33.1,-35.7,1.4],[-19,-35.5,1.4],
];
const HILLS = [
  {id:`${PREFIX}west_back`,x:-38,z:-16,rx:7.2,rz:12,height:3.6,plateau:.5},
  {id:`${PREFIX}east_fold`,x:-15,z:-22,rx:5.2,rz:7.2,height:2.3,plateau:.35},
  {id:`${PREFIX}rear_fold`,x:-34,z:-43,rx:10,rz:7,height:3.8,plateau:.45},
];
const propId = name => `prop_${PREFIX}${name}`;
const assetId = name => `asset_${PREFIX}${name}`;
const round = n => Number(n.toFixed(4));

function bake(name, kit, collision = null) {
  const parts=[];
  kit.group.traverse(mesh=>{if(mesh.isMesh)parts.push(meshRecipePart(mesh.name,mesh));});
  kit.group.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.dispose();});
  const materials=new Set();kit.group.traverse(mesh=>{if(mesh.isMesh)materials.add(mesh.material);});
  for(const material of materials)material.dispose();
  return {id:assetId(name),displayName:`Foundry ${name.replaceAll('_',' ')}`,category:'Ember Habitat',version:1,parts,collision,gameplay:{role:'prop'}};
}
function boxCollision(w,h,d,y=0) {return {shape:'box',offset:{x:0,y,z:0},size:{w,h,d}};}
function mass(name,w,h,d,color,seed,bottom=-.35) {
  const k=makeMeshKit();
  const top=h-.35,solidHeight=top-bottom,center=(top+bottom)/2;
  if(name.startsWith('shelf_')) {
    // Shared dark interior joins the fractured front/back columns. The uneven
    // column crowns and a narrower high rear tier create an actual setback,
    // rather than a small cap on one enormous chamfered box.
    const coreTop=bottom+solidHeight*.68;
    k.mesh('joined_lower_stratum',chippedBox(w*.94,coreTop-bottom,d*.82,seed),color,[0,(bottom+coreTop)/2,0]);
    const pattern=[.72,.86,.67,.8,.75];
    for(let row=0;row<2;row++)for(let i=0;i<5;i++){
      const cell=w/5,x=-w*.5+cell*(i+.5),z=(row?-.24:.24)*d;
      const level=Math.min(.96,pattern[(i+seed)%5]+(row?.12:0));
      const crown=bottom+solidHeight*level,rx=cell*(i%2?.55:.5),rz=d*(i%2?.23:.22);
      k.mesh(`basalt_column_${row}_${i}`,facetedRings([[bottom,rx*.92,rz*.95],[bottom+solidHeight*.36,rx,rz],[crown-.18,rx*.91,rz*.96],[crown,rx*.8,rz*.84]],6),[color,C.plum,C.basalt,C.top][(i+row+seed)%4],[x,0,z]);
      // A matte exposed seam, not an emissive mineral/harvest signal.
      const seamY=bottom+solidHeight*(.32+(i%3)*.06);
      k.mesh(`stratum_lip_${row}_${i}`,chippedBox(cell*.9,.10,d*.32,seed+i),C.top,[x,seamY,z+(row?-.02:.02)*d]);
    }
    const upperHeight=solidHeight*.31;
    k.mesh('upper_setback',chippedBox(w*.57,upperHeight,d*.48,seed+5),C.plum,[-w*.035,top-upperHeight/2,-d*.11]);
  } else {
    k.mesh('chipped_basalt',chippedBox(w,solidHeight,d,seed),color,[0,center,0]);
    k.mesh('weathered_top',chippedBox(w*.7,.13,d*.68,seed+3),C.top,[w*.035,h-.36,-d*.025]);
  }
  return bake(name,k,boxCollision(w,solidHeight,d,center));
}
function mineralGrove() {
  const k=makeMeshKit();
  const branches=[[-.64,.04,.05,1.15,.31,-.23],[.05,0,-.18,1.85,.38,.05],[.66,0,.16,1.3,.27,.3],[-.17,0,.51,.82,.25,-.15]];
  branches.forEach(([x,y,z,h,r,tilt],i)=>{
    const yaw=i*.71;
    k.mesh(`mineral_stalk_${i}`,facetedRings([[0,r*1.2],[h*.73,r*.82],[h,r*.18]],5),C.mineral,[x,y,z],[0,yaw,tilt]);
    k.mesh(`terminal_plate_${i}`,facetedRings([[0,r*.84],[h*.16,r*.72],[h*.32,r*.03]],5),i%2?C.tip:C.tipLight,[x-Math.sin(tilt)*h*.66,y+h*.66,z],[0,yaw,tilt]);
  });
  k.mesh('root_crust',chippedBox(1.9,.24,1.3,2),C.cushion,[0,.08,0]);
  // Decorative geology is not a harvestable crystal copy; short orange caps,
  // branching dark stems and matte root crust make a separate silhouette.
  return bake('mineral_grove',k);
}

function groundDetails(region,protectedPoints) {
  const k=makeMeshKit(),surface=region.surface;
  const safe=(x,z,r=.2)=>protectedPoints.every(p=>Math.hypot(x-p.x,z-p.z)>p.radius+r);
  for(const [index,[x,z,s]] of CUSHIONS.entries())for(let i=0;i<6;i++){
    const a=i*2.4+index*.3,px=x+Math.cos(a)*s*.55,pz=z+Math.sin(a)*s*.45;
    if(!safe(px,pz,.5)||getPathDistance(surface,px,pz)<.3)continue;
    // Low blunt lobes with capped facets; no stems, leaf cards or petals.
    k.mesh(`cushion_${index}_${i}`,facetedRings([[0,.33*s,.26*s],[.15*s,.4*s,.3*s],[.28*s,.16*s,.12*s]],6),i%2?C.cushion:C.cushionTop,[px,getSurfaceHeight(surface,px,pz)-.035,pz],[0,a,0]);
  }
  const route=surface.routes.find(r=>r.id==='foundry-return');
  let sampleIndex=0;
  for(let segment=1;segment<route.points.length;segment++){
    const a=route.points[segment-1],b=route.points[segment],len=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(len/.6),nx=-(b.z-a.z)/len,nz=(b.x-a.x)/len;
    for(let sideIndex=0;sideIndex<2;sideIndex++){
      const side=sideIndex?1:-1;
      for(let i=0;i<=steps;i++){
        const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        const outer=route.width/2+.24+.24*Math.sin((sampleIndex+i)*.73)+.12*Math.cos(i*1.3+segment);
        // No flat ribbon: analytic terrain and the .7m rendered triangles do
        // not share a plane between sample points. Use embedded solid gravel
        // with enough thickness to straddle that small interpolation error.
        if(i%3===0){const px=x+nx*side*(outer+.1),pz=z+nz*side*(outer+.1),size=.27+(i%4)*.065;if(safe(px,pz,.25))k.mesh(`gravel_${segment}_${sideIndex}_${i}`,chippedBox(size,.18,size*.72,i+segment),i%3?C.gravel:C.gravelLight,[px,getSurfaceHeight(surface,px,pz)+.025,pz],[0,i*.73,0]);}
      }
    }
    sampleIndex+=steps;
  }
  return bake('ground_details',k);
}

export function composeFoundryHabitat(world) {
  const region=world.regions.find(r=>r.id==='section_3');
  if(!region?.surface)throw new Error('Foundry habitat needs authored section_3 surface');
  for(const id of ['prop_s3_shrine_ore','prop_s3_barrier'])if(!region.props.some(p=>p.id===id))throw new Error(`Foundry habitat missing ${id}`);
  if(!region.lootChests.some(p=>p.id==='chest_emberhorn_secret'))throw new Error('Foundry habitat missing existing western cache');
  if(!region.surface.routes.some(r=>r.id==='foundry-return'))throw new Error('Foundry habitat missing return route');
  // Replace only owned IDs. All existing instance transforms/rewards remain.
  region.props=region.props.filter(p=>!p.id.startsWith(`prop_${PREFIX}`));
  world.visualAssets=world.visualAssets.filter(a=>!a.id.startsWith(`asset_${PREFIX}`));
  region.surface.heights=region.surface.heights.filter(h=>!h.id.startsWith(PREFIX));
  region.surface.heights.push(...structuredClone(HILLS));
  region.surface.detail={...region.surface.detail,groundcover:'mineral'};
  Object.assign(region.surface.palette,{path:'#8f7c65',pathEdge:'#8d7965',rock:'#69555b'});
  const route=region.surface.routes.find(r=>r.id==='foundry-return');
  route.points=[[-6,2],[-13,.4],[-20,-1.7],[-25,-4],[-25.9,-9.6],[-27.9,-15.1],[-29,-23],[-24.4,-27],[-17.8,-29.5],[-12,-34],[0,-45]].map(([x,z])=>({x,z}));
  // The 2.35m corridor remains; gravel/cushion distribution varies its shoulders.
  route.width=2.35;
  const add=(name,asset,x,z,scale=1,yaw=0,collision=false)=>{
    region.props.push({id:propId(name),subtype:'visualAsset',visualAssetId:asset,pos:{x,y:round(getSurfaceHeight(region.surface,x,z)),z},rotY:yaw,uniformScale:scale,visibleInPlay:true,collisionEnabled:collision,opacity:1});
  };
  FOUNDRY_SHELVES.forEach(([x,z,w,h,d,yaw],i)=>{
    const centerHeight=getSurfaceHeight(region.surface,x,z);let low=centerHeight;
    // Extend each ledge down into the lowest sampled support across its rotated
    // footprint. Center-only ground snapping leaves visible air under a slope.
    for(let ix=0;ix<=8;ix++)for(let iz=0;iz<=8;iz++){
      const lx=(ix/8-.5)*w,lz=(iz/8-.5)*d;
      low=Math.min(low,getSurfaceHeight(region.surface,x+Math.cos(yaw)*lx+Math.sin(yaw)*lz,z-Math.sin(yaw)*lx+Math.cos(yaw)*lz));
    }
    const name=`shelf_${i}`;world.visualAssets.push(mass(name,w,h,d,i%2?C.plum:C.basalt,i,low-centerHeight-.25));add(name,assetId(name),x,z,1,yaw,true);
  });
  world.visualAssets.push(mineralGrove());
  GROVES.forEach(([x,z,s,yaw],i)=>add(`grove_${i}`,assetId('mineral_grove'),x,z,s,yaw));
  // ONE recessed landmark behind the unchanged Emberhorn Den. Separate box
  // descriptors leave a real open passage; no all-in-one invisible arch wall.
  const masonry=[['recess_left',-28.5,-37,1.8,3.6,3.2,C.basalt],['recess_right',-21.5,-37,1.8,3.3,3.2,C.plum],['recess_back',-25,-39.1,8.8,4.1,1.1,C.dark]];
  for(const[name,x,z,w,h,d,color]of masonry){world.visualAssets.push(mass(name,w,h,d,color,4));add(name,assetId(name),x,z,1,0,true);}
  const lintel=makeMeshKit();lintel.mesh('split_lintel',chippedBox(8.8,.85,3.4,7),C.plum,[0,3.35,0]);
  lintel.mesh('single_socket',chippedBox(.32,.38,.09,2),C.tip,[0,2.65,-1.4]);
  world.visualAssets.push(bake('recess_lintel',lintel,boxCollision(8.8,.85,3.4,3.35)));
  add('recess_lintel',assetId('recess_lintel'),-25,-37,1,0,true);
  const protectedPoints=[
    ...region.lootChests.map(p=>({...p.pos,radius:2.2})),...region.extractionBeacons.map(p=>({...p.pos,radius:2.2})),
    ...region.props.filter(p=>world.visualAssets.find(a=>a.id===p.visualAssetId)?.gameplay?.role==='harvestable').map(p=>({...p.pos,radius:2.6})),
    ...region.props.filter(p=>world.visualAssets.find(a=>a.id===p.visualAssetId)?.gameplay?.role==='wildkin').map(p=>({...p.pos,radius:4})),
    ...region.props.filter(p=>p.id.startsWith(`prop_${PREFIX}`)&&p.collisionEnabled).map(p=>{const c=world.visualAssets.find(a=>a.id===p.visualAssetId).collision;return {...p.pos,radius:Math.hypot(c.size.w,c.size.d)/2+.15};}),
  ];
  world.visualAssets.push(groundDetails(region,protectedPoints));
  // Details contain world-space, terrain-sampled vertices and therefore use a
  // zero origin, not the local terrain height at (0,0).
  add('ground_details',assetId('ground_details'),0,0);region.props.at(-1).pos.y=0;
  return world;
}

export function summarizeFoundryHabitat(world) {
  const region=world.regions.find(r=>r.id==='section_3'),assets=world.visualAssets.filter(a=>a.id.startsWith(`asset_${PREFIX}`)),props=region.props.filter(p=>p.id.startsWith(`prop_${PREFIX}`));
  const tris=a=>a.parts.reduce((n,p)=>n+(p.geometry?.indices.length??0)/3,0);
  return {region:region.id,newRoots:props.length,solidRoots:props.filter(p=>p.collisionEnabled).length,newAssets:assets.length,uniqueTriangles:assets.reduce((n,a)=>n+tris(a),0),instantiatedTriangles:props.reduce((n,p)=>n+tris(assets.find(a=>a.id===p.visualAssetId)),0),placements:props.map(p=>({id:p.id,pos:p.pos,asset:p.visualAssetId,solid:p.collisionEnabled})),minimumGroveRouteShoulder:Math.min(...props.filter(p=>p.id.includes('grove_')).map(p=>getRouteDistance(region.surface.routes.find(r=>r.id==='foundry-return'),p.pos.x,p.pos.z)-p.uniformScale))};
}
