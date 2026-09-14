const $=id=>document.getElementById(id),stage=$('stage'),map=$('mapCanvas'),ctx=map.getContext('2d'),readout=$('readout');
let mode='terrain',scale=1,panX=0,panY=0,drag=null;

const data=await(await fetch('survey.json')).json();
const heights=new Float32Array(await(await fetch('height.f32')).arrayBuffer());
const habitat=new Uint8Array(await(await fetch('habitat.u8')).arrayBuffer());
const photo=new Image();photo.src='terrain-colors.png';await photo.decode();
const n=data.n,b=data.bounds,extent=b.maxX-b.minX;
const terrain=document.createElement('canvas');terrain.width=terrain.height=n;const tc=terrain.getContext('2d');tc.drawImage(photo,0,0);
const pixels=tc.getImageData(0,0,n,n),raw=new Uint8ClampedArray(pixels.data);
const allocation=document.createElement('canvas');allocation.width=allocation.height=n;const ac=allocation.getContext('2d'),ap=ac.createImageData(n,n);
for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  const k=z*n+x,h=habitat[k],i=k*4;
  const dx=(heights[z*n+Math.min(n-1,x+1)]-heights[z*n+Math.max(0,x-1)])/20;
  const dz=(heights[Math.min(n-1,z+1)*n+x]-heights[Math.max(0,z-1)*n+x])/20;
  const shade=h?Math.max(.52,Math.min(1.3,.95+(-dx-dz)*.72)):1;
  const c=h?data.regions[h-1].diagnosticColorRGB:null;
  for(let j=0;j<3;j++){pixels.data[i+j]=raw[i+j]*shade;ap.data[i+j]=c?c[j]*255:raw[i+j];}ap.data[i+3]=255;
}
tc.putImageData(pixels,0,0);ac.putImageData(ap,0,0);
for(const r of data.regions){const o=document.createElement('option');o.value=r.habitatId;o.textContent=r.name;$('jump').append(o);}
const mx=x=>(x-b.minX)/extent,my=z=>(z-b.minZ)/extent;
function fullMap(type){
  const c=document.createElement('canvas');c.width=2000;c.height=2260;const g=c.getContext('2d');
  g.fillStyle='#0a2028';g.fillRect(0,0,c.width,c.height);g.fillStyle='#79d5be';g.font='22px system-ui';g.fillText('WILDKIN FRONTIER · CURRENT WORLD SURVEY',80,65);g.fillStyle='#f0f3e7';g.font='bold 49px system-ui';g.fillText(type==='regions'?'Ten fixed habitat areas':'The current continent',80,130);g.font='23px system-ui';g.fillStyle='#bfd1cb';g.fillText('6 × 7 km coastline bounds · ~29 km² land · north is up',80,180);
  const left=80,top=220,size=1840;
  g.drawImage(type==='regions'?allocation:terrain,left,top,size,size);
  g.strokeStyle='#719496';g.lineWidth=2;g.strokeRect(left,top,size,size);
  const marker=(x,z,label,index)=>{
    const px=left+mx(x)*size,py=top+my(z)*size;
    g.beginPath();g.arc(px,py,17,0,Math.PI*2);g.fillStyle='#102a33';g.fill();g.strokeStyle='#eebd73';g.lineWidth=3;g.stroke();g.fillStyle='#fff4d2';g.font='bold 17px system-ui';g.textAlign='center';g.fillText(index,px,py+6);g.textAlign='left';
    if(label){g.font='bold 22px system-ui';const w=g.measureText(label).width;g.fillStyle='#0a2028db';g.fillRect(px-w/2-10,py+23,w+20,34);g.fillStyle='#e9f0de';g.textAlign='center';g.fillText(label,px,py+48);g.textAlign='left';}
  };
  if(type==='regions')data.regions.forEach((r,i)=>marker(r.x,r.z,r.name,i+1));
  else marker(0,2,'Camp','C');
  g.fillStyle='#f3edd6';g.font='bold 26px system-ui';g.fillText('N ↑',1830,275);g.strokeStyle='#f3edd6';g.lineWidth=6;g.beginPath();g.moveTo(135,2010);g.lineTo(365,2010);g.stroke();g.font='21px system-ui';g.fillText('1 km',213,1984);
  g.fillStyle='#bfd1cb';g.font='22px system-ui';g.fillText(type==='regions'?'Allocation colors are diagnostic. Ten named areas are not ten finished habitats.':'Actual terrain colors with analytical relief shading. No invented rivers or scenery.',80,2120);
  g.fillText('10 m sampling · trees, creatures and small props omitted · edition 1 / seed 0x4f1a2b3c',80,2163);
  g.fillText('Generated from the current repository terrain sampler · September 13, 2026',80,2206);
  return c;
}
const maps={terrain:fullMap('terrain'),regions:fullMap('regions')};
function sizeMap(){const dpr=Math.min(devicePixelRatio,2);map.width=stage.clientWidth*dpr;map.height=stage.clientHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
function mapRect(){const w=stage.clientWidth,h=stage.clientHeight,s=Math.min(w/2000,h/2260)*scale;return{x:(w-2000*s)/2+panX,y:(h-2260*s)/2+panY,w:2000*s,h:2260*s};}
function drawMap(){if(mode==='fly')return;ctx.fillStyle='#0a2028';ctx.fillRect(0,0,stage.clientWidth,stage.clientHeight);const r=mapRect();ctx.drawImage(maps[mode],r.x,r.y,r.w,r.h);readout.textContent=`${Math.round(scale*100)}% · 10 m survey · no save changes`;}

function reset(){scale=1;panX=panY=0;drawMap();}
function selectMode(m){mode=m;for(const id of ['terrain','regions'])$(id).setAttribute('aria-pressed',String(id===m));reset();}
for(const id of ['terrain','regions'])$(id).onclick=()=>selectMode(id);
$('reset').onclick=reset;
$('jump').onchange=()=>{const r=data.regions.find(r=>r.habitatId===$('jump').value);if(!r)return;scale=3;const s=Math.min(stage.clientWidth/2000,stage.clientHeight/2260)*scale;panX=-(80+mx(r.x)*1840-1000)*s;panY=-(220+my(r.z)*1840-1130)*s;drawMap();};
map.onpointerdown=e=>{map.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};};
map.onpointermove=e=>{if(!drag)return;panX+=e.clientX-drag.x;panY+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};drawMap();};
map.onpointerup=map.onpointercancel=map.onlostpointercapture=()=>{drag=null;};
map.addEventListener('wheel',e=>{e.preventDefault();const prior=scale;scale=Math.max(.7,Math.min(18,scale*Math.exp(-e.deltaY*.001)));const x=e.offsetX-stage.clientWidth/2,y=e.offsetY-stage.clientHeight/2;panX=x-(x-panX)*scale/prior;panY=y-(y-panY)*scale/prior;drawMap();},{passive:false});
addEventListener('keydown',e=>{if(e.target.matches('select,button,input')||$('help').open)return;const k=e.key;if(['0','+','=','-'].includes(k)){e.preventDefault();if(k==='0')reset();else{scale=Math.max(.7,Math.min(18,scale*(k==='-'?.8:1.25)));drawMap();}}});
addEventListener('blur',()=>{drag=null;});document.addEventListener('visibilitychange',()=>{drag=null;});
$('showHelp').onclick=()=>$('help').showModal();$('closeHelp').onclick=()=>$('help').close();
$('download').onclick=()=>{const a=document.createElement('a');a.download='wildkin-'+mode+'-continent.png';a.href=maps[mode].toDataURL();a.click();};
addEventListener('resize',()=>{sizeMap();drawMap();});
sizeMap();reset();$('loading').remove();
window.continentSurvey={exportMap:type=>maps[type].toDataURL(),getView:()=>({mode,scale})};
