// src/creatures/createWildCreature.js — visual + state + Rapier kinematic body
import * as THREE from "three";
import { RUSHER_CONFIG, SPITTER_CONFIG } from "../combat/combatConfig.js";
import { createVisual, getVisualRecipeKey, tagVisualRoot } from "../world/visualFactory.js";
import { createVisualAnimationController, disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";
import { mosslingTravelSpeed } from "./mosslingMotion.js";

function getConfig(type) {
  return type === "spitter" ? SPITTER_CONFIG : RUSHER_CONFIG;
}

export function createWildCreature(scene, physicsWorld, spawn, index, { shouldIgnoreCollider = () => false } = {}) {
  const type = spawn.type;
  const cfg = { ...getConfig(type), ...(spawn.configOverrides ?? {}) };
  const visualRef = spawn.visualAsset
    ? { kind: "asset", id: spawn.visualAsset.id }
    : { kind: "builtin", id: `creature/${type}` };
  const group = tagVisualRoot(new THREE.Group(), {
    objectId: spawn.id ?? `creature_${type}_${index}`,
    visualRef,
    recipeKey: getVisualRecipeKey(visualRef, { objectId: spawn.id }),
  });
  const creatureScale = spawn.uniformScale ?? spawn.scale ?? 1;
  if (spawn.visualAsset?.id === "asset_wildkin_mossling") {
    cfg.moveSpeed = mosslingTravelSpeed(creatureScale * (spawn.visualAsset.model?.scale ?? 1), cfg.moveSpeed);
  }
  const visibleInPlay = spawn.visibleInPlay !== false;
  const collisionEnabled = spawn.collisionEnabled !== false;
  group.name = spawn.id ?? `creature_${type}_${index}`;
  group.userData.authorId = spawn.id ?? group.name;
  group.userData.creatureId = spawn.id ?? group.name;
  const basePos = { x: spawn.pos.x, y: spawn.pos.y ?? 0, z: spawn.pos.z };
  group.position.set(basePos.x, basePos.y, basePos.z);
  group.scale.set(creatureScale, creatureScale, creatureScale);
  // propagate authorId to children for raycast
  // (will be set after meshes added, but set now for group)

  // State — extended for Phase 3.1 temperament/home/leash
  const temperament = spawn.temperament ?? "AGGRESSIVE";
  const speciesTag = spawn.speciesTag ?? type;
  const homePos = spawn.homePos ?? { ...basePos };
  const roamRadius = spawn.roamRadius ?? 3.0;
  const noticeRadius = spawn.noticeRadius ?? cfg.aggroRadius ?? 5.5;
  const personalSpace = spawn.personalSpace ?? 2.2;
  const leashRadius = spawn.leashRadius ?? 7.5;
  const hostileSpecies = spawn.hostileSpecies ?? [];
  const state = {
    id: spawn.id ?? `${type}_${index}`,
    type, // rusher | spitter
    cfg,
    temperament,
    speciesTag,
    visualAssetId: spawn.visualAsset?.id ?? null,
    homePos: { ...homePos },
    roamRadius,
    noticeRadius,
    personalSpaceRadius: personalSpace,
    leashRadius,
    hostileSpecies: [...hostileSpecies],
    pos: new THREE.Vector3(basePos.x, basePos.y + 0.5, basePos.z), // capsule center approx
    baseY: basePos.y,
    health: cfg.health,
    maxHealth: cfg.health,
    isDead: false,
    isAggroed: false,
    aiState: "ROAM", // ROAM | ALERT | CHASE | REPOSITION | WINDUP | LUNGE | RECOVER | HURT | DEAD | RESPAWNING | WARN | FLEE | RETURN
    aiTimer: 0,
    facing: spawn.facingYaw ?? spawn.rotY ?? Math.random() * Math.PI * 2,
    vel: new THREE.Vector3(0, 0, 0),
    targetLungeDir: null,
    hurtTime: 0,
    respawnRemaining: 0,
    spawnPos: { ...basePos },
    spawnIndex: index,
    // Temperament runtime
    warnTime: 0,
    hasWarned: false,
    fleeTime: 0,
    fleeTargetId: null,
    retaliationTargetId: null,
    retaliationRemaining: 0,
    timeInsideNotice: 0,
    playerDamaged: false,
    lastAttackerId: null,
    lastHitTime: -999,
    // Steering persistence
    steerHold: 0,
    steerAngle: null,
    lastDamagedByPlayer: false,
    bondingHeld: false,
    bondCaptured: false,
  };

  // Runtime and Author Edit share this deterministic visual recipe.
  const visualRoot = createVisual(visualRef, {
    objectId: group.userData.authorId,
    visualAssets: spawn.visualAsset ? [spawn.visualAsset] : undefined,
  });
  const usesExternalModel = !!spawn.visualAsset?.model;
  const opacity = spawn.opacity ?? 1;
  const tint = spawn.color ?? spawn.tint;
  if (tint !== undefined || opacity < 1) {
    visualRoot.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const styled = materials.map((material) => {
        const next = material.clone();
        if (usesExternalModel) next.userData = { ...next.userData, externalModelInstanceMaterial: true };
        if (tint !== undefined && next.color) next.color.set(tint);
        if (opacity < 1) {
          next.transparent = true;
          next.opacity = opacity;
        }
        return next;
      });
      object.material = Array.isArray(object.material) ? styled : styled[0];
    });
  }
  group.add(visualRoot);
  const modelAnimator = createVisualAnimationController(visualRoot);
  let lastModelAnimationState = null;
  let lastModelPositionX = group.position.x;
  let lastModelPositionZ = group.position.z;
  const mainMesh = visualRoot.getObjectByName(type === "rusher" ? "rusherBody" : "spitterBody")
    ?? visualRoot.getObjectByProperty("isMesh", true);
  const headMesh = visualRoot.getObjectByName(type === "rusher" ? "" : "spitterSack");
  const mainMeshBaseScale = mainMesh?.scale.clone() ?? null;

  // Focus ring (orange/red) — hidden by default, shows if would be hit
  const ringGeo = new THREE.RingGeometry(0.38, 0.52, 22);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const focusRing = new THREE.Mesh(ringGeo, ringMat);
  focusRing.position.y = 0.025;
  focusRing.visible = false;
  focusRing.name = "focusRing";
  group.add(focusRing);

  // DEBUG-ONLY temperament marker. Normal play starts hidden; dev and Author
  // sessions can explicitly expose it through CreatureSystem.
  const tempLetterMap = { AGGRESSIVE: "A", TERRITORIAL: "T", DEFENSIVE: "D", SKITTISH: "S" };
  const letter = tempLetterMap[temperament] ?? "?";
  // Color per temperament for readability
  const tempColorMap = { AGGRESSIVE: "#ff3b30", TERRITORIAL: "#ff9f0a", DEFENSIVE: "#30d158", SKITTISH: "#0a84ff" };
  const bgColor = tempColorMap[temperament] ?? "#ffffff";
  let temperamentMarker = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // background rounded rect
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(64, 64, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter, 64, 70);
      // border
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 1.45, 0);
    sprite.scale.set(0.85, 0.85, 1);
    sprite.name = "temperamentDebugMarker";
    // Ensure it doesn't affect raycasts
    sprite.raycast = () => {};
    group.add(sprite);
    temperamentMarker = sprite;
  } catch (_) {
    // fallback: simple plane if canvas not available (tests)
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.45, 0);
    mesh.name = "temperamentDebugMarker";
    group.add(mesh);
    temperamentMarker = mesh;
  }
  const debugMarkersEnabled = (() => {
    try {
      // Node-only contract tests have no browser play mode. Keep their legacy
      // marker fixture inspectable while normal browser play remains clean.
      if (typeof window === "undefined") return true;
      const query = new URLSearchParams(globalThis.location?.search ?? "");
      return query.get("dev") === "1" || query.get("author") === "1";
    } catch { return false; }
  })();
  if (temperamentMarker) temperamentMarker.visible = debugMarkersEnabled;

  // A compact camera-facing health indicator appears only when combat makes it
  // useful. Sprites keep the indicator readable from the fixed game camera.
  const healthBar = new THREE.Group();
  healthBar.name = "creatureHealthBar";
  healthBar.position.set(0, 1.24, 0);
  const healthBack = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1010, transparent: true, opacity: 0.82, depthWrite: false }));
  healthBack.scale.set(0.78, 0.075, 1);
  const healthFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff8053, transparent: true, opacity: 0.95, depthWrite: false }));
  healthFill.scale.set(0.72, 0.045, 1);
  healthBar.add(healthBack, healthFill);
  healthBar.visible = false;
  healthBar.raycast = () => {};
  group.add(healthBar);

  // Health pips small? Use scaling visual? Keep hidden; handled by flash.

  // Physics: kinematic body + capsule
  let body = null;
  let collider = null;
  let controller = null;
  let colliderFilter = shouldIgnoreCollider;
  if (collisionEnabled && physicsWorld && physicsWorld.RAPIER) {
    const RAPIER = physicsWorld.RAPIER;
    const world = physicsWorld.world;
    const startY = basePos.y + (cfg.capsuleHalfHeight + cfg.capsuleRadius) * creatureScale + 0.05;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(basePos.x, startY, basePos.z);
    body = world.createRigidBody(bodyDesc);
    const capDesc = RAPIER.ColliderDesc.capsule(cfg.capsuleHalfHeight * creatureScale, cfg.capsuleRadius * creatureScale)
      .setTranslation(0, 0, 0)
      .setFriction(0.5)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
    collider = world.createCollider(capDesc, body);
    try {
      controller = world.createCharacterController(0.015);
      controller.setSlideEnabled(true);
      controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
      controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
      controller.enableAutostep(0.18, 0.16, false);
      controller.enableSnapToGround(0.18);
      controller.setUp({ x: 0, y: 1, z: 0 });
      controller.setApplyImpulsesToDynamicBodies(false);
    } catch (_) {
      controller = null;
    }
    world.step();
    // Sync state pos to collider center
    const t = collider.translation();
    state.pos.set(t.x, t.y, t.z);
  }

  // Propagate authorId to all child meshes for raycast picking (ensures Wildkin selectable)
  group.traverse((child) => { if (child.isMesh || child.isSprite) { child.userData.authorId = group.userData.authorId; child.userData.creatureId = group.userData.creatureId; } });
  scene.add(group);
  group.visible = visibleInPlay;

  function setPosition(pos) {
    state.pos.set(pos.x, pos.y, pos.z);
    group.position.set(pos.x, pos.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius) * creatureScale, pos.z); // group base at ground
    if (body) {
      body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
      physicsWorld.world.step();
    }
  }

  function getPosition() {
    if (collider) {
      const t = collider.translation();
      return { x: t.x, y: t.y, z: t.z };
    }
    return { x: state.pos.x, y: state.pos.y, z: state.pos.z };
  }

  function move(desired) {
    if (!controller || !collider || !body) {
      // fallback simple move
      const next = { x: state.pos.x + desired.x, y: state.pos.y + desired.y, z: state.pos.z + desired.z };
      state.pos.set(next.x, next.y, next.z);
      group.position.set(next.x, next.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius) * creatureScale, next.z);
      return { corrected: desired, grounded: true };
    }
    const before = collider.translation();
    controller.computeColliderMovement(collider, desired, undefined, undefined, (candidate) => !colliderFilter(candidate));
    const corrected = controller.computedMovement();
    const grounded = controller.computedGrounded();
    const next = { x: before.x + corrected.x, y: before.y + corrected.y, z: before.z + corrected.z };
    body.setTranslation(next, true);
    physicsWorld.world.step();
    state.pos.set(next.x, next.y, next.z);
    group.position.set(next.x, next.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius) * creatureScale, next.z);
    return { corrected, grounded };
  }

  function setVisible(v) { group.visible = !!v && visibleInPlay; }

  function setColliderFilter(next) {
    colliderFilter = typeof next === "function" ? next : () => false;
  }

  function setVisualScaleMultiplier(x = 1, y = x, z = x) {
    group.scale.set(creatureScale * x, creatureScale * y, creatureScale * z);
  }

  function updateVisual(dt) {
    // Facing
    group.rotation.y = state.facing;
    // AI visual feedback
    if (!usesExternalModel && state.aiState === "WINDUP") {
      const pulse = Math.sin(state.aiTimer * 12) * 0.18 + 1;
      if (mainMesh && mainMeshBaseScale) mainMesh.scale.set(
        mainMeshBaseScale.x * pulse,
        mainMeshBaseScale.y * (2 - pulse),
        mainMeshBaseScale.z * pulse,
      );
      // warning color
      if (!usesExternalModel && mainMesh && mainMesh.material && mainMesh.material.color) {
        // lerp to warning? Keep simple: emissive pulse
        mainMesh.material.emissive?.setHex?.(0x550000);
      }
    } else {
      if (!usesExternalModel && mainMesh) {
        mainMesh.scale.lerp(mainMeshBaseScale, dt * 8);
        if (!usesExternalModel && mainMesh.material && mainMesh.material.emissive) mainMesh.material.emissive.setHex(0x000000);
      }
    }
    if (state.aiState === "HURT") {
      const t = state.hurtTime;
      const flash = Math.sin(t * 22) > 0;
      if (!spawn.visualAsset && mainMesh && mainMesh.material) {
        mainMesh.material.color.set(flash ? 0xffffff : (type === "rusher" ? 0xe14b2a : 0x7a4de8));
      }
    } else if (!spawn.visualAsset && !state.isDead) {
      if (mainMesh && mainMesh.material) mainMesh.material.color.set(type === "rusher" ? 0xe14b2a : 0x7a4de8);
    }
    // Focus ring opacity pulse when visible
    if (focusRing.visible) {
      ringMat.opacity = 0.55 + Math.sin(performance.now() * 0.009) * 0.15;
    }
    const healthRatio = Math.max(0, Math.min(1, state.health / Math.max(1, state.maxHealth)));
    healthBar.visible = !state.bondCaptured && !state.isDead && (state.isAggroed || state.health < state.maxHealth);
    healthFill.scale.x = Math.max(0.001, 0.72 * healthRatio);
    healthFill.position.x = -0.36 * (1 - healthRatio);
    if (modelAnimator) {
      const distance = Math.hypot(group.position.x - lastModelPositionX, group.position.z - lastModelPositionZ);
      const speed = dt > 0 ? distance / dt : 0;
      lastModelPositionX = group.position.x;
      lastModelPositionZ = group.position.z;
      const moving = speed > 0.025 && speed < Math.max(10, (cfg.moveSpeed ?? 3) * 4);
      const stateClip = state.aiState === "HURT" ? "hurt" : (state.aiState === "WINDUP" || state.aiState === "LUNGE") ? "attack" : moving ? modelAnimator.getLocomotionState(speed) : "idle";
      const entered = stateClip !== lastModelAnimationState;
      modelAnimator.play(stateClip, { restart: entered && (stateClip === "attack" || stateClip === "hurt") });
      lastModelAnimationState = stateClip;
      modelAnimator.setLocomotionSpeed(speed);
      modelAnimator.update(dt);
    }
    // Death shrink? Handled by system
  }

  function showFocusRing(show) {
    focusRing.visible = !!show;
    if (show) ringMat.opacity = 0.6;
    else ringMat.opacity = 0;
  }

  function setTemperamentDebugVisible(v) {
    if (temperamentMarker) temperamentMarker.visible = !!v;
  }

  function restartVisualAnimation(stateName) {
    modelAnimator?.play(stateName, { restart: true });
    lastModelAnimationState = stateName;
  }

  function applyKnockback(dir, dist, duration) {
    // Collision-aware knockback via move over several frames? For now immediate displacement with collision check
    const desire = { x: dir.x * dist, y: 0, z: dir.z * dist };
    move(desire);
  }

  function disableCollision() {
    if (collider && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeCollider(collider, true); physicsWorld.world.step(); } catch {}
      collider = null;
    }
    // keep body but without collider it won't block
  }

  function enableCollision() {
    if (!collisionEnabled) return;
    if (collider) return;
    if (!physicsWorld || !physicsWorld.RAPIER || !body) return;
    const RAPIER = physicsWorld.RAPIER;
    const world = physicsWorld.world;
    try {
      const capDesc = RAPIER.ColliderDesc.capsule(cfg.capsuleHalfHeight * creatureScale, cfg.capsuleRadius * creatureScale)
        .setTranslation(0, 0, 0)
        .setFriction(0.5)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      collider = world.createCollider(capDesc, body);
      world.step();
      // sync state pos
      const t = collider.translation();
      state.pos.set(t.x, t.y, t.z);
      group.position.set(t.x, t.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius) * creatureScale, t.z);
    } catch {}
  }

  function dispose() {
    modelAnimator?.stop();
    disposeExternalModelInstance(visualRoot);
    if (group.parent) group.parent.remove(group);
    if (controller && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeCharacterController(controller); } catch {}
      controller = null;
    }
    if (collider && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeCollider(collider, true); } catch {}
    }
    if (body && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeRigidBody(body); } catch {}
    }
  }

  return {
    group, state, get body() { return body; }, get collider() { return collider; }, set collider(v) { collider = v; }, controller, cfg, mainMesh, focusRing, healthBar,
    setPosition, getPosition, move, setVisible, setColliderFilter, setVisualScaleMultiplier, updateVisual, showFocusRing, setTemperamentDebugVisible, restartVisualAnimation, applyKnockback, dispose, disableCollision, enableCollision,
    visibleInPlay, collisionEnabled, creatureScale,
    get pos() { return state.pos; },
    get id() { return state.id; },
    get type() { return type; },
    get isDead() { return state.isDead; },
    get temperamentMarker() { return temperamentMarker; },
  };
}
