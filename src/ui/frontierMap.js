import { getCampStartDestinations } from '../world/campTravel.js';
import { iconMarkup } from './itemIcons.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BIOMES = ['backpack','mossling','tidefin','emberhorn','skydancer','wildflower'];
export function createFrontierMap(opts = {}) {
  const {worldRegistry,frontierProgress} = opts;
  const app=document.getElementById('app');
  if(!app)return {openInspect(){},openStartSelection(){},close(){},isOpen:()=>false,destroy(){},setEnabled(){}};
  const mapButton=document.createElement('button');
  mapButton.id='frontier-map-button';mapButton.type='button';mapButton.innerHTML=iconMarkup('map',{size:32});mapButton.setAttribute('aria-label','Open Map');
  const overlay=document.createElement('div');overlay.id='frontier-map-overlay';overlay.className='frontier-overlay';overlay.style.display='none';
  overlay.innerHTML='<section id="frontier-map-panel" class="frontier-card" role="dialog" aria-modal="true" aria-label="Frontier map"><header><h2>Frontier</h2><button class="frontier-close" aria-label="Close map">×</button></header><div class="frontier-map-content"></div></section>';
  app.append(mapButton,overlay);
  const content=overlay.querySelector('.frontier-map-content');
  let mode=null,opened=false,enabled=true,previousFocus=null;
  function buildList(){
    const progress=frontierProgress?.getState()??{};
    const regions=(worldRegistry.getAllRegions?.()??worldRegistry.data?.regions??[]).slice(0,6);
    const known=new Set(['camp','section_1']);
    for(const waypoint of worldRegistry.getAllWaypoints?.()??[])if(progress.unlockedMajorWaypointIds?.includes(waypoint.id))known.add(waypoint.regionId);
    const destinations=getCampStartDestinations(worldRegistry,progress).map(d=>({...d,regionId:d.sectionId}));
    content.innerHTML=`<div class="frontier-map-art"><svg viewBox="0 0 300 400" aria-hidden="true"><path d="M42 28Q13 90 39 151T35 281Q15 341 66 376L248 385Q299 328 276 275T283 160Q296 71 244 27Z" fill="#73baa0"/><path d="M73 49Q130 9 176 47T242 94L222 170Q275 217 228 261L245 350L154 375L59 332L81 253Q42 217 80 178Z" fill="#a8d59a"/><path d="M80 354C242 315 67 281 179 239S260 175 152 151S73 85 195 48" fill="none" stroke="#427f71" stroke-width="20" opacity=".25"/><path d="M80 350C242 311 67 277 179 235S260 171 152 147S73 81 195 44" fill="none" stroke="#f5d997" stroke-width="13" stroke-linecap="round"/><path d="M22 195Q80 149 77 105M259 270Q225 315 274 335" fill="none" stroke="#b2ebd4" stroke-width="7" stroke-linecap="round"/></svg>${regions.map((region,i)=>{const positions=[[27,87],[54,72],[60,58],[70,44],[40,26],[65,11]],p=positions[i],seen=known.has(region.id);return `<div class="frontier-map-stop ${seen?'known':'unknown'}" style="left:${p[0]}%;top:${p[1]}%">${seen?iconMarkup(BIOMES[i],{size:43}):'<i>?</i>'}<span>${esc(seen?(region.displayName??region.id):'Uncharted')}</span></div>`;}).join('')}</div><div class="frontier-destinations">${mode==='startSelection'?destinations.map((d,i)=>`<button data-destination="${i}" aria-label="Travel to ${esc(d.displayName)}">${iconMarkup(BIOMES[Math.max(1,regions.findIndex(r=>r.id===d.regionId))]??'map',{size:37})}<strong>${esc(d.displayName)}</strong><b>→</b></button>`).join(''):`<p class="frontier-map-caption">${progress.hasDepartedOnce?'Discover waypoints to open new starting points.':'Through the Camp gate. Into the wilds.'}</p>`}</div>`;
    for(const button of content.querySelectorAll('[data-destination]'))button.addEventListener('click',()=>opts.onStartSelected?.(destinations[Number(button.dataset.destination)]));
    overlay.querySelector('h2').textContent=mode==='startSelection'?'Set out':'Frontier';
  }
  function open(next){if(opened||(!enabled&&next==='inspect'))return false;mode=next;opened=true;previousFocus=document.activeElement;buildList();overlay.style.display='flex';opts.onOpen?.(mode);overlay.querySelector('button')?.focus();return true;}
  function close(){if(!opened)return false;overlay.style.display='none';opened=false;mode=null;opts.onClose?.();previousFocus?.focus?.();return true;}
  mapButton.addEventListener('click',()=>{if(enabled)opened?close():open('inspect');});
  overlay.querySelector('.frontier-close').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  function key(e){if(!opened)return;if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  window.addEventListener('keydown',key);
  return {openInspect:()=>open('inspect'),openStartSelection:()=>open('startSelection'),close,isOpen:()=>opened,getMode:()=>mode,isEnabled:()=>enabled,setEnabled(v){enabled=!!v;mapButton.disabled=!enabled;},element:overlay,button:mapButton,buildList,destroy(){window.removeEventListener('keydown',key);overlay.remove();mapButton.remove();}};
}
