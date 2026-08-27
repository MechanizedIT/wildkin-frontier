// Central deterministic player-level curve. Banked XP is the only authority.

export const PLAYER_LEVEL_XP_STEP = 50;

export function getXpForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const completedLevels = normalizedLevel - 1;
  return PLAYER_LEVEL_XP_STEP * completedLevels * completedLevels;
}

export function getPlayerLevel(bankedXp) {
  const xp = Math.max(0, Math.floor(Number(bankedXp) || 0));
  return Math.floor(Math.sqrt(xp / PLAYER_LEVEL_XP_STEP)) + 1;
}
