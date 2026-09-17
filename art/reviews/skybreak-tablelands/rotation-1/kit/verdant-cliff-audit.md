# Skybreak Tablelands rotation 1 — Verdant cliff kit audit

**Status: evidence and enabling-seam proposal only.** This receipt records the
currently shipped Verdant V3 cliff kit and the precise limit of its present
frontier support. It authorizes neither a Skybreak source edit nor a placement.
Root's native GLB render and full transformed-hull projection receipt remain
necessary before the structural-plan numbers change.

## Accepted source and shipping identity

The only candidates considered here are the three registered V1 assets in
`assets/models/verdant-cliff-*-v1/model.glb`:

| Asset ID | Role | Exact accepted export SHA-256 | Unit convex-hull size (x × y × z) | Hull vertices |
| --- | --- | --- | ---: | ---: |
| `asset_verdant_cliff_toe` | low cliff foot | `36a100017da0d6bfec7d2ad5db28525003b64133b39ed3df793e4904d6f29158` | 3.426 × 1.435 × 1.873 m | 17 |
| `asset_verdant_cliff_buttress` | stepped rock mass | `f1f0bf0a1e1d5380a28a975f7480bb18fb976bdbbf453d0e61d004acfc56ef85` | 3.240 × 3.967 × 2.153 m | 19 |
| `asset_verdant_cliff_ledge` | rock shelf | `ae57ade463b6b6221f01a2d7964a67e90c4ac2b1d1d12515e14b3cf9414e7da7` | 3.498 × 2.583 × 2.163 m | 20 |

`art/source/verdant-cliff-kit-v1/OWNER_ACCEPTANCE.md` records owner acceptance
of the exact V3 exports on September 12. The three opaque, grounded,
single-material GLBs total 1,110 triangles and 103,464 bytes. Their conservative
convex hulls are validated by the asset receipt; a ledge is not a walk-under
opening. The old V1/V2/V4 candidate directories remain unrelated historical or
rejected work and are not candidates for this visit.

This acceptance settles this asset family’s style for its existing scope. It
does **not** prove a Skybreak portrait fit, support placement, collision safety,
or ordinary-route fitness. Root’s actual GLB renders and the fixed-camera
projection receipt own those questions.

## Current runtime compatibility

The kit is already canonical section-world content. `tools/compose-verdant-
cliffs.mjs` registers the three model-only assets with `collision.shape:
"convexHull"`, samples each transformed hull footprint for a conservative base
height, and emits collision-enabled Verdant props. Existing authored scales
range roughly from 0.85 to 1.58.

There is one existing **streamed** use: `src/world/frontierLandformVisual.js`.
It is a deliberately bounded Rocky Terrace implementation, not a general
scenery capability. For six known Terrace buttresses it:

1. builds an external model visual;
2. samples the designated support point for its base height;
3. transforms every supplied convex-hull vertex to the resident chunk’s local
   coordinates; and
4. returns those hulls as `terrainSurfaces`.

`frontierChunkRuntime.js` already stages those surfaces with the resident chunk
and removes their IDs when the resident retires. Its lifecycle is the correct
precedent for a small Skybreak landform extension.

The generic `frontierSceneryVisual.js` path cannot reuse these models unchanged:
`kind: "low"` only batches authored `asset.parts`, while these assets have
`parts: []`; `kind: "canopy"` would render an external model but assign the
unrelated generic canopy trunk box. It must not be used as a cliff workaround.
No generic renderer, canopy treatment, global physics path, or new asset is
proposed here.

## Proposed bounded Skybreak enabling seam — pending approval

If root’s render establishes that the accepted kit actually fills the selected
crown target gap, add a second explicit recipe to
`frontierLandformVisual.js`, following the Terrace path exactly rather than
extending `frontierSceneryVisual.js`:

- Keep the existing Terrace recipe byte-for-byte in behavior. Add a separately
  named Skybreak recipe gated only by the resident detailed crown chunk(s) that
  contain the approved transforms.
- Reuse `createExternalModelVisual`, the asset lookup, and the existing
  transformed-hull convention. The recipe creates a visual and one matching
  `traversalSurface: "rock"` hull per approved instance; it releases external
  instances in the existing resident `dispose()` path.
- Sample every placement from the terrain owner’s supplied `getHeight` at the
  approved support probe. Do not call scenery, ecology, wildlife, or resource
  selection while sampling. The later support receipt must check the entire
  transformed planform, not merely this base probe.
- The only candidate family is three fixed crown outcrops: one low toe at the
  west broken-rim zone, one buttress/backstop north of the Mossling protection
  disk, and one ledge or toe at the east outlet shelf. This is a maximum of
  three external instances and three convex terrain surfaces. It does not alter
  the retained 18 staged canopy/low records or their caps.

The candidate zones are intentionally tied to the already-proposed terrain
bands but are **not final transforms**:

| Candidate role | Constraint zone | Preliminary scale interval | Must remain clear of |
| --- | --- | ---: | --- |
| west toe | west rim window, around `(4.7,-224.3)` | 0.55–0.75 | crown route core/shoulder, Mossling 3.1 m disk + feather, flower planforms |
| north buttress | north backstop window, around `(8,-238)` | 0.50–0.70 | Mossling/flower support and the crown’s open central lane |
| east ledge or toe | east outlet shelf window, around `(20,-224)` | 0.45–0.65 | exit corridor to `(29,-213)`, crystal support and its approach |

These centres are terrain-band references only. Root’s pending full-mesh camera
projection must select exact x/z/yaw/scale or reject the instance. Each approved
transform needs: full hull planform support and slope samples, all source/home
and route-clearance tests, camera-bounds projection at the settled crown plus
arrival/ascent/return poses, and an ordinary route check. Any transform that
needs to move into a protected disk, a route shoulder, or an offscreen-only
position is rejected rather than compensated by widening terrain or weakening
clearance.

## Ownership and proof boundary

A later approved implementation would be a small landform-visual seam only:
`frontierLandformVisual.js` owns its fixed recipe, model instances, transformed
hulls, and disposal; `frontierChunkRuntime.js` continues to own resident staging
and terrain-surface add/remove. `frontierLandform.js`/`frontierTerrain.js` retain
all height/profile ownership. `frontierScenery.js` retains its staged identities
and caps. No `frontierSceneryVisual.js`, generic registry, camera, lighting, or
physics-system change is required.

Focused sibling proof must cover: the existing six Terrace rocks unchanged;
Skybreak resident add/remove does not leak hulls across chunks; each approved
Skybreak model and hull has identical transform/base; missing asset data yields
zero Skybreak instances safely; every protected anchor, resource footprint,
Mossling disk, flower support envelope, route core, detailed/coarse edge, and
existing 18 staged identities remains exact. Root owns native capture, full
ordinary circuit, reload, and independent visual review.

Until the render/projection/support receipt succeeds, Skybreak’s numerical
structural plan remains unchanged and this proposal is **HOLD**.
## Projection-grid correction

The final support/projection join checked all 112 root-projected medium
buttress/ledge rows. Of 72 rows with more than 75% central mesh coverage, zero
pass the ordinary free-standing full-planform support rule. The only proposed
fallback is two explicitly embedded, fixed buttresses: `(20,-226,.40,.65)` and
`(28,-220,.40,.65)`, with reproducible full-planform-minimum bases `32.9185`
at `(19.3369,-224.9900)` and `28.0051` at `(29.1349,-220.1446)`. Their large
terrain spans are a rejection for ordinary props, not a lowered guard; the
Terrace-style attachment contract needs native visual/contact/route proof
before any source work.
