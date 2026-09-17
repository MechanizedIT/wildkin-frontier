import fs from 'node:fs';const p='art/reviews/skybreak-tablelands/rotation-1/final-journey.json',j=JSON.parse(fs.readFileSync(p));
const inventory=p=>Object.fromEntries(p.map(r=>[r.type??r.itemId??r.id,r.count??r.quantity]));
const find=(leg,start=0)=>j.trace.findIndex((r,i)=>i>=start&&Math.hypot(r.x-leg.pos.x,r.z-leg.pos.z)<1e-6);
const from=find(j.legs[3]),to=find(j.legs[15],from+1),trace=j.trace.slice(from,to+1);let distance=0;for(let i=1;i<trace.length;i++)distance+=Math.hypot(trace[i].x-trace[i-1].x,trace[i].z-trace[i-1].z);
const summary={complete:j.legs.every(l=>l.reached)&&!j.failure,wholeSeconds:j.seconds,wholeDistance:j.distance,localCircuit:{from:j.legs[3].name,to:j.legs[15].name,seconds:(trace.at(-1).t-trace[0].t)/1000,distance,traceStart:from,traceEnd:to},interactions:j.interactions.map(i=>({name:i.name,before:i.before.pack,eligible:i.eligible,after:i.after.pack})),reload:j.reload,health:j.finish.health,detours:j.legs.reduce((s,l)=>s+l.detours,0),errors:j.errors};
fs.writeFileSync('art/reviews/skybreak-tablelands/rotation-1/journey-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
