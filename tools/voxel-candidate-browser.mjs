import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:false}),page=await browser.newPage();
try{
 await page.goto('http://localhost:8090/lab/voxel/index.html?baseline=1');await page.waitForFunction(()=>window.__voxelLab?.ready);
 const result=await page.evaluate(async()=>{
  const {meshGreedy}=await import('./js-mesher.js'),{generatePadded}=await import('./generator.js'),{createBlockMeshCandidate}=await import('./candidates/block-mesh-wasm-adapter.js'),{createVoxelizeCandidate}=await import('./candidates/voxelize-wasm-adapter.js');
  const candidates=[['js-greedy',{mesh:meshGreedy}],['block-mesh',await createBlockMeshCandidate()],['voxelize',await createVoxelizeCandidate()]],runs=[];
  const measure=g=>{let area=0,degenerate=0;for(let i=0;i<g.indices.length;i+=3){const a=g.indices[i]*3,b=g.indices[i+1]*3,c=g.indices[i+2]*3,u=[0,1,2].map(k=>g.positions[b+k]-g.positions[a+k]),v=[0,1,2].map(k=>g.positions[c+k]-g.positions[a+k]),s=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;area+=s;if(s<1e-10)degenerate++;}return {vertices:g.positions.length/3,triangles:g.indices.length/3,area,degenerate,bytes:[g.positions,g.normals,g.colors,g.indices].reduce((s,a)=>s+a.byteLength,0)};};
  for(const size of [16,32])for(const [name,candidate]of candidates){const n=size+2,one=new Uint8Array(n**3);one[1+n*(1+n)]=1;const oracle=measure(candidate.mesh({size,voxels:one}));const input={size,voxels:generatePadded(size,[0,0,0],9212026,{})},times=[];let geometry;
   for(let i=0;i<30;i++){const start=performance.now();geometry=candidate.mesh(input);const elapsed=performance.now()-start;if(i>=5)times.push(elapsed);}times.sort((a,b)=>a-b);runs.push({name,size,oracle,geometry:measure(geometry),medianMs:times[12],p95Ms:times[23],samples:times});
  }
  return {timestamp:new Date().toISOString(),userAgent:navigator.userAgent,method:'Same generated padded input per chunk size. Five warmups, 25 samples; full adapter mesh including input/output conversion and geometry buffers. One-solid-voxel area oracle should be six square metres, 12 nondegenerate triangles. Different AO/merging policies prevent an equivalent-output speed ranking.',runs};
 });await fs.writeFile('docs/evidence/voxel-phase0/candidate-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.runs.map(({samples,...r})=>r)));
}finally{await browser.close();}
