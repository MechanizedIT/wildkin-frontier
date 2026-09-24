import { checksum } from './persistence.js';
import { CELLULAR_VERSION, DIRT_CELLULAR_VERSION, MIXED_CELLULAR_VERSION, createInitialRockState, createInitialDirtState, createInitialMixedState, quantityAudit } from './matter-actor.js';
import { rockBondId } from './matter-structure.js';
import { rockBondSites } from './fracture-field.js';

export const CELLULAR_NAMESPACE='wildkin-voxel-lab-cellular-0.5a4-v1';
export const DIRT_CELLULAR_NAMESPACE='wildkin-voxel-lab-cellular-0.5b-dirt-v1';
export const MIXED_CELLULAR_NAMESPACE='wildkin-voxel-lab-cellular-0.5c-mixed-v1';
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
export function migrateLegacyHardRockState(state){
  if(!state||state.version!==CELLULAR_VERSION||state.materialId!==undefined)return state;
  const next=structuredClone(state),consumed=Object.values(next.ownership??{}).filter(owner=>owner==='consumed').length;
  next.materialId=1;next.fixture='rock-boulder';next.parcelMaterials=Object.fromEntries(Object.keys(next.ownership??{}).map(key=>[key,1]));
  next.rewards={...next.rewards,dirtUnits:0};next.events={dugUnits:{rock:consumed,dirt:0},crumbledUnits:{rock:0,dirt:0}};
  for(const actor of next.actors??[])actor.material=1;
  return next;
}
function validStructure(value){
  if(!value||!Number.isSafeInteger(value.hitSequence)||value.hitSequence<0||!value.stress||typeof value.stress!=='object'||Array.isArray(value.stress)||!Array.isArray(value.broken)||value.broken.length>12288)return false;
  const ids=Object.keys(value.stress),known=new Set(ids);if(ids.length>12288||ids.some(id=>{
    const pair=rockBondSites(id);return !pair||rockBondId(...pair)!==id||!id.includes('rock:9212026:v1:')||!Number.isFinite(value.stress[id])||value.stress[id]<0;
  }))return false;
  return new Set(value.broken).size===value.broken.length&&value.broken.every(id=>known.has(id));
}
export function validateCellularState(state){
  const mixed=state?.materialId===3||state?.version===MIXED_CELLULAR_VERSION,rock=!mixed&&(state?.materialId===1||state?.version===CELLULAR_VERSION),dirt=!mixed&&(state?.materialId===2||state?.version===DIRT_CELLULAR_VERSION),
    materialId=mixed?3:dirt?2:rock?1:0,fixture=mixed?'mixed-dirt-supported-rock':dirt?'dirt-bank':'rock-boulder',version=mixed?MIXED_CELLULAR_VERSION:dirt?DIRT_CELLULAR_VERSION:CELLULAR_VERSION;
  if(!state||!materialId||state.version!==version||state.materialId!==materialId||state.fixture!==fixture||state.seed!==9212026||state.spacing!==.5||!Number.isSafeInteger(state.revision)||state.revision<0)throw new Error('Incompatible cellular save');
  const base=mixed?createInitialMixedState():dirt?createInitialDirtState():createInitialRockState(),length=13**3;
  const validField=(f,expected=materialId)=>f&&Array.isArray(f.densities)&&f.densities.length===length&&f.densities.every(Number.isFinite)&&
    Array.isArray(f.materials)&&f.materials.length===length&&f.materials.every(v=>v===0||v===expected);
  const validMixedSnapshot=f=>f===null&&state.revision===0||f&&Array.isArray(f.densities)&&f.densities.length===length&&f.densities.every(Number.isFinite)&&
    Array.isArray(f.materials)&&f.materials.length===length&&f.materials.every(v=>v===0||v===1||v===2)&&
    f.densities.every((v,i)=>(v<0)===(f.materials[i]===1||f.materials[i]===2));
  const validSupportSummary=s=>s&&Number.isSafeInteger(s.components)&&s.components>=0&&s.components<=32768&&Number.isSafeInteger(s.workUnits)&&
    s.workUnits>=0&&s.workUnits<=12288&&typeof s.anchoredRock==='boolean'&&typeof s.anchoredDirt==='boolean'&&
    (s.before===undefined||s.before===null||Number.isSafeInteger(s.before.components)&&s.before.components>=0&&Number.isSafeInteger(s.before.workUnits)&&
      s.before.workUnits>=0&&s.before.workUnits<=12288&&typeof s.before.anchoredRock==='boolean'&&typeof s.before.anchoredDirt==='boolean');
  if(mixed&&!validSupportSummary(state.supportSummary))throw new Error('Corrupt mixed support summary');
  if(mixed?(!validStructure(state.world?.structure)||!validMixedSnapshot(state.world?.mixedSnapshot)):
    (!state.world?.densityEdits||typeof state.world.densityEdits!=='object'||Array.isArray(state.world.densityEdits)||
    (rock&&!validStructure(state.world.structure))||(dirt&&state.world.structure!==undefined))||
    Object.entries(state.world.densityEdits).some(([k,v])=>{const p=k.split(',').map(Number);return p.length!==3||p.some(n=>!Number.isSafeInteger(n)||n<0||n>12)||p.join(',')!==k||!Number.isFinite(v);} ))
    throw new Error('Corrupt cellular world deltas');
  if(!Array.isArray(state.actors)||state.actors.length>4||!Array.isArray(state.retired)||new Set(state.retired).size!==state.retired.length)throw new Error('Corrupt cellular actor limit/retirement');
  const debrisIds=new Set();if(!Array.isArray(state.fractureDebris)||state.fractureDebris.length>64)throw new Error('Corrupt fracture debris records');
  for(const item of state.fractureDebris){if(!rock||!item.id||debrisIds.has(item.id)||!['temporary-physics-shard','tiny-debris'].includes(item.kind)||
      !Number.isSafeInteger(item.quantity)||item.quantity<1||!Array.isArray(item.densities)||item.densities.length!==length||!item.densities.every(Number.isFinite)||
      !Array.isArray(item.materials)||item.materials.length!==length||!item.materials.every(v=>v===0||v===materialId)||!finite3(item.position)||!finite3(item.linearVelocity)||
      !finite3(item.angularVelocity)||!finite3(item.localHit)||!['x','y','z','w'].every(k=>Number.isFinite(item.rotation?.[k])))throw new Error('Corrupt fracture debris record');
    debrisIds.add(item.id);}
  const ids=new Set();for(const actor of state.actors){
    const q=actor.rotation,n=q&&Object.values(q).length===4&&Object.values(q).every(Number.isFinite)?Math.hypot(q.x,q.y,q.z,q.w):NaN;
    if(!actor.id||ids.has(actor.id)||state.retired.includes(actor.id)||!validField(actor,mixed?actor.material:materialId)||!(mixed?[1,2].includes(actor.material):actor.material===materialId)||!finite3(actor.position)||!finite3(actor.linearVelocity)||!finite3(actor.angularVelocity)||!finite3(actor.localCOM)||
      !Number.isSafeInteger(actor.contentRevision)||actor.contentRevision<1||!Number.isSafeInteger(actor.poseRevision)||actor.poseRevision<0||!Number.isFinite(n)||Math.abs(n-1)>.001||
      actor.domain?.id!=='rock:9212026'||actor.spacing!==.5||actor.sampleFrame?.spacing!==.5||!finite3(actor.sampleFrame.offset)||
      ((rock||mixed&&actor.material===1)&&!validStructure(actor.structure))||((dirt||mixed&&actor.material===2)&&actor.structure!==null))throw new Error('Corrupt cellular actor');
    if(actor.densities.some((v,i)=>(v<0)!==(actor.materials[i]===actor.material)))throw new Error('Corrupt cellular material samples');
    ids.add(actor.id);
  }
  if(!state.ownership||typeof state.ownership!=='object'||state.initialQuantity!==base.initialQuantity||
    Object.keys(state.ownership).length!==base.initialQuantity||Object.keys(state.ownership).some(k=>!(k in base.ownership))||
    !state.parcelMaterials||Object.keys(state.parcelMaterials).length!==base.initialQuantity||Object.keys(state.parcelMaterials).some(k=>mixed?![1,2].includes(state.parcelMaterials[k]):state.parcelMaterials[k]!==materialId)||
    !state.rewards||!Number.isSafeInteger(state.rewards.stoneUnits)||state.rewards.stoneUnits<0||!Number.isSafeInteger(state.rewards.dirtUnits)||state.rewards.dirtUnits<0||
    !state.events||!['rock','dirt'].every(name=>['dugUnits','crumbledUnits'].every(field=>Number.isSafeInteger(state.events[field]?.[name])&&state.events[field][name]>=0))||
    !quantityAudit(state).balanced)throw new Error('Corrupt cellular quantity ledger');
  if(Object.values(state.ownership).some(v=>v!=='world'&&v!=='consumed'&&!ids.has(v)&&!debrisIds.has(v)))throw new Error('Corrupt cellular owner');
  for(const item of state.fractureDebris)if(Object.values(state.ownership).filter(owner=>owner===item.id).length!==item.quantity)throw new Error('Fracture debris quantity does not match ownership');
  return state;
}
export async function openCellularStore(namespace=CELLULAR_NAMESPACE,initialState=createInitialRockState){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(namespace,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('manifest');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const result=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  return {namespace,
    async load(){const tx=db.transaction('manifest','readonly'),record=await result(tx.objectStore('manifest').get('world'));
      if(!record)return initialState();if(checksum(record.state)!==record.digest)throw new Error('Cellular checksum mismatch');
      return validateCellularState(migrateLegacyHardRockState(record.state));},
    async save(state){validateCellularState(state);await new Promise((resolve,reject)=>{
      const tx=db.transaction('manifest','readwrite');tx.objectStore('manifest').put({state,digest:checksum(state)},'world');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Cellular IndexedDB aborted'));tx.onerror=()=>reject(tx.error||new Error('Cellular IndexedDB failed'));
    });},
    close(){db.close();},
  };
}
