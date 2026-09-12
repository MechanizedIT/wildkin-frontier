export const CLIMB_PROBE_CONFIG = Object.freeze({
  reach: 0.9,
  maintainReach: 0.95,
  minLedgeHeight: 1.2,
  maxLedgeHeight: 4,
  verticalStep: 0.2,
  topRefineSteps: 5,
  shoulderOffset: 0.2,
  maxFaceNormalY: 0.28,
  minApproachDot: 0.68,
  minTopNormalY: 0.72,
  exitInset: 0.38,
  exitClearance: 0.035,
  supportCastAbove: 0.45,
  supportCastBelow: 0.3,
  faceNormalDot: 0.92,
  lipGraceBelow: 0.28,
  lipGraceAbove: 0.1,
});

const finite3 = (v) => v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
const immutable3 = (v) => Object.freeze({ x: v.x, y: v.y, z: v.z });

function normalizedHorizontal(value) {
  const length = Math.hypot(value?.x ?? 0, value?.z ?? 0);
  return length > 1e-6 ? { x: value.x / length, y: 0, z: value.z / length } : null;
}

export function createClimbProbe({ characterPhysics, physicsWorld, config = {} } = {}) {
  if (!characterPhysics || !physicsWorld) throw new Error('climb probe requires characterPhysics and physicsWorld');
  const cfg = Object.freeze({ ...CLIMB_PROBE_CONFIG, ...config });
  const half = characterPhysics.cfg.capsuleTotalHeight / 2;
  const active = (collider) => physicsWorld.isTraversalColliderActive?.(collider) === true;
  const sameHandle = (handle) => (collider) => active(collider) && collider.handle === handle;

  function faceHit(origin, direction, maxDistance = cfg.reach, handle = null) {
    // The closest solid must itself be eligible; never probe through a fence,
    // tree or another face to offer a handhold behind it.
    const hit = characterPhysics.castRay(origin, direction, maxDistance);
    if (!hit || !active(hit.collider) || (handle !== null && hit.colliderHandle !== handle)
      || Math.abs(hit.normal.y) > cfg.maxFaceNormalY) return null;
    const normal = normalizedHorizontal(hit.normal);
    return normal ? { ...hit, normal } : null;
  }

  function normalsAgree(a, b) {
    return a.x * b.x + a.z * b.z >= cfg.faceNormalDot;
  }

  function supportAt(point, handle) {
    const origin = { x: point.x, y: point.y + cfg.supportCastAbove, z: point.z };
    const maxDistance = cfg.supportCastAbove + cfg.supportCastBelow;
    const hit = characterPhysics.castRay(origin, { x: 0, y: -1, z: 0 }, maxDistance, {
      acceptCollider: sameHandle(handle),
    });
    return hit && hit.normal.y >= cfg.minTopNormalY ? hit : null;
  }

  function findCandidate({ position, approach } = {}) {
    if (!finite3(position)) return null;
    const inward = normalizedHorizontal(approach);
    if (!inward) return null;
    const feetY = position.y - half;
    const sampleY = Math.max(position.y, feetY + 0.32);
    const center = faceHit({ x: position.x, y: sampleY, z: position.z }, inward);
    if (!center) return null;
    if (inward.x * -center.normal.x + inward.z * -center.normal.z < cfg.minApproachDot) return null;

    const side = { x: -inward.z, y: 0, z: inward.x };
    for (const sign of [-1, 1]) {
      const origin = {
        x: position.x + side.x * cfg.shoulderOffset * sign,
        y: sampleY,
        z: position.z + side.z * cfg.shoulderOffset * sign,
      };
      const hit = faceHit(origin, inward, cfg.reach, center.colliderHandle);
      if (!hit || !normalsAgree(center.normal, hit.normal)) return null;
    }

    let lastHitY = sampleY;
    let firstMissY = null;
    for (let y = sampleY + cfg.verticalStep; y <= feetY + cfg.maxLedgeHeight + cfg.verticalStep; y += cfg.verticalStep) {
      const hit = faceHit({ x: position.x, y, z: position.z }, inward, cfg.reach, center.colliderHandle);
      if (!hit || !normalsAgree(center.normal, hit.normal)) { firstMissY = y; break; }
      lastHitY = y;
    }
    if (firstMissY === null || lastHitY - feetY < cfg.minLedgeHeight - cfg.verticalStep) return null;

    let low = lastHitY, high = firstMissY;
    for (let i = 0; i < cfg.topRefineSteps; i++) {
      const y = (low + high) / 2;
      const hit = faceHit({ x: position.x, y, z: position.z }, inward, cfg.reach, center.colliderHandle);
      if (hit && normalsAgree(center.normal, hit.normal)) low = y;
      else high = y;
    }
    const estimatedTop = (low + high) / 2;
    const exitXZ = {
      x: center.point.x + inward.x * cfg.exitInset,
      y: estimatedTop,
      z: center.point.z + inward.z * cfg.exitInset,
    };
    const support = supportAt(exitXZ, center.colliderHandle);
    if (!support) return null;
    const ledgeHeight = support.point.y - feetY;
    if (ledgeHeight < cfg.minLedgeHeight || ledgeHeight > cfg.maxLedgeHeight) return null;
    const exitCenter = { x: exitXZ.x, y: support.point.y + half + cfg.exitClearance, z: exitXZ.z };
    if (!characterPhysics.isCapsuleAtPositionClear(exitCenter)) return null;

    return Object.freeze({
      colliderHandle: center.colliderHandle,
      surfaceId: physicsWorld.getColliderSurfaceId?.(center.collider) ?? null,
      normal: immutable3(center.normal),
      contact: immutable3(center.point),
      topY: support.point.y,
      exitCenter: immutable3(exitCenter),
    });
  }

  function resolveCollider(candidate) {
    if (!candidate || !Number.isFinite(candidate.colliderHandle)) return null;
    try { return characterPhysics.world.getCollider(candidate.colliderHandle) ?? null; }
    catch (_error) { return null; }
  }

  function isCandidateValid(candidate) {
    const collider = resolveCollider(candidate);
    return !!collider && active(collider)
      && (physicsWorld.getColliderSurfaceId?.(collider) ?? null) === candidate.surfaceId;
  }

  function hasRemainingFace(candidate, position) {
    if (!isCandidateValid(candidate) || !finite3(position)) return false;
    const upperGrace = candidate.topY + half + cfg.exitClearance + cfg.lipGraceAbove;
    if (position.y >= candidate.topY - cfg.lipGraceBelow && position.y <= upperGrace) return true;
    const inward = { x: -candidate.normal.x, y: 0, z: -candidate.normal.z };
    const hit = faceHit(position, inward, cfg.maintainReach, candidate.colliderHandle);
    return !!hit && normalsAgree(candidate.normal, hit.normal);
  }

  function isExitClear(candidate) {
    if (!isCandidateValid(candidate) || !finite3(candidate.exitCenter)) return false;
    if (!characterPhysics.isCapsuleAtPositionClear(candidate.exitCenter)) return false;
    const support = supportAt({ x: candidate.exitCenter.x, y: candidate.topY, z: candidate.exitCenter.z }, candidate.colliderHandle);
    return !!support && Math.abs(support.point.y - candidate.topY) <= 0.08;
  }

  return { findCandidate, isCandidateValid, hasRemainingFace, isExitClear, config: cfg };
}
