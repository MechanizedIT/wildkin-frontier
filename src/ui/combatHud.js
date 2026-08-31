// src/ui/combatHud.js — health pips + persistent Level progress, compact readable
import { getPlayerLevelProgress } from "../progression/playerLevel.js";
export function createCombatHud() {
  const hud = document.getElementById("hud");
  if (!hud) return { updateHealth() {}, updateXp() {}, updateLevel() {}, updateProgress() {}, pulseDamage() {}, destroy() {} };

  const container = document.createElement("div");
  container.id = "combat-hud";
  container.style.cssText = "position:absolute;left:50%;top:max(8px, env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;z-index:6;";
  hud.appendChild(container);

  const healthRow = document.createElement("div");
  healthRow.id = "health-pips";
  healthRow.style.cssText = "display:flex;gap:5px;align-items:center;background:rgba(14,20,32,0.84);border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:6px 8px;backdrop-filter:blur(6px);";
  container.appendChild(healthRow);

  const xpRow = document.createElement("div");
  xpRow.id = "xp-hud";
  xpRow.style.cssText = "font-size:11px;font-weight:800;color:#ffe066;background:rgba(14,20,32,0.84);border:1px solid rgba(255,255,255,0.13);border-radius:8px;padding:5px 8px;min-width:132px;text-align:center;backdrop-filter:blur(6px);";
  const levelLabel = document.createElement("div");
  levelLabel.style.cssText = "font-size:12px;font-weight:900;margin-bottom:3px";
  const progressTrack = document.createElement("div");
  progressTrack.style.cssText = "height:5px;border-radius:999px;background:rgba(255,255,255,0.14);overflow:hidden;margin-bottom:3px";
  const progressFill = document.createElement("div");
  progressFill.style.cssText = "height:100%;width:0;background:linear-gradient(90deg,#6de5ef,#ffe066);transition:width 0.25s";
  progressTrack.append(progressFill);
  const progressText = document.createElement("div");
  progressText.style.cssText = "font-size:10px;color:rgba(255,255,255,0.8)";
  xpRow.append(levelLabel, progressTrack, progressText);
  container.appendChild(xpRow);

  const pips = [];
  for (let i = 0; i < 5; i++) {
    const pip = document.createElement("div");
    pip.dataset.index = String(i);
    pip.style.cssText = "width:16px;height:16px;border-radius:50%;background:#4ade80;border:1px solid rgba(0,0,0,0.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18);transition:background 0.15s, transform 0.15s;";
    healthRow.appendChild(pip);
    pips.push(pip);
  }

  function updateHealth(health, maxHealth) {
    const mh = maxHealth ?? 5;
    for (let i = 0; i < pips.length; i++) {
      const pip = pips[i];
      if (i < health) {
        pip.style.background = health <= 2 ? "#ff4444" : health <= 3 ? "#ffaa33" : "#4ade80";
        pip.style.transform = "scale(1)";
        pip.style.opacity = "1";
      } else {
        pip.style.background = "rgba(255,255,255,0.16)";
        pip.style.transform = "scale(0.92)";
        pip.style.opacity = "0.85";
      }
      pip.style.display = i < mh ? "block" : "none";
    }
  }

  function updateXp() {}

  function updateProgress(bankedXp) {
    const progress = getPlayerLevelProgress(bankedXp);
    levelLabel.textContent = `LV ${progress.level}`;
    progressText.textContent = `${progress.progressXp} / ${progress.progressMax} XP`;
    progressFill.style.width = `${progress.progressMax > 0 ? (progress.progressXp / progress.progressMax) * 100 : 0}%`;
  }

  function updateLevel() {
    // Compatibility shim. Persistent progress is refreshed from authoritative banked XP.
  }

  function pulseDamage() {
    healthRow.style.transform = "scale(1.08)";
    healthRow.style.background = "rgba(80,20,20,0.92)";
    setTimeout(() => {
      healthRow.style.transform = "scale(1)";
      healthRow.style.background = "rgba(14,20,32,0.84)";
    }, 180);
    // animate pips
    pips.forEach(p => {
      p.style.transform = "scale(1.18)";
      setTimeout(() => p.style.transform = "scale(1)", 160);
    });
  }

  function pulseXp() {
    xpRow.style.transform = "scale(1.12)";
    setTimeout(() => xpRow.style.transform = "scale(1)", 160);
  }

  // Screen edge pulse element
  const edgePulse = document.createElement("div");
  edgePulse.id = "damage-edge-pulse";
  edgePulse.style.cssText = "position:absolute;inset:0;pointer-events:none;border:3px solid rgba(255,60,60,0.0);border-radius:12px;opacity:0;transition:opacity 0.18s, border-color 0.18s;z-index:7;";
  document.getElementById("app")?.appendChild(edgePulse);

  function showEdgePulse() {
    edgePulse.style.borderColor = "rgba(255,50,50,0.65)";
    edgePulse.style.opacity = "1";
    edgePulse.style.boxShadow = "inset 0 0 32px rgba(255,50,50,0.28)";
    setTimeout(() => {
      edgePulse.style.opacity = "0";
      edgePulse.style.borderColor = "rgba(255,60,60,0.0)";
      edgePulse.style.boxShadow = "none";
    }, 220);
  }

  // Initial
  updateHealth(5, 5);
  updateProgress(0);

  return {
    updateHealth,
    updateXp,
    updateLevel,
    updateProgress,
    pulseDamage: () => { pulseDamage(); showEdgePulse(); },
    pulseXp,
    showEdgePulse,
    element: container,
    destroy: () => { container.remove(); edgePulse.remove(); },
  };
}
