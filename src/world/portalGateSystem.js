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

export function createPortalGateSystem(worldRegistry, opts = {}) {
  const frontierProgress = opts.frontierProgress;
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);
  const getPlayerLevel = opts.getPlayerLevel ?? (() => 1);
  const getCargo = opts.getCargo ?? (() => ({}));
  const spendCargo = opts.spendCargo ?? (() => false);
  const onTravel = opts.onTravel ?? (() => false);
  const campGateId = worldRegistry.getFrontierGateId?.();

  function isGateActive(gate) {
    return gate.state === "active" || frontierProgress?.isPortalGateRepaired?.(gate.id);
  }

  function getNearbyInteraction(playerPos) {
    if (!playerPos) return null;
    let best = null;
    for (const gate of worldRegistry.getPortalGatesForSection?.(getActiveSectionId()) ?? []) {
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
    if (gate.id === campGateId) return { ok: true, action: "camp-start", gate };
    if (isGateActive(gate)) return { ok: !!onTravel(gate), action: "travel", gate };
    const cargo = getCargo();
    const status = getPortalRequirementStatus({ requirements: gate.requirements, playerLevel: getPlayerLevel(), cargo });
    if (!status.ok) return { ok: false, reason: status.levelMet ? "insufficient-resources" : "insufficient-level", status };
    if (frontierProgress?.isPortalGateRepaired?.(portalId)) return { ok: false, reason: "already-repaired" };
    const spent = spendCargo(cargo, status.resources);
    if (!spent) return { ok: false, reason: "spend-failed" };
    const repaired = frontierProgress?.repairPortalGate?.(portalId);
    if (!repaired) return { ok: false, reason: "repair-failed" };
    return { ok: true, action: "repaired", gate, spent: status.resources };
  }

  return { getNearbyInteraction, activate, isGateActive };
}
