// Analytical translation of independently exported mesh samples; not a native movement trace.
import fs from 'node:fs';
const source = new URL('../../source/trailgloam-v1/rig-prep-r1/fitted-r1a/roundtrip-receipt.json', import.meta.url);
const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
const samples = raw.samples.filter(sample => sample.clip === 'WalkDiagnostic' && sample.phase < 1);
const speed = .14 / (.6 * 1.1), feet = {};
for (const key of Object.keys(samples[0].feet)) {
  let current = [], windows = [];
  const finish = () => {
    if (!current.length) return;
    const forward = current.map(sample => sample.forward);
    windows.push({ samples: current.length, startSeconds: current[0].seconds,
      endSeconds: current.at(-1).seconds, driftM: Math.max(...forward) - Math.min(...forward),
      maxAbsSoleM: Math.max(...current.map(sample => sample.height)) });
    current = [];
  };
  for (let cycle = 0; cycle < 2; cycle++) for (const sample of samples) {
    const foot = sample.feet[key], seconds = (cycle + sample.phase) * 1.1;
    if (!foot.stance) { finish(); continue; }
    current.push({ seconds, forward: -foot.center[1] + speed * seconds,
      height: Math.max(Math.abs(foot.minZ), Math.abs(foot.maxZ)) });
  }
  finish(); feet[key] = { windows };
}
const result = { glbSHA256: raw.glbSHA256, source: source.pathname, twoCycles: true,
  speedMps: speed, feet, maxStanceDriftM: Math.max(...Object.values(feet).flatMap(foot => foot.windows.map(window => window.driftM))) };
console.log(JSON.stringify(result, null, 2));
