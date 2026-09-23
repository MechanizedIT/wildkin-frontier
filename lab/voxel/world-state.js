import { createGenerator, createDensityGenerator } from './generator.js';
import { emptyState } from './persistence.js';
import { key } from './coordinates.js';
import { unsupportedWood } from './support.js';
import { LAB, MATERIALS } from './config.js';
export class LabWorldState {
  constructor(store, state = emptyState(), { onTiming = () => {}, now = () => performance.now() } = {}) { this.store = store; this.state = state; this.base = createGenerator(state.seed); this.scalarBase=createDensityGenerator(state.seed);this.baseCache=new Map(); this.queue = Promise.resolve(); this.onTiming=onTiming; this.now=now; }
  sampleBase(x,y,z){const k=key(x,y,z);let value=this.baseCache.get(k);if(!value){value=this.scalarBase(x*this.state.spacing,y*this.state.spacing,z*this.state.spacing);if(this.baseCache.size>=32768)this.baseCache.clear();this.baseCache.set(k,value);}return value;}
  readDensity(x,y,z,state=this.state){return state.densityEdits?.[key(x,y,z)]??this.sampleBase(x,y,z).density;}
  read(x, y, z, state=this.state) {
    if(state.mode==='smooth')return this.readDensity(x,y,z,state)<0?(state.edits[key(x,y,z)]??this.sampleBase(x,y,z).material):0;
    return state.edits[key(x, y, z)] ?? this.base(x, y, z);
  }
  transact(change) {
    const task = this.queue.then(async () => {
      const next = structuredClone(this.state), result = change(next);
      if (result === false) return false;
      next.revision++; const start=this.now(); await this.store.save(next); this.onTiming('saveMs',this.now()-start); this.state = next;
      return result;
    });
    this.queue = task.catch(() => {}); return task;
  }
  transactPrepared({expectedRevision,propose,prepare,install,discard,validate=()=>true}){
    const task=this.queue.then(async()=>{
      if(this.publicationFailed)throw new Error('Committed cellular state requires reconstruction before interaction');
      if(this.state.revision!==expectedRevision)return {status:'STALE',state:this.state};
      const proposal=propose(this.state);
      if(proposal.status!=='OK')return proposal;
      const next=proposal.state;if(next.revision!==expectedRevision+1)throw new Error('Invalid prepared revision');
      const owned=[];const own=value=>{owned.push(value);return value;};let prepared;
      try{
        prepared=await prepare(next,own);
        if(this.state.revision!==expectedRevision||!validate(next,prepared))return {status:'STALE',state:this.state};
        const start=this.now();await this.store.save(next);this.onTiming('saveMs',this.now()-start);
        this.state=next;
        try{await install(prepared,next,proposal);}catch(error){this.publicationFailed=error;throw error;}
        return {...proposal,state:next};
      }finally{
        if(this.state!==next)for(const value of owned.reverse())try{discard(value);}catch{/* preserve original failure */}
      }
    });
    this.queue=task.catch(()=>{});return task;
  }
  mine(cell, tool, known = () => true, brush = {}) {
    if(this.state.mode==='smooth')return this.mineSmooth(cell,tool,known,brush);
    return this.transact(next => {
      const k = key(...cell), material = next.edits[k] ?? this.base(...cell);
      if (!material) return false;
      if (MATERIALS[material].tool !== tool) throw new Error(`${MATERIALS[material].name} needs the ${MATERIALS[material].tool}`);
      if (next.drops.length >= LAB.maxDrops) throw new Error('Collect nearby drops first');
      next.edits[k] = 0;
      next.drops.push({ id: `drop-${next.revision + 1}`, material, position: cell.map(v => v + 0.5) });
      const read = (x, y, z) => next.edits[key(x, y, z)] ?? this.base(x, y, z);
      const supportStart=this.now(),components = unsupportedWood(read, known, LAB.maxCompoundBoxes), changed = [cell]; this.onTiming('supportMs',this.now()-supportStart);
      if (next.actors.length + components.length > LAB.maxDebris) throw new Error('Debris budget reached; edit retained for retry');
      for (const cells of components) {
        for (const p of cells) { next.edits[key(...p)] = 0; changed.push(p); }
        const position = cells.reduce((a, p) => a.map((v, i) => v + (p[i] + 0.5) / cells.length), [0, 0, 0]);
        next.actors.push({ id: `debris-${next.revision + 1}-${next.actors.length}`, cells, position, rotation: { x: 0, y: 0, z: 0, w: 1 }, status: 'ACTIVE' });
      }
      return { changed, material, detached: components.length };
    });
  }
  mineSmooth(cell,tool,known,brush){
    return this.transact(next=>{
      const material=this.read(...cell,next),spacing=next.spacing;
      if(!material)return false;if(MATERIALS[material].tool!==tool)throw new Error(`${MATERIALS[material].name} needs the ${MATERIALS[material].tool}`);
      const center=brush.center||cell.map(v=>v*spacing),radius=brush.radius??0.8,changed=[],materials=new Set();
      const low=center.map(v=>Math.floor((v-radius-spacing)/spacing)),high=center.map(v=>Math.ceil((v+radius+spacing)/spacing));
      for(let z=low[2];z<=high[2];z++)for(let y=low[1];y<=high[1];y++)for(let x=low[0];x<=high[0];x++){
        const p=[x,y,z],oldMaterial=this.read(x,y,z,next),oldDensity=this.readDensity(x,y,z,next);
        if(!oldMaterial||MATERIALS[oldMaterial].tool!==tool)continue;
        const cut=radius-Math.hypot(x*spacing-center[0],y*spacing-center[1],z*spacing-center[2]);
        const value=Math.max(oldDensity,cut);if(value===oldDensity)continue;
        if(!known(x,y,z))throw new Error('Wait for the brush neighbourhood to load');
        const k=key(x,y,z);next.densityEdits[k]=value;next.edits[k]=value<0?oldMaterial:0;changed.push(p);if(value>=0)materials.add(oldMaterial);
      }
      if(!materials.size)return false;
      if(next.drops.length+materials.size>LAB.maxDrops)throw new Error('Collect nearby drops first');
      for(const id of materials)next.drops.push({id:`drop-${next.revision+1}-${id}`,material:id,position:[...center]});
      const supportStart=this.now(),components=unsupportedWood((...p)=>this.read(...p,next),known,LAB.maxDebrisVoxels,spacing);this.onTiming('supportMs',this.now()-supportStart);
      if(next.actors.length+components.length>LAB.maxDebris)throw new Error('Debris budget reached; edit retained for retry');
      for(const cells of components){
        const samples=cells.map(p=>this.readDensity(...p,next));
        const position=cells.reduce((a,p)=>a.map((v,i)=>v+p[i]*spacing/cells.length),[0,0,0]);
        next.actors.push({id:`debris-${next.revision+1}-${next.actors.length}`,mode:'smooth',spacing,cells,samples,position,rotation:{x:0,y:0,z:0,w:1},status:'ACTIVE'});
        for(const p of cells){const k=key(...p);next.edits[k]=0;next.densityEdits[k]=spacing;changed.push(p);}
      }
      return {changed,material,detached:components.length};
    });
  }
  collect(position) {
    return this.transact(next => {
      let count = 0;
      next.drops = next.drops.filter(drop => {
        if (Math.hypot(...drop.position.map((v, i) => v - position[i])) > 3.5) return true;
        const name = MATERIALS[drop.material].drop; next.inventory[name] = (next.inventory[name] || 0) + 1; count++; return false;
      });
      return count ? { count } : false;
    });
  }
  saveActors(poses) {
    return this.transact(next => { for (const actor of next.actors) { const pose = poses.find(p => p.id === actor.id); if (pose) Object.assign(actor, pose); } return true; });
  }
  saveCellularPoses(poses){
    return this.transact(next=>{let count=0;for(const pose of poses){const actor=next.actors.find(a=>a.id===pose.id&&a.contentRevision===pose.contentRevision);
      if(!actor)continue;
      if(!Array.isArray(pose.position)||pose.position.length!==3||!pose.position.every(Number.isFinite)||
        !['x','y','z','w'].every(k=>Number.isFinite(pose.rotation?.[k]))||
        !Array.isArray(pose.linearVelocity)||pose.linearVelocity.length!==3||!pose.linearVelocity.every(Number.isFinite)||
        !Array.isArray(pose.angularVelocity)||pose.angularVelocity.length!==3||!pose.angularVelocity.every(Number.isFinite))continue;
      for(const field of ['position','rotation','linearVelocity','angularVelocity','sleepState'])actor[field]=structuredClone(pose[field]);
      actor.poseRevision++;count++;
    }return count?{count}:false;});
  }
}
