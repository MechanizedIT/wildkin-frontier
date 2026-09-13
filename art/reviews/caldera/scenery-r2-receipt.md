# Emberglass Caldera scenery R2 receipt

## Result

The fixed south-breach scenery now forms a perceptible near left/right frame in the ordinary `412x915`, 42-degree portrait camera from player position `(850,-1962)`. The eight near members sit on the supported inner edges at `x=846.35..847.35` and `x=852.65..853.85`, `z=-1967..-1972.25`; the rear spire remains a movement reveal. Stable IDs, asset IDs, nonblocking ownership, runtime caps, and the authoritative resource/Emberhorn anchors are unchanged.

The staged group also has an atomic preflight. All three exact records (`asset_ember_spire`, `asset_ember_bloom`, `asset_pebble_cluster`) must have `gameplay.role === 'prop'` and at least one mesh part with position and index arrays before any of the nine staged records emits. Missing, wrong-role, or malformed members produce zero staged IDs in all three owner chunks. Those incomplete arrays are not retained by the recipe cache, so restoring the kit retries and publishes the complete group. Seeded ordinary Caldera props continue to admit each valid asset independently.

## Measured composition

The two near spires use scale `.5` and complete `0.85m` plan radii. Their feet/tops project at approximately `(55,190)/(45,101)` and `(357,191)/(367,102)`. The left bloom/rubble envelope projects across screen `x=10..62`; the right envelope projects across `x=346..412`. Every near prop foot and top is inside the analytical ordinary portrait frustum. This is projection evidence, not native rendering or a new visual score.

All nine records pass current-terrain support at maximum slope `.12` using `max(.62m low-prop minimum, authored radius * scale)`. They also clear the full 4m central route, the authoritative scaled crystal and iron footprints, and the complete 10m Emberhorn movement disk. The shoulder peaks around `x=839.5/861.5` remain outside the portrait frame and are not claimed as near framing.

## Focused proof

```text
node --test --test-name-pattern="Caldera" tests/frontierScenery.test.js
```

`3/3` passed. The proof covers canonical nine-member selection; exact near transforms; ordinary-camera foot/top projection; full footprint support; route/resource/Emberhorn clearance; each required asset independently missing, wrong-role, and malformed; ordinary per-asset admission; and same-cache retry after repair.

```text
node --test tests/frontierScenery.test.js
```

`33/33` passed in `10.82s`. Existing regional-place, cache/preparation, deterministic placement, support, exclusion, residency-cap, Camp, Signal, coast, Lush, Sunscar, and Skybreak scenery tests remain green.

No browser, native image, Git operation, aggregate suite, package build, or release claim was made in this worker pass. Source transforms were held fixed after the complete focused proof.

## Final R3 structural pass

The final visual packet found the R2 props compressed into the HUD band and their inherited ground patches bright green. R3 moved the stable eight near IDs onto two terrain-owned, footprint-sized support toes at 3–8m projected depth. The dominant left group uses a `.55` spire, `.7/.55` blooms, and `1.2` rubble around `(847.05,-1968.5)`; the quieter right group uses a `.45` spire, `.5/.42` blooms, and `.65` rubble around `(852.85,-1969.5)`. The rear spire remains unchanged for movement reveal.

In the fixed analytical portrait camera, the left foot/top envelope is approximately `x=9..36, y=169..290` and the right envelope is `x=357..386, y=167..263`. All are in the complete frustum and below the HUD lower edge. Every authored radius passes the final terrain at slope `.12`, and the fixed 4m route plus the scaled mineral and Emberhorn disks remain clear.

Caldera weight now flows through ground-cover metadata, deterministic patch cache identity, density, color, and instance scale. At full weight, staged and ordinary scenery patches retain less than 15% density, flatten the reused tuft geometry by 58% vertically, and blend 90% toward burnt rust. The existing ground-cover placement filter rejects the central Caldera lane, preserving quiet charcoal negative space. No renderer, geometry family, cache owner, cap, or runtime dependency changed.

Final focused source proof:

```text
node --test tests/frontierScenery.test.js
# 33/33 passed in 11.49s

node --test tests/frontierSceneryVisual.test.js
# 22/22 passed in .38s
```

These tests cover the whole R2 admission/cache repair plus final toe support, exact portrait projection, route/resource/home clearance, sparse Caldera metadata, cache invalidation, burnt tint, low tuft scale, and retained scenery visual lifecycle/caps. Native R3 capture and independent visual judgment remain root-owned and are not claimed here.

### R3 native capture and final correctness repair

Root captured `.dream-loop/caldera/r3.png` from the fixed witness. It confirms the green scenery grass is removed and the left volcanic group is grounded below the HUD. It also confirms unresolved composition debt: the quiet floor remains sparse and the right group sits beneath the inventory HUD rather than visibly balancing the left. The three-pass ceiling is exhausted, so no fourth art pass was started. A future portrait-framing scope should plan around the real HUD safe area and useful midframe coverage before authoring off-axis props.

The final consumer repair gates both fixed-prop and ground-patch lane exclusion on the already sampled Caldera weight. The same coordinates under a zero-weight custom terrain contract retain ordinary placement behavior. The center terrain sample is reused across land-footprint, regional, clearance, and lane decisions rather than adding a second policy query. Final `frontierScenery.test.js` result remains `33/33` passing in `10.99s`; the visual suite remains `22/22` from the frozen R3 source.
