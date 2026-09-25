import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out='docs/evidence/voxel-phase05d/source';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],requests=[],consoleErrors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
page.on('request',r=>{if(new URL(r.url()).origin!=='http://localhost:8099')requests.push(r.url());});
try{
  await page.goto('http://localhost:8099/lab/voxel/cellular-terrain.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Ready'),null,{timeout:60000});
  await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/01-pristine.png`});
  await page.locator('#grid').click();await page.screenshot({path:`${out}/02-grid.png`});
  await page.locator('#grid').click();
  await page.mouse.click(720,450);await page.waitForFunction(()=>document.querySelector('#stats')?.textContent.includes('revision: 1'),null,{timeout:30000});
  await page.screenshot({path:`${out}/04-interior-edit.png`});
  await page.locator('#dirty').click();await page.screenshot({path:`${out}/04a-interior-dirty.png`});await page.locator('#dirty').click();
  const stages=[{name:'interior',stats:await page.locator('#stats').innerText()}];
  async function mineAtRevision(revision){
    await page.locator('#mine').click();let message=await page.locator('#message').innerText();
    if(message.includes('Target is rock')){await page.locator('#rock').click();await page.locator('#mine').click();}
    if(message.includes('Target is dirt')){await page.locator('#dirt').click();await page.locator('#mine').click();}
    try{await page.waitForFunction(r=>document.querySelector('#stats')?.textContent.includes(`world revision: ${r}`),revision,{timeout:12000});return true;}catch{return false;}
  }
  await page.keyboard.down('d');await page.waitForTimeout(2700);await page.keyboard.up('d');
  const boundary=await mineAtRevision(2);if(boundary){stages.push({name:'boundary',stats:await page.locator('#stats').innerText()});await page.screenshot({path:`${out}/05-boundary-edit.png`});
    await page.locator('#dirty').click();await page.screenshot({path:`${out}/05a-boundary-dirty.png`});await page.locator('#dirty').click();}
  await page.keyboard.down('s');await page.waitForTimeout(1400);await page.keyboard.up('s');
  const corner=await mineAtRevision(boundary?3:2);if(corner){stages.push({name:'corner',stats:await page.locator('#stats').innerText()});await page.screenshot({path:`${out}/06-corner-edit.png`});}
  const stats=await page.locator('#stats').innerText();
  const finalRevision=boundary?(corner?3:2):(corner?2:1);
  await page.locator('#save').click();await page.waitForFunction(r=>document.querySelector('#message')?.textContent.startsWith('Ready')&&document.querySelector('#stats')?.textContent.includes(`world revision: ${r}`),finalRevision,{timeout:30000});
  await page.screenshot({path:`${out}/14-reload.png`});
  const reloadStats=await page.locator('#stats').innerText();
  const receipt={url:page.url(),pageErrors:errors,consoleErrors,externalRequests:requests,stages,reloadStats,
    chunks:9,chunkDimensions:[16,16,16],spacing:.5,limitations:['No MatterActor extraction test is represented by this receipt.','The dynamic collision marker is a generic Rapier ball; cross-boundary actor support/ownership is out of scope for this candidate.']};
  await writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
}catch(error){
  console.error(JSON.stringify({error:error.message,pageErrors:errors,consoleErrors,body:await page.locator('body').innerText().catch(()=>'' )}));throw error;
}finally{await browser.close();}
