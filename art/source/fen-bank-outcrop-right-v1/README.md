> Current integration: exact models are now admitted in the V4 bank (independent actual-game score 8.0), with native hull/Author/access/fade and exact packaged online/offline proof. See docs/SHATTERFEN_BANK_REVIEW.md. The studio candidate record below preserves its original narrower admission and earlier pending notes.

# Two assembled Shatterfen outcrops — V5 model candidate

Independent assembled model admission PASS 8.0 by level_design_review; see independent-review.md. Native bank composition/contact/occlusion and owner phone review remain pending. The parent authorized the two-body assembly as the reference-comparison unit after standalone V4 scored HOLD 6.5. This does not claim V4 or either isolated component independently matched the bank target.

| Component file / eventual asset package | Role | Full local X/Y/Z size | GLB SHA256 |
| --- | --- | --- | --- |
| fen-bank-outcrop-left-v1 | Low ledge | 3.3 / 0.85 / 2.8 m | 88042856133aacefb65c281eb3b3e4da8664878e44f2deef7534ec4cd68338e4 |
| fen-bank-outcrop-right-v1 | High shoulder | 2.6 / 1.6 / 2.5 m | 46e1b60328873b89eb99f622ecf5ca4628cd66fbbbdfffd3592fbe9d762ea109 |

Each component is one closed convex mesh, one matte material, one embedded 256×256 palette and 324 visual triangles. Two copies of each across the bank cost four batches and 1,296 triangles total. The two GLBs together are 34,296 bytes. The low ledge and high shoulder are deliberately unequal, with oblique side planes, a ground-reaching knee and one subdued patch following an upper edge.

Each corresponding `*-collider.json` supplies exactly 20 unique local Y-up points and 36 outward triangles in the parent's fixed-prop convexHull format, zero offset. These are the actual rock surfaces, not boxes or an enclosing compound hull. Body→body overlap in an assembly is intentional, closed and supported; there is no air bridge across a concavity. Palette tessellation is linear, not smoothing; source checks show visual/physical area agreement within 3.2e-7 square meters and no non-manifold edges. The old `recommendedBox` values in the manifest describe bounds only and are explicitly rejected as collision by `boxStatus`.

## Exact reviewed assembly transforms

All positions below are local game X/Y/Z, scale uniform, yaw zero. World placement, actual ground sampling and burial are owned by world_action_ui; these model renders stage both local bases on Y=0.

| Assembly | Component | Local position | Scale |
| --- | --- | --- | --- |
| Left | Low ledge | (0.35, 0, 0.60) | 1 |
| Left | High shoulder | (-0.65, 0, -0.50) | 1 |
| Right | High shoulder | (0.35, 0, -0.10) | 1.25 |
| Right | Low ledge | (-1.00, 0, 0.55) | 0.72 |

The left combined envelope is X[-1.95,2.0], Z[-1.75,2.0], height1.6m. The right is X[-2.188,1.975], Z[-1.6625,1.558], height2m. The world worker checked these fit the protected envelopes centered at (18.2,4.2) and (31.3,7.8). The established resource rock (27,12), crystal (29,18), spawn, monoliths, receiver and waypoint retain their own ownership and require native route/occlusion/contact proof after integration.

## Evidence and provenance

The eight PNGs show the actual component GLBs reimported fresh and assembled at those exact transforms: left/right front, three-quarter, rear and Explorer scale. The scale figure is the actual current Explorer V2 skin, measured from evaluated armature-driven body vertices and fitted to 1.6m. Imported hidden bone-widget geometry is excluded. All views used one Blender background process, CPU four threads, 512px and 20 samples. The process ended normally; no GPU inference or heavy modifier was used.

Editable source is `outcrops-editable.blend`; isolate the two named component objects as needed. The frozen builder reproduces both component GLBs, collision files and assembled review views. Structural checker reports both pass. Prior V1–V4 remain available: V1 boxed silhouette HOLD4.2; V2/V3 rejected palette triangulation; V4 technically clean but standalone silhouette/sticker moss HOLD6.5. V5 changes composition and component proportions, reduces moss, and does not lower or replace the target.

Reference: target-v1/target.png, SHA256 `2743ce18201b2c9b3129947211ac4758b6fe5c90f4861db7a676ce660303b882`. Root authored the generated reference with the built-in image tool (backend undisclosed); level_design_review independently admitted reference fitness8.3. fabricator_model reconstructed these meshes in Blender; level_design_review judges the exact assembled output. No terrain, world, UI or gameplay source was edited by the model implementer. No shipping registration or owner phone acceptance is implied by this candidate.
