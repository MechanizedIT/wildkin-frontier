import { LAB } from './config.js';
import { address, key } from './coordinates.js';
import { hashBytes } from './generator.js';
const encode = new TextEncoder();
export const checksum = value => hashBytes(encode.encode(JSON.stringify(value)));
export function emptyState({mode='block',spacing=1}={}) {
  return { version: LAB.version, seed: LAB.seed, mode, spacing, revision: 0, edits: {}, densityEdits: {}, actors: [], drops: [], inventory: {} };
}
export function validateState(state) {
  if (!state || state.version !== LAB.version || state.seed !== LAB.seed || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error('Incompatible lab save');
  for (const [k, v] of Object.entries(state.edits)) {
    const p = k.split(',').map(Number);
    if (p.length !== 3 || !p.every(Number.isSafeInteger) || !Number.isInteger(v) || v < 0 || v > 3 || key(...p) !== k) throw new Error('Corrupt edit');
  }
  if(!['block','smooth'].includes(state.mode??'block')||![1,0.5,0.25].includes(state.spacing??1))throw new Error('Corrupt sample format');
  if((state.mode==='smooth')!==([0.5,0.25].includes(state.spacing??1)))throw new Error('Inconsistent sample format');
  for(const [k,value]of Object.entries(state.densityEdits||{})){const p=k.split(',').map(Number);if(p.length!==3||!p.every(Number.isSafeInteger)||key(...p)!==k||!Number.isFinite(value))throw new Error('Corrupt density edit');}
  if (!Array.isArray(state.actors) || state.actors.length > LAB.maxDebris || !Array.isArray(state.drops) || state.drops.length > LAB.maxDrops) throw new Error('Corrupt actor/drop limits');
  for (const actor of state.actors) {
    if (!actor.id || !Array.isArray(actor.cells) || actor.cells.length > LAB.maxDebrisVoxels || !actor.cells.every(p => p.length === 3 && p.every(Number.isSafeInteger)) || !actor.position?.every(Number.isFinite) || actor.position.length !== 3 || !actor.rotation || !Object.values(actor.rotation).every(Number.isFinite)) throw new Error('Corrupt debris');
    if(!actor.cells.length)throw new Error('Empty debris');
    if(actor.mode!=='smooth'&&actor.cells.length>LAB.maxCompoundBoxes)throw new Error('Compound collider budget exceeded');
    if(actor.mode==='smooth'&&(![0.5,0.25].includes(actor.spacing)||!Array.isArray(actor.samples)||actor.samples.length!==actor.cells.length||!actor.samples.every(v=>Number.isFinite(v)&&v<0)))throw new Error('Corrupt smooth debris');
  }
  for (const drop of state.drops) if (!drop.id || ![1, 2, 3].includes(drop.material) || !drop.position?.every(Number.isFinite) || drop.position.length !== 3) throw new Error('Corrupt drop');
  if (!state.inventory || !Object.values(state.inventory).every(v => Number.isSafeInteger(v) && v >= 0)) throw new Error('Corrupt inventory');
  return state;
}
export async function openLabStore(namespace = 'wildkin-voxel-lab-phase0', options={}) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(namespace, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('manifest'); request.result.createObjectStore('chunks');
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const requestResult = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  return {
    namespace,
    async load() {
      const tx = db.transaction(['manifest', 'chunks'], 'readonly');
      const [manifest, chunks] = await Promise.all([requestResult(tx.objectStore('manifest').get('world')), requestResult(tx.objectStore('chunks').getAll())]);
      if (!manifest) return emptyState(options);
      const { digest, ...state } = manifest;
      if (checksum(state) !== digest) throw new Error('Corrupt manifest checksum; save preserved');
      state.edits = {}; state.densityEdits = {};
      for (const record of chunks) {
        if (checksum(record.edits) !== record.digest || record.version !== LAB.version) throw new Error('Corrupt chunk checksum; save preserved');
        Object.assign(state.edits, record.edits);
        if(record.densityEdits){if(checksum(record.densityEdits)!==record.densityDigest)throw new Error('Corrupt density checksum; save preserved');Object.assign(state.densityEdits,record.densityEdits);}
      }
      if(options.mode&&((state.mode??'block')!==options.mode||(state.spacing??1)!==options.spacing))throw new Error('Save resolution differs; use its original lab profile');
      return validateState(state);
    },
    async save(state) {
      validateState(state);
      const chunks = new Map();
      for (const [k, value] of Object.entries(state.edits)) {
        const chunkKey = address(...k.split(',').map(Number), 32).key;
        if (!chunks.has(chunkKey)) chunks.set(chunkKey, {edits:{},densityEdits:{}});
        chunks.get(chunkKey).edits[k] = value;
      }
      for(const [k,value]of Object.entries(state.densityEdits||{})){const chunkKey=address(...k.split(',').map(Number),32).key;if(!chunks.has(chunkKey))chunks.set(chunkKey,{edits:{},densityEdits:{}});chunks.get(chunkKey).densityEdits[k]=value;}
      // Fixed 32-cell persistence partitions are independent of meshing chunk size.
      // One transaction commits deltas, debris ownership and rewards together.
      const { edits, densityEdits, ...manifest } = state;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['manifest', 'chunks'], 'readwrite');
        tx.objectStore('manifest').put({ ...manifest, digest: checksum(manifest) }, 'world');
        tx.objectStore('chunks').clear();
        for (const [k, delta] of chunks) tx.objectStore('chunks').put({ version: LAB.version, revision: state.revision, ...delta, digest: checksum(delta.edits),densityDigest:checksum(delta.densityEdits) }, k);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error || new Error('Save transaction failed')); tx.onabort = () => reject(tx.error || new Error('Save aborted'));
      });
    },
    close() { db.close(); },
  };
}
