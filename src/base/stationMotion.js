// Rigid presentation only. The base/progress owners perform craft transactions
// and attach/remove actual output independently at CraftOutputAnchor.
export const STATION_MOTION_CONFIG = Object.freeze({
  duration: 2.2,
  workingStart: .25,
  returningStart: .78,
  fabricator: Object.freeze({ carriageLeft: -.08, carriageRight: .035, nozzleDown: -.23, nozzlePulse: .025 }),
  resonance: Object.freeze({ crystalLift: .055, rotorTurns: 1, crystalTurns: -1 }),
  salvage: Object.freeze({ jawClosed: -.070 }),
  reducedTravel: .25,
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };

/**
 * Bind to ONE instantiated model, never a cached GLB template. Returns null for
 * unsupported kinds or models without the required articulated node hierarchy.
 * Call update from the existing game loop. Completion is a one-update boolean;
 * it is presentation evidence, not authorization to spend or grant an item.
 */
export function createStationMotion(root, kind) {
  if (!root?.getObjectByName || (kind !== 'fabricator' && kind !== 'resonance' && kind !== 'salvage')) return null;
  const first = root.getObjectByName(kind === 'fabricator' ? 'FabricatorCarriage' : kind === 'salvage' ? 'SalvageViseJaw' : 'ResonanceRotor');
  const second = kind === 'salvage' ? null : root.getObjectByName(kind === 'fabricator' ? 'FabricatorNozzle' : 'ResonanceCrystal');
  if (!first || (kind !== 'salvage' && !second) || (kind === 'fabricator' && first.getObjectByName('FabricatorNozzle') !== second)) return null;

  const nodes = second ? [first, second] : [first];
  const rest = nodes.map(node => ({ position: node.position.clone(), quaternion: node.quaternion.clone() }));
  let elapsed = 0, operating = false, disposed = false, phase = 'idle', outputId = null;

  function restore() {
    for (let index = 0; index < nodes.length; index += 1) {
      nodes[index].position.copy(rest[index].position);
      nodes[index].quaternion.copy(rest[index].quaternion);
    }
  }

  function applyPose(progress, reducedMotion) {
    restore();
    const config = STATION_MOTION_CONFIG;
    const amount = reducedMotion ? config.reducedTravel : 1;
    if (kind === 'fabricator') {
      const { carriageLeft, carriageRight, nozzleDown, nozzlePulse } = config.fabricator;
      let x, y;
      if (progress < config.workingStart) {
        const t = ease(progress / config.workingStart);
        x = carriageLeft * t;
        y = nozzleDown * t;
      } else if (progress < config.returningStart) {
        const t = (progress - config.workingStart) / (config.returningStart - config.workingStart);
        x = carriageLeft + (carriageRight - carriageLeft) * ease(t);
        y = nozzleDown + (reducedMotion ? 0 : nozzlePulse * Math.sin(Math.PI * t) ** 2);
      } else {
        const t = 1 - ease((progress - config.returningStart) / (1 - config.returningStart));
        x = carriageRight * t;
        y = nozzleDown * t;
      }
      first.position.x += x * amount;
      // Exported glTF local Y is vertical. Safe model delta is [-.25, 0];
      // nozzle rest Y is -.191 relative to its carriage, not a world height.
      second.position.y += y * amount;
    } else if (kind === 'salvage') {
      // One deliberate clamp/hold/release. No vibration of the held workpiece.
      const closure = progress < config.workingStart ? ease(progress / config.workingStart)
        : progress < config.returningStart ? 1
          : 1 - ease((progress - config.returningStart) / (1 - config.returningStart));
      first.position.x += config.salvage.jawClosed * closure * amount;
    } else {
      const lift = Math.sin(Math.PI * progress) ** 2;
      // Rotate around each node's own seated pivot. Reduced motion replaces
      // full spins with a small turn-and-return while retaining visible lift.
      first.rotateY(reducedMotion ? .18 * lift : Math.PI * 2 * config.resonance.rotorTurns * ease(progress));
      second.rotateY(reducedMotion ? -.12 * lift : Math.PI * 2 * config.resonance.crystalTurns * ease(progress));
      second.position.y += config.resonance.crystalLift * lift * amount;
    }
  }

  function reset() {
    if (disposed) return;
    restore();
    elapsed = 0;
    operating = false;
    phase = 'idle';
    outputId = null;
  }

  return {
    play(options = {}) {
      if (disposed || operating) return false;
      reset();
      outputId = typeof options?.outputId === 'string' ? options.outputId : null;
      operating = true;
      phase = 'preparing';
      return true;
    },
    update(dt, { paused = false, reducedMotion = false } = {}) {
      if (disposed || !operating || paused || !Number.isFinite(dt) || dt <= 0) return false;
      elapsed = Math.min(STATION_MOTION_CONFIG.duration, elapsed + dt);
      if (elapsed >= STATION_MOTION_CONFIG.duration) {
        restore();
        operating = false;
        phase = 'complete';
        return true;
      }
      const progress = elapsed / STATION_MOTION_CONFIG.duration;
      phase = progress < STATION_MOTION_CONFIG.workingStart ? 'preparing'
        : progress < STATION_MOTION_CONFIG.returningStart ? 'working' : 'returning';
      applyPose(progress, reducedMotion);
      return false;
    },
    reset,
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
    },
    isOperating: () => operating,
    // Snapshot only when needed by UI/debug; poses reuse cached transforms.
    getState: () => ({ phase, progress: elapsed / STATION_MOTION_CONFIG.duration, outputId, operating }),
  };
}
