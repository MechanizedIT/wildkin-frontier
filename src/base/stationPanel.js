import { equipmentIcon } from '../equipment/equipmentView.js';
import { EQUIPMENT_BY_ID } from '../equipment/equipmentCatalog.js';
import { iconMarkup, resourceLabel } from '../ui/itemIcons.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const itemIcon = (id, size) => EQUIPMENT_BY_ID[id] ? equipmentIcon(id, size) : iconMarkup(id, {size});
const protectedSelectors = '#combat-hud,#frontier-map-button,.beta-hud-actions,.beta-action-cluster,.beta-quick,.beta-joystick-home,.beta-field-guide,.beta-toast,#activation-toast';

function costMarkup(cost) {
  return Object.entries(cost ?? {}).map(([id, value]) => {
    const required = typeof value === 'object' ? value.required ?? value.amount ?? 0 : value;
    const owned = typeof value === 'object' ? value.owned : undefined;
    return `<span class="station-cost ${owned !== undefined && owned < required ? 'is-short' : ''}" title="${escape(resourceLabel(id))}">${iconMarkup(id,{size:23})}<b>${owned === undefined ? '' : `${escape(owned)}/`}${escape(required)}</b><span class="station-sr"> ${escape(resourceLabel(id))}</span></span>`;
  }).join('');
}

// Presentation only: callers own proximity, projection, production and rewards.
export function createStationPanel({app, getModel, onCraft = () => {}, onClose = () => {}}) {
  const panel = document.createElement('section');
  panel.className = 'station-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Crafting station');
  const leader = document.createElement('i'); leader.className = 'station-panel-leader'; leader.hidden = true; leader.setAttribute('aria-hidden','true');
  app.append(leader, panel);
  let opened = false, selectedId = null, stationId = null, signature = '', lastPosition = '', lastProgress = -1;
  let progressFill = null, progressLabel = null;

  function close() {
    if (!opened) return;
    opened = false; panel.hidden = true; leader.hidden = true;
    if (panel.contains(document.activeElement)) document.activeElement.blur();
    onClose();
  }
  function render(model) {
    const recipes = (model.recipes ?? []).slice(0,3);
    if (stationId !== model.id) { stationId = model.id; selectedId = null; }
    if (!recipes.some(r => r.id === selectedId)) selectedId = recipes[0]?.id ?? null;
    const selected = recipes.find(r => r.id === selectedId);
    const next = JSON.stringify([model.id,model.name,recipes,!!model.operating,model.completedLabel,selectedId]);
    if (signature === next) return;
    signature = next; lastProgress = -1;
    panel.dataset.recipeCount = String(recipes.length);
    panel.classList.toggle('is-operating', !!model.operating);
    const header = `<header><h2>${escape(model.name ?? 'Crafting station')}</h2><button type="button" class="station-close" data-station-close aria-label="Close crafting station">×</button></header>`;
    const picker = `<div class="station-recipes" aria-label="Recipes" style="--station-recipes:${Math.max(1,recipes.length)}">${recipes.map(r=>`<button type="button" class="station-recipe ${r.id === selectedId ? 'is-selected' : ''}" data-station-recipe="${escape(r.id)}" aria-pressed="${r.id === selectedId}">${itemIcon(r.icon ?? r.id,32)}<span>${escape(r.name)}</span><small>${escape(r.count ?? 0)} packed</small></button>`).join('')}</div>`;
    const craft = selected ? `<div class="station-craft-row"><div class="station-costs" aria-label="Materials required">${costMarkup(selected.cost)}</div><button type="button" class="station-craft" data-station-craft ${selected.available ? '' : 'disabled'}>Craft</button></div><p class="station-feedback ${selected.available ? '' : 'is-unavailable'}" role="status">${escape(!selected.available ? selected.reason || 'Materials needed.' : model.completedLabel || '')}</p>` : '<p class="station-feedback">No recipes available.</p>';
    const operation = `<div class="station-operation" role="status"><strong>${escape(model.completedLabel || selected?.name || 'Crafting')}</strong><span class="station-progress-label">Working</span><div class="station-progress" role="progressbar" aria-label="Crafting progress" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>`;
    panel.innerHTML = header + (model.operating ? operation : picker + craft);
    progressFill = panel.querySelector('.station-progress i'); progressLabel = panel.querySelector('.station-progress-label');
  }
  function position(model) {
    const frame = app.getBoundingClientRect(), point = model.screenPoint;
    if (point === null || point?.visible === false || point && (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x > frame.width || point.y > frame.height)) {
      panel.hidden = true; leader.hidden = true; return;
    }
    panel.hidden = false;
    const width = panel.offsetWidth, height = panel.offsetHeight, margin = 10;
    const x = point?.x ?? frame.width / 2, y = point?.y ?? frame.height * .6;
    const obstacles = [...app.querySelectorAll(protectedSelectors)].filter(el => !el.hidden && el.getClientRects().length && Number(getComputedStyle(el).opacity) > .05 && getComputedStyle(el).visibility !== 'hidden').map(el => {
      const r = el.getBoundingClientRect(); return {left:r.left-frame.left,right:r.right-frame.left,top:r.top-frame.top,bottom:r.bottom-frame.top,weight:el.matches('.beta-toast,#activation-toast')?1:1000};
    });
    const choices = [[x-width/2,y-height-20],[x+22,y-height/2],[x-width-22,y-height/2],[x+22,margin],[x-width-22,margin],[frame.width/2-width/2,margin],[x-width/2,y+20]];
    let best = null;
    for (const [left,top] of choices) {
      const box = {left:clamp(left,margin,frame.width-width-margin),top:clamp(top,margin,frame.height-height-84)};
      box.right = box.left+width; box.bottom = box.top+height;
      const overlap = obstacles.reduce((sum,o)=>sum+o.weight*Math.max(0,Math.min(box.right,o.right+6)-Math.max(box.left,o.left-6))*Math.max(0,Math.min(box.bottom,o.bottom+6)-Math.max(box.top,o.top-6)),0);
      const coversPoint = point && x >= box.left-10 && x <= box.right+10 && y >= box.top-10 && y <= box.bottom+10;
      const score = overlap + (coversPoint ? width*height*.2 : 0);
      if (!best || score < best.score) best = {...box,score};
      if (!score) break;
    }
    const key = `${best.left.toFixed(1)},${best.top.toFixed(1)}`;
    if (key !== lastPosition) { panel.style.left = `${best.left}px`; panel.style.top = `${best.top}px`; lastPosition = key; }
    leader.hidden = !point;
    if (point) {
      const endX=clamp(x,best.left+12,best.right-12),endY=clamp(y,best.top+12,best.bottom-12),dx=x-endX,dy=y-endY;
      leader.style.left=`${endX}px`;leader.style.top=`${endY}px`;leader.style.width=`${Math.hypot(dx,dy)}px`;leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    }
  }
  function update() {
    if (!opened) return;
    const model = getModel();
    if (!model) { close(); return; }
    render(model);
    if (progressFill) {
      const value = Math.round(clamp(Number(model.progress)||0,0,1)*100);
      if (value !== lastProgress) { lastProgress=value;progressFill.style.transform=`scaleX(${value/100})`;progressFill.parentElement.setAttribute('aria-valuenow',String(value));progressLabel.textContent=`Working · ${value}%`; }
    }
    position(model);
  }
  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  panel.addEventListener('pointerup',event=>event.stopPropagation());
  panel.addEventListener('pointercancel',event=>event.stopPropagation());
  panel.addEventListener('touchstart',event=>event.stopPropagation(),{passive:true});
  panel.addEventListener('click',event=>{
    event.stopPropagation();
    if (event.target.closest('[data-station-close]')) { close(); return; }
    const recipe = event.target.closest('[data-station-recipe]');
    if (recipe) { selectedId=recipe.dataset.stationRecipe;update();return; }
    if (!event.target.closest('[data-station-craft]')) return;
    const model=getModel(), selected=model?.recipes?.find(r=>r.id===selectedId);
    if (!model?.operating && selected?.available) { onCraft(selected.id);update(); }
  });
  const keydown=event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}};
  window.addEventListener('keydown',keydown,true);
  return {open(){if(!getModel())return false;opened=true;update();return opened;},close,isOpen:()=>opened,update,
    dispose(){opened=false;window.removeEventListener('keydown',keydown,true);panel.remove();leader.remove();}};
}
