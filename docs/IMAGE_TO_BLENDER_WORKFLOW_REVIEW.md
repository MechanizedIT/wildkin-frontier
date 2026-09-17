# Image-to-Blender workflow review — September 14, 2026

Chris asked why the tree resembled primitive assembly, whether a detailed per-asset temporary skill would help, and whether stronger community modeling skills exist. He subsequently explicitly authorized creating that director, trying both researched community guides, and a fresh tree comparison. The original held candidates remain unchanged; the new study is separate, bounded and nonshipping.

## Implemented workflow and practical trial

The project now has an [asset modeling director](../.agents/skills/asset-modeling-director/SKILL.md), routed from habitat development and the asset forge. A separate analyst read the actual target and authored a construction plan; an independent reviewer caught an incorrect image ratio before building. The corrected plan distinguishes visible evidence from inferred depth, specifies geometry operations and requires early all-angle massing review.

Trial A used selected pinned Arjun modeling/reference/vegetation guidance in a fresh live Blender 4.5.3 build. Its first massing was held; a real connected wood repair passed massing, then final likeness scored 7.1 and 7.4 after the last canopy repair. Chris explicitly judged the new first attempt substantially better than the old balls-and-rods attempt. That positive comparison does not erase the remaining target-specific trunk and canopy failures.

Chris then asked why the planner had not ensured the visible bends, and requested section-by-section lengths, bend angles and taper. The original plan did name an S-lean and shallow elbows, with endpoint dimensions, but omitted intermediate sections and failed to enforce the resulting contours. The director now provides [concrete proposed section tables](../art/source/rootbound-buttress-study/director/section-construction-tables.md) and machine-readable geometry data. Lengths and bend angles are computed from the points; these are construction choices fitted to a perspective image, not exact recovered 3D measurements. A target-to-proof table checks the visible result, including junctions and silhouette, rather than accepting an operation or nonzero offset as proof.

Trial B used selected pinned RobLe reference/contour/modeling guidance and the stronger table. Its first actual massing consumed the table and retained bends, but left overlapping wood tubes and simplified canopies. The second attempt substituted Boolean unions, lost the continuous trunk and retained two disconnected shells; its initial object-count assumption was corrected by a graph audit. The final attempt retained 46 disconnected components and independently ended **Gate A HOLD 1.0/10**, with no palette/export/runtime admission. The evolving guidance and construction departures mean this is not a controlled comparison attributing differences solely to the two skill packs. [Actual illustrated results](../art/source/rootbound-buttress-study/review.html).

Both trials preserve actual images, editable Blender sources and independent reviews under [the study folder](../art/source/rootbound-buttress-study/README.md). No external skill was globally installed, and no downloaded executable code or paid generation service was run. Trial A retains exact source meshes but lacks separate literal historical MCP construction payloads; its journal explicitly discloses that limitation. Trial B saves its executed construction scripts as it works.

## Scale-reference proposal

Chris asked whether a known 1 m cube beside a target would help every agent infer dimensions. It can provide a useful relative scale anchor, especially in straight-on orthographic construction views. In perspective, depth and foreshortening must be accounted for; a generator drawing a cube with a label does not establish calibrated geometry. [Blender's camera explanation](https://archive.blender.org/wiki/2015/index.php/Doc%3A2.6/Manual/Render/Camera/) distinguishes the perspective and orthographic cases.

Provisional recommendation: keep the artistic target and add a separate construction sheet with a verified scale object/ruler, front/side views, explicit dimensions and shared camera/scale metadata. Use numerical image measurements to corroborate ratios instead of relying solely on visual estimates. This complements the curve/junction plan; it does not recover unseen geometry. The current target has not been edited or regenerated for this idea, and neither trial's pass count is reset.

## What actually happened

The first two tree scripts used cones for trunk/roots/branches and scaled icospheres for foliage. V2 corrected geometry orientation and proportions but repeated that construction method. V3 used custom ringed trunk, wedge-root, lofted fork and canopy-shell meshes, but joined component assemblies without welding them into continuous volumes. Fork cross-sections stayed horizontal rather than following their local tangents; shallow canopy bands produced flat platters. Independent scores were 2.7, 4.1 and 6.0/10 HOLD.

The reference was not processed by image-to-3D inference. The first owned TRELLIS startup was prematurely stopped after roughly 52 seconds: 13.10 GiB free remained above the 6 GiB post-launch reserve. That was a conservative early stop, not a demonstrated service failure. A later 17.82 GiB free-RAM check was below the 18 GiB pre-import gate, so no process started. The candidates were manual scripted Blender construction.

The final mesh used 433 triangles of an allowed 5,000; the budget did not require thin roots and flat foliage. A low triangle count alone is not evidence of good optimization or good art.

## Proposed per-asset construction brief

A separate modeling director should author a short asset-specific brief supported by reusable modeling guidance. Naming that file SKILL.md adds no capability by itself. Specific geometry decisions and early visual evidence are the useful additions.

1. Measure visible silhouette, proportions, mass depth, connections and negative space. Mark hidden surfaces and inferred views explicitly; generated complementary views are design proposals, not recovered truth.
2. Map each form to a construction operation: connected root/trunk loops with broad volumetric buttresses; tangent-oriented tapered lofts for curved forks; thick irregular closed canopy masses with deliberate windows.
3. Specify form dimensions, relative scale and junction requirements. For this tree, forbid capped root rods, disconnected foliage balls, thin canopy plates and merely joined overlapping shells as the finished result.
4. Build and independently inspect untextured front/side/rear/three-quarter silhouettes before materials and export. A massing correction belongs to the same counted candidate; substantial rebuilds still count against the production cap.
5. Fit materials, collision and mobile budget after the silhouette works. Preserve the final independent game-scale and runtime gates.

Use live Blender viewport inspection for small visible modeling operations, then preserve reproducible source and batch export. The project forge already has target review, changed-method repair and final multi-angle gates; this proposal adds a concrete geometry handoff and earlier massing check. It is not a guarantee that Astra will match arbitrary photographs.

## Existing skills and sources inspected

- Project forge, Dream Loop production, admission, and Blender MCP guidance; installed game-asset-production guidance. These help orchestration, provenance and technical packaging, but a generic asset pipeline does not supply asset-specific modeling judgment.
- [Blender Skin modifier](https://docs.blender.org/manual/en/5.0/modeling/modifiers/generate/skin.html): connected organic base surfaces from branching edges and vertex radii. Use the installed Blender version's API when implementing.
- [arjun988/blender-skills](https://github.com/arjun988/blender-skills): selected reference-image-match, vegetation and modeling guidance was used in Trial A, pinned to commit `8f778d2405a214b508d4c7d80742be8e43acdd52`. This tests the selected guidance in one local build, not every skill in the repository.
- [RobLe3/cc-blender-skill](https://github.com/RobLe3/cc-blender-skill): selected reference analysis, contour and modeling guidance is used in Trial B, pinned to `11016c9a5847897491dde935c346571bd7548e3d`. Its author reports Blender 5.1.1 validation; this local trial adapts applicable steps to installed 4.5.3. No general compatibility or quality guarantee is inferred.
- [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2): dedicated image-to-3D generation, distinct from an agent writing Blender geometry scripts.

Architectural scenes often offer measurable planes, repeated dimensions and familiar furniture that are convenient for scripted construction. That is a reasoned expectation, not a verified explanation of the specific social-media examples Chris saw. Their references, imported assets and amount of iteration are unknown.
