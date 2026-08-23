// src/creatures/createWildCreature.js — visual + state + Rapier kinematic body
import * as THREE from "three";
import { RUSHER_CONFIG, SPITTER_CONFIG } from "../combat/combatConfig.js";

function getConfig(type) {
  return type === "spitter" ? SPITTER_CONFIG : RUSHER_CONFIG;
}

export function createWildCreature(scene, physicsWorld, spawn, index) {
  const type = spawn.type;
  const cfg = getConfig(type);
  const group = new THREE.Group();
  group.name = spawn.id ?? `creature_${type}_${index}`;
  group.userData.authorId = spawn.id ?? group.name;
  group.userData.creatureId = spawn.id ?? group.name;
  const basePos = { x: spawn.pos.x, y: spawn.pos.y ?? 0, z: spawn.pos.z };
  group.position.set(basePos.x, basePos.y, basePos.z);
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
    facing: Math.random() * Math.PI * 2,
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
  };

  // Visual: low-poly placeholder
  let mainMesh, headMesh;
  if (type === "rusher") {
    // Compact low/broad, warm red/orange
    const bodyGeo = new THREE.BoxGeometry(0.72, 0.42, 0.86);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe14b2a, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.36;
    body.name = "rusherBody";
    group.add(body);
    mainMesh = body;
    const headGeo = new THREE.ConeGeometry(0.22, 0.38, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xff8a4a, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.42, 0.52);
    group.add(head);
    headMesh = head;
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.18, 0.48, 0.42);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(-0.18, 0.48, 0.42);
    group.add(eyeR);
  } else {
    // Spitter: taller, purple/teal
    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.62, 7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7a4de8, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.42;
    body.name = "spitterBody";
    group.add(body);
    mainMesh = body;
    const sackGeo = new THREE.SphereGeometry(0.22, 7, 6);
    sackGeo.scale(1, 0.75, 1.2);
    const sackMat = new THREE.MeshStandardMaterial({ color: 0x4ad4d4, flatShading: true, emissive: 0x0a4444, emissiveIntensity: 0.2 });
    const sack = new THREE.Mesh(sackGeo, sackMat);
    sack.position.set(0, 0.38, 0.38);
    sack.name = "spitterSack";
    group.add(sack);
    headMesh = sack;
  }

  // Shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.name = "shadow";
  group.add(shadow);

  // Focus ring (orange/red) — hidden by default, shows if would be hit
  const ringGeo = new THREE.RingGeometry(0.38, 0.52, 22);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const focusRing = new THREE.Mesh(ringGeo, ringMat);
  focusRing.position.y = 0.025;
  focusRing.visible = false;
  focusRing.name = "focusRing";
  group.add(focusRing);

  // DEBUG-ONLY temperament marker: floating letter A/T/D/S visible on phone for testing, no collision
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

  // Health pips small? Use scaling visual? Keep hidden; handled by flash.

  // Physics: kinematic body + capsule
  let body = null;
  let collider = null;
  let controller = null;
  if (physicsWorld && physicsWorld.RAPIER) {
    const RAPIER = physicsWorld.RAPIER;
    const world = physicsWorld.world;
    const startY = basePos.y + cfg.capsuleHalfHeight + cfg.capsuleRadius + 0.05;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(basePos.x, startY, basePos.z);
    body = world.createRigidBody(bodyDesc);
    const capDesc = RAPIER.ColliderDesc.capsule(cfg.capsuleHalfHeight, cfg.capsuleRadius)
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

  function setPosition(pos) {
    state.pos.set(pos.x, pos.y, pos.z);
    group.position.set(pos.x, pos.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius), pos.z); // group base at ground
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
      group.position.set(next.x, next.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius), next.z);
      return { corrected: desired, grounded: true };
    }
    const before = collider.translation();
    controller.computeColliderMovement(collider, desired);
    const corrected = controller.computedMovement();
    const grounded = controller.computedGrounded();
    const next = { x: before.x + corrected.x, y: before.y + corrected.y, z: before.z + corrected.z };
    body.setTranslation(next, true);
    physicsWorld.world.step();
    state.pos.set(next.x, next.y, next.z);
    group.position.set(next.x, next.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius), next.z);
    return { corrected, grounded };
  }

  function setVisible(v) { group.visible = v; }

  function updateVisual(dt) {
    // Facing
    group.rotation.y = state.facing;
    // AI visual feedback
    if (state.aiState === "WINDUP") {
      const pulse = Math.sin(state.aiTimer * 12) * 0.18 + 1;
      if (mainMesh) mainMesh.scale.set(pulse, (2 - pulse), pulse);
      // warning color
      if (mainMesh && mainMesh.material && mainMesh.material.color) {
        // lerp to warning? Keep simple: emissive pulse
        mainMesh.material.emissive?.setHex?.(0x550000);
      }
    } else {
      if (mainMesh) {
        mainMesh.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 8);
        if (mainMesh.material && mainMesh.material.emissive) mainMesh.material.emissive.setHex(0x000000);
      }
    }
    if (state.aiState === "HURT") {
      const t = state.hurtTime;
      const flash = Math.sin(t * 22) > 0;
      if (mainMesh && mainMesh.material) {
        mainMesh.material.color.set(flash ? 0xffffff : (type === "rusher" ? 0xe14b2a : 0x7a4de8));
      }
    } else if (!state.isDead) {
      if (mainMesh && mainMesh.material) mainMesh.material.color.set(type === "rusher" ? 0xe14b2a : 0x7a4de8);
    }
    // Focus ring opacity pulse when visible
    if (focusRing.visible) {
      ringMat.opacity = 0.55 + Math.sin(performance.now() * 0.009) * 0.15;
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
    if (collider) return;
    if (!physicsWorld || !physicsWorld.RAPIER || !body) return;
    const RAPIER = physicsWorld.RAPIER;
    const world = physicsWorld.world;
    try {
      const capDesc = RAPIER.ColliderDesc.capsule(cfg.capsuleHalfHeight, cfg.capsuleRadius)
        .setTranslation(0, 0, 0)
        .setFriction(0.5)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      collider = world.createCollider(capDesc, body);
      world.step();
      // sync state pos
      const t = collider.translation();
      state.pos.set(t.x, t.y, t.z);
      group.position.set(t.x, t.y - (cfg.capsuleHalfHeight + cfg.capsuleRadius), t.z);
    } catch {}
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    if (collider && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeCollider(collider, true); } catch {}
    }
    if (body && physicsWorld && physicsWorld.world) {
      try { physicsWorld.world.removeRigidBody(body); } catch {}
    }
  }

  return {
    group, state, get body() { return body; }, get collider() { return collider; }, set collider(v) { collider = v; }, controller, cfg, mainMesh, focusRing,
    setPosition, getPosition, move, setVisible, updateVisual, showFocusRing, setTemperamentDebugVisible, applyKnockback, dispose, disableCollision, enableCollision,
    get pos() { return state.pos; },
    get id() { return state.id; },
    get type() { return type; },
    get isDead() { return state.isDead; },
    get temperamentMarker() { return temperamentMarker; },
  };
}
