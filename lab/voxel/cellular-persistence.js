import { checksum } from './persistence.js';
import { CELLULAR_VERSION, createInitialRockState, quantityAudit } from './matter-actor.js';

export const CELLULAR_NAMESPACE='wildkin-voxel-lab-cellular-0.5a-v1';
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
export function validateCellularState(state){
  if(!state||state.version!==CELLULAR_VERSION||state.seed!==9212026||state.spacing!==.5||!Number.isSafeInteger(state.revision)||state.revision<0)throw new Error('Incompatible cellular save');
  const base=createInitialRockState(),length=13**3;
  const validField=f=>f&&Array.isArray(f.densities)&&f.densities.length===length&&f.densities.every(Number.isFinite)&&
    Array.isArray(f.materials)&&f.materials.length===length&&f.materials.every(v=>v===0||v===1);
  if(!state.world?.densityEdits||typeof state.world.densityEdits!=='object'||Array.isArray(state.world.densityEdits)||
    Object.entries(state.world.densityEdits).some(([k,v])=>{const p=k.split(',').map(Number);return p.length!==3||p.some(n=>!Number.isSafeInteger(n)||n<0||n>12)||p.join(',')!==k||!Number.isFinite(v);} ))
    throw new Error('Corrupt cellular world deltas');
  if(!Array.isArray(state.actors)||state.actors.length>4||!Array.isArray(state.retired)||new Set(state.retired).size!==state.retired.length)throw new Error('Corrupt cellular actor limit/retirement');
  const ids=new Set();for(const actor of state.actors){
    const q=actor.rotation,n=q&&Object.values(q).length===4&&Object.values(q).every(Number.isFinite)?Math.hypot(q.x,q.y,q.z,q.w):NaN;
    if(!actor.id||ids.has(actor.id)||state.retired.includes(actor.id)||!validField(actor)||!finite3(actor.position)||!finite3(actor.linearVelocity)||!finite3(actor.angularVelocity)||!finite3(actor.localCOM)||
      !Number.isSafeInteger(actor.contentRevision)||actor.contentRevision<1||!Number.isSafeInteger(actor.poseRevision)||actor.poseRevision<0||!Number.isFinite(n)||Math.abs(n-1)>.001||
      actor.domain?.id!=='rock:9212026'||actor.spacing!==.5||actor.sampleFrame?.spacing!==.5||!finite3(actor.sampleFrame.offset))throw new Error('Corrupt cellular actor');
    if(actor.densities.some((v,i)=>(v<0)!==(actor.materials[i]===1)))throw new Error('Corrupt cellular material samples');
    ids.add(actor.id);
  }
  if(!state.ownership||typeof state.ownership!=='object'||state.initialQuantity!==base.initialQuantity||
    Object.keys(state.ownership).length!==base.initialQuantity||Object.keys(state.ownership).some(k=>!(k in base.ownership))||
    !state.rewards||!Number.isSafeInteger(state.rewards.stoneUnits)||state.rewards.stoneUnits<0||!quantityAudit(state).balanced)throw new Error('Corrupt cellular quantity ledger');
  if(Object.values(state.ownership).some(v=>v!=='world'&&v!=='consumed'&&!ids.has(v)))throw new Error('Corrupt cellular owner');
  return state;
}
export async function openCellularStore(namespace=CELLULAR_NAMESPACE){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(namespace,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('manifest');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const result=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  return {namespace,
    async load(){const tx=db.transaction('manifest','readonly'),record=await result(tx.objectStore('manifest').get('world'));
      if(!record)return createInitialRockState();if(checksum(record.state)!==record.digest)throw new Error('Cellular checksum mismatch');
      return validateCellularState(record.state);},
    async save(state){validateCellularState(state);await new Promise((resolve,reject)=>{
      const tx=db.transaction('manifest','readwrite');tx.objectStore('manifest').put({state,digest:checksum(state)},'world');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Cellular IndexedDB aborted'));tx.onerror=()=>reject(tx.error||new Error('Cellular IndexedDB failed'));
    });},
    close(){db.close();},
  };
}
