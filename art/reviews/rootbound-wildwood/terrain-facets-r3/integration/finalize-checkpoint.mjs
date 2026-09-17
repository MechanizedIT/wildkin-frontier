import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='art/reviews/rootbound-wildwood/terrain-facets-r3/integration/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const frozen=read(dir+'source-hashes.json');
for(const item of frozen)assert.equal(hash(item.Path),item.Hash.toLowerCase());
function trace(name){const r=read(dir+name),t=r.trace;let distance=0;for(let i=1;i<t.length;i++)distance+=Math.hypot(t[i].pos.x-t[i-1].pos.x,t[i].pos.z-t[i-1].pos.z);return {file:name,input:r.input,key:r.key,samples:t.length,seconds:t.at(-1).ms/1000,distanceM:distance,allGrounded:t.every(x=>x.grounded),start:t[0].pos,end:t.at(-1).pos,renderFrames:t.at(-1).frame-t[0].frame}}
const developer=read(dir+'native-matching-pose.json'),packaged=read(dir+'packaged-pose.json');
assert.deepEqual(developer.player,packaged.player);assert.equal(developer.height,packaged.height);assert.deepEqual(developer.camera,packaged.camera);
for(const file of ['npm-test.log','npm-verify.log']){const log=fs.readFileSync(dir+file,'utf8');assert.match(log,/# pass 1434/);assert.match(log,/# fail 0/)}
const zip='dist/submission.zip',entry='dist/submission/index.html';
const report={schema:'rootbound-facets-r3-checkpoint-v1',date:new Date().toISOString(),baseCommit:'ecaf94f',scope:'One retained Rootbound Lantern-threshold floor treatment; default world only',bounds:{x:[-458,-436],z:[666,688]},chunks:['-10,13','-9,13'],sourceHashes:frozen,developer:{pose:'native-matching-pose.json',forward:trace('native-forward.json'),back:trace('native-back.json'),settle:read(dir+'native-settle.json').player},packaged:{entry,sha256:hash(entry),pose:'packaged-pose.json',matchesDeveloper:true,forward:trace('packaged-forward.json')},support:'support-proof.json',validation:{npmTest:1434,npmVerify:'PASS',npmZip:'PASS',zipBytes:fs.statSync(zip).size,zipSHA256:hash(zip)},limitations:['Protected Scout timed keyboard event fixture, not physical-phone input or whole-outing/persistence proof','Pre-existing unlocated MutationObserver errors retained; render and movement continued','Ground improvement is subtle and localized; larger habitat composition remains unfinished'],unrelatedPathsExcluded:['tests/verdantUplands.test.js','tools/compose-verdant-cliffs.mjs','tools/compose-verdant-uplands.mjs']};
fs.writeFileSync(dir+'checkpoint.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({developerForward:report.developer.forward,developerBack:report.developer.back,packagedMatch:true,validation:report.validation},null,2));
