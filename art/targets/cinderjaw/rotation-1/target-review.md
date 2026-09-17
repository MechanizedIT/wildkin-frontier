# Cinderjaw rotation 1 — independent construction-target review

## Decision: PASS as a construction direction, with measured-plan constraints

The target is a coherent four-view direction for the current Cinderjaw: a low dark coal reptile with broad wedge skull, cream lower jaw and claws, a broad dark head silhouette, bent heavy tail, thick planted legs, and restrained warm/dark dorsal armour. The prompt refers to paired flame horns, but the routed `cinder3()` baseline has no `flame_horn` meshes; the visible head-top forms belong to the existing dorsal treatment and do not authorize a new horn component. It directly addresses the baseline's two demonstrated failures: blade-like vertical legs and a floating regular dorsal shelf. The target's 3.29m length, 1.56m width, and 1.23m height declaration matches the captured native bounds closely enough to anchor the next plan.

| Gate | Result | Reason |
| --- | --- | --- |
| Recognizable Cinderjaw identity | PASS | Skull, jaw, claws, tail, dark palette, and ember dorsal language are consistent with the baseline. |
| Four-view visual coherence | PASS | The same compact, low, planted animal reads in front, side, rear, and three-quarter directions. |
| Limb correction direction | PASS | Each limb is visibly thick, bent, and grounded rather than a thin vertical blade. |
| Dorsal-plate direction | PASS | The plates read seated along the back rather than as a detached shelf. |
| Direct model specification | HOLD | These are perspective construction views, not recovered orthographic measurements or executable section geometry. |

## Constraints for the measured modeling plan

1. Treat the declared baseline envelope as a bound, not the image's perspective scale. Compute all proposed extents from actual native coordinates and retain the existing collider, asset ID, rusher contract, skull, jaw, tail, claws, materials, and sibling assets exactly.
2. Replace only the four `low_clawed_leg` meshes with closed, volumetric bent limbs. Every limb needs a documented torso overlap, unchanged claw overlap, and a grounded contact extent in the all-angle output; no thin rod or unsupported foot may be hidden by a camera angle.
3. Keep the existing twelve dorsal pieces and their material family. Reposition/reshape them only enough to enter or visibly seat on the retained torso; do not turn the target's directional plate rhythm into a new spike count or feature set. The plan must prove attached bases from side, rear, and top views.
4. Keep the dorsal treatment restrained: it should strengthen the back silhouette without becoming a taller spiny creature, wings, flames, armour system, or new gameplay signal.
5. The next plan must identify exact component names, source-coordinate convention, target bounds, closed topology method, and independent all-angle plus 48/96px gates. It must not claim that target-sheet silhouettes are measurements.

This target is fit to guide one separate leg-and-dorsal visual candidate. It is not model or runtime admission.
