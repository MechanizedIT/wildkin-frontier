# Root Galleries + Lantern Grove connected edges — R1 plan

## Purpose

The fresh Entry frame at `(-478,620)`, yaw `3.0`, has usable near roots but a blank forward field. This plan fills the **outer edges of the existing 90 m Gallery-to-Grove sequence** with a staggered chain of existing, non-colliding root/leaf recipes. It does not add a model, terrain change, collider, source identity, or gameplay system.

The [baseline review](independent-review.md) calls for three readable depths: retain the existing near frame, add a mid-distance alternating shoulder, and let the existing north anchor / Grove cluster terminate the run. The [Entry capture](before-entry.png) is the matching portrait reference. The Lantern room remains open rather than being turned into a border of small scatter.

## Proposed arrangement

Fourteen additive curated `kind: 'low'` records make **12 named groups**. Each uses the registered `asset_rootbound_block_root` or `asset_rootbound_block_leaf` mesh recipe. They are visual-only, so existing collision owners remain authoritative. The prospective count is **43 + 14 = 57** Rootbound curated records, pending one actual selector pass after a reviewed append.

| Sequence | Groups / role | Placement rhythm |
|---|---|---|
| Gallery entry, z625–646 | west root and east leaf, then west/east mid shoulders | alternating sides, leaving the lower player field clear while putting the first useful silhouettes 3–8 m from the path envelope |
| Gallery middle/north, z656–672 | west/east return shoulders, then west/east north shoulders | unequal root/leaf forms bridge the current near frame to the existing north terminal rather than making a continuous wall |
| Grove approach | two outer Verge-side low forms | a sparse mineral-facing handoff outside the open branch, not replacement of the resource pocket |
| Grove outer edge | rear pair plus west break pair | a larger, offset back edge around the existing log/fungi/mineral destination; Trailgloam remains outside the group envelopes |

The literal transforms, rotated full visual envelopes, support samples, and nearest source/home clearances are in [plan-support-clearance.json](plan-support-clearance.json). The companion [CPU receipt](plan-support-clearance.mjs) is deterministic and performs no source mutation.

## Measured constraints

The receipt evaluates each full transformed visual AABB on terrain at centre, four corners, and four edge midpoints. It uses the actual 2 m terrain sampler, conservative visual-envelope distance to the route centreline, and the selector’s smaller low-prop source footprint separately.

- Every full visual envelope clears the **4 m wide main lane** by at least **2.922 m** from its centreline and the **3 m optional branch** by at least **3.538 m**. These are half-width boundaries, not an accidental doubled 4 m / 3 m margin.
- All 14 selector-sized low footprints pass the existing `.32` support predicate. Full-envelope centre gradients peak at `.3062`; the largest visible form therefore sits on a continuous grounded slope rather than a floating level box.
- The closest retained forage **centre** is `4.555 m`, exceeding the existing `3.2 m` selector exclusion. The receipt also records visual-envelope distance so a later implementer can avoid hiding an interaction even where the non-colliding envelope extends closer.
- Trailgloam remains at `(-463,685)` with its 3.3 m flee disk. The closest planned visual envelope is `7.334 m` from its home; Mossling homes are farther away. No current forage, wildlife, or curated record moves.
- Existing no-collider policy stays intact. The purpose is framing and continuity; it must not create a hidden physical wall.

## Implementation boundary and visual gate

After independent plan GO, append only these 14 reviewed records to the default-world Rootbound curated array and preserve its stable keys. Run the focused selector once: expected natural admission is 57 records. If one coordinate is rejected by the selector despite this preflight, make **one** local correction, retain the same 12-group rhythm, and record it. Do not start a placement search.

Root’s matching native captures decide whether the chain creates the intended alternating shoulders. Retain only if Entry, Interior, North, and Grove show a connected edge rhythm with a visibly empty central route. If the existing recipes still read as isolated dark blocks, hold the result and identify a single larger foliage/root-edge gap; do not respond with more small props.
