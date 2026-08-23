// src/ui/autoHarvestToggle.js — compact player preference toggle, default ON
import { getOrCreateHudStack } from "./hudStack.js";
export function createAutoHarvestToggle(initial = true) {
  const hud = document.getElementById("hud");
  let enabled = initial;
  let onChange = null;
  if (!hud) return { getEnabled: () => enabled, setEnabled: (v) => (enabled = v), element: null, onToggle: () => {} };

  const stack = getOrCreateHudStack() || hud;
  const container = document.createElement("div");
  container.id = "auto-harvest-toggle";
  container.style.cssText = "pointer-events:auto;display:flex;align-items:center;gap:6px;background:rgba(14,20,32,0.86);border:1px solid rgba(255,255,255,0.13);border-radius:10px;padding:6px 10px;backdrop-filter:blur(6px);user-select:none;touch-action:manipulation;min-height:36px;";

  const label = document.createElement("span");
  label.textContent = "AUTO HARVEST";
  label.style.cssText = "font-size:10px;font-weight:700;letter-spacing:0.06em;color:#e6ebf5;opacity:0.92;";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText = "appearance:none;border:none;cursor:pointer;font-size:12px;font-weight:800;letter-spacing:0.02em;border-radius:8px;padding:5px 10px;min-width:56px;transition:background 0.18s, color 0.18s, transform 0.1s;";

  function render() {
    if (enabled) {
      btn.textContent = "ON";
      btn.style.background = "#2f7d32";
      btn.style.color = "#eaffea";
      btn.style.boxShadow = "0 0 0 1px rgba(60,180,70,0.35), 0 2px 8px rgba(40,120,50,0.25)";
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.textContent = "OFF";
      btn.style.background = "rgba(255,255,255,0.12)";
      btn.style.color = "#e6ebf5";
      btn.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.14)";
      btn.setAttribute("aria-pressed", "false");
    }
  }
  render();

  function setEnabled(v, notify = true) {
    enabled = !!v;
    render();
    if (notify && onChange) onChange(enabled);
  }

  btn.addEventListener("click", () => setEnabled(!enabled));
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); setEnabled(!enabled); }, { passive: false });
  // also container click for larger touch target
  container.addEventListener("click", (e) => { if (e.target !== btn) setEnabled(!enabled); });

  container.appendChild(label);
  container.appendChild(btn);
  // ensure inventory appears below toggle inside stack; insert toggle at top
  if (stack.firstChild) stack.insertBefore(container, stack.firstChild);
  else stack.appendChild(container);

  return {
    getEnabled: () => enabled,
    setEnabled,
    element: container,
    button: btn,
    onToggle: (cb) => { onChange = cb; },
    destroy: () => container.remove(),
  };
}
