import { LAB } from './config.js';
import { toLocal, toGlobal } from './coordinates.js';
import { createDebrisGeometry, debrisReferenceCenter, geometryBounds } from './debris.js';
export class LabPhysics {
  constructor(RAPIER) {
    this.R = RAPIER; this.world = new RAPIER.World({ x: 0, y: LAB.gravity, z: 0 }); this.world.timestep = LAB.fixedStep;
    this.chunks = new Map(); this.actors = new Map(); this.origin = [0, 0, 0]; this.vertical = 0;
    this.player = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0.5, 2, 10));
    this.capsule = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3), this.player);
    this.controller = this.world.createCharacterController(0.02); this.controller.enableAutostep(1.05, 0.2, true); this.controller.enableSnapToGround(0.3);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4); this.controller.setMinSlopeSlideAngle(Math.PI / 3);
    this.grounded = false;
  }
  prepare(chunk, size, geometry, revision) {
    const R = this.R, p = toLocal(chunk.map(v => v * size), this.origin);
    // Prepare before retiring the previous collider; failure keeps the old one.
    const collider = geometry.indices.length ? this.world.createCollider(R.ColliderDesc.trimesh(geometry.positions, geometry.indices).setTranslation(...p).setFriction(0.8).setEnabled(false)) : null;
    return { collider, chunk, size, revision };
  }
  discard(prepared) { if (prepared.collider) this.world.removeCollider(prepared.collider, true); }
  commit(key, prepared) {
    const previous = this.chunks.get(key);
    prepared.collider?.setEnabled(true);
    if (previous?.collider) this.world.removeCollider(previous.collider, true);
    this.chunks.set(key, prepared); return prepared.collider;
  }
  replace(key, chunk, size, geometry, revision) {
    return this.commit(key, this.prepare(chunk, size, geometry, revision));
  }
  remove(key) { const entry = this.chunks.get(key); if (entry?.collider) this.world.removeCollider(entry.collider, true); this.chunks.delete(key); }
  syncActors(records) {
    for (const record of records) {
      if (this.actors.has(record.id)) continue;
      const p = toLocal(record.position, this.origin);
      const body = this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(...p).setRotation(record.rotation).setCcdEnabled(true).setCanSleep(true));
      const center = debrisReferenceCenter(record), geometry = createDebrisGeometry(record);
      if (record.mode === 'smooth' && geometry.positions.length >= 12) {
        // A single convex hull is a deliberate conservative collision proxy:
        // it is bounded, stable under CCD, and never creates dynamic trimesh
        // or one body per sample.  Its approximation is reported in Phase 0.
        let hull = null;
        try { hull = this.R.ColliderDesc.convexHull(geometry.positions); } catch { /* degeneracy uses the bounded fallback below */ }
        if (hull) this.world.createCollider(hull.setDensity(0.6).setFriction(0.8), body);
        else {
          const bounds = geometryBounds(geometry);
          this.world.createCollider(this.R.ColliderDesc.cuboid(...bounds.halfExtents).setTranslation(...bounds.center).setDensity(0.6).setFriction(0.8), body);
        }
      } else for (const cell of record.cells) this.world.createCollider(this.R.ColliderDesc.cuboid(0.5, 0.5, 0.5).setTranslation(...cell.map((v, i) => v + 0.5 - center[i])).setDensity(0.6).setFriction(0.8), body);
      if (record.status === 'SLEEPING') body.sleep();
      const bounds = geometryBounds(geometry);
      const radius = bounds ? Math.max(...bounds.halfExtents) + 1 : Math.max(...record.cells.flatMap(cell=>cell.map((v,i)=>Math.abs(v+0.5-center[i])+1)));
      this.actors.set(record.id, { body, center, cells: record.cells, radius, geometry, mode: geometry.mode });
    }
  }
  poses() {
    return [...this.actors].map(([id, { body }]) => ({ id, position: toGlobal(Object.values(body.translation()), this.origin), rotation: { ...body.rotation() }, status: body.isSleeping() ? 'SLEEPING' : 'ACTIVE' }));
  }
  playerGlobal() { const p = this.player.translation(); return toGlobal([p.x, p.y, p.z], this.origin); }
  setPlayer(global) { const p = toLocal(global, this.origin); this.player.setTranslation({ x: p[0], y: p[1], z: p[2] }, true); this.player.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] }); this.vertical = 0; }
  shiftOrigin(next) {
    const delta = next.map((v, i) => v - this.origin[i]);
    this.world.forEachRigidBody(body => {
      const p = body.translation(), moved = { x: p.x - delta[0], y: p.y - delta[1], z: p.z - delta[2] };
      body.setTranslation(moved, false); if (body.isKinematic()) body.setNextKinematicTranslation(moved);
    });
    for (const { collider } of this.chunks.values()) if (collider) { const p = collider.translation(); collider.setTranslation({ x: p.x - delta[0], y: p.y - delta[1], z: p.z - delta[2] }); }
    this.origin = [...next]; this.world.propagateModifiedBodyPositionsToColliders();
  }
  step({ x = 0, z = 0, up = 0, fly = false, jump = false, ready = true, actorReady = () => true } = {}) {
    // A resident player window may unload the bridge's floor. Freeze the
    // bounded lab actor until its collision neighbourhood is resident again.
    for (const { body, radius } of this.actors.values()) {
      const p=body.translation(),global=toGlobal([p.x,p.y,p.z],this.origin);let known=true;
      for(const dx of [-radius,radius])for(const dy of [-radius,radius])for(const dz of [-radius,radius])known &&= actorReady(...global.map((v,i)=>Math.floor(v+[dx,dy,dz][i])));
      if(body.isEnabled()!==known)body.setEnabled(known);
    }
    const p = this.player.translation();
    if (ready) {
      this.vertical = fly ? up * LAB.flySpeed : this.grounded && jump ? 7 : this.grounded ? -0.5 : this.vertical + LAB.gravity * LAB.fixedStep;
      const desired = { x: x * LAB.fixedStep, y: this.vertical * LAB.fixedStep, z: z * LAB.fixedStep };
      let movement = desired;
      if (!fly) { this.controller.computeColliderMovement(this.capsule, desired); movement = this.controller.computedMovement(); this.grounded = this.controller.computedGrounded(); }
      this.player.setNextKinematicTranslation({ x: p.x + movement.x, y: p.y + movement.y, z: p.z + movement.z });
    }
    this.world.step();
  }
  dispose() { this.world.free(); }
}
