# F5A — rocky terrace and landing risk

September 12, 2026. Root: Codex Astra; landing/terrain: Sol; reused rock composition: Terra; independent target and scene reviewer. Selected as functional groundwork under the three-pass limit; no owner visual acceptance.

## Player result

One rocky shelf north of Camp introduces a longer walkable slope and a dangerous short drop. Ordinary jumps and drops up to 2.4m are harmless; larger airborne drops cost one health, increasing every 1.8m to a maximum of four. Jumping off a ledge still counts. The existing health owner supplies hurt feedback, invulnerability rules and death handling; movement only emits a once-consumed landing event. Placement/resume/traversal resets clear airborne tracking.

This is one deterministic landmark, not a general cliff-climbing, swimming or varied-landform system. It uses the same generated terrain section and session.

## Geometry and ownership

- Terrain sampler owns height/color; chunk 0,-3 adds nonuniform rows at the 8cm cliff transitions. 783 vertices / 1,456 triangles; other chunks and borders retain their grid. Approximate crown x28..42; clear ramp x22..26. Height offset is 3m.
- Ramp and shelf weights sum through their join. An initial max() implementation produced an analytic trough absent from the rendered mesh; the crosswise route regression now covers it.
- Render and Rapier use the same triangle set. Steep faces use a stone material group instead of stretched XZ grass UVs. Six reused, already admitted Verdant buttresses have matching transformed hull triangles. The central x30.5..33.5 drop gap and ramp remain clear.
- The existing chunk owner batches the six extra colliders with creation/removal, disposes materials/instances, and preserves camera-solid registration. Foliage uses the existing bounded instance count. No new model, texture, dependency, RAF or physics owner.

## Visual loop

Target feasibility 8.5. R1 1.5; R2 approximately 3; R3 approximately 4.5. R3 is strongest usable groundwork; it **fails target visual admission**. The remaining flat wall, repeated buttresses, clipped approach and sparse surroundings do not match the target's natural layered shelf. No fourth cosmetic pass was taken. Baseline, unchanged target and all three actual views are retained here.

## Runtime proof and limits

- Isolated 8082 developer placement at slope foot `(24,-114)`, then held-key browser fixtures through the normal keyboard handler and live controller/Rapier reached `(24.30,-131.05)` and crossed to `(32.03,-131.05)`, grounded, health 4→4. The selected companion was visible on the crown behind the Explorer. This does not establish sophisticated follower pathfinding.
- A short native-key batch at the lip moved only slightly. A bounded held-S browser fixture then stepped through the clear lip, became airborne, and landed at `(32.00,-122.73)`, capsule Y5.308, grounded, health 4→3. Ordinary native Jump earlier retained health4. The initial developer drop fixture also cost exactly one health.
- Literal reload + Continue retained the lower supported position and health3, both owned individuals and selected clay follower. Warning/error logs were empty. Input fixtures always released their keys; reload cleared their diagnostic globals.
- Pure/controller, terrain/ecology/wildlife/Rapier, material, transform and lifecycle tests passed. Integrated **1,057/1,057**, world/campaign checks, build, validation and ZIP PASS. Additional assertions in the existing one-test rock lifecycle case passed after aggregate verification. No shipping code changed after that aggregate run.
- Package: **43.95 MB unpacked / 20.49 MB ZIP**. Full physical-phone performance and earned Camp-to-shelf traversal are not claimed. Supported position/input fixtures were disclosed; the old campaign checker does not prove a generated-world resource/progression route.

## Human check

From Camp, head north into the open frontier until the tall shelf appears. Walk around its left side onto the broad pale slope, then cross the grassy crown. You should reach it without losing health. Step through the gap between the front rock columns: the Explorer should fall, lose one health and remain controllable in the lower clearing. Small jumps should not hurt. Floating feet, a blocked slope, repeated damage on one landing or reload below the ground are failures. Developer reference: slope foot `(24,-114)`, crown `(32,-133)`, short lip `(32,-124.2)`.
