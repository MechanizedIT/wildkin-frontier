const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createLandscapeEditor(host,onApply){
  host.innerHTML='<details class="landscape-editor"><summary>Landscape · paths, hills & water</summary><div class="landscape-controls"></div></details>';
  const controls=host.querySelector('.landscape-controls');let draft=null,regionId='',selection='heights:0';
  function render(){
    if(!draft){controls.innerHTML='<p>This section has no landscape.</p>';return;}
    const [kind,index]=selection.split(':'),object=draft[kind]?.[Number(index)];
    const options=['heights','water','routes'].flatMap(key=>(draft[key]??[]).map((item,i)=>`<option value="${key}:${i}" ${selection===`${key}:${i}`?'selected':''}>${key==='heights'?'Hill':key==='water'?'Pond':'Path'} · ${escape(item.id||i+1)}</option>`));
    controls.innerHTML=`<select data-landscape-select>${options.join('')}</select><div class="landscape-fields">${object?(kind==='routes'?`<label>Path width<input data-field="width" type="number" min="1" max="18" step=".1" value="${object.width}"></label><label><span><input data-grade-enabled type="checkbox" ${object.elevation!==undefined?'checked':''}> Level path</span><input data-grade type="number" step=".05" min="-1" max="5" value="${object.elevation??0}"></label><label class="wide">Path points (x, z)<textarea data-points rows="5">${escape(JSON.stringify(object.points,null,1))}</textarea></label>`:['x','z','rx','rz',kind==='heights'?'height':'depth',...(kind==='heights'?['plateau']:[])].map(field=>`<label>${({rx:'Width radius',rz:'Length radius',height:'Height',depth:'Depth',plateau:'Flat top'})[field]??field}<input data-field="${field}" type="number" step=".1" value="${object[field]??(field==='plateau'?.4:.35)}"></label>`).join('')):'<p>Add a landform below.</p>'}</div><div class="landscape-palette">${['grass','grassShade','path','rock','water'].map(key=>`<label>${escape(key)}<input type="color" data-color="${key}" value="${draft.palette?.[key]??'#76b94f'}"></label>`).join('')}</div><label>Grass density<input data-density type="range" min="0" max="1.5" step=".05" value="${draft.detail?.grassDensity??.65}"></label><div class="landscape-buttons"><button data-add="heights">+ Hill</button><button data-add="water">+ Pond</button><button data-add="routes">+ Path</button><button data-remove>Remove</button></div><button data-apply>Apply landscape</button><p data-status>Objects retain their height above the ground. Undo and export include this edit.</p>`;
  }
  function read(){
    const [kind,index]=selection.split(':'),object=draft[kind]?.[Number(index)];
    for(const input of controls.querySelectorAll('[data-field]'))object[input.dataset.field]=Number(input.value);
    const points=controls.querySelector('[data-points]');if(points){object.points=JSON.parse(points.value);if(controls.querySelector('[data-grade-enabled]').checked)object.elevation=Number(controls.querySelector('[data-grade]').value);else delete object.elevation;}
    draft.palette??={};for(const input of controls.querySelectorAll('[data-color]'))draft.palette[input.dataset.color]=input.value;
    draft.detail={...draft.detail,grassDensity:Number(controls.querySelector('[data-density]').value)};
  }
  controls.addEventListener('change',event=>{if(event.target.matches('[data-landscape-select]')){try{read();selection=event.target.value;render();}catch(error){controls.querySelector('[data-status]').textContent=error.message;}}});
  controls.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    try{read();if(button.dataset.add){const key=button.dataset.add;draft[key]??=[];const id=`${key}_${Date.now()}`;draft[key].push(key==='routes'?{id,width:2,points:[{x:0,z:0},{x:0,z:5}]}:{id,x:0,z:0,rx:5,rz:5,...(key==='heights'?{height:1,plateau:.4}:{depth:.3})});selection=`${key}:${draft[key].length-1}`;render();}
      else if(button.hasAttribute('data-remove')){const [key,i]=selection.split(':');draft[key]?.splice(Number(i),1);selection=`${key}:0`;render();}
      else if(button.hasAttribute('data-apply')){const result=onApply(regionId,structuredClone(draft));controls.querySelector('[data-status]').textContent=result.ok?'Landscape applied.':result.error;}
    }catch(error){controls.querySelector('[data-status]').textContent=error.message;}
  });
  return {refresh(region){regionId=region.id;draft=structuredClone(region.surface??{seed:7,heights:[],water:[],routes:[],palette:{},detail:{grassDensity:.65}});render();}};
}
