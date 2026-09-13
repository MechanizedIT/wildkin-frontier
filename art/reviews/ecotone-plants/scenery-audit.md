# Ecotone scenery audit

Read-only design audit against main `2a5631e`. No production source was changed.

## Result

Do not use the proposed three-patch stratification as the visual fix for baseline A or B. The saved portrait camera matrices disprove the raw-center estimate: neither the current recipe nor the exact in-memory proposed recipe places a selected scenery anchor inside either captured frustum. Grass readability is the attainable current slice.

## Bounded evidence

- Baseline A is at `(-99.904, 219.680)`, center chunk `-2,4`, yaw `2.696`, portrait pitch `42°`, zoom `1`. The terrain witness is a full-influence Sunscar/Lush ecotone (`sunscar .654`, `lush .346`) at height about `6.02 m`.
- The current `-2,4` recipe emits six accepted ordinary low props and seven forage nodes. The nearest selected scenery is `27.0 m` away; the nearest forage is about `27.7 m` away. Current selected scenery has **0 anchors in the saved A frustum**.
- The proposed rotated/reflected jittered triad initially appeared to move the nearest raw patch center from `27 m` to about `15.8 m`. After the unchanged Sunscar settling, support, place, ecology and acceptance filters, the nearest selected spec was instead `23.7 m` away at player-relative `(+21.0, +11.1)`, outside the southwest view. The proposed selection still had **0 anchors in the saved A frustum**.
- Baseline B at `(-150, 345)` also had **0 projected scenery anchors** under the exact in-memory triad evaluation. Its earlier roughly `19.9 m` figure was likewise only a raw-center estimate, not final visible evidence.

## Cap and selection implication

The runtime is populated; this is not a registration failure. Baseline A publishes 25 scenery residents: 18 near plus seven outer canopies. The 18 near slots are exhausted by six specs each from center `-2,4`, east `-1,4`, and north `-2,3`. Stable sorting uses chunk distance followed by lexicographic ID, so west `-3,4` and south `-2,5` receive no near slots even though the camera looks southwest.

A provisional fairer selector was evaluated in memory: retain staged, regional-place and canopy priority, then fill ordinary low props round-robin from numeric-distance-sorted near-chunk buckets. It gives all nine near chunks two slots at A while preserving stable IDs and the existing `maxNear:18`, `maxTotal:34`, and `maxCanopies:12` limits. It still produced **0 projected anchors in A and B** with the current recipes, so it is deferred as a residency-balance improvement rather than a solution for these captures.

No runtime cache or invalidation change is implied. Scenery remains stateless and rebuilds only from a changed terrain residency snapshot; forage, wildlife, regional places and discoveries remain untouched.
