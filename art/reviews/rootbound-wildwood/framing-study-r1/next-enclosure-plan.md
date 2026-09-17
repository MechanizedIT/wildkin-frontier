# Rootbound enclosure R1 — decisive existing-kit blockout

**Initial anchors below are historical and superseded.** The independently reviewed correction is executable in `measure-enclosure.mjs` and recorded in `enclosure-measurements.json`; integrated six placements are in `../enclosure-r1/integration.json`. Four recipes, not two. Gallery shelters align along the route; the former terminus is a side cue, and Crown is behind the approach endpoint. Existing geometry is embedded0.60m for shelters and0.15m for the other recipes. The west shelter moves0.5m west for ordinary admission. Route requirement is4m main /3m optional, not the obsolete6m visual gap below.

## Decision

Use **six non-colliding, data-baked composite low props**: three around Root Galleries and three forming one overlapping Heartroot silhouette. This replaces the current reading of isolated 6m blobs and 1.6m roots with two room-scale forms: a paired gallery shelter with a distant lintel, and a connected Crown root-web.

This is deliberately a whole-form assembly pass. It does not add another foliage model, GPU job, collision framework, terrain change, or resource/Wildkin identity.

## Why this path is feasible now

| Existing ingredient | Authoritative local bounds / cost | Runtime consequence |
| --- | --- | --- |
| `asset_rootbound_block_leaf` | 1.821×1.800×1.218m; 4,560 triangles | `kind: 'low'` is supported through authored `asset.parts`, batched by render cell, and has no automatic surface/collider. |
| `asset_rootbound_block_root` | 1.897×0.600×1.287m; 1,770 triangles | Same supported low path. It supplies the visible base/web, rather than a detached tall leaf mass. |
| `asset_verge_canopy_{tall,spread}` | tall 3.25×6.20×2.22m; spread 5.55×3.82×3.65m | External-model renderer accepts these only as `kind: 'canopy'`; it unconditionally adds a 1.1×2.45×1.1m trunk surface. Do not use them in this visual-only blockout. |
| `asset_heartwood_tree` | 4.278×6.337×2.682m; 1,520 triangles | Technically usable as a low part recipe, but its pink-ball crown is a poor Rootbound silhouette. Retain as library evidence, do not use. |

The renderer already composes each authored part with its local position/rotation/scale and then applies the spec's world position/yaw/scale. No new transform field or renderer contract is needed. The only data work is two new visual-asset recipes whose parts are copied from the two existing Rootbound block assets with the offsets below. Every placement stays `kind: 'low'`.

## Two reusable composite recipes

All dimensions are source-layout values; the implementation bakes each constituent part's existing geometry and its listed local transform. They are not a new model asset.

| Recipe | Constituent low parts, local transform `(x,y,z; uniform scale)` | Resulting outer envelope | Per-instance triangles |
| --- | --- | --- | ---: |
| `asset_rootbound_gallery_shelter_placeholder` | leaf `(-1.55,.38,.15;2.75)`, leaf `(1.45,.20,.42;2.40)`, root `(-1.70,0,-.25;3.00)`, root `(1.78,0,-.10;2.50)` | about 8.9m wide × 4.1m deep × 5.3m high | 12,660 |
| `asset_rootbound_gallery_lintel_placeholder` | leaf `(0,.25,.20;2.45)`, root `(0,0,-.15;2.60)` | about 5.0m × 3.3m × 4.7m | 6,330 |
| `asset_rootbound_heartroot_core_placeholder` | leaf `(-1.65,.45,.50;3.15)`, leaf `(1.72,.65,.78;2.85)`, root `(-2.12,0,0;3.45)`, root `(2.08,0,.36;3.20)` | about 10.7m × 4.8m × 6.1m | 12,660 |
| `asset_rootbound_heartroot_wing_placeholder` | leaf `(-.65,.32,.25;2.35)`, root `(.55,0,-.15;2.55)` | about 5.4m × 3.2m × 4.6m | 6,330 |

The core and two wings overlap by 1.5–2.5m in XZ. That overlap is intentional: it reads as one root-and-canopy web, not three separately planted objects.

## Six placements

`y` remains the existing final terrain sample at the named anchor. Since these are visual-only lows, their full visual envelope may cross a sloped surface; the base/root-bearing parts must have no visible gap at the anchor and the lowest visible edge may embed modestly. No new terrain surface, physical hull, or canopy trunk is introduced.

| Stable key | Recipe | World `(x,z)` / yaw | Role and viewing station |
| --- | --- | --- | --- |
| `gallery-shelter-west` | gallery shelter | `(-483,650)`, `.12` | Right-side shoulder from **Gallery** `(-478,640)`, yaw `3.0`; its outer leaf/rib arrives from the upper-right rather than walling the lane. |
| `gallery-shelter-east` | gallery shelter | `(-473,650)`, `-.12` | Opposing upper-left shoulder at the same Gallery station. The two enclose the view while leaving their central gap. |
| `gallery-terminus` | gallery lintel | `(-478,655)`, `0` | Far, lower lintel cue. It ends the first gallery sightline instead of producing a foreground wall. |
| `heartroot-core` | Heartroot core | `(-474,718)`, `.05` | Primary Crown landmark at **Crown** `(-477,709)`, yaw `-2.7`; ahead of the player along the southeast-facing view. |
| `heartroot-wing-west` | Heartroot wing | `(-479,718)`, `.12` | Overlaps the core's west/root side and broadens the grounded base. |
| `heartroot-wing-east` | Heartroot wing | `(-468,720)`, `-.12` | Overlaps the core's east/fork side, making an unequal crown rather than a symmetric hedge. |

These are a total of 56,970 source triangles when all six recipes are resident: `2×12,660 + 6,330 + 12,660 + 2×6,330`. Scaling does **not** change this count. The added low props batch through the existing render-cell/asset mechanism; no new draw-path is required beyond the recipes' distinct asset IDs.

## Screen and clearance checks before any edit

The recorded 52°/412×915 cameras were used for a conservative outer-envelope check. At baseline **36°**, the near Gallery shoulder envelopes deliberately enter from the side/top (the upper HUD will crop some canopy), while the two forms still occupy opposite visible bands; at Crown the core's lower root mass lands in the useful mid-frame and its upper silhouette reaches above the objective area. The supported **32° scene-only variant** shifts these same forms lower; it is an evaluation aid, not a dependency. The blockout must remain meaningful in the baseline 36° captures.

Before source mutation, run one exact final-height/full-envelope projection against these anchors and reject rather than silently relocate any failure. Check:

1. Gallery primary lane `x≈-478`, from `z=640` through `z=655`: preserve at least 6m visually open between the shelter envelopes. The outer recipe envelope, not a legacy selector radius, is the measurement.
2. Crown approach from `(-477,709)` to the core reveal: retain at least 6m visually open; wings may overlap each other but not cover the lower-middle route reveal.
3. Each broad root base: sample center plus its four local outer root corners. Accept modest embed; reject a floating visible base. The existing final terrain (`sampleFrontierHeight`/production mesh) owns the value.
4. Existing forage, homes, Grove colony, ridge records, save IDs, and canopy surfaces remain unchanged. These new low specs have no `asset_fen_stone` branch, so do not create terrain surfaces or Rapier colliders.

## Actual source constraints

- `src/world/frontierSceneryVisual.js:321-350`: only external `kind: 'canopy'` models are instantiated, and that branch adds a trunk surface. The low path requires `asset.parts` and introduces no solid except Fen stone.
- `src/world/frontierSceneryVisual.js:77-105,353-391`: part-local matrices and world spec matrix already express every required transform and preserve existing instanced low rendering.
- `src/world/data/world.generated.js`: `visualAssets` is the canonical recipe catalog; any composite is a data-baked copy of existing parts, with no new schema.
- `src/world/frontierRootbound.js:164-183`: retain all current Rootbound records. This proposal adds six named records; it does not move or replace the useful Lantern Grove assembly.

## Capture gate

Root should compare Gallery and Crown at their listed stations in both baseline 36° and the temporary 32° evaluation pose. Retain the blockout only if the Gallery visibly reads as two shoulders plus a destination gap, and Crown reads as one connected landmark behind a clear approach. If the two existing block recipes still look like cuboids at this scale, stop this plan as a kit limitation and open a single large foliage-edge placeholder decision; do not scatter smaller props to compensate.