import { chromium } from 'playwright';

const base=process.env.GAME_URL??'http://localhost:8080/';
const resources={wood:12,stone:9,fiber:8,berries:7,iron_ore:6,crystal_shard:5,wildflower:4};
const report=[];
const shot=async(page,name)=>page.screenshot({path:`dist/qa/sunlit-ui-${name}.png`,fullPage:false});
const overflow=async page=>page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,visible:[...document.querySelectorAll('.frontier-overlay,.beta-panel,.beta-welcome')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({id:e.id||e.className,rect:(()=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]})()}))}));
const checkpoint=async(page,name)=>{const o=await overflow(page);report.push(`${name}: viewport ${o.innerWidth}px, document ${o.scrollWidth}px${o.scrollWidth>o.innerWidth?' — HORIZONTAL OVERFLOW':''}; visible ${JSON.stringify(o.visible)}`);await shot(page,name);};

const browser=await chromium.launch({headless:true,channel:'msedge'});
for(const [width,height,label] of [[390,844,'390'],[320,568,'320']]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__game?.frontierMap);
 await checkpoint(page,`${label}-welcome`);
 await page.locator('[data-action=start]').click();await page.waitForTimeout(200);
 if(label==='390'){
  const fieldTool=page.locator('.beta-field-tool');
  await page.evaluate(()=>Object.defineProperty(document.querySelector('.beta-field-tool'),'setPointerCapture',{configurable:true,value:()=>{throw new DOMException('capture unavailable')}}));
  await fieldTool.dispatchEvent('pointerdown',{pointerId:771,pointerType:'touch',bubbles:true});
  const heldBeforeRelease=await page.evaluate(()=>window.__game.keyboardInput.getIntent().attackHeld);
  await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:771,pointerType:'touch',bubbles:true})));
  const heldAfterOutsideRelease=await page.evaluate(()=>window.__game.keyboardInput.getIntent().attackHeld);
  if(!heldBeforeRelease||heldAfterOutsideRelease)throw new Error('Field Tool must release when capture fails and pointerup occurs outside its button');
  report.push('390 Field Tool capture-failure outside release=true');
 }
 await page.getByRole('button',{name:'Open Map'}).click();await checkpoint(page,`${label}-map-inspect`);
 await page.keyboard.press('Escape');await page.waitForTimeout(100);report.push(`${label} map Escape closed=${await page.evaluate(()=>!window.__game.frontierMap.isOpen())}`);
 await page.evaluate(()=>window.__game.frontierMap.openStartSelection());await checkpoint(page,`${label}-map-travel`);
 const dest=page.locator('[data-destination]').first();report.push(`${label} travel destination count=${await page.locator('[data-destination]').count()}`);if(await dest.count())await dest.click();await page.waitForTimeout(150);
 // Cards are injected through their public UI facades, independent of gameplay state.
 await page.evaluate(resources=>window.__game.anchorPrompt.show({type:'campReturn',id:'qa',displayName:'Sunlit Verge Beacon',isNew:true,cargo:resources,xp:23}),resources);await checkpoint(page,`${label}-extract-all-resources`);
 await page.locator('.anchor-keep').click();
 await page.evaluate(resources=>window.__game.runResultCard.show({type:'lost',snapshot:{cargo:resources,xp:23,companions:[{id:'mossling',name:'Mossling'}],newWaypoints:['w1'],newBeacons:['b1']}}),resources);await checkpoint(page,`${label}-loss-card`);
 await page.locator('.result-continue').click();
 await page.evaluate(()=>window.__game.anchorPrompt.show({type:'portalRepair',id:'qa-gate',displayName:'Verdant Gate',requirementView:{ok:false,level:{met:false,current:2,required:4},resources:[{id:'wood',met:true,current:9,required:4},{id:'crystal_shard',met:false,current:1,required:3}],carriedXp:12}}));await checkpoint(page,`${label}-repair-card`);
 await page.locator('.anchor-keep').click();
 await page.keyboard.press('b');await page.waitForTimeout(100);await checkpoint(page,`${label}-backpack`);await page.keyboard.press('Escape');
 await page.keyboard.press('k');await page.waitForTimeout(100);await checkpoint(page,`${label}-skills`);await page.keyboard.press('Escape');
 await page.locator('.beta-hud-button[data-tab="inventory"]').click();await page.waitForTimeout(60);const wildkinTab=page.locator('.beta-panel nav [data-tab="wildkin"]');if(await wildkinTab.isVisible())await wildkinTab.click();else{await page.locator('.beta-panel nav [data-tab="more"]').click();await page.locator('.more-panel [data-tab="wildkin"]').click();}await checkpoint(page,`${label}-roster`);await page.keyboard.press('Escape');
 report.push(`${label} JS errors: ${errors.length?errors.join(' | '):'none'}`);
 await page.close();
}
await browser.close();
await (await import('node:fs/promises')).writeFile('dist/qa/sunlit-ui-report.txt',report.join('\n')+'\n');
console.log(report.join('\n'));
