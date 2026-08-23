// src/ui/hudStack.js — single upper-left HUD stack owner (Phase 4A.2)
// Ensures Auto Harvest and run inventory never overlap, safe-area aware, scrollable if needed.

export function getOrCreateHudStack() {
  const hud = document.getElementById("hud");
  if (!hud) return null;
  let stack = document.getElementById("hud-stack");
  if (stack) return stack;
  stack = document.createElement("div");
  stack.id = "hud-stack";
  // safe-area, vertical stack, constrained max-height for portrait
  stack.style.cssText = "position:absolute;left:max(10px, env(safe-area-inset-left));top:max(10px, env(safe-area-inset-top));display:flex;flex-direction:column;gap:6px;align-items:flex-start;pointer-events:none;z-index:5;max-height:42vh;overflow:auto;scrollbar-width:none;";
  hud.appendChild(stack);
  // allow children to be interactive via pointer-events auto
  // stack itself handles scroll if inventory rows exceed
  // ensure children have pointerEvents auto
  return stack;
}
