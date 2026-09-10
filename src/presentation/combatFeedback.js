import * as THREE from "three";

// Presentation-only floating combat/reward feedback. No loop ownership and no gameplay mutation.
export function createCombatFeedback({ app, camera, scene } = {}) {
  if (!app || !camera) return { showDamage() {}, showReward() {}, update() {}, reset() {}, dispose() {} };
  const layer = document.createElement("div");
  layer.id = "combat-feedback-layer";
  layer.setAttribute("aria-hidden", "true");
  app.appendChild(layer);
  const projected = new THREE.Vector3();
  const entries = Array.from({ length: 12 }, () => {
    const element = document.createElement("div");
    element.className = "combat-float";
    layer.appendChild(element);
    return { element, active: false, age: 0, duration: 0.65, x: 0, y: 0, z: 0, lift: 0.6 };
  });
  function claim() {
    const free = entries.find((entry) => !entry.active);
    if (free) return free;
    const oldest = entries.reduce((best, entry) => entry.age > best.age ? entry : best, entries[0]);
    return oldest;
  }
  function show(position, text, className, color) {
    if (!position) return;
    const entry = claim();
    entry.active = true; entry.age = 0; entry.duration = 0.65;
    entry.x = position.x ?? 0; entry.y = position.y ?? 0; entry.z = position.z ?? 0;
    entry.lift = className === "reward" ? 0.82 : 0.58;
    entry.element.className = `combat-float ${className}`;
    entry.element.textContent = text;
    entry.element.style.color = color || "";
    entry.element.style.display = "block";
  }
  function showDamage(position, amount, { critical = false, color = null } = {}) {
    const numeric = Math.max(0, Math.round(Number(amount) || 0));
    show(position, `${critical ? "✦ " : ""}${numeric}`, critical ? "damage critical" : "damage", color || (critical ? "#ffd084" : "#ff8c82"));
  }
  function showReward(position, text) {
    const label = String(text ?? "").slice(0, 24);
    if (label) show(position, label, "reward", "#9df3d0");
  }
  function update(dt, { hidden = false } = {}) {
    const step = Math.max(0, Math.min(Number(dt) || 0, 0.1));
    if (hidden) { for (const entry of entries) entry.element.style.display = "none"; return; }
    const rect = app.getBoundingClientRect();
    for (const entry of entries) {
      if (!entry.active) continue;
      entry.age += step;
      if (entry.age >= entry.duration) { entry.active = false; entry.element.style.display = "none"; continue; }
      const progress = entry.age / entry.duration;
      projected.set(entry.x, entry.y + entry.lift * progress, entry.z).project(camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.16 || Math.abs(projected.y) > 1.16) { entry.element.style.display = "none"; continue; }
      const x = (projected.x * .5 + .5) * rect.width;
      const y = (-projected.y * .5 + .5) * rect.height;
      const pop = 1 + Math.sin(Math.min(1, progress * 8) * Math.PI) * .22;
      entry.element.style.opacity = String(Math.min(1, (1 - progress) * 1.35));
      entry.element.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${pop})`;
      entry.element.style.display = "block";
    }
  }
  function reset() { for (const entry of entries) { entry.active = false; entry.element.style.display = "none"; } }
  function dispose() { layer.remove(); }
  return { showDamage, showReward, update, reset, dispose, scene };
}
