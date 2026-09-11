// src/author/authorUI.js — desktop Author Mode panel (Phase 4A.2.2 registry-driven)
import { resolveAuthorType, readNormalizedTransform, getColliderDescriptor } from "./authorTypeRegistry.js";
import { createAuthorActions } from "./authorActions.js";
import { analyzeCampaign } from "./campaignReadiness.js";
import { createLandscapeEditor } from './landscapeEditor.js';

// Step 3: thumbnail cache + canvas generator (2D top-down projection, no WebGL)
const _thumbCache = new Map();
function getAssetThumbnailCanvas(asset){
  const key = asset.id + ":" + JSON.stringify(asset.parts.map(p=>`${p.shape}:${p.color}:${p.position.x},${p.position.y},${p.position.z}:${p.scale.x},${p.scale.y},${p.scale.z}`));
  if (_thumbCache.has(key)) {
    const cached = _thumbCache.get(key);
    const clone = document.createElement("canvas");
    clone.width = cached.width; clone.height = cached.height;
    const c = clone.getContext("2d");
    if (c) c.drawImage(cached,0,0);
    clone.style.width = cached.width+"px"; clone.style.height = cached.height+"px";
    clone.style.borderRadius = "3px"; clone.style.flexShrink = "0";
    return clone;
  }
  // Clone will not exist for canvas? We'll cache ImageData? Simpler cache canvas element and clone via draw
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  // Background
  ctx.fillStyle = "#0a0f1e";
  ctx.fillRect(0,0,size,size);
  ctx.strokeStyle = "#2a3a5a";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,size-1,size-1);
  // Determine bounds of parts in XZ plane for projection
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const part of asset.parts){
    const sx = Math.abs(part.scale.x)*0.5, sz = Math.abs(part.scale.z)*0.5;
    minX = Math.min(minX, part.position.x - sx);
    maxX = Math.max(maxX, part.position.x + sx);
    minZ = Math.min(minZ, part.position.z - sz);
    maxZ = Math.max(maxZ, part.position.z + sz);
  }
  if (!isFinite(minX)) { minX=-1; maxX=1; minZ=-1; maxZ=1; }
  const pad = 0.3;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const spanX = Math.max(0.6, maxX-minX);
  const spanZ = Math.max(0.6, maxZ-minZ);
  const span = Math.max(spanX, spanZ);
  const scale = (size-6)/span;
  const cx = (minX+maxX)/2, cz = (minZ+maxZ)/2;
  // Sort back to front by Y for painter
  const sorted = [...asset.parts].sort((a,b)=>a.position.y-b.position.y);
  for (const part of sorted){
    const px = (part.position.x - cx)*scale + size/2;
    const pz = (part.position.z - cz)*scale + size/2;
    const rx = Math.max(2, part.scale.x*scale*0.5);
    const rz = Math.max(2, part.scale.z*scale*0.5);
    ctx.fillStyle = part.color || "#8899aa";
    ctx.globalAlpha = 0.92;
    // Shape icon
    ctx.beginPath();
    if (part.shape==='mesh' && part.geometry?.positions) {
      const v=part.geometry.positions,indices=part.geometry.indices;
      const c=Math.cos(part.rotation.y),s=Math.sin(part.rotation.y);
      for(let i=0;i<indices.length;i+=3){ctx.beginPath();for(let j=0;j<3;j++){const k=indices[i+j]*3,x=v[k]*part.scale.x,z=v[k+2]*part.scale.z;const tx=px+(x*c+z*s)*scale,tz=pz+(z*c-x*s)*scale;j===0?ctx.moveTo(tx,tz):ctx.lineTo(tx,tz);}ctx.closePath();ctx.fill();}
    } else if (part.shape==="sphere"||part.shape==="icosahedron"){
      ctx.ellipse(px, pz, rx, rz, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (part.shape==="cylinder"||part.shape==="capsule"){
      ctx.ellipse(px, pz, rx*0.85, rz*0.85, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.stroke();
    } else if (part.shape==="cone"){
      ctx.moveTo(px, pz - rz);
      ctx.lineTo(px - rx, pz + rz*0.6);
      ctx.lineTo(px + rx, pz + rz*0.6);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(px - rx, pz - rz, rx*2, rz*2);
    }
    // height hint — small vertical bar
    const h = Math.max(1, Math.min(8, part.position.y*2));
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(px + rx +1, pz - rz, 1.2, h);
  }
  ctx.globalAlpha = 1;
  // Border highlight for harvestable/wildkin roles
  const role = asset.gameplay?.role;
  if (role==="harvestable") { ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 1.2; ctx.strokeRect(1,1,size-2,size-2);}
  else if (role==="wildkin") { ctx.strokeStyle = "#ff7043"; ctx.lineWidth = 1.2; ctx.strokeRect(1,1,size-2,size-2);}
  _thumbCache.set(key, canvas);
  // Return clone to avoid mutating cached canvas
  const clone = document.createElement("canvas");
  clone.width = size; clone.height = size;
  clone.getContext("2d").drawImage(canvas,0,0);
  clone.style.width = size+"px"; clone.style.height = size+"px";
  clone.style.borderRadius = "3px";
  clone.style.flexShrink = "0";
  if (size>0) {}
  return clone;
}
function patchRoleTabs(){
  const sel = container.querySelector("#author-asset-role");
  // will be called after DOM ready
}

export function createAuthorUI(opts) {
  const draftApi = opts.draftApi;
  const actions = opts.actions ?? createAuthorActions(draftApi);
  const onPlay = opts.onPlay;
  const onValidate = opts.onValidate;
  const onSelectRegion = opts.onSelectRegion;
  let selectedId = null;
  let editMode = false;

  const container = document.createElement("div");
  container.id = "author-panel";
  container.style.cssText = "position:fixed;top:8px;left:8px;width:min(440px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;background:#0f1420f2;color:#d0d8e8;font:12px system-ui;border:1px solid #2a3a5a;border-radius:8px;z-index:9999;padding:10px;display:none;backdrop-filter:blur(6px)";
  container.innerHTML = `
    <style>#author-panel *,#author-panel *::before,#author-panel *::after{box-sizing:border-box}#author-panel input,#author-panel select,#author-panel button{min-width:0}#author-panel input,#author-panel select{background:#111a2a;color:#e2ebf7;border:1px solid #344966;border-radius:4px;padding:4px}#author-panel input::placeholder{color:#73839b}#author-panel input[type="checkbox"]{width:auto;accent-color:#3b8eea;padding:0}#author-panel .author-vec3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}#author-panel .author-vec3 input{width:100%;padding:3px 4px}#author-asset-editor button{background:#1b2b42;color:#dcecff;border:1px solid #3a5274;border-radius:4px;padding:4px;cursor:pointer}#author-asset-editor button:hover,#author-asset-editor button:focus-visible{background:#29496c;border-color:#5791c6;outline:none}#author-asset-editor button:disabled{opacity:.42;cursor:not-allowed}</style>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <button id="author-toggle" style="flex:1;padding:7px 8px;background:#2a7fff;color:#fff;border:none;border-radius:6px;font-weight:800">EDIT</button>
      <span id="author-mode-badge" style="font-size:10px;font-weight:700;padding:4px 6px;border-radius:4px;background:#1a243a;color:#8aa0c0">PLAY TEST</span>
      <button id="author-collapse" title="Collapse panel to see more play area — click to restore" style="padding:7px 8px;background:#1a243a;color:#8aa0c0;border:1px solid #2a3a5a;border-radius:6px;font-size:11px">◀ Hide</button>
    </div>
    <div id="author-status" style="font-size:11px;color:#8aa0c0;margin-bottom:8px;min-height:14px">Author Mode — READY</div>
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px"><label style="font-size:10px;color:#7890ad">Snap grid <select id="author-snap" style="padding:2px 4px;font-size:10px"><option value="0">Off</option><option value="0.25">0.25</option><option value="0.5" selected>0.5</option><option value="1">1.0</option></select></label><button id="author-align-ground" title="Snap selected bottom to ground" style="flex:1;padding:3px;font-size:10px">↧ Drop to ground</button><button id="author-reset-view" title="Reset level camera to top-down (also 0 / Home)" style="padding:3px 6px;font-size:10px;background:#1a243a;color:#dcecff;border:1px solid #2a3a5a;border-radius:4px">⟲ Reset view 0</button></div>
    <div style="font-size:10px;color:#7890ad;margin: -2px 0 6px">Hold <b>Shift</b> while dragging to ignore snap · <b>Alt+right or middle-drag</b> to orbit · right-drag to pan · orb+cross shows orbit point</div>
    <div id="author-place-hint" style="display:none;font-size:11px;color:#ffd54f;background:#2a2410;border:1px solid #6a5a20;border-radius:6px;padding:6px;margin-bottom:8px"></div>
    <details id="sec-palette" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer;list-style:none">Palette — Click to place ▼</summary>
      <div id="author-palette" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div>
    </details>
    <details id="sec-visual-assets" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Visual Assets</summary>
      <input id="author-asset-filter" placeholder="Search assets or category" style="width:100%;margin-top:6px;padding:6px;background:#0a0f1e;color:#dcecff;border:1px solid #2a3a5a;border-radius:5px">
      <button id="author-asset-new" style="width:100%;margin-top:6px;padding:6px;background:#244266;color:#dcecff;border:1px solid #3a6694;border-radius:5px">+ New Asset</button>
      <div id="author-asset-list" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;max-height:230px;overflow-y:auto;overflow-x:hidden"></div>
      <div id="author-asset-editor" style="display:none;margin-top:7px;padding:6px;background:#0a0f1e;border:1px solid #3a6694;border-radius:6px">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px"><strong style="flex:1">Asset Workbench</strong><button id="author-asset-exit" style="padding:4px 8px">Back to Library</button></div>
        <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:5px"><label>Name <input id="author-asset-name" style="width:100%"></label><label>Category <input id="author-asset-category" style="width:100%"></label></div>
        <div id="author-asset-id" style="font-size:10px;color:#6f88a8;margin:3px 0 6px"></div>
        <div style="border:1px solid #263b58;border-radius:5px;background:#101b2c;padding:5px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px"><strong style="font-size:11px;flex:1">Camera View</strong><span style="font-size:9px;color:#7890ad">45° steps</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"><button id="author-camera-left" title="Orbit camera left ([)">↶ Left [</button><button id="author-camera-reset" title="Reset camera view (0)">Reset 0</button><button id="author-camera-right" title="Orbit camera right (])">Right ] ↷</button></div>
          <div style="font-size:9px;color:#7890ad;margin-top:4px">Right-drag pans · Alt+right or middle free-orbits (inverted) · wheel zooms · orb+cross is orbit point</div>
        </div>
        <div id="author-asset-external-model-note" style="display:none;font-size:11px;color:#b9cbe0;background:#101b2c;border:1px solid #263b58;border-radius:5px;padding:6px;margin:6px 0">Edit this model in Blender. Placement and collision remain editable here.</div>
        <div id="author-asset-primitive-editor">
          <div style="font-size:11px;font-weight:700;margin-bottom:3px">Add Part</div>
          <div id="author-asset-add-parts" style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
            <button data-asset-shape="box">+ Box</button><button data-asset-shape="cylinder">+ Cylinder</button>
            <button data-asset-shape="cone">+ Cone</button><button data-asset-shape="sphere">+ Sphere</button>
            <button data-asset-shape="capsule">+ Capsule</button><button data-asset-shape="icosahedron">+ Icosahedron</button>
          </div>
          <div style="font-size:9px;color:#7890ad;margin-top:6px">Part order — harvestables remove parts from the bottom upward</div>
          <div id="author-asset-parts" style="display:flex;flex-direction:column;gap:3px;margin:4px 0;max-height:190px;overflow-y:auto"></div>
          <div id="author-asset-part-form" style="display:none;border-top:1px solid #1e2a4a;padding-top:5px">
          <label style="display:block">Shape <input id="author-part-shape" readonly style="width:100%;opacity:.75"></label>
          <div style="font-size:11px;margin-top:4px">Position X / Y / Z</div><div class="author-vec3"><input id="author-part-px" type="number" step="0.1" title="Position X"><input id="author-part-py" type="number" step="0.1" title="Position Y"><input id="author-part-pz" type="number" step="0.1" title="Position Z"></div>
          <div style="font-size:11px;margin-top:4px">Rotation X / Y / Z °</div><div class="author-vec3"><input id="author-part-rx" type="number" step="5" title="Rotation X"><input id="author-part-ry" type="number" step="5" title="Rotation Y"><input id="author-part-rz" type="number" step="5" title="Rotation Z"></div>
          <div style="font-size:11px;margin-top:4px">Scale X / Y / Z</div><div class="author-vec3"><input id="author-part-sx" type="number" min="0.01" step="0.1" title="Scale X"><input id="author-part-sy" type="number" min="0.01" step="0.1" title="Scale Y"><input id="author-part-sz" type="number" min="0.01" step="0.1" title="Scale Z"></div>
          <label style="display:block;margin-top:4px">Color <input id="author-part-color" type="color" style="width:100%;height:25px"></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px"><button id="author-part-rotate-left">Q · Rotate −15°</button><button id="author-part-rotate-right">E · Rotate +15°</button><button id="author-part-down">C · Lower 0.2</button><button id="author-part-up">Space · Raise 0.2</button></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px"><button id="author-part-order-up">Move earlier ↑</button><button id="author-part-order-down">Move later ↓</button><button id="author-part-duplicate">Duplicate</button><button id="author-part-delete" style="color:#ffaaaa">Delete</button></div>
          </div>
        </div>
        <div style="border-top:1px solid #1e2a4a;margin-top:7px;padding-top:5px">
          <strong style="font-size:11px">Collision</strong>
          <select id="author-asset-collision" style="width:100%;margin-top:3px"><option value="none">None</option><option value="box">Box</option><option value="convexHull" disabled>Authored convex hull</option></select>
          <div id="author-asset-hull-note" style="display:none;font-size:11px;margin-top:5px">Hull points are retained from the model source. Place, scale and rotate normally.</div>
          <div id="author-asset-collision-fields" style="display:none">
            <div style="font-size:11px;margin-top:4px">Size W / H / D</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px"><input id="author-col-w" type="number" min="0.01" step="0.1"><input id="author-col-h" type="number" min="0.01" step="0.1"><input id="author-col-d" type="number" min="0.01" step="0.1"></div>
            <div style="font-size:11px;margin-top:4px">Offset X / Y / Z</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px"><input id="author-col-x" type="number" step="0.1"><input id="author-col-y" type="number" step="0.1"><input id="author-col-z" type="number" step="0.1"></div>
          </div>
          <button id="author-asset-fit" style="width:100%;margin-top:4px">Fit To Visual Bounds</button>
        </div>
        <div style="border-top:1px solid #1e2a4a;margin-top:7px;padding-top:5px">
          <strong style="font-size:11px">Game Object Type</strong>
          <div id="author-role-tabs" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
            <button data-role-tab="prop" style="padding:4px;font-size:10px;border:1px solid #3a4f70;border-radius:3px;background:#1a243a;color:#dcecff">Prop</button>
            <button data-role-tab="harvestable" style="padding:4px;font-size:10px;border:1px solid #3a4f70;border-radius:3px;background:#1a243a;color:#dcecff">Harvest</button>
            <button data-role-tab="wildkin" style="padding:4px;font-size:10px;border:1px solid #3a4f70;border-radius:3px;background:#1a243a;color:#dcecff">Wildkin</button>
          </div>
          <select id="author-asset-role" style="width:100%;margin-top:3px"><option value="prop">Prop / Decoration</option><option value="harvestable">Harvestable Resource</option><option value="wildkin">Wildkin</option></select>
          <div id="author-asset-harvest-fields" style="display:none;margin-top:5px">
            <label style="display:block">Drops <select id="author-asset-drop" style="width:100%"></select></label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px"><label>Hits <input id="author-asset-hits" type="number" min="1" max="12" step="1" style="width:100%"></label><label>Respawn sec <input id="author-asset-respawn" type="number" min="1" max="300" step="1" style="width:100%"></label></div>
            <div id="author-harvest-order-note" style="font-size:9px;color:#8ca3c2;margin-top:3px"></div>
            <label style="display:block;margin-top:4px">Impact feel <select id="author-asset-feedback" style="width:100%"><option value="wood">Wood</option><option value="stone">Stone</option><option value="fiber">Plant / Fiber</option></select></label>
            <label style="display:block;margin-top:4px">Depleted remnant <select id="author-asset-remnant" style="width:100%"></select></label>
            <div style="border-top:1px solid #263b58;margin-top:6px;padding-top:5px"><strong style="font-size:10px">Selected drop model</strong><select id="author-drop-visual" style="width:100%;margin-top:3px"></select><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px"><button id="author-drop-visual-edit">Edit model asset</button><button id="author-drop-visual-new">+ New model asset</button></div></div>
            <details style="margin-top:6px;border:1px solid #263b58;border-radius:4px;padding:5px"><summary style="cursor:pointer">+ Create Custom Drop</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px"><input id="author-drop-id" placeholder="iron_ore"><input id="author-drop-name" placeholder="Iron Ore"></div><input id="author-drop-color" type="color" value="#b7c0ca" style="width:100%;height:25px;margin-top:4px"><button id="author-drop-create" style="width:100%;margin-top:4px">Add Drop To Catalog</button></details>
          </div>
          <div id="author-asset-wildkin-fields" style="display:none;margin-top:5px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><label>Behavior <select id="author-wildkin-archetype" style="width:100%"><option value="rusher">Rusher</option><option value="spitter">Spitter</option></select></label><label>Temperament <select id="author-wildkin-temperament" style="width:100%"><option>AGGRESSIVE</option><option>TERRITORIAL</option><option>DEFENSIVE</option><option>SKITTISH</option></select></label></div>
            <label style="display:block;margin-top:4px">Species tag <input id="author-wildkin-species" style="width:100%"></label>
            <label style="display:block;margin-top:4px">Hostile species (comma-separated) <input id="author-wildkin-hostile" style="width:100%"></label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px"><label>Health <input id="author-wildkin-health" type="number" min="1" max="50" style="width:100%"></label><label>Damage <input id="author-wildkin-damage" type="number" min="0" max="20" step="0.1" style="width:100%"></label><label>Move speed <input id="author-wildkin-speed" type="number" min="0.1" max="12" step="0.1" style="width:100%"></label><label>Respawn sec <input id="author-wildkin-respawn" type="number" min="1" max="300" style="width:100%"></label></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px"><label>Roam radius <input id="author-wildkin-roam" type="number" min="0" max="50" step="0.1" style="width:100%"></label><label>Notice radius <input id="author-wildkin-notice" type="number" min="0.25" max="50" step="0.1" style="width:100%"></label><label>Personal space <input id="author-wildkin-personal" type="number" min="0.1" max="20" step="0.1" style="width:100%"></label><label>Leash radius <input id="author-wildkin-leash" type="number" min="0.5" max="100" step="0.1" style="width:100%"></label></div>
          </div>
        </div>
        <button id="author-asset-delete" style="width:100%;margin-top:7px;color:#ffaaaa">Delete Asset</button>
        <div id="author-asset-part-help" style="font-size:10px;color:#7f98ba;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:5px">Select a part, then use drag/WASD for local X/Z · Space/C for Y · Q/E for rotation · [/] camera · Esc exits. Clicking the canvas restores shortcut focus.</div>
      </div>
    </details>
    <details id="sec-selected" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Selected</summary>
      <div id="author-selected" style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-top:6px">
        <div id="author-selected-none" style="color:#6a7a96">Click any object (prop, tree, Wildkin, waypoint) to select</div>
        <div id="author-selected-form" style="display:none">
          <div style="font-size:11px;color:#8aa0c0;margin-bottom:4px" id="author-sel-id"></div>
          <label style="display:block;margin:2px 0;font-size:11px">Region <select id="author-sel-region" style="width:100%;font-size:12px"></select></label>
          <div id="row-pos" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <label>X <input id="author-x" type="number" step="0.1" style="width:100%"></label>
            <label>Z <input id="author-z" type="number" step="0.1" style="width:100%"></label>
          </div>
          <div id="row-y" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <label>Y <input id="author-y" type="number" step="0.1" style="width:100%"></label>
            <label id="wrap-rot">RotY° <input id="author-rot" type="number" step="5" style="width:100%"></label>
          </div>
          <div id="row-size" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">
            <label>W <input id="author-w" type="number" step="0.1" style="width:100%"></label>
            <label>D <input id="author-h" type="number" step="0.1" style="width:100%"></label>
            <label>Height <input id="author-height" type="number" step="0.1" style="width:100%"></label>
          </div>
          <div id="row-scale" style="display:none;margin-top:4px">
            <label>Uniform Scale <input id="author-scale" type="number" min="0.2" max="3" step="0.1" style="width:100%"></label>
          </div>
          <div id="author-presentation" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:6px">
            <div style="font-weight:600;margin-bottom:4px">Presentation / Physics</div>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-visible"> Visible in Play</label>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-collision"> Collision</label>
            <label style="display:block;margin:2px 0">Opacity <input id="author-opacity" type="number" min="0" max="1" step="0.05" style="width:100%"></label>
            <label style="display:block;margin:2px 0">Tint <input id="author-tint" type="color" style="width:100%;height:24px;padding:2px"><input id="author-tint-text" placeholder="#RRGGBB or empty" style="width:100%;margin-top:2px;font-size:11px"></label>
          </div>
          <div id="author-custom-fields" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:4px"></div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button id="author-duplicate" style="flex:1;padding:6px;background:#2a3a5a;color:#fff;border:none;border-radius:4px">Duplicate</button>
            <button id="author-delete" style="flex:1;padding:6px;background:#5a1a1a;color:#ffaaaa;border:none;border-radius:4px">Delete</button>
          </div>
          <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
            <button class="nudge" data-dx="0" data-dz="-0.2" style="flex:1;padding:4px">↑</button>
            <button class="nudge" data-dx="-0.2" data-dz="0" style="flex:1;padding:4px">←</button>
            <button class="nudge" data-dx="0.2" data-dz="0" style="flex:1;padding:4px">→</button>
            <button class="nudge" data-dx="0" data-dz="0.2" style="flex:1;padding:4px">↓</button>
            <button id="author-up" style="flex:1;padding:4px;display:none">Y+0.2</button>
            <button id="author-down" style="flex:1;padding:4px;display:none">Y-0.2</button>
          </div>
          <div style="font-size:10px;color:#6a7a8a;margin-top:4px">Drag object in Edit to move X/Z · Y via buttons/field</div>
        </div>
      </div>
    </details>
    <details id="sec-hierarchy" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Hierarchy</summary>
      <input id="author-filter" placeholder="filter id/type" style="width:100%;margin-top:4px;font-size:11px;padding:4px;border-radius:4px;border:1px solid #2a3a5a;background:#0a0f1e;color:#d0d8e8">
      <div id="author-hierarchy" style="max-height:240px;overflow:auto;margin-top:4px;border:1px solid #1e2a4a;border-radius:4px;padding:4px;background:#0a0f1e;font-size:11px"></div>
    </details>
    <details id="sec-region" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Section Context</summary>
      <div style="font-size:10px;color:#7890ad;margin-top:4px">Only the selected section is visible and editable. Overlapping local coordinates never change ownership.</div>
      <div style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-top:6px">
        <div style="display:grid;grid-template-columns:1fr auto;gap:4px"><label style="flex:1">Camp / Section <select id="author-region-select" style="width:100%"></select></label><button id="author-region-new" title="Create a new standard 50x50 section" style="padding:4px 8px;background:#244266;color:#dcecff;border:1px solid #3a6694;border-radius:4px;font-size:11px">+ New Section</button></div>
        <pre id="author-section-summary" style="white-space:pre-wrap;font:10px/1.45 ui-monospace,monospace;color:#a8bdd8;background:#080d18;border:1px solid #1e2a4a;border-radius:4px;padding:6px;margin:6px 0 0"></pre>
        <div id="author-region-form" style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <label>Display <input id="author-region-name" style="width:100%"></label>
          <label>Neighbors <div id="author-region-neighbors" style="display:flex;flex-wrap:wrap;gap:3px;min-height:26px;padding:3px;background:#0a0f1e;border:1px solid #2a3a5a;border-radius:4px"></div><input type="hidden" id="author-region-neighbors-input"></label>
          <label>minX <input id="author-b-minX" type="number" step="0.5" style="width:100%"></label>
          <label>maxX <input id="author-b-maxX" type="number" step="0.5" style="width:100%"></label>
          <label>minZ <input id="author-b-minZ" type="number" step="0.5" style="width:100%"></label>
          <label>maxZ <input id="author-b-maxZ" type="number" step="0.5" style="width:100%"></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px"><button id="author-region-apply" style="padding:6px;background:#1e2a4a;color:#aaccff;border:none;border-radius:4px">Apply</button><button id="author-region-focus" style="padding:6px;background:#1a243a;color:#dcecff;border:1px solid #2a3a5a;border-radius:4px">Focus Camera</button></div>
        <div id="author-region-status" style="font-size:11px;color:#8aa0c0;margin-top:4px"></div>
        <div id="author-landscape-editor"></div>
      </div>
    </details>
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button id="author-validate" style="flex:1;padding:6px;background:#2a2a1a;color:#ffea66;border:1px solid #6a5a2a;border-radius:6px">Validate</button>
      <button id="author-campaign-readiness" style="flex:1;padding:6px;background:#1f2f45;color:#b8dcff;border:1px solid #3a6694;border-radius:6px">Campaign Readiness</button>
      <button id="author-export" style="flex:1;padding:6px;background:#1a3a2a;color:#aaffaa;border:1px solid #2a6a4a;border-radius:6px">Export</button>
    </div>
    <pre id="author-campaign-report" style="display:none;white-space:pre-wrap;font:10px/1.4 ui-monospace,monospace;color:#b8dcff;background:#080d18;border:1px solid #29496c;border-radius:5px;padding:6px;margin:0 0 6px"></pre>
    <button id="author-reset" style="width:100%;padding:6px;background:#3a1a1a;color:#ffaaaa;border:1px solid #6a2a2a;border-radius:6px">Reset Draft From Repo</button>
    <div style="font-size:10px;color:#5a6a8a;margin-top:6px">World: right-drag pan · wheel zoom · Asset: camera-plane pan · fixed-pitch dolly · Esc cancels</div>
  `;
  document.body.appendChild(container);

  const toggleBtn = container.querySelector("#author-toggle");
  const badge = container.querySelector("#author-mode-badge");
  const statusEl = container.querySelector("#author-status");
  const placeHint = container.querySelector("#author-place-hint");
  const paletteEl = container.querySelector("#author-palette");
  const regionSelectEl = container.querySelector("#author-region-select");
  const landscapeEditor=createLandscapeEditor(container.querySelector('#author-landscape-editor'),(id,surface)=>{
    const result=draftApi.updateRegion(id,{surface});
    if(result.ok){opts.onDraftChanged?.(null,undefined,'structural');refreshHierarchy();}
    return result;
  });
  const selRegionEl = container.querySelector("#author-sel-region");
  const selectedNone = container.querySelector("#author-selected-none");
  const selectedForm = container.querySelector("#author-selected-form");
  const selIdEl = container.querySelector("#author-sel-id");

  const paletteCategories = [
    { title: "World", items: [
      { label: "Ground Patch", kind: "groundPatch" },
      { label: "Boundary Collider", kind: "boundaryCollider" },
    ]},
    { title: "Environment / Props", items: [
      { label: "Box", kind: "prop", subtype: "box" },
      { label: "Fence", kind: "fence" },
      { label: "Gate", kind: "gate" },
      { label: "Forest Boundary", kind: "forestBoundary" },
      { label: "Water", kind: "water" },
      { label: "Island", kind: "island" },
      { label: "Resonator", kind: "resonator" },
    ]},
    { title: "Traversal", items: [
      { label: "Platform", kind: "platform" },
      { label: "Obstacle", kind: "obstacle" },
      { label: "Ladder", kind: "climbable" },
      { label: "Jump Pad — Low", kind: "jumpPad", powerPreset: "low" },
      { label: "Jump Pad — Medium", kind: "jumpPad", powerPreset: "medium" },
      { label: "Jump Pad — High", kind: "jumpPad", powerPreset: "high" },
      { label: "Parkour Start", kind: "parkourStart" },
      { label: "Checkpoint", kind: "parkourCheckpoint" },
      { label: "Parkour End", kind: "parkourEnd" },
      { label: "Course Zone", kind: "parkourCourseZone" },
      { label: "Kill Volume", kind: "killVolume" },
    ]},
    { title: "Resources", items: [
      { label: "Tree", kind: "tree" },
      { label: "Rock", kind: "rock" },
      { label: "Fiber", kind: "fiber" },
    ]},
    { title: "Wildkin", items: [
      { label: "Rusher", kind: "rusher" },
      { label: "Spitter", kind: "spitter" },
    ]},
    { title: "Frontier / POI", items: [
      { label: "Major Waypoint", kind: "majorWaypoint" },
      { label: "Extraction Beacon", kind: "extractionBeacon" },
      { label: "Portal Gate", kind: "portalGate" },
      { label: "Loot Chest", kind: "lootChest" },
      { label: "POI Chest", kind: "poi", subtype: "chest" },
    ]},
  ];
  for (const cat of paletteCategories) {
    const det = document.createElement("details");
    det.open = cat.title === "World" || cat.title === "Environment / Props";
    det.style.border = "1px solid #1e2a4a";
    det.style.borderRadius = "4px";
    det.style.padding = "4px";
    const sum = document.createElement("summary");
    sum.textContent = cat.title;
    sum.style.cursor = "pointer";
    sum.style.fontWeight = "700";
    sum.style.fontSize = "11px";
    det.appendChild(sum);
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "4px";
    grid.style.marginTop = "4px";
    for (const item of cat.items) {
      const b = document.createElement("button");
      b.textContent = item.label;
      b.style.cssText = "padding:6px 4px;background:#1a243a;color:#c0d0e8;border:1px solid #2a3a5a;border-radius:4px;font-size:11px;cursor:pointer";
      b.addEventListener("click", () => opts.onCreate?.(item));
      grid.appendChild(b);
    }
    det.appendChild(grid);
    paletteEl.appendChild(det);
  }

  let editingAssetId = null;
  let selectedAssetPartId = null;
  const assetListEl = container.querySelector("#author-asset-list");
  const assetEditorEl = container.querySelector("#author-asset-editor");
  const assetFilterEl = container.querySelector("#author-asset-filter");

  function setAssetFocus(focused) {
    for (const id of ["sec-palette", "sec-selected", "sec-hierarchy", "sec-region"]) {
      const section = container.querySelector(`#${id}`);
      if (section) section.style.display = focused ? "none" : "";
    }
    for (const id of ["author-asset-filter", "author-asset-new", "author-asset-list"]) {
      const control = container.querySelector(`#${id}`);
      if (control) control.style.display = focused ? "none" : "";
    }
    assetEditorEl.style.marginTop = focused ? "0" : "7px";
  }

  function assetActionResult(result, successText, nextPartId) {
    if (!result?.ok) {
      setStatus(result?.error ?? "Visual Asset edit failed", true);
      return false;
    }
    if (nextPartId !== undefined) selectedAssetPartId = nextPartId;
    setStatus(successText, false);
    if (opts.onAssetChanged) opts.onAssetChanged(editingAssetId, selectedAssetPartId);
    else if (editingAssetId) refreshAssetEditor();
    else refreshVisualAssets();
    return true;
  }

  function refreshAssetEditor() {
    const asset = editingAssetId ? draftApi.findVisualAssetById(editingAssetId) : null;
    assetEditorEl.style.display = asset ? "" : "none";
    if (!asset) return;
    container.querySelector("#author-asset-name").value = asset.displayName;
    container.querySelector("#author-asset-category").value = asset.category ?? "Uncategorized";
    container.querySelector("#author-asset-id").textContent = asset.id;
    const isExternalModel = !!asset.model;
    container.querySelector("#author-asset-external-model-note").style.display = isExternalModel ? "" : "none";
    container.querySelector("#author-asset-primitive-editor").style.display = isExternalModel ? "none" : "";
    container.querySelector("#author-asset-part-help").style.display = isExternalModel ? "none" : "";
    if (isExternalModel) selectedAssetPartId = null;
    if (!asset.parts.some((part) => part.id === selectedAssetPartId)) selectedAssetPartId = asset.parts[0]?.id ?? null;
    const partsHost = container.querySelector("#author-asset-parts");
    partsHost.innerHTML = "";
    for (let partIndex = 0; partIndex < asset.parts.length; partIndex++) {
      const part = asset.parts[partIndex];
      const button = document.createElement("button");
      button.textContent = `${partIndex + 1}. ${part.id}${partIndex === asset.parts.length - 1 ? "  ← harvested first" : ""}`;
      button.dataset.assetPartId = part.id;
      button.style.cssText = `font-size:10px;text-align:left;width:100%;padding:4px 6px;border:1px solid #3a4f70;border-radius:3px;background:${part.id === selectedAssetPartId ? "#3a6694" : "#1a243a"};color:#dcecff`;
      button.addEventListener("click", () => {
        selectedAssetPartId = part.id;
        refreshAssetEditor();
        opts.onAssetPartSelected?.(editingAssetId, selectedAssetPartId);
      });
      partsHost.appendChild(button);
    }
    const part = asset.parts.find((entry) => entry.id === selectedAssetPartId);
    const partForm = container.querySelector("#author-asset-part-form");
    partForm.style.display = part ? "" : "none";
    if (part) {
      const partIndex = asset.parts.findIndex((entry) => entry.id === part.id);
      container.querySelector("#author-part-order-up").disabled = partIndex <= 0;
      container.querySelector("#author-part-order-down").disabled = partIndex >= asset.parts.length - 1;
      container.querySelector("#author-part-shape").value = part.shape;
      for (const [id, value] of [
        ["author-part-px", part.position.x], ["author-part-py", part.position.y], ["author-part-pz", part.position.z],
        ["author-part-rx", part.rotation.x * 180 / Math.PI], ["author-part-ry", part.rotation.y * 180 / Math.PI], ["author-part-rz", part.rotation.z * 180 / Math.PI],
        ["author-part-sx", part.scale.x], ["author-part-sy", part.scale.y], ["author-part-sz", part.scale.z],
      ]) container.querySelector(`#${id}`).value = Number(value.toFixed(4));
      container.querySelector("#author-part-color").value = part.color;
    }
    const collision = asset.collision;
    container.querySelector("#author-asset-collision").value = collision?.shape ?? "none";
    container.querySelector("#author-asset-collision-fields").style.display = collision?.shape === 'box' ? "" : "none";
    container.querySelector("#author-asset-hull-note").style.display = collision?.shape === 'convexHull' ? '' : 'none';
    container.querySelector("#author-asset-fit").textContent = collision?.shape === 'convexHull' ? 'Replace hull with fitted box' : 'Fit To Visual Bounds';
    if (collision?.shape === 'box') {
      for (const [id, value] of [
        ["author-col-w", collision.size.w], ["author-col-h", collision.size.h], ["author-col-d", collision.size.d],
        ["author-col-x", collision.offset.x], ["author-col-y", collision.offset.y], ["author-col-z", collision.offset.z],
      ]) container.querySelector(`#${id}`).value = value;
    }
    const role = asset.gameplay?.role ?? "prop";
    const harvestable = asset.gameplay?.harvestable ?? null;
    const wildkin = asset.gameplay?.wildkin ?? null;
    container.querySelector("#author-asset-role").value = role;
    // Step 3: sync tab highlight
    for (const btn of container.querySelectorAll("[data-role-tab]")) {
      const active = btn.dataset.roleTab === role;
      btn.style.background = active ? "#244266" : "#1a243a";
      btn.style.borderColor = active ? "#3a6694" : "#3a4f70";
      btn.style.fontWeight = active ? "700" : "400";
    }
    container.querySelector("#author-asset-harvest-fields").style.display = role === "harvestable" ? "" : "none";
    container.querySelector("#author-asset-wildkin-fields").style.display = role === "wildkin" ? "" : "none";
    const dropSelect = container.querySelector("#author-asset-drop");
    dropSelect.innerHTML = "";
    for (const drop of draftApi.getResourceDrops()) {
      const option = document.createElement("option");
      option.value = drop.id;
      option.textContent = drop.displayName;
      dropSelect.appendChild(option);
    }
    if (harvestable) {
      dropSelect.value = harvestable.dropId;
      container.querySelector("#author-asset-hits").value = harvestable.maxChunks;
      container.querySelector("#author-asset-respawn").value = harvestable.respawnSeconds;
      container.querySelector("#author-asset-feedback").value = harvestable.feedbackProfile;
      const partCount = asset.parts.length;
      const hitCount = harvestable.maxChunks;
      const orderNote = container.querySelector("#author-harvest-order-note");
      if (hitCount === partCount) orderNote.textContent = "1:1 feedback — each hit removes one part, bottom to top.";
      else if (hitCount < partCount) orderNote.textContent = `${hitCount} hits / ${partCount} parts — bottom parts go first; remaining parts clear on the final hit.`;
      else orderNote.textContent = `${hitCount} hits / ${partCount} parts — match Hits to parts for visible feedback on every hit.`;
    }
    const assetOptions = draftApi.getVisualAssets();
    const remnantSelect = container.querySelector("#author-asset-remnant");
    remnantSelect.innerHTML = '<option value="">Default remnant for impact feel</option>';
    const dropVisualSelect = container.querySelector("#author-drop-visual");
    dropVisualSelect.innerHTML = '<option value="">Default pickup shape</option>';
    for (const optionAsset of assetOptions) {
      const remnantOption = document.createElement("option");
      remnantOption.value = optionAsset.id;
      remnantOption.textContent = optionAsset.displayName;
      remnantSelect.appendChild(remnantOption);
      const pickupOption = remnantOption.cloneNode(true);
      dropVisualSelect.appendChild(pickupOption);
    }
    remnantSelect.value = harvestable?.remnantVisualAssetId ?? "";
    const selectedDrop = draftApi.getResourceDrops().find((drop) => drop.id === dropSelect.value);
    dropVisualSelect.value = selectedDrop?.visualAssetId ?? "";
    container.querySelector("#author-drop-visual-edit").disabled = !selectedDrop?.visualAssetId;
    if (wildkin) {
      for (const [id, value] of [
        ["author-wildkin-archetype", wildkin.archetype], ["author-wildkin-temperament", wildkin.temperament],
        ["author-wildkin-species", wildkin.speciesTag], ["author-wildkin-hostile", wildkin.hostileSpecies.join(", ")],
        ["author-wildkin-health", wildkin.health], ["author-wildkin-damage", wildkin.damage],
        ["author-wildkin-speed", wildkin.moveSpeed], ["author-wildkin-respawn", wildkin.respawnSeconds],
        ["author-wildkin-roam", wildkin.roamRadius], ["author-wildkin-notice", wildkin.noticeRadius],
        ["author-wildkin-personal", wildkin.personalSpace], ["author-wildkin-leash", wildkin.leashRadius],
      ]) container.querySelector(`#${id}`).value = value;
    }
  }

  function refreshVisualAssets() {
    const query = assetFilterEl.value.trim().toLowerCase();
    const assets = draftApi.getVisualAssets()
      .filter((asset) => !query || `${asset.displayName} ${asset.category ?? ""} ${asset.id}`.toLowerCase().includes(query))
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.displayName.localeCompare(b.displayName));
    assetListEl.innerHTML = "";
    let currentCategory = null;
    for (const asset of assets) {
      const category = asset.category ?? "Uncategorized";
      if (category !== currentCategory) {
        currentCategory = category;
        const heading = document.createElement("div");
        heading.textContent = category;
        heading.style.cssText = "font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7187a7;margin:4px 2px 0";
        assetListEl.appendChild(heading);
      }
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:36px 1fr auto auto;gap:4px;align-items:center;background:#111a2a;border:1px solid #263b58;border-radius:4px;padding:4px";
      try {
        const thumb = getAssetThumbnailCanvas(asset);
        thumb.title = `${asset.parts.length} parts · ${asset.gameplay?.role ?? "prop"}`;
        // Hover ghost: show larger preview near cursor via title + larger thumb on hover
        thumb.addEventListener("mouseenter", () => { thumb.style.outline = "1px solid #3a6694"; });
        thumb.addEventListener("mouseleave", () => { thumb.style.outline = "none"; });
        row.append(thumb);
      } catch {}
      const nameWrap = document.createElement("div");
      nameWrap.style.cssText = "display:flex;flex-direction:column;min-width:0";
      const name = document.createElement("span");
      name.textContent = asset.displayName;
      name.style.cssText = "font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      const meta = document.createElement("span");
      meta.textContent = `${asset.parts.length} parts · ${asset.category ?? ""}`;
      meta.style.cssText = "font-size:9px;color:#7890ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      nameWrap.append(name, meta);
      row.append(nameWrap);
      const place = document.createElement("button"); place.textContent = "Place"; place.style.fontSize = "10px"; place.title = "Place instance (click ground)";
      place.addEventListener("click", () => opts.onPlaceAsset?.(asset.id, asset.displayName));
      place.addEventListener("mouseenter", () => {
        // Step 3: hover ghost hint — update status bar
        if (opts.onAssetHoverPreview) opts.onAssetHoverPreview(asset.id);
      });
      const edit = document.createElement("button"); edit.textContent = "Edit"; edit.style.fontSize = "10px";
      edit.addEventListener("click", () => opts.onAssetEditRequested?.(asset.id));
      row.append(place, edit);
      assetListEl.appendChild(row);
    }
    refreshAssetEditor();
  }

  function setAssetEdit(assetId, partId = null) {
    editingAssetId = assetId;
    selectedAssetPartId = partId;
    setAssetFocus(true);
    refreshAssetEditor();
  }

  function clearAssetEdit() {
    editingAssetId = null;
    selectedAssetPartId = null;
    setAssetFocus(false);
    refreshVisualAssets();
  }

  assetFilterEl.addEventListener("input", refreshVisualAssets);
  const collapseBtn = container.querySelector("#author-collapse");
  let _collapsed = false;
  function setCollapsed(v){
    _collapsed = v;
    container.style.transform = v ? "translateX(calc(-100% - 20px))" : "";
    collapseBtn.textContent = v ? "Show ▶" : "◀ Hide";
    collapseBtn.title = v ? "Show author panel" : "Collapse panel to see more play area";
    // Show a tiny floating tab when collapsed
    let tab = document.getElementById("author-collapsed-tab");
    if (v) {
      if (!tab) {
        tab = document.createElement("button");
        tab.id = "author-collapsed-tab";
        tab.textContent = "Show Author ▶";
        tab.style.cssText = "position:fixed;top:8px;left:8px;z-index:9998;padding:7px 10px;background:#0f1420f2;color:#d0d8e8;border:1px solid #2a3a5a;border-radius:6px;font:12px system-ui;backdrop-filter:blur(6px)";
        tab.addEventListener("click", () => setCollapsed(false));
        document.body.appendChild(tab);
      }
      tab.style.display = "";
    } else if (tab) tab.style.display = "none";
  }
  collapseBtn.addEventListener("click", () => setCollapsed(!_collapsed));
  // Keyboard shortcut: H to toggle
  window.addEventListener("keydown", (e) => { if (e.key.toLowerCase()==="h" && !e.ctrlKey && !e.metaKey && e.target && !/input|textarea|select/i.test(e.target.tagName)) setCollapsed(!_collapsed); });
  const resetViewBtn = container.querySelector("#author-reset-view");
  if (resetViewBtn) resetViewBtn.addEventListener("click", () => {
    try { if (window.__authorResetLevelView) window.__authorResetLevelView(); container.querySelector("#author-status").textContent = "View reset — orbit point is the orb + cross on ground"; } catch {}
  });
  const snapEl = container.querySelector("#author-snap");
  try { const saved = localStorage.getItem("wildkin.authorSnap"); if (saved !== null) snapEl.value = saved; } catch {}
  snapEl.addEventListener("change", () => { try { localStorage.setItem("wildkin.authorSnap", snapEl.value); } catch {} });
  // Snap grid hotkey: hold Shift for temporary free movement (inverts current snap setting)
  let _snapHotkeyFree = false;
  window.addEventListener("keydown", (e) => { if (e.key === "Shift" && !e.repeat) _snapHotkeyFree = true; });
  window.addEventListener("keyup", (e) => { if (e.key === "Shift") _snapHotkeyFree = false; });
  window.addEventListener("blur", () => _snapHotkeyFree = false);
  // expose helper for authorMode
  window.__authorSnapFree = () => _snapHotkeyFree;
  container.querySelector("#author-align-ground").addEventListener("click", () => {
    if (!selectedId) return setStatus("Select an object to align", true);
    const found = draftApi.findObjectById(selectedId);
    if (!found) return setStatus("Object not found", true);
    // Rest bottom on ground: for box-like objects height/2 above base, for visualAssets use visual bounds
    let targetY = 0;
    try {
      const obj = found.obj;
      // VisualAsset instance: use its visual bounds to find bottom offset
      if (obj.subtype === "visualAsset" && obj.visualAssetId) {
        const asset = draftApi.findVisualAssetById(obj.visualAssetId);
        if (asset) {
          // Find lowest point of any part (position.y - scale.y*0.5)
          let lowest = Infinity;
          for (const part of asset.parts) lowest = Math.min(lowest, part.position.y - part.scale.y * 0.5);
          const scale = obj.uniformScale ?? obj.scale ?? 1;
          targetY = -lowest * scale;
        }
      } else if (obj.size) {
        const h = obj.size.h ?? obj.size.height ?? obj.height ?? 1;
        targetY = h / 2;
      } else if (obj.height !== undefined) {
        targetY = (obj.height ?? 1) / 2;
      }
    } catch {}
    const curX = found.obj.pos?.x ?? found.obj.x ?? 0;
    const curZ = found.obj.pos?.z ?? found.obj.z ?? 0;
    const res = draftApi.updateTransform(selectedId, { pos: { x: curX, y: targetY, z: curZ } });
    if (!res.ok) setStatus(res.error, true); else { setStatus("Dropped — bottom now on ground", false); if (opts.onDraftChanged) opts.onDraftChanged(selectedId); }
  });

  container.querySelector("#author-asset-new").addEventListener("click", () => {
    const result = actions.createVisualAsset(`Visual Asset ${draftApi.getVisualAssets().length + 1}`);
    if (!result.ok) return setStatus(result.error, true);
    opts.onAssetEditRequested?.(result.assetId, result.partId);
  });
  container.querySelector("#author-asset-exit").addEventListener("click", () => opts.onAssetEditExitRequested?.());
  container.querySelector("#author-camera-left").addEventListener("click", () => opts.onAssetCameraOrbit?.(-1));
  container.querySelector("#author-camera-reset").addEventListener("click", () => opts.onAssetCameraReset?.());
  container.querySelector("#author-camera-right").addEventListener("click", () => opts.onAssetCameraOrbit?.(1));
  container.querySelector("#author-asset-name").addEventListener("change", (event) => {
    assetActionResult(actions.renameVisualAsset(editingAssetId, event.target.value), "Renamed Visual Asset");
  });
  container.querySelector("#author-asset-category").addEventListener("change", (event) => {
    assetActionResult(actions.updateVisualAssetSettings(editingAssetId, { category: event.target.value }), "Updated asset category");
  });
  for (const button of container.querySelectorAll("[data-asset-shape]")) {
    button.addEventListener("click", () => {
      const result = actions.addAssetPart(editingAssetId, button.dataset.assetShape);
      assetActionResult(result, `Added ${button.dataset.assetShape}`, result.partId);
    });
  }
  const partInputIds = new Set(["author-part-px","author-part-py","author-part-pz","author-part-rx","author-part-ry","author-part-rz","author-part-sx","author-part-sy","author-part-sz","author-part-color"]);
  container.querySelector("#author-asset-part-form").addEventListener("change", (event) => {
    if (!partInputIds.has(event.target.id) || !editingAssetId || !selectedAssetPartId) return;
    const number = (id) => Number(container.querySelector(`#${id}`).value);
    const patch = {
      position: { x: number("author-part-px"), y: number("author-part-py"), z: number("author-part-pz") },
      rotation: { x: number("author-part-rx") * Math.PI / 180, y: number("author-part-ry") * Math.PI / 180, z: number("author-part-rz") * Math.PI / 180 },
      scale: { x: number("author-part-sx"), y: number("author-part-sy"), z: number("author-part-sz") },
      color: container.querySelector("#author-part-color").value,
    };
    assetActionResult(actions.updateAssetPart(editingAssetId, selectedAssetPartId, patch), `Edited ${selectedAssetPartId}`);
  });
  container.querySelector("#author-part-duplicate").addEventListener("click", () => {
    const result = actions.duplicateAssetPart(editingAssetId, selectedAssetPartId);
    assetActionResult(result, "Duplicated part", result.partId);
  });
  container.querySelector("#author-part-delete").addEventListener("click", () => {
    const result = actions.deleteAssetPart(editingAssetId, selectedAssetPartId);
    assetActionResult(result, "Deleted part", null);
  });
  container.querySelector("#author-part-order-up").addEventListener("click", () => {
    assetActionResult(actions.reorderAssetPart(editingAssetId, selectedAssetPartId, -1), "Moved part earlier in harvest order");
  });
  container.querySelector("#author-part-order-down").addEventListener("click", () => {
    assetActionResult(actions.reorderAssetPart(editingAssetId, selectedAssetPartId, 1), "Moved part later — it will harvest sooner");
  });
  function nudgeSelectedPartY(delta) {
    const asset = draftApi.findVisualAssetById(editingAssetId);
    const part = asset?.parts.find((entry) => entry.id === selectedAssetPartId);
    if (!part) return;
    assetActionResult(actions.updateAssetPart(editingAssetId, selectedAssetPartId, { position: { y: part.position.y + delta } }), `Moved ${selectedAssetPartId} Y`);
  }
  container.querySelector("#author-part-up").addEventListener("click", () => nudgeSelectedPartY(0.2));
  container.querySelector("#author-part-down").addEventListener("click", () => nudgeSelectedPartY(-0.2));
  function rotateSelectedPartY(delta) {
    const asset = draftApi.findVisualAssetById(editingAssetId);
    const part = asset?.parts.find((entry) => entry.id === selectedAssetPartId);
    if (!part) return;
    assetActionResult(actions.updateAssetPart(editingAssetId, selectedAssetPartId, { rotation: { y: part.rotation.y + delta } }), `Rotated ${selectedAssetPartId}`);
  }
  container.querySelector("#author-part-rotate-left").addEventListener("click", () => rotateSelectedPartY(-15 * Math.PI / 180));
  container.querySelector("#author-part-rotate-right").addEventListener("click", () => rotateSelectedPartY(15 * Math.PI / 180));
  function commitAssetCollision() {
    const mode = container.querySelector("#author-asset-collision").value;
    if (mode === 'convexHull') return;
    if (mode === "none") return assetActionResult(actions.updateAssetCollision(editingAssetId, null), "Collision disabled");
    const number = (id) => Number(container.querySelector(`#${id}`).value);
    const collision = {
      shape: "box",
      size: { w: number("author-col-w") || 1, h: number("author-col-h") || 1, d: number("author-col-d") || 1 },
      offset: { x: number("author-col-x") || 0, y: number("author-col-y") || 0.5, z: number("author-col-z") || 0 },
    };
    assetActionResult(actions.updateAssetCollision(editingAssetId, collision), "Collision updated");
  }
  container.querySelector("#author-asset-collision").addEventListener("change", commitAssetCollision);
  container.querySelector("#author-asset-collision-fields").addEventListener("change", commitAssetCollision);
  container.querySelector("#author-asset-fit").addEventListener("click", () => assetActionResult(actions.fitAssetCollision(editingAssetId), "Collision fit to visual bounds"));
  function commitAssetGameplay() {
    const role = container.querySelector("#author-asset-role").value;
    let gameplay;
    if (role === "harvestable") {
      gameplay = {
          role,
          harvestable: {
            dropId: container.querySelector("#author-asset-drop").value,
            maxChunks: Number(container.querySelector("#author-asset-hits").value) || 3,
            respawnSeconds: Number(container.querySelector("#author-asset-respawn").value) || 15,
            feedbackProfile: container.querySelector("#author-asset-feedback").value,
            remnantVisualAssetId: container.querySelector("#author-asset-remnant").value || null,
          },
        };
    } else if (role === "wildkin") {
      gameplay = {
        role,
        wildkin: {
          archetype: container.querySelector("#author-wildkin-archetype").value,
          temperament: container.querySelector("#author-wildkin-temperament").value,
          speciesTag: container.querySelector("#author-wildkin-species").value.trim() || "wildkin",
          hostileSpecies: container.querySelector("#author-wildkin-hostile").value.split(",").map((tag) => tag.trim()).filter(Boolean),
          health: Number(container.querySelector("#author-wildkin-health").value) || 3,
          damage: Number(container.querySelector("#author-wildkin-damage").value) || 0,
          moveSpeed: Number(container.querySelector("#author-wildkin-speed").value) || 2,
          respawnSeconds: Number(container.querySelector("#author-wildkin-respawn").value) || 10,
          roamRadius: Number(container.querySelector("#author-wildkin-roam").value) || 0,
          noticeRadius: Number(container.querySelector("#author-wildkin-notice").value) || 5.5,
          personalSpace: Number(container.querySelector("#author-wildkin-personal").value) || 2,
          leashRadius: Number(container.querySelector("#author-wildkin-leash").value) || 7.5,
        },
      };
    } else gameplay = { role: "prop" };
    assetActionResult(actions.updateVisualAssetSettings(editingAssetId, { gameplay }), `Asset type: ${role}`);
  }
  for (const btn of container.querySelectorAll("[data-role-tab]")) {
    btn.addEventListener("click", () => {
      container.querySelector("#author-asset-role").value = btn.dataset.roleTab;
      container.querySelector("#author-asset-role").dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  container.querySelector("#author-asset-role").addEventListener("change", (event) => {
    if (event.target.value === "harvestable") {
      const drops = draftApi.getResourceDrops();
      container.querySelector("#author-asset-drop").value = drops[0]?.id ?? "wood";
      const asset = draftApi.findVisualAssetById(editingAssetId);
      container.querySelector("#author-asset-hits").value = Math.max(1, Math.min(12, asset?.parts.length ?? 3));
      container.querySelector("#author-asset-respawn").value = 15;
      container.querySelector("#author-asset-feedback").value = "fiber";
      container.querySelector("#author-asset-remnant").value = "";
    } else if (event.target.value === "wildkin") {
      for (const [id, value] of [
        ["author-wildkin-archetype", "rusher"], ["author-wildkin-temperament", "AGGRESSIVE"],
        ["author-wildkin-species", "wildkin"], ["author-wildkin-hostile", ""],
        ["author-wildkin-health", 3], ["author-wildkin-damage", 1], ["author-wildkin-speed", 2.5],
        ["author-wildkin-respawn", 10], ["author-wildkin-roam", 2.5], ["author-wildkin-notice", 5.5],
        ["author-wildkin-personal", 2], ["author-wildkin-leash", 7.5],
      ]) container.querySelector(`#${id}`).value = value;
    }
    commitAssetGameplay();
  });
  for (const id of ["author-asset-drop", "author-asset-hits", "author-asset-respawn", "author-asset-feedback", "author-asset-remnant"]) {
    container.querySelector(`#${id}`).addEventListener("change", commitAssetGameplay);
  }
  for (const id of ["author-wildkin-archetype", "author-wildkin-temperament", "author-wildkin-species", "author-wildkin-hostile", "author-wildkin-health", "author-wildkin-damage", "author-wildkin-speed", "author-wildkin-respawn", "author-wildkin-roam", "author-wildkin-notice", "author-wildkin-personal", "author-wildkin-leash"]) {
    container.querySelector(`#${id}`).addEventListener("change", commitAssetGameplay);
  }
  container.querySelector("#author-drop-visual").addEventListener("change", (event) => {
    const dropId = container.querySelector("#author-asset-drop").value;
    assetActionResult(actions.updateResourceDrop(dropId, { visualAssetId: event.target.value || null }), "Updated pickup model");
  });
  container.querySelector("#author-drop-visual-edit").addEventListener("click", () => {
    const dropId = container.querySelector("#author-asset-drop").value;
    const drop = draftApi.getResourceDrops().find((entry) => entry.id === dropId);
    if (drop?.visualAssetId) opts.onAssetEditRequested?.(drop.visualAssetId);
  });
  container.querySelector("#author-drop-visual-new").addEventListener("click", () => {
    const dropId = container.querySelector("#author-asset-drop").value;
    const drop = draftApi.getResourceDrops().find((entry) => entry.id === dropId);
    const created = actions.createVisualAsset(`${drop?.displayName ?? "Pickup"} Pickup`);
    if (!created.ok) return setStatus(created.error, true);
    const assigned = actions.updateResourceDrop(dropId, { visualAssetId: created.assetId });
    if (!assigned.ok) return setStatus(assigned.error, true);
    opts.onAssetEditRequested?.(created.assetId, created.partId);
  });
  container.querySelector("#author-drop-create").addEventListener("click", () => {
    const result = actions.createResourceDrop({
      id: container.querySelector("#author-drop-id").value,
      displayName: container.querySelector("#author-drop-name").value,
      color: container.querySelector("#author-drop-color").value,
    });
    if (!result.ok) return setStatus(result.error, true);
    refreshAssetEditor();
    container.querySelector("#author-asset-drop").value = result.dropId;
    commitAssetGameplay();
    container.querySelector("#author-drop-id").value = "";
    container.querySelector("#author-drop-name").value = "";
  });
  container.querySelector("#author-asset-delete").addEventListener("click", () => {
    const deletedId = editingAssetId;
    const result = actions.deleteVisualAsset(deletedId);
    if (assetActionResult(result, "Deleted Visual Asset", null)) opts.onAssetEditExitRequested?.();
  });

  function refreshRegionSelects() {
    const regions = draftApi.getDraft().regions;
    const curSel = regionSelectEl.value;
    regionSelectEl.innerHTML = "";
    selRegionEl.innerHTML = "";
    for (const r of regions) {
      const o1 = document.createElement("option"); o1.value = r.id; o1.textContent = r.displayName ? `${r.displayName} (${r.id})` : r.id; regionSelectEl.appendChild(o1);
      const o2 = document.createElement("option"); o2.value = r.id; o2.textContent = r.id; selRegionEl.appendChild(o2);
    }
    if (regions.find(r => r.id === curSel)) regionSelectEl.value = curSel;
    else if (regions[0]) regionSelectEl.value = regions[0].id;
    refreshRegionForm();
  }
  function refreshRegionForm() {
    const rid = regionSelectEl.value;
    const r = draftApi.findRegion(rid);
    if (!r) return;
    landscapeEditor.refresh(r);
    container.querySelector("#author-region-name").value = r.displayName || "";
    // Render neighbors as checkboxes for friendliness
    const host = container.querySelector("#author-region-neighbors");
    const hidden = container.querySelector("#author-region-neighbors-input");
    if (host) {
      host.innerHTML = "";
      const all = draftApi.getDraft().regions;
      const curSet = new Set(r.neighbors || []);
      for (const other of all) if (other.id !== r.id) {
        const label = document.createElement("label");
        label.style.cssText = "display:flex;gap:2px;align-items:center;font-size:10px;background:#111a2a;border:1px solid #2a3a5a;border-radius:3px;padding:2px 4px;cursor:pointer";
        const cb = document.createElement("input"); cb.type="checkbox"; cb.value=other.id; cb.checked = curSet.has(other.id);
        cb.addEventListener("change", () => {
          const vals = Array.from(host.querySelectorAll("input:checked")).map(i=>i.value);
          hidden.value = vals.join(", ");
        });
        label.append(cb, document.createTextNode(other.id));
        host.append(label);
      }
      hidden.value = (r.neighbors || []).join(", ");
      if (all.length <= 1) host.textContent = "No other regions yet — create one first";
    } else {
      const fallback = container.querySelector("#author-region-neighbors");
      if (fallback) fallback.value = (r.neighbors || []).join(", ");
    }
    container.querySelector("#author-b-minX").value = r.bounds.minX;
    container.querySelector("#author-b-maxX").value = r.bounds.maxX;
    container.querySelector("#author-b-minZ").value = r.bounds.minZ;
    container.querySelector("#author-b-maxZ").value = r.bounds.maxZ;
    const summary = opts.getSectionSummary?.(rid);
    const summaryEl = container.querySelector("#author-section-summary");
    if (summaryEl) summaryEl.textContent = summary ?? "No section profile targets authored.";
  }
  const hierarchyEl = container.querySelector("#author-hierarchy");
  const filterEl = container.querySelector("#author-filter");
  // Region: New + Focus helpers
  const newBtn = container.querySelector("#author-region-new");
  if (newBtn) newBtn.addEventListener("click", () => {
    const base = draftApi.getDraft().regions[0];
    const draft = draftApi.getDraft();
    const cx = 0, cz = 0, size = 50;
    const id = "section_" + Date.now().toString(36).slice(-4);
    const res = draftApi.createRegion ? draftApi.createRegion({ id, displayName: "New Section", bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 }, neighbors: [] }) : null;
    if (!res || !res.ok) {
      // Fallback: direct transact via draftApi if createRegion not available — do minimal region push
      try {
        const cur = draftApi.getDraft();
        cur.regions.push({ id, displayName: "New Area", bounds: { minX: cx-size/2, maxX: cx+size/2, minZ: cz-size/2, maxZ: cz+size/2 }, neighbors: [], props: [], resources: [], creatures: [], majorWaypoints: [], extractionBeacons: [], pois: [], traversal: { platforms:[], obstacles:[], climbables:[] }, groundPatches: [], boundaryColliders: [] });
        // Use transact-like: we don't have direct, so use updateRegion path? Just persist via setDraft
        draftApi.setDraft(cur);
        refreshRegionSelects();
        regionSelectEl.value = id;
        refreshRegionForm();
        setStatus("Created region " + id + " — adjust bounds and Apply", false);
        if (opts.onSelectRegion) opts.onSelectRegion();
      } catch (e) { setStatus(e.message || String(e), true); }
    } else {
      refreshRegionSelects();
      regionSelectEl.value = id;
      refreshRegionForm();
      setStatus("Created region " + id, false);
    }
  });
  const focusBtn = container.querySelector("#author-region-focus");
  if (focusBtn) focusBtn.addEventListener("click", () => {
    const rid = regionSelectEl.value;
    const r = draftApi.findRegion(rid);
    if (!r) return setStatus("Region not found", true);
    if (opts.onFocusRegion) opts.onFocusRegion(rid);
    else setStatus("Focused " + rid, false);
  });
  if (filterEl) filterEl.addEventListener("input", refreshHierarchy);
  let expandedState = new Map();
  function saveExpandedState() {
    expandedState.clear();
    for (const det of hierarchyEl.querySelectorAll("details")) {
      const key = det.dataset.key;
      if (key) expandedState.set(key, det.open);
    }
  }
  function isExpanded(key, fallback) {
    if (filterEl?.value) return true;
    if (expandedState.has(key)) return expandedState.get(key);
    return fallback;
  }
  function revealHierarchySelection(found) {
    if (!found?.region) return;
    const categoryByCollection = {
      groundPatches: "ground", boundaryColliders: "boundaries", props: "props",
      platforms: "traversal", obstacles: "traversal", climbables: "traversal",
      resources: "resources", creatures: "wildkin", majorWaypoints: "anchors",
      extractionBeacons: "anchors", pois: "pois",
    };
    let category = categoryByCollection[found.collection]
      ?? (found.type === "campSpawn" || found.type === "runSpawn" ? "spawns" : null);
    if (found.collection === "props" && found.obj.subtype === "visualAsset") {
      const role = draftApi.findVisualAssetById(found.obj.visualAssetId)?.gameplay?.role;
      if (role === "harvestable") category = "resources";
      if (role === "wildkin") category = "wildkin";
    }
    expandedState.set(`region:${found.region.id}`, true);
    if (category) expandedState.set(`cat:${found.region.id}:${category}`, true);
  }
  function refreshHierarchy({ preserveExpandedState = false } = {}) {
    if (!preserveExpandedState) saveExpandedState();
    if (!hierarchyEl) return;
    const draft = draftApi.getDraft();
    const filter = (filterEl?.value || "").toLowerCase().trim();
    // preserve scroll
    const scrollTop = hierarchyEl.scrollTop;
    hierarchyEl.innerHTML = "";
    for (const region of draft.regions.filter((entry) => entry.id === regionSelectEl.value)) {
      const visualAssetRole = (prop) => draft.visualAssets.find((asset) => asset.id === prop.visualAssetId)?.gameplay?.role ?? "prop";
      const decorativeProps = (region.props ?? []).filter((prop) => prop.subtype !== "visualAsset" || visualAssetRole(prop) === "prop");
      const assetResources = (region.props ?? []).filter((prop) => prop.subtype === "visualAsset" && visualAssetRole(prop) === "harvestable");
      const assetWildkin = (region.props ?? []).filter((prop) => prop.subtype === "visualAsset" && visualAssetRole(prop) === "wildkin");
      // Build categories, including virtual spawns
      const spawnItems = [];
      if (region.id === "camp") {
        const campSpawn = draftApi.findObjectById("camp_spawn");
        if (campSpawn) spawnItems.push({ id: "camp_spawn", type: "campSpawn", displayName: "Camp Spawn", pos: campSpawn.obj.pos });
      }
      for (const wp of region.majorWaypoints ?? []) {
        const rsId = wp.id + "__runSpawn";
        const rs = draftApi.findObjectById(rsId);
        if (rs) spawnItems.push({ id: rsId, type: "runSpawn", displayName: `${wp.displayName ?? wp.id} Run Spawn`, parentWp: wp.id, pos: rs.obj.pos });
      }
      const cats = [
        { label: "Ground", items: region.groundPatches ?? [], key: "ground" },
        { label: "Boundaries / Colliders", items: region.boundaryColliders ?? [], key: "boundaries" },
        { label: "Props", items: decorativeProps, key: "props" },
        { label: "Traversal", items: [...(region.traversal?.platforms??[]), ...(region.traversal?.obstacles??[]), ...(region.traversal?.climbables??[]), ...(region.jumpPads??[]), ...(region.parkourStarts??[]), ...(region.parkourCheckpoints??[]), ...(region.parkourEnds??[]), ...(region.parkourCourseZones??[]), ...(region.killVolumes??[])] , key: "traversal" },
        { label: "Resources", items: [...(region.resources ?? []), ...assetResources], key: "resources" },
        { label: "Wildkin", items: [...(region.creatures ?? []), ...assetWildkin], key: "wildkin" },
        { label: "Anchors", items: [...(region.majorWaypoints??[]), ...(region.extractionBeacons??[]), ...(region.entryPoints??[]), ...(region.portalGates??[])] , key: "anchors" },
        { label: "Spawns", items: spawnItems, key: "spawns" },
        { label: "POIs", items: [...(region.pois ?? []), ...(region.lootChests ?? [])], key: "pois" },
      ];
      let hasVisible = !filter || region.id.toLowerCase().includes(filter) || (region.displayName&&region.displayName.toLowerCase().includes(filter));
      for (const c of cats) for (const o of c.items) if (!filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter))) hasVisible=true;
      if (!hasVisible) continue;
      const regionKey = `region:${region.id}`;
      const det = document.createElement("details"); det.dataset.key = regionKey; det.open = isExpanded(regionKey, region.id===regionSelectEl.value); det.style.marginBottom="4px";
      const sum = document.createElement("summary"); sum.textContent = region.id; sum.style.cursor="pointer"; sum.style.fontWeight="700"; det.appendChild(sum);
      for (const cat of cats) {
        if (cat.items.length===0) continue;
        const filtered = cat.items.filter(o=> !filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter)));
        if (filtered.length===0) continue;
        const catKey = `cat:${region.id}:${cat.key}`;
        const catDet = document.createElement("details"); catDet.dataset.key = catKey; catDet.style.marginLeft="8px"; catDet.open = isExpanded(catKey, !!filter);
        const catSum = document.createElement("summary"); catSum.textContent = `${cat.label} (${filtered.length})`; catSum.style.cursor="pointer"; catSum.style.color="#8aa0c0"; catDet.appendChild(catSum);
        for (const obj of filtered) {
          const label = obj.displayName ? `${obj.id} [${obj.type ?? obj.subtype} · ${obj.displayName}]` : obj.id + (obj.type?` [${obj.type}]`: obj.subtype?` [${obj.subtype}]`:"");
          const row = document.createElement("div"); row.textContent = label; row.dataset.id = obj.id; row.style.padding="2px 4px"; row.style.borderRadius="3px"; row.style.cursor="pointer"; row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center";
          if (obj.id===selectedId) { row.style.background="#2a3a5a"; row.style.color="#ffd54f"; }
          row.addEventListener("click", ()=>{ setSelected(obj.id); opts.onDraftChanged?.(obj.id); });
          const focusBtn = document.createElement("button"); focusBtn.textContent="◉"; focusBtn.title="Focus camera"; focusBtn.style.cssText="font-size:10px;padding:1px 4px;margin-left:4px;background:#1a243a;color:#8aa0c0;border:1px solid #2a3a5a;border-radius:3px;cursor:pointer";
          focusBtn.addEventListener("click", (e)=>{ e.stopPropagation(); opts.onFocusObject?.(obj.id); });
          row.appendChild(focusBtn);
          row.addEventListener("dblclick", ()=> opts.onFocusObject?.(obj.id));
          catDet.appendChild(row);
          if (obj.id===selectedId) setTimeout(()=> row.scrollIntoView({ block:"nearest" }), 0);
        }
        det.appendChild(catDet);
      }
      hierarchyEl.appendChild(det);
    }
    hierarchyEl.scrollTop = scrollTop;
  }
  regionSelectEl.addEventListener("change", () => {
    refreshRegionForm();
    refreshHierarchy();
    opts.onSelectRegion?.(regionSelectEl.value);
  });
  container.querySelector("#author-region-apply").addEventListener("click", () => {
    const rid = regionSelectEl.value;
    const patch = {
      displayName: container.querySelector("#author-region-name").value,
      neighbors: (container.querySelector("#author-region-neighbors-input")?.value || container.querySelector("#author-region-neighbors")?.value || "").split(",").map(s=>s.trim()).filter(Boolean),
      bounds: {
        minX: parseFloat(container.querySelector("#author-b-minX").value),
        maxX: parseFloat(container.querySelector("#author-b-maxX").value),
        minZ: parseFloat(container.querySelector("#author-b-minZ").value),
        maxZ: parseFloat(container.querySelector("#author-b-maxZ").value),
      }
    };
    const res = draftApi.updateRegion(rid, patch);
    const st = container.querySelector("#author-region-status");
    if (res.ok) {
      const v = draftApi.validate();
      if (v.ok) { st.textContent = "Region applied — validated"; st.style.color="#aaffaa"; if (onSelectRegion) onSelectRegion(rid); refreshHierarchy(); }
      else { st.textContent = v.error; st.style.color="#ffaaaa"; }
    } else { st.textContent = res.error; st.style.color="#ffaaaa"; }
  });

  function readPath(object, path) {
    return path.split(".").reduce((value, key) => value?.[key], object);
  }

  function fieldId(key) {
    return `author-field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function renderCustomFields(found, def) {
    const host = container.querySelector("#author-custom-fields");
    host.innerHTML = "";
    const fields = def?.inspector ?? [];
    host.style.display = fields.length ? "" : "none";
    for (const field of fields) {
      const label = document.createElement("label");
      label.style.cssText = field.type === "boolean"
        ? "display:flex;align-items:center;gap:6px;margin:4px 0"
        : "display:block;margin:4px 0";
      label.append(document.createTextNode(field.label + " "));
      let input;
      if (field.type === "enum" || field.type === "visualAsset") {
        input = document.createElement("select");
        const options = field.type === "visualAsset"
          ? [{ value: "", label: "Default built-in model" }, ...draftApi.getVisualAssets().map((asset) => ({ value: asset.id, label: asset.displayName }))]
          : (field.options ?? []).map((option) => ({ value: option, label: option }));
        for (const option of options) {
          const optionEl = document.createElement("option");
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          input.append(optionEl);
        }
      } else {
        input = document.createElement("input");
        input.type = field.type === "number" ? "number" : field.type === "boolean" ? "checkbox" : "text";
        if (field.type === "number") {
          if (field.min !== undefined) input.min = field.min;
          if (field.max !== undefined) input.max = field.max;
          input.step = field.step ?? "0.1";
        }
        if (field.type === "json") input.placeholder = "null or JSON object";
      }
      input.id = fieldId(field.key);
      input.dataset.authorField = field.key;
      input.dataset.authorFieldType = field.type;
      if (field.editorOnly) input.dataset.authorEditorOnly = "true";
      input.style.width = field.type === "boolean" ? "auto" : "100%";
      const raw = field.editorOnly
        ? (field.defaultValue ?? false)
        : readPath(found.obj, field.path ?? field.key);
      if (field.type === "boolean") input.checked = !!raw;
      else if (field.type === "json") input.value = raw == null ? "" : JSON.stringify(raw);
      else input.value = raw ?? "";
      label.append(input);
      host.append(label);
    }
  }

  function setSelected(id) {
    selectedId = id;
    if (!id) {
      selectedNone.style.display = "";
      selectedForm.style.display = "none";
      return;
    }
    const found = draftApi.findObjectById(id);
    if (!found) { selectedId = null; selectedNone.style.display=""; selectedForm.style.display="none"; return; }
    revealHierarchySelection(found);
    selectedNone.style.display="none";
    selectedForm.style.display="";
    selIdEl.textContent = `${found.type} — ${found.obj.id} — region: ${found.region ? found.region.id : "camp"}`;
    if (found.region) selRegionEl.value = found.region.id;
    const obj = found.obj;
    // Registry-driven transform display: use normalized author transform
    const def = resolveAuthorType(found);
    const caps = def ? def.capabilities : null;
    const norm = readNormalizedTransform(found);
    const nPos = norm ? norm.position : (obj.pos || { x: obj.x ?? 0, y: obj.baseY ?? obj.y ?? 0, z: obj.z ?? 0 });
    const nRot = norm ? (norm.rotationY ?? 0) : (obj.facingYaw ?? obj.rotY ?? 0);
    container.querySelector("#author-x").value = nPos.x ?? 0;
    container.querySelector("#author-z").value = nPos.z ?? 0;
    container.querySelector("#author-y").value = nPos.y ?? 0;
    const rotYdeg = (nRot * 180 / Math.PI).toFixed(1);
    container.querySelector("#author-rot").value = rotYdeg;
    // Size handling: box vs uniform
    const size = norm && norm.size ? norm.size : (obj.size || {});
    const uniformScale = norm ? (norm.uniformScale ?? 1) : 1;
    container.querySelector("#author-w").value = size.width ?? size.w ?? obj.w ?? "";
    container.querySelector("#author-h").value = size.depth ?? size.d ?? obj.h ?? "";
    container.querySelector("#author-height").value = size.height ?? obj.height ?? size.h ?? "";
    container.querySelector("#author-scale").value = uniformScale;
    const yRow = container.querySelector("#row-y");
    const rotWrap = container.querySelector("#wrap-rot");
    const sizeRow = container.querySelector("#row-size");
    const scaleRow = container.querySelector("#row-scale");
    const upBtn = container.querySelector("#author-up");
    const downBtn = container.querySelector("#author-down");
    const ySupported = caps ? !!caps.elevation : true;
    const rotSupported = caps ? !!caps.rotation : false;
    const resizeSupported = caps ? !!caps.resize : false;
    const sizeMode = caps ? (caps.sizeMode ?? def.sizeMode) : "box";
    yRow.style.display = ySupported ? "" : "none";
    upBtn.style.display = ySupported ? "" : "none";
    downBtn.style.display = ySupported ? "" : "none";
    rotWrap.style.display = rotSupported ? "" : "none";
    if (resizeSupported) {
      if (sizeMode === "uniform") {
        sizeRow.style.display = "none";
        scaleRow.style.display = "";
      } else if (sizeMode === "box") {
        sizeRow.style.display = "";
        scaleRow.style.display = "none";
      } else {
        sizeRow.style.display = "none";
        scaleRow.style.display = "none";
      }
    } else {
      sizeRow.style.display = "none";
      scaleRow.style.display = "none";
    }
    const presentation = container.querySelector("#author-presentation");
    const showPres = !!(caps?.presentation || caps?.collisionControl);
    if (showPres) {
      presentation.style.display = "";
      const visibleEl = container.querySelector("#author-visible");
      visibleEl.closest("label").style.display = caps.presentation ? "" : "none";
      visibleEl.checked = obj.visibleInPlay !== false;
      const collEl = container.querySelector("#author-collision");
      const collRow = collEl.closest("label");
      collRow.style.display = caps.collisionControl ? "" : "none";
      collEl.checked = getColliderDescriptor(found)?.enabled ?? (obj.collisionEnabled !== false);
      container.querySelector("#author-opacity").value = obj.opacity ?? 1;
      const tintVal = obj.color ?? obj.tint ?? "";
      let hex = "";
      if (typeof tintVal === "number") hex = "#" + tintVal.toString(16).padStart(6,"0");
      else if (typeof tintVal === "string") hex = tintVal.startsWith("#") ? tintVal : "#"+tintVal;
      else hex = "#ffffff";
      // color input expects valid hex, default to white if none
      const colorInput = container.querySelector("#author-tint");
      const textInput = container.querySelector("#author-tint-text");
      if (obj.color !== undefined || obj.tint !== undefined) {
        try { colorInput.value = hex; textInput.value = hex; } catch { colorInput.value = "#ffffff"; textInput.value = ""; }
      } else {
        colorInput.value = "#ffffff"; textInput.value = "";
      }
    } else presentation.style.display = "none";

    renderCustomFields(found, def);
    refreshHierarchy({ preserveExpandedState: true });
    container.querySelector("#author-duplicate").style.display = caps?.duplicatable ? "" : "none";
    container.querySelector("#author-delete").style.display = caps?.deletable ? "" : "none";
  }

  const commonTransformIds = new Set([
    "author-x", "author-y", "author-z", "author-rot",
    "author-w", "author-h", "author-height", "author-scale",
  ]);

  function parseNumber(id) {
    const value = Number(container.querySelector(`#${id}`).value);
    return Number.isFinite(value) ? value : undefined;
  }

  function commitCommonTransform() {
    if (!selectedId) return;
    const moveHome = container.querySelector('[data-author-field="moveHomeWithSpawn"]');
    const result = actions.commitInspectorTransform(selectedId, {
      x: parseNumber("author-x"),
      y: parseNumber("author-y"),
      z: parseNumber("author-z"),
      rotationY: (parseNumber("author-rot") ?? 0) * Math.PI / 180,
      width: parseNumber("author-w"),
      depth: parseNumber("author-h"),
      height: parseNumber("author-height"),
      uniformScale: parseNumber("author-scale"),
      moveHomeWithSpawn: moveHome ? moveHome.checked : undefined,
    });
    if (!result.ok) {
      setStatus(result.error, true);
      setSelected(selectedId);
      return;
    }
    setStatus(`Edited — ${selectedId}`, false);
    opts.onDraftChanged?.(selectedId);
  }

  container.querySelector("#author-selected-form").addEventListener("change", (event) => {
    if (!selectedId) return;
    const input = event.target;
    if (commonTransformIds.has(input.id)) {
      commitCommonTransform();
      return;
    }
    const presentationMap = {
      "author-visible": ["visibleInPlay", input.checked],
      "author-collision": ["collisionEnabled", input.checked],
      "author-opacity": ["opacity", Number(input.value)],
      "author-tint-text": ["color", input.value.trim() || undefined],
      "author-tint": ["color", input.value],
    };
    if (presentationMap[input.id]) {
      const [key, value] = presentationMap[input.id];
      const result = actions.commitInspectorField(selectedId, key, value);
      if (!result.ok) setStatus(result.error, true);
      else { setStatus(`Edited — ${selectedId}`, false); opts.onDraftChanged?.(selectedId); }
      return;
    }
    const key = input.dataset.authorField;
    if (!key || input.dataset.authorEditorOnly === "true") return;
    const type = input.dataset.authorFieldType;
    const value = type === "number" ? Number(input.value) : type === "boolean" ? input.checked : input.value;
    const result = actions.commitInspectorField(selectedId, key, value);
    if (!result.ok) {
      setStatus(result.error, true);
      setSelected(selectedId);
      return;
    }
    setStatus(`Edited ${key} — ${selectedId}`, false);
    opts.onDraftChanged?.(selectedId);
  });
  // Tint color picker live sync to text
  const tintColorInput = container.querySelector("#author-tint");
  const tintTextInput = container.querySelector("#author-tint-text");
  if (tintColorInput && tintTextInput) {
    tintColorInput.addEventListener("input", () => { tintTextInput.value = tintColorInput.value; });
    tintTextInput.addEventListener("input", () => {
      const v = tintTextInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) tintColorInput.value = v;
    });
  }
  selRegionEl.addEventListener("change", () => {
    if (!selectedId) return;
    const newRegion = selRegionEl.value;
    const found = draftApi.findObjectById(selectedId);
    const normalized = found ? readNormalizedTransform(found) : null;
    const res = normalized
      ? draftApi.updateNormalizedTransform(selectedId, { ...normalized, regionId: newRegion })
      : { ok: false, error: "object is not authorable" };
    if (res.ok) {
      const v = draftApi.validate();
      if (!v.ok) statusEl.textContent = "⚠ " + v.error;
      else statusEl.textContent = "Moved to " + newRegion;
      opts.onDraftChanged?.(selectedId, undefined, "structural");
    } else statusEl.textContent = res.error;
  });

  container.querySelector("#author-duplicate").addEventListener("click", () => {
    if (!selectedId) return;
    const res = draftApi.duplicateObject(selectedId);
    if (res.ok) {
      statusEl.textContent = "Duplicated → " + res.newId;
      statusEl.style.color="#aaffaa";
      refreshRegionSelects(); refreshHierarchy();
      setSelected(res.newId);
      opts.onDraftChanged?.(res.newId, undefined, "structural");
      opts.onSelectNew?.(res.newId);
    } else statusEl.textContent = res.error;
  });
  container.querySelector("#author-delete").addEventListener("click", () => {
    if (!selectedId) return;
    const res = draftApi.deleteObject(selectedId);
    if (res.ok) {
      statusEl.textContent = "Deleted " + selectedId;
      const deleted = selectedId;
      setSelected(null);
      refreshRegionSelects(); refreshHierarchy();
      opts.onDraftChanged?.(null, deleted, "structural");
    } else statusEl.textContent = res.error;
  });
  for (const btn of container.querySelectorAll(".nudge")) {
    btn.addEventListener("click", () => {
      if (!selectedId) return;
      const dx = parseFloat(btn.dataset.dx);
      const dz = parseFloat(btn.dataset.dz);
      const found = draftApi.findObjectById(selectedId);
      if (!found) return;
      const normalized = readNormalizedTransform(found);
      if (!normalized) return;
      const res = actions.commitTransform(selectedId, {
        position: { ...normalized.position, x: normalized.position.x + dx, z: normalized.position.z + dz },
      });
      if(!res.ok){ statusEl.textContent = res.error; statusEl.style.color="#ffaaaa"; return; }
      setSelected(selectedId);
      const v = draftApi.validate();
      statusEl.textContent = v.ok ? `Nudged ${dx},${dz}` : v.error;
      opts.onDraftChanged?.(selectedId);
    });
  }
  container.querySelector("#author-up").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    const normalized = readNormalizedTransform(f);
    if (!normalized) return;
    const res = actions.commitTransform(selectedId, { position: { ...normalized.position, y: normalized.position.y + 0.2 } });
    if(!res.ok) { statusEl.textContent=res.error; statusEl.style.color="#ffaaaa"; return; }
    setSelected(selectedId); opts.onDraftChanged?.(selectedId);
  });
  container.querySelector("#author-down").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    const normalized = readNormalizedTransform(f);
    if (!normalized) return;
    const res = actions.commitTransform(selectedId, { position: { ...normalized.position, y: Math.max(-1, normalized.position.y - 0.2) } });
    if(!res.ok) { statusEl.textContent=res.error; statusEl.style.color="#ffaaaa"; return; }
    setSelected(selectedId); opts.onDraftChanged?.(selectedId);
  });

  toggleBtn.addEventListener("click", () => {
    if(!editMode){
      // currently in PLAY, want to go to EDIT - always allowed
      editMode = true;
      toggleBtn.textContent = "PLAY";
      toggleBtn.style.background = "#1a8a4a";
      badge.textContent = "EDITING";
      badge.style.background = "#1a3a2a";
      badge.style.color = "#6aff8a";
      statusEl.textContent = "EDIT — drag objects, click palette then world";
      opts.onToggleEdit?.(true);
      return;
    } else {
      // currently in EDIT, wants PLAY - validate first before any state change
      const v = draftApi.validate();
      if (!v.ok) {
        statusEl.textContent = "⚠ " + v.error;
        statusEl.style.color="#ffaaaa";
        // stay in EDIT, no state change
        return;
      }
      editMode = false;
      toggleBtn.textContent = "EDIT";
      toggleBtn.style.background = "#2a7fff";
      badge.textContent = "PLAY TEST";
      badge.style.background = "#1a243a";
      badge.style.color = "#8aa0c0";
      statusEl.textContent = "PLAY — testing draft";
      opts.onToggleEdit?.(false);
      onPlay?.();
    }
  });

  container.querySelector("#author-validate").addEventListener("click", () => {
    const v = draftApi.validate();
    if (v.ok) { statusEl.textContent = "✓ Valid — " + draftApi.getDraft().regions.length + " regions"; statusEl.style.color="#aaffaa"; if (onValidate) onValidate(true); }
    else { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; if (onValidate) onValidate(false, v.error); }
  });
  container.querySelector("#author-campaign-readiness").addEventListener("click", () => {
    const report = analyzeCampaign(draftApi.getDraft());
    const reportEl = container.querySelector("#author-campaign-report");
    const route = report.sections.map((section) => `${section.id}: XP ${section.xp} · L${section.level} · renewable ${Object.entries(section.renewableResources).filter(([, amount]) => amount > 0).map(([id, amount]) => `${id}:${amount}`).join(" ")}${section.unreachable.length ? ` · unreachable ${section.unreachable.join(", ")}` : ""}`);
    const findings = report.errors.length ? report.errors.map((error) => `ERROR: ${error}`) : ["READY: campaign route, gates, renewable resources, companions, and finale checks passed."];
    reportEl.textContent = ["CAMPAIGN READINESS — CURRENT DRAFT", ...findings, "", ...route, "", ...report.warnings.map((warning) => `NOTE: ${warning}`)].join("\n");
    reportEl.style.display = "block";
    statusEl.textContent = report.errors.length ? `⚠ Campaign readiness found ${report.errors.length} issue${report.errors.length === 1 ? "" : "s"}` : "✓ Campaign readiness passed — coarse walkability remains an estimate";
    statusEl.style.color = report.errors.length ? "#ffaaaa" : "#aaffaa";
  });
  container.querySelector("#author-export").addEventListener("click", () => {
    const v = draftApi.validate();
    if (!v.ok) { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; return; }
    const json = draftApi.exportStableJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "world.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(()=>{});
    statusEl.textContent = "Exported world.json — replace src/world/data/world.json then npm run world:generate";
    statusEl.style.color="#aaffaa";
  });
  container.querySelector("#author-reset").addEventListener("click", () => {
    if (confirm("Reset draft to repo world.json? This clears local edits.")) {
      draftApi.clearPersisted(); draftApi.cloneRepo(); refreshRegionSelects(); setSelected(null);
      statusEl.textContent = "Reset to repo — reloading..."; setTimeout(()=>window.location.reload(),300);
    }
  });

  function show() { container.style.display = ""; refreshRegionSelects(); refreshHierarchy(); refreshVisualAssets(); }
  function hide() { container.style.display = "none"; }
  function isEditMode() { return editMode; }
  function setEditMode(nextEditMode) {
    editMode = !!nextEditMode;
    toggleBtn.textContent = editMode ? "PLAY" : "EDIT";
    toggleBtn.style.background = editMode ? "#1a8a4a" : "#2a7fff";
    badge.textContent = editMode ? "EDITING" : "PLAY TEST";
    badge.style.background = editMode ? "#1a3a2a" : "#1a243a";
    badge.style.color = editMode ? "#6aff8a" : "#8aa0c0";
  }
  function getSelectedId() { return selectedId; }
  function setStatus(text, isError) { statusEl.textContent = text; statusEl.style.color = isError ? "#ffaaaa" : "#8aa0c0"; }
  function showPlaceHint(text) { placeHint.textContent = text; placeHint.style.display = text ? "" : "none"; }
  function hidePlaceHint() { placeHint.style.display = "none"; }

  return {
    element: container,
    show,
    hide,
    isEditMode,
    setEditMode,
    getSelectedId,
    getSelectedRegionId: () => regionSelectEl.value,
    setSelectedRegionId: (sectionId) => {
      if ([...regionSelectEl.options].some((option) => option.value === sectionId)) {
        regionSelectEl.value = sectionId;
        refreshRegionForm();
        refreshHierarchy();
      }
    },
    setSelected,
    setStatus,
    refreshRegionSelects,
    refreshHierarchy,
    refreshVisualAssets,
    refreshAssetEditor,
    setAssetEdit,
    clearAssetEdit,
    getEditingAssetId: () => editingAssetId,
    getSelectedAssetPartId: () => selectedAssetPartId,
    showPlaceHint,
    hidePlaceHint,
  };
}
