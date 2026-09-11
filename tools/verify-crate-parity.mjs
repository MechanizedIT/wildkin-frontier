import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.GAME_URL ?? 'http://localhost:8080/';
const out='.dream-loop/workflow-proof/crate-refinement/normalized-v2/actual-game-author-parity';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'}); const page=await browser.newPage({viewport:{width:1280,height:720}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto(base,{waitUntil:'networkidle'}); await page.waitForFunction(()=>!!window.__game?.scene);
const game=await page.evaluate(()=>{const g=window.__game, hits=[];g.scene.traverse(n=>{if(n.userData?.externalModelInstance){let root=n;while(root.parent&&!root.userData?.visualAssetId)root=root.parent; if(root.userData?.visualAssetId==='asset_wooden_crate'||n.userData?.modelPath?.includes('frontier-crate-v1'))hits.push({name:n.name,modelPath:n.userData?.modelPath??null,parent:root.name,assetId:root.userData?.visualAssetId??null,position:root.position.toArray()})}}); const a=g.worldRegistry?.getAllObjects?.().filter?.(o=>o.visualAssetId==='asset_wooden_crate').map(o=>({id:o.id,visualAssetId:o.visualAssetId}))??[];return {externalCrates:hits,registeredCrates:a};});
await page.locator('[data-action="start"]').click(); await page.waitForTimeout(300);
await page.screenshot({path:`${out}/game.png`});
await page.goto(`${base}?author=1`,{waitUntil:'networkidle'}); await page.waitForFunction(()=>!!window.__author?.draftApi);
const author=await page.evaluate(()=>{const a=window.__author;const asset=a.draftApi.findVisualAssetById('asset_wooden_crate');return {model:asset?.model??null,parts:asset?.parts?.length??null,collision:asset?.collision??null,uiHasToggle:!!document.querySelector('#author-toggle')};});
await page.locator('#author-toggle').click(); await page.waitForTimeout(300);
const search=page.locator('input[placeholder="Search assets or category"]'); await search.fill('crate'); await page.waitForTimeout(100);
await page.screenshot({path:`${out}/author.png`});
await page.getByRole('button',{name:'Edit'}).click(); await page.waitForTimeout(250);
await page.screenshot({path:`${out}/author-asset-edit.png`});
const externalUi = await page.evaluate(() => ({
  note: document.querySelector('#author-asset-external-model-note')?.textContent?.trim(),
  noteVisible: document.querySelector('#author-asset-external-model-note')?.getClientRects().length > 0,
  addPartVisible: document.querySelector('#author-asset-add-parts')?.getClientRects().length > 0,
  partFormVisible: document.querySelector('#author-asset-part-form')?.getClientRects().length > 0,
  collisionVisible: document.querySelector('#author-asset-collision')?.getClientRects().length > 0,
}));
await page.getByRole('button',{name:'Back to Library'}).click(); await search.fill('Frontier Path Lantern'); await page.waitForTimeout(100); await page.getByRole('button',{name:'Edit'}).click(); await page.waitForTimeout(150);
const primitiveUi = await page.evaluate(() => ({ addPartVisible: document.querySelector('#author-asset-add-parts')?.getClientRects().length > 0, partFormVisible: document.querySelector('#author-asset-part-form')?.getClientRects().length > 0 }));
const report={game,author,externalUi,primitiveUi,errors,pass:errors.length===0&&game.externalCrates.length>0&&!!author.model&&author.parts===0&&externalUi.noteVisible&&!externalUi.addPartVisible&&!externalUi.partFormVisible&&externalUi.collisionVisible&&primitiveUi.addPartVisible&&primitiveUi.partFormVisible}; await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2)); await browser.close(); if(!report.pass)process.exitCode=1;
