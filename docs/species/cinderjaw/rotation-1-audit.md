# Cinderjaw rotation 1 — current audit

## Status

Visit closed: R2 visual8.1 and factory-fixture PASS; focused bake and package/save gates pass. No gameplay or continent spawn change. The planning chronology below is retained.

## Current asset and likely visual gap

The authoring route for `asset_cinderjaw` calls `cinder3()` in `src/world/wildkinMeshKit.js`; the actual catalog runtime reconstructs baked `parts` through `createVisualAssetVisual`. This checkpoint now verifies their parity. It is a compact low reptile: a seven-sided armored torso, six-sided broad skull, cream lower jaw, four named `low_clawed_leg` lofts with four claws, two inset eyes, twelve staggered dorsal tiles, and one tube tail. Its identity reads as a dark coal reptile with warm orange plates without horns in the routed cinder3() mesh.

The actual neutral side baseline now disproves the source-only reassurance: the four vertical leg lofts read as thin blades and their torso/ground contact is not convincing. The dorsal plates also appear to float as a regular shelf. The first construction priority is therefore four planted, visibly volumetric legs with clear upper-body and claw/ground attachment. A complementary target may also specify restrained attached dorsal plates, but it must not distract from the leg-volume failure. The eye/skull bite silhouette remains a phone-scale review question, not a licensed feature change.

## Existing gameplay contract

The generated asset record defines Cinderjaw as an AGGRESSIVE `rusher`: health 16, damage 2, move speed 2.3, notice radius 7, personal space 2, roam radius 4.5, leash radius 10, and 28-second respawn. Its collider is a box, offset Y=0.6, size W=1.4/H=1.2/D=1.2. These are existing data, not proposed tuning. The generic rusher owner supplies the alert/chase/windup/lunge/recover path; no Cinderjaw-specific tame, companion, utility, persistence, or motion owner was located in the current runtime search.

World data references the visual asset at multiple placements, but this audit does not infer habitat role or admission from those references.

## One bounded next candidate, pending baseline and review

Capture the actual code-native Cinderjaw from front, rear, left, right, three-quarter, top, and 48/96px first. Freeze component, sibling, material, transform, bound, and collider receipts. The baseline confirms a combined leg-and-carapace visual issue. Prepare one target and then a measured **leg-and-dorsal-attachment-only** plan: replace only the four blade-like leg meshes with connected volumetric limbs and make the twelve dorsal pieces read as restrained attached plates. Keep the existing torso/skull/jaw, four claws, tail, material family, total bounds, collider, asset ID, and rusher contract exact. A separate plan reviewer must decide whether that repair actually improves the silhouette before any builder work.

Do not change behavior, damage, detection, movement, collider, interaction, capture state, utility, or habitat placement in this visual lane. If the neutral capture already reads as a continuous armored predator at phone size, HOLD instead of manufacturing a geometry pass.

## Evidence still required

- actual neutral and phone-scale captures plus source/component/sibling freeze;
- independently selected target and measured, reviewed construction plan;
- separate visual builder and independent visual Gate A;
- normal player-facing rusher encounter proof only after a visual candidate passes;
- an explicit decision on whether Cinderjaw has any existing bond/companion path before proposing one.
