import test from 'node:test';
import assert from 'node:assert/strict';
import { rockDomain, nearestRockSite, oracleRockSite, fractureCellDistance, cutRockSamples, makeRockSamples } from '../lab/voxel/fracture-field.js';

test('rock site identity is stable across query order, negative bins, and a wider oracle', () => {
  for (const seed of [1, 19, 9212026, 0x7fffffff]) {
    const domain = rockDomain(seed);
    const points = [];
    for (let z = -5; z <= 5; z += 2) for (let y = -5; y <= 5; y += 2) for (let x = -5; x <= 5; x += 2)
      points.push([x * .53 + .17, y * .49 - .21, z * .57 + .09]);
    const forward = points.map(p => nearestRockSite(domain, p).id);
    assert.deepEqual([...points].reverse().map(p => nearestRockSite(domain, p).id).reverse(), forward);
    for (const p of points) assert.equal(nearestRockSite(domain, p).id, oracleRockSite(domain, p).id, `${seed}: ${p}`);
    assert.ok(forward.some(id => id.includes(',-')));
  }
});

test('full integer-bin IDs cannot alias from equal hash entropy', () => {
  const d = rockDomain(19);
  assert.notEqual(nearestRockSite(d, [-10, -10, -10]).id, nearestRockSite(d, [10, 10, 10]).id);
});

test('rock profile has approximately isotropic interior chord lengths over four seeds',()=>{
  const sums=[0,0,0],seeds=[1,19,9212026,0x7fffffff];let cells=0;
  for(const seed of seeds){const domain=rockDomain(seed),representatives=new Map();
    for(let z=-4.5;z<=5.5;z+=1.25)for(let y=-4.5;y<=5.5;y+=1.25)for(let x=-4.5;x<=5.5;x+=1.25){
      const p=[x,y,z],id=nearestRockSite(domain,p).id;if(!representatives.has(id))representatives.set(id,p);
    }
    const points=[...representatives.values()].slice(0,64);assert.equal(points.length,64);
    for(const p of points)for(let axis=0;axis<3;axis++){
      const id=nearestRockSite(domain,p).id;let span=0;
      for(const sign of [-1,1])for(let step=1;step<=24;step++){
        const q=[...p];q[axis]+=sign*step*.125;if(nearestRockSite(domain,q).id!==id)break;span+=.125;
      }
      sums[axis]+=span;
    }
    cells+=points.length;
  }
  const means=sums.map(v=>v/cells),ratio=Math.max(...means)/Math.min(...means);
  assert.equal(cells,256);assert.ok(ratio<=1.25,`rock directional mean chords ${means}, ratio ${ratio}`);
});

test('selected cell mask is an implicit irregular boundary and cuts only its occupied patch', () => {
  const domain = rockDomain(9212026);
  const sample = makeRockSamples();
  const before = new Float32Array(sample.densities);
  const result = cutRockSamples(sample, domain, [1.55, 0, 0]);
  assert.ok(result.changed > 3, 'visible cut needs several changed scalar samples');
  assert.ok(result.changed < 90, 'cut must stay local');
  assert.ok(Number.isFinite(fractureCellDistance(domain, result.id, [1, 0, 0])));
  assert.ok(sample.densities.some((v, i) => v > before[i]));
  const remote = makeRockSamples({ centers: [[0, 0, 0], [0, 0, 5]] });
  const remoteBefore = new Float32Array(remote.densities);
  cutRockSamples(remote, domain, [1.55, 0, 0]);
  for (let i = 0; i < remote.densities.length; i++) {
    const p = remote.position(i);
    if (p[2] > 3) assert.equal(remote.densities[i], remoteBefore[i], `remote sample ${p}`);
  }
});
