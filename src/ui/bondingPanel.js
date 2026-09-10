import { createBondingSession } from "../companions/bondingLogic.js";

export function createBondingPanel({ app, onFinished, onBlockingChanged, audio }) {
  const overlay = document.createElement("div");
  overlay.className = "bond-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Wildkin resonance bonding");
  overlay.innerHTML = `<section class="bond-card"><small class="eyebrow">LISTEN • ANSWER • CONNECT</small><h2></h2><p class="bond-instructions">Tap Resonance when the moving light enters the golden band. Three echoes earn its trust.</p><div class="bond-emblem" aria-hidden="true">✿</div><div class="bond-track"><div class="bond-window"></div><div class="bond-cursor"></div></div><p class="bond-status" aria-live="polite">Listen for the rhythm.</p><button class="bond-tap" type="button">Resonance <small>Space / tap</small></button><button class="bond-cancel" type="button">Leave peacefully</button><p class="bond-footnote">New bonds are unsecured until you return to Camp.</p></section>`;
  app.append(overlay);
  const cursor = overlay.querySelector(".bond-cursor");
  const status = overlay.querySelector(".bond-status");
  const tapButton = overlay.querySelector(".bond-tap");
  let session = null, species = null, target = null, remaining = 0;
  let restoreFocus = null;
  function finish(outcome) {
    if (!session) return;
    const result = { status: outcome, species, target };
    session = null; remaining = 0;
    overlay.hidden = true;
    onFinished(result);
    onBlockingChanged();
    restoreFocus?.focus?.({ preventScroll: true });
  }
  function tap() {
    if (!session || remaining) return;
    const result = session.tap();
    if (!result.accepted) return;
    status.textContent = result.hit ? `Echo ${result.successes} / 3 — it answers your call.` : `${3 - result.misses} attempts remain. Wait for the golden band.`;
    overlay.dataset.feedback = result.hit ? "hit" : "miss";
    if (result.hit) audio?.playXpCollect?.();
    if (result.status !== "active") {
      status.textContent = result.status === "success" ? "A new bond. Get your Wildkin home safely." : "It isn't ready. Give it a moment and try again.";
      tapButton.disabled = true;
      remaining = 0.9;
    }
  }
  tapButton.addEventListener("click", tap);
  overlay.querySelector(".bond-cancel").addEventListener("click", () => finish("cancelled"));
  overlay.addEventListener("pointerdown", e => e.stopPropagation());
  overlay.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
  window.addEventListener("keydown", e => {
    if (!session) return;
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) tap(); }
    if (e.code === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); finish("cancelled"); }
  }, true);
  return {
    open(nextSpecies, nextTarget) {
      if (session) return false;
      species = nextSpecies; target = nextTarget;
      session = createBondingSession();
      restoreFocus = document.activeElement;
      overlay.querySelector("h2").textContent = `Befriend ${species.name}`;
      overlay.querySelector(".bond-emblem").textContent = species.glyph;
      overlay.style.setProperty("--bond-color", species.color);
      overlay.hidden = false; tapButton.disabled = false;
      status.textContent = "Listen for the rhythm. Three good echoes form a bond.";
      onBlockingChanged(); tapButton.focus({ preventScroll: true });
      return true;
    },
    update(dt) {
      if (!session) return;
      const s = session.update(dt);
      cursor.style.left = `${s.phase * 100}%`;
      if (remaining) { remaining = Math.max(0, remaining - dt); if (!remaining) finish(s.status); }
    },
    isOpen: () => !!session,
    cancel: () => finish("cancelled"),
    getState: () => session?.getState() ?? null,
  };
}
