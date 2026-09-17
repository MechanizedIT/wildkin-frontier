**Historical pre-proof draft. Final closure is [the current receipt](receipt.md). The pending items below were resolved there; the visual HOLD remains.**

# Ironspine rotation 1 — handoff receipt draft

**Status:** implementation is frozen for root-native capture and review; this
is not an acceptance receipt.

## Asset lane

The custom `ironspine-bank-v1` remained HOLD after all three allowed visual
candidates: R1 **3.4/10**, R2 **4.2/10**, R3 **4.6/10**. R3 met its technical
mesh checks but did not meet the natural broken-rock silhouette gate. No GLB
was admitted or exported; that asset lane is closed for this visit.

## Fallback source lane

Two and only two existing `asset_verdant_cliff_buttress` instances are now
resident through the existing landform lifecycle, default-world-only, in chunk
`(-42,-64)`:

- `-42,-64:ironspine:rock:0` / `ironspine_rock_0`: `(-2078,-3159)`, yaw `π/2`,
  scale `.65`, normal support sample at `(-2078.4716075,-3160.01414625)`.
- `-42,-64:ironspine:rock:1` / `ironspine_rock_1`: `(-2077,-3156)`, yaw `0`,
  scale `.65`, normal support sample at `(-2077.95701125,-3156.54561)`.

The exact-footprint receipt is
[`fallback-exact-footprints.json`](fallback-exact-footprints.json). It is the
authoritative full-convex-XZ, dense-support proof and replaces older
arbitrary-vertex footprint descriptions. It records no source, home, or solid
conflicts and route margins of `1.31984m` and `1.64320m`.

Focused source proof: `node --test tests/frontierLandformVisual.test.js` passes
**5/5**, including full fixture-vertex visual/hull alignment, default versus
alternate-world output, and resident unload/re-entry/disposal.

## Pending root evidence

Native frames, actual shipping-mesh contact/clearance, the ordinary circuit,
independent habitat review, and aggregate/package checks remain pending. Do
not call this fallback visually accepted before those results exist.
