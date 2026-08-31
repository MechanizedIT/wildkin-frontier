// First-class Portal Gate interaction, requirements, repair, and transition dispatch.

import { getPlayerLevelProgress } from "../progression/playerLevel.js";

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

export function getPortalRequirementViewModel({ requirements = {}, bankedXp = 0, carriedXp = 0, cargo = {} } = {}) {
  const progress = getPlayerLevelProgress(bankedXp);
  const status = getPortalRequirementStatus({ requirements, playerLevel: progress.level, cargo });
  return {
    ok: status.ok,
    level: { current: progress.level, required: status.minPlayerLevel, met: status.levelMet },
    resources: Object.entries(status.resources).map(([id, required]) => {
      const current = Math.max(0, Math.floor(Number(cargo[id]) || 0));
      return { id, current, required, met: current >= required };
    }),
    progress,
    carriedXp: Math.max(0, Math.floor(Number(carriedXp) || 0)),
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
  const getBankedXp = opts.getBankedXp ?? (() => 0);
  const getCargo = opts.getCargo ?? (() => ({}));
  const getCarriedXp = opts.getCarriedXp ?? (() => 0);
  const spendCargo = opts.spendCargo ?? (() => false);
  const refundCargo = opts.refundCargo ?? (() => {});
  const onTravel = opts.onTravel ?? (() => false);
  const campGateId = worldRegistry.getFrontierGateId?.();

  function isGateActive(gate) {
    return gate.state === "active" || frontierProgress?.isPortalGateRepaired?.(gate.id);
  }

  function isCampLink(gate) {
    return gate?.role === "campLink" || gate?.campReturnEnabled === true;
  }

  function getNearbyInteraction(playerPos) {
    if (!playerPos) return null;
    let best = null;
    for (const gate of worldRegistry.getPortalGatesForSection?.(getActiveSectionId()) ?? []) {
      if (gate.role === "arrival" && gate.travelEnabled === false && !isCampLink(gate)) continue;
      const radius = gate.triggerRadius ?? 1.85;
      const distance = Math.hypot(playerPos.x - gate.pos.x, playerPos.z - gate.pos.z);
      if (distance > radius || (best && best.distance <= distance)) continue;
      if (gate.id === campGateId) {
        best = { id: gate.id, type: "portalGate", action: "camp-start", label: "TRAVEL", distance };
      } else if (isCampLink(gate)) {
        best = { id: gate.id, type: "portalGate", action: "return-to-camp", label: "RETURN TO CAMP", distance };
      } else if (isGateActive(gate)) {
        best = { id: gate.id, type: "portalGate", action: "travel", label: "TRAVEL", detail: gate.displayName ?? gate.targetSectionId, distance };
      } else {
        const cargo = getCargo() ?? {};
        const requirementView = getPortalRequirementViewModel({ requirements: gate.requirements, bankedXp: getBankedXp(), carriedXp: getCarriedXp(), cargo });
        const resourceDetail = requirementView.resources
          .map(({ id, current, required }) => `${id.replace(/_/g, " ")} ${current}/${required}`)
          .join(" · ");
        const detail = `Level ${requirementView.level.current}/${requirementView.level.required}${resourceDetail ? ` · ${resourceDetail}` : ""}`;
        best = { id: gate.id, type: "portalGate", action: "inspect", label: "INSPECT GATE", detail, requirementView, distance };
      }
    }
    if (!best) return null;
    const { distance, ...interaction } = best;
    return interaction;
  }

  function activate(portalId) {
    const gate = worldRegistry.getPortalGateById?.(portalId);
    if (!gate || gate.sectionId !== getActiveSectionId()) return { ok: false, reason: "inactive-or-missing" };
    if (isCampLink(gate)) return { ok: true, action: "return-to-camp", gate };
    if (gate.role === "arrival" && gate.travelEnabled === false) return { ok: false, reason: "arrival-only" };
    if (gate.id === campGateId) return { ok: true, action: "camp-start", gate };
    if (isGateActive(gate)) return { ok: !!onTravel(gate), action: "travel", gate };
    return repair(portalId);
  }

  function repair(portalId) {
    const gate = worldRegistry.getPortalGateById?.(portalId);
    if (!gate || gate.sectionId !== getActiveSectionId()) return { ok: false, reason: "inactive-or-missing" };
    if (isGateActive(gate)) return { ok: false, reason: "already-active", gate };
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

  return { getNearbyInteraction, activate, repair, isGateActive, isCampLink };
}
