// src/ui/frontierIndicators.js — camera-projected edge guidance (Phase 4A.2)
import * as THREE from "three";

export function createFrontierIndicators(opts = {}) {
  const app = document.getElementById("app");
  if (!app) return { update(){}, hide(){}, destroy(){}, getTargets(){ } };
  const worldRegistry = opts.worldRegistry;
  const frontierProgress = opts.frontierProgress;
  const getPlayerPos = opts.getPlayerPos ?? (() => ({ x: 0, y: 0, z: 0 }));
  const getSession = opts.getSession ?? (() => null);

  const container = document.createElement("div");
  container.id = "frontier-indicators";
  container.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;";
  app.appendChild(container);

  function clear() { container.innerHTML = ""; }

  function getBestExtractionTarget(playerPos) {
    const gatePos = worldRegistry.getFrontierGatePos();
    const beacons = worldRegistry.getAllBeacons();
    const waypoints = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate");
    const candidates = [];
    if (gatePos) candidates.push({ id: worldRegistry.getFrontierGateId(), pos: { x: gatePos.x, z: gatePos.z, y: 0.5 }, kind: "gate", dist: Math.hypot(playerPos.x - gatePos.x, playerPos.z - gatePos.z) });
    for (const bc of beacons) {
      if (frontierProgress && !frontierProgress.isDiscoveredBeacon?.(bc.id)) continue;
      candidates.push({ id: bc.id, pos: { x: bc.pos.x, z: bc.pos.z, y: 0.5 }, kind: "beacon", dist: Math.hypot(playerPos.x - bc.pos.x, playerPos.z - bc.pos.z) });
    }
    // Waypoints as extraction: only unlocked ones are usable
    for (const wp of waypoints) {
      if (frontierProgress && !frontierProgress.isUnlockedWaypoint?.(wp.id)) continue;
      candidates.push({ id: wp.id, pos: { x: wp.pos.x, z: wp.pos.z, y: 0.8 }, kind: "waypoint", dist: Math.hypot(playerPos.x - wp.pos.x, playerPos.z - wp.pos.z) });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a,b)=>a.dist-b.dist);
    return candidates[0];
  }

  function getNextDeeperWaypoint(playerPos) {
    const allWp = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate");
    const depthMap = worldRegistry.getRegionDepthMap?.() ?? {};
    const curRegion = worldRegistry.getRegionForPosition(playerPos);
    const curDepth = depthMap[curRegion] ?? 0;
    let best = null;
    let bestDepth = Infinity;
    for (const wp of allWp) {
      const d = depthMap[wp.regionId] ?? 0;
      if (d <= curDepth) continue;
      if (d < bestDepth) { bestDepth = d; best = wp; }
    }
    // endpoint must not point to itself: if best is in same region as player and no deeper, don't self-point -> fallback to deepest not in curRegion
    if (!best) {
      let maxD = -1;
      for (const wp of allWp) {
        const d = depthMap[wp.regionId] ?? 0;
        if (wp.regionId === curRegion) continue;
        if (d > maxD) { maxD = d; best = wp; }
      }
      if (!best) {
        // if only curRegion has waypoint, don't point to self; return null
        return null;
      }
    }
    // Don't rely on JSON order; use depth
    return { id: best.id, pos: { x: best.pos.x, z: best.pos.z, y: 0.8 }, kind: "nextWaypoint", dist: Math.hypot(playerPos.x - best.pos.x, playerPos.z - best.pos.z) };
  }

  function projectToNDC(worldPos, camera) {
    const vec = new THREE.Vector3(worldPos.x, worldPos.y ?? 0.5, worldPos.z);
    vec.project(camera);
    return vec;
  }

  function isOnScreenNDC(ndc) {
    return Math.abs(ndc.x) < 0.88 && Math.abs(ndc.y) < 0.88 && ndc.z > -1 && ndc.z < 1;
  }

  function clampToEdgeFromNDC(ndc, rect) {
    const w = rect.width, h = rect.height;
    const cx = w/2, cy = h/2;
    // ndc.x -1..1 left..right, ndc.y -1..1 bottom..top
    // For behind camera, ndc is inverted but still gives direction; we flip if z >1 (behind)
    let nx = ndc.x;
    let ny = ndc.y;
    if (ndc.z > 1 || ndc.z < -1) {
      // behind camera: invert
      nx = -nx;
      ny = -ny;
    }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    // y invert for screen: ndc.y up => screen y down, so invert ny
    ny = -ny;
    const pad = 22;
    const hw = w/2 - pad, hh = h/2 - pad;
    let t = Infinity;
    if (Math.abs(nx) > 1e-6) t = Math.min(t, hw / Math.abs(nx));
    if (Math.abs(ny) > 1e-6) t = Math.min(t, hh / Math.abs(ny));
    const ex = cx + nx * t;
    const ey = cy + ny * t;
    return { x: ex, y: ey };
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
    let name = null;
    try {
      if (target.id) {
        const wp = worldRegistry.getWaypointById(target.id);
        const bc = worldRegistry.getBeaconById(target.id);
        if (target.kind === "gate") name = "Camp Gate";
        else {
          const anchor = wp ?? bc;
          if (anchor) name = worldRegistry.getAnchorDisplayName(anchor);
        }
      }
    } catch {}
    label.textContent = name ? `${name} ${distance.toFixed(0)}m` : isExtraction ? `Extract ${distance.toFixed(0)}m` : `Waypoint ${distance.toFixed(0)}m`;
    el.appendChild(label);
    return el;
  }

  function update(camera) {
    clear();
    const session = getSession();
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;
    if (!isActive) return;
    if (!camera || !camera.isCamera) return;
    const playerPos = getPlayerPos();
    if (!playerPos) return;
    const extraction = getBestExtractionTarget(playerPos);
    const nextWp = getNextDeeperWaypoint(playerPos);
    const targets = [];
    if (extraction) targets.push({ type: "extraction", target: extraction });
    if (nextWp && nextWp.id !== extraction?.id) targets.push({ type: "waypoint", target: nextWp });

    const rect = container.getBoundingClientRect();
    for (const entry of targets) {
      const tgt = entry.target;
      const ndc = projectToNDC(tgt.pos, camera);
      if (isOnScreenNDC(ndc)) continue;
      const edge = clampToEdgeFromNDC(ndc, rect);
      const el = createIndicator(entry.type, tgt, tgt.dist);
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

export function projectTest(worldPos, camera) {
  const vec = new THREE.Vector3(worldPos.x, worldPos.y ?? 0.5, worldPos.z);
  vec.project(camera);
  return vec;
}
