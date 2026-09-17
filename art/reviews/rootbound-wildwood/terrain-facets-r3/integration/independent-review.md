# Independent R3 integration review

**GO — frozen source reviewed after the render-formula correction.**

The authoritative height path is coherent: the protected literal lattice is interpolated on the terrain diagonal in `frontierRootbound`, carried through the default-world region sampler, and baked into the same indexed vertex Y values used by the streamed Rapier surface. The render delta is a separate `Float32Array`; it does not create a second collision height.

The world gate is appropriately narrow. The default descriptor receives relief, while an alternate seed and `disableRootbound` return zero. The two active chunks alone create a non-indexed render duplicate. It clones the mapped material, preserves flat shading, releases the clone with its resident, and leaves neighboring zero-delta chunks indexed with their baseline material.

The corrected face treatment now exactly implements the approved RGB multiplier: `[1 + s*.065, 1 + s*.10, 1 + s*.065]`. Zero-relief faces are white; cliff vertices retain their prior colors. The focused test proves the exact per-face channel values, white identity, default/alternate/disabled behavior, query-to-mesh equality, seam agreement, indexed physics source, neighboring material/geometry scope, and unload. I independently ran `node --test tests/rootboundCircuit.test.js`: **7/7 passed**.

This is source authorization for the bounded integration, not final admission. Full changed-route footprint support, transformed curated-prop and resident grounding, and native Rapier contact/unload-reentry remain the required runtime evidence.



## Native integration visual review

**RETAIN — modest, useful Rootbound faceted-floor gain.** The integrated portrait keeps the intended low-poly floor readable around the player, log, and Thornstone cluster: the shallow, correlated facets break the prior broad smooth wash without pretending to be a new room or landmark. It remains restrained, which fits a ground-only pass.

Against the earlier preview candidate, the integrated ground reads slightly more naturally because its per-face light/tint follows the actual shared terrain rather than a renderer-only clone. The companion differs between frames, so it is not comparison evidence. The effect is still subtle at portrait scale and should remain a retained composition layer with no claim that it closes Rootbound’s larger habitat-art gap.

The matching-pose and two ordinary timed-keyboard traces supply bounded native contact evidence: sampled player states remained grounded, and a short lift settled. The fixture is Scout-only and does not establish physical-device input or a full outing. The observed MutationObserver error predates this change and its source is not identified; rendering advanced, so it is unrelated evidence rather than a causal conclusion.

