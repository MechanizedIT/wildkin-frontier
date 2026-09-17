---
name: asset-modeling-director
description: Analyze a game-asset target image and hand a separate Blender builder a measured, asset-specific construction plan with early silhouette and volume checks. Use before reference-driven manual modeling or after repeated likeness failures.
---

# Asset modeling director

**Latest owner review direction:** apply [Rootbound practical asset reuse and showcase review](../../../docs/ROOTBOUND_ASSET_REUSE_REVIEW.md). Attractive, useful actual results may be used despite target differences or lower scores; older fixed score thresholds below are superseded for this focused run. Review reusable components, material-yield ideas, arrangement/rotation/scale/tint variants, and useful curve-authored roots/trunks. Preserve focused correctness and actual gameplay proof.


**Focused Rootbound override (latest September 14 owner direction):** use [ROOTBOUND_FOCUSED_GOAL.md](../../../docs/ROOTBOUND_FOCUSED_GOAL.md). Work continuously within Rootbound and its constituents; up to six substantial attempts per constituent/composition experiment, independent review each time, method change after two repeated defects. After six unsuccessful attempts, work on another Rootbound constituent and revisit with a concrete new approach. Keep useful partial gains against the retained baseline; preserve held candidates and reusable parts. Earlier three-pass/rotate-away rules below are historical for this focused run.


Use the project asset forge and production loop policy. This skill fills the gap between an approved visual target and a builder choosing geometry operations. It does not generate or admit the model itself. Preserve the current owner's scope, runtime limits, and separate builder/reviewer roles.

The planner must explicitly read the applicable Blender modeling guidance and relevant installed-version tool/API notes before choosing construction operations. Access to a skill/tool is not evidence of using it. Prefer proven operations/recipes; name their contribution and adaptation to the asset. An unfamiliar junction/surface method should first pass one tiny isolated construction probe, with actual geometry evidence, before a whole asset depends on it. Do not rename a substantial failed asset build as an uncounted probe.

## Inspect the actual target

Open every relevant image. Separate observations from inference: a single perspective image does not reveal exact depth, hidden junctions, orthographic proportions or topology. Record source paths/hashes, intended real-world envelope, camera assumptions, visible parts, structural hierarchy, silhouette landmarks, relative dimensions, negative spaces and ground contacts. Express measurements in normalized image coordinates where useful; describe uncertainty rather than inventing exact recovered geometry.

Identify the few forms that make this asset specific. Names such as tree, root, chair or canopy are insufficient geometry instructions. Explain cross-section shape, thickness, taper, curvature, attachment, asymmetry and front/side silhouette. Distinguish low-poly faceting from insufficient volume or an unfinished blockout.

When attaching a new form to an existing mesh, inspect the actual host surface at the intended roots and silhouette peaks. Ray intersections and surface normals can establish buried-base overlap and exposed clearance; a bounding box or nominal body height cannot. Emberhorn R2's tapered mane was mostly buried despite correct closed volumes. R3 used 45 actual torso hits to set visible crest heights, then passed separate neutral and ordinary portrait review. Record the actual vertices and normal/clearance assumptions, and still judge the resulting image.

For a limb entering a solid body from below or the side, inspect both shell intersections across the complete attachment footprint. A vertex below the top surface can already be inside the body; it does not prove a gap. Cinderjaw's first plan had valid centre overlap but missed the body at several outer ring vertices. The corrected plan chose a cap plane inside the common bottom/top shell interval of every ring vertex. Preserve actual misses and uncertainty rather than turning a one-sided ray into a false whole-volume conclusion.

For curved forms, describe a centerline with meaningful offset and changing direction, section radii/taper along that path, and section planes oriented to the local tangent. Require the bend to remain visible in the relevant inspection views. A curved input that becomes a straight-looking bulky union is not sufficient; judge the resulting inner and outer contours. Keep visible source curvature separate from inferred depth.

Choose the cross-section and surface type explicitly. Do not model every path as an elliptical tube: a buttress needs a grounded widening web beneath its upper contour, a panel needs a slab, and a fork needs a continuous junction surface. Path/section numbers describe only the parts they actually constrain. Specify remaining surface extents, ground profiles and connections so exact coordinates cannot conceal the wrong kind of form.

Check that reported ratios agree with the actual image dimensions and measured subject bounds. Keep image-space gates separate from world-space dimensions when the reference camera is unknown. Count occluded parts across complementary views; do not force every part into one view and distort the model to satisfy that artificial rule.

Before plan approval, compute the complete proposed envelope from every section, appendage and foot extent in the declared axes. Compare this with the headline dimensions and target ratios; coordinates plus half-widths/depths must fit the stated bounds. Resolve contradictions explicitly before construction. The Trailgloam trial exposed a 1.45 × 1.55 m headline footprint whose own hoof table required about 1.88 × 1.89 m. A builder cannot satisfy both, and a review must not attribute this solely to builder deviation. Repeat the same measured envelope and part-ratio check on the actual massing before detail.

## Write the builder handoff

Save `construction-plan.md` and a compact `reference-manifest.json` beside the experiment source. Validate machine-readable data and freeze its version/hash before handing it to the builder; preserve earlier versions and avoid editing an input while another agent consumes it. Include:

For numerically planned custom surfaces, save the actual computed section vertices or equivalent executable parameters in that frozen input. English formulas alone are not machine-readable geometry. Recompute the envelope and section clearances from the stored arrays and check them against the written plan. Use explicit UTF-8 for both writing and loading. Sunscar R3 exposed a corrected prose description whose operative coordinate formula still contained the rejected values; literal checked coordinates removed that ambiguity.

- Target identity, asset role, dimensions, palette, runtime budget and non-goals.
- A part hierarchy and observable landmarks with known/inferred status.
- A suitable construction operation for each consequential form: e.g. connected cross-section lofts, bridged loops, extrusions, custom surfaces, curves, or a justified generator. Primitives are useful blockout tools; they are insufficient as final geometry when their contours contradict the target.
- Volume and attachment requirements, including minimum useful thickness/depth ranges specific to this asset and normal-camera use. Keep hidden-side design plausible and declared provisional.
- For shape-defining curved members, provide section-by-section construction tables and machine-readable data: centerline points in declared axes/units, section width/depth (full dimensions or radii explicitly stated), segment lengths, computed bend angles/directions, taper and attachment locations. Choose concrete starting values rather than leaving only endpoint ranges and adjectives such as "shallow elbow." Derive lengths and angles from the points so the specifications cannot contradict each other. Label these as proposed modeling choices fitted to visible evidence; unknown depth is not recovered measurement. The builder reports deviations and their visual reason.
- Build order and two visible proof points: untextured massing from front/side/rear/three-quarter before detail; then exact exported model at game scale. Compare the source-facing camera separately from orthographic inspection views.
- A target-to-proof table mapping every defining visible shape to its construction operation, named review view and visible failure condition. The reviewer checks the actual result against this table; merely executing the listed operation does not satisfy it.
- A short list of target-specific unacceptable shortcuts and the topology/shape operation that repairs each likely failure.
- What the chosen community/reference skill contributes, applicable version adaptations, and instructions overridden by the current project contract. Do not import unrelated shader, wind, LOD, paid-service or engine work.

When external skills prescribe image processing, distinguish numerical analysis from image editing. Follow current image-tool rules for generating/editing reference images. Do not pretend a perspective target is an orthographic template or satisfy a silhouette score by making a flat cutout that fails side views.

## Separate execution and judgment

For overlapping plates, feathers, shingles or foliage, projected tip spacing alone does not establish visible layering. Check the proposed surfaces against their actual host and other occluders from the fixed review cameras. A small CPU depth raster with part labels can measure exposed pixels before a counted build; retain its executable input and results, including expected opposite-side occlusion. Choose thresholds for useful gameplay-size readability, not merely one visible pixel. Skydancer's first two plans had separated endpoints while the native renders still showed a solid dark wing. The actual render remains the final visual gate.

The planner owns the feasibility computations requested in its assignment. A list saying that the builder must eventually measure attachment, envelope or visibility is not a completed planning receipt. Execute the bounded proof, state a specific blocker, or return a clearly incomplete plan; independent review must not promote deferred checks into observed evidence.

A separate builder consumes the plan and relevant modeling guidance. Prefer loading the machine-readable section data directly over manually retyping it; retain the input hash and actual executed construction scripts. Record any missing surface/junction specification before substituting generic geometry. An independent technical reviewer with the applicable modeling guidance first judges the plan's visible evidence, geometry, tool compatibility and construction feasibility. Only its approved version proceeds to whole-asset construction. Material method or topology revisions require a focused re-review before execution; do not treat an old PASS as approval of a changed recipe or silently substitute a forbidden operation. The actual blockout then receives independent visual/geometry review before expensive detail/export. The plan author may clarify geometry intent but cannot independently pass its own design or model. Mesh and runtime admission remain separate forge gates.

When a builder has materially failed to execute an approved topology recipe, require independent inspection of the actual next build script before another counted run. Map each attachment, surface and audit to executable construction, not comments or a declared graph. Put closure, connectivity, grounding and envelope assertions before expensive rendering. A source review cannot guarantee Blender execution; preserve a failed pre-render audit as a terminal result under the visit cap. Resolve reusable construction uncertainty with a genuinely small isolated method probe on a later authorized task, rather than renaming another full candidate as a probe.

Audit the triangulation actually rendered (`mesh.calc_loop_triangles` in Blender), rather than a separate hand-fanned approximation. A concave end face needs a valid triangulation of that individual boundary; filling disconnected boundary loops together can create incorrect caps despite a closed-edge count. BVH overlaps are broad-phase candidates, not confirmed intersections. Narrow-phase tests must distinguish shared-edge neighbours, single-vertex contacts and genuine crossings. If a visual closure gate requires an opaque cap image, measure the rendered coverage and fail before studio renders when it is missing; merely writing a PNG is not that gate.

A positive total signed volume and two uses per undirected edge do not prove consistent outward winding. Ironspine's literal plan had inward end caps while both aggregate metrics passed. Require opposite traversal of each shared edge and actual outward cap normals; preserve the failed audit. An explicitly permitted normal recalculation can repair winding without changing shape or consuming a new geometry pass, but recheck the actual rendered triangles, volume and cap coverage afterward.

Correct routine audit/API mistakes within a run when the geometry and approved method remain unchanged; record the correction and rerun the cheap failing audit. Count substantive geometry/method rebuilds, not logging or API repairs. Review a changed construction recipe before execution, and preserve failed candidates rather than relabeling them.

A pass can contain incremental modeling operations and visible checks. Count substantial rebuilds/regenerations under the owner-authorized cap; intermediate renders do not reset it. Stop when the allotted experiment ends and record differences between the intended plan, executed operations and actual result. More prose, more agents and lower triangle counts are not proof of improvement.
