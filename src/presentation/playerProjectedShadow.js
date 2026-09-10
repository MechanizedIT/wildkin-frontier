import * as THREE from "three";

const DEFAULTS = Object.freeze({
  baseRadius: 0.54,
  baseOpacity: 0.30,
  fadeHeight: 5.8,
  maxRayDistance: 14,
  rayStartOffset: 0.08,
  surfaceOffset: 0.012,
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function getProjectedShadowStyle({ playerCenterY, supportY, capsuleTotalHeight = 1.04 } = {}, options = DEFAULTS) {
  if (!Number.isFinite(playerCenterY) || !Number.isFinite(supportY)) return { visible: false, opacity: 0, scale: 0, gap: Infinity };
  const feetY = playerCenterY - Math.max(0, Number(capsuleTotalHeight) || 0) * 0.5;
  const gap = Math.max(0, feetY - supportY);
  const lift = clamp01(gap / Math.max(0.01, options.fadeHeight));
  return {
    visible: lift < 1,
    opacity: options.baseOpacity * (1 - lift),
    scale: options.baseRadius * (1 + Math.min(0.42, lift * 0.42)),
    gap,
  };
}

function createSoftShadowTexture() {
  if (typeof document === "undefined" || !document.createElement) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(32, 32, 5, 32, 32, 31);
  gradient.addColorStop(0, "rgba(4, 12, 9, 1)");
  gradient.addColorStop(0.5, "rgba(4, 12, 9, 0.72)");
  gradient.addColorStop(1, "rgba(4, 12, 9, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A single world-space contact marker for the player. The caller owns frame timing.
export function createPlayerProjectedShadow({ scene, player, characterPhysics, physicsWorld, playground, options = {} } = {}) {
  if (!scene || !player) return { update() {}, dispose() {}, mesh: null };
  const config = { ...DEFAULTS, ...options };
  const texture = createSoftShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    color: 0x07100d,
    map: texture,
    transparent: true,
    opacity: config.baseOpacity,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = "playerProjectedShadow";
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const playerWorldPosition = new THREE.Vector3();
  const rayOrigin = { x: 0, y: 0, z: 0 };
  const rayDirection = { x: 0, y: -1, z: 0 };
  const supportNormal=new THREE.Vector3(0,1,0),planeNormal=new THREE.Vector3(0,0,1);

  function findSupport(position) {
    supportNormal.set(0,1,0);
    const RAPIER = physicsWorld?.RAPIER ?? characterPhysics?.RAPIER;
    const world = physicsWorld?.world ?? characterPhysics?.world;
    if (RAPIER?.Ray && world?.castRayAndGetNormal && Array.isArray(physicsWorld?.staticColliders)) {
      rayOrigin.x = position.x;
      const capsuleHeight=characterPhysics?.info?.capsuleTotalHeight??characterPhysics?.cfg?.capsuleTotalHeight??1.04;
      rayOrigin.y = position.y - capsuleHeight*.5 + config.rayStartOffset;
      rayOrigin.z = position.z;
      const ray = new RAPIER.Ray(rayOrigin, rayDirection);
      const hit = world.castRayAndGetNormal(
        ray,
        config.maxRayDistance,
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        (collider) => physicsWorld.staticColliders.includes(collider),
      );
      if (hit && hit.normal && hit.normal.y > 0.35 && Number.isFinite(hit.timeOfImpact)) {
        supportNormal.set(hit.normal.x,hit.normal.y,hit.normal.z).normalize();
        return rayOrigin.y - hit.timeOfImpact;
      }
    }
    const fallback = playground?.getGroundHeight?.(position.x, position.z, position.y);
    return Number.isFinite(fallback) ? fallback : null;
  }

  function update({ hidden = false, playerPosition = null } = {}) {
    if (hidden) { mesh.visible = false; return; }
    const position = playerPosition ?? player.getWorldPosition(playerWorldPosition);
    const supportY = findSupport(position);
    const style = getProjectedShadowStyle({
      playerCenterY: position.y,
      supportY,
      capsuleTotalHeight: characterPhysics?.info?.capsuleTotalHeight ?? characterPhysics?.cfg?.capsuleTotalHeight,
    }, config);
    mesh.visible = style.visible;
    if (!style.visible) return;
    mesh.position.set(position.x, supportY + config.surfaceOffset, position.z);
    mesh.quaternion.setFromUnitVectors(planeNormal,supportNormal);
    mesh.scale.set(style.scale, style.scale, style.scale);
    material.opacity = style.opacity;
  }

  function dispose() {
    scene.remove(mesh);
    mesh.geometry.dispose();
    material.dispose();
    texture?.dispose();
  }

  return { update, dispose, mesh };
}
