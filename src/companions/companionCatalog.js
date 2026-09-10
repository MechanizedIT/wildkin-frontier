export const COMPANIONS = Object.freeze([
  { id: "mossling", assetId: "asset_wildkin_mossling", name: "Mossling", color: "#91e5a5", glyph: "✿", habitat: "Verdant Verge", description: "A cautious forest grazer. Its antlers carry a living garden.", abilityName: "Bloom", abilityDescription: "Restore 2 health. Awakens living root seals.", cooldown: 24, secret: "chest_mossling_secret" },
  { id: "tidefin", assetId: "asset_wildkin_tidefin", name: "Tidefin", color: "#74dfea", glyph: "≈", habitat: "Shatterfen", description: "A tranquil marsh glider that sings to the water.", abilityName: "Tidal Ward", abilityDescription: "Shield yourself for 3 seconds. Dissolves tidal seals.", cooldown: 26, secret: "chest_tidefin_secret" },
  { id: "emberhorn", assetId: "asset_wildkin_emberhorn", name: "Emberhorn", color: "#f8b270", glyph: "◆", habitat: "Emberfall", description: "A proud ruin guardian. Respect its warning and answer its call.", abilityName: "Cragbreaker", abilityDescription: "Strike nearby threats with a powerful shockwave. Breaks mineral seals.", cooldown: 18, secret: "chest_emberhorn_secret" },
  { id: "skydancer", assetId: "asset_wildkin_skydancer", name: "Skydancer", color: "#d1b7ff", glyph: "❋", habitat: "Windscar", description: "An elusive cliff-dweller that catches the sky in its feathers.", abilityName: "Skybound", abilityDescription: "Leap upward while keeping your momentum. Opens wind seals.", cooldown: 12, secret: "chest_skydancer_secret" },
]);
export const COMPANION_BY_ID = Object.freeze(Object.fromEntries(COMPANIONS.map(s => [s.id, s])));
export const SECRET_COMPANION = Object.freeze(Object.fromEntries(COMPANIONS.map(s => [s.secret, s.id])));
export function identifyCompanion(creature) {
  const assetId = creature?.state?.visualAssetId ?? creature?.group?.userData?.visualRef?.id;
  return COMPANIONS.find(species => species.assetId === assetId) ?? null;
}
