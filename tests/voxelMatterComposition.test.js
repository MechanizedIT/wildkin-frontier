import test from 'node:test';
import assert from 'node:assert/strict';
import { composeMatterSample, resolveMatterSources, SOURCE_PRECEDENCE } from '../lab/voxel/matter-composition.js';
import { makeMixedMatterSamples, makeBuriedMixedMatterSamples } from '../lab/voxel/matter-fixtures.js';
import { meshMatterSamples, crispMatterSeams } from '../lab/voxel/matter-mesh.js';

test('source composition is explicit, deterministic, order independent, and exclusive',()=>{
  const sources=[{density:-.4,material:2,precedence:SOURCE_PRECEDENCE.DIRT},{density:-.2,material:1,precedence:SOURCE_PRECEDENCE.ROCK}],
    a=resolveMatterSources(sources),b=resolveMatterSources([...sources].reverse());
  assert.deepEqual(a,{density:-.2,material:1});assert.deepEqual(b,a);
  const sameTypeA=resolveMatterSources([{density:-.3,material:1,precedence:20},{density:-.7,material:1,precedence:20}]),
    sameTypeB=resolveMatterSources([{density:-.7,material:1,precedence:20},{density:-.3,material:1,precedence:20}]);
  assert.deepEqual(sameTypeA,{density:-.7,material:1});assert.deepEqual(sameTypeB,sameTypeA);
  assert.deepEqual(resolveMatterSources([{density:-1,material:2,precedence:10},{density:1,material:1,precedence:20}]),{density:-1,material:2});
  assert.deepEqual(composeMatterSample([0,0,0],[{sample:()=>-.4,material:2,precedence:10},{sample:()=>-.2,material:1,precedence:20}]),a);
  const samples=makeMixedMatterSamples();assert.equal(samples.densities.length,13**3);
  assert.ok(samples.densities.every((d,i)=>(d<0)===(samples.materials[i]!==0)));
  assert.ok(samples.materials.includes(1)&&samples.materials.includes(2));
});

test('buried rock is revealed progressively by dirt-only edits on one meshed surface',()=>{
  const source=makeBuriedMixedMatterSamples(),first={...source,densities:source.densities.slice(),materials:source.materials.slice()};
  const dig=(samples,center,radii)=>{let removed=0;for(let i=0;i<samples.densities.length;i++){
    if(samples.densities[i]>=0||samples.materials[i]!==2)continue;const p=samples.position(i),q=p.map((v,j)=>(v-center[j])/radii[j]);
    if(q.reduce((sum,v)=>sum+v*v,0)<=1){samples.densities[i]=1;samples.materials[i]=0;removed++;}
  }return removed;};
  assert.ok(source.materials.includes(1));assert.ok(source.materials.includes(2));
  const initial=meshMatterSamples(source);assert.ok(initial.indices.length>0);
  const firstDirt=first.materials.slice();assert.ok(dig(first,[0,4.1,0],[.8,.8,.85])>0);
  for(let i=0;i<first.densities.length;i++)if(firstDirt[i]===1)assert.equal(first.materials[i],1,'first dirt scoop preserves rock');
  const firstMesh=meshMatterSamples(first),firstRockVertices=firstMesh.materialIds.filter(id=>id===1).length;
  assert.ok(firstRockVertices>0,'first scoop exposes a stone patch');
  assert.ok(dig(first,[1,3.6,0],[1.2,.9,1.1])>0);
  const secondMesh=meshMatterSamples(first),secondRockVertices=secondMesh.materialIds.filter(id=>id===1).length;
  assert.ok(secondRockVertices>firstRockVertices,'the next dirt scoop exposes a larger stone face');
  assert.ok(first.densities.every((d,i)=>(d<0)===(first.materials[i]!==0)),'resolved samples have one material owner');
});

test('rejected triangle-majority seam keeps shared geometry but is retained as sawtooth comparison evidence',()=>{
  const samples=makeMixedMatterSamples(),base=meshMatterSamples(samples),crisp=crispMatterSeams(base),repeat=crispMatterSeams(meshMatterSamples(makeMixedMatterSamples()));
  assert.equal(crisp.indices.length,base.indices.length);assert.equal(crisp.triangleCount,base.indices.length/3);
  assert.deepEqual(crisp.positions,repeat.positions);assert.deepEqual(crisp.indices,repeat.indices);assert.deepEqual(crisp.colors,repeat.colors);
  const triangleKey=(mesh,indices)=>{const keys=[];for(let i=0;i<indices.length;i+=3)keys.push([0,1,2].map(j=>{
    const p=indices[i+j]*3;return [mesh.positions[p],mesh.positions[p+1],mesh.positions[p+2]].join(',');}).sort().join('|'));return keys.sort();};
  assert.deepEqual(triangleKey(crisp,crisp.indices),triangleKey(base,base.indices),'all triangles occupy the exact original surface');
  for(let i=0;i<crisp.indices.length;i+=3){const ids=[0,1,2].map(j=>crisp.materialIds[crisp.indices[i+j]]);assert.equal(new Set(ids).size,1,'each triangle is one material color');}
  assert.ok(crisp.renderVertexCount>=crisp.sourceVertexCount);
});

test('thresholded material weights are deterministic and cross triangle interiors on shared geometry',()=>{
  const first=meshMatterSamples(makeMixedMatterSamples()),repeat=meshMatterSamples(makeMixedMatterSamples());
  assert.deepEqual(first.positions,repeat.positions);assert.deepEqual(first.indices,repeat.indices);assert.deepEqual(first.rockWeights,repeat.rockWeights);
  assert.equal(first.rockWeights.length,first.positions.length/3);assert.ok(first.rockWeights.every(weight=>weight>=0&&weight<=1));
  let interiorCrossings=0;for(let i=0;i<first.indices.length;i+=3){const weights=[0,1,2].map(j=>first.rockWeights[first.indices[i+j]]);
    if(Math.min(...weights)<.5&&Math.max(...weights)>.5)interiorCrossings++;}
  assert.ok(interiorCrossings>0,'the 0.5 threshold traverses triangles instead of snapping to whole faces');
  const crisp=crispMatterSeams(first);assert.equal(crisp.triangleCount,first.indices.length/3);
  assert.deepEqual(crisp.positions,crispMatterSeams(repeat).positions,'negative comparison remains deterministic');
});
