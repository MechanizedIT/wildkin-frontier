// One original art atlas, shared by every representation of an item.
export const ICON_IDS = Object.freeze(['wood','stone','fiber','berries','iron_ore','crystal_shard','wildflower','xp','backpack','skills','paw','map','axe','shield','boot','medkit','more']);
const LABELS = {wood:'Wood',stone:'Stone',fiber:'Fiber',berries:'Berries',iron_ore:'Iron ore',crystal_shard:'Crystal',wildflower:'Wildflower',xp:'Experience',backpack:'Backpack',skills:'Skills',paw:'Wildkin',map:'Map',axe:'Field tool',shield:'Defense',boot:'Movement',medkit:'Medkit',settings:'Settings',more:'More options'};
const escape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resourceLabel(id) { return LABELS[id] ?? String(id).replaceAll('_',' '); }
export function iconMarkup(id, {size=40,className='',label=''}={}) {
  const index=ICON_IDS.indexOf(id), title=label || resourceLabel(id), px=Math.max(12,Math.min(160,Number(size)||40));
  const common=`class="item-icon ${escape(className)}" role="img" aria-label="${escape(title)}" style="display:inline-block;flex-shrink:0;width:${px}px;height:${px}px;vertical-align:middle;`;
  if(id==='more')return `<svg ${common}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>`;
  // These UI actions are not inventory resources, so keeping them as tiny
  // native vectors avoids ambiguous reuse of the backpack/skills atlas tiles.
  if(id==='medkit')return `<svg ${common}" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="15" rx="3" fill="currentColor"/><path d="M8 5V3.5h8V5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.1 8.2h3.8v2.1H16v3.7h-2.1v2.1h-3.8V14H8v-3.7h2.1z" fill="#e9585d"/></svg>`;
  if(id==='settings')return `<svg ${common}" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 2h3.8l.7 2.4 2.2.9 2.2-1.1 2.7 2.7-1.1 2.2.9 2.2 2.4.7v3.8l-2.4.7-.9 2.2 1.1 2.2-2.7 2.7-2.2-1.1-2.2.9-.7 2.4h-3.8l-.7-2.4-2.2-.9-2.2 1.1-2.7-2.7 1.1-2.2-.9-2.2L.8 13.9v-3.8l2.4-.7.9-2.2-1.1-2.2 2.7-2.7 2.2 1.1 2.2-.9z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#102d3b"/></svg>`;
  const portrait=['mossling','tidefin','emberhorn','skydancer'].indexOf(id);
  if(portrait>=0)return `<span ${common}background-image:url('assets/ui/wildkin-portraits.png');background-size:200% 200%;background-position:${portrait%2*100}% ${Math.floor(portrait/2)*100}%;border-radius:22%;" title="${escape(title)}"></span>`;
  if(index<0) return `<span ${common}background:#172b3b;color:#fff2d5;border-radius:25%;text-align:center;line-height:${px}px;font-weight:900">${escape(title.slice(0,1).toUpperCase())}</span>`;
  return `<span ${common}background-image:url('assets/ui/frontier-icons.png');background-size:400% 400%;background-position:${index%4*100/3}% ${Math.floor(index/4)*100/3}%;border-radius:22%;" title="${escape(title)}"></span>`;
}
