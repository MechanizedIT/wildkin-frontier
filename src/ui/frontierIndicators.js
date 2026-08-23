// src/ui/frontierIndicators.js — minimal edge guidance during active run (Phase 4A)
// Shows at most 2 clamped edge indicators: nearest extraction (gate/beacon/waypoint) and next deeper Major Waypoint.

export function createFrontierIndicators(opts = {}) {
  const app = document.getElementById("app");
  if (!app) return { update(){}, hide(){}, destroy(){}, getTargets(){ } };
  const worldRegistry = opts.worldRegistry;
  const frontierProgress = opts.frontierProgress;
  const getPlayerPos = opts.getPlayerPos ?? (() => ({ x: 0, y: 0, z: 0 }));
  const getSession = opts.getSession ?? (() => null);
  const getCamera = opts.getCamera ?? (() => null);

  const container = document.createElement("div");
  container.id = "frontier-indicators";
  container.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;";
  app.appendChild(container);

  function clear() { container.innerHTML = ""; }

  // Helper: best extraction target — nearest appropriate Camp gate / MajorWaypoint / Extraction Beacon
  function getBestExtractionTarget(playerPos) {
    const gatePos = worldRegistry.getFrontierGatePos();
    if (!gatePos) return null;
    const beacons = worldRegistry.getAllBeacons();
    const waypoints = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate");
    // candidates: gate always, discovered beacons, unlocked waypoints (or all waypoints for extraction? Spec: nearest appropriate gate/waypoint/beacon)
    const candidates = [];
    candidates.push({ id: gatePos ? worldRegistry.getFrontierGateId() : "gate", pos: { x: gatePos.x, z: gatePos.z }, kind: "gate", dist: Math.hypot(playerPos.x - gatePos.x, playerPos.z - gatePos.z) });
    for (const bc of beacons) {
      if (frontierProgress && !frontierProgress.isDiscoveredBeacon?.(bc.id) && !frontierProgress.getDiscoveredBeacons?.().includes(bc.id)) {
        // Only show discovered beacons as extraction guidance? Spec: useful extraction/safety direction when off-screen (nearest appropriate). For Phase 4A, nearest discovered extraction is more useful than unknown. But unknown beacons shouldn't guide. So only discovered.
        continue;
      }
      // If no progress filter, show all
      if (!frontierProgress) {} // show
      candidates.push({ id: bc.id, pos: { x: bc.pos.x, z: bc.pos.z }, kind: "beacon", dist: Math.hypot(playerPos.x - bc.pos.x, playerPos.z - bc.pos.z) });
    }
    for (const wp of waypoints) {
      // Waypoints can be extraction points too
      candidates.push({ id: wp.id, pos: { x: wp.pos.x, z: wp.pos.z }, kind: "waypoint", dist: Math.hypot(playerPos.x - wp.pos.x, playerPos.z - wp.pos.z) });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a,b)=>a.dist-b.dist);
    return candidates[0];
  }

  function getNextDeeperWaypoint(playerPos) {
    // Next deeper major waypoint beyond current depth
    const allWp = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate");
    // depth map via region order? Use getRegionDepthMap order index
    const depthMap = worldRegistry.getRegionDepthMap?.() ?? {};
    // Find player depth
    const curRegion = worldRegistry.getRegionForPosition(playerPos);
    const curDepth = depthMap[curRegion] ?? 0;
    let best = null;
    let bestDepth = Infinity;
    for (const wp of allWp) {
      const d = depthMap[wp.regionId] ?? 0;
      if (d <= curDepth) continue; // only deeper
      if (d < bestDepth) { bestDepth = d; best = wp; }
    }
    // fallback if none deeper, pick deepest overall
    if (!best) {
      // choose furthest waypoint
      let maxD = -1;
      for (const wp of allWp) { const d = depthMap[wp.regionId] ?? 0; if (d > maxD) { maxD = d; best = wp; } }
    }
    if (!best) return null;
    return { id: best.id, pos: { x: best.pos.x, z: best.pos.z }, kind: "nextWaypoint", dist: Math.hypot(playerPos.x - best.pos.x, playerPos.z - best.pos.z) };
  }

  function worldToScreen(pos, camera) {
    if (!camera) return null;
    const v = pos.clone ? pos.clone() : { x: pos.x, y: pos.y, z: pos.z };
    // Project via THREE
    const THREE = window.THREE ?? null; // fallback
    // Instead use camera projection manually if THREE not available globally — we have camera object with projection
    // Do simple: use vector projection
    try {
      const vec = new (camera.isCamera ? camera.constructor : Object)(); // not reliable
    } catch {}
    // Use imported THREE via world: we can compute screen via projection matrices directly
    // For minimal guidance, we just compare distance for on-screen heuristic via camera frustum.
    return null;
  }

  function isOnScreen(worldPos, camera, margin = 1.0) {
    // Use camera frustum check if THREE available; else naive distance
    try {
      const THREE = window.THREE;
      if (!THREE) return false;
      const proj = new THREE.Vector3(worldPos.x, (worldPos.y ?? 0.5), worldPos.z);
      proj.project(camera);
      const on = Math.abs(proj.x) < 0.85 && Math.abs(proj.y) < 0.85 && proj.z > -1 && proj.z < 1;
      return on;
    } catch { return false; }
  }

  function createIndicator(type, target, distance) {
    const el = document.createElement("div");
    const isExtraction = type === "extraction";
    const bg = isExtraction ? "rgba(255,112,67,0.92)" : "rgba(79,195,247,0.92)";
    const shape = isExtraction ? "50%" : "3px";
    el.style.cssText = `position:absolute;display:flex;align-items:center;gap:6px;background:${bg};color:#0e1420;font-size:11px;font-weight:800;padding:5px 7px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.35);white-space:nowrap;`;
    const icon = document.createElement("span");
    icon.style.cssText = `width:10px;height:10px;background:#fff;border-radius:${shape};flex-shrink:0;display:inline-block;`;
    if (!isExtraction) icon.style.transform = "rotate(45deg)";
    el.appendChild(icon);
    const label = document.createElement("span");
    label.textContent = isExtraction ? `Extract ${distance.toFixed(0)}m` : `Waypoint ${distance.toFixed(0)}m`;
    el.appendChild(label);
    return el;
  }

  function clampToEdge(angleRad) {
    // Convert direction angle to screen edge position.
    // Use container size: approximate portrait app rect
    const rect = container.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const cx = w/2, cy = h/2;
    // Direction vector
    const dx = Math.sin(angleRad);
    const dz = Math.cos(angleRad); // not used; we need screen direction — approximate world XZ to screen XY via camera?
    // For near top-down fixed camera facing -Z, world X maps to screen X, world Z maps to screen Y inverted. Use simple.
    const sx = dx;
    const sy = -dz; // invert Z for screen Y
    const len = Math.hypot(sx, sy) || 1;
    const nx = sx/len, ny = sy/len;
    // intersect with rect border (with padding 12)
    const pad = 22;
    const hw = w/2 - pad, hh = h/2 - pad;
    let t = Infinity;
    if (Math.abs(nx) > 1e-6) t = Math.min(t, hw / Math.abs(nx));
    if (Math.abs(ny) > 1e-6) t = Math.min(t, hh / Math.abs(ny));
    const ex = cx + nx * t;
    const ey = cy + ny * t;
    return { x: ex, y: ey };
  }

  function update(camera) {
    clear();
    const session = getSession();
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;
    if (!isActive) return;
    const playerPos = getPlayerPos();
    if (!playerPos) return;
    const extraction = getBestExtractionTarget(playerPos);
    const nextWp = getNextDeeperWaypoint(playerPos);
    const targets = [];
    if (extraction) targets.push({ type: "extraction", target: extraction });
    if (nextWp && nextWp.id !== extraction?.id) targets.push({ type: "waypoint", target: nextWp });

    for (const entry of targets) {
      const tgt = entry.target;
      const dist = tgt.dist;
      // Hide when target is comfortably on-screen
      // Compute world direction angle for edge
      const dx = tgt.pos.x - playerPos.x;
      const dz = tgt.pos.z - playerPos.z;
      const worldAngle = Math.atan2(dx, dz);
      // On-screen heuristic: if dist < 6 and camera frustum says on-screen, hide indicator and show in-world marker instead? For minimal guidance, hide when dist < 4 and on-screen
      let onScreen = false;
      if (dist < 3.5) onScreen = true;
      if (onScreen) continue;
      const edge = clampToEdge(worldAngle);
      const el = createIndicator(entry.type, tgt, dist);
      el.style.left = edge.x + "px";
      el.style.top = edge.y + "px";
      el.style.transform = "translate(-50%, -50%)";
      container.appendChild(el);
    }
  }

  function hide() { clear(); }

  return {
    update,
    hide,
    destroy: () => container.remove(),
    element: container,
    getBestExtractionTarget,
    getNextDeeperWaypoint,
  };
}

// Helpers for deterministic tests (extracted)
export function getBestExtractionTargetForTest(playerPos, waypoints, beacons, discoveredBeaconIds, gatePos) {
  const candidates = [];
  if (gatePos) candidates.push({ id: "gate", pos: gatePos, dist: Math.hypot(playerPos.x - gatePos.x, playerPos.z - gatePos.z) });
  for (const bc of beacons) {
    if (discoveredBeaconIds && !discoveredBeaconIds.includes(bc.id)) continue;
    candidates.push({ id: bc.id, pos: bc.pos, dist: Math.hypot(playerPos.x - bc.pos.x, playerPos.z - bc.pos.z) });
  }
  for (const wp of waypoints) candidates.push({ id: wp.id, pos: wp.pos, dist: Math.hypot(playerPos.x - wp.pos.x, playerPos.z - wp.pos.z) });
  candidates.sort((a,b)=>a.dist-b.dist);
  return candidates[0] ?? null;
}
