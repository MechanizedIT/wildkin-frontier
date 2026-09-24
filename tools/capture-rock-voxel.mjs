import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.VOXEL_COLLISION_URL??'http://localhost:8097/lab/voxel/rock-collision-study.html';
const out=process.env.VOXEL_COLLISION_OUT??'docs/evidence/voxel-phase05a3/views';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1});
const errors=[],external=[],views=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin+'/'))external.push(r.url());});
try{
  for(const [fixture,methods] of [['initial-detached',['native-voxel-0.25','native-voxel-0.5']],['central-cut-2',['native-voxel-0.25','native-voxel-0.5','fracture-fragments']],['conditioned-child-0',['native-voxel-0.25','fracture-fragments']]])for(const method of methods){
    await page.goto(`${base}?fixture=${fixture}&method=${method}`);await page.waitForFunction(()=>window.__rockCollisionStudy?.ready);
    const data=await page.evaluate(()=>window.__rockCollisionStudy),file=`${fixture}-${method}.png`;
    await page.screenshot({path:`${out}/${file}`});views.push({...data,file});
  }
  await page.locator('#view').click();await page.screenshot({path:`${out}/child-opposite.png`});
  // A landscape compatibility check of the inspector and preserved mine UI.
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${out}/landscape.png`});
  const viewport=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(viewport.width,viewport.scrollWidth);
  const allFixtureInspector=[];
  const fixtureNames=await page.locator('#fixture option').evaluateAll(options=>options.map(o=>o.value));
  for(const fixture of fixtureNames)for(const method of ['native-voxel-0.25','native-voxel-0.5']){
    await page.locator('#fixture').selectOption(fixture);await page.locator('#method').selectOption(method);
    const observed=await page.evaluate(()=>window.__rockCollisionStudy);
    assert.equal(observed.fixture,fixture);assert.equal(observed.method,method);allFixtureInspector.push(observed);
  }
  const dynamics=await page.evaluate(async()=>{
    const {default:R}=await import('/vendor/rapier.js');
    const {LabPhysics}=await import('/lab/voxel/physics.js');
    const {meshSurfaceNets}=await import('/lab/voxel/surface-nets.js');
    const {collisionStudyFixtures}=await import('/lab/voxel/rock-collision-study.js');
    const {planVoxelCollider,createVoxelDescriptor}=await import('/lab/voxel/rock-voxel-collider.js');
    const {planRockColliders}=await import('/lab/voxel/matter-colliders.js');
    const {actorToWorldPoint}=await import('/lab/voxel/matter-target.js');
    const fixture=collisionStudyFixtures()[0],size=16,n=18,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
    for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
      const i=(x+1)+n*((y+1)+n*(z+1));densities[i]=(y-1)*.5;materials[i]=densities[i]<0?1:0;
    }
    const terrain=meshSurfaceNets({size,densities,materials,spacing:.5}),rows=[];
    for(const spacing of [.25,.5])for(const type of ['terrain','cuboid','convex-terrain-control']){
      const physics=new LabPhysics(R);
      try{
        const floor=type==='cuboid'?physics.world.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0)):
          physics.commit('terrain',physics.prepare([0,0,0],8,terrain,1));
        const body=physics.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(4,0,4).setCcdEnabled(true).setLinearDamping(.5).setAngularDamping(.5));
        const colliders=type==='convex-terrain-control'?planRockColliders(fixture.mesh,fixture.record.localCOM).map(p=>physics.world.createCollider(R.ColliderDesc.convexHull(p).setDensity(.6),body)):
          [physics.world.createCollider(createVoxelDescriptor(R,planVoxelCollider(fixture.sample,spacing)).setDensity(.6),body)];
        for(let i=0;i<240;i++)physics.world.step();
        const p=body.translation(),q=body.rotation(),pose={position:[p.x,p.y,p.z],rotation:{...q}};
        let lowestVisible=Infinity,contacts=0;
        for(let i=0;i<fixture.mesh.positions.length;i+=3)lowestVisible=Math.min(lowestVisible,actorToWorldPoint(pose,Array.from(fixture.mesh.positions.slice(i,i+3)))[1]);
        for(const c of colliders)physics.world.contactPair(c,floor,m=>{contacts+=m.numContacts();});
        rows.push({spacing,type,lowestVisible,contacts,pose,sleeping:body.isSleeping(),speed:Math.hypot(...Object.values(body.linvel()))});
      }finally{physics.dispose();}
    }
    return {version:R.version(),rows};
  });
  assert.equal(dynamics.version,'0.20.0');
  for(const row of dynamics.rows){
    if(row.type==='terrain'){assert.ok(row.lowestVisible<-10);assert.equal(row.contacts,0);}
    else{assert.ok(row.lowestVisible>-.2&&row.lowestVisible<.7);assert.ok(row.contacts>0);}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(`${out}/receipt.json`,JSON.stringify({timestamp:new Date().toISOString(),base,browser:'Edge headless / SwiftShader',views,allFixtureInspector,viewport,dynamics,errors,external,pass:true},(_,v)=>v===Infinity?'Infinity':v,2));
}finally{await browser.close();}
console.log(JSON.stringify({views:views.length,errors,external,pass:true}));
