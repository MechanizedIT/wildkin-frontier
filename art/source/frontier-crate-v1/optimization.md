# Independent crate workflow replay

## Scope

This replay used only the reviewed `crate-v3.png`, its supplied independent input review, and the supplied TRELLIS raw master as asset inputs. Existing world metadata was read only: `asset_wooden_crate` is a prop with an approximately 1.0-unit collision height and two camp placements at scales 1.0 and 0.8. The candidate therefore targets a grounded 1.1-unit height; this is a provisional art/fit decision pending integration and player review.

## Inputs and provenance

| Input | SHA-256 |
| --- | --- |
| `source/crate-v3.png` | `499aff00a962da53cb4a1eb22739272f5bb1e5c4eeb295f8c25e618270cec84e` |
| `source/reference-review.md` | `0638453db6fe1ad3acef450a787a8b9a6a76e34e3f0f8392b021da3441a26ca1` |
| `source/raw.glb` | `0a957ddae58fe28264f6a02b3c563447b32e5d3fb3679091b1a24f225ccbb527` |
| `source/trial.json` | `36beac2ee33bbf3a491e2cdb8b66ec77d63c8802099289b34bc73fc6650a1d62` |

The reference review passed its opaque white background and construction gate. The supplied generation receipt records local TRELLIS at seed 1234, 512 generation resolution, and a 1024-base-color texture. No new generation, network request, or paid service was used.

## Commands and observed outcomes

1. `check-game-glb.py --profile prop` on `source/raw.glb`: failed as expected at 57,182 triangles / 48,278 vertices and retained a metallic-roughness map.
2. `optimize-textured-glb.py --targets 4500 --merge-position-seams`: structurally passed at 4,497 triangles but the rendered crossed braces had black holes and visibly collapsed facets. Rejected.
3. `optimize-textured-glb.py --targets 4900` without seam welding: preserved more surface but stopped at 8,218 triangles, beyond the prop cap. Rejected.
4. `optimize-textured-glb.py --targets 4950 --merge-position-seams`: structurally passed at 4,947 triangles but retained the brace damage. Rejected.
5. Built the fallback `source/build_crate.py` from the reviewed structural design: panel core, four posts, top/bottom rails, crossed front/rear braces, three top planks, and dark corner caps. It uses a compact, locally generated 256² single base-color atlas and an editable Blender source.
6. `normalize-static-glb.py --height 1.1 --yaw-degrees 0` on the one-mesh fallback export produced the reviewed candidate.

## Candidate and structural evidence

| Artifact | SHA-256 | Evidence |
| --- | --- | --- |
| `handbuilt-v4/crate-editable.blend` | `45ff605db7f46eea55e1e430778d9fb9a12d32fb4c939c564982c36bbdd549e7` | Editable source scene |
| `normalization-final-v3/base-color-source.png` | `1ca3f373d5d3c8a8a717cc14eb2ad3298d3cddc90da97ab00b18d9252ff53b73` | One packed 256² base-color map |
| `normalization-final-v3/camp-crate-replay.glb` | `36c3fc85ae8a6f42a645c324dfee41a94edeefcfb6eacb6d61583d78bc023602` | Candidate model |

`normalization-final-v3/check-game-glb.json` passes the prop profile: 1,232 triangles, 2,688 vertices, one material, one 256² base-color texture, no bones, no animation, and no unsupported texture role. `normalization-final-v3/manifest.json` records a grounded Y-up, Z-forward output with bounds 1.1466 × 1.1466 × 1.1000 units.

## Visual evidence and review status

Large matching views are in `review/final-v2/`; the 128-pixel, game-scale three-view set is in `review/game-size-128/`. At game size the dark fittings, warm wood body, rail silhouette, and crossed braces remain distinct; no holes, detached parts, or texture corruption appear in the front, three-quarter, or rear render.

This is a **review-ready candidate, not admitted or integrated**. Its model review is pending an independent judge, as required by the asset workflow. Runtime/Author preview, collision/placement fit, actual phone performance, and owner art acceptance remain untested.

## Workflow findings

The skill correctly forced preservation of the raw master, reference/input review, texture-aware reduction, separate structural proof, grounded static normalization, and large plus game-size visual inspection. It also made the failure actionable: the reducer's triangle count alone was insufficient because braces were visibly damaged.

No shared helper was changed. `normalize-static-glb.py` initially raised `StopIteration` only because the first fallback GLB contained 28 mesh nodes, violating the helper's documented single-mesh contract; joining the export while retaining the pre-join editable `.blend` resolved it without a helper change.
