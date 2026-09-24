import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import { makeMixedMatterSamples } from '../lab/voxel/matter-fixtures.js';
import { meshMatterSamples, crispMatterSeams } from '../lab/voxel/matter-mesh.js';

const times={composeMs:[],meshMs:[],seamClassificationMs:[]};let last,base,crisp;
for(let i=0;i<31;i++){
  let start=performance.now();last=makeMixedMatterSamples();times.composeMs.push(performance.now()-start);
  start=performance.now();base=meshMatterSamples(last);times.meshMs.push(performance.now()-start);
  start=performance.now();crisp=crispMatterSeams(base);times.seamClassificationMs.push(performance.now()-start);
}
const median=a=>a.slice(1).sort((x,y)=>x-y)[Math.floor((a.length-1)/2)],resolvedBytes=last.densities.byteLength+last.materials.byteLength,
  sourceBytes=2*last.densities.byteLength+last.materials.byteLength,report={runs:30,fixtureSamples:last.densities.length,median: {
    composeMs:median(times.composeMs),meshMs:median(times.meshMs),seamClassificationMs:median(times.seamClassificationMs)},
  control:{vertices:base.positions.length/3,triangles:base.indices.length/3},crisp:{vertices:crisp.positions.length/3,triangles:crisp.indices.length/3},
  extraRenderVertices:crisp.positions.length/3-base.positions.length/3,resolvedTypedArrayBytes:resolvedBytes,
  retainingBothSourceDensityArraysBytes:sourceBytes,additionalBytesIfSourceArraysWereRetained:sourceBytes-resolvedBytes,
  note:'Node timings are bounded headless fixture observations; source arrays are generated transiently and are not retained in runtime state.'};
await fs.mkdir('docs/evidence/voxel-phase05c1/source',{recursive:true});await fs.writeFile('docs/evidence/voxel-phase05c1/source/benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
