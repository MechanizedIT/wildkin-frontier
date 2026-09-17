# Skybreak Tablelands — rotation 1 numerical structural plan

**Status: planning only.** This is the pre-source plan required by the current
Skybreak slice. It does not authorize terrain/scenery edits, asset creation,
GPU work, browser captures, or an implementation pass. Independent technical
review must approve the final candidates after the projection and full-support
receipts named below.

## Fixed evidence and target

- Bounds: `x[-34,49]`, `z[-249,-152]`; default world, normal portrait camera
  (`412×915`, pitch `0.6283185307`, requested/effective distance `11.5910795`).
- Settled comparison poses: arrival `(4,-153), yaw 0`; ascent `(-7,-184), yaw
  -0.5404195003`; crown `(12,-228), yaw -2.1815222912`; return `(36,-188), yaw π`.
  Arrival/ascent/return retain the actual Heartwood HUD identity; crown retains
  Skybreak. The frames in
  `art/reviews/skybreak-tablelands/rotation-1/baseline-settled-*.png` are the
  immutable before state.
- Selected perceptual direction:
  `art/targets/skybreak-tablelands/concepts/selected.png` /
  `target-crown-v1.png`. It asks for an open central crown with short broken
  rim planes and a readable east outlet, not a new canyon, cave, bridge, tower,
  camera/light change, or a literal ring of new boulders.
- The older Skybreak R3 receipt is useful geological debt evidence only:
  linked pads, curtain faces and sparse cap/slot ecology are HOLD. It does not
  authorize changing the current anchors or treating historical images as the
  current fixed-pose proof.

## Protected geometry, routes, and identities

Preserve byte-for-byte behavior at the following anchors and every source/home
support disk; no new terrain modifier may call ecology or wildlife sampling.

| Protected item | Centre / path | Required protection |
| --- | --- | --- |
| Route anchors | `(4,-153) → (4,-166) → (-7,-184) → (5,-204) → (12,-228) → (29,-213) → (36,-188) → (32,-156)` | Anchor heights, the existing route centreline, and each current core-width support band remain exact. Preserve western ascent and eastern descent as separate paths. |
| Detailed/coarse contract | detailed chunks `(-1,-5),(0,-5),(-1,-4),(0,-4)` | New profile is exactly zero at all 50 m chunk edges and outside the stated local windows; it may not alter detailed grid axes, triangle query ownership, or adjacent coarse curves. |
| Crown Mossling | home `(9.5,-231.5)`, complete movement/support disk radius `3.1 m` | Height and slope remain exact throughout disk; no solid prop or terrain lip enters it. |
| Crown flowers | `(13,-232) ×1.30`, `(13.5,-231.5) ×1.35`, `(15,-231) ×1.28` | Retain all IDs, cap semantics, and noncolliding positions. Their maximum current support envelope is `0.75 × 1.35 = 1.0125 m`; retain sampled support across each full envelope. |
| Crystal reward | `(32,-214)`, scale `1.8` | Source ID, location, support, and ordinary tool approach remain exact. |
| Supply mouths | berries `(-20,-166)`, `(-22.8,-167)`; fiber `(42,-166)` | Preserve source IDs, full resource footprints/clearance, approach space, and existing paired decorative groups. |
| Return beats | high `(32/34/36,-218)`, mid `(41,-187)/(41,-185)/(43,-185)`, low `(24/22/24,-166)` | Keep all nine low, noncolliding trail-stone IDs and the existing high→mid→low order. |
| Older terrace/Camp | north of this landform and terrace contract | No change. |

## One bounded structural method

The pass changes **only shallow surface composition inside existing mesa
interiors**, using additive/subtractive landform profile terms multiplied by
smoothly feathered masks. It does not reshape the six route anchors, add a
seventh mesa, create a continuous ramp, or use props as fake cliffs.

### A. Crown room — primary target

Local window: `x[1,25]`, `z[-242,-216]`, with every modifier zero by `x≤1`,
`x≥25`, `z≤-242`, and `z≥-216`; all internal transition widths are at least
`1.6 m`. Exclude these masks before blending:

- Mossling disk `(9.5,-231.5), r=3.1 m` plus a `1.0 m` feather;
- all three flower envelopes plus `0.5 m` feather;
- route corridor from `(5,-204)` to `(12,-228)` and from `(12,-228)` to
  `(29,-213)`: preserve the existing core and a `1.2 m` shoulder beyond it;
- no edit at `x=0` / `z=-200` detailed-chunk seams.

Use three short, unequal terrain bands rather than a continuous perimeter wall:

| Crown terrain band | Centre / approximate footprint | Height operation after masks | Purpose in fixed crown view |
| --- | --- | --- | --- |
| west broken rim | centre `(4.7,-224.3)`, elliptical `rx 3.2, rz 2.1` | `+0.65 m` core, 1.8 m feather; cut a 1.3 m notch toward `(6,-226)` | A near, lower left interruption that frames rather than blocks the player/Mossling centre. |
| north backstop | centre `(8.0,-238.0)`, `rx 4.0, rz 2.4` | `+0.90 m` core, 2.0 m feather; two 1.1 m-wide bites on its south edge | Produces a broken high background plane behind the flower/home zone without entering its support disk. |
| east outlet shelf | centre `(20.0,-224.0)`, `rx 3.8, rz 2.2` | `+0.55 m` core, 1.8 m feather; decline toward `(22,-220)` | Separates the crystal-side/outlet direction from the open center without becoming a tall enclosing wall. |

The maximum local change is `+0.90 m`; no negative crater is proposed. At least
an 8 m wide unmodified/feathered playable centre remains around the home and
route. This directly addresses the target’s open centre → broken rim → east
outlet hierarchy while keeping the actual protected encounter ground stable.

### B. Western ascent — supporting grammar

Local windows, both fully inside existing detailed chunks and zero at seams:

1. `x[-19,-10], z[-191,-177]`: a west-side toe, `+0.45 m` maximum, elliptical
   core `rx 2.6, rz 3.8`, 2.0 m feather, with a 1.4 m notch toward the route.
2. `x[1,12], z[-199,-187]`: an east-side counter-plane, `+0.55 m` maximum,
   core `rx 3.1, rz 3.0`, 2.0 m feather, fading completely before the
   `(5,-204)` route core and the `z=-200` chunk edge.

These are only shallow side bands. The existing route corridor retains its
current width, heights and walkability; no staircase, narrow road, or extra
face is proposed. The intended portrait read is one sheltered low pocket,
then an unequal side buttress, then the existing higher crown direction.

### C. Arrival and return

No height modification at arrival, the lower supply mouths, or the return
stone groups. They are fixed-view orientation checks, not permission to expand
the terrain scope. Any changed crown/ascent profile must leave their source
camera heights and matching terrain semantics untouched.

## Existing-kit ecology and fixed count plan

The selected target’s enclosing boulder count exceeds the current kit proof.
The actual kit inventory confirms that `asset_fen_stone` is a tall narrow
`1.6534 × 3.15 × 1.5525 m` obelisk and cannot honestly substitute for a broad
low rim boulder. `asset_trail_stones` is a low spread group
`2.4765 × .2391 × 1.9038 m`; `asset_pebble_cluster` is
`1.032 × .34 × .7949 m`; `asset_fen_reed` is a tall thin accent
`1.332 × 2.3396 × 1.1858 m`. Therefore initial structural staging uses **no
new prop instances and no new collider**: terrain supplies the rim volume.

Retain the complete existing staged table at its current fixed count:
**18 pieces = 2 canopy + 16 low**, with no cap increase and no changes to finite
resource/wildlife identities. The seven grouped recipes remain exactly:

| Group | Existing exact transforms | Count / fixed projection role |
| --- | --- | --- |
| West berry mouth | spread canopy `(-26,-169) ×1.10`; reed `(-26,-170) ×1.20`; mushroom `(-25,-170) ×1.18` | 3. Arrival/ascent left-pocket depth beyond the protected berries. |
| Crown life | cloudflowers `(13,-232) ×1.30`, `(13.5,-231.5) ×1.35`, `(15,-231) ×1.28` | 3. Protected soft foreground/midground near Mossling, never terrain-rim replacements. |
| East high | stones `(32,-218) ×1.10`, `(34,-218) ×1.14`, `(36,-218) ×1.10` | 3. First distinct return beat; retain positions/scales. |
| East fiber mouth | spread canopy `(42,-170) ×1.10`; reed `(42,-162) ×1.24`; mushroom `(44,-169) ×1.16` | 3. Return-side ecological contrast at protected fiber. |
| East mid | stones `(41,-187) ×1.10`, `(41,-185) ×1.16`, `(43,-185) ×1.10` | 3. Middle return beat. |
| East low | stones `(24,-166) ×1.10`, `(22,-164) ×1.15`, `(24,-164) ×1.10` | 3. Low return/arrival orientation beat. |

The narrow current stone kit can visually punctuate a terrain shelf but cannot
be promoted to a solid rock wall. If root’s pending kit render disproves this
reading, record that evidence and route one small broad outcrop role through a
separate asset loop; do not silently add a generic asset or increase staging.

## Required numerical admission and projection gate

Before any source edit, root must generate one receipt for every terrain band
and every retained staged prop through each settled camera. A candidate is
rejected unless all of the following are true:

1. **Terrain:** actual detailed-triangle samples show finite height; zero delta
   at detailed/coarse boundaries; protected disk/envelope samples exactly match
   baseline; route-centre and route-core samples match baseline; all changed
   side-band support samples stay at or below the existing `.32` placement
   slope threshold where props/feet depend on them.
2. **Prop support and clearance:** sample all full asset planforms (not centre
   points) against post-change terrain; retain existing forage clearance `3.2 m`,
   resource radii, Mossling full movement disk, Camp/terrace restrictions, and
   current route-clearance policy. No recursive terrain→ecology sampling.
3. **Projection:** transform complete current asset bounds and the terrain-band
   sampled ridge line through the real captured camera matrices. At crown,
   prove the west rim, flower/Mossling zone, crystal side, and east outlet each
   contribute inside the useful world frame; no critical subject may be entirely
   behind the player, under the top HUD, or below action controls. At ascent,
   prove both side bands enter the visible left/right room edges without filling
   the central route. Arrival and return must prove no accidental silhouette or
   HUD obstruction.
4. **Budget:** each four-pose residency remains within its present fixed staged
   count and existing resident/collider/draw caps. The current baselines show
   26 selected scenery residents, 10–11 canopies, 15–16 lows, zero stone solids,
   one ground draw, and 8 low draws; an initial source pass may not raise these
   structural budgets.

The plan stays **HOLD for implementation** until this receipt marks every
candidate support/projection row as admissible. An analytical point in view is
not proof; full mesh bounds and an actual capture remain required.

## Focused proof after a later authorized pass

Run focused terrain/scenery tests for unchanged anchors, full home/resource
support, exact staged count/IDs/transforms, selection caps, detailed-triangle
agreement, and coarse-edge seams. Root then captures all four fixed poses,
walks the ordinary circuit with berry/crystal/return evidence, and verifies
literal reload. Independent review judges the actual captures; source counts or
this plan cannot self-pass the composition.
## Projection correction — proposed source method, pending native preview

This amendment supersedes the previous **west broken rim**, **north backstop**,
and free-standing **east shelf** proposals in this document. Root’s complete
current-camera projection places the first two outside the useful crown frame.
The combined projection/support grid has no free-standing, medium-scale cliff
asset that both occupies more than 75% of the useful frame and meets the normal
0.32 m full-footprint support rule. Those terrain bands are deferred; they are
not justification for offscreen structural mass.

The only proposed visible structural method is a maximum of two fixed,
**embedded cliff attachments**, reusing the accepted Verdant buttress through a
narrow Skybreak branch of the existing `frontierLandformVisual` Terrace path.
They are rock-face dressing, not free-standing scenery and do not change the
18 staged canopy/low records, their caps, route geometry, source identities,
Mossling support, or the terrain profile.

| Attachment | Transform | Reproducible embedded base | Current full-hull span | Crown mesh bounds | Route clearance |
| --- | --- | --- | ---: | --- | ---: |
| cap-face buttress | `(20,-226)`, yaw `.40`, scale `.65` | `baseY=32.9185`: minimum `sampleFrontierHeight` at `(19.3369,-224.9900)` over the transformed 0.25 m planform grid | 1.8424 m | x `6.85..113.82`, y `188.74..330.54` | 1.385 m beyond the 1.2 m shoulder |
| outlet-face buttress | `(28,-220)`, yaw `.40`, scale `.65` | `baseY=28.0051`: minimum sample at `(29.1349,-220.1446)` | 2.0805 m | x `91.29..157.82`, y `223.22..311.51` | 2.179 m beyond shoulder |

This contact rule is deliberately narrower than ordinary placement: both
models use the full-planform minimum only to bury their lower hull into the
existing cliff face, as the six fixed Rocky Terrace buttresses already do.
They are not admitted as level-ground props, so the 0.32 m rule is unchanged
for every free-standing scenery, forage, home, and resource placement. The
runtime recipe must transform the same convex hull and model from the same
transform/base, publish it with the resident chunk, and remove it with that
resident. No canopy fallback or generic scenery/physics framework is allowed.

Before source authorization, root must native-preview both transforms and prove
that the emergent model silhouette remains within the useful crown camera frame
without HUD/player obstruction. A focused runtime proof must then show no
terrain-surface seam, unintended standing step, route collision, or protected
footprint intrusion. If either attachment fails that proof, omit it; do not
flatten terrain, weaken clearance, shrink to filler, or replace it with an
offscreen band.
