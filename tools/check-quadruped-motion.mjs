// Measure the exported skin, rather than trusting Blender controls or targets.
// MODEL_URL and PROFILE_PATH (motion-provenance.json) select a local candidate.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const profile = JSON.parse(await readFile(process.env.PROFILE_PATH, 'utf8'));
const model = process.env.MODEL_URL;
if (!model?.startsWith('/') || !process.env.OUTPUT_PATH) throw new Error('Local MODEL_URL and OUTPUT_PATH required');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  const report = await page.evaluate(async ({ model, profile }) => {
    const T = await import('/vendor/three.module.js');
    const { GLTFLoader } = await import('/vendor/addons/GLTFLoader.js');
    const bytes = await fetch(model).then(r => r.arrayBuffer());
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
    if (sha256 !== profile.output_sha256) throw new Error('Contact profile does not describe these exact exported model bytes');
    const gltf = await new GLTFLoader().parseAsync(bytes, model.slice(0, model.lastIndexOf('/') + 1));
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    let mesh; scene.traverse(n => { if (n.isSkinnedMesh) mesh = n; });
    const pawNames = ['rear_paw.R', 'front_paw.R', 'rear_paw.L', 'front_paw.L'];
    const findBone = name => scene.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
    const paws = Object.fromEntries(pawNames.map(name => [name, findBone(name)]));
    if (Object.values(paws).some(b => !b?.isBone)) throw new Error('Required paw bone missing');
    const root = findBone('root');
    const position = mesh.geometry.attributes.position;
    const skinIndex = mesh.geometry.attributes.skinIndex;
    const skinWeight = mesh.geometry.attributes.skinWeight;
    const vertexWorld = index => mesh.applyBoneTransform(index, new T.Vector3().fromBufferAttribute(position, index)).applyMatrix4(mesh.matrixWorld);
    mesh.skeleton.update();
    const soleVertices = {};
    for (const [name, bone] of Object.entries(paws)) {
      const joint = mesh.skeleton.bones.indexOf(bone);
      const candidates = [];
      for (let i = 0; i < position.count; i++) {
        let weight = 0;
        for (let k = 0; k < 4; k++) if (skinIndex.getComponent(i, k) === joint) weight += skinWeight.getComponent(i, k);
        if (weight > .5) candidates.push({ i, p: vertexWorld(i) });
      }
      candidates.sort((a, b) => a.p.y - b.p.y);
      soleVertices[name] = candidates.slice(0, Math.max(3, Math.ceil(candidates.length * .10))).map(v => v.i);
      if (!soleVertices[name].length) throw new Error(`No dominant sole vertices: ${name}`);
    }
    const mixer = new T.AnimationMixer(scene);
    const result = { sha256, model, clips: {}, soleVertexCounts: Object.fromEntries(Object.entries(soleVertices).map(([k,v]) => [k,v.length])) };
    for (const clipName of ['Walk', 'Run']) {
      const clip = gltf.animations.find(a => a.name === clipName);
      const settings = profile.clips[clipName].settings;
      if (!clip || Math.abs(clip.duration - settings.seconds) > .0001) throw new Error(`Unexpected ${clipName} duration`);
      mixer.stopAllAction();
      const action = mixer.clipAction(clip).reset().setLoop(T.LoopOnce, 1).play();
      action.clampWhenFinished = true;
      const frames = 120;
      const data = { duration: clip.duration, maxBoneSlipStep: 0, maxSoleSlipStep: 0, paws: {}, samples: [] };
      const previous = {};
      for (let i = 0; i <= frames; i++) {
        const phase = i / frames, time = clip.duration * phase;
        mixer.setTime(time); scene.updateMatrixWorld(true); mesh.skeleton.update();
        const sample = { phase, time, root: root.getWorldPosition(new T.Vector3()).toArray(), paws: {} };
        for (const [index, name] of pawNames.entries()) {
          const bonePosition = paws[name].getWorldPosition(new T.Vector3());
          const sole = new T.Vector3();
          const points = soleVertices[name].map(vertexWorld);
          for (const p of points) sole.add(p);
          sole.divideScalar(points.length);
          const q = (phase - settings.phase[index] + 1) % 1;
          const stance = q < settings.duty;
          const entry = { q, stance, bone: bonePosition.toArray(), sole: sole.toArray(), minY: Math.min(...points.map(p => p.y)) };
          const prior = previous[name];
          if (stance) {
            const foot = data.paws[name] ??= { soleMinY: Infinity, soleMaxY: -Infinity, minHeight: Infinity, maxHeight: -Infinity };
            foot.soleMinY = Math.min(foot.soleMinY, entry.minY); foot.soleMaxY = Math.max(foot.soleMaxY, entry.minY);
            foot.minHeight = Math.min(foot.minHeight, sole.y); foot.maxHeight = Math.max(foot.maxHeight, sole.y);
          }
          if (prior?.stance && stance && q > prior.q) {
            const travel = new T.Vector3(0, 0, settings.speed * clip.duration / frames);
            data.maxBoneSlipStep = Math.max(data.maxBoneSlipStep, bonePosition.clone().sub(new T.Vector3(...prior.bone)).add(travel).length());
            data.maxSoleSlipStep = Math.max(data.maxSoleSlipStep, sole.clone().sub(new T.Vector3(...prior.sole)).add(travel).length());
          }
          previous[name] = entry; sample.paws[name] = entry;
        }
        data.samples.push(sample);
      }
      data.rootLongitudinalRange = Math.max(...data.samples.map(s => s.root[2])) - Math.min(...data.samples.map(s => s.root[2]));
      data.loopPawDelta = Math.max(...pawNames.map(name => new T.Vector3(...data.samples[0].paws[name].bone).distanceTo(new T.Vector3(...data.samples.at(-1).paws[name].bone))));
      // Small interpolation error is expected between baked samples. Surface
      // proof catches bad skin weights even when the bone targets are exact.
      data.pass = data.maxBoneSlipStep < .008 && data.maxSoleSlipStep < .015 && data.rootLongitudinalRange < .0001 && data.loopPawDelta < .0001 && Object.values(data.paws).every(p => p.soleMinY > -.035 && p.soleMaxY < .05 && p.maxHeight - p.minHeight < .035);
      result.clips[clipName] = data;
    }
    result.pass = Object.values(result.clips).every(c => c.pass);
    result.note = 'Exported skin measurements, not visual or physical-phone acceptance. Review uninterrupted translated motion independently.';
    return result;
  }, { model, profile });
  await writeFile(process.env.OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ sha256: report.sha256, pass: report.pass, clips: Object.fromEntries(Object.entries(report.clips).map(([k,{samples,...v}]) => [k,v])) }, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally { await browser.close(); }
