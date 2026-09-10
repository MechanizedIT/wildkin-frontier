import { UPGRADE_CATALOG } from "../progression/upgradeCatalog.js";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const resources = (cost = {}) => Object.entries(cost).map(([id, amount]) => `${amount} ${id.replaceAll("_", " ")}`).join(" · ") || "No cost";
const effect = (modifiers = {}) => Object.entries(modifiers).map(([key, value]) => {
  if (key === "maxHealthBonus") return `+${value} max health`;
  if (key === "captureCapacity") return `shelter capacity ${value}`;
  if (key.includes("DamageMultiplier")) return `tool damage +${Math.round((value - 1) * 100)}%`;
  if (key.includes("YieldMultiplier")) return `harvest yield +${Math.round((value - 1) * 100)}%`;
  if (key === "pickupMagnetRadius") return `pickup range ${value}m`;
  if (key === "pickupMagnetSpeed") return `pickup speed ${value}`;
  if (key === "medkitHeal") return `medkits heal ${value}`;
  return `${key} ${value}`;
}).join(" · ");
const missingCost = (cost, bank) => Object.entries(cost ?? {}).filter(([id, amount]) => (bank[id] ?? 0) < amount).map(([id, amount]) => `${amount - (bank[id] ?? 0)} ${id.replaceAll("_", " ")}`);

export function createBetaShell({ app, getModel, onAction = () => null, onBlockingChanged = () => {}, canOpen = () => true } = {}) {
  if (!app) return { update() {}, open() {}, close() {}, isOpen: () => false, showWelcome() {}, toast() {}, destroy() {} };
  const root = document.createElement("div"); root.id = "beta-shell"; root.setAttribute("aria-live", "polite");
  const modal = document.createElement("section"); modal.className = "beta-modal"; modal.hidden = true;
  const hud = document.createElement("div"); hud.className = "beta-hud";
  hud.innerHTML = `<button class="beta-menu" data-action="open" aria-label="Open journal"><span>✦</span> JOURNAL</button><div class="beta-objective"></div><div class="beta-quick"><button data-action="ability" class="beta-ability">ABILITY</button><button data-action="heal" class="beta-heal">✚ <small>0</small></button></div>`;
  const toastEl = document.createElement("div"); toastEl.className = "beta-toast"; toastEl.hidden = true;
  root.append(hud, modal, toastEl); app.appendChild(root);
  let opened = false, welcome = false, activeTab = "journal", lastUpdate = 0, signature = "", toastTimer = 0, pendingImport = null;
  const preventLeak = (event) => { event.stopPropagation(); };
  root.addEventListener("pointerdown", preventLeak); root.addEventListener("touchstart", preventLeak, { passive: true });

  function result(action, payload) {
    const response = onAction(action, payload);
    if (response?.then) {
      response.then((resolved) => {
        const message = typeof resolved === "string" ? resolved : resolved?.message;
        if (message) toast(resolved?.ok === false ? "Restore failed" : "Frontier", message);
        render(true);
      }).catch(() => toast("Restore failed", "That save could not be restored."));
      return response;
    }
    const message = typeof response === "string" ? response : response?.message;
    if (message) toast(action === "purchaseUpgrade" ? "Resonator" : "Frontier", message);
    return response;
  }
  function setBlocking(value) { onBlockingChanged(!!value); }
  function focusModal() { requestAnimationFrame(() => modal.querySelector("button,input")?.focus()); }
  function open(tab = "journal") { if (!canOpen()) return false; welcome = false; opened = true; activeTab = tab; modal.hidden = false; root.classList.add("is-open"); setBlocking(true); signature = ""; render(true); focusModal(); return true; }
  function close() { if (modal.contains(document.activeElement)) document.activeElement.blur(); pendingImport = null; welcome = false; opened = false; modal.hidden = true; root.classList.remove("is-open", "is-welcome"); setBlocking(false); }
  function isOpen() { return opened || welcome; }
  function showWelcome() { welcome = true; opened = false; modal.hidden = false; root.classList.add("is-open", "is-welcome"); setBlocking(true); render(true); focusModal(); }
  function toast(title, detail = "") { toastEl.innerHTML = `<strong>${esc(title)}</strong><span>${esc(detail)}</span>`; toastEl.hidden = false; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.classList.remove("show"); toastEl.hidden = true; }, 2600); }
  function companionCards(model) {
    const companions = model.companions ?? [];
    if (!companions.length) return `<p class="beta-empty">Wildkin signals have not been secured yet. Explore, extract, and follow the frontier calls.</p>`;
    const pendingIds = new Set((model.pendingCompanions ?? []).map((c) => c.id));
    return companions.map((c) => { const observed = c.observed ?? c.discovered; const pending = c.pending || pendingIds.has(c.id); const state = c.secured ? "SECURED" : pending ? "PENDING — EXTRACT" : observed ? "OBSERVED — BOND" : "UNDISCOVERED"; const clue = c.habitatClue || (observed ? "A bond can be formed in the field." : "Follow frontier signals to find its habitat."); return `<article class="beta-companion ${c.active ? "active" : ""}" style="--wildkin:${esc(c.color || "#71dbc1")}"><i>✦</i><div><strong>${esc(c.name)}</strong><small>${esc(c.secured || observed ? c.description : clue)}</small><em>${c.secured ? `${esc(c.abilityName || "Frontier bond")} · ${esc(c.abilityDescription || "")}` : esc(clue)}</em></div>${c.secured ? `<button data-action="selectCompanion" data-id="${esc(c.id)}">${c.active ? "ACTIVE" : "SELECT"}</button>` : `<b>${state}</b>`}</article>`; }).join("");
  }
  function body(model) {
    if (welcome) return `<div class="beta-welcome"><div class="beta-emblem">✦</div><p class="beta-kicker">A SMALL WORLD BEYOND THE GATE</p><h1>WILDKIN<br><span>FRONTIER</span></h1><p class="beta-premise">A living wilderness waits beyond Camp. Gather strange matter, form Wildkin bonds, and carry each expedition home.</p><button class="beta-primary" data-action="start">${model.progress?.hasDepartedOnce ? "CONTINUE FRONTIER" : "ENTER FRONTIER"}</button><button class="beta-link" data-action="open" data-tab="settings">Settings</button><small>Move with the left side · tap to use your Field Tool · swipe to dodge</small></div>`;
    const bank = model.progress?.bankedResources ?? model.cargo ?? {};
    const tabs = [["journal", "JOURNAL"], ["workshop", "WORKSHOP"], ["wildkin", "WILDKIN"], ["settings", "SETTINGS"]].map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("");
    let panel = "";
    if (activeTab === "journal") panel = `<div class="beta-journal"><p class="beta-kicker">CURRENT EXPEDITION</p><h2>${esc(model.objective?.title || "Find the frontier signal")}</h2><p>${esc(model.objective?.description || "The wilderness remembers every step you bring safely home.")}</p><div class="beta-stat-row"><span><b>${esc(model.regionName || (model.isCamp ? "Camp" : "Frontier"))}</b> LOCATION</span><span><b>${model.bankedXp ?? 0}</b> BANKED XP</span></div><button class="beta-primary" data-action="openMap">OPEN FRONTIER MAP</button><div class="beta-milestones"><h3>Field milestones</h3>${(model.objectives ?? []).map(o => `<p class="${o.completed ? "complete" : ""}"><span>${o.completed ? "✓" : "○"}</span> ${esc(o.title)}</p>`).join("")}</div></div>`;
    if (activeTab === "workshop") panel = model.isCamp ? `<div class="beta-workshop"><p class="beta-kicker">CAMP RESONATOR</p><h2>Build for the next crossing</h2><div class="beta-bank"><strong>SECURED STORES</strong>${Object.entries(bank).map(([id, value]) => `<span>${esc(id.replaceAll("_", " "))}<b>${value}</b></span>`).join("") || "<em>No recovered matter secured yet.</em>"}</div>${UPGRADE_CATALOG.map((u) => { const level = model.progress?.upgrades?.[u.id] ?? 0; const tier = u.tiers[level]; const lockedLevel = tier && (model.playerLevel ?? model.progress?.playerLevel ?? 1) < tier.minPlayerLevel; const missing = missingCost(tier?.cost, bank); const available = tier && !lockedLevel && !missing.length; const gate = !tier ? "Fully synchronized" : lockedLevel ? `Requires level ${tier.minPlayerLevel}` : missing.length ? `Missing: ${missing.join(" · ")}` : `Ready · ${resources(tier.cost)}`; return `<article class="beta-upgrade"><div><strong>${esc(u.displayName)} <small> ${level}/${u.tiers.length}</small></strong><p>${esc(u.description)}</p><em>${tier ? `Next: ${effect(tier.modifiers)}` : "Maximum resonance reached"}</em><small class="beta-gate">${esc(gate)}</small></div><button ${available ? "" : "disabled"} data-action="purchaseUpgrade" data-id="${esc(u.id)}">${tier ? "SYNC" : "MAX"}</button></article>`; }).join("")}<button class="beta-craft" data-action="craftMedkit">CRAFT FIELD MEDKIT · 3 fiber · 2 berries</button></div>` : `<div class="beta-locked"><p class="beta-kicker">CAMP SYSTEM</p><h2>Resonator unavailable</h2><p>Return to Camp to synchronize upgrades and prepare field medicine.</p></div>`;
    if (activeTab === "wildkin") panel = `<div class="beta-wildkin"><p class="beta-kicker">FIELD COMPANIONS</p><h2>Wildkin bonds</h2><p class="beta-capacity">Shelter capacity: <b>${model.captureCapacity ?? 0}</b> · Carried bonds: <b>${(model.pendingCompanions ?? []).length}</b></p>${companionCards(model)}${(model.pendingCompanions ?? []).length ? `<p class="beta-pending">At risk until extraction: ${model.pendingCompanions.map((c) => esc(c.name)).join(", ")}</p>` : ""}</div>`;
    if (activeTab === "settings") panel = `<div class="beta-settings"><p class="beta-kicker">EXPEDITION SETTINGS</p><h2>Set your pace</h2><label><span>Sound</span><input data-action="mute" type="checkbox" ${model.settings?.muted ? "" : "checked"}></label><label><span>Reduced motion</span><input data-action="reducedMotion" type="checkbox" ${model.settings?.reducedMotion ? "checked" : ""}></label><div class="beta-controls"><strong>CONTROLS</strong><p><b>WASD</b> move · <b>Shift</b> run · <b>C</b> sneak · <b>Space</b> dodge</p><p><b>F / mouse hold</b> Field Tool · <b>E</b> interact · <b>Q</b> ability · <b>H</b> heal</p><p><b>J</b> journal · <b>M</b> map · Touch: left movement, right tap/hold tool, swipe dodge.</p></div><button data-action="exportSave">EXPORT FRONTIER SAVE</button>${pendingImport ? `<div class="beta-restore-confirm"><strong>Restore “${esc(pendingImport.name)}”?</strong><p>Your existing Camp progress will be replaced. This action cannot be undone.</p><div><button data-action="cancel-import">CANCEL</button><button data-action="confirm-import">RESTORE</button></div></div>` : `<label class="beta-import">RESTORE FRONTIER SAVE<input data-action="import-save" type="file" accept="application/json,.json"></label>`}<button data-action="pause">PAUSE EXPEDITION</button></div>`;
    return `<div class="beta-panel" role="dialog" aria-modal="true" aria-label="Wildkin Frontier menu"><header><div><p>WILDKIN FRONTIER</p><strong>${esc(model.regionName || "Camp")}</strong></div><button class="beta-close" data-action="close" aria-label="Close">×</button></header><nav>${tabs}</nav><main>${panel}</main></div>`;
  }
  function render(force = false) {
    const model = getModel?.() ?? {};
    const nextSignature = JSON.stringify({ welcome, opened, activeTab, pendingImport: pendingImport?.name, isCamp: model.isCamp, regionName: model.regionName, xp: model.bankedXp, hp: model.health, medkits: model.medkits, objective: model.objective, progress: model.progress, companions: model.companions, settings: model.settings });
    if (force || nextSignature !== signature) { signature = nextSignature; modal.innerHTML = body(model); }
    const objective = hud.querySelector(".beta-objective"); if (objective) objective.innerHTML = `<small>${esc(model.regionName || "CAMP")}</small><strong>${esc(model.objective?.title || "Find the frontier signal")}</strong>`;
    hud.querySelector(".beta-heal small").textContent = model.medkits ?? 0;
    const ability = hud.querySelector(".beta-ability"); ability.textContent = !model.ability ? "NO COMPANION" : model.ability.ready ? model.ability.name : `${model.ability.name} ${Math.ceil(model.ability.cooldown || 0)}s`; ability.disabled = !model.ability?.ready || model.isCamp;
  }
  root.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; event.preventDefault(); const action = button.dataset.action; if (action === "open") { open(button.dataset.tab || "journal"); return; } if (button.dataset.tab) { activeTab = button.dataset.tab; render(true); return; } if (action === "close") { close(); return; } if (action === "start") { result("start"); close(); return; } if (action === "cancel-import") { pendingImport = null; render(true); return; } if (action === "confirm-import") { const file = pendingImport; pendingImport = null; result("import-save", file); render(true); return; } if (action === "selectCompanion") result(action, button.dataset.id || null); else if (action) result(action, button.dataset.id); render(true); });
  root.addEventListener("change", (event) => { const action = event.target.dataset.action; if (action === "import-save") { pendingImport = event.target.files?.[0] ?? null; event.target.value = ""; render(true); return; } if (action) result(action, action === "mute" ? !event.target.checked : event.target.checked); });
  const keydown = (event) => { if (event.defaultPrevented) return; if (event.key === "Escape" && !event.repeat) { if (!isOpen() && !canOpen()) return; event.preventDefault(); isOpen() ? close() : open(); return; } if (event.key === "Tab" && isOpen()) { const controls = [...modal.querySelectorAll("button:not([disabled]),input:not([disabled])")]; if (!controls.length) return; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } };
  window.addEventListener("keydown", keydown);
  function update(dt) { const now = performance.now(); if (now - lastUpdate < 200) return; lastUpdate = now; render(false); }
  return { update, open, close, isOpen, getState: () => ({ open: opened, welcome, tab: activeTab }), showWelcome, toast, destroy() { clearTimeout(toastTimer); window.removeEventListener("keydown", keydown); root.remove(); } };
}
