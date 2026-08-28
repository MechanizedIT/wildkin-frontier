// src/world/frontierAnchorSystem.js — proximity/entry/armed state for gate/waypoint/beacon (Phase 4A.2)
// Separates first discovery (once, nonblocking) from contextual extraction action.

export const ANCHOR_CONFIG = {
  waypointRadius: 1.65,
  beaconRadius: 1.55,
  gateRadius: 1.85,
};

export function createFrontierAnchorSystem(worldRegistry, opts = {}) {
  const onWaypointDiscovered = opts.onWaypointDiscovered ?? (() => {});
  const onBeaconDiscovered = opts.onBeaconDiscovered ?? (() => {});
  // legacy callbacks for backward tests: if provided, still call for compatibility but now they are contextual not modal
  const onWaypointPrompt = opts.onWaypointPrompt ?? null;
  const onBeaconPrompt = opts.onBeaconPrompt ?? null;
  const onGateStartPrompt = opts.onGateStartPrompt ?? null;
  const onGateReturnPrompt = opts.onGateReturnPrompt ?? null;
  const getPlayerPos = opts.getPlayerPos ?? (() => ({ x: 0, y: 0, z: 0 }));
  const getSession = opts.getSession ?? (() => null);
  const frontierProgress = opts.frontierProgress ?? null;
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);

  function buildAnchors() {
    const anchors = [];
    const gatePos = worldRegistry.getFrontierGatePos();
    if (gatePos) {
      anchors.push({ id: worldRegistry.getFrontierGateId(), sectionId: gatePos.sectionId ?? gatePos.regionId ?? "camp", type: "gate", pos: { x: gatePos.x, y: gatePos.y ?? 0, z: gatePos.z }, radius: ANCHOR_CONFIG.gateRadius, armed: true, inside: false, cooldown: false });
    }
    for (const wp of worldRegistry.getAllWaypoints()) {
      if (wp.id === "wp_camp_gate") continue;
      anchors.push({ id: wp.id, sectionId: wp.sectionId ?? wp.regionId, type: "majorWaypoint", pos: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z }, radius: ANCHOR_CONFIG.waypointRadius, armed: true, inside: false, cooldown: false });
    }
    for (const bc of worldRegistry.getAllBeacons()) {
      anchors.push({ id: bc.id, sectionId: bc.sectionId ?? bc.regionId, type: "extractionBeacon", pos: { x: bc.pos.x, y: bc.pos.y ?? 0, z: bc.pos.z }, radius: ANCHOR_CONFIG.beaconRadius, armed: true, inside: false, cooldown: false });
    }
    return anchors;
  }

  let anchors = buildAnchors();
  let suppressedUntilExit = new Set();

  function reset() {
    anchors = buildAnchors();
    suppressedUntilExit.clear();
  }

  function prime(playerPos) {
    if (!playerPos) return;
    for (const a of anchors) {
      const d = Math.hypot(playerPos.x - a.pos.x, playerPos.z - a.pos.z);
      a.inside = d <= a.radius;
      if (a.inside && suppressedUntilExit.has(a.id)) {
        a.armed = false;
        a.cooldown = false;
      }
    }
  }

  function suppressUntilExit(waypointId) {
    suppressedUntilExit.add(waypointId);
    for (const a of anchors) if (a.id === waypointId) { a.armed = false; a.cooldown = false; }
  }

  function disarmStartWaypoint(waypointId) {
    suppressUntilExit(waypointId);
  }

  function handleKeepGoing(anchorId) {
    const a = anchors.find(x => x.id === anchorId);
    if (a) { a.cooldown = true; a.armed = false; }
  }

  function handleExtracted(anchorId) {
    const a = anchors.find(x => x.id === anchorId);
    if (a) { a.cooldown = true; a.armed = false; }
  }

  function distanceXZ(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  function getNearbyInteraction(playerPos, session) {
    if (!playerPos) return null;
    const isCamp = session ? session.isCamp?.() ?? session.getStatus?.() === "camp" : false;
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;
    let best = null;
    let bestDist = Infinity;
    const activeSectionId = getActiveSectionId();
    for (const anchor of anchors) {
      if (activeSectionId && anchor.sectionId !== activeSectionId) continue;
      const dist = distanceXZ(playerPos, anchor.pos);
      const inside = dist <= anchor.radius;
      if (!inside) continue;
      if (suppressedUntilExit.has(anchor.id)) continue;
      if (anchor.type !== "gate" && (!anchor.armed || anchor.cooldown)) continue;
      let candidate = null;
      if (anchor.type === "gate") {
        if (isCamp) candidate = { id: anchor.id, type: "gate", label: "TRAVEL", dist };
        else if (isActive) candidate = { id: anchor.id, type: "gate", label: "RETURN TO CAMP", dist };
      } else if (anchor.type === "majorWaypoint") {
        if (!isActive) continue;
        const name = worldRegistry.getAnchorDisplayName(worldRegistry.getWaypointById(anchor.id) ?? { id: anchor.id, type: "majorWaypoint" });
        candidate = { id: anchor.id, type: "majorWaypoint", label: `EXTRACT — ${name}`, dist };
      } else if (anchor.type === "extractionBeacon") {
        if (!isActive) continue;
        const name = worldRegistry.getAnchorDisplayName(worldRegistry.getBeaconById(anchor.id) ?? { id: anchor.id, type: "extractionBeacon" });
        candidate = { id: anchor.id, type: "extractionBeacon", label: `EXTRACT — ${name}`, dist };
      }
      if (candidate && dist < bestDist) { best = candidate; bestDist = dist; }
    }
    if (best) {
      const { dist, ...rest } = best;
      return rest;
    }
    return null;
  }

  function update(playerPosOverride) {
    const pos = playerPosOverride ?? getPlayerPos();
    if (!pos) return;
    const session = getSession();
    const isCamp = session ? session.isCamp?.() ?? session.getStatus?.() === "camp" : false;
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;

    const activeSectionId = getActiveSectionId();
    for (const anchor of anchors) {
      if (activeSectionId && anchor.sectionId !== activeSectionId) continue;
      const dist = distanceXZ(pos, anchor.pos);
      const nowInside = dist <= anchor.radius;
      const wasInside = !!anchor.inside;

      if (wasInside && !nowInside) {
        anchor.inside = false;
        if (anchor.cooldown) {
          anchor.cooldown = false;
          anchor.armed = true;
        }
        if (suppressedUntilExit.has(anchor.id)) {
          suppressedUntilExit.delete(anchor.id);
          anchor.armed = true;
          anchor.cooldown = false;
        }
        continue;
      }
      if (suppressedUntilExit.has(anchor.id)) {
        if (!wasInside && nowInside) {
          anchor.inside = true;
        }
        continue;
      }

      if (!wasInside && nowInside) {
        anchor.inside = true;
        if (!anchor.armed || anchor.cooldown) continue;
        if (anchor.type === "gate") {
          // Gate has no discovery; contextual handled via getNearbyInteraction only
        } else if (anchor.type === "majorWaypoint") {
          if (isCamp) continue;
          if (!isActive) continue;
          const isNew = frontierProgress ? frontierProgress.unlockWaypoint(anchor.id) : false;
          if (session?.addDiscoveryWaypoint && isNew) session.addDiscoveryWaypoint(anchor.id);
          if (isNew) {
            onWaypointDiscovered(anchor.id, { isNew: true });
            if (onWaypointPrompt) onWaypointPrompt(anchor.id, { isNew: true });
          }
        } else if (anchor.type === "extractionBeacon") {
          if (isCamp) continue;
          if (!isActive) continue;
          const isNew = frontierProgress ? frontierProgress.discoverBeacon(anchor.id) : false;
          if (session?.addDiscoveryBeacon && isNew) session.addDiscoveryBeacon(anchor.id);
          if (isNew) {
            onBeaconDiscovered(anchor.id, { isNew: true });
            if (onBeaconPrompt) onBeaconPrompt(anchor.id, { isNew: true });
          }
        }
      }
    }
  }

  function getAnchors() { return anchors.map(a => ({ ...a })); }
  function getAnchorById(id) { return anchors.find(a => a.id === id) ?? null; }
  function setArmed(id, armed) { const a = anchors.find(x=>x.id===id); if(a) a.armed = !!armed; }
  function isArmed(id) { const a = anchors.find(x=>x.id===id); return a ? a.armed : false; }

  return {
    update,
    reset,
    prime,
    suppressUntilExit,
    disarmStartWaypoint,
    handleKeepGoing,
    handleExtracted,
    getNearbyInteraction,
    getAnchors,
    getAnchorById,
    setArmed,
    isArmed,
    getConfig: () => ({ ...ANCHOR_CONFIG }),
  };
}
