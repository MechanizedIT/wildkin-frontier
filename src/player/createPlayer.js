// Stable public constructor. The procedural explorer remains the default and
// is retained as the reversible fallback until an admitted player model exists.
import { createExplorerMesh } from "./explorerMesh.js";
import { createExternalPlayerModel } from "./externalPlayerModel.js";

export function createPlayer(playerVisual = null) {
  const player = createExplorerMesh();
  if (!playerVisual?.model) return player;
  const fallbackChildren = [...player.children];
  const adapter = createExternalPlayerModel(player, playerVisual);
  for (const child of fallbackChildren) child.visible = false;
  player.userData.proceduralFallbackChildren = fallbackChildren;
  player.userData.externalPlayerModel = adapter;
  return player;
}
