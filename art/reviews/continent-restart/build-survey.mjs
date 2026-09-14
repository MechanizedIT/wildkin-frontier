// Read-only review artifact. Run from repository root; never imports gameplay/save owners.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { WORLD_DATA } from '../../../src/world/data/world.js';
import { createTerrainColorSampler } from '../../../src/presentation/authoredTerrain.js';
import { getSurfaceHeight } from '../../../src/world/terrainSurfaceModel.js';
import { sampleFrontier } from '../../../src/world/frontierTerrain.js';
import { sampleFrontierContinent } from '../../../src/world/frontierContinent.js';
import { FRONTIER_REGION_CATALOG } from '../../../src/world/frontierRegionCatalog.js';
import { DEFAULT_FRONTIER_WORLD } from '../../../src/world/frontierWorld.js';
const out='art/reviews/continent-restart';
const n=801, bounds={minX:-4700,maxX:3300,minZ:-4900,maxZ:3100};
const surface=WORLD_DATA.regions.find(r=>r.id==='camp').surface;
const paint=createTerrainColorSampler(surface);
const options={world:DEFAULT_FRONTIER_WORLD,campHeight:(x,z)=>getSurfaceHeight(surface,x,z),campColor:(x,z)=>{const c=paint(x,z);return[c.r,c.g,c.b];}};
const heights=new Float32Array(n*n), rgba=new Uint8Array(n*n*4), owners=new Uint8Array(n*n);
const indices=new Map(FRONTIER_REGION_CATALOG.map((r,i)=>[r.habitatId,i+1]));
let land=0,maxHeight=-Infinity;
const start=Date.now();
for(let j=0;j<n;j++){
  const z=bounds.minZ+j*10;
  for(let i=0;i<n;i++){
    const x=bounds.minX+i*10,k=j*n+i;
    const s=sampleFrontier(x,z,options),coast=sampleFrontierContinent(x,z,{world:DEFAULT_FRONTIER_WORLD});
    heights[k]=s.height;
    let color=s.groundColorRGB??[.18,.43,.2];
    if(coast.land){land++;owners[k]=indices.get(s.habitatId)??0;maxHeight=Math.max(maxHeight,s.height);}
    else {const t=Math.max(0,Math.min(1,1-coast.waterDepth/12));color=[.025+.07*t,.09+.24*t,.17+.19*t];}
    for(let c=0;c<3;c++)rgba[k*4+c]=Math.round(Math.max(0,Math.min(1,color[c]))*255);
    rgba[k*4+3]=255;
  }
  if(j%200===0)console.log(`Survey row ${j}/${n-1}`);
}
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let bit=0;bit<8;bit++)c=(c>>>1)^(0xedb88320&-(c&1));}return(c^0xffffffff)>>>0;}
function chunk(type,b){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(b.length);crc.writeUInt32BE(crc32(Buffer.concat([name,b])));return Buffer.concat([len,name,b,crc]);}
function png(pixels){const head=Buffer.alloc(13);head.writeUInt32BE(n,0);head.writeUInt32BE(n,4);head[8]=8;head[9]=6;const rows=Buffer.alloc(n*(n*4+1));for(let j=0;j<n;j++)Buffer.from(pixels.buffer,j*n*4,n*4).copy(rows,j*(n*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(`${out}/height.f32`,Buffer.from(heights.buffer));
fs.writeFileSync(`${out}/habitat.u8`,Buffer.from(owners));
fs.writeFileSync(`${out}/terrain-colors.png`,png(rgba));
const sourceHashes=Object.fromEntries(['frontierTerrain','frontierRegion','frontierContinent','frontierCaldera','frontierFungalHollow'].map(name=>{const p=`src/world/${name}.js`;return[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')];}));
fs.writeFileSync(`${out}/survey.json`,JSON.stringify({createdAt:new Date().toISOString(),world:DEFAULT_FRONTIER_WORLD,n,stepMetres:10,bounds,landAreaKm2:land*.0001,maxSampledHeightMetres:maxHeight,regions:FRONTIER_REGION_CATALOG,sourceHashes,limits:'Read-only terrain survey: 10m sampling, no objects/creatures, not a native stitched render or a fine-collision map. Region colors are diagnostic allocation. Use the separate Scout game session to inspect real local objects.'},null,2));
console.log(JSON.stringify({seconds:(Date.now()-start)/1000,samples:n*n,landKm2:land*.0001,maxHeight}));
