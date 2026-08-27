// First-class Portal Gate interaction, requirements, repair, and transition dispatch.

function normalizedResourceRequirements(requirements = {}) {
  return requirements.resources && typeof requirements.resources === "object"
    ? Object.fromEntries(Object.entries(requirements.resources).filter(([, amount]) => Number.isInteger(amount) && amount > 0))
    : {};
}

export function getPortalRequirementStatus({ requirements = {}, playerLevel = 1, cargo = {} } = {}) {
  const minPlayerLevel = Math.max(1, Math.floor(Number(requirements.minPlayerLevel) || 1));
  const resources = normalizedResourceRequirements(requirements);
  const missingResources = {};
  for (const [id, required] of Object.entries(resources)) {
    const have = Math.max(0, Math.floor(Number(cargo[id]) || 0));
    if (have < required) missingResources[id] = required - have;
  }
  return {
    ok: playerLevel >= minPlayerLevel && Object.keys(missingResources).length === 0,
    minPlayerLevel,
    levelMet: playerLevel >= minPlayerLevel,
    resources,
    missingResources,
  };
}

export function spendPortalCargo(cargo = {}, requirements = {}) {
  const status = getPortalRequirementStatus({ requirements, playerLevel: requirements.minPlayerLevel ?? 1, cargo });
  if (Object.keys(status.missingResources).length > 0) return { ok: false, reason: "insufficient-resources", cargo: { ...cargo } };
  const nextCargo = { ...cargo };
  for (const [id, amount] of Object.entries(status.resources)) nextCargo[id] = Math.max(0, (nextCargo[id] ?? 0) - amount);
  return { ok: true, cargo: nextCargo, spent: status.resources };
}

// Small production seam for tests and callers that need all-or-nothing repair.
// `spendCargo` may return a boolean or { ok, rollback }; callers can also supply
// an explicit refundCargo callback for mutable inventories.
export function repairPortalGateAtomic({ gateId, requirements, playerLevel, cargo, spendCargo, refundCargo, commitRepair } = {}) {
  const status = getPortalRequirementStatus({ requirements, playerLevel, cargo });
  if (!status.ok) return { ok: false, reason: status.levelMet ? "insufficient-resources" : "insufficient-level", status };
  let spent;
  try { spent = spendCargo?.({ ...cargo }, status.resources); } catch {
    return { ok: false, reason: "spend-failed", status };
  }
  const spendOk = spent === true || spent?.ok === true;
  if (!spendOk) return { ok: false, reason: "spend-failed", status };
  let committed = false;
  try { committed = commitRepair?.(gateId) === true; } catch { committed = false; }
  if (!committed) {
    try { spent?.rollback?.(); } catch {}
    try { refundCargo?.(status.resources, cargo); } catch {}
    return { ok: false, reason: "repair-failed", status };
  }
  return { ok: true, spent: status.resources, status };
}

export function createPortalGateSystem(worldRegistry, opts = {}) {
  const frontierProgress = opts.frontierProgress;
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);
  const getPlayerLevel = opts.getPlayerLevel ?? (() => 1);
  const getCargo = opts.getCargo ?? (() => ({}));
  const spendCargo = opts.spendCargo ?? (() => false);
  const refundCargo = opts.refundCargo ?? (() => {});
  const onTravel = opts.onTravel ?? (() => false);
  const campGateId = worldRegistry.getFrontierGateId?.();

  function isGateActive(gate) {
    return gate.state === "active" || frontierProgress?.isPortalGateRepaired?.(gate.id);
  }

  function getNearbyInteraction(playerPos) {
    if (!playerPos) return null;
    let best = null;
    for (const gate of worldRegistry.getPortalGatesForSection?.(getActiveSectionId()) ?? []) {
      if (gate.role === "arrival" && gate.travelEnabled === false) continue;
      const radius = gate.triggerRadius ?? 1.85;
      const distance = Math.hypot(playerPos.x - gate.pos.x, playerPos.z - gate.pos.z);
      if (distance > radius || (best && best.distance <= distance)) continue;
      if (gate.id === campGateId) {
        best = { id: gate.id, type: "portalGate", action: "camp-start", label: "START EXPEDITION", distance };
      } else if (isGateActive(gate)) {
        best = { id: gate.id, type: "portalGate", action: "travel", label: `TRAVEL — ${gate.displayName ?? gate.targetSectionId}`, distance };
      } else {
        const status = getPortalRequirementStatus({ requirements: gate.requirements, playerLevel: getPlayerLevel(), cargo: getCargo() });
        const label = status.ok ? "REBUILD FRONTIER GATE" : `RUINED GATE — LV ${status.minPlayerLevel}`;
        const cargo = getCargo() ?? {};
        const resourceDetail = Object.entries(status.resources)
          .map(([id, required]) => `${id.replace(/_/g, " ")} ${Math.max(0, Math.floor(Number(cargo[id]) || 0))}/${required}`)
          .join(" · ");
        const detail = `Requires Level ${status.minPlayerLevel}${resourceDetail ? ` · ${resourceDetail}` : ""}`;
        best = { id: gate.id, type: "portalGate", action: "repair", label, detail, requirementStatus: status, distance };
      }
    }
    if (!best) return null;
    const { distance, ...interaction } = best;
    return interaction;
  }

  function activate(portalId) {
    const gate = worldRegistry.getPortalGateById?.(portalId);
    if (!gate || gate.sectionId !== getActiveSectionId()) return { ok: false, reason: "inactive-or-missing" };
    if (gate.role === "arrival" && gate.travelEnabled === false) return { ok: false, reason: "arrival-only" };
    if (gate.id === campGateId) return { ok: true, action: "camp-start", gate };
    if (isGateActive(gate)) return { ok: !!onTravel(gate), action: "travel", gate };
    const cargo = getCargo();
    const status = getPortalRequirementStatus({ requirements: gate.requirements, playerLevel: getPlayerLevel(), cargo });
    if (!status.ok) return { ok: false, reason: status.levelMet ? "insufficient-resources" : "insufficient-level", status };
    if (frontierProgress?.isPortalGateRepaired?.(portalId)) return { ok: false, reason: "already-repaired" };
    const result = repairPortalGateAtomic({
      gateId: portalId,
      requirements: gate.requirements,
      playerLevel: getPlayerLevel(),
      cargo,
      spendCargo: (_snapshot, cost) => spendCargo(cargo, cost),
      refundCargo,
      commitRepair: (id) => frontierProgress?.repairPortalGate?.(id) === true,
    });
    if (!result.ok) return result;
    return { ok: true, action: "repaired", gate, spent: result.spent };
  }

  return { getNearbyInteraction, activate, isGateActive };
}
