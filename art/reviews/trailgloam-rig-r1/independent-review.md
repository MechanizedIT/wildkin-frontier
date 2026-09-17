# Independent fitted-rig R1a review

**RETAIN as a fitted-rig feasibility candidate; runtime and motion admission remain HOLD.**

The exported GLB hash matches the reported `d3163edb5536dfd4d1fa39895f2a8e2bac71372d83cbe854913c667786f4dab7`. The neutral and loaded three-quarter frames retain the useful low, dark-shell silhouette, eight heavy articulated legs, amber eye points, and paired dorsal amber fronds. The 8 cm diagnostic compression visibly loads the stance without tearing the shell.

Across the side and three-quarter walk phases, the four-foot alternation produces real limb travel and I do not see limb stretching, collapsing body faces, UV/texture breakage, or a detached hoof. The gait remains deliberately mechanical and small in presentation; it is a fit proof, not a gameplay-ready walk.

Root's `inspect_fitted.py` receipt supports the visual reading, which I independently reviewed: source-to-neutral surface maximum error is 4.16e-7 m, UV and loop-foot differences are zero, minimum foot stroke is 0.13827 m, and stance sole absolute Z maximum is 8.34 mm. The exporter adds 40 split vertices. An obsolete strict count-equality assertion stopped the original final verification; the count difference alone was not a model defect, and the later direct comparison validates this same GLB without regenerating it.

Remaining debt is visible rather than structural: the gray cuff bands read as hard seams at several joints, the eight dark block hooves still dominate the low profile, and the dorsal fronds read as coarse upright wedges. Keep those as targeted art/weight review items only if actual in-game motion exposes a problem. This review does not establish runtime skinning, collision, AI, save behavior, or a full locomotion set.

