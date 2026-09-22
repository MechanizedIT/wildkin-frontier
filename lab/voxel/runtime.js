import * as THREE from '../../vendor/three.module.js';
import { address, affectedChunks, key, toLocal } from './coordinates.js';
import { WorkerPool } from './worker-pool.js';
import { MATERIALS, LAB } from './config.js';
import { publishBatch } from './publication.js';
export class LabRuntime {
  constructor({ scene, physics, state, size, profile, metrics, mesher = 'js-greedy',spacing=1 }) {
    Object.assign(this, { scene, physics, state, size, profile, metrics, mesher,spacing });
    this.entries = new Map(); this.dirty = new Set(); this.readyResults = []; this.epoch = 0;
    this.actorMeshes = new Map(); this.dropMeshes = new Map(); this.errors = []; this.lastCenter = '';
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.pool = new WorkerPool(profile.workers, result => this.receive(result));
    this.lastEditAt = null; this.publishRevision = state.state.revision;
  }
  request(entry) {
    entry.token = ++this.epoch; entry.prepared = null;
    entry.id = this.pool.submit({ key: entry.key, token: entry.token, chunk: entry.chunk, size: this.size, spacing:this.spacing, seed: LAB.seed, edits: this.state.state.edits,densityEdits:this.state.state.densityEdits, mesher: this.mesher });
  }
  stream(global) {
    if(this.profile.normalizedWindowMeters){
      // Measurement profile: identical 32m cubic bounds, aligned to a 16m
      // anchor for every sample/chunk candidate. Reported separately from
      // normal profile residency, so fewer large chunks cannot hide more land.
      const anchor=global.map(v=>Math.floor(v/16)*16),anchorKey=key(...anchor);
      if(anchorKey===this.lastCenter)return;this.lastCenter=anchorKey;
      const width=this.size*this.spacing,low=anchor.map(v=>(v-16)/width),count=32/width,ordered=[];
      for(let z=0;z<count;z++)for(let y=0;y<count;y++)for(let x=0;x<count;x++){
        const chunk=low.map((v,i)=>v+[x,y,z][i]);ordered.push({chunk,key:key(...chunk),distance:chunk.reduce((sum,v,i)=>sum+(v*width+width/2-global[i])**2,0)});
      }
      this.reconcile(ordered);return;
    }
    const center = address(...global.map(v=>Math.floor(v/this.spacing)), this.size).chunk, centerKey = key(...center);
    if (centerKey === this.lastCenter) return;
    this.lastCenter = centerKey;
    const radius = Math.max(1, Math.ceil(this.profile.radiusMeters / (this.size*this.spacing))),vertical=Math.max(1,Math.ceil((this.profile.verticalMeters??this.profile.radiusMeters)/(this.size*this.spacing))), ordered = [];
    for (let z = -radius; z <= radius; z++) for (let y = -vertical; y <= vertical; y++) for (let x = -radius; x <= radius; x++) {
      const chunk = center.map((v, i) => v + [x, y, z][i]), k = key(...chunk); ordered.push({ chunk, key: k, distance: x*x+y*y+z*z });
    }
    this.reconcile(ordered);
  }
  reconcile(ordered){
    const desired=new Set(ordered.map(e=>e.key));
    for (const [k, entry] of this.entries) if (!desired.has(k)) {
      this.pool.cancel(k); this.disposeEntry(entry); this.entries.delete(k); this.dirty.delete(k);
    }
    for (const item of ordered.sort((a, b) => a.distance - b.distance)) if (!this.entries.has(item.key)) {
      const entry = { ...item, revision: -1, mesh: null, prepared: null }; this.entries.set(item.key, entry); this.request(entry);
    }
  }
  receive(result) {
    const entry = this.entries.get(result.key);
    if (!entry || entry.token !== result.token || entry.id !== result.id) { this.pool.stats.stale++; return; }
    if (result.error) { this.errors.push(result.error); return; }
    this.metrics.add('generationMs', result.generationMs); this.metrics.add('meshMs', result.meshMs);
    entry.prepared = result; this.readyResults.push(entry.key);
  }
  invalidate(cells) {
    this.lastEditAt = performance.now();
    for (const p of cells) for (const k of affectedChunks(...p, this.size)) {
      const entry = this.entries.get(k); if (entry) this.dirty.add(k);
    }
    for (const k of this.dirty) this.request(this.entries.get(k));
  }
  geometry(data) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1)); geometry.computeBoundingSphere(); return geometry;
  }
  prepareEntry(entry) {
    const result = entry.prepared, started = performance.now(), geometry = this.geometry(result);
    let collider;
    try { collider = this.physics.prepare(entry.chunk, this.size*this.spacing, result, entry.token); }
    catch (error) { geometry.dispose(); throw error; }
    this.metrics.add('colliderMs', performance.now() - started);
    const mesh = new THREE.Mesh(geometry, this.material); mesh.position.fromArray(toLocal(entry.chunk.map(v => v * this.size*this.spacing), this.physics.origin));
    return { mesh, collider, result };
  }
  commitEntry(entry, { mesh, collider, result }) {
    this.physics.commit(entry.key, collider);
    if (entry.mesh) { this.scene.remove(entry.mesh); entry.mesh.geometry.dispose(); }
    this.scene.add(mesh); entry.mesh = mesh; entry.revision = entry.token; entry.prepared = null; entry.bytes = result.positions.byteLength + result.normals.byteLength + result.colors.byteLength + result.indices.byteLength + (this.size+2)**3*(this.state.state.mode==='smooth'?5:1);
    entry.hash = result.hash; entry.meshHash = result.meshHash;
  }
  publish(entries) {
    const result = publishBatch(entries, {
      prepare: entry => this.prepareEntry(entry),
      discard: prepared => { prepared.mesh.geometry.dispose(); this.physics.discard(prepared.collider); },
      commit: (entry, prepared) => this.commitEntry(entry, prepared),
    });
    if (!result.ok && this.errors.at(-1) !== result.error.message) this.errors.push(result.error.message);
    return result.ok;
  }
  publishReady() {
    const started = performance.now();
    // A changed seam and its neighbour, and the source of a falling component,
    // cross the visible/physical revision boundary in the same fixed tick.
    if (this.dirty.size && [...this.dirty].every(k => this.entries.get(k)?.prepared)) {
      const batch = [...this.dirty].map(k => this.entries.get(k));
      if (!this.publish(batch)) return;
      this.dirty.clear(); this.publishRevision = this.state.state.revision;
      this.physics.syncActors(this.state.state.actors); this.syncObjects();
      if (this.lastEditAt !== null) this.metrics.add('editVisibleMs', performance.now() - this.lastEditAt);
      this.lastEditAt = null;
    }
    // Bound normal streaming publication to one chunk per fixed update.
    while (this.readyResults.length) {
      const k = this.readyResults.shift(), entry = this.entries.get(k);
      if (!entry?.prepared || this.dirty.has(k)) continue;
      if (!this.publish([entry])) this.readyResults.push(k); break;
    }
    if (!this.dirty.size) { this.physics.syncActors(this.state.state.actors); this.syncObjects(); }
    const elapsed = performance.now() - started;
    if (elapsed > 0.01) this.metrics.add('streamMainMs', elapsed);
  }
  known(x, y, z) { const e = this.entries.get(address(x, y, z, this.size).key); return !!e?.mesh && e.revision === e.token; }
  // Edits read authoritative scalar state, so an already resident neighbour
  // remains a valid support witness while its disposable products rebuild.
  editKnown(x,y,z){return !!this.entries.get(address(x,y,z,this.size).key)?.mesh;}
  knownPhysical(x,y,z){return this.known(...[x,y,z].map(v=>Math.floor(v/this.spacing)));}
  playerReady(global) {
    // Collision must exist at the foot and capsule before normal movement.
    return this.knownPhysical(global[0],global[1]-1,global[2]);
  }
  syncObjects() {
    const matrix = new THREE.Matrix4();
    for (const record of this.state.state.actors) if (!this.actorMeshes.has(record.id) && this.physics.actors.has(record.id)) {
      const actor = this.physics.actors.get(record.id), geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ color: new THREE.Color(...MATERIALS[3].color) });
      if(actor.mode==='smooth'){
        geometry.dispose();material.dispose();const mesh=new THREE.Mesh(this.geometry(actor.geometry),this.material);this.scene.add(mesh);this.actorMeshes.set(record.id,mesh);continue;
      }
      const mesh = new THREE.InstancedMesh(geometry, material, record.cells.length);
      record.cells.forEach((p, i) => { matrix.makeTranslation(...p.map((v, a) => v+0.5-actor.center[a])); mesh.setMatrixAt(i, matrix); });
      mesh.instanceMatrix.needsUpdate = true; this.scene.add(mesh); this.actorMeshes.set(record.id, mesh);
    }
    const wanted = new Set(this.state.state.drops.map(d => d.id));
    for (const [id, mesh] of this.dropMeshes) if (!wanted.has(id)) { this.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); this.dropMeshes.delete(id); }
    for (const drop of this.state.state.drops) if (!this.dropMeshes.has(drop.id)) {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshLambertMaterial({ color: new THREE.Color(...MATERIALS[drop.material].color), emissive: 0x29220b }));
      mesh.position.fromArray(toLocal(drop.position, this.physics.origin)); this.scene.add(mesh); this.dropMeshes.set(drop.id, mesh);
    }
  }
  updateObjects() {
    for (const [id, mesh] of this.actorMeshes) { const body = this.physics.actors.get(id).body; mesh.position.copy(body.translation()); mesh.quaternion.copy(body.rotation()); }
  }
  rebase(origin) {
    const start = performance.now(); this.physics.shiftOrigin(origin);
    for (const entry of this.entries.values()) if (entry.mesh) entry.mesh.position.fromArray(toLocal(entry.chunk.map(v=>v*this.size*this.spacing), origin));
    for (const drop of this.state.state.drops) this.dropMeshes.get(drop.id)?.position.fromArray(toLocal(drop.position, origin));
    this.updateObjects(); this.metrics.add('originMs', performance.now()-start);
  }
  stats() {
    const entries = [...this.entries.values()];
    return { chunks: entries.length, published: entries.filter(e=>e.mesh).length, pending: this.pool.pending, dirty: this.dirty.size, meshAndVoxelBytes: entries.reduce((s,e)=>s+(e.bytes||0),0), triangles: entries.reduce((s,e)=>s+(e.mesh?.geometry.index.count||0)/3,0), revisionPairs: entries.filter(e=>e.mesh).map(e=>({key:e.key, mesh:e.revision, collider:this.physics.chunks.get(e.key)?.revision})), worker: {...this.pool.stats}, errors: [...this.errors] };
  }
  disposeEntry(entry) { if (entry.mesh) { this.scene.remove(entry.mesh); entry.mesh.geometry.dispose(); } this.physics.remove(entry.key); }
}
