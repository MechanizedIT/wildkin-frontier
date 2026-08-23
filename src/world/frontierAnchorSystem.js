// src/world/frontierAnchorSystem.js — proximity/entry/armed state for gate/waypoint/beacon (Phase 4A)

export const ANCHOR_CONFIG = {
  waypointRadius: 1.65,
  beaconRadius: 1.55,
  gateRadius: 1.85,
};

export function createFrontierAnchorSystem(worldRegistry, opts = {}) {
  const onWaypointPrompt = opts.onWaypointPrompt ?? (() => {});
  const onBeaconPrompt = opts.onBeaconPrompt ?? (() => {});
  const onGateStartPrompt = opts.onGateStartPrompt ?? (() => {});
  const onGateReturnPrompt = opts.onGateReturnPrompt ?? (() => {});
  const getPlayerPos = opts.getPlayerPos ?? (() => ({ x: 0, y: 0, z: 0 }));
  const getSession = opts.getSession ?? (() => null);
  const frontierProgress = opts.frontierProgress ?? null;

  // Build anchor list
  function buildAnchors() {
    const anchors = [];
    const gatePos = worldRegistry.getFrontierGatePos();
    if (gatePos) {
      anchors.push({ id: worldRegistry.getFrontierGateId(), type: "gate", pos: { x: gatePos.x, y: gatePos.y ?? 0, z: gatePos.z }, radius: ANCHOR_CONFIG.gateRadius, armed: true, inside: false, cooldown: false });
    }
    for (const wp of worldRegistry.getAllWaypoints()) {
      if (wp.id === "wp_camp_gate") continue; // camp gate marker not a frontier extraction anchor
      anchors.push({ id: wp.id, type: "majorWaypoint", pos: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z }, radius: ANCHOR_CONFIG.waypointRadius, armed: true, inside: false, cooldown: false });
    }
    for (const bc of worldRegistry.getAllBeacons()) {
      anchors.push({ id: bc.id, type: "extractionBeacon", pos: { x: bc.pos.x, y: bc.pos.y ?? 0, z: bc.pos.z }, radius: ANCHOR_CONFIG.beaconRadius, armed: true, inside: false, cooldown: false });
    }
    return anchors;
  }

  let anchors = buildAnchors();
  let suppressedUntilExit = new Set();

  function reset() {
    anchors = buildAnchors();
    suppressedUntilExit.clear();
  }

  // Prime inside state from actual player position — no prompt from initial overlap
  function prime(playerPos) {
    if (!playerPos) return;
    for (const a of anchors) {
      const d = Math.hypot(playerPos.x - a.pos.x, playerPos.z - a.pos.z);
      a.inside = d <= a.radius;
      // If initially inside gate, keep armed true but inside true prevents immediate entry trigger; exit will re-enable
      // For suppressed waypoints, keep armed false until exit
      if (a.inside && suppressedUntilExit.has(a.id)) {
        a.armed = false;
        a.cooldown = false;
      } else if (a.inside) {
        // For gate, we keep armed true but inside true so entry not counted until exit; no cooldown needed
        // Keep armed as is
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

  function update(playerPosOverride) {
    const pos = playerPosOverride ?? getPlayerPos();
    if (!pos) return;
    const session = getSession();
    const isCamp = session ? session.isCamp?.() ?? session.getStatus?.() === "camp" : false;
    const isActive = session ? session.isActive?.() ?? session.getStatus?.() === "active" : false;

    for (const anchor of anchors) {
      const dist = distanceXZ(pos, anchor.pos);
      const nowInside = dist <= anchor.radius;
      const wasInside = !!anchor.inside;

      // Handle exit: clear cooldown and arm if needed, also handle suppressedUntilExit
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
      // If suppressed, entry is ignored until exit
      if (suppressedUntilExit.has(anchor.id)) {
        if (!wasInside && nowInside) {
          anchor.inside = true;
          // remain suppressed, do not prompt
        }
        continue;
      }

      // Entry detection
      if (!wasInside && nowInside) {
        anchor.inside = true;
        if (!anchor.armed || anchor.cooldown) continue;
        // Gate dispatch depends on session
        if (anchor.type === "gate") {
          if (isCamp) {
            // At camp gate, open start selection (only if not already in blocking UI — caller will check)
            onGateStartPrompt(anchor.id);
          } else if (isActive) {
            onGateReturnPrompt(anchor.id);
          }
          // keep inside true, but set cooldown after prompt? Gate should also require exit before retrigger.
          // We leave armed true until KEEP GOING handling will disarm. For start prompt, we will set cooldown after open? Let map handle re-arm via exit.
          // To prevent spam while staying inside, we set a temporary cooldown that clears only on exit? But map opening already blocks input. Keep simple: after triggering gate, set cooldown false but require exit: set armed false and cooldown true after first trigger? Instead we disarm gate after trigger until exit.
          // Immediately disarm until exit to avoid per-frame retrigger while still inside and map open.
          anchor.armed = false;
          anchor.cooldown = true;
        } else if (anchor.type === "majorWaypoint") {
          // During active run only? If at camp and not active, waypoint activation should still be discoverable? But spec says waypoint activation occurs during expedition. Gate start is camp; waypoints outside camp. So ignore if isCamp (player at camp shouldn't trigger distant waypoints anyway). But gate waypoint at camp would be inside camp radius at start — but its armed may be true. We should ignore waypoint prompts while in camp to avoid spam at spawn.
          if (isCamp) { continue; }
          if (!isActive) continue;
          // Discovery
          const isNew = frontierProgress ? frontierProgress.unlockWaypoint(anchor.id) : false;
          if (session?.addDiscoveryWaypoint && isNew) session.addDiscoveryWaypoint(anchor.id);
          else if (session?.addDiscoveryWaypoint && frontierProgress?.isUnlockedWaypoint?.(anchor.id) && !session.getRunDiscoveries?.().newWaypoints.includes(anchor.id)) {
            // Already unlocked earlier this run but visiting again: not new discovery, just prompt without unlock
          }
          onWaypointPrompt(anchor.id, { isNew });
          // After prompt, disarm until exit (KEEP GOING handling will keep disarmed; EXTRACT handling also disarms — but we disarm now to prevent duplicate per frame even before user chooses.)
          anchor.armed = false;
          anchor.cooldown = true;
        } else if (anchor.type === "extractionBeacon") {
          if (isCamp) continue;
          if (!isActive) continue;
          const isNew = frontierProgress ? frontierProgress.discoverBeacon(anchor.id) : false;
          if (session?.addDiscoveryBeacon && isNew) session.addDiscoveryBeacon(anchor.id);
          onBeaconPrompt(anchor.id, { isNew });
          anchor.armed = false;
          anchor.cooldown = true;
        }
      }
    }
  }

  // Expose for tests/manual
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
    getAnchors,
    getAnchorById,
    setArmed,
    isArmed,
    getConfig: () => ({ ...ANCHOR_CONFIG }),
  };
}
