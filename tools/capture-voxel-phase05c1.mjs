import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='docs/evidence/voxel-phase05c1r/source',base=process.env.VOXEL_C1_URL||'http://localhost:8123/lab/voxel/cellular-mixed.html';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),id=`mixed-phase05c1-${Date.now()}`,url=new URL(base),errors=[],external=[];
url.searchParams.set('save',id);const host=url.origin;page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(host+'/')&&!r.url().startsWith('data:'))external.push(r.url());});
try{
  await page.goto(url.href);await page.waitForFunction(()=>window.__cellularLab?.ready,{timeout:60000});
  const before=await page.evaluate(()=>window.__cellularLab.report());assert.equal(before.material,'mixed');
  await page.screenshot({path:`${out}/seam-current-interpolation.png`});
  await page.locator('#seam').click();await page.waitForTimeout(100);
  const triangleMajority=await page.evaluate(()=>window.__cellularLab.report());assert.equal(triangleMajority.seamMode,'triangle-majority');
  assert.deepEqual(triangleMajority.triangles,before.triangles,'rejected triangle-majority mode retains the shared geometry for comparison');
  await page.screenshot({path:`${out}/seam-triangle-majority-negative.png`});
  await page.locator('#seam').click();await page.waitForTimeout(100);
  const threshold=await page.evaluate(()=>window.__cellularLab.report());assert.equal(threshold.seamMode,'threshold');
  assert.deepEqual(threshold.triangles,before.triangles,'threshold mode retains the same shared surface topology');
  await page.screenshot({path:`${out}/seam-thresholded-material-weight.png`});
  const buriedUrl=new URL('./cellular-mixed.html?fixture=buried&save='+id,url);
  await page.goto(buriedUrl.href);await page.waitForFunction(()=>window.__cellularLab?.ready,{timeout:60000});
  const buried=await page.evaluate(()=>window.__cellularLab.report());assert.ok(buried.namespace.includes('buried-v1'));assert.equal(buried.actors.length,0);
  assert.equal(buried.worldMaterialVertices.rock,0,'buried rock starts hidden beneath soil');
  await page.screenshot({path:`${out}/buried-interactive-01-initial.png`});
  const revision=()=>page.evaluate(()=>window.__cellularLab.state.revision),dig=async()=>{const previous=await revision();await page.mouse.click(640,360);
    await page.waitForFunction(value=>window.__cellularLab.state.revision>value,previous,{timeout:30000});await page.waitForFunction(()=>!window.__cellularLab.editing);return page.evaluate(()=>window.__cellularLab.report());};
  let scoop=await dig();assert.equal(scoop.audit.materials.rock.world,buried.audit.materials.rock.world);assert.ok(scoop.events.dugUnits.dirt>0);
  await page.screenshot({path:`${out}/buried-interactive-02-first-freehand-scoop.png`});
  // Rotate the actual camera with the mouse and dig through the normal crosshair path.
  for(let turn=0;turn<56&&scoop.worldMaterialVertices.rock===0;turn++){
    const dx=140,dy=0,previous=await revision(),prior=scoop;
    await page.mouse.move(640,360);await page.mouse.down();await page.mouse.move(640+dx,360+dy,{steps:8});await page.mouse.up();
    await page.mouse.click(640,360);await page.waitForTimeout(200);
    if(await revision()>previous){await page.waitForFunction(()=>!window.__cellularLab.editing);}
    scoop=await page.evaluate(()=>window.__cellularLab.report());
    if(scoop.events.dugUnits.dirt>prior.events.dugUnits.dirt)
      assert.equal(scoop.audit.materials.rock.world,prior.audit.materials.rock.world,'dirt removal preserves the rock ledger');
  }
  assert.ok(scoop.worldMaterialVertices.rock>0,'ordinary dirt mining progressively reveals rock');
  await page.screenshot({path:`${out}/buried-interactive-03-progressive-reveal.png`});
  const receipt={pass:true,timestamp:new Date().toISOString(),browser:'Microsoft Edge headless / SwiftShader',viewport:{width:1280,height:720},before,triangleMajority,threshold,
    buriedInitial:buried,buriedAfterFreehand:scoop,detachment: 'covered by the deterministic mixed-matter and Rapier end-to-end tests; this browser receipt covers real orbit and mining input through progressive reveal.',
    captures:['seam-interpolated.png','seam-triangle-majority-negative.png','seam-thresholded-material-weight.png',
      'buried-interactive-01-initial.png','buried-interactive-02-first-freehand-scoop.png','buried-interactive-03-progressive-reveal.png'],
    errors,external};
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(`${out}/seam-comparison.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify({pass:true,triangles:threshold.triangles,verticesBefore:before.renderVertices,verticesThreshold:threshold.renderVertices,
    buriedRevision:scoop.revision,buriedActors:scoop.actors.length,errors,external}));
}catch(error){await fs.writeFile(`${out}/seam-comparison.json`,JSON.stringify({pass:false,error:error.stack,errors,external},null,2));throw error;}
finally{await browser.close();}
