// src/ui/deathOverlay.js — quick death screen + TRY AGAIN
export function createDeathOverlay(onTryAgain) {
  const app = document.getElementById("app");
  if (!app) return { show() {}, hide() {}, isVisible: () => false };

  const overlay = document.createElement("div");
  overlay.id = "death-overlay";
  overlay.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,14,22,0.78);backdrop-filter:blur(4px);z-index:20;padding:max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));text-align:center;pointer-events:auto;";
  app.appendChild(overlay);

  const title = document.createElement("div");
  title.textContent = "EXPEDITION LOST";
  title.style.cssText = "font-size:24px;font-weight:900;letter-spacing:0.08em;color:#ff6b6b;text-shadow:0 2px 12px rgba(0,0,0,0.5);margin-bottom:10px;";
  overlay.appendChild(title);

  const stats = document.createElement("div");
  stats.id = "death-stats";
  stats.style.cssText = "font-size:13px;line-height:1.5;color:#e6ebf5;background:rgba(14,20,32,0.72);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 14px;margin-bottom:16px;min-width:220px;";
  overlay.appendChild(stats);

  const btn = document.createElement("button");
  btn.textContent = "TRY AGAIN";
  btn.type = "button";
  btn.style.cssText = "appearance:none;border:none;cursor:pointer;background:#2f7d32;color:#eaffea;font-size:16px;font-weight:900;letter-spacing:0.04em;padding:12px 22px;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px rgba(80,200,90,0.35);min-width:160px;touch-action:manipulation;";
  overlay.appendChild(btn);

  const hint = document.createElement("div");
  hint.textContent = "Tap TRY AGAIN to restart";
  hint.style.cssText = "font-size:11px;color:rgba(230,235,245,0.72);margin-top:8px;";
  overlay.appendChild(hint);

  let visible = false;
  let onTry = onTryAgain;

  function show(data) {
    const { kills = 0, xp = 0, inventory = { wood: 0, stone: 0, fiber: 0 } } = data ?? {};
    stats.innerHTML = `Enemies defeated: <strong>${kills}</strong><br>XP collected: <strong>${xp}</strong><br>Resources carried: <span style="color:#c9a86a">Wood ${inventory.wood ?? 0}</span> · <span style="color:#aaa">Stone ${inventory.stone ?? 0}</span> · <span style="color:#8fe08e">Fiber ${inventory.fiber ?? 0}</span>`;
    overlay.style.display = "flex";
    visible = true;
  }

  function hide() {
    overlay.style.display = "none";
    visible = false;
  }

  btn.addEventListener("click", () => {
    if (onTry) onTry();
  });
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (onTry) onTry();
  }, { passive: false });

  function setCallback(cb) { onTry = cb; }

  return {
    show, hide, isVisible: () => visible, element: overlay, button: btn, setCallback,
    destroy: () => overlay.remove(),
  };
}
