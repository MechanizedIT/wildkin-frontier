import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {makeMeshKit} from '../src/world/facetedMeshKit.js';
import * as THREE from 'three';
import {meshRecipePart} from './mesh-recipe.mjs';

export const FEN_BANK_RECIPE_ASSET_IDS=Object.freeze(['asset_fen_bank_frond']);

export const FEN_BANK_OUTCROPS=Object.freeze([
 {name:'left',x:18.8,z:5.2,w:4.2,d:4,h:1.6},
 {name:'right',x:27.3,z:8.5,w:4.4,d:3.4,h:2},
]);
const MODELS={left:{w:3.3,h:.85,d:2.8},right:{w:2.6,h:1.6,d:2.5}};
export const FEN_BANK_COMPONENTS=Object.freeze([
 {id:'outcrop_left',model:'left',x:19.15,z:5.8,scale:1},
 {id:'outcrop_left_shoulder',model:'right',x:18.15,z:4.7,scale:1},
 {id:'outcrop_right',model:'right',x:27.65,z:8.4,scale:1.25},
 {id:'outcrop_right_ledge',model:'left',x:26.3,z:9.05,scale:.72},
].map(part=>Object.freeze({...part,w:MODELS[part.model].w*part.scale,d:MODELS[part.model].d*part.scale,h:MODELS[part.model].h*part.scale})));
const PREFIX='fen_bank_';
export function getFootSamples(s,collision){const p=[];for(let i=0;i<collision.vertices.length;i+=3)if(collision.vertices[i+1]===0)p.push([s.x+collision.vertices[i]*s.scale,s.z+collision.vertices[i+2]*s.scale]);const samples=[...p];for(let ix=0;ix<=24;ix++)for(let iz=0;iz<=24;iz++){const x=s.x-s.w/2+s.w*ix/24,z=s.z-s.d/2+s.d*iz/24;let sign=0,inside=true;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],cross=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(cross)<1e-8)continue;const next=Math.sign(cross);if(sign&&sign!==next){inside=false;break;}sign=next;}if(inside)samples.push([x,z]);}return samples;}
function supportBottom(surface,s,collision){return Number((Math.min(...getFootSamples(s,collision).map(([x,z])=>getSurfaceHeight(surface,x,z)))-.08).toFixed(4));}
function foldedFan(length,width,bend){const p=[],faces=[],rim=[];const rows=[[0,.05],[.28,.72],[.58,1],[.83,.64],[1,.08]];for(const [s,w]of rows){const y=s*length,z=bend*s*s;p.push(-w*width,y,z,0,y,z+.13*w,w*width,y,z,0,y,z-.075*w);rim.push(w*width,y,z,w*width*.76,y,z+.13*w*.24);}for(let j=0;j<4;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4;faces.push(a,b,a+4,b,b+4,a+4);}faces.push(0,3,2,0,2,1,16,17,18,16,18,19);const make=(pos,index)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();return g;};const edge=[];for(let j=0;j<4;j++){const a=j*2;edge.push(a,a+2,a+1,a+1,a+2,a+3);}return{body:make(p,faces),rim:make(rim,edge)};}
function frondParts(){const kit=makeMeshKit();for(let i=0;i<7;i++){const angle=(i-3)*.81,blade=foldedFan([1.05,1.56,1.82,2.02,1.64,1.32,.92][i],.32+(i%2)*.035,.33+(i%3)*.11),pos=[Math.sin(angle)*.12,.01,Math.cos(angle)*.1],rot=[.06+(i%3)*.13,angle,(i-3)*.18];kit.mesh(`fold_${i}`,blade.body,i%2?'#79934a':'#628342',pos,rot);kit.mesh(`edge_${i}`,blade.rim,'#cfb85a',pos,rot);}kit.group.updateMatrixWorld(true);return kit.group.children.map((m,i)=>meshRecipePart(`blade_${i}`,m));}
function upsert(list,item){const i=list.findIndex(x=>x.id===item.id);if(i<0)list.push(item);else list[i]=item;}
export function composeShatterfenBank(world){
 const region=world.regions.find(r=>r.id==='section_2');if(!region?.surface)throw Error('Fen bank requires existing terrain');
 const surface=region.surface,spur=surface.routes.find(r=>r.id==='observatory-island-spur');if(!spur)throw Error('Fen bank requires observatory spur');
 // No height/elevation/water changes: these are paint-only route footprints.
 spur.style='gravel';
 surface.routes=surface.routes.filter(r=>!r.id.startsWith(PREFIX));
 surface.routes.push(
  {id:PREFIX+'approach',style:'gravel',scatter:false,points:[{x:19.2,z:12.8},{x:20.9,z:9.8},{x:22.9,z:8}],width:2.4},
  {id:PREFIX+'apron',style:'gravel',scatter:false,points:[{x:23.9,z:9.6},{x:25.2,z:8.4}],width:1.7},
  {id:PREFIX+'receiver',style:'gravel',scatter:false,points:[{x:20.4,z:8.2},{x:19.8,z:6.9},{x:20.9,z:6.5}],width:1.5},
  {id:PREFIX+'resource_skirt',style:'gravel',scatter:false,points:[{x:24.8,z:10.5},{x:26.2,z:12.8}],width:1.5},
 );
 const prop=(id,assetId,x,z,scale=1,yaw=0,solid=false,y=getSurfaceHeight(surface,x,z))=>({id:'prop_'+PREFIX+id,subtype:'visualAsset',visualAssetId:assetId,pos:{x,y,z},rotY:yaw,uniformScale:scale,visibleInPlay:true,collisionEnabled:solid,opacity:1});
 for(const [name,s] of Object.entries(MODELS)){
  const assetId='asset_'+PREFIX+'outcrop_'+name;
  const collision=JSON.parse(readFileSync(new URL(`../art/source/fen-bank-outcrop-${name}-v1/collider.json`,import.meta.url),'utf8'));
  upsert(world.visualAssets,{id:assetId,displayName:`Fen bank ${name==='left'?'low ledge':'high shoulder'}`,category:'Alien ecology',version:1,parts:[],gameplay:{role:'prop'},collision,model:{path:`assets/models/fen-bank-outcrop-${name}-v1/model.glb`,scale:1,pivot:{x:0,y:0,z:0}}});
 }
 for(const part of FEN_BANK_COMPONENTS){const assetId='asset_'+PREFIX+'outcrop_'+part.model;upsert(region.props,prop(part.id,assetId,part.x,part.z,part.scale,0,true,supportBottom(surface,part,world.visualAssets.find(a=>a.id===assetId).collision)));}
 const monolith=region.props.find(p=>p.id==='prop_s2_observatory_stone_r');if(monolith)monolith.pos={x:31,y:getSurfaceHeight(surface,31,6.8),z:6.8};
 upsert(world.visualAssets,{id:'asset_'+PREFIX+'frond',displayName:'Fen folded bank frond',category:'Alien ecology',version:1,parts:frondParts(),gameplay:{role:'prop'},collision:null});
 for(const [i,[x,z,scale,yaw]] of [[19.2,10.5,.9,.4],[20.2,5.6,.68,2.1],[26.2,10.7,.8,-.8],[25.8,3.3,.68,1.4]].entries())upsert(region.props,prop('frond_'+i,'asset_'+PREFIX+'frond',x,z,scale,yaw));
 for(const [i,[x,z,scale,yaw]] of [[20,8.1,.5,.3],[20.3,8.35,.32,1.2],[19.8,8.5,.38,2.1],[24.7,10.2,.45,.2],[25.1,10.3,.3,.6],[24.9,10.6,.36,1.5],[25.2,6.5,.52,.9],[25.5,6.8,.35,2.4],[24.9,6.6,.31,.6],[25.3,6.15,.26,1.9]].entries())upsert(region.props,prop('pebbles_'+i,'asset_pebble_cluster',x,z,scale,yaw));
 return world;
}
import {readFileSync} from 'node:fs';
