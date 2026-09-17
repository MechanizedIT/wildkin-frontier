// Documentation-only diagrams. Exact X/Z projection; proposed routes are not walk proofs.
import fs from 'node:fs';
const out='art/targets/rootbound-wildwood';
const X=x=>80+(x+525)*4, Y=z=>140+(750-z)*4;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=17,color='#dce7d3')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const path=(pts,color,width=3,dash='')=>`<polyline points="${pts.map(([x,z])=>`${X(x)},${Y(z)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const rect=(a,b,c,d,color,opacity=.2)=>`<rect x="${X(a)}" y="${Y(d)}" width="${(b-a)*4}" height="${(d-c)*4}" fill="${color}" opacity="${opacity}" stroke="${color}"/>`;
const circle=(x,z,r,color)=>`<circle cx="${X(x)}" cy="${Y(z)}" r="${r}" fill="${color}"/>`;
const start=(title,subtitle)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080" viewBox="0 0 1440 1080"><defs><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="#8fa6aa" opacity=".35"/></pattern></defs><rect width="1440" height="1080" fill="#101e1b"/><g font-family="Arial,sans-serif">${text(50,55,title,32)}${text(50,88,subtitle,16,'#a9bfae')}`;
let s=start('ROOTBOUND WILDWOOD / SPATIAL PLAN V2','Proposed five-room composition • exact world X/Z grid • design direction, not a terrain or traversal certification');
s+=rect(-525,-325,550,750,'#72916d',.1);
for(let x=-525;x<=-325;x+=25){s+=path([[x,550],[x,750]],'#355044',1);s+=text(X(x)-18,970,x,13);}
for(let z=550;z<=750;z+=25){s+=path([[-525,z],[-325,z]],'#355044',1);s+=text(30,Y(z)+5,z,13);}
const zones=[
 ['01 ORIENTATION MEADOW',-500,-455,570,615,'#c3d579',-495,585],
 ['02 ROOT GALLERIES',-500,-455,615,705,'#c28c53',-500,645],
 ['03 LANTERN GROVE',-465,-430,660,690,'#a18bd0',-455,663],
 ['04 THORNSTONE VERGE',-430,-405,675,710,'#9eadb3',-426,695],
 ['05 HEARTROOT CROWN',-485,-450,705,735,'#dca574',-497,740],
 ];
for(const [name,a,b,c,d,col,lx,lz] of zones){s+=rect(a,b,c,d,col,.23);s+=text(X(lx),Y(lz),name,14,col);}
// Current preservation plates: algorithm footprint, not an immutable design lock.
for(const [a,b,c,d] of [[-400,-350,650,700],[-450,-400,700,750],[-500,-450,700,750]])s+=`<rect x="${X(a)}" y="${Y(d)}" width="${(b-a)*4}" height="${(d-c)*4}" fill="url(#hatch)" stroke="#718d91" stroke-dasharray="4 4"/>`;
const src=fs.readFileSync('src/world/frontierRootbound.js','utf8');
const life=JSON.parse('['+src.split('const PROTECTED_LIFE_POINTS = Object.freeze([')[1].split(']);')[0].trim().replace(/,$/,'')+']');
for(const [x,z]of life)s+=circle(x,z,3,'#a9c9cd');
const loop=[[-475,590],[-478,613],[-480,643],[-472,663],[-449,675],[-452,696],[-480,720],[-493,701],[-495,673],[-494,646],[-492,615],[-475,590]];
s+=path(loop,'#ecd882',5,'10 6');
s+=path([[-449,675],[-427,680],[-415,694],[-430,711],[-452,696]],'#d6a877',4,'3 6');
for(const [x,z] of [[-480,643],[-452,696],[-493,701],[-492,615]])s+=circle(x,z,4,'#ecd882');
s+=path([[-478,719],[-474,716],[-470,714]],'#8be2d1',5);
s+=path([[-472,721],[-468,718],[-465,715]],'#8be2d1',5);
s+=path([[-440,682],[-436,684],[-433,686]],'#8be2d1',5);
s+=`<ellipse cx="${X(-445)}" cy="${Y(678)}" rx="80" ry="64" fill="none" stroke="#8be2d1" stroke-width="2"/><ellipse cx="${X(-447)}" cy="${Y(679)}" rx="48" ry="40" fill="none" stroke="#c1d8df" stroke-dasharray="4 4"/>`;
s+=circle(-468,717,6,'#8be2d1');
const captures=JSON.parse(fs.readFileSync('art/reviews/rootbound-wildwood/restart-r2-captures.json')).views.filter(v=>v.name!=='overhead');
for(const v of captures){const {x,z,yaw}=v.requested; const dx=-Math.sin(yaw),dz=-Math.cos(yaw);s+=circle(x,z,6,'#fff');s+=path([[x,z],[x+dx*16,z+dz*16]],'#fff',2);s+=text(X(x)-24,Y(z)+25,{arrival:'A',gallery:'B',destination:'C'}[v.name],17,'#fff');}
s+=text(595,535,'Retained eastern woodland',19,'#afc8b8')+text(595,562,'Ecology / home context',15)+text(595,585,'No new subhabitat here',15);
s+=path([[-515,560],[-490,560]],'#eee8d0',4)+text(X(-515),Y(560)-13,'25 m',15);
s+=text(710,1010,'+X east →',16)+text(80,119,'+Z up (diagram convention)',14);
const notes=[
 ['READ THE PLAN',24,'#d9e8c2'],
 ['Tinted zones = proposed identity envelopes.',16],
 ['Edges blend; they are not collision walls.',16],
 ['',12],
 ['GOLD DASH / PRIMARY CIRCUIT',18,'#ecd882'],
 ['A → Galleries → C → B → west return → A.',16],
 ['~298 m centerline; geometry unvalidated.',16],
 ['3–5 min is a gameplay target, not a result.',16],
 ['Copper dots: optional mineral-side branch.',16],
 ['',12],
 ['CYAN / CURRENT SOURCE',18,'#8be2d1'],
 ['Short ridges, hollow extent and Crown point.',16],
 ['Small dots: current life-preservation points.',16],
 ['Hatch: current stable-plate algorithm areas.',16],
 ['These do not prove rendered heights.',16],
 ['',12],
 ['WHITE / RECORDED CAMERAS',18],
 ['A  Arrival (-475,590), yaw -1.743',16],
 ['B  Gallery (-480,720), yaw -1.36',16],
 ['C  Destination (-449,675), yaw -2.3',16],
 ['Lines show horizontal look direction.',16],
 ['B lies at the proposed Crown threshold.',16],
 ['',12],
 ['REVIEW BEFORE IMPLEMENTATION',18,'#e6bb8c'],
 ['Verge moves east of Grove in this proposal.',16],
 ['Current thorn feature overlaps the hollow.',16],
 ['Check all route segments on final triangles,',16],
 ['player footprint, homes, resources, assets,',16],
 ['camera clearance, streaming and reload.',16],
 ['The distant earned grove is not Crown.',16],
 ];let yy=155;for(const [t,size,col]of notes){s+=text(930,yy,t,size,col);yy+=27;}
s+=text(50,1050,'Source: frontierRootbound.js + restart-r2-captures.json. No proposed route, resource relocation or landmark asset is admitted by this map.',14,'#a3b8ab');
s+='</g></svg>';fs.writeFileSync(`${out}/layout-target-v2.svg`,s);
const lengths=loop.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-loop[i][0],p[1]-loop[i][1]),0);
console.log(JSON.stringify({output:`${out}/layout-target-v2.svg`,lifePoints:life.length,proposedCenterlineMetres:lengths}));
