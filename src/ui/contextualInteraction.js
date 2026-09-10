// src/ui/contextualInteraction.js — single contextual frontier action owner (Phase 4A.2)
// Answers current interaction label/target, exposes E + mobile button, coexists with Field Tool.

export function createContextualInteraction(opts = {}) {
  const app = document.getElementById("app");
  const onActivate = opts.onActivate ?? (()=>{});
  let current = null; // {id, type, label}
  let buttonEl = null;
  let presentationKey = "";

  if (app) {
    buttonEl = document.createElement("button");
    buttonEl.id = "contextual-action-button";
    buttonEl.type = "button";
    buttonEl.style.cssText = "position:absolute;right:max(14px, env(safe-area-inset-right));bottom:28%;transform:translateY(50%);background:rgba(47,125,50,0.96);color:#eaffea;border:none;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:900;letter-spacing:0.04em;box-shadow:0 6px 18px rgba(0,0,0,0.35);display:none;pointer-events:auto;z-index:7;min-width:120px;";
    app.appendChild(buttonEl);
    buttonEl.addEventListener("click", () => {
      if (current) onActivate(current);
    });
    // also touchstart to avoid delay?
    buttonEl.addEventListener("touchstart", (e)=> { e.preventDefault(); if (current) onActivate(current); }, { passive:false });
  }

  function setInteraction(info) {
    // info: {id, type, label} or null
    current = info;
    if (!buttonEl) return;
    const nextKey = info ? `${info.id}|${info.type}|${info.label}|${info.detail ?? ""}` : "";
    if (presentationKey === nextKey) return;
    presentationKey = nextKey;
    if (!info) {
      buttonEl.style.display = "none";
      buttonEl.textContent = "";
      buttonEl.removeAttribute("title");
      buttonEl.removeAttribute("aria-label");
    } else {
      buttonEl.textContent = "";
      const label = document.createElement("span");
      label.textContent = info.label;
      buttonEl.appendChild(label);
      if (info.detail) {
        const detail = document.createElement("small");
        detail.textContent = info.detail;
        detail.style.cssText = "display:block;margin-top:3px;font-size:10px;font-weight:700;letter-spacing:0.01em;opacity:0.84;line-height:1.25;";
        buttonEl.appendChild(detail);
        buttonEl.title = info.detail;
      } else {
        buttonEl.title = info.label;
      }
      buttonEl.setAttribute("aria-label", info.detail ? `${info.label}. ${info.detail}` : info.label);
      buttonEl.style.display = "block";
    }
  }

  function getCurrent() { return current; }
  function isAvailable() { return !!current; }
  function activate() {
    if (current) onActivate(current);
  }

  // desktop E key handling — caller should call handleKey in global keydown
  function handleKey(e) {
    if (e.key.toLowerCase() !== "e") return false;
    if (!current) return false;
    // don't trigger if focused in input
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable) return false;
    e.preventDefault();
    onActivate(current);
    return true;
  }

  return { setInteraction, getCurrent, isAvailable, activate, handleKey, element: buttonEl };
}
