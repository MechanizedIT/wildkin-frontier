import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
const args=process.argv.slice(2),value=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const out=value('--out','.dream-loop/visual-atlas/2026-09-12'),base=value('--url','http://localhost:8080/');
const selectedRegions=value('--regions','').split(',').filter(Boolean),selectedModels=value('--models','').split(',').filter(Boolean),mapsOnly=args.includes('--maps-only'),withOverview=args.includes('--overview');
if(mapsOnly&&selectedModels.length)throw Error('--models cannot be combined with --maps-only');
await fs.mkdir(out,{recursive:true});await fs.mkdir(`${out}/maps`,{recursive:true});await fs.mkdir(`${out}/models`,{recursive:true});
const sourceWorldPath='src/world/data/world.json';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourceSnapshot=async()=>Object.fromEntries(await Promise.all([sourceWorldPath,'src/world/data/world.generated.js'].map(async file=>[file,sha(await fs.readFile(file))])));
const before=await sourceSnapshot();
const manifest={createdAt:new Date().toISOString(),source:'Current authored dev world with native Three.js scene/terrain/visual constructors; no player save loaded',sourceWorldPath,sourceWorldSHA256:before[sourceWorldPath],sourceBefore:before,reproduce:`node tools/review/capture-visual-atlas.mjs --url ${base} --out ${out}${selectedRegions.length?` --regions ${selectedRegions.join(',')}`:''}${mapsOnly?' --maps-only':''}${selectedModels.length?` --models ${selectedModels.join(',')}`:''}${withOverview?' --overview':''}`,maps:[],models:[],contactSheets:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:2048,height:2048},deviceScaleFactor:1});
page.on('pageerror',e=>manifest.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)manifest.errors.push(`${r.status()} ${r.url()}`);});
const save=()=>fs.writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
try{
 await page.goto(new URL('tools/review/visual-atlas.html',base).href);await page.waitForFunction(()=>window.atlas?.ready||window.atlas?.error,null,{timeout:60000});const failure=await page.evaluate(()=>atlas.error);if(failure)throw Error(failure);await page.waitForLoadState('networkidle');
 const allRegions=await page.evaluate(()=>atlas.regions);
 for(const id of selectedRegions)if(!allRegions.some(r=>r.id===id))throw Error(`Unknown region: ${id}`);
 const regions=allRegions.filter(r=>!selectedRegions.length||selectedRegions.includes(r.id));
 for(const r of regions)for(const expanded of r.id==='camp'?[false,true]:[false]){
  const record=await page.evaluate(([id,expanded])=>atlas.map(id,expanded),[r.id,expanded]),id=r.id+(expanded?'-expanded':'');
  record.path=`${out}/maps/${id}.png`;record.planningPath=`${out}/maps/${id}-planning.png`;record.id=id;
  await page.setViewportSize({width:2048,height:2048});
  await page.locator('canvas').first().screenshot({path:record.path});await page.evaluate(()=>atlas.planning());await page.screenshot({path:record.planningPath});
  if(withOverview){record.overview=await page.evaluate(([id,expanded])=>atlas.overview(id,{expanded}),[r.id,expanded]);record.overviewPath=`${out}/maps/${id}-overview.png`;await page.setViewportSize(record.overview.imageSize);await page.locator('canvas').first().screenshot({path:record.overviewPath});}
  manifest.maps.push(record);await save();console.log(`MAP ${id}: ${record.path}`);
 }
 const model=(id,name,paths,layout='row',status='Current generated game model')=>({id,name,status,layout,parts:paths.map(p=>typeof p==='string'?{path:`assets/models/${p}/model.glb`}:p)});
 const rootfall=mapsOnly?null:JSON.parse(await fs.readFile('art/source/rootfall-v1/candidate-v4/manifest.json','utf8'));
 const allModels=mapsOnly?[]:[model('explorer','Explorer',['explorer-v2']),model('mossling','Mossling',['mossling-v3']),model('sapwood','Sapwood harvest tree',['sapwood-v1']),
  model('canopies','Alien canopy family',['alien-canopy-v1','alien-canopy-spread-v1','alien-canopy-tall-v1']),model('outcrops','Fen bank outcrops',['fen-bank-outcrop-left-v1','fen-bank-outcrop-right-v1']),
  model('verdant-cliffs','Verdant rocks — owner accepted V3',['verdant-cliff-toe-v1','verdant-cliff-buttress-v1','verdant-cliff-ledge-v1']),
  model('field-chest','Articulated field chest',['field-chest-v1']),model('frontier-crate','Frontier storage crate',['frontier-crate-v1']),model('salvage-bench','Salvage bench',['salvage-bench-v1']),
  model('matter-fabricator','Matter fabricator',['matter-fabricator-v1']),model('resonance-bench','Resonance bench',['resonance-bench-v1']),model('forge-cache','Ember forge cache',['ember-forge-cache-v1']),model('observatory','Fen observatory',['fen-observatory-v1']),
  model('barricades','Camp barricade family',['emergency-barricade-v1','emergency-barricade-post-v1']),
  model('survey-module','Survey wreck assembly',['survey-left-wall-v2','survey-right-wall-v2','survey-rear-wall-v2','survey-floor-v2','survey-ramp-v2',{path:'assets/models/survey-panel-debris-v2/model.glb',offset:[-4,0,2]},{path:'assets/models/survey-cargo-frame-v2/model.glb',offset:[4,0,1]}],'assembly'),
  model('rootfall-candidate','Rootfall V4 — closed prototype',['left','right','center'].map(n=>({path:`assets/models/rootfall-${n}-v1/model.glb`})).concat(rootfall.seams.positions.map(offset=>({path:'assets/models/rootfall-seam-v1/model.glb',offset}))),'assembly','INTEGRATED PROTOTYPE · producer selected / historical visual 7.1'),
  model('tidefin-candidate','Tidefin — pending candidate',[{path:'art/source/tidefin-candidate-v3/candidate/tidefin-motion.glb'}],'row','PENDING · not integrated / not admitted')];
 for(const id of selectedModels)if(!allModels.some(r=>r.id===id))throw Error(`Unknown model: ${id}`);
 const records=allModels.filter(r=>!selectedModels.length||selectedModels.includes(r.id));
 await page.setViewportSize({width:768,height:768});
 for(const r of records){
  r.sourceParts=await Promise.all(r.parts.map(async part=>({path:part.path,sha256:sha(await fs.readFile(part.path))})));
  const metrics=await page.evaluate(r=>atlas.model(r),r);r.path=`${out}/models/${r.id}.png`;Object.assign(r,metrics);await page.locator('canvas').first().screenshot({path:r.path});
  for(const part of r.sourceParts)if(sha(await fs.readFile(part.path))!==part.sha256)manifest.errors.push(`Model changed during capture: ${part.path}`);
  manifest.models.push(r);await save();console.log(`MODEL ${r.id}`);
 }
 for(let start=0;start<records.length;start+=8){const subset=await Promise.all(records.slice(start,start+8).map(async r=>({name:r.name,status:r.status,data:'data:image/png;base64,'+(await fs.readFile(r.path)).toString('base64')})));
  await page.setViewportSize({width:2048,height:1120});await page.evaluate(r=>atlas.contact(r),subset);const file=`${out}/model-contact-sheet-${start/8+1}.png`;await page.screenshot({path:file});manifest.contactSheets.push(file);}
 for(const file of [...manifest.maps.flatMap(r=>[r.path,r.planningPath,r.overviewPath].filter(Boolean)),...manifest.models.map(r=>r.path),...manifest.contactSheets]){const bytes=await fs.readFile(file);manifest.files??={};manifest.files[path.relative(out,file).replaceAll('\\','/')]={bytes:bytes.length,sha256:sha(bytes)};}
 manifest.sourceAfter=await sourceSnapshot();manifest.sourceUnchanged=JSON.stringify(before)===JSON.stringify(manifest.sourceAfter);
 if(!manifest.sourceUnchanged)manifest.errors.push('World source changed during capture; capture again into a fresh directory.');
 await save();if(manifest.errors.length)throw Error(manifest.errors.join('\n'));console.log(`DONE ${out}/manifest.json`);
}finally{await save();await browser.close();}
