# Independent Caldera profile review

Date: 2026-09-13  
Scope: read-only review of `frontierCaldera` → `frontierRegion` → `frontierTerrain` and the focused profile proof. No production changes or test rerun.

## Verdict

**PASS. Repair packet: none.** The current chain has one terrain authority, continuous bounded blending, exact zero-weight behavior, and neutral feature metadata outside the authored ellipse. The reported focused `38` existing terrain/region checks plus `6` Caldera checks are consistent with the reviewed source. Root still owns native Rapier traversal and visual proof.

## Contract findings

- `frontierRegion` computes the ten-site habitat weights once, aggregates the same-base-kind contributors for the temporary grammar, and passes the independent Emberglass weight into the pure profile. The profile blends height once by that habitat weight; region blends its color once by the same weight. `frontierTerrain` then applies the existing reserve influence once, so Camp/starter/Skybreak at influence zero retain the former global height before their existing Camp/local landform composition.
- A zero Emberglass weight bypasses the profile in `frontierRegion`: prior height, palette, grammar weights, and Rootbound witness remain exact, while `calderaFeature` is `null`. At the authored ellipse boundary the smooth outer influence reaches exact zero with zero-slope fade; terrain reports `habitatFeatureKind/Zone/Influence/Ramp/ClearLane` as neutral outside it.
- Both `sampleFrontier` and `sampleFrontierHeight` enter the same `sampleFrontierRaw` expression. The world descriptor reaches the existing terrain domain and the region-specific seed domain without mutable state. A bounded spot check across default, seed `1`, and seed `0xffffffff` found exact full/height equality and seed-variable bowl heights (`9.645–10.299m`). No cache, hidden scene state, physics owner, or growing collection was introduced.
- The broad 5.75km² identity is independent from the compact crater: low-frequency volcanic shelves replace the temporary Ironspine target wherever the Emberglass habitat weight contributes, while the ellipse only layers its rim/bowl/breach. The profile remains bounded to `6–24m` outside the landmark and the terrain owner retains the global `0–84m` clamp contract.

## Breach support measurement

The route runs north through the south breach. On the actual `2m` terrain mesh grid, all triangles covering the supported `8m` floor (`x=846..854`, `z=-1990..-1932`) had a maximum plane grade of **0.153**, below the `.28` route contract. The obstacle-free central `4m` is therefore inside the same supported field. Heights descend continuously from about `12.13m` at `z=-1932` to `10.30m` at the bowl center.

The analytic profile can show a steeper sub-grid lateral derivative at the outer edge of the full `8m` strip (about `.309` near `x=854,z=-1965.5` at a `.25m` probe). This is not a physics blocker: authoritative render/collider terrain is the shared `2m` triangle field, whose same location remains within the measured grade. Native proof should still use the central lane rather than treating arbitrary raw-function derivatives as Rapier geometry.

## Reviewed hashes

```text
B939D48AE8F62AA887C166FE6118912A32A7C4E573C414DCFC9DAABBF9B24B94  src/world/frontierCaldera.js
36BABCF6F508EB231AE981B4A08BC6459E50FD51EE12AE05F880DD98B66E736B  src/world/frontierRegion.js
93F2EFADEDB4115D818AFEAF39668FFD7814F9235C73A8ADE62EBF45ED93B87B  src/world/frontierTerrain.js
4CD09CDB327594791ADCD31ED2F2B6E4AF3FA2F032DE435ED1C3983D9BA32CAD  tests/frontierCaldera.test.js
```

## R2 terrain delta review

**PASS. Repair packet: none.** This addendum reviews only the R2 inner breach shoulders, bowl-refuge mask, charcoal/rust color field, and Caldera-dependent final color blend. The terrain author's reported focused terrain/region result is `38/38`; it was inspected here rather than rerun.

- The two shoulder lobes are deterministic world-space functions bounded by the existing outer influence. Their X supports do not overlap (`left` ends before the central strip and `right` begins after it), and the longitudinal fade is smooth at both ends. The height expression adds the lobe rises once to `craterTarget`, then uses the existing single `outerInfluence * habitatWeight` feature blend. It does not introduce another profile or region height pass.
- The central eight-metre floor remains exact because both lobe supports are zero for `x=846..854`. `bowlRefuge` is one frozen `{x:850,z:-1986,radius:10}` authority; its clearance multiplier is exactly zero throughout the full disk and eases in over the following two metres. The focused source proof retains the full-floor maximum slope of `.268`, central-bowl maximum `.011`, both mineral support checks, and the complete ten-metre home-disk check at the original `.12` limit.
- Charcoal, slate, and rust are bounded linear RGB targets from fixed-scale seeded value noise. At zero Caldera weight the profile still returns `colorRGB:null`, preserving the previous region target exactly. Partial habitat weights blend continuously through `frontierRegion`; the terrain blend factor then varies continuously from the former `.88` to `1` only as Caldera weight reaches one. Thus a full, unreserved Caldera sample reaches the authored linear target, while zero-Caldera habitats keep the old `.88` factor. This is a final pipeline presentation blend, not a second profile-height weighting.
- Full terrain samples and chunk vertex colors still call the same `sampleFrontierRaw` expression at identical world coordinates. Height-only sampling exits after the shared height expression and is unaffected by the color work. The R2 focused test covers finite full colors and exact shared color arrays over every touched crater-chunk border, so there is no full/query/mesh seam introduced by the local patches.

The remaining boundary is unchanged: the tests establish deterministic terrain, support, and numeric color continuity; normal-camera readability and final displayed sRGB/ground-overlay appearance require the separate native visual evidence.

## Final R3 terrain delta review

**PASS. Repair packet: none.** Reviewed `frontierCaldera.js` at SHA-256 `FC54292265ED37107182F56C464CFDBE500646D1DB2CC1ED5FB5E8C98B30CE12` and the final terrain receipt/focused proof without rerunning the matrix.

- Each near buttress is the product of bounded smooth lateral and longitudinal masks, the existing outer influence, and the shared refuge clearance. The explicit Z cutoff lands where the longitudinal mask is already exact zero, so it introduces no height discontinuity. The unequal rises are added once to the existing crater target.
- The left and right X supports end at `848` and begin at `852`; both old inner shoulders are farther outward. Added shoulder influence is therefore exact zero across the central four-metre route. The reported final route slope `.173` remains within `.28`.
- Each toe replaces the local crater target with its center's existing breach-floor target over the complete prop footprint. Its 1.1m smooth feather returns to the surrounding result with zero-slope endpoints. The two toe feathers do not overlap, and neither enters the shared Emberhorn refuge.
- Wildlife imports the frozen `bowlRefuge` coordinates/radius directly, so terrain and the Emberhorn use one `(850,-1986,r10)` authority. The refuge multiplier is exact zero throughout that disk and smoothly returns over two metres. The frozen crystal `(846.5,-1976,r1.30)` and iron `(854,-1980,r.93)` footprints retain their `.12` support checks.
- R3 changes only Caldera feature height and local Caldera rust contribution. Zero habitat weight remains an exact height/color no-op; non-Caldera samples retain the previous `.88` region-color blend. All masks are finite and bounded under the existing outer/habitat weights.
- Full samples, reduced height queries, chunk vertices/colors, and collider terrain still derive from the same `sampleFrontierRaw` chain. The reported final focused results—Caldera `6/6` and region/terrain `32/32`—cover exact height parity and every touched chunk border.

No per-habitat sibling regression or terrain-authority blocker was found. Native visibility, traversal, combat, and persistence remain separate integration evidence.
