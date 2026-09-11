import { COMPANION_BY_ID } from '../companions/companionCatalog.js';

// Structural bounds only. The progress/bootstrap owners validate current world
// IDs, physical support, secured species and whether this run already resolved.
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const coordinate = value => Number.isFinite(value) && Math.abs(value) <= 1_000_000;
const idList = (value, limit) => Array.isArray(value) && value.length <= limit
  && Array.from(value).every(validId) && new Set(value).size === value.length;

export function cloneActiveRun(run) {
  if (run == null) return null;
  return {
    runId: run.runId, startAnchorId: run.startAnchorId, sectionId: run.sectionId,
    feet: { x: run.feet.x, y: run.feet.y, z: run.feet.z }, facingYaw: run.facingYaw,
    health: run.health, xp: run.xp, companions: [...run.companions], corePending: run.corePending,
    kills: run.kills, maxDepth: run.maxDepth,
    newWaypoints: [...run.newWaypoints], newBeacons: [...run.newBeacons],
  };
}

export function normalizeActiveRun(raw) {
  const fail = reason => ({ ok: false, run: null, reason });
  if (raw == null) return { ok: true, run: null, reason: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) return fail('invalid-active-run');
  if (![raw.runId, raw.startAnchorId, raw.sectionId].every(validId)) return fail('invalid-run-id');
  if (!raw.feet || typeof raw.feet !== 'object' || Array.isArray(raw.feet)
    || ![raw.feet.x, raw.feet.y, raw.feet.z].every(coordinate) || !Number.isFinite(raw.facingYaw)) return fail('invalid-run-position');
  if (!Number.isFinite(raw.health) || raw.health <= 0 || raw.health > 20) return fail('invalid-run-health');
  if (![raw.xp, raw.kills, raw.maxDepth].every(count)) return fail('invalid-run-count');
  if (!idList(raw.companions, Object.keys(COMPANION_BY_ID).length)
    || raw.companions.some(id => !Object.hasOwn(COMPANION_BY_ID, id))) return fail('invalid-run-companions');
  if (typeof raw.corePending !== 'boolean') return fail('invalid-run-core');
  if (!idList(raw.newWaypoints, 256) || !idList(raw.newBeacons, 256)) return fail('invalid-run-discoveries');
  return { ok: true, run: cloneActiveRun(raw), reason: null };
}
