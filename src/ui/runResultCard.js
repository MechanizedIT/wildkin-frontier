import { iconMarkup } from './itemIcons.js';
import { bindDialogInput } from './dialogInput.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createRunResultCard(opts = {}) {
  const app=document.getElementById('app');
  if(!app)return {show(){},hide(){},isVisible:()=>false,destroy(){}};
  const overlay=document.createElement('div');overlay.id='run-result-overlay';overlay.className='frontier-overlay';overlay.style.display='none';
  overlay.innerHTML='<div class="frontier-card result-card" role="dialog" aria-modal="true" aria-label="Expedition results"><div class="result-heading"><div class="result-emblem"></div><h2></h2></div><div class="result-body" role="region" aria-label="Expedition details"></div><div class="result-scroll-hint" aria-hidden="true" hidden></div><button class="result-continue">Continue</button></div>';app.append(overlay);
  const btn=overlay.querySelector('button'),body=overlay.querySelector('.result-body'),scrollHint=overlay.querySelector('.result-scroll-hint');let visible=false;
  function updateScrollHint(){
    if(!visible)return;
    const overflow=body.scrollHeight>body.clientHeight+1;
    body.classList.toggle('can-scroll',overflow);body.tabIndex=overflow?0:-1;
    scrollHint.hidden=!overflow;
    const above=body.scrollTop>2,below=body.scrollTop+body.clientHeight<body.scrollHeight-2;
    scrollHint.textContent=above?(below?'↑ Scroll details ↓':'↑ More above'):'↓ More below';
  }
  body.addEventListener('scroll',updateScrollHint);window.addEventListener('resize',updateScrollHint);
  function show(data){
    const secured=data.type==='extracted',snapshot=data.snapshot??data,cargo=snapshot.cargo??data.cargo??{},xp=snapshot.xp??data.xp??0;
    const companions=snapshot.companions??[],waypoints=snapshot.newWaypoints??[],beacons=snapshot.newBeacons??[],complete=!!snapshot.campaignCompleted;
    overlay.querySelector('h2').textContent=complete?'Frontier restored':secured?'Home with your haul':'Back on your feet';
    overlay.querySelector('.result-emblem').innerHTML=iconMarkup(complete?'wildflower':secured?'backpack':'shield',{size:76});
    const items=Object.entries({...cargo,xp}).filter(([,n])=>n>0);
    overlay.querySelector('.result-body').innerHTML=`<p>${secured?'Safely stored at Camp.':'Carried items lost. Your Camp is safe.'}</p><div class="reward-grid ${secured?'secured':'lost'}">${items.map(([id,n])=>`<div>${iconMarkup(id,{size:46})}<b>${secured?'+':''}${n}</b></div>`).join('')}</div>${companions.length?`<div class="result-bonds">${companions.map(c=>{const id=typeof c==='string'?c:c.id;return `<div>${iconMarkup(id,{size:56})}<b>${esc(typeof c==='string'?c:c.name??id)}</b></div>`;}).join('')}<p>${secured?'Bonds secured':'Wildkin returned to the wild'}</p></div>`:''}${waypoints.length+beacons.length?`<p class="result-progress">${iconMarkup('map',{size:26})} ${waypoints.length+beacons.length} new discoveries${secured?'':' kept'}</p>`:''}${complete?'<p class="result-milestone">Heartwood is alive again.</p>':''}${secured&&data.upgradeAvailable?'<p class="result-progress">Workshop upgrade available</p>':''}`;
    btn.textContent=complete?'Keep exploring':'Continue';overlay.style.display='flex';visible=true;
    body.classList.remove('can-scroll');scrollHint.hidden=true;body.scrollTop=0;
    updateScrollHint();
    btn.focus({preventScroll:true});
  }
  function hide(){overlay.style.display='none';visible=false;}
  btn.addEventListener('click',()=>{hide();opts.onContinue?.();});
  const unbind=bindDialogInput(overlay,()=>visible,()=>btn.click());
  return {show,hide,isVisible:()=>visible,element:overlay,button:btn,destroy(){unbind();window.removeEventListener('resize',updateScrollHint);body.removeEventListener('scroll',updateScrollHint);overlay.remove();}};
}
