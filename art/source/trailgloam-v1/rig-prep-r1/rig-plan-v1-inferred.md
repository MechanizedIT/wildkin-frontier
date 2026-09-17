# Trailgloam R1 rig preparation

The retained textured GLB is a single mesh with UV seams and 1,048 disconnected vertex components. That is compatible with a first rig: preserve the GLB, texture, component boundaries and raw topology. Do not weld, remesh, decimate, or rebuild limbs before testing deformation.

## Fitted coordinate contract

Inspection bounds are X `[-.4996,.5010]`, Y `[-.4694,.4684]`, Z `[-.2481,.2466]`. The neutral front view shows the eyes/head along `-Y`; use Z-up and `-Y` forward, then verify that visual convention in the Blender neutral scene before binding. `landmarks.json` records fitted anatomical—not global-centroid—landmarks. Its 2.22 uniform scale gives an approximately 2.22 m wide × 2.08 m long × 1.10 m high creature with the six sole planes on ground after a +0.551 m Z translation. This is a proposed player-scale normalization, not recovered reference scale.

## First rig only

Create `root → body → head`; parent two frond chains at their recorded shell roots. Create six identical three-bone leg chains (`coxa → knee → ankle → hoof`) at the recorded attachment/knee/ankle/sole points. Use explicit deform bones and fitted analytic IK controls, with one per-hoof ground target. Weight each disconnected limb/cuff/hoof region to its nearest named chain and keep the shell rigid to body for R1. No automatic vertex merge or UV seam repair.

Before any full animation, prove: neutral pose; front-pair stance; rear-pair stance; one alternating tripod extreme. In every pose, all three planted hoof controls remain on sole Z=0, body stays above ground, coxa roots stay visually buried in the shell, and both frond roots remain covered. Then make one short tripod walk loop: left-front/right-mid/left-rear planted while the opposite tripod swings, then swap. This is a rig feasibility proof only—no Idle/Run/Attack/Hurt set, export, runtime admission, or species integration.

## Builder checks

- Import the GLB without conversion or apply only the declared *uniform* 2.22 scale and ground shift.
- Confirm head/eye direction is -Y in the actual neutral render; HOLD if not and mirror landmarks as one declared axis correction before skinning.
- Use vertex-group membership/weight reports, not topology reconnection, to demonstrate all six limb chains have exclusively assigned deform regions.
- Render neutral, front-pair extreme, alternating tripod extreme, and 48/96px tripod walk frames from front, side, three-quarter, top and underside. Visible cuff separation, texture seams, or disconnected groups are observations; only stretching, floating soles, exposed roots, or body collapse are rig failures.

The first reviewer assesses fitted pose readability and contacts. A builder deviation from landmarks must retain raw-axis evidence and updated measured bone centers.
