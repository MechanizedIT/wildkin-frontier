import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {composeShatterfenBank,FEN_BANK_OUTCROPS,FEN_BANK_COMPONENTS,getFootSamples} from '../tools/compose-shatterfen-bank.mjs';
import {getSurfaceHeight,getPathDistance,validateSurface} from '../src/world/terrainSurfaceModel.js';
import {getGravelCoverage,getGravelCanvasSize} from '../src/presentation/gravelRoutePaint.js';
import {createAuthoredTerrain} from '../src/presentation/authoredTerrain.js';
const baseline=JSON.parse(fs.readFileSync(new URL('../src/world/data/world.json',import.meta.url),'utf8'));
test('bank composition preserves gameplay, terrain support and sibling regions; rerun is stable',()=>{
 const world=structuredClone(baseline),before=structuredClone(world),old=before.regions.find(r=>r.id==='section_2');composeShatterfenBank(world);const bank=world.regions.find(r=>r.id==='section_2');
 assert.deepEqual(world.regions.filter(r=>r.id!=='section_2'),before.regions.filter(r=>r.id!=='section_2'));
 for(const field of Object.keys(old).filter(k=>!['props','surface'].includes(k)))assert.deepEqual(bank[field],old[field],field);
 const fixed=p=>!p.id.startsWith('prop_fen_bank_')&&p.id!=='prop_s2_observatory_stone_r';assert.deepEqual(bank.props.filter(fixed),old.props.filter(fixed));
 for(const key of ['heights','water','palette','detail'])assert.deepEqual(bank.surface[key],old.surface[key],key);
 for(let x=12;x<=35;x+=.43)for(let z=0;z<=20;z+=.47)assert.equal(getSurfaceHeight(bank.surface,x,z),getSurfaceHeight(old.surface,x,z));
 for(const route of old.surface.routes.filter(r=>r.id!=='observatory-island-spur'&&!r.id.startsWith('fen_bank_')))assert.deepEqual(bank.surface.routes.find(r=>r.id===route.id),route);
 const scatterInput=surface=>surface.routes.filter(r=>r.scatter!==false).map(r=>({points:r.points,width:r.width}));assert.deepEqual(scatterInput(bank.surface),scatterInput(old.surface));
 const once=structuredClone(world);composeShatterfenBank(world);assert.deepEqual(world,once);validateSurface(bank.surface);
});
test('solid outcrops avoid protected approach/resource points and their complete feet are buried',()=>{
 const world=composeShatterfenBank(structuredClone(baseline)),bank=world.regions.find(r=>r.id==='section_2');
 const points=[{x:19,z:11,r:1.6},{x:23,z:8,r:1.65},{x:23,z:6.34,r:.3},{x:27,z:12,r:1.7},{x:29,z:18,r:2.2},{x:20.9,z:9.5,r:1.1}];
 for(const s of FEN_BANK_OUTCROPS)for(const p of points){const gap=Math.hypot(Math.max(Math.abs(p.x-s.x)-s.w/2,0),Math.max(Math.abs(p.z-s.z)-s.d/2,0));assert.ok(gap>p.r,`${s.name} infringes ${JSON.stringify(p)}`);}
 for(const s of FEN_BANK_COMPONENTS){const prop=bank.props.find(p=>p.id===`prop_fen_bank_${s.id}`),asset=world.visualAssets.find(a=>a.id===prop.visualAssetId),samples=getFootSamples(s,asset.collision);assert.ok(samples.length>100);for(const [x,z]of samples)assert.ok(prop.pos.y<getSurfaceHeight(bank.surface,x,z));}
});
test('gravel mask remains walk-route paint with irregular feathering and validated opt-in',()=>{
 const route={points:[{x:0,z:0},{x:0,z:12}],width:3.4,style:'gravel'};assert.ok(getGravelCoverage(route,0,6)>.5);assert.equal(getGravelCoverage(route,8,6),0);const edge=[1,2,3,4,5,6,7].map(z=>getGravelCoverage(route,1.8,z));assert.ok(Math.max(...edge)-Math.min(...edge)>.1);assert.ok(edge.every(v=>v>=0&&v<=1));
 validateSurface({routes:[route]});assert.throws(()=>validateSurface({routes:[{...route,style:'unknown'}]}),/path style/);assert.equal(getSurfaceHeight({routes:[route]},0,6),0);
 assert.throws(()=>validateSurface({routes:[{...route,scatter:'no'}]}),/scatter flag/);
 assert.deepEqual(getGravelCanvasSize(20,8),{width:520,height:208});const large=getGravelCanvasSize(418,210);assert.equal(large.width,768);assert.ok(Math.abs(large.height/large.width-210/418)<1/768);
});
test('bank masks remove only local meadow instances and never reseed distant foliage',()=>{
 const world=structuredClone(baseline),old=structuredClone(world.regions.find(r=>r.id==='section_2'));old.surface.routes=old.surface.routes.filter(r=>!r.id.startsWith('fen_bank_'));delete old.surface.routes.find(r=>r.id==='observatory-island-spur').style;
 composeShatterfenBank(world);const next=world.regions.find(r=>r.id==='section_2'),before=createAuthoredTerrain(old).group,after=createAuthoredTerrain(next).group;
 for(const name of ['meadow_grass','meadow_ferns']){const collect=root=>{const mesh=root.getObjectByName(name),map=new Map();for(let i=0;i<mesh.count;i++){const m=Array.from(mesh.instanceMatrix.array.slice(i*16,i*16+16));map.set(JSON.stringify(m),{x:m[12],z:m[14]});}return map;};const a=collect(before),b=collect(after);for(const key of b.keys())assert.ok(a.has(key),'new distant tuft was introduced');for(const [key,pos]of a)if(!b.has(key))assert.ok(getPathDistance(next.surface,pos.x,pos.z)<.301,'removed tuft is outside bank clearing');}
});
