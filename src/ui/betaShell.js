import { equipmentIcon, quickSlotsMarkup, equipmentInventoryMarkup } from '../equipment/equipmentView.js';
import { EQUIPMENT_BY_ID } from '../equipment/equipmentCatalog.js';
import { UPGRADE_CATALOG } from "../progression/upgradeCatalog.js";
import { createSkillTree } from "./skillTree.js";
import { iconMarkup, resourceLabel } from "./itemIcons.js";

const esc = (value = "") => String(value).replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" }[c]));
const label = (id) => resourceLabel(id);
const icon = (id, options = {}) => iconMarkup(id, options);
const effect = (modifiers = {}) => Object.entries(modifiers).map(([key, value]) => {
  if (key === "maxHealthBonus") return `+${value} health`;
  if (key === "captureCapacity") return `carry ${value} bonds`;
  if (key.includes("DamageMultiplier")) return `+${Math.round((value - 1) * 100)}% tool power`;
  if (key.includes("YieldMultiplier")) return `+${Math.round((value - 1) * 100)}% harvest`;
  if (key === "pickupMagnetRadius") return `reach ${value}m`;
  if (key === "pickupMagnetSpeed" || key === "pickupMagnetAccel") return "faster pull";
  if (key === "medkitHeal") return `medkits heal ${value}`;
  return `${key} ${value}`;
}).join(" · ");

// Presentation only: carried ingredients never make a Camp recipe affordable.
export function ingredientGuidance(cost, costLabel, bank = {}, cargo = {}, isCamp = true) {
  const find = [], secure = [];
  for (const [id, amount] of Object.entries(cost)) {
    const needed = Math.max(0, amount - (bank[id] ?? 0));
    const carried = isCamp ? 0 : Math.min(needed, cargo[id] ?? 0);
    if (needed > carried) find.push(`${needed-carried} ${label(id)}`);
    if (carried > 0) secure.push(`${carried} ${label(id)}`);
  }
  return [find.length ? `${isCamp ? 'Need' : 'Find'} ${find.join(' + ')}` : '', secure.length ? `Extract ${secure.join(' + ')}` : ''].filter(Boolean).join(' · ') || `${isCamp ? 'Ready' : 'Secured'}: ${costLabel}`;
}

export function createBetaShell({ app, getModel, onAction = () => null, onBlockingChanged = () => {}, canOpen = () => true } = {}) {
  if (!app) return { update() {}, open() {}, close() {}, isOpen: () => false, showWelcome() {}, toast() {}, destroy() {} };
  const root = document.createElement("div"); root.id = "beta-shell"; root.setAttribute("aria-live", "polite");
  const modal = document.createElement("section"); modal.className = "beta-modal"; modal.hidden = true;
  const hud = document.createElement("div"); hud.className = "beta-hud";
  // The field HUD deliberately has one main action.  Skills remain in Pack so
  // a player can read the right side as camera space and only reach for the
  // compact, individually framed actions needed in the current encounter.
  hud.innerHTML = `<div class="beta-objective"></div><div class="beta-hud-actions equipment-toolbar" aria-label="Equipment quick slots"><span class="equipment-selected-name"></span><div class="equipment-slots"></div><button class="beta-hud-button" data-action="open" data-tab="inventory" aria-label="Open backpack">${icon("backpack")}<span>PACK</span><b class="beta-cargo-count">0</b></button></div><div class="beta-quick" aria-label="Companion ability"><button data-action="ability" class="beta-ability">${icon("paw")}<span class="ability-label">ABILITY</span></button></div><div class="beta-action-cluster" aria-label="Field actions"><button type="button" class="beta-field-tool beta-direct-action" aria-label="Hold Attack or Field Tool">${icon("axe")}<span>ATTACK</span></button><button type="button" class="beta-dodge beta-direct-action" aria-label="Dodge"><span class="beta-dodge-glyph" aria-hidden="true">↗</span><span>DODGE</span></button></div><div class="beta-joystick-home" aria-hidden="true"><i></i><span>MOVE</span></div>`;
  const toastEl = document.createElement("div"); toastEl.className = "beta-toast"; toastEl.hidden = true;
  const fieldGuide = document.createElement('div'); fieldGuide.className = 'beta-field-guide'; fieldGuide.hidden = true;
  fieldGuide.innerHTML = '<div><strong></strong><span></span></div><button data-action="cancelTaming" aria-label="Stop taming attempt">×</button>';
  hud.append(fieldGuide);
  let fieldGuideKey = '';
  root.append(hud, modal, toastEl); app.appendChild(root);
  let opened = false, welcome = false, activeTab = "journal", inventoryTab = "equipment", selectedEquipment = null, equipmentHudKey = "", primaryKey = "", workshopTab = 'build', selectedItem = null, selectedSkill = null, lastUpdate = 0, signature = "", toastTimer = 0, pendingImport = null;
  let suppressOpeningClick = false;
  root.addEventListener("pointerdown", () => { suppressOpeningClick = false; }, true);
  root.addEventListener("click", (event) => {
    if (!suppressOpeningClick || event.detail === 0) return;
    suppressOpeningClick = false; event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  root.addEventListener("pointerdown", (event) => event.stopPropagation()); root.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
  const fieldToolButton = hud.querySelector(".beta-field-tool");
  let fieldToolPointerId = null;
  const endFieldTool = (event) => {
    if (fieldToolPointerId === null || (event?.pointerId !== undefined && event.pointerId !== fieldToolPointerId)) return;
    fieldToolPointerId = null;
    onAction("fieldToolEnd");
  };
  fieldToolButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    // This gesture is handled on press. Its delayed touch click may arrive
    // after Build opens a modal, even when pointerup preceded the next frame.
    suppressOpeningClick = true;
    if (fieldToolPointerId !== null) endFieldTool();
    fieldToolPointerId = event.pointerId;
    try { fieldToolButton.setPointerCapture?.(event.pointerId); } catch { /* Synthetic events and old webviews may not own this pointer. */ }
    onAction("fieldToolStart");
  });
  const onWindowPointerEnd = (event) => endFieldTool(event);
  const onVisibilityChange = () => { if (document.hidden) endFieldTool(); };
  fieldToolButton.addEventListener("pointerup", endFieldTool);
  fieldToolButton.addEventListener("pointercancel", endFieldTool);
  fieldToolButton.addEventListener("lostpointercapture", endFieldTool);
  window.addEventListener("pointerup", onWindowPointerEnd);
  window.addEventListener("pointercancel", onWindowPointerEnd);
  window.addEventListener("blur", endFieldTool);
  document.addEventListener("visibilitychange", onVisibilityChange);
  hud.querySelector(".beta-dodge").addEventListener("click", (event) => { event.preventDefault(); onAction("dodge"); });
  const setBlocking = (value) => onBlockingChanged(!!value);
  const focusModal = () => requestAnimationFrame(() => modal.querySelector("button,input")?.focus());
  function result(action, payload) {
    const response = onAction(action, payload);
    const complete = (resolved) => { const message = typeof resolved === "string" ? resolved : resolved?.message; if (message) toast(resolved?.ok === false ? "Not yet" : "Frontier", message); render(true); };
    if (response?.then) { response.then(complete).catch(() => toast("Restore failed", "That save could not be restored.")); return; }
    complete(response); return response;
  }
  function open(tab = "journal") { if (!canOpen()) return false; if (fieldToolPointerId !== null) suppressOpeningClick = true; endFieldTool(); welcome = false; opened = true; activeTab = tab; if (tab === "inventory") inventoryTab = "equipment"; modal.hidden = false; root.classList.add("is-open"); setBlocking(true); signature = ""; render(true); focusModal(); return true; }
  function openBuildCatalog() { workshopTab = "build"; return open("workshop"); }
  function close() { endFieldTool(); if (modal.contains(document.activeElement)) document.activeElement.blur(); pendingImport = null; welcome = false; opened = false; modal.hidden = true; root.classList.remove("is-open", "is-welcome"); setBlocking(false); }
  function isOpen() { return opened || welcome; }
  function showWelcome() { welcome = true; opened = false; modal.hidden = false; root.classList.add("is-open", "is-welcome"); setBlocking(true); render(true); focusModal(); }
  function toast(title, detail = "") { toastEl.innerHTML = `<strong>${esc(title)}</strong><span>${esc(detail)}</span>`; toastEl.hidden = false; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.classList.remove("show"); toastEl.hidden = true; }, 2400); }
  function itemGrid(items, values) { return `<div class="item-grid">${items.map((id) => { const count = Math.max(0, Number(values?.[id]) || 0); return `<button data-resource-id="${esc(id)}" class="item-slot ${selectedItem === id ? "is-selected" : ""}" aria-label="${esc(label(id))}: ${count}">${icon(id)}<b>${count}</b></button>`; }).join("")}</div>`; }
  function inventoryPanel(model) {
    const tabs = `<div class="segment"><button data-inventory-tab="equipment" class="${inventoryTab==='equipment'?'active':''}">EQUIPMENT</button><button data-inventory-tab="carried" class="${inventoryTab==='carried'?'active':''}">CARRIED</button><button data-inventory-tab="stored" class="${inventoryTab==='stored'?'active':''}">STORED</button></div>`;
    if (inventoryTab === 'equipment') return `<section class="backpack-panel equipment-pack"><div class="panel-title"><div>${icon('backpack')}<div><p class="beta-kicker">FIELD PACK</p><h2>Equipment</h2></div></div></div>${tabs}${equipmentInventoryMarkup(model.progress,selectedEquipment)}</section>`;
    const carried = model.cargo ?? {}, stored = model.progress?.bankedResources ?? {};
    const values = inventoryTab === "carried" ? carried : stored;
    const ids = [...new Set([...Object.keys(stored), ...Object.keys(carried)])];
    const active = selectedItem && ids.includes(selectedItem) ? selectedItem : (ids.find((id) => (values[id] ?? 0) > 0) ?? ids[0]);
    selectedItem = active ?? null;
    const count = active ? Math.max(0, Number(values[active]) || 0) : 0;
    const source = inventoryTab === "carried" ? "At risk until you extract." : "Secured at Camp. Spend it in Workshop.";
    const detail = active ? `<article class="item-detail">${icon(active)}<div><p class="beta-kicker">${inventoryTab === "carried" ? "EXPEDITION ITEM" : "CAMP STORE"}</p><h3>${esc(label(active))}</h3><strong>${count}</strong><p>${source}</p></div></article>` : `<p class="beta-empty">Gather materials on an expedition, then extract to secure them.</p>`;
    return `<section class="backpack-panel"><div class="panel-title"><div>${icon("backpack")}<div><p class="beta-kicker">FIELD PACK</p><h2>Backpack</h2></div></div><span>${inventoryTab === "carried" ? "AT RISK" : "SECURED"}</span></div>${tabs}<div class="mobile-item-detail">${detail}</div>${itemGrid(ids, values)}<div class="desktop-item-detail">${detail}</div></section>`;
  }
  function upgradesWorkshop(model) {
    const bank = model.progress?.bankedResources ?? {};
    return model.isCamp ? `<section class="workshop-panel"><div class="panel-title"><div>${icon("axe")}<div><p class="beta-kicker">MATTER RESONATOR</p><h2>Workshop</h2></div></div></div><p class="panel-intro">Spend secured materials to strengthen each expedition.</p><div class="workshop-store">${Object.keys(bank).map((id) => `<span>${icon(id)}<b>${bank[id] || 0}</b></span>`).join("")}</div>${UPGRADE_CATALOG.map((upgrade) => { const current = model.progress?.upgrades?.[upgrade.id] ?? 0; const tier = upgrade.tiers[current]; const levelLocked = tier && (model.playerLevel ?? 1) < tier.minPlayerLevel; const cost = Object.entries(tier?.cost ?? {}); const available = tier && !levelLocked && cost.every(([id, amount]) => (bank[id] ?? 0) >= amount); return `<article class="upgrade-card ${!tier ? "is-max" : ""}"><div class="upgrade-card__mark">${icon(upgrade.id === "vitality" ? "shield" : upgrade.id === "field_tool" ? "axe" : upgrade.id === "capture_capacity" ? "paw" : upgrade.id === "field_medicine" ? "medkit" : "skills")}</div><div><p class="beta-kicker">${current}/${upgrade.tiers.length} TIER</p><h3>${esc(upgrade.displayName)}</h3><em>${tier ? esc(effect(tier.modifiers)) : "Fully synchronized"}</em>${tier ? `<div class="cost-row">${cost.map(([id, amount]) => `<span class="${(bank[id] ?? 0) >= amount ? "met" : ""}">${icon(id)}${amount}</span>`).join("")}<small>LV ${tier.minPlayerLevel}</small></div>` : ""}</div>${tier ? `<button data-action="purchaseUpgrade" data-id="${esc(upgrade.id)}" ${available ? "" : "disabled"}>SYNC</button>` : ""}</article>`; }).join("")}<button class="craft-button" data-action="craftMedkit">${icon("medkit")} CRAFT MEDKIT <span>${icon("fiber")}3 ${icon("berries")}2</span></button></section>` : `<section class="beta-locked"><div>${icon("skills")}</div><p class="beta-kicker">CAMP SYSTEM</p><h2>Workshop at Camp</h2><p>Extract to Camp before spending secured matter.</p></section>`;
  }
  function workshop(model) {
    if(!model.base)return upgradesWorkshop(model);
    const base=model.base,bank=model.progress?.bankedResources??{};
    const cost=(values)=>`<div class="base-cost">${Object.entries(values).map(([id,count])=>`<span class="${(bank[id]??0)>=count?'met':''}" title="${esc(label(id))}: ${(bank[id]??0)} stored">${icon(id,{size:24})}<b>${count}</b></span>`).join('')}</div>`;
    const ingredients=(recipe)=>`<p class="base-ingredients">${esc(ingredientGuidance(recipe.cost,recipe.costLabel,bank,model.cargo,model.isCamp))}</p>`;
    const nav=`<div class="base-tabs" aria-label="Camp workshop pages">${[['build','Build'],['craft','Craft'],['upgrades','Upgrades']].map(([id,name])=>`<button data-workshop-tab="${id}" class="${workshopTab===id?'active':''}">${name}</button>`).join('')}</div>`;
    if(workshopTab==='upgrades')return nav+upgradesWorkshop(model);
    const pieceIcons={foundation:'stone',wall:'wood',doorway:'wood',fence:'wood',lantern:'crystal_shard',workbench:'axe',fabricator:'iron_ore',resonance:'crystal_shard',bed:'paw'};
    const fieldIcons={trail_ration:'berries',berry_lure:'berries',woven_snare:'fiber',calming_chime:'crystal_shard',reinforced_tether:'iron_ore'};
    let content='';
    if(workshopTab==='build'){
      content=`<div class="base-guide"><span>${icon('map',{size:28})}<b>South clearing</b> · beyond the drop pod</span><small>Free placement · full material refund on removal</small></div><div class="base-card-grid">${base.pieces.map(p=>`<article class="base-card ${p.id==='foundation'&&!base.structures.length?'base-starter':''}"><div class="base-card-title"><img class="base-model-icon" src="./assets/ui/base/${p.id}.png" alt="" width="68" height="68"><div><h3>${esc(p.name)}${p.id==='foundation'&&!base.structures.length?'<small class="base-starter-label">FIRST BUILD</small>':''}</h3><p>${esc(p.description)}</p></div></div>${ingredients(p)}<div class="base-card-bottom">${cost(p.cost)}<button data-action="beginBuild" data-id="${p.id}" ${model.isCamp&&p.affordable?'':'disabled'}>BUILD</button></div></article>`).join('')}</div><div class="base-expansion"><div><strong>Clearing ${base.tier+1}/3</strong><span>${base.structures.length}/${base.maxStructures} pieces</span></div>${base.nextExpansion?`${cost(base.nextExpansion.cost)}<button data-action="expandBase" ${model.isCamp&&base.nextExpansion.affordable?'':'disabled'}>EXPAND</button>`:'<span>Fully expanded</span>'}</div>${base.structures.length?`<details class="base-placed"><summary>Placed pieces · ${base.structures.length}</summary>${base.structures.map((s,index)=>`<div><span>${icon(pieceIcons[s.type],{size:26})}${esc(s.name)} ${index+1}</span><button data-action="removeStructure" data-id="${esc(s.id)}" ${model.isCamp?'':'disabled'}>REMOVE + REFUND</button></div>`).join('')}</details>`:''}`;
    }else{
      content=`<p class="base-guide">Berry lure needs no station. Craft at Camp, then offer it to a Mossling.</p><div class="base-card-grid">${base.recipes.map(r=>`<article class="base-card ${r.id==='berry_lure'&&!r.count?'base-starter':''}"><div class="base-card-title">${icon(fieldIcons[r.id],{size:38})}<div><h3>${esc(r.name)} <small>×${r.count}</small>${r.id==='berry_lure'&&!r.count?'<small class="base-starter-label">FIRST LURE</small>':''}</h3><p>${esc(r.description)}${r.stationName?' · '+esc(r.stationName):''}</p></div></div>${ingredients(r)}<div class="base-card-bottom">${cost(r.cost)}<button data-action="craftFieldSupply" data-id="${r.id}" ${model.isCamp&&r.affordable&&!r.locked?'':'disabled'}>${r.locked?'USE STATION':'CRAFT'}</button></div></article>`).join('')}<article class="base-card"><div class="base-card-title">${icon('medkit',{size:38})}<div><h3>Field medkit <small>×${model.medkits??0}</small></h3><p>Restore health during an expedition.</p></div></div>${ingredients({cost:{fiber:3,berries:2},costLabel:"3 Fiber + 2 Berries"})}<div class="base-card-bottom">${cost({fiber:3,berries:2})}<button data-action="craftMedkit" ${model.isCamp&&(bank.fiber??0)>=3&&(bank.berries??0)>=2?'':'disabled'}>CRAFT</button></div></article></div>`;
    }
    return `<section class="base-workshop">${nav}${!model.isCamp?'<p class="base-away">Extract to Camp to build or craft. Carried ingredients must be secured first.</p>':''}${content}</section>`;
  }
  function companionPanel(model) { const companions = model.companions ?? []; const selected = companions.find((c) => c.id === selectedItem) ?? companions.find((c) => c.active) ?? companions[0]; return `<section class="wildkin-panel"><div class="panel-title"><div>${icon("paw")}<div><p class="beta-kicker">FIELD BONDS</p><h2>Wildkin</h2></div></div><span>${(model.pendingCompanions ?? []).length}/${model.captureCapacity ?? 1}</span></div><div class="wildkin-list">${companions.map((c) => `<button data-companion-id="${esc(c.id)}" class="wildkin-chip ${selected?.id === c.id ? "is-selected" : ""} ${c.secured ? "is-secured" : ""}" style="--wildkin:${esc(c.color || "#36c896")}">${icon(c.id, { size: 30, label: c.name })}<span>${esc(c.name)}</span>${c.secured ? "<b>✓</b>" : ""}</button>`).join("")}</div>${selected ? `<article class="wildkin-detail" style="--wildkin:${esc(selected.color || "#36c896")}">${icon(selected.id, { size: 50, label: selected.name })}<div><p class="beta-kicker">${selected.secured ? selected.active ? "ACTIVE COMPANION" : "SECURED AT CAMP" : selected.pending ? "UNSECURED — EXTRACT" : selected.discovered ? "OBSERVED" : "UNKNOWN SIGNAL"}</p><h3>${esc(selected.name)}</h3><p>${esc(selected.secured ? selected.abilityDescription : selected.habitat || "Follow its frontier signal.")}</p>${!selected.secured && selected.taming ? `<p class="wildkin-taming-guide">${esc(selected.taming.guide)}</p><small>Prepare field gear at Camp → Work → Craft.</small>` : ""}</div>${selected.secured ? `<button data-action="selectCompanion" data-id="${esc(selected.id)}">${selected.active ? "ACTIVE" : "SELECT"}</button>` : ""}</article>` : ""}</section>`; }
  function journal(model) { return `<section class="journal-panel"><p class="beta-kicker">NEXT EXPEDITION</p><h2>${esc(model.objective?.title || "Answer the frontier call")}</h2><p>${esc(model.objective?.description || "Step through the gate and bring something home.")}</p><button class="beta-gold-button" data-action="openMap">${icon("map")} OPEN MAP</button><div class="journal-stats"><span><b>LV ${model.playerLevel ?? 1}</b> FRONTIER</span><span><b>${model.bankedXp ?? 0}</b> SECURED XP</span></div></section>`; }
  function morePanel() { return `<section class="more-panel"><p class="beta-kicker">FRONTIER MENU</p><h2>More</h2><p>Camp systems, companions, and settings.</p><button data-tab="workshop">${icon("axe", { size: 30 })}<span><b>Workshop</b><small>Spend secured materials</small></span><i>›</i></button><button data-tab="wildkin">${icon("paw", { size: 30 })}<span><b>Wildkin</b><small>Choose your companion</small></span><i>›</i></button><button data-tab="settings">${icon("settings", { size: 30 })}<span><b>Settings</b><small>Sound, motion, and saves</small></span><i>›</i></button></section>`; }
  function settings(model) { return `<section class="settings-panel"><p class="beta-kicker">EXPEDITION SETTINGS</p><h2>Settings</h2><label><span>Sound</span><input data-action="mute" type="checkbox" ${model.settings?.muted ? "" : "checked"}></label><label><span>Reduced motion</span><input data-action="reducedMotion" type="checkbox" ${model.settings?.reducedMotion ? "checked" : ""}></label><div class="controls-card"><b>CONTROLS</b><div class="desktop-controls"><p>WASD moves camera-relative · Shift run · C sneak · Space dodge</p><p>1–5 equip · F use / hold tool · E interact · Q ability · H medkit</p><p>Drag to orbit · B backpack · K skills · M map</p></div><div class="touch-controls"><p>Left stick moves. Drag the open right side to orbit; movement faces its direction.</p><p>Tap a quick slot to equip, then Attack or Use. Hold the Omni-tool to swing. Pack → Equipment assigns items; tap world labels to interact.</p></div></div><button data-action="exportSave">EXPORT SAVE</button>${pendingImport ? `<div class="restore-card"><strong>Restore ${esc(pendingImport.name)}?</strong><p>This replaces the current Camp save.</p><button data-action="cancel-import">CANCEL</button><button data-action="confirm-import">RESTORE</button></div>` : `<label class="beta-import">RESTORE SAVE<input data-action="import-save" type="file" accept="application/json,.json"></label>`}</section>`; }
  function body(model) {
    if (welcome) return `<div class="beta-welcome"><div class="beta-emblem">${icon("paw")}</div><p class="beta-kicker">SUNLIT WILDS</p><h1>WILDKIN<br><span>FRONTIER</span></h1><p>Gather. Bond. Bring the frontier home.</p><p class="landscape-tip">For the widest view, turn your phone sideways.</p><button class="beta-gold-button" data-action="start">${model.progress?.hasDepartedOnce ? "CONTINUE" : "ENTER FRONTIER"}</button><button class="beta-link" data-action="open" data-tab="settings">Settings</button></div>`;
    const tabs = [["journal", "MAP", "map"], ["inventory", "PACK", "backpack"], ["workshop", "WORK", "axe"], ["skills", "SKILLS", "skills"], ["wildkin", "WILDKIN", "paw"], ["settings", "SETTINGS", "settings"], ["more", "MORE", "more"]].map(([id, name, iconId]) => `<button class="tab-${id} ${activeTab === id ? "active" : ""}" data-tab="${id}">${icon(iconId, { size: 25 })}<span>${name}</span></button>`).join("");
    const panel = activeTab === "inventory" ? inventoryPanel(model) : activeTab === "workshop" ? workshop(model) : activeTab === "skills" ? createSkillTree({ skills: model.skills ?? {}, iconMarkup: icon, selectedId: selectedSkill }) : activeTab === "wildkin" ? companionPanel(model) : activeTab === "settings" ? settings(model) : activeTab === "more" ? morePanel() : journal(model);
    return `<div class="beta-panel" role="dialog" aria-modal="true" aria-label="Wildkin Frontier menu"><header><div><p>WILDKIN FRONTIER</p><strong>${esc(model.regionName || "Camp")}</strong></div><button class="beta-close" data-action="close" aria-label="Close">×</button></header><nav>${tabs}</nav><main>${panel}</main></div>`;
  }
  function updateEquipmentHud(model) {
    const state = model.progress, loadout = state?.loadout;
    if (!loadout) return;
    const nextKey = JSON.stringify([loadout,state.craftedConsumables,state.fieldSupplies,model.fieldTaming?.stage]);
    if (nextKey !== equipmentHudKey) {
      equipmentHudKey = nextKey;
      hud.querySelector('.equipment-slots').innerHTML = quickSlotsMarkup(state);
      const item = EQUIPMENT_BY_ID[loadout.slots[loadout.selected]];
      hud.querySelector('.equipment-selected-name').textContent = item?.name ?? 'Empty slot';
      const attempt = model.fieldTaming?.speciesId === item?.species ? model.fieldTaming : null;
      const nextPrimary = `${item?.id}|${attempt?.stage ?? ''}`;
      if (nextPrimary !== primaryKey) {
        primaryKey = nextPrimary;
        const tamingAction = { lure:'WAIT',feed:'WAIT',snare:'WAIT',ready:'BOND',trapped:'RELEASE',challenge:'TAME',tether:'TETHER',offer:'OFFER',call:'RING',perch:'WAIT' }[attempt?.stage];
        fieldToolButton.innerHTML = `${equipmentIcon(item?.id,46)}<span>${tamingAction ?? item?.actionLabel?.toUpperCase() ?? 'USE'}</span>`;
        fieldToolButton.setAttribute('aria-label', item?.kind==='tool' ? 'Hold Attack with Omni-tool' : `Use ${item?.name ?? 'selected item'}`);
      }
    }
  }
  function render(force = false) { const model = getModel?.() ?? {}; const next = JSON.stringify({ welcome, opened, activeTab, inventoryTab, selectedItem, selectedSkill, selectedEquipment, pendingImport: pendingImport?.name, camp: model.isCamp, region: model.regionName, cargo: model.cargo, xp: model.bankedXp, progress: model.progress, skills: model.skills, companions: model.companions, settings: model.settings }); if (force || next !== signature) { signature = next; modal.innerHTML = body(model); const main = modal.querySelector("main"); if (main) { const syncScrollCue = () => { const scrollable = main.scrollHeight > main.clientHeight + 1; main.classList.toggle("is-scrollable", scrollable); main.classList.toggle("is-at-end", !scrollable || main.scrollTop + main.clientHeight >= main.scrollHeight - 2); }; syncScrollCue(); main.addEventListener("scroll", syncScrollCue, { passive: true }); } } const objective = hud.querySelector(".beta-objective"); if (objective) objective.innerHTML = `<small>${esc(model.regionName || "CAMP")}</small><strong>${esc(model.objective?.title || "Find the frontier signal")}</strong>`; updateEquipmentHud(model); hud.querySelector(".beta-cargo-count").textContent = Object.values(model.cargo ?? {}).reduce((sum, count) => sum + (Number(count) || 0), 0); const ability = hud.querySelector(".beta-ability"); ability.disabled = !model.ability?.ready || model.isCamp; ability.dataset.cooldown = !model.isCamp && model.ability && !model.ability.ready ? Math.ceil(model.ability.cooldown || 0) : ""; ability.setAttribute("aria-label", model.ability?.name ?? "Companion ability"); const activeCompanion = (model.companions ?? []).find((companion) => companion.active); const companionIconId = activeCompanion?.id ?? "paw"; if (ability.dataset.companionIconId !== companionIconId) { ability.querySelector(".item-icon")?.replaceWith(document.createRange().createContextualFragment(icon(companionIconId, { size: 32, label: activeCompanion?.name ?? "Companion ability" }))); ability.dataset.companionIconId = companionIconId; } ability.querySelector(".ability-label").textContent = !model.ability ? "ABILITY" : model.ability.ready ? model.ability.name : `${model.ability.name} ${Math.ceil(model.ability.cooldown || 0)}s`; }
  root.addEventListener("click", (event) => { const item = event.target.closest("[data-resource-id],[data-skill-id],[data-companion-id],button"); if (!item || item.classList.contains("beta-direct-action")) return; event.preventDefault(); if (item.dataset.equipmentId) { selectedEquipment = item.dataset.equipmentId; render(true); return; }
    if (item.dataset.assignSlot !== undefined) { result('assignQuickSlot', { slot: Number(item.dataset.assignSlot), id: selectedEquipment }); return; }
    if (item.dataset.resourceId) { selectedItem = item.dataset.resourceId; render(true); return; } if (item.dataset.skillId) { selectedSkill = item.dataset.skillId; render(true); return; } if (item.dataset.companionId) { selectedItem = item.dataset.companionId; render(true); return; } const action = item.dataset.action; if (action === "open") { open(item.dataset.tab || "journal"); return; } if (item.dataset.tab) { activeTab = item.dataset.tab; render(true); return; } if (action === "close") { close(); return; } if (action === "start") { result("start"); close(); return; } if (action === "cancel-import") { pendingImport = null; render(true); return; } if (action === "confirm-import") { const file = pendingImport; pendingImport = null; result("import-save", file); render(true); return; } if (action === "selectCompanion") result(action, item.dataset.id || null); else if (action) { if(action==='selectQuickSlot')endFieldTool(); result(action, item.dataset.id); } render(true); });
  root.addEventListener("click", (event) => { const tab = event.target.closest("[data-inventory-tab]")?.dataset.inventoryTab; if (tab) { inventoryTab = tab; render(true); } });
  root.addEventListener('click',event=>{const tab=event.target.closest('[data-workshop-tab]')?.dataset.workshopTab;if(tab){workshopTab=tab;render(true);}});
  root.addEventListener("change", (event) => { const action = event.target.dataset.action; if (action === "import-save") { pendingImport = event.target.files?.[0] ?? null; event.target.value = ""; render(true); return; } if (action) result(action, action === "mute" ? !event.target.checked : event.target.checked); });
  const keydown = (event) => { if (event.defaultPrevented) return; if (event.key === "Escape" && !event.repeat) { if (!isOpen() && !canOpen()) return; event.preventDefault(); isOpen() ? close() : open(); return; } if (event.key === "Tab" && isOpen()) { const controls = [...modal.querySelectorAll("button:not([disabled]),input:not([disabled])")].filter((control) => control.getClientRects().length && getComputedStyle(control).visibility !== "hidden"); if (!controls.length) return; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } };
  window.addEventListener("keydown", keydown);
  function update() {
    const now = performance.now(); if (now - lastUpdate < 200) return;
    lastUpdate = now; render(false);
    const attempt = getModel?.()?.fieldTaming;
    const key = attempt ? `${attempt.label}|${attempt.detail}` : '';
    if (key === fieldGuideKey) return;
    fieldGuideKey = key;
    fieldGuide.hidden = !attempt;
    root.classList.toggle('has-field-taming', Boolean(attempt));
    if (attempt) {
      fieldGuide.querySelector('strong').textContent = attempt.label;
      fieldGuide.querySelector('span').textContent = attempt.detail;
    }
  }
  return { update, open, openBuildCatalog, close, isOpen, getState: () => ({ open: opened, welcome, tab: activeTab }), showWelcome, toast, destroy() { clearTimeout(toastTimer); endFieldTool(); window.removeEventListener("pointerup", onWindowPointerEnd); window.removeEventListener("pointercancel", onWindowPointerEnd); window.removeEventListener("blur", endFieldTool); document.removeEventListener("visibilitychange", onVisibilityChange); window.removeEventListener("keydown", keydown); root.remove(); } };
}
