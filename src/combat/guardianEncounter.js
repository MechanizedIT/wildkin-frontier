// src/combat/guardianEncounter.js — one authored Heartwood Guardian hazard, driven by the main loop.
import * as THREE from "three";

export const GUARDIAN_ATTACK = Object.freeze({
  sectionId: "section_5",
  telegraphSeconds: 1.3,
  cooldownSeconds: 8,
  impactRadius: 2.4,
  heightTolerance: 1.8,
  damage: 2,
});

function copyPoint(point) {
  return { x: Number(point?.x) || 0, y: Number(point?.y) || 0, z: Number(point?.z) || 0 };
}

// Rendering-free encounter clock. Events are consumed by the presentation layer,
// keeping timing and damage behavior simple to exercise without WebGL.
export function createGuardianAttackState() {
  return { phase: "idle", cooldown: 0, telegraphRemaining: 0, target: null, queued: 0, warned: false };
}

export function updateGuardianAttackState(state, dt, { canAttack = false, playerPosition = null, enraged = false } = {}) {
  if (!Number.isFinite(dt) || dt <= 0 || !canAttack) return [];
  const events = [];
  if (state.phase === "idle") {
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.cooldown <= 0 && playerPosition) {
      state.phase = "telegraph";
      state.telegraphRemaining = GUARDIAN_ATTACK.telegraphSeconds;
      state.target = copyPoint(playerPosition);
      state.queued = enraged ? 1 : 0;
      events.push({ type: "telegraph", target: state.target, warning: !state.warned });
      state.warned = true;
    }
    return events;
  }
  state.telegraphRemaining -= dt;
  if (state.telegraphRemaining > 0) return events;
  events.push({ type: "detonate", target: state.target });
  if (state.queued > 0 && playerPosition) {
    state.queued -= 1;
    state.telegraphRemaining = GUARDIAN_ATTACK.telegraphSeconds;
    state.target = copyPoint(playerPosition);
    events.push({ type: "telegraph", target: state.target, warning: false });
  } else {
    state.phase = "idle";
    state.cooldown = GUARDIAN_ATTACK.cooldownSeconds;
    state.target = null;
  }
  return events;
}

function horizontalDistance(a, b) { return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0)); }
function verticalDistance(a, b) { return Math.abs((a?.y ?? 0) - (b?.y ?? 0)); }

export function createGuardianEncounter({ scene, getGuardian, getPlayerState, playerCombat, audio, onPulse = () => {}, onWarning = () => {} } = {}) {
  const state = createGuardianAttackState();
  const views = [];
  let disposed = false;
  let pulseTime = 0;

  for (let index = 0; index < 2; index += 1) {
    const geometry = new THREE.RingGeometry(0.72, 1, 40);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: index ? 0xffd36b : 0xff9160, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `guardianHazardRing${index}`;
    mesh.visible = false;
    mesh.renderOrder = 3;
    scene?.add?.(mesh);
    views.push({ mesh, material, detonateTime: 0 });
  }

  function hideViews() {
    for (const view of views) { view.mesh.visible = false; view.detonateTime = 0; }
  }

  function showTelegraph(target) {
    const view = views.find((entry) => !entry.mesh.visible) ?? views[0];
    view.detonateTime = 0;
    view.mesh.position.set(target.x, target.y - 0.45, target.z);
    view.mesh.scale.setScalar(GUARDIAN_ATTACK.impactRadius);
    view.material.color.setHex(0xffb45d);
    view.material.opacity = 0.65;
    view.mesh.visible = true;
  }

  function detonate(target) {
    const view = views.find((entry) => entry.mesh.visible && horizontalDistance(entry.mesh.position, target) < 0.1) ?? views[0];
    view.mesh.position.set(target.x, target.y - 0.44, target.z);
    view.mesh.scale.setScalar(GUARDIAN_ATTACK.impactRadius * 1.08);
    view.material.color.setHex(0xffd36b);
    view.material.opacity = 0.95;
    view.mesh.visible = true;
    view.detonateTime = 0.24;
    const playerState = getPlayerState?.();
    const player = playerState?.pos ?? playerState;
    const didHit = horizontalDistance(player, target) <= GUARDIAN_ATTACK.impactRadius && verticalDistance(player, target) <= GUARDIAN_ATTACK.heightTolerance;
    if (didHit) playerCombat?.takeDamage?.(GUARDIAN_ATTACK.damage, target);
    audio?.playEnemyDeath?.();
    onPulse({ target: copyPoint(target), hit: didHit });
  }

  function updateViews(dt) {
    pulseTime += dt;
    for (const view of views) {
      if (!view.mesh.visible) continue;
      if (view.detonateTime > 0) {
        view.detonateTime -= dt;
        view.mesh.scale.multiplyScalar(1 + dt * 1.8);
        view.material.opacity = Math.max(0, view.detonateTime / 0.24);
        if (view.detonateTime <= 0) view.mesh.visible = false;
      } else {
        view.material.opacity = 0.48 + Math.sin(pulseTime * 8) * 0.16;
      }
    }
  }

  function reset() {
    Object.assign(state, createGuardianAttackState());
    hideViews();
  }

  function update(dt, { sectionId, paused = false, hidden = false } = {}) {
    if (disposed || !Number.isFinite(dt) || dt <= 0) return;
    const guardian = getGuardian?.();
    const guardianState = guardian?.state ?? guardian;
    const playerState = getPlayerState?.();
    const player = playerState?.pos ?? playerState;
    const nearGuardian = guardianState && horizontalDistance(guardianState.pos, player) <= 8;
    const active = sectionId === GUARDIAN_ATTACK.sectionId && !paused && !hidden && guardianState && !guardianState.isDead && guardianState.aiState !== "RESPAWNING" && nearGuardian;
    // A modal/section transition cancels a pending strike instead of letting an
    // invisible timer resolve while the player cannot move.
    if (!active) { reset(); return; }
    const enraged = guardianState.health <= (guardianState.maxHealth ?? guardianState.cfg?.health ?? Infinity) * 0.5;
    const events = updateGuardianAttackState(state, dt, { canAttack: true, playerPosition: player, enraged });
    for (const event of events) {
      if (event.type === "telegraph") {
        showTelegraph(event.target);
        if (event.warning) onWarning("Move outside the amber ring");
      } else if (event.type === "detonate") detonate(event.target);
    }
    updateViews(dt);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const view of views) {
      view.mesh.parent?.remove(view.mesh);
      view.mesh.geometry.dispose();
      view.material.dispose();
    }
  }

  return { update, reset, dispose, getState: () => ({ ...state, target: state.target && copyPoint(state.target) }) };
}
