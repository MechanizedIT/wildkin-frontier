import * as THREE from '../../vendor/three.module.js';
import RAPIER from '../../vendor/rapier.js';
import { LAB, MATERIALS } from './config.js';
import { raycastVoxel } from './coordinates.js';
import { raycastSmooth } from './smooth-raycast.js';
import { openLabStore } from './persistence.js';
import { LabWorldState } from './world-state.js';
import { LabPhysics } from './physics.js';
import { LabRuntime } from './runtime.js';
import { Metrics } from './metrics.js';

const $ = id => document.getElementById(id), params = new URLSearchParams(location.search);
const mesher = params.get('mesher') || 'surface-nets',smooth=['surface-nets','marching-tetrahedra'].includes(mesher);
const size = params.get('size')==='32'?32:16;
const spacing=smooth?(params.get('spacing')==='0.25'?0.25:0.5):1;
const profileName = params.get('profile') || (matchMedia('(pointer:coarse)').matches ? 'mobile' : 'desktop');
const profile = {...(LAB.profiles[profileName] || LAB.profiles.desktop),...(smooth?LAB.smoothProfiles[profileName]||LAB.smoothProfiles.desktop:{})};
if(params.get('window')==='32')profile.normalizedWindowMeters=32;
$('size').value = String(size); $('profile').value = profileName;$('mesher').value=mesher;$('spacing').value=String(spacing);$('spacing-label').hidden=!smooth;
document.body.classList.toggle('mobile', profileName === 'mobile');
if (profileName === 'mobile') document.querySelector('details').open = false;
const say = message => { $('message').textContent = message; };
window.addEventListener('error', e => say(`Error: ${e.message}`));
window.addEventListener('unhandledrejection', e => say(`Error: ${e.reason?.message || e.reason}`));

async function boot() {
  await RAPIER.init();
  const metrics = new Metrics();
  const namespace=params.get('save')||(smooth?`wildkin-voxel-lab-smooth-${spacing}`:'wildkin-voxel-lab-phase0');
  const store = await openLabStore(namespace,{mode:smooth?'smooth':'block',spacing}), state = new LabWorldState(store, await store.load(), {onTiming:(name,value)=>metrics.add(name,value)});
  const physics = new LabPhysics(RAPIER), scene = new THREE.Scene();
  scene.background = new THREE.Color(0x77939b); scene.fog = new THREE.Fog(0x77939b, 28, 90);
  scene.add(new THREE.HemisphereLight(0xc6e4f2, 0x473727, 2.4));
  const sun = new THREE.DirectionalLight(0xffe4b4, 2.4); sun.position.set(30, 55, 20); scene.add(sun);
  const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: profileName === 'desktop', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, profile.dpr)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 160); camera.rotation.order = 'YXZ';
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  const runtime = new LabRuntime({ scene, physics, state, size, profile, metrics, mesher,spacing });
  const selection = new THREE.LineSegments(new THREE.EdgesGeometry(smooth?new THREE.SphereGeometry(LAB.brushRadius,16,12):new THREE.BoxGeometry(1.012, 1.012, 1.012)), new THREE.LineBasicMaterial({ color: 0xfff1a0,transparent:true,opacity:0.65 }));
  selection.visible = false; scene.add(selection);
  let yaw = 0, pitch = -0.18, fly = false, accumulator = 0, previous = performance.now(), lastHud = 0, target = null, originRequest = null, benchmarkEnd = null, lastReport = null;
  let lastActorSave = 0, actorSavePending = false, lastActorSignature = '';
  const keys = new Set(), direction = new THREE.Vector3();
  function setFly(value) { fly = value; physics.vertical = 0; $('fly').textContent = `Fly: ${fly ? 'on' : 'off'}`; }
  const clearInput = () => keys.clear(); addEventListener('blur', clearInput); document.addEventListener('visibilitychange', () => { clearInput(); previous = performance.now(); accumulator = 0; });
  addEventListener('keydown', event => {
    if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (['Space','ArrowUp','ArrowDown'].includes(event.code)) event.preventDefault();
    keys.add(event.code); if (event.repeat) return;
    if (event.code === 'KeyE') mine(); if (event.code === 'KeyF') collect(); if (event.code === 'KeyG') setFly(!fly);
  });
  addEventListener('keyup', event => keys.delete(event.code));
  let pointer = null;
  $('view').addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; $('view').setPointerCapture(event.pointerId); });
  $('view').addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    yaw -= (event.clientX-pointer.x)*0.004; pitch = THREE.MathUtils.clamp(pitch-(event.clientY-pointer.y)*0.004, -1.5, 1.5);
    pointer.x=event.clientX; pointer.y=event.clientY;
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) $('view').addEventListener(name, () => { pointer=null; });
  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(button.dataset.key); button.setPointerCapture(event.pointerId); });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, () => keys.delete(button.dataset.key));
  }
  async function mine() {
    if (!target) { say('Aim at terrain within seven metres.'); return; }
    if (!runtime.editKnown(...target.cell)) { say('Wait for this chunk to finish loading.'); return; }
    try {
      const brush=smooth?{center:target.point.map((v,i)=>v+[direction.x,direction.y,direction.z][i]*LAB.brushDepth),radius:LAB.brushRadius}:{};
      const start = performance.now(), result = await state.mine(target.cell, $('tool').value, (...p)=>runtime.editKnown(...p),brush);
      metrics.add('saveAndSupportMs', performance.now()-start);
      if (result) { runtime.invalidate(result.changed); say(`${MATERIALS[result.material].name} removed and saved${result.detached ? ' · unsupported bridge is falling' : ''}. Collect its drop nearby.`); }
    } catch (error) { say(`${error.message}. Nothing was consumed; retry is safe.`); }
  }
  async function collect() { try { const result = await state.collect(physics.playerGlobal()); runtime.syncObjects(); say(result ? `Collected ${result.count} material drop(s); pack saved.` : 'Move closer to the small glowing material pieces.'); } catch(error) { say(`Save failed: ${error.message}. Drops remain available.`); } }
  $('mine').onclick=mine; $('collect').onclick=collect; $('fly').onclick=()=>setFly(!fly);
  $('home').onclick=()=>{ physics.setPlayer([0.5,2,10]); yaw=0; pitch=-0.18; setFly(false); say('Returned to the test court.'); };
  $('origin').onclick=()=>{ originRequest = physics.origin.map((v,i)=>v+(i===0?256:i===1?-256:256)); };
  $('reload').onclick=async()=>{ try { await state.saveActors(physics.poses()); location.reload(); } catch(error) { say(`Reload cancelled: ${error.message}`); } };
  for (const id of ['size','profile','mesher','spacing']) $(id).onchange=async()=>{
    await state.saveActors(physics.poses()); params.set(id,$(id).value);if(id==='spacing'||id==='mesher')params.delete('save');location.search=params.toString();
  };
  function report() {
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { schema: 1, kind: 'phase0-lab', timestamp: new Date().toISOString(), size, mesher,spacing,mode:smooth?'smooth':'block',profile: profileName, profileSettings:profile,seed: LAB.seed, generator: LAB.version,
      deviceLabel: $('device').value, userAgent: navigator.userAgent, viewport: [innerWidth,innerHeight], pixelRatio: renderer.getPixelRatio(), hardwareConcurrency: navigator.hardwareConcurrency,
      gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable', metrics: metrics.report(), runtime: runtime.stats(),
      rendering: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries },
      heap: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null,
      origin: [...physics.origin], player: physics.playerGlobal(), grounded: physics.grounded, actors: physics.poses(), save: structuredClone(state.state),
      limitations: ['Device label is supplied by tester; emulated viewport is not real-phone proof.','Geometry bytes exclude browser, WASM and GPU overhead; heap is separate and Chromium-specific.','Phase 0 fixture and bounded resident window; no shipping-world migration.'] };
  }
  $('bench').onclick=()=>{ metrics.reset(); benchmarkEnd=performance.now()+20000; lastReport=null; say('Recording for 20 seconds. Walk, turn and mine normally; keep this page visible.'); };
  $('export').onclick=()=>{
    const blob=new Blob([JSON.stringify(lastReport||report(),null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download=`voxel-phase0-${profileName}-${size}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { previous=now; return; }
    const elapsed=now-previous;previous=now;metrics.add('frameMs',elapsed); accumulator+=Math.min(elapsed/1000,0.1);
    const frameStart=performance.now();
    // Explicit benchmark baseline: same renderer/libraries, zero world products.
    if(!params.has('baseline'))runtime.stream(physics.playerGlobal());
    let steps=0;
    while (accumulator>=LAB.fixedStep && steps++<6) {
      const local=physics.player.translation();
      if (!originRequest && Math.max(Math.abs(local.x),Math.abs(local.y),Math.abs(local.z))>LAB.originThreshold*2) originRequest=physics.playerGlobal().map(v=>Math.floor(v/LAB.originStride)*LAB.originStride);
      if (originRequest) { runtime.rebase(originRequest); originRequest=null; }
      runtime.publishReady();
      const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')), side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
      const length=Math.max(1,Math.hypot(forward,side)), speed=fly?LAB.flySpeed:LAB.walkSpeed;
      const x=(side*Math.cos(yaw)-forward*Math.sin(yaw))*speed/length, z=(-forward*Math.cos(yaw)-side*Math.sin(yaw))*speed/length;
      const start=performance.now();
      physics.step({x,z,up:Number(keys.has('Space'))-Number(keys.has('ControlLeft')),fly,jump:keys.has('Space'),ready:fly||runtime.playerReady(physics.playerGlobal()),actorReady:(...p)=>runtime.knownPhysical(...p)});
      metrics.add('physicsMs',performance.now()-start); accumulator-=LAB.fixedStep;
    }
    runtime.updateObjects(); const p=physics.player.translation(); camera.position.set(p.x,p.y+0.55,p.z);camera.rotation.set(pitch,yaw,0);
    if(now-lastActorSave>2000 && !actorSavePending && physics.actors.size && !runtime.dirty.size){
      lastActorSave=now;
      const poses=physics.poses(),signature=JSON.stringify(poses.map(p=>({...p,position:p.position.map(v=>+v.toFixed(3)),rotation:Object.fromEntries(Object.entries(p.rotation).map(([k,v])=>[k,+v.toFixed(4)]))})));
      if(signature!==lastActorSignature){actorSavePending=true;state.saveActors(poses).then(()=>{lastActorSignature=signature;}).catch(error=>say(`Debris save failed: ${error.message}. Use Save & reload to retry.`)).finally(()=>{actorSavePending=false;});}
    }
    camera.getWorldDirection(direction);const start=physics.playerGlobal();start[1]+=0.55;
    target=smooth?raycastSmooth(start,[direction.x,direction.y,direction.z],(...p)=>state.readDensity(...p),(...p)=>state.read(...p),spacing,LAB.reach):raycastVoxel(start,[direction.x,direction.y,direction.z],(...p)=>state.read(...p),LAB.reach);
    selection.visible=!!target;
    if(target)selection.position.fromArray(smooth?target.point.map((v,i)=>v+[direction.x,direction.y,direction.z][i]*LAB.brushDepth-physics.origin[i]):target.cell.map((v,i)=>v+0.5-physics.origin[i]));
    renderer.render(scene,camera);metrics.add('frameWorkMs',performance.now()-frameStart);
    if(now-lastHud>300){
      lastHud=now;const s=runtime.stats(),m=metrics.report();
      $('state').textContent=s.pending||s.published<s.chunks?`Loading ${s.published}/${s.chunks} chunks`:`${size}³ · ${spacing} m · ${profileName} · saved r${state.state.revision}`;
      $('target').textContent=target?`${MATERIALS[target.material].name} · ${MATERIALS[target.material].tool} · ${target.cell.join(', ')}`:'';
      $('diagnostics').textContent=`Position ${physics.playerGlobal().map(v=>v.toFixed(1)).join(' / ')}\nOrigin ${physics.origin.join(' / ')}\n${s.published}/${s.chunks} chunks · ${renderer.info.render.calls} draws\nFrame p95 ${m.frameMs?.p95?.toFixed(1)||'…'}ms · work ${m.frameWorkMs?.p95?.toFixed(1)||'…'}ms\nGeometry + voxels ${(s.meshAndVoxelBytes/1048576).toFixed(1)} MiB\nPack ${JSON.stringify(state.state.inventory)}\n${s.errors.length?s.errors.at(-1):''}`;
    }
    if(benchmarkEnd && now>=benchmarkEnd){benchmarkEnd=null;lastReport=report();say(`Recorded: frame p95 ${lastReport.metrics.frameMs.p95.toFixed(1)} ms; work p99 ${lastReport.metrics.frameWorkMs.p99.toFixed(1)} ms. Download evidence, then repeat with the other chunk size.`);}
  }
  // Read-only diagnostics plus explicit fixture operations for reproducible tests.
  window.__voxelLab={state,physics,runtime,metrics,report,camera,renderer,ready:true,
    fixture:{setPlayer:p=>physics.setPlayer(p),look:(y,p)=>{yaw=y;pitch=p;},fly:setFly,shift:o=>{originRequest=o;},
      mine:async(cell,tool='pick',brush={})=>{const r=await state.mine(cell,tool,(...p)=>runtime.editKnown(...p),brush);if(r)runtime.invalidate(r.changed);return r;},
      flush:()=>state.saveActors(physics.poses())}};
  requestAnimationFrame(frame);
}
boot().catch(error=>{ $('state').textContent='Lab stopped safely'; say(error.message); console.error(error); });
