# Independent Rootbound framing study R1 review

**Final selection: 32-degree pitch-only using existing orbit controls. The initial projection-shift recommendation below is superseded by the final consolidation at the end. No production camera change is admitted.**

**Choose the 36° camera with the 12% upward projection shift as the one direction worth a separate scoped implementation study. Do not use the 28° tilt.**

The current centred framing protects player and HUD legibility, but it hides nearly all route-side coverage above the player. The 12% shift reveals the next shoulder/band in Meadow and Galleries and makes Crown’s deadwood/vegetation backdrop read as a destination rather than a cropped top-edge object. The player remains plainly visible above the lower controls, and the lower route surface remains readable.

The 28° tilt reveals more objects, but it produces a broad empty/horizon-like upper field and pushes the player and companion too close to the lower control area. It makes the current incomplete coverage look longer without improving travel decisions. It should not be treated as a better camera simply because more scenery is visible.

The shift does not itself solve the region: Meadow still opens into sparse coverage, Galleries still needs the larger structural shoulder/basin work, and the study is rendering-only. It proves neither pointer targeting, obstruction handling, collision, resize/landscape behavior, nor runtime control compatibility.

## One actionable next step

Prepare a small camera-only implementation plan for the existing 36° portrait mode: test a 12% upward focus/projection shift only while moving through the Rootbound route, with explicit preservation checks for baseline/landscape framing, pointer targeting, camera obstruction, HUD overlap, and resize. Compare one ordinary walk at the three matching stations before admitting it. Do not change terrain, ecology, assets, or global camera behavior in this step.

## Supported 32° pitch consolidation

The 32° pitch-only captures preserve enough of the useful gain to supersede the projection-shift diagnostic as the preferred direction. Meadow and Galleries now show the next coverage bands in the upper half without the 28° tilt’s empty horizon-like field, and Crown exposes the deadwood backdrop while keeping player, companion, route surface, and HUD legible. The player sits lower than baseline but remains comfortably above the joystick and action controls.

**Select 32° pitch-only for the next normal-input camera study.** It uses the existing orbit control and avoids introducing temporary projection-label/input ownership. This is a framing preference for Rootbound route evaluation, not authorization for a permanent Rootbound-only camera default or a global camera change. The same interaction, obstruction, resize, landscape, and ordinary-walk checks remain necessary before any runtime setting is retained.
