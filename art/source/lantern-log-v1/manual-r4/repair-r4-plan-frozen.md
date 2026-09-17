# Lantern Log R4 — broken wood repair

Root plans; a separate builder implements; an independent reviewer judges the plan and actual renders. This is one substantial repair after two guarded TRELLIS attempts and manual R3: constituent attempt four of the working six. Preserve every R3 artifact. No runtime export or placement.

## What changes and why

R3 reads as a pale manufactured rail. Preserve its six closed stems and caps exactly, including vertices, faces and object transforms. Keep their successful attachment locations and the shallow closed recess. Replace only the log/bark geometry, refit the three small moss patches to that geometry if necessary, and correct the sRGB-to-linear palette conversion. Do not spend this pass adding unrelated detail or changing the colony.

Use the existing Blender 4.5 section-loft builder and its final real-triangle audits. The new body has the same five section centers/radii as R3, but a fuller uneven lower belly, four broad inset fissures and irregular broken end rims. Remove the six separate parallel bark strips entirely. These are source-master construction choices; do not constrain quality to the old triangle count.

## Literal body surface

Start from the exact twelve original ellipse-ring vertices at 0,30,...330 degrees for each R3 section. Extra angular samples must interpolate the neighboring original polygon vertices, not substitute a smooth ellipse; this preserves the upper substrate under the colony. Angles are measured in the Y/Z section plane, with 90 degrees at the top.

Add groove samples at 165/175/185, 215/225/235, 290/300/310 and 335/345/355 degrees. The four middle samples are the groove valleys; the two adjacent samples are the shoulders. Their maximum inward radial depths are respectively .025, .030, .025 and .018m. Multiply depth by longitudinal weights [0,.65,1,.60,0] across the five original rings. Recess the valley toward the section center, leaving shoulder positions unchanged. Use darker wood on groove walls, not black stripes painted on raised rails. Grooves end at intact wood on both end rings.

Before grooves, apply the following lower-belly transformation to each original/interpolated section point. Let w=max(0,-sin(angle)); relative Y/Z coordinates are scaled by 1+w*(factor-1), and add w*shiftY to Y. Ring factors are [1.06,1.00,1.12,.96,.84]; ring shiftY values are [-.005,0,-.025,.010,.005]m. Upper points at angles 0–180 are unchanged apart from the small 175-degree fissure. This adds uneven grounded volume while protecting the measured upper attachment surface. Keep the original .075m source floor clip and -.075m whole-asset translation.

At the near outer rim only, offset X using the twelve literal values [-.045,.025,-.075,-.140,-.055,.012,-.105,-.020,-.145,-.030,-.095,.020]m; linearly interpolate them for extra angular samples. This produces a broken rim rather than a uniform ring. The inner rim stays at X=-.8, the dark closed recess face at X=-.7. Use the accepted .58 inner radius, with additional twelve angular radial factors [1.02,.94,1.00,.96,1.03,.93,1.00,.95,1.02,1.00,.96,1.01], interpolated for extra samples. The source inner bottom stays at .0861m, above the clip; verify no degenerate annulus triangles. The recess remains shallow and closed, with no implied passage.

At the far outer rim use the twelve X offsets [.030,-.025,.050,.080,-.035,.025,-.040,.015,-.030,.010,.045,-.020]m. Additionally raise the 60/90/120-degree rim vertices by [.035,.110,.020]m in source Z, with other vertices unchanged and extra samples interpolated. This makes one compact broken upper tip; do not add a separate floating spike. Close the end with valid triangles and actual winding/area checks. Assign endgrain to the exposed end surfaces, preserving visibly darker bark sides.

## Moss, materials and proof

Retain the three moss patches' named locations and footprints. If a new surface creates a gap, refit their existing perimeter vertices using bounded rays against the actual new log triangles, with the same small embed/proud offsets. Do not claim an analytic ellipse intersection proves contact with the grooved mesh. No fungal geometry moves. Before rendering, verify exact R3 stem/cap vertex/index/transform identity, final component closure and consistent edge winding, no degenerate triangles, positive log ground-plane triangle area, and all six real log/base and cap/underside contacts. Intentional component overlaps remain; no mesh-union or global-intersection proof is claimed.

Interpret the existing hex colors as sRGB and convert their channels to linear shader values. Keep the original palette values and roughness; the wood should be warm brown, caps violet, stems pale and moss olive. Record this presentation correction separately from geometry. Use the same neutral studio settings on comparisons and do not use glow or a beauty camera to conceal contacts.

Render the preserved R3 and repaired R4 with the same seven directions at 512/96/48px, using a shared camera fit enclosing both actual models with at least 5% margin. Use absolute output paths and assert all expected PNGs exist. Save R4 as a separate editable blend and record exact geometry preservation, full bounds, counts, hashes and terminal outcome. Compare the near-end silhouette, interrupted side grain, far broken tip and colony at all angles. A lower-quality R4 does not erase R3. If a structural defect repeats, stop and change method rather than adding another cosmetic pass.
