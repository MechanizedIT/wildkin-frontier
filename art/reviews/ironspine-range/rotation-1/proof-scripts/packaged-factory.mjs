import fs from 'node:fs';import{chromium}from'playwright';import{isDeepStrictEqual as same}from'node:util';
const ids=['asset_wildkin_emberhorn','asset_cinderjaw','asset_thornprowler'];
const source=JSON.parse(fs.readFileSync('src/world/data/world.json')).visualAssets.filter(a=>ids.includes(a.id));
const b=await chromium.launch({headless:true,channel:'msedge'}),p=await b.newPage({viewport:{width:412,height:915}}),errors=[],external=[];
p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(new URL(r.url()).origin!=='http://localhost:8081')external.push(r.url());});
await p.goto('http://localhost:8081/');await p.waitForFunction(()=>window.__game?.creatureSystem);
const result=await p.evaluate(ids=>{const g=window.__game;return ids.map((id,i)=>{
 const asset=g.worldRegistry.data.visualAssets.find(a=>a.id===id),v=asset.gameplay.wildkin,fid='portable-factory-'+id;
 g.creatureSystem.addGeneratedCreatures([{id:fid,regionId:'camp',pos:{x:25+i*8,y:0,z:25},type:v.archetype,visualAsset:asset,uniformScale:1,temperament:v.temperament,speciesTag:v.speciesTag,roamRadius:v.roamRadius,noticeRadius:v.noticeRadius,personalSpace:v.personalSpace,leashRadius:v.leashRadius,configOverrides:{health:v.health,moveSpeed:v.moveSpeed,damage:v.damage,respawnSeconds:v.respawnSeconds}}]);
 const c=g.creatureSystem.getCreatures().find(c=>c.id===fid||c.group.name===fid);if(!c)throw Error('Missing factory fixture');
 const mesh=[];c.group.children[0].traverse(o=>{if(o.isMesh)mesh.push({vertices:o.geometry.attributes.position.count,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3});});
 return{id,asset,mesh,triangles:mesh.reduce((s,m)=>s+m.triangles,0)};
});},ids);
for(const r of result){if(!same(r.asset,source.find(a=>a.id===r.id)))throw Error('Packaged catalog mismatch');const expected=r.id==='asset_cinderjaw'?[28,928]:r.id==='asset_thornprowler'?[23,770]:[32,1302];if(r.mesh.length!==expected[0]||r.triangles!==expected[1])throw Error('Packaged actual factory mismatch');delete r.asset;r.sourceRecipeExact=true;}
await b.close();if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));
fs.writeFileSync('art/reviews/thornprowler/rotation-1/portable-factory-proof.json',JSON.stringify({note:'Actual bundled portable worldRegistry records equal the focused baked source records. Existing creature factory constructs all three reviewed models from those actual packaged records; isolated nonshipping fixtures only. Full vertex/material parity is separately proven on developer factory.',result,errors,external,pass:true},null,2));console.log(JSON.stringify(result.map(r=>({id:r.id,meshes:r.mesh.length,triangles:r.triangles,exact:r.sourceRecipeExact}))));
