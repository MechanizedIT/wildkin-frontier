// Opt-in presentation adapter for an admitted explorer GLB. The outer player
// group remains the authoritative physics/camera transform.
import * as THREE from "three";
import { createExternalModelVisual, createVisualAnimationController, disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";

const MODE_CLIPS = {
  IDLE: "idle", WALK: "walk", RUN: "run", SNEAK: "sneak", JUMP: "jump",
  FALL: "fall", DODGE: "dodge", CLIMB: "climb", MANTLE: "mantle",
};
const ONE_SHOT_MODES = new Set(["JUMP", "DODGE", "MANTLE"]);
const TRAVERSAL_MODES = new Set(["CLIMB", "MANTLE"]);

export function createExternalPlayerModel(playerGroup, descriptor) {
  if (!descriptor?.model) throw new Error("playerVisual requires a model descriptor");
  const model = createExternalModelVisual(descriptor);
  model.name = "externalPlayerModel";
  playerGroup.add(model);

  const handBone = model.getObjectByName(descriptor.handAnchor?.bone ?? "");
  if (!handBone?.isBone) throw new Error(`playerVisual hand bone is unavailable: ${descriptor.handAnchor?.bone ?? "(missing)"}`);
  const animator = createVisualAnimationController(model);
  let previousMode = null;
  let actionRemaining = 0;
  let lastClimbPhase = 0;

  const adapter = {
    model,
    handBone,
    handAnchor: descriptor.handAnchor,
    animator,
    update(dt, mode, speed = 0, {
      mantleDuration,
      mantleProgress,
      mantleLiftFraction,
    } = {}) {
      const traversalMode = TRAVERSAL_MODES.has(mode);
      const stagedMantle = mode === "MANTLE"
        && Number.isFinite(mantleProgress)
        && Number.isFinite(mantleLiftFraction)
        && mantleLiftFraction > 0
        && mantleLiftFraction < 1
        && mantleProgress < mantleLiftFraction;
      // Gameplay starts actions before the visual update in the same frame.
      // Let those one-shots finish instead of immediately selecting locomotion.
      // Reaching a climb or mantle is an explicit physical pose transition, so
      // it must take over from an earlier attack/hurt in this same update.
      if (actionRemaining > 0 && !traversalMode) {
        animator?.update(dt);
        actionRemaining = Math.max(0, actionRemaining - dt);
        previousMode = null;
        return;
      }
      if (traversalMode) actionRemaining = 0;
      const clip = stagedMantle ? "climb" : (MODE_CLIPS[mode] ?? "idle");
      const entered = mode !== previousMode;
      const wasClimbing = animator?.activeState === "climb";
      animator?.play(clip, {
        restart: entered && ONE_SHOT_MODES.has(mode) && !stagedMantle,
        fadeSeconds: traversalMode ? 0 : undefined,
        immediate: traversalMode,
      });
      if (stagedMantle && !wasClimbing && animator?.activeState === "climb") {
        animator.active.time = lastClimbPhase;
      }
      // The controller forwards signed vertical velocity only for CLIMB: an
      // upward grip uses the authored loop forward and a downward grip uses it
      // in reverse. Every ordinary locomotion mode keeps its old unsigned API.
      animator?.setLocomotionSpeed(stagedMantle ? 0 : speed, { allowReverse: mode === "CLIMB" });
      if (mode === "MANTLE" && Number.isFinite(mantleDuration) && mantleDuration > 0) {
        const clipDuration = animator?.active?.getClip?.().duration;
        if (Number.isFinite(clipDuration) && clipDuration > 0) {
          const remainingDuration = stagedMantle ? 0 : mantleLiftFraction > 0 && mantleLiftFraction < 1
            ? mantleDuration * (1 - mantleLiftFraction)
            : mantleDuration;
          if (remainingDuration > 0) animator.setPlaybackRate(clipDuration / remainingDuration);
        }
      }
      animator?.update(dt);
      if (animator?.activeState === "climb") lastClimbPhase = animator.active.time;
      previousMode = mode;
    },
    playAction(action) {
      if (action !== "attack" && action !== "hurt") return false;
      animator?.play(action, { restart: true });
      actionRemaining = animator?.active?.getClip().duration ?? 0;
      return !!animator;
    },
    dispose() { actionRemaining = 0; lastClimbPhase = 0; disposeExternalModelInstance(model); },
  };
  playerGroup.userData.externalPlayerModel = adapter;
  return adapter;
}

export function isExternalPlayerModel(playerGroup) {
  return !!playerGroup?.userData?.externalPlayerModel;
}
