# Skybreak east-cap crystal reward limitation

## Current evidence

The final journey journal records the finite source `f1:r:0:-5:100` at `(32, 28.4178, -214)` as eligible with four chunks remaining and then depleted to zero after the interaction. The inventory's `crystal_shard` count remained **2 → 2**. Other collection evidence in the same outing is positive: western berries changed **17 → 20**, the whole-trip record reports wood **1 → 5**, and reload reproduced inventory, progress, and ecology exactly.

The staged resource row is `type: 'rock'` with `assetId: 'asset_crystal'`. The current data assigns `asset_crystal.gameplay.harvestable.dropId` to `crystal_shard`; runtime placement builds an asset-specific resource type from that setting, and `pickupSystem.spawnPickup()` records `node.type.resourceId`. Therefore the source-defined expected reward is a **crystal shard**, not the generic rock fallback's stone.

## Decision

This is a **HOLD on claiming the east-cap shard reward**. The artifacts establish accepted finite-source depletion and the absence of an observed inventory gain, but they do not distinguish a missed/retained pickup from a failed or capacity-rejected inventory collection. They do not support a broad resource-contract change.

## One focused follow-up

Run one isolated interaction witness for this exact source: capture the spawned pending-yield resource id/count, its collection result or blocking reason, and the before/after inventory slot while remaining in range. Confirm the same values after reload. That will distinguish a missed pickup from routing or inventory acceptance without touching unrelated resource types.

## Follow-up witness — resolved for the isolated source

`reward-witness.json` now supplies that focused check. It observed four pending `crystal_shard` rewards in `RESTING` state after harvest/wait. Walking with ordinary controls to the actual random drop position changed the crystal slot **2 → 6**, then cleared both pending-yield and pickup lists. Reload reproduced source, inventory, and ecology exactly with no errors.

This proves the source routes and persists its four shards; the original long outing's **2 → 2** record remains accurate and is not retroactively credited. Its pre-witness baseline was already after auto-harvest began during the 2.5-second settling interval, and the saved short/fixed-east attempts show random ejection positions. The practical limitation was collection distance/position, not the `asset_crystal` drop mapping. This closes the isolated reward diagnostic; no shared resource-contract change is indicated.
