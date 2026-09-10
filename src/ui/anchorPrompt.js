import { iconMarkup } from './itemIcons.js';
import { bindDialogInput } from './dialogInput.js';

export function createAnchorPrompt(opts = {}) {
  const app=document.getElementById('app');
  if(!app)return {show(){},hide(){},isVisible:()=>false,destroy(){}};
  const overlay=document.createElement('div');overlay.id='anchor-prompt-overlay';overlay.className='frontier-overlay';overlay.style.display='none';
  overlay.innerHTML='<div class="frontier-card anchor-card" role="dialog" aria-modal="true" aria-label="Frontier anchor"><div class="anchor-emblem"></div><h2></h2><div class="anchor-summary"></div><div class="frontier-card-actions"><button class="anchor-keep">Keep exploring</button><button class="anchor-extract">Return to Camp</button></div></div>';
  app.append(overlay);
  const title=overlay.querySelector('h2'),summary=overlay.querySelector('.anchor-summary'),extractBtn=overlay.querySelector('.anchor-extract'),keepBtn=overlay.querySelector('.anchor-keep');
  let visible=false,current=null;
  function show(data){
    current=data;const repair=data.type==='portalRepair',model=data.requirementView;
    title.textContent=repair?(data.displayName||'Open the way'):data.isNew?'Waypoint found':(data.displayName||'Head home?');
    overlay.querySelector('.anchor-emblem').innerHTML=iconMarkup(repair?'axe':'map',{size:62});
    extractBtn.textContent=repair?'Repair gate':'Return to Camp';keepBtn.textContent=repair?'Later':'Keep exploring';extractBtn.disabled=repair&&!model?.ok;
    if(repair){
      summary.innerHTML=`<div class="anchor-requirements"><span class="${model.level.met?'met':'missing'}">${iconMarkup('xp',{size:32})}<b>Lv ${model.level.current} / ${model.level.required}</b></span>${model.resources.map(r=>`<span class="${r.met?'met':'missing'}">${iconMarkup(r.id,{size:38})}<b>${r.current} / ${r.required}</b></span>`).join('')}</div>${!model.level.met&&model.carriedXp?'<p>Bring your XP home to level up.</p>':''}`;
    }else{
      const items=Object.entries({...data.cargo,xp:data.xp??0}).filter(([,n])=>n>0);
      summary.innerHTML=`<p>${data.isNew?'A new starting point unlocked.':'Secure your finds at Camp.'}</p><div class="reward-grid">${items.map(([id,n])=>`<div>${iconMarkup(id,{size:42})}<b>${n}</b></div>`).join('')}</div>`;
    }
    overlay.style.display='flex';visible=true;keepBtn.focus();
  }
  function hide(){overlay.style.display='none';visible=false;current=null;}
  extractBtn.addEventListener('click',()=>{if(!current)return;const data=current;hide();opts.onExtract?.(data);});
  keepBtn.addEventListener('click',()=>{if(!current)return;const data=current;hide();opts.onKeepGoing?.(data);});
  const unbind=bindDialogInput(overlay,()=>visible,()=>keepBtn.click());
  return {show,hide,isVisible:()=>visible,getCurrent:()=>current,element:overlay,extractButton:extractBtn,keepButton:keepBtn,destroy(){unbind();overlay.remove();}};
}
