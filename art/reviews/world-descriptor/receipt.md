# Unified world descriptor — functional checkpoint

September 12, 2026. Root integration with separate Sol terrain/review and Terra content lanes. This is generation-contract wiring, with no intended visual change and no new art admission.

One immutable edition/seed now comes from validated progress metadata before runtime construction. Terrain, built-in grass, forage, wildlife, scenery and scenery grass consume separate deterministic domains. Pure fallbacks and scenery exclusion queries receive the same descriptor. Runtimes capture identity once; importing still reconstructs runtime through reload. No per-frame key construction or live world switching.

Default terrain samples, tested mesh vertices/normals/colors, forage/wildlife samples, selected scenery and grass matrices matched pre-edit digests. Alternate generator tests cover repeatability, changed distributions, terrain border heights/normals/colors, fixed authored Camp and matching forage/wildlife clearances. Independent review caught and closed missing descriptor forwarding in scenery exclusions.

The current save remains one fixed edition/seed. Alternate saved worlds are rejected; a seed selector and namespaced atlas/depletion/captured provenance are not shipped. The paired metadata is validated before acceptance; caller mutation, failed import and failed reveal cannot replace the saved identity or discoveries. There is no new persistence field or migration framework.

## Verification

- Final `npm run verify`: **1,145/1,145 PASS**, world/campaign consistency, readable build and package validation PASS. `npm run zip` PASS. 44.11 MB unpacked; 21,025.2 KB / 20.53 MB ZIP.
- Actual developer reload retained the same five owned individual/source pairs, six depleted resource records, thirteen atlas chunk masks and four exact sampled heights. The progress and terrain runtime expose the same frozen descriptor. See `reload-proof.json`.
- Final portable build retained the same five individual/source pairs. Ordinary visible Jump at the previously saved frontier position entered JUMP, rose about 1.343 m from the first observed position, and returned grounded/IDLE at health 5. See `package-proof.json`.
- Developer and packaged warn/error logs empty. Observed packaged resource origins were localhost:8081 only. This is an observed offline-safe load, not an exhaustive network-failure matrix.
- `package-portrait.png` is the actual final portable view at 412×915 CSS pixels, captured through the compositor at 309×686 pixels. Existing sparse scenery and dark grass roots remain visual debt. No generated mockup or new visual score is claimed.

The existing developer/portable five-individual saves were diagnostic fixtures from the preceding encounter checkpoint; this check does not claim that whole progression was earned again. No physical-phone performance benchmark or fully infinite world is established.

## Repeat as a player

Continue a save that has explored the clearing beyond Camp and collected a Wildkin. Open the Field Atlas and Wildkin roster, note the explored shape and individual entries, then reload and Continue. The map and individuals should match. At an open patch beyond Camp, press Jump: rise once, land on the visible ground, and retain full health. Previously depleted frontier rocks should stay depleted on return. A missing creature entry, newly unexplored known area, changed ground under the same save, falling through terrain or an error overlay is a failure.

## Next

Build a small visual inspector of the current height/habitat/slope/placement fields, then use it to support the first dramatic plateau region. Preserve owner direction for regional rivers and untamed travel without a global path grid. Component/process-clock work should reuse current data and transaction owners; see `docs/SIMULATION_PLAN.md`.
