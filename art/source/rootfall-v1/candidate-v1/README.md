# Rootfall V1 candidate

Review **final/**. The files directly in this directory are an unadmitted first diagnostic study; **refined/** is the preserved intermediate export before object transforms were baked. Their renders were stopped after useful diagnostic frames. They are not shipping candidates. No earlier sources were deleted.

The final source was built from the independently reviewed CLOSED V3 target (`art/targets/rootfall-closed-v3/target.png`, SHA256 `3a89cdcd50110dfe973f7db3db13933f89def30c6570b1a9ac47c756d07caa58`) and its fixed-plane layout contract. The procedural Blender method is a bounded original reconstruction; no image-to-3D inference or downloaded model was used. Explorer is the already admitted model and is only in the review scene.

Status: **frozen for independent model review; no model/native/phone admission**. Root owns runtime/world integration. The simplified bark, small working notches and support silhouette require the independent visual judgment; measurements do not establish aesthetic quality.

## Frozen source

`final/manifest.json` contains exact component SHA256, geometry/material checks, bounds, five world-format convex descriptors, seam placement, support contacts and evidence hashes. `final/geometry-validation.json` is the existing project convex validator plus exact GLB hash/identity-transform check. All five prop nodes have baked identity transforms and the same ground origin; all six files have one embedded opaque matte palette material each. The seam intentionally has three named mesh draws.

The six GLBs total **169,260 bytes, 2,198 triangles and 8 draws**. CLOSED instances left/right/center and two seam copies: 1,578 triangles / 9 draws. OPEN instances unchanged left/right and both braces: 1,974 triangles / 4 draws. The builder and six editable Blender files are retained in final/. No runtime registration or shipping copy was performed here.

## Assembly and collision

- Game axes: X across passage, Y up, +Z approach. All five ordinary props use assembly origin (0,0,0), yaw0, scale1. Proposed world placement (0,1.35,-31) remains parent-owned.
- Exact central interval X[-1.65,1.65], Y[0,2.2584], Z[-1.0549,1.1519]. The central convex envelope uses 17 points. CLOSED reaches the lane floor; jump/capsule blocking still needs native checks.
- Retained left and right occupy X≤-1.65 / X≥1.65. Their existing convex descriptors use20/18points and deliberately model body/foot envelopes rather than separate branch fingers; raised branch tips are visual detail. No hull spans the opened lane. Small gaps between outside fingers are conservatively blocked; review their native fit.
- Left brace occupies X[-3.1042,-1.9340], Y[-.0132,1.5761], Z[.5745,2.2173]; right is mirrored. Each44point hull covers its two timber members and lashing. Feet penetrate neutral ground by at most1.32cm. Some bank-stone tips penetrate by11.8cm; keep these seated rather than lifting the whole assembly. Main trunk/root foot vertices meet Y0.
- Both timber pairs bear into retained wood at (±2.15,1.48,.72). Their feet are (±2.06,.04,2.16) and (±3,.04,1.74). One three-turn fiber lashing per pair represents two lashings in total, supporting four timber members. Parent's near-side brace control around(-2.3,.7,2) is within reach of the actual supporting wood.
- One reusable `rootfall-seam.glb` places at(-1.65,0,1) and(1.65,0,1), scale1/yaw0. Its OWN origin is ground level beneath the notch; chip bounds are X[-.28,.265], Y[.93,1.23], Z[-.065,.07]. Nodes are `RootfallBark_chunk_0`, `_chunk_1`, `_chunk_2`. Use the manifest targeting box and `collisionEnabled:false`; ordinary trunk owns physical obstruction. The chips clear only shallow front fractures, with core and exterior bark retained above/below/back. Removing both seams alone does not remove the central prop.

The OPEN comparison only hides the exact center and seam objects and reveals both braces. Left/right imported geometry, transforms, banks, foliage and hashes remain unchanged. The immutable plane locations leave a3.3m opening, including .15m margin on each side of the required3m corridor. Parent must prove return landing, raised-ridge contacts, adjacent terrain anti-bypass and actual passage traversal.

## Reproduction and evidence

Run `tools/art/build-rootfall.py` using Blender4.5 background mode, `--threads 2`, and new absolute `--output-dir` / `--review-dir` paths. Builder refuses existing destinations. Each render uses Cycles CPU2threads12samples; no GPU/inference or modifier expansion. Initial available RAM was about16.2GiB and this bounded process exited cleanly.

Nine final PNGs and a fresh-import review Blend are at `.dream-loop/overnight2-rootfall/model-v1/final/`: front/quarter CLOSED and OPEN pairs, side CLOSED, brace contact, notch detail, and locked-camera Explorer-scale CLOSED/OPEN frames. The latter use the existing52° camera projection/offset fixture but are neutral renders, not native gameplay. Their high root tip is partly cropped; the full orthographic front/quarter images establish the complete silhouette.

The reproducible geometry check is `.dream-loop/overnight2-rootfall/model-v1/validate-candidate.mjs`. It checks each exact GLB SHA and baked prop transform and runs the existing `validateConvexCollider` on all five descriptors. All pass; no full tests/build/browser/Blender runtime integration or physical-phone claim is made.
