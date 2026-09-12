// Fixed-step movement presentation. Gameplay owns the state; this module only
// remembers the previous presentation edge and asks the injected audio owner
// for one short cue per transition.
export function createMovementAudio({ gameAudio } = {}) {
  let previous = null;
  let airTime = 0;

  const isAirborne = state => state?.mode === "JUMP" || state?.mode === "FALL" || state?.grounded === false;
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

  function update(dt, currentPlayerState) {
    if (!currentPlayerState) return;
    const current = {
      mode: currentPlayerState.mode,
      grounded: currentPlayerState.grounded !== false,
      verticalVelocity: Number(currentPlayerState.verticalVelocity) || 0,
    };
    // Establishing a snapshot is intentionally silent: reload, teleport, and
    // reset should not sound like a fresh jump or landing.
    if (!previous) {
      previous = current;
      airTime = 0;
      return;
    }

    const wasAirborne = isAirborne(previous);
    const airborne = isAirborne(current);
    if (airborne) airTime += Math.max(0, Number(dt) || 0);

    if (previous.mode !== "JUMP" && current.mode === "JUMP") {
      gameAudio?.playJump?.();
    } else if (previous.mode !== "DODGE" && current.mode === "DODGE") {
      gameAudio?.playDodge?.();
    }

    const landed = wasAirborne && !airborne && current.grounded
      && (previous.mode === "JUMP" || previous.mode === "FALL")
      && airTime >= 0.08;
    if (landed) {
      // Controller landing clears verticalVelocity, so use the last airborne
      // snapshot. A longer fall also adds bounded weight when speed is modest.
      const fallSpeed = Math.max(0, -previous.verticalVelocity);
      const fallTime = clamp01((airTime - 0.08) / 0.65);
      gameAudio?.playLand?.(clamp01(Math.max(fallSpeed / 8, fallTime)));
      airTime = 0;
    } else if (!airborne) {
      airTime = 0;
    }
    previous = current;
  }

  function reset(state) {
    previous = state ? { mode:state.mode, grounded:state.grounded !== false, verticalVelocity:Number(state.verticalVelocity) || 0 } : null;
    airTime = 0;
  }

  return { update, reset };
}
