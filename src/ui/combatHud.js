// Compact numeric health and progression: scales cleanly beyond the initial 5 hearts.
import { getPlayerLevelProgress } from "../progression/playerLevel.js";

export function createCombatHud() {
  const hud = document.getElementById("hud");
  if (!hud) return { updateHealth() {}, updateXp() {}, updateLevel() {}, updateProgress() {}, pulseDamage() {}, destroy() {} };
  const container = document.createElement("div"); container.id = "combat-hud";
  const healthRow = document.createElement("div"); healthRow.id = "health-pips";
  healthRow.innerHTML = `<span class="combat-heart">♥</span><div class="combat-health-track"><i></i></div><b>5 / 5</b>`;
  const healthFill = healthRow.querySelector("i"), healthText = healthRow.querySelector("b");
  const xpRow = document.createElement("div"); xpRow.id = "xp-hud";
  xpRow.innerHTML = `<div><b>LV 1</b><span>0 / 50 XP</span></div><div class="combat-xp-track"><i></i></div>`;
  const levelLabel = xpRow.querySelector("b"), progressText = xpRow.querySelector("span"), progressFill = xpRow.querySelector("i");
  container.append(healthRow, xpRow); hud.appendChild(container);
  function updateHealth(health, maxHealth) {
    const max = Math.max(1, Number(maxHealth) || 5), current = Math.max(0, Math.min(max, Number(health) || 0));
    healthText.textContent = `${current} / ${max}`;
    healthFill.style.width = `${(current / max) * 100}%`;
    healthRow.classList.toggle("is-danger", current / max <= .35);
  }
  function updateProgress(bankedXp) {
    const progress = getPlayerLevelProgress(bankedXp);
    levelLabel.textContent = `LV ${progress.level}`;
    progressText.textContent = `${progress.progressXp} / ${progress.progressMax} XP`;
    progressFill.style.width = `${progress.progressMax > 0 ? (progress.progressXp / progress.progressMax) * 100 : 0}%`;
  }
  const edgePulse = document.createElement("div"); edgePulse.id = "damage-edge-pulse"; document.getElementById("app")?.appendChild(edgePulse);
  function pulseDamage() { healthRow.classList.add("pulse"); edgePulse.classList.add("show"); setTimeout(() => { healthRow.classList.remove("pulse"); edgePulse.classList.remove("show"); }, 210); }
  updateHealth(5, 5); updateProgress(0);
  return { updateHealth, updateXp() {}, updateLevel() {}, updateProgress, pulseDamage, pulseXp: () => xpRow.classList.add("pulse"), showEdgePulse: pulseDamage, element: container, destroy: () => { container.remove(); edgePulse.remove(); } };
}
