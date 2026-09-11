// Opt-in presentation adapter for an admitted explorer GLB. The outer player
// group remains the authoritative physics/camera transform.
import * as THREE from "three";
import { createExternalModelVisual, createVisualAnimationController, disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";

const MODE_CLIPS = {
  IDLE: "idle", WALK: "walk", RUN: "run", SNEAK: "sneak", JUMP: "jump",
  FALL: "fall", DODGE: "dodge", CLIMB: "climb", MANTLE: "mantle",
};
const ONE_SHOT_MODES = new Set(["JUMP", "DODGE", "MANTLE"]);

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

  const adapter = {
    model,
    handBone,
    handAnchor: descriptor.handAnchor,
    animator,
    update(dt, mode, speed = 0) {
      // Gameplay starts actions before the visual update in the same frame.
      // Let those one-shots finish instead of immediately selecting locomotion.
      if (actionRemaining > 0) {
        animator?.update(dt);
        actionRemaining = Math.max(0, actionRemaining - dt);
        previousMode = null;
        return;
      }
      const clip = MODE_CLIPS[mode] ?? "idle";
      const entered = mode !== previousMode;
      animator?.play(clip, { restart: entered && ONE_SHOT_MODES.has(mode) });
      animator?.setLocomotionSpeed(speed);
      animator?.update(dt);
      previousMode = mode;
    },
    playAction(action) {
      if (action !== "attack" && action !== "hurt") return false;
      animator?.play(action, { restart: true });
      actionRemaining = animator?.active?.getClip().duration ?? 0;
      return !!animator;
    },
    dispose() { actionRemaining = 0; disposeExternalModelInstance(model); },
  };
  playerGroup.userData.externalPlayerModel = adapter;
  return adapter;
}

export function isExternalPlayerModel(playerGroup) {
  return !!playerGroup?.userData?.externalPlayerModel;
}
