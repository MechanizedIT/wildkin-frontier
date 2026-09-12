import fs from 'node:fs';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {validateConvexCollider} from '../src/world/convexCollider.js';
import {FIELD_PACK_CARTRIDGE_ID} from '../src/base/fieldPackConfig.js';

export const SURVEY_RECOVERY = Object.freeze({sectionId:'section_1',chestId:'chest_survey_cartridge',lootTableId:'loot_survey_cartridge',x:7,z:23,yaw:-Math.PI/2});
const revision='v2';
const replace=(list,item)=>{const i=list.findIndex(v=>v.id===item.id);if(i<0)list.push(item);else list[i]=item;};
const point=([x,y,z])=>({x,y,z});

// The ramp has eight authored corners, not collision extracted from the mesh.
// Orient each face outward so both Author proxies and Rapier share the wedge.
export function surveyCollider(source){
  if(source.kind==='box')return {shape:'box',offset:point(source.center),size:{w:source.size[0],h:source.size[1],d:source.size[2]}};
  if(source.kind!=='convex-prism'||source.axis!=='X')throw Error('Unsupported survey collision source');
  const n=source.polygonYZ.length,points=source.range.flatMap(x=>source.polygonYZ.map(([y,z])=>[x,y,z])),indices=[];
  const center=points.reduce((a,p)=>a.map((v,i)=>v+p[i]/points.length),[0,0,0]);
  const triangle=(a,b,c)=>{const p=points[a],q=points[b],r=points[c],u=q.map((v,i)=>v-p[i]),v=r.map((w,i)=>w-p[i]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(normal.reduce((sum,w,i)=>sum+w*(p[i]-center[i]),0)<0)indices.push(a,c,b);else indices.push(a,b,c);
  };
  for(let i=1;i<n-1;i++){triangle(0,i,i+1);triangle(n,n+i,n+i+1);}
  for(let i=0;i<n;i++){const j=(i+1)%n;triangle(i,j,n+j);triangle(i,n+j,n+i);}
  return validateConvexCollider({shape:'convexHull',offset:{x:0,y:0,z:0},vertices:points.flat(),indices},'Survey ramp');
}

export function composeSurveyRecovery(world){
  const region=world.regions.find(r=>r.id===SURVEY_RECOVERY.sectionId);
  const manifest=JSON.parse(fs.readFileSync(new URL(`../art/source/survey-module-v1/candidate-${revision}/manifest.json`,import.meta.url),'utf8'));
  const {x,z,yaw,chestId,lootTableId}=SURVEY_RECOVERY,y=getSurfaceHeight(region.surface,x,z);
  const shell=['survey-left-wall','survey-right-wall','survey-rear-wall','survey-floor','survey-ramp'];
  const positions={'survey-panel-debris':{x:-1.7,z:25.5,yaw:.35},'survey-cargo-frame':{x:1.1,z:21.2,yaw:-.45}};
  for(const name of [...shell,...Object.keys(positions)]){
    const id=`asset_${name.replaceAll('-','_')}`,source=manifest.colliders[name];
    if(!source)throw Error(`Missing reviewed collider for ${name}`);
    const collision=surveyCollider(source),sockets=manifest.components[name]?.groundSockets??[];
    // Deliberately simple body/socket box: the six low feet project only .12m
    // into the wall-side margin. The 3.2m central entry stays fully open. Roof
    // remnants are decorative overhead geometry, not climbable platforms.
    if(sockets.length){
      const min=source.center.map((v,i)=>v-source.size[i]/2),max=source.center.map((v,i)=>v+source.size[i]/2);
      for(const socket of sockets)for(let i=0;i<3;i++){min[i]=Math.min(min[i],socket.min[i]);max[i]=Math.max(max[i],socket.max[i]);}
      collision.offset=point(min.map((v,i)=>(v+max[i])/2));collision.size={w:max[0]-min[0],h:max[1]-min[1],d:max[2]-min[2]};
    }
    replace(world.visualAssets,{id,displayName:name.replace('survey-','Survey ').replaceAll('-',' '),category:'Survey wreck components',version:1,parts:[],gameplay:{role:'prop'},
      model:{path:`assets/models/${name}-${revision}/model.glb`,scale:1,pivot:{x:0,y:0,z:0}},collision});
    const p=positions[name],pos=p?{x:p.x,y:getSurfaceHeight(region.surface,p.x,p.z),z:p.z}:{x,y,z};
    replace(region.props,{id:`prop_${name.replaceAll('-','_')}`,subtype:'visualAsset',visualAssetId:id,pos,rotY:p?.yaw??yaw,uniformScale:1,visibleInPlay:true,collisionEnabled:true,opacity:1});
  }
  const local=manifest.chestFixture.position,c=Math.cos(yaw),s=Math.sin(yaw);
  replace(region.lootChests,{id:chestId,displayName:'Survey supply chest',pos:{x:x+local[0]*c+local[2]*s,y:y+local[1],z:z-local[0]*s+local[2]*c},
    rotY:yaw+(manifest.chestFixture.yaw??0),lootTableId,refillSeconds:null,triggerRadius:1.6,secret:false,visualAssetId:'asset_chest',uniformScale:1,collisionEnabled:true});
  replace(world.lootTables,{id:lootTableId,displayName:'Recovered field-pack cartridge',rewards:[{type:'item',id:FIELD_PACK_CARTRIDGE_ID,amount:1}]});
  // Paint only: the existing flat arrival ground stays authoritative for old
  // saves and traversal. Clear grass inside the hull and lead in from the trail.
  replace(region.surface.routes,{id:'survey-wreck-footprint',style:'gravel',scatter:false,points:[{x:6.3,z:23},{x:7.7,z:23}],width:5.8,feather:.3});
  replace(region.surface.routes,{id:'survey-wreck-approach',style:'gravel',scatter:false,points:[{x:-.1,z:24.5},{x:1.2,z:23.4},{x:3.5,z:23}],width:2.6,feather:.5});
  return world;
}
