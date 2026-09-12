# Emergency barricades — candidate V5

**Current source: `candidate-v5`. Independent neutral model review8.3; straight panel admitted in the bounded Camp integration reviewed8.0.** The optional post is available in the visual library but is not used by the automatic perimeter; its native structural placement is not claimed. The approved visual target and its independent target-only review are in `art/targets/crash-camp-v1/`. This modeler does not independently pass their own asset.

## Exact exports

| Asset | SHA256 | Bytes | Triangles | Exported vertices | Material / primitive |
|---|---|---:|---:|---:|---:|
| `emergency-barricade.glb` | `2cc773a2def685f876aeb0da4eb100e7b060099bdd9834df5c6d78257e6197a6` | 67,296 | 880 | 1,884 | 1 / 1 |
| `emergency-corner-post.glb` | `c8f84e55996754e676cffede0a83b527e2a9057133506715ae6f3a9956a24aaa` | 30,732 | 396 | 832 | 1 / 1 |

Both pass the unchanged prop structural checker. The exact reports, bounds and node transforms are in `candidate-v5/geometry-facts.json` and `.dream-loop/overnight2-barricades/v5/*-check.json`. This is structural evidence only.

Each asset has one opaque matte material, one embedded 64x8 palette PNG (240 bytes), zero metalness, roughness 1 and no emission, reflection or normal maps. Editable Blends retain named solid components. `tools/art/build-emergency-barricades.py` reproduces the assets and CPU review; an identical builder copy is retained in the candidate directory. No TRELLIS, paid service, GPU inference, subdivision or remeshing was used.

## Scale, repetition and deliberate collision

Coordinates are glTF meters: X along panel, Y up, +Z outboard braces. Pivot [0,0,0] is centered on the ground at the panel plane. Measured straight bounds are [-1.4,0,-.2] to [1.4,1.7,.64]: 2.8m wide, 1.7m tall, .84m total footprint including feet. Corner bounds are [-.26,0,-.26] to [.26,1.7,.26]. Actual export rounding is about 1e-7m.

Straight pitch is 2.8m. Each segment has two full end uprights and two braces; adjacent seams are consistently paired uprights. The independent reviewer identified this as a secondary target-fit consideration, not a required family redesign. A removable divider leaf can reuse the whole straight mesh; it has no hinge or moving door. Parent must remove its visual and physics together from authoritative Camp state.

Runtime compound panel collision is implemented in `src/base/campDefenses.js`; focused real-Rapier and native opening checks pass. Geometric recipe:

- Central panel box centered [0,.85,0], size [2.8,1.7,.4].
- Each shoe centered [X,.06,.37], size [.30,.12,.54], X = +/-1.22.
- Each brace is a convex prism of width .24 about X = +/-1.22 with Y/Z polygon [(0,-.13),(0,.62),(.13,.62),(.97,.22),(.97,.13)].
- Corner post uses a .52-square footprint box, height 1.7.

Avoid a full-height .84-deep box: it would block visibly empty air around the supports. Parent owns supported collider implementation, shared Play/Author paths, native access/clearance and save-state proof.

## Raw visual evidence

`.dream-loop/overnight2-barricades/v5/` holds freshly reimported GLB front, rear, three-quarter, side, corner-post and 844x390 game-scale-neutral PNGs, plus the review Blend. The neutral fixture uses three repeated modules and shipped Explorer v2 with the current gameplay camera constants: vertical FOV 52 degrees, focus height .9m, offset 6.55m horizontal / 4.1m vertical, .85 landscape zoom. It is a CPU static scale fixture; native Three.js, Camp composition, traversal and phone-performance gates remain separate.

Rendering used one owned Blender process, two CPU threads and 12 samples. No unknown user Blender process was touched. Initial free RAM was about 14.6 GiB; a later resource check was about 13.8 GiB free. A prior same-scene render peaked below 80 MB internally; process working set was about 286 MB.

## Revision evidence

V1 stopped at studio setup. V2 revealed mismatched joined UV-layer names and a coplanar top trim; V3 used one Palette UV layer and removed the redundant trim. Independent V3 review held exposed coplanar cap and shoe contacts. V4 removed the optional post's coplanar top marker. V5 also deepened straight caps past uprights, extended shoes past brace front faces, and removed a redundant shoe facet. Prior local-only directories preserve rejected preparation; only final V5 source and the written failure history are required for recovery. The original V3 HOLD is retained in `.dream-loop/overnight2-barricades/independent-model-review.md`.

The final modeler inspection sees closed broad panels, connected matte supports, repeatable restrained inserts and clean visible contacts. This is a finding, not an independent aesthetic score or owner approval.
