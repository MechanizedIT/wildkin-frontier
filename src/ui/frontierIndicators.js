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
    el.style.cssText = `position:absolute;display:flex;align-items:center;gap:6px;background:${bg};color:#0e1420;font-size:13px;font-weight:800;padding:5px 7px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.35);white-space:nowrap;max-width:calc(100% - 24px);box-sizing:border-box;transform:translate(-50%,-50%);display:none;`;
    const icon = document.createElement("span");
    icon.textContent = '➤';
    icon.style.cssText = 'display:inline-block;flex:0 0 14px;font-size:14px;line-height:1;background:none;color:#fff;';
    el.appendChild(icon);
    const label = document.createElement("span");
    label.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;";
    el.appendChild(label);
    container.appendChild(el);
    return { el, label, icon, requested:false, size:null, bounds:null, textDirty:true, layoutVersion:-1, reserve:null };
  }
  const extractionNode = makeEl("extraction");
  const waypointNode = makeEl("waypoint");
  const protectedSelectors = '.beta-hud-actions,.equipment-selected-name,#hud-stack,.run-inventory-hud__item,.beta-action-cluster,.beta-quick,.beta-field-guide,.beta-joystick-home,#combat-hud,#frontier-map-button,#auto-harvest-toggle,.beta-objective,.beta-toast,#activation-toast';
  let obstacles = [], layoutAt = -Infinity, layoutVersion = 0, frameRect = null, viewportKey = '';
  function hideNode(node) { node.requested = false; node.el.style.display = 'none'; }
  function placeNode(node, desired, rect, reserve = null) {
    const newlyVisible = !node.requested;
    node.requested = true;
    if (newlyVisible || node.textDirty || node.layoutVersion !== layoutVersion || node.reserve !== reserve) {
      node.el.style.display = '';
      const sizeKey = `${rect.width}x${rect.height}`;
      if (!node.size || newlyVisible || node.textDirty || node.sizeKey !== sizeKey) {
        node.size = { width:node.el.offsetWidth, height:node.el.offsetHeight };
        node.sizeKey = sizeKey;
      }
      const position = placeEdgeIndicator(desired, node.size, rect, reserve ? [...obstacles, reserve] : obstacles);
      node.bounds = position ? {left:position.x-node.size.width/2,right:position.x+node.size.width/2,top:position.y-node.size.height/2,bottom:position.y+node.size.height/2} : null;
      node.el.style.display = position ? '' : 'none';
      if (position) { node.el.style.left = position.x + 'px'; node.el.style.top = position.y + 'px'; }
      node.layoutVersion = layoutVersion; node.textDirty = false; node.reserve = reserve;
    }
    node.icon.style.transform = `rotate(${Math.atan2(desired.y-rect.height/2,desired.x-rect.width/2)}rad)`;
  }
  function clear() { hideNode(extractionNode); hideNode(waypointNode); }

  function getBestExtractionTarget(playerPos) {
    return getKnownExtractionTarget(worldRegistry, frontierProgress, getSession()?.getCurrentRegionId?.(), playerPos);
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
    const text = `${isExtraction ? "Extract · " : ""}${name ?? "Waypoint"} ${target.dist.toFixed(0)}m`;
    if (node.label.textContent !== text) { node.label.textContent = text; node.textDirty = true; }
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
    const now = performance.now(), nextViewport = `${window.innerWidth}x${window.innerHeight}`;
    if (!frameRect || now - layoutAt > 150 || nextViewport !== viewportKey) {
      layoutAt = now; layoutVersion++; viewportKey = nextViewport;
      frameRect = container.getBoundingClientRect();
      obstacles = [];
      for (const el of app.querySelectorAll(protectedSelectors)) {
        if (el.hidden || !el.getClientRects().length) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= .05) continue;
        const r = el.getBoundingClientRect();
        obstacles.push({left:r.left-frameRect.left,right:r.right-frameRect.left,top:r.top-frameRect.top,bottom:r.bottom-frameRect.top});
      }
    }
    const rect = frameRect;
    // extraction
    if(extraction){
      const ndc = projectToNDC(extraction.pos, camera);
      if(isOnScreenNDC(ndc)){
        hideNode(extractionNode);
      } else {
        const edge = clampToEdgeFromNDC(ndc, rect);
        updateNode(extractionNode, "extraction", extraction);
        placeNode(extractionNode, edge, rect);
      }
    } else {
      hideNode(extractionNode);
    }
    // waypoint
    if(nextWp && (!extraction || nextWp.id !== extraction.id)){
      const ndc2 = projectToNDC(nextWp.pos, camera);
      if(isOnScreenNDC(ndc2)){
        hideNode(waypointNode);
      } else {
        const edge2 = clampToEdgeFromNDC(ndc2, rect);
        updateNode(waypointNode, "waypoint", nextWp);
        placeNode(waypointNode, edge2, rect, extractionNode.requested ? extractionNode.bounds : null);
      }
    } else {
      hideNode(waypointNode);
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

// One known return destination for both the field marker and map guidance.
export function getKnownExtractionTarget(registry, progress, sectionId, playerPos) {
  if (!registry || !sectionId || !playerPos || sectionId === 'camp') return null;
  const candidates = [];
  for (const [entries, kind, known] of [
    [registry.getAllWaypoints(), 'waypoint', id => !progress || progress.isUnlockedWaypoint?.(id)],
    [registry.getAllBeacons(), 'beacon', id => !progress || progress.isDiscoveredBeacon?.(id)],
  ]) for (const anchor of entries) {
    if ((anchor.sectionId ?? anchor.regionId) !== sectionId || !known(anchor.id) || anchor.id === 'wp_camp_gate') continue;
    candidates.push({ id: anchor.id, kind, pos: { ...anchor.pos, y: (anchor.pos.y ?? 0) + (kind === 'waypoint' ? .8 : .5) }, dist: Math.hypot(playerPos.x - anchor.pos.x, playerPos.z - anchor.pos.z) });
  }
  return candidates.sort((a,b) => a.dist-b.dist)[0] ?? null;
}

// Account for the complete label rectangle and live controls, not just its center.
export function placeEdgeIndicator(desired, size, frame, obstacles = [], padding = 12) {
  const minX=padding+size.width/2,maxX=frame.width-padding-size.width/2;
  const minY=padding+size.height/2,maxY=frame.height-padding-size.height/2;
  if(maxX<minX||maxY<minY)return null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const xs=[clamp(desired.x,minX,maxX),minX,maxX],ys=[clamp(desired.y,minY,maxY),minY,maxY];
  for(const r of obstacles){xs.push(clamp(r.left-size.width/2-8,minX,maxX),clamp(r.right+size.width/2+8,minX,maxX));ys.push(clamp(r.top-size.height/2-8,minY,maxY),clamp(r.bottom+size.height/2+8,minY,maxY));}
  let best=null,distance=Infinity;
  for(const x of xs)for(const y of ys){
    const box={left:x-size.width/2,right:x+size.width/2,top:y-size.height/2,bottom:y+size.height/2};
    if(obstacles.some(r=>box.left<r.right+6&&box.right>r.left-6&&box.top<r.bottom+6&&box.bottom>r.top-6))continue;
    const d=(x-desired.x)**2+(y-desired.y)**2;if(d<distance){distance=d;best={x,y};}
  }
  return best;
}
