# Thornprowler — measured attachment plan V1

Root planner; separate builder and independent reviewer required. No production model has been changed. The actual baked baseline and authoring baseline are captured separately. Both have23meshes/629triangles; their small thorn-bound difference remains explicit. The reviewed target is direction only; its erroneous horizontal height annotation is not a measurement. Use the current model's actual envelope, source identity and protected components.

## Shape and literal handoff

Load `anatomy-plan-v1.json` verbatim as game XYZ metres. It freezes the modeling source and generated target hashes. Four legs use four horizontal eight-vertex rings each, from a cap **inside each actual paw** through a broad ankle/knee and inward shoulder to a cap **inside the actual torso**. Each endpoint cap records all eight double-sided shell intersections and the common interior interval; minimum/maximum Y and overlap are numerical evidence, not nominal body-box estimates. The full footprint of each cap must remain buried after construction. The rings store concrete centers, radii, vertices, segment lengths and bend angles; inferred intermediate anatomy is a modeling choice, not image-recovered geometry.

Front centerlines bend about24.7° then10.6°; rear about35.3° then3.5°. The broader intermediate rings provide squat weight-bearing volume, while the inset top rings avoid breaking through the side shell. Compare visible outer contours in actual side and three-quarter views; a long thin hanging rod is unacceptable even when its top is technically buried. Preserve all four original paw meshes/materials/transforms exactly.

Seven six-sided thorns retain ochre identity. Their bases follow actual torso shell samples, with six corners per base and one tip. The lateral centers contract from0.17m spacing to0.15m because the original far-right footprint plus proposed radius missed the real torso at X0.575,Z0.25. The final stored points have complete shell intervals. Alternate visible tip clearances are0.21/0.24m, with a restrained0.025m rearward tip lean; no new horns, armour plates or extra spines. Base burial and bottom overlap are recorded at all42corners. The tip's host-surface height is measured separately from its base.

## Native Three.js construction

This is a code-native mesh repair. Applicable modeling-director guidance contributes full host-shell attachment, visible curved contours, literal inputs, directed-edge winding and actual native proof. The pinned Blender modeling guidance informs volume/joins and multi-view inspection; no Blender operation or export is needed for this lane. Preserve current Three material/color owners and the existing factory/actor system.

The existing closed-ring limb helper can consume each32-vertex four-ring limb with profileSize8 without modifying its implementation or any Cinderjaw data. Each limb has60triangles. Each thorn uses its stored six-vertex convex horizontal base, six side triangles to the tip and four base fan triangles:10triangles. Orient the complete closed mesh consistently, then verify opposite traversal of every shared edge, positive volume and outward faces; positive total volume alone is insufficient. No smoothing, new texture or generic primitive substitution is needed. Expected final total:770triangles,23meshes.

Limit changes to Thornprowler's four `articulated_leg` and seven `staggered_dorsal_thorn` meshes. All12other components—torso/head/jaw/four paws/four eye pieces/tail—must match the frozen native snapshot exactly, as must all six sibling species. The source JSON includes a computed changed-parts envelope inside the original authoring bound. Confirm the complete resulting model too; preserve the current collider and all existing gameplay fields.

## Evidence and admission

Independent plan review precedes a separate builder. Builder validates literal inputs, volumes, directed edges, torso/paw attachment and exact protected/sibling parity; root captures matching front/rear/side/top/three-quarter and48/96px neutral views. The judge compares actual contour and contact against the generated target. Initial plus at most two repairs, stop early on PASS.

Only after visual retention, root runs the focused `--asset asset_thornprowler` bake and regenerates world data. Compare actual source→recipe→generated→factory meshes, while preserving every unselected record and the selected gameplay metadata. Existing Fungal Hollow encounter supplies ordinary warning/charge/retreat proof; no new spawn, tame, companion utility, behaviour, collision or persistence change. Close the integrated package checks once at the resulting checkpoint.
