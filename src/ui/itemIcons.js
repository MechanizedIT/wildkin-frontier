// One original art atlas, shared by every representation of an item.
export const ICON_IDS = Object.freeze(['wood','stone','fiber','berries','iron_ore','crystal_shard','wildflower','xp','backpack','skills','paw','map','axe','shield','boot','medkit']);
const LABELS = {wood:'Wood',stone:'Stone',fiber:'Fiber',berries:'Berries',iron_ore:'Iron ore',crystal_shard:'Crystal',wildflower:'Wildflower',xp:'Experience',backpack:'Backpack',skills:'Skills',paw:'Wildkin',map:'Map',axe:'Field tool',shield:'Defense',boot:'Movement',medkit:'Medkit'};
const escape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resourceLabel(id) { return LABELS[id] ?? String(id).replaceAll('_',' '); }
export function iconMarkup(id, {size=40,className='',label=''}={}) {
  const index=ICON_IDS.indexOf(id), title=label || resourceLabel(id), px=Math.max(12,Math.min(160,Number(size)||40));
  const common=`class="item-icon ${escape(className)}" role="img" aria-label="${escape(title)}" style="display:inline-block;flex-shrink:0;width:${px}px;height:${px}px;vertical-align:middle;`;
  const portrait=['mossling','tidefin','emberhorn','skydancer'].indexOf(id);
  if(portrait>=0)return `<span ${common}background-image:url('assets/ui/wildkin-portraits.png');background-size:200% 200%;background-position:${portrait%2*100}% ${Math.floor(portrait/2)*100}%;border-radius:22%;" title="${escape(title)}"></span>`;
  if(index<0) return `<span ${common}background:#172b3b;color:#fff2d5;border-radius:25%;text-align:center;line-height:${px}px;font-weight:900">${escape(title.slice(0,1).toUpperCase())}</span>`;
  return `<span ${common}background-image:url('assets/ui/frontier-icons.png');background-size:400% 400%;background-position:${index%4*100/3}% ${Math.floor(index/4)*100/3}%;border-radius:22%;" title="${escape(title)}"></span>`;
}
