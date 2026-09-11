import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const [label='model-review',id='player']=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(label))throw Error('Use a lowercase capture label');
const out=`.dream-loop/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:800,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const view of id==='player'?['front','rear','tool']:['front','rear']){
    const url=new URL('tools/art/preview.html',process.env.GAME_URL??'http://localhost:8080/');url.searchParams.set('id',id);
    if(view==='rear')url.searchParams.set('rear','1');if(view==='tool')url.searchParams.set('tool','1');
    await page.goto(url.href);await page.waitForFunction(()=>window.ready,{timeout:20000});
    await page.screenshot({path:`${out}/${view}.png`});console.log(view,await page.evaluate(()=>window.report));
  }
  if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
