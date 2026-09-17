**Historical pre-proof draft. Final closure is [the current receipt](../../../art/reviews/ironspine-range/rotation-1/receipt.md). The pending items below were resolved there; the visual HOLD remains.**

# Ironspine Range rotation 1 — closure draft

## Current status: source frozen; final acceptance pending

The custom narrow-bank asset lane is closed HOLD and is not admitted. Its three
allowed construction candidates scored **3.4** (R1), **4.2** (R2), and **4.6**
(R3) for visual fit. R3 was technically sound but still read as a manufactured
wedge rather than the target's broken, layered rock mass. No GLB was exported,
and the candidate cap is exhausted.

The replacement source pass uses exactly two existing
`asset_verdant_cliff_buttress` residents in default-world chunk `(-42,-64)`:

| Stable ID | Transform | Terrain support probe |
| --- | --- | --- |
| `-42,-64:ironspine:rock:0` | `(-2078, -3159)`, yaw `π/2`, scale `.65` | `(-2078.4716075, -3160.01414625)` → `8.8066647571` |
| `-42,-64:ironspine:rock:1` | `(-2077, -3156)`, yaw `0`, scale `.65` | `(-2077.95701125, -3156.54561)` → `9.1186604452` |

`fallback-exact-footprints.json` is authoritative. It derives each true convex
XZ footprint from all collision vertices, uses dense `0.1m` support sampling,
and records the complete source/home/solid and route checks. The records pass
with support spans `.1968677623` and `.1773638100`, and route margins
`1.3198400000m` and `1.6431950674m`. Earlier arbitrary-vertex footprint claims
are superseded.

The focused landform suite passes 5/5: exact normal height probes, every
fixture hull vertex aligned to the visual transform, default-world gating,
target-chunk gating, resident unload/re-entry, disposal, and alternate-world
exclusion. Terrace and Skybreak records remain in their existing paths.

## Root-owned proof still required

- Native arrival, interior, and destination frames show the intended left-side
  framing without pinching the player lane.
- Close-pass/collider contact and the streamed unload/re-entry behavior work
  with the shipping buttress mesh, not only the fixture hull.
- The full ordinary circuit completes with no errors and preserves existing
  interactions and protected identities.
- Independent habitat review and aggregate/package verification determine
  acceptance. Until then this fallback is source-frozen, not visually accepted.
