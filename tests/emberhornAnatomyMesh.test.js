import test from 'node:test';
import assert from 'node:assert/strict';
import { createWildkinMeshVisual } from '../src/world/wildkinMeshKit.js';

function closedIndexedMeshAudit(mesh) {
  const geometry=mesh.geometry, position=geometry.getAttribute('position'), index=geometry.getIndex();
  assert.ok(position && index, `${mesh.name} is indexed`);
  const edges=new Map(); let volume=0;
  for(let i=0;i<index.count;i+=3){
    const tri=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}
    const a=tri[0]*3,b=tri[1]*3,c=tri[2]*3;
    const ax=position.array[a],ay=position.array[a+1],az=position.array[a+2],bx=position.array[b],by=position.array[b+1],bz=position.array[b+2],cx=position.array[c],cy=position.array[c+1],cz=position.array[c+2];
    volume+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
  }
  assert.ok(Number.isFinite(volume) && volume>1e-5,`${mesh.name} has positive finite volume`);
  assert.ok([...edges.values()].every(count=>count===2),`${mesh.name} is closed with two-face indexed edges`);
}

test('Emberhorn final R3 mane candidate uses four closed volumetric legs and fifteen closed mane wedges',()=>{
  const model=createWildkinMeshVisual('asset_wildkin_emberhorn');
  const legs=model.children.filter(part=>part.name==='heavy_leg'), mane=model.children.filter(part=>part.name==='layered_mane');
  assert.equal(legs.length,4); assert.equal(mane.length,15);
  for(const leg of legs){closedIndexedMeshAudit(leg);leg.geometry.computeBoundingBox();assert.ok(leg.geometry.boundingBox.max.z-leg.geometry.boundingBox.min.z>=.30,'leg has side-view depth');}
  for(const wedge of mane){closedIndexedMeshAudit(wedge);wedge.geometry.computeBoundingBox();assert.ok(wedge.geometry.boundingBox.max.z-wedge.geometry.boundingBox.min.z>=.36-.00001,'mane is a 0.36m deep tapered wedge');}
  assert.equal(model.children.filter(part=>part.name==='asymmetric_horn').length,2,'paired horn identity remains');
  assert.equal(model.children.filter(part=>part.name==='dark_hoof').length,4,'existing planted hoof count remains');
});
