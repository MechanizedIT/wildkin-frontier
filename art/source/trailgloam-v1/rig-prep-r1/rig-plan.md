# Trailgloam eight-leg rig builder handoff

`landmarks.json` is the sole operative input. It uses actual Blender-world coordinates, Z-up, with no axis rotation. Apply only uniform scale and ground shift recorded there. Preserve the existing textured GLB and its disconnected/UV-seamed components: no weld, cut, remesh, or topology repair.

Bind the eight supplied chains directly. Each `sole.target_xy` is the actual ankle center; `sole.z` is that hoof component's measured lower bound. `bounds_min` is diagnostic evidence only, never a target position. Attachment roots are numeric, provisional shell insets; neutral view must show them covered before any loaded pose.

Use the supplied four-foot stance groups, 4.5cm loaded lift, and 1.1s alternating diagnostic walk. Render neutral, one loaded pose, and short walk frames for fit review only. This is not export, runtime, or motion admission.

## Root fitted R1a amendment

The original 4.5cm diagnostic value is superseded for the fitted R1a build by **8cm downward body compression**. A numerical sweep of the exact fixed-length chains and 34 gait samples found the original drop left rear-right targets 2.019cm beyond reach; 6.5cm still left 0.633cm excess, while 8cm resolved all sampled reach excess. The new build tightens the reach gate to 0.00001m rather than accepting clamped feet. Mesh/UVs, metric scale, landmarks, 1.1s cycle, 14cm stroke, 60% stance duty and 5.5cm swing lift remain fixed. Neutral remains the unchanged source pose. This is a provisional fit diagnostic; useful compression, joint shape and foot contact require actual exported visual review. Diagnostic GLB export is authorized; runtime/motion admission remains pending.
