# F1B — rolling wet/dry transition

September 12, 2026. Selected **R3** bounded checkpoint on local `main`. Mobile portrait is the primary comparison. No dependency, water system, erosion framework, saved schema, frame loop, or runtime network request was added.

## Result and visual selection

The selected R3 adds a modest rolling foundation to the first northbound outing: a gentle raised dry shoulder on the player's left and a shallow lowered wet bowl on the right, while the existing middle walking lane remains open. Three actual runtime rounds used the locked ordinary fixture at player `(7, -84)`, camera yaw `0` north, pitch `42°`, FOV `52°`, and a `412×915` portrait viewport.

Independent comparison scored R1 **5.4/10 HOLD**, R2 **5.7/10 HOLD**, and R3 **6.0/10 HOLD**. R3's rubric was composition **2.1/3**, form/lighting **1.5/3**, material **1.8/3**, and detail **0.6/1**. R3 is the strongest of the bounded three rounds, so no further aesthetic pass was made.

The target remains unmet. The live forms are still suppressed by flat lighting and low terrain contrast; the target's warm raised shoulder and cool shadowed bowl read more clearly and carry more visible depth. This checkpoint establishes usable rolling terrain and a restrained drainage cue, rather than completing the terrain art direction.

The exact baseline, target, R1, R2, and selected R3 images are copied beside this receipt. `r0-samples.json` records the old Camp, transition, and protected-terrace samples captured before production.

## Bounded implementation

- One pure global-space signed relief sample owns the transition. R3 uses a dry rise centered at `(-1, -92)`, radii `12×28 m`, height `+1.65 m`, and a wet depression centered at `(13, -89)`, radii `12×28 m`, depth `-0.95 m`.
- The combined relief is multiplied by the existing smooth transition from `z=-110` to `z=-98` before the terrain clamp. Its delta is exactly zero at `z<=-110`, preserving the established terrace, safe slope, and drop.
- The same signed relief value supplies a capped height-linked color cue. At full influence the dry rise adds linear RGB `(+0.065,+0.050,+0.015)`; the wet bowl adds `(-0.055,-0.040,+0.025)`. This is continuous terrain presentation, not a route/path paint mask.
- Existing Camp height/color blending remains the sole Camp attenuation and owns the authored footprint exactly. The color cue does not change habitat blend, genome selection, forage classification, or seed semantics.
- Sampling remains deterministic and independent of chunk load order. Terrain mesh vertices, world-space normals, vertex colors, Rapier surface triangles, atlas queries, ecology/scenery grounding, and resume support continue to derive from the same sampler.
- Runtime still uses one fixed deterministic terrain edition. Stored atlas/ecology seeds do not constitute a fully unified saved world seed; that remains a later consistency slice.

## Focused and integrated proof

`node --test tests/frontierTerrain.test.js tests/frontierWildlife.test.js` passes **20/20** for selected R3. Proof covers positive and negative east/west and north/south borders, including the changed `x=0` seam; identical seam height/normal/color data; deterministic finite meshes; exact Camp height/color; exact protected terrace height/color; both staged Mossling clearings; the full northbound route; and existing Rapier ramp, cliff-drop, and incline behavior.

The first Mossling roam area peaks at slope `0.221368`; the second peaks at `0.108862`. The sampled Camp-to-terrace route peaks at `0.289659`, below the existing acceptable `0.32` limit. Both staged Mossling sources remain present. Protected samples at and north of `z=-110` retain exact pre-F1B height and color values.

Earlier related chunk-runtime, frontier integration, ecology, scenery, landform visual, climb-probe, and player-climbing checks passed32/32 during R1. Final selected-R3 aggregate passed1,131/1,131 tests plus world/campaign/build/validate; ZIP20.53MB(21022.6KB), unpacked44.10MB. No new dependency or model bytes.

The final R3 native route started at the disclosed north-Camp fixture(0,-44), then ordinary keyboard listeners and real game time traversed all seven Camp/clearing/safe-slope/crown waypoints in27.902seconds. Health remained5; endpoint(31.4344,8.8256,-130.1087). `route-r3-proof.json` retains the real samples. Literal dev reload preserved the outing identity and supported position on both the terrace and changed clearing. Normal return followed by another walk-out also worked; a prior warning was reproduced only after diagnostic import without its required reload, not normal return.

Portable proof imported the isolated four-individual save and immediately literally reloaded, then resumed the exact run at the terrace with health5. After positioning at the changed clearing, native Jump entered JUMP from IDLE, rose fromY3.6989 to5.0523 and returned grounded/IDLE at health5. Terrain/scenery counts remained bounded; only localhost8081 resource origins were present. Final dev/package warning/error logs were empty. `package-proof.json` and `package-portrait.png` retain evidence. The portrait capture uses the same412×915CSS emulation/309×687 compositor workaround as review shots; no physical-phone claim.

## Human check

Leave Camp through its recognizable north opening and walk toward the first Mossling clearing. The ground should rise gently on the left and sink into a cooler, darker bowl on the right, while the middle remains an obvious walking lane. Continue past both Mossling clearings and follow the route to the terrace's broad safe slope and upper crown.

Correct behavior: the ground changes height smoothly, both Mossling clearings remain approachable, and the safe slope reaches the terrace without health loss. Visible jagged seams, a sudden step at a chunk border, snagging in the center lane, a missing Mossling, floating or buried scenery, or sinking through the ground are failures. The subtle live depth compared with the stronger target is a known visual limitation of this selected checkpoint.
