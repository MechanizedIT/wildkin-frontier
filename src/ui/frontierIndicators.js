// src/ui/frontierIndicators.js — camera-projected edge guidance (Phase 4A.2.1) patched for endpoint depth and DOM reuse
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

  // DOM reuse: create two persistent indicator nodes instead of destroying/recreating each frame
  function makeEl(type){
    const el = document.createElement("div");
    const isExtraction = type === "extraction";
    const bg = isExtraction ? "rgba(255,112,67,0.92)" : "rgba(79,195,247,0.92)";
    const shape = isExtraction ? "50%" : "3px";
    el.style.cssText = `position:absolute;display:flex;align-items:center;gap:6px;background:${bg};color:#0e1420;font-size:11px;font-weight:800;padding:5px 7px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.35);white-space:nowrap;transform:translate(-50%,-50%);display:none;`;
    const icon = document.createElement("span");
    icon.style.cssText = `width:10px;height:10px;background:#fff;border-radius:${shape};flex-shrink:0;display:inline-block;`;
    if (!isExtraction) icon.style.transform = "rotate(45deg)";
    el.appendChild(icon);
    const label = document.createElement("span");
    el.appendChild(label);
    container.appendChild(el);
    return { el, label };
  }
  const extractionNode = makeEl("extraction");
  const waypointNode = makeEl("waypoint");

  function clear() {
    extractionNode.el.style.display = "none";
    waypointNode.el.style.display = "none";
  }

  function getBestExtractionTarget(playerPos) {
    const activeSectionId = getSession()?.getCurrentRegionId?.() ?? null;
    const gatePos = worldRegistry.getFrontierGatePos();
    const beacons = worldRegistry.getAllBeacons().filter((entry) => entry.regionId === activeSectionId);
    const waypoints = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate" && w.regionId === activeSectionId);
    const candidates = [];
    if (gatePos && activeSectionId === "camp") candidates.push({ id: worldRegistry.getFrontierGateId(), pos: { x: gatePos.x, z: gatePos.z, y: 0.5 }, kind: "gate", dist: Math.hypot(playerPos.x - gatePos.x, playerPos.z - gatePos.z) });
    for (const bc of beacons) {
      if (frontierProgress && !frontierProgress.isDiscoveredBeacon?.(bc.id)) continue;
      candidates.push({ id: bc.id, pos: { x: bc.pos.x, z: bc.pos.z, y: 0.5 }, kind: "beacon", dist: Math.hypot(playerPos.x - bc.pos.x, playerPos.z - bc.pos.z) });
    }
    for (const wp of waypoints) {
      if (frontierProgress && !frontierProgress.isUnlockedWaypoint?.(wp.id)) continue;
      candidates.push({ id: wp.id, pos: { x: wp.pos.x, z: wp.pos.z, y: 0.8 }, kind: "waypoint", dist: Math.hypot(playerPos.x - wp.pos.x, playerPos.z - wp.pos.z) });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a,b)=>a.dist-b.dist);
    return candidates[0];
  }

  function getNextDeeperWaypoint(playerPos) {
    if (worldRegistry.getDefaultExpeditionEntry?.()) return null;
    const allWp = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate");
    const depthMap = worldRegistry.getRegionDepthMap?.() ?? {};
    const curRegion = worldRegistry.getRegionForPosition(playerPos);
    const curDepth = depthMap[curRegion] ?? 0;
    // deepest endpoint must return no deeper-progress target (no backward pointing)
    const maxDepth = Math.max(...Object.values(depthMap));
    if (curDepth >= maxDepth) return null;
    let best = null;
    let bestDepth = Infinity;
    for (const wp of allWp) {
      const d = depthMap[wp.regionId] ?? 0;
      if (d <= curDepth) continue;
      if (d < bestDepth) { bestDepth = d; best = wp; }
    }
    if (!best) return null;
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
    let nx = ndc.x;
    let ny = ndc.y;
    if (ndc.z > 1 || ndc.z < -1) {
      nx = -nx;
      ny = -ny;
    }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
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

  function updateNode(node, type, target){
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
    const isExtraction = type === "extraction";
    node.label.textContent = name ? `${name} ${target.dist.toFixed(0)}m` : isExtraction ? `Extract ${target.dist.toFixed(0)}m` : `Waypoint ${target.dist.toFixed(0)}m`;
  }

  function update(camera) {
    const session = getSession();
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;
    if (!isActive) { clear(); return; }
    if (!camera || !camera.isCamera) { clear(); return; }
    const playerPos = getPlayerPos();
    if (!playerPos) { clear(); return; }
    const extraction = getBestExtractionTarget(playerPos);
    const nextWp = getNextDeeperWaypoint(playerPos);
    const rect = container.getBoundingClientRect();
    // extraction
    if(extraction){
      const ndc = projectToNDC(extraction.pos, camera);
      if(isOnScreenNDC(ndc)){
        extractionNode.el.style.display = "none";
      } else {
        const edge = clampToEdgeFromNDC(ndc, rect);
        updateNode(extractionNode, "extraction", extraction);
        extractionNode.el.style.left = edge.x + "px";
        extractionNode.el.style.top = edge.y + "px";
        extractionNode.el.style.display = "";
      }
    } else {
      extractionNode.el.style.display = "none";
    }
    // waypoint
    if(nextWp && (!extraction || nextWp.id !== extraction.id)){
      const ndc2 = projectToNDC(nextWp.pos, camera);
      if(isOnScreenNDC(ndc2)){
        waypointNode.el.style.display = "none";
      } else {
        const edge2 = clampToEdgeFromNDC(ndc2, rect);
        updateNode(waypointNode, "waypoint", nextWp);
        waypointNode.el.style.left = edge2.x + "px";
        waypointNode.el.style.top = edge2.y + "px";
        waypointNode.el.style.display = "";
      }
    } else {
      waypointNode.el.style.display = "none";
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
