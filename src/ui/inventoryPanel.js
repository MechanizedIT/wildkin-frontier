import { iconMarkup } from './itemIcons.js';
import { equipmentIcon } from '../equipment/equipmentView.js';
import { EQUIPMENT_BY_ID, QUICK_SLOT_COUNT } from '../equipment/equipmentCatalog.js';

const MESSAGES = {
  full: 'No room in that container.', 'out-of-reach': 'Move beside the storage container.',
  'storage-write-failed': 'Could not save. Your items were kept.', 'empty-source': 'That stack is no longer here.',
  'partial-swap': 'Choose an empty slot for part of a stack.', 'withdraw-only': 'This container only allows withdrawals.',
  'unknown-container': 'That container is no longer available.', 'same-slot': 'Choose another slot.',
  'invalid-count': 'Choose a valid amount from this stack.', 'invalid-destination': 'Choose an available slot.',
  'item-unavailable': 'Take that supply into your backpack first.', 'invalid-slot': 'Choose one of the five quick slots.',
};

const INVENTORY_DRAG = { size:64, touchGap:24, edge:8, mouseOffset:12, holdMs:320, slop:8 };

export function inventoryDragPosition(x, y, touch, viewport) {
  if (!touch) return { x:x+INVENTORY_DRAG.mouseOffset, y:y+INVENTORY_DRAG.mouseOffset };
  const { size, touchGap, edge } = INVENTORY_DRAG;
  const left=(viewport.left??0)+edge, top=(viewport.top??0)+edge;
  return {
    x:Math.max(left,Math.min(x-size/2,(viewport.left??0)+viewport.width-size-edge)),
    y:Math.max(top,Math.min(y-size-touchGap,(viewport.top??0)+viewport.height-size-edge)),
  };
}

export function inventoryScrollHint(scrollTop, clientHeight, scrollHeight) {
  if (clientHeight <= 0 || scrollHeight <= clientHeight + 1) return '';
  return scrollTop + clientHeight >= scrollHeight - 1 ? '↑ Scroll back to earlier slots' : 'Swipe / scroll for more ↓';
}

export function inventoryKeyboardIndex(index, key, length) {
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[key];
  if (key === 'Home') return 0;
  if (key === 'End') return Math.max(0, length - 1);
  return delta === undefined ? index : Math.max(0, Math.min(length - 1, index + delta));
}

export function inventorySplitPayload(container, index, count) {
  const stack = container?.slots?.[index], toIndex = container?.slots?.findIndex(s => !s) ?? -1;
  if (container?.withdrawOnly || !stack || !Number.isInteger(count) || count < 1 || count >= stack.count || toIndex < 0) return null;
  return { fromId: container.id, fromIndex: index, toId: container.id, toIndex, count };
}

export function inventoryTransferReason(model, fromId, fromIndex, toId, toIndex = null) {
  const containers = [model?.pack, model?.storage].filter(Boolean);
  const source = containers.find(c => c.id === fromId), target = containers.find(c => c.id === toId);
  if (!source || !target) return 'That container is no longer available.';
  if (target.withdrawOnly) return 'Legacy supplies only allows taking items to your backpack.';
  if (source.withdrawOnly && toIndex !== null) return 'Use Take to Backpack for legacy supplies. Items fill available backpack space.';
  return null;
}

// Selection and gestures live here. All stack mutations go through onAction;
// getModel is always the quantity authority, including after failed actions.
export function createInventoryPanel({ app, getModel, onAction = () => ({ ok: false }), onBlockingChanged = () => {}, onOpenJournal = null }) {
  const overlay = document.createElement('div'); overlay.className = 'inventory-overlay'; overlay.hidden = true;
  overlay.innerHTML = `<section class="inventory-panel" role="dialog" aria-modal="true" aria-label="Backpack and storage">
    <header class="ip-heading">${iconMarkup('backpack',{size:40})}<h2>Backpack & Storage</h2><button type="button" class="ip-alternate" data-ip="alternate" hidden></button><button type="button" data-ip="close" aria-label="Close inventory">×</button></header>
    <nav class="ip-container-switch" aria-label="Visible container"><button type="button" data-ip="show-pack">Backpack</button><button type="button" data-ip="show-storage">Storage</button></nav>
    <section class="ip-loadout" aria-label="Arrange quick slots" hidden><div class="ip-loadout-heading"><strong>Quick slots</strong><span class="ip-loadout-help">Select a carried supply, then a slot</span></div><div class="ip-loadout-controls"><div class="ip-quick-slots">${Array.from({length:QUICK_SLOT_COUNT},(_,slot)=>`<button type="button" class="ip-quick-slot" data-quick-slot="${slot}"></button>`).join('')}</div><div class="ip-tool-picker"><button type="button" data-ip-tool="omni_tool" aria-label="Assign permanent Omni-tool">${equipmentIcon('omni_tool',28)}<span>Omni</span></button><button type="button" data-ip-tool="build_tool" aria-label="Assign permanent Construction tool">${equipmentIcon('build_tool',28)}<span>Build</span></button><button type="button" data-ip="clear-quick-slot" disabled>Clear</button></div></div></section>
    <div class="ip-containers"></div>
    <footer class="ip-footer"><div class="ip-selection"><i></i><span><strong>Select an item</strong><small>Tap a stack to inspect it</small></span></div><button type="button" data-ip="transfer">To storage</button><button type="button" data-ip="split">Split</button><button type="button" data-ip="sort">Sort Pack</button></footer>
    <p class="ip-status" role="status" aria-live="polite">Tap an item, then an empty slot. Drag to swap.</p>
    <div class="ip-split" hidden><section role="dialog" aria-modal="true" aria-label="Split stack"><h3>Split stack</h3><p class="ip-split-name"></p><div class="ip-quantity"><button type="button" data-ip="less" aria-label="One fewer">−</button><output aria-live="polite"></output><button type="button" data-ip="more" aria-label="One more">+</button></div><div class="ip-split-actions"><button type="button" data-ip="split-cancel">Cancel</button><button type="button" data-ip="split-confirm">Split</button></div></section></div>
  </section><div class="ip-drag-ghost" hidden aria-hidden="true"></div>`;
  app.append(overlay);
  if (onOpenJournal) {
    const journal = document.createElement('button'); journal.type = 'button'; journal.dataset.ip = 'journal'; journal.textContent = 'Journal';
    overlay.querySelector('[data-ip="close"]').before(journal);
  }
  const panel = overlay.querySelector('.inventory-panel'), containersEl = overlay.querySelector('.ip-containers');
  const status = overlay.querySelector('.ip-status'), selectionEl = overlay.querySelector('.ip-selection');
  const splitEl = overlay.querySelector('.ip-split'), ghost = overlay.querySelector('.ip-drag-ghost');
  const loadoutEl = overlay.querySelector('.ip-loadout'), quickButtons = [...overlay.querySelectorAll('.ip-quick-slot')];
  const control = id => overlay.querySelector(`[data-ip="${id}"]`);
  const views = new Map();
  const resizeObserver = new ResizeObserver(updateScrollHints);
  let opened = false, storageId = null, model = null, selection = null, activeId = 'backpack', signature = '';
  let splitCount = null, gesture = null, holdTimer = null, suppressClick = false, restoreFocus = null;
  let selectedTool = null, selectedQuickSlot = null;
  const containers = () => [model?.pack, model?.storage].filter(Boolean);
  const container = id => containers().find(c => c.id === id);
  const selectedStack = () => container(selection?.id)?.slots[selection?.index];
  const slotButton = (id,index) => views.get(id)?.buttons[index];
  const selectedEquipment = () => selectedTool ?? (selection?.id === model?.pack.id && selectedStack()?.count > 0 && EQUIPMENT_BY_ID[selectedStack()?.id] ? selectedStack().id : null);
  function renderLoadout() {
    loadoutEl.hidden = !model?.loadout || !!model.storage;
    if (!model?.loadout) return;
    const assigning = selectedEquipment();
    quickButtons.forEach((button,slot) => {
      const id=model.loadout.slots[slot],item=EQUIPMENT_BY_ID[id],permanent=item?.kind==='tool'||item?.kind==='building';
      const count=permanent?1:model.pack.slots.reduce((n,stack)=>n+(stack?.id===id?stack.count:0),0);
      const key=`${id}:${count}`;
      if(button.dataset.content!==key){button.innerHTML=`<kbd>${slot+1}</kbd>${equipmentIcon(id,36)}${item&&!permanent?`<b>${count}</b>`:''}`;button.dataset.content=key;}
      button.classList.toggle('is-selected',selectedQuickSlot===slot||!!assigning&&assigning===id);
      button.classList.toggle('is-empty',!!item&&!count);
      button.setAttribute('aria-pressed',String(selectedQuickSlot===slot));
      button.setAttribute('aria-label',`${assigning?'Assign '+EQUIPMENT_BY_ID[assigning].name+' to':'Inspect'} quick slot ${slot+1}: ${item?.name??'Empty'}${item&&!permanent?`, ${count} carried`:''}`);
    });
    overlay.querySelector('.ip-loadout-help').textContent=assigning?`${EQUIPMENT_BY_ID[assigning].name} → tap a slot`:selectedQuickSlot!==null?`Slot ${selectedQuickSlot+1} · choose a supply to replace it`:'Select a carried supply, then a slot';
    for(const button of overlay.querySelectorAll('[data-ip-tool]'))button.setAttribute('aria-pressed',String(button.dataset.ipTool===selectedTool));
    control('clear-quick-slot').disabled=selectedQuickSlot===null||!model.loadout.slots[selectedQuickSlot];
  }
  function assignSlot(slot) {
    const itemId=selectedEquipment();
    if(!itemId){selectedQuickSlot=slot;selection=null;selectedTool=null;renderSelection();say('Choose a carried supply to replace a slot, or Clear to remove this shortcut.');return;}
    if(act('assignQuickSlot',{slot,itemId})){selection=null;selectedTool=null;selectedQuickSlot=slot;renderSelection();say(`${EQUIPMENT_BY_ID[itemId].name} assigned to slot ${slot+1}. Items stay in your backpack.`);}
  }
  function itemIcon(stack, size = 50) {
    return EQUIPMENT_BY_ID[stack.id] ? equipmentIcon(stack.id,size) : iconMarkup(model.catalog?.[stack.id]?.icon ?? stack.id,{size});
  }
  function say(message) { status.textContent = message; }
  function updateScrollHints() {
    for (const view of views.values()) {
      const text=inventoryScrollHint(view.grid.scrollTop,view.grid.clientHeight,view.grid.scrollHeight);
      if(view.hint.textContent!==text)view.hint.textContent=text;
      view.hint.hidden=!text;
    }
  }
  function cancelDrag() {
    clearTimeout(holdTimer); holdTimer = null;
    if (gesture?.button.hasPointerCapture?.(gesture.pointerId)) gesture.button.releasePointerCapture(gesture.pointerId);
    gesture = null; ghost.hidden = true; overlay.classList.remove('is-dragging');
  }
  function select(id,index) {
    selectedTool=null;selectedQuickSlot=null;
    activeId = id; const stack = container(id)?.slots[index];
    selection = stack ? { id,index,itemId:stack.id } : null; splitCount = null; renderSelection();
    say(model.catalog?.[stack?.id]?.description ?? 'Tap an item, then an empty slot. Drag to swap.');
  }
  function renderSelection() {
    const stack = selectedStack(), source = container(selection?.id), destination = containers().find(c => c.id !== (selection?.id ?? activeId));
    for (const [id,view] of views) {
      view.section.classList.toggle('is-active-container',id === activeId);
      view.buttons.forEach((button,index) => {
        const selected = selection?.id === id && selection.index === index;
        button.classList.toggle('is-selected',selected); button.setAttribute('aria-pressed',String(selected));
      });
    }
    const quickId=selectedQuickSlot===null?null:model?.loadout?.slots[selectedQuickSlot],shownEquipment=EQUIPMENT_BY_ID[selectedTool??quickId];
    const name = stack ? model.catalog?.[stack.id]?.name ?? stack.id : shownEquipment?.name ?? 'Select an item';
    const iconKey = stack?.id ?? shownEquipment?.id ?? '';
    if (selectionEl.dataset.icon !== iconKey) { selectionEl.querySelector('i').innerHTML = stack ? itemIcon(stack,48) : shownEquipment ? equipmentIcon(shownEquipment.id,48) : ''; selectionEl.dataset.icon = iconKey; }
    selectionEl.querySelector('strong').textContent = name;
    selectionEl.querySelector('small').textContent = stack ? source.withdrawOnly ? `${stack.count} ready to take${Number.isFinite(stack.totalCount) ? ` • ${stack.totalCount} remaining` : ''}` : `${stack.count} ${source.id === model.pack.id ? 'carried' : 'stored'}` : selectedTool ? 'Permanent tool · choose a quick slot' : selectedQuickSlot!==null ? `Quick slot ${selectedQuickSlot+1} · shortcut only` : 'Tap a stack to inspect it';
    control('transfer').textContent = source?.withdrawOnly ? 'Take to Backpack' : destination ? `To ${destination.label}` : 'Storage unavailable';
    control('transfer').title = destination?.withdrawOnly ? 'Legacy supplies is withdraw-only. Open Pod locker to deposit items.' : destination ? `Move selected stack to ${destination.label}` : 'Open a nearby storage container to transfer items.';
    control('transfer').disabled = !stack || !destination || !!destination.withdrawOnly;
    control('split').disabled = !stack || !!source.withdrawOnly || stack.count < 2 || !source.slots.some(s => !s);
    control('split').title = source?.withdrawOnly ? 'Take a stack to your backpack before splitting it.' : stack?.count > 1 && !source?.slots.some(s => !s) ? 'An empty slot is needed in this container.' : 'Move part of this stack into an empty slot.';
    control('sort').textContent = activeId === model?.pack.id ? 'Sort Pack' : 'Sort Storage';
    control('sort').disabled = !!container(activeId)?.withdrawOnly;
    control('sort').title = container(activeId)?.withdrawOnly ? 'Legacy supplies cannot be sorted.' : `Merge and sort ${container(activeId)?.label ?? 'Backpack'}`;
    for (const [id,key] of [[model?.pack?.id,'show-pack'],[model?.storage?.id,'show-storage']]) control(key).setAttribute('aria-pressed',String(id === activeId));
    renderLoadout();
    updateScrollHints();
  }
  function update() {
    if (!opened) return;
    const next = getModel(storageId);
    if (!next?.pack?.slots) { close(); return; }
    model = next;
    const nextSignature = containers().map(c => `${c.id}:${c.label}:${!!c.withdrawOnly}:${c.slots.map(s=>s ? `${s.id}:${s.count}:${s.totalCount??''}` : '-').join(',')}`).join('|') + `|${model.alternateStorage?.id??''}:${model.alternateStorage?.label??''}|${model.loadout?.slots.join(',')??''}`;
    if (nextSignature === signature) return;
    signature = nextSignature;
    if (!container(activeId)) activeId = model.pack.id;
    if (selection && selectedStack()?.id !== selection.itemId) { selection = null; splitCount = null; splitEl.hidden = true; }
    if (!splitEl.hidden) {
      if (!selectedStack() || selectedStack().count < 2 || !container(selection.id).slots.some(s => !s)) { splitCount = null; splitEl.hidden = true; }
      else { splitCount = Math.min(splitCount, selectedStack().count - 1); renderQuantity(); }
    }
    if (gesture && (container(gesture.id)?.slots[gesture.index]?.id !== gesture.itemId || container(gesture.id)?.slots[gesture.index]?.count !== gesture.count)) cancelDrag();
    for (const [id,view] of views) if (!container(id)) { resizeObserver.unobserve(view.grid);view.section.remove(); views.delete(id); }
    for (const c of containers()) {
      let view = views.get(c.id);
      if (!view) {
        const section = document.createElement('section');section.className='ip-container';
        section.innerHTML=`<h3><span class="ip-container-title"><span class="ip-container-name"></span><small class="ip-scroll-hint" hidden></small></span><b></b></h3><div class="ip-slots" role="group"></div>`;
        containersEl.append(section);view={section,grid:section.querySelector('.ip-slots'),hint:section.querySelector('.ip-scroll-hint'),buttons:[]};views.set(c.id,view);
        view.grid.addEventListener('scroll',updateScrollHints,{passive:true});resizeObserver.observe(view.grid);
      }
      view.section.querySelector('.ip-container-name').textContent=c.label;
      view.section.querySelector('h3 b').textContent=c.withdrawOnly?`${c.slots.filter(Boolean).length} types`:`${c.slots.filter(Boolean).length} / ${c.slots.length}`;
      view.grid.setAttribute('aria-label',`${c.label} slots`);
      while(view.buttons.length>c.slots.length)view.buttons.pop().remove();
      while(view.buttons.length<c.slots.length){const b=document.createElement('button');b.type='button';b.className='ip-slot';b.dataset.container=c.id;b.dataset.index=view.buttons.length;view.grid.append(b);view.buttons.push(b);}
      c.slots.forEach((stack,index)=>{
        const b=view.buttons[index],key=stack?`${stack.id}:${stack.count}`:'';
        if(b.dataset.stack!==key){b.innerHTML=stack?`${itemIcon(stack)}<b>${stack.count}</b>`:'';b.dataset.stack=key;}
        const name=stack?`${model.catalog?.[stack.id]?.name??stack.id}, ${stack.count}`:'Empty';
        b.setAttribute('aria-label',`${name}. ${c.label} slot ${index+1}`);b.title=stack?model.catalog?.[stack.id]?.name??stack.id:`Empty slot ${index+1}`;
      });
    }
    panel.classList.toggle('is-pack-only',!model.storage);
    panel.classList.toggle('has-alternate',!!model.alternateStorage);
    control('alternate').hidden=!model.alternateStorage;
    control('alternate').textContent=model.alternateStorage?.label??'';
    control('alternate').title=model.alternateStorage?`Open ${model.alternateStorage.label}`:'';
    overlay.querySelector('h2').textContent=model.storage?'Backpack & Storage':'Backpack';
    const journalButton=control('journal');
    if(journalButton){journalButton.textContent=model.storage?'Hotbar':'Journal';journalButton.setAttribute('aria-label',model.storage?'Arrange quick slots':'Journal');}
    control('show-pack').textContent=model.pack.label;control('show-storage').textContent=model.storage?.label??'Storage';control('show-storage').hidden=!model.storage;
    renderSelection();
  }
  function act(action,payload) {
    let result;
    try { result=onAction(action,payload); } catch { result={ok:false,reason:'unavailable'}; }
    cancelDrag();splitCount=null;splitEl.hidden=true;signature='';update();
    if(!result?.ok){say(MESSAGES[result?.reason]??'Could not complete that action.');return false;}
    if(action==='transfer')say(result.remaining?`Moved ${result.moved}. ${result.remaining} stayed in the source container.`:result.swapped?'Stacks swapped.':`Moved ${result.moved??'the selected'} items.`);
    else say(`${container(payload.id)?.label??'Container'} sorted and merged.`);
    return true;
  }
  function moveSelection(toId,toIndex=null,count=null) {
    if(!selection)return;
    const source={...selection};
    const reason=inventoryTransferReason(model,source.id,source.index,toId,toIndex);
    if(reason){say(reason);return;}
    if(act('transfer',{fromId:source.id,fromIndex:source.index,toId,toIndex,count,...(container(source.id)?.withdrawOnly?{itemId:source.itemId}:{})})) {
      if(container(source.id)?.slots[source.index]?.id===source.itemId)select(source.id,source.index);
      else if(toIndex!==null)select(toId,toIndex);
      else {selection=null;renderSelection();}
    }
  }
  function showSplit() {
    const stack=selectedStack();if(!stack||control('split').disabled)return;
    splitCount=Math.floor(stack.count/2);splitEl.hidden=false;overlay.querySelector('.ip-split-name').textContent=model.catalog?.[stack.id]?.name??stack.id;
    renderQuantity();control('split-confirm').focus();
  }
  function renderQuantity(){overlay.querySelector('.ip-quantity output').textContent=splitCount;control('less').disabled=splitCount<=1;control('more').disabled=splitCount>=selectedStack().count-1;}
  function open(id=null) {
    if(opened)cancelDrag();else restoreFocus=document.activeElement;
    storageId=id;opened=true;overlay.hidden=false;signature='';selection=null;selectedTool=null;selectedQuickSlot=null;activeId='backpack';splitEl.hidden=true;splitCount=null;suppressClick=false;
    update();if(!opened)return;
    const initial=model.storage?.withdrawOnly?model.storage:model.pack;
    select(initial.id,initial.slots.findIndex(Boolean));for(const view of views.values())view.grid.scrollTop=0;updateScrollHints();
    say(initial.withdrawOnly?'Take supplies into available backpack space. Deposits are unavailable.':'Tap an item, then an empty slot. Drag to swap.');control('close').focus({preventScroll:true});onBlockingChanged(true);
  }
  function close(){if(!opened)return;cancelDrag();opened=false;overlay.hidden=true;splitEl.hidden=true;selection=null;splitCount=null;onBlockingChanged(false);restoreFocus?.focus?.({preventScroll:true});}
  function click(event) {
    event.stopPropagation();if(suppressClick){suppressClick=false;return;}
    const tool=event.target.closest('[data-ip-tool]');
    if(tool){selectedTool=tool.dataset.ipTool;selection=null;selectedQuickSlot=null;splitEl.hidden=true;renderSelection();say('Choose a quick slot for this permanent tool.');return;}
    const quick=event.target.closest('.ip-quick-slot');
    if(quick){assignSlot(Number(quick.dataset.quickSlot));return;}
    const slot=event.target.closest('.ip-slot');
    if(slot){const id=slot.dataset.container,index=Number(slot.dataset.index);if(selection&&!container(id).slots[index])moveSelection(id,index);else select(id,index);return;}
    const action=event.target.closest('[data-ip]')?.dataset.ip;
    if(action==='close')close();
    else if(action==='clear-quick-slot'&&selectedQuickSlot!==null){const slot=selectedQuickSlot;if(act('assignQuickSlot',{slot,itemId:null})){renderSelection();say(`Slot ${slot+1} cleared. Your items stayed in place.`);}}
    else if(action==='journal'){if(model.storage)open();else{close();onOpenJournal?.();}}
    else if(action==='alternate'&&model.alternateStorage)open(model.alternateStorage.id);
    else if(action==='transfer'){const other=containers().find(c=>c.id!==selection?.id);if(other)moveSelection(other.id);}
    else if(action==='sort'){act('sort',{id:activeId});selection=null;renderSelection();}
    else if(action==='show-pack'||action==='show-storage'){activeId=action==='show-pack'?model.pack.id:model.storage.id;renderSelection();}
    else if(action==='split')showSplit();
    else if(action==='less'||action==='more'){splitCount+=action==='less'?-1:1;renderQuantity();}
    else if(action==='split-cancel'){splitCount=null;splitEl.hidden=true;control('split').focus();}
    else if(action==='split-confirm'){const payload=inventorySplitPayload(container(selection?.id),selection?.index,splitCount);if(payload){act('transfer',payload);slotButton(payload.fromId,payload.fromIndex)?.focus();}else{splitEl.hidden=true;say('An empty slot is needed to split this stack.');}}
  }
  function startDrag(){
    if(!gesture)return;gesture.active=true;select(gesture.id,gesture.index);overlay.classList.add('is-dragging');
    ghost.innerHTML=`${itemIcon({id:gesture.itemId},48)}<b>${gesture.count}</b>`;ghost.hidden=false;
    gesture.button.setPointerCapture?.(gesture.pointerId);positionGhost();
  }
  function positionGhost(){
    const viewport=window.visualViewport;
    const position=inventoryDragPosition(gesture.x,gesture.y,gesture.touch,{left:viewport?.offsetLeft??0,top:viewport?.offsetTop??0,width:viewport?.width??window.innerWidth,height:viewport?.height??window.innerHeight});
    ghost.style.transform=`translate(${position.x}px,${position.y}px)`;
  }
  function pointerDown(event){
    event.stopPropagation();suppressClick=false;const b=event.target.closest('.ip-slot');if(!b||event.button!==0||!splitEl.hidden)return;
    const id=b.dataset.container,index=Number(b.dataset.index),stack=container(id)?.slots[index];if(!stack)return;
    if(container(id).withdrawOnly)return;
    suppressClick=false;gesture={id,index,itemId:stack.id,count:stack.count,button:b,pointerId:event.pointerId,touch:event.pointerType==='touch',x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,active:false};
    if(gesture.touch)holdTimer=setTimeout(startDrag,INVENTORY_DRAG.holdMs);
  }
  function pointerMove(event){
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    gesture.x=event.clientX;gesture.y=event.clientY;
    const distance=Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY);
    if(!gesture.active&&distance>INVENTORY_DRAG.slop){if(gesture.touch){cancelDrag();return;}startDrag();}
    if(gesture?.active){event.preventDefault();positionGhost();}
  }
  function pointerUp(event){
    event.stopPropagation();if(!gesture||gesture.pointerId!==event.pointerId)return;
    const active=gesture.active,target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.ip-slot,.ip-quick-slot');
    cancelDrag();if(!active)return;suppressClick=true;
    if(target&&overlay.contains(target)){if(target.matches('.ip-quick-slot')){if(selectedEquipment())assignSlot(Number(target.dataset.quickSlot));else say('Only carried tools and usable supplies can go in quick slots.');}else moveSelection(target.dataset.container,Number(target.dataset.index));}else say('Move cancelled. Your items stayed in place.');
  }
  function keyDown(event){
    if(!opened)return;
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(gesture){cancelDrag();say('Move cancelled.');}else if(!splitEl.hidden){splitCount=null;splitEl.hidden=true;control('split').focus();}else if(selection||selectedTool||selectedQuickSlot!==null){selection=null;selectedTool=null;selectedQuickSlot=null;renderSelection();say('Selection cleared. Escape closes inventory.');}else close();return;}
    if(event.key==='Tab'){
      const scope=splitEl.hidden?panel:splitEl,buttons=[...scope.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}event.stopPropagation();return;
    }
    const slot=document.activeElement?.closest('.ip-slot');if(!slot||!splitEl.hidden)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation();const id=slot.dataset.container,index=inventoryKeyboardIndex(Number(slot.dataset.index),event.key,container(id).slots.length);slotButton(id,index)?.focus();return;
    }
    if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();const id=slot.dataset.container,index=Number(slot.dataset.index);if(selection&&(selection.id!==id||selection.index!==index))moveSelection(id,index);else select(id,index);}
  }
  const cancelPointer=()=>cancelDrag();
  const touchMove=event=>{if(gesture?.active)event.preventDefault();};
  overlay.addEventListener('click',click);overlay.addEventListener('pointerdown',pointerDown);overlay.addEventListener('pointermove',pointerMove);overlay.addEventListener('pointerup',pointerUp);overlay.addEventListener('pointercancel',cancelPointer);overlay.addEventListener('touchmove',touchMove,{passive:false});
  const outsidePointerUp=event=>{if(gesture&&!overlay.contains(event.target))pointerUp(event);};
  window.addEventListener('keydown',keyDown,true);window.addEventListener('blur',cancelPointer);window.addEventListener('pointerup',outsidePointerUp);
  return {open,close,isOpen:()=>opened,update,element:overlay,destroy(){close();resizeObserver.disconnect();window.removeEventListener('keydown',keyDown,true);window.removeEventListener('blur',cancelPointer);window.removeEventListener('pointerup',outsidePointerUp);cancelDrag();overlay.remove();}};
}
