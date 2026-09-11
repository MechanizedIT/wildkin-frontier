// An incidental creature must not steal a nearby exit. A field attempt that
// the player deliberately started can keep its own next action in focus.
export function chooseNearbyInteraction({ camp, gate, loot, frontier, field, activeTamingId }) {
  const activeField=field?.type==='bond'&&field.id===activeTamingId?field:null;
  return camp??gate??loot??activeField??frontier??field??null;
}
