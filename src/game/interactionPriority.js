// An incidental creature must not steal a nearby exit. A field attempt that
// the player deliberately started can keep its own next action in focus.
export function chooseNearbyInteraction({ camp, gate, loot, frontier, field, climb, activeTamingId, isVisible = () => true }) {
  if (climb?.action === 'drop') return climb;
  const activeField=field?.type==='bond'&&field.id===activeTamingId?field:null;
  return [camp,gate,loot,activeField,frontier,field,climb].find(info=>info&&isVisible(info))??null;
}
