# Trailgloam encounter R1 — independent pre-capture review

**Pre-capture decision: HOLD for one small asset/source-contract correction.** The implementation has the right bounded structure, but final retention remains pending the native screenshots and trace.

## Verified implementation shape

- The packaged GLB hash is the retained fitted-model hash: `d3163edb5536dfd4d1fa39895f2a8e2bac71372d83cbe854913c667786f4dab7`.
- `FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR` fixes one default-world source in `-10,13`, at `(-461, 689)`, with `1.8 m` roam, `3 m` leash, and literal `3.3 m` flee leash. The fixed source samples every 0.5 m across that complete disk, checks Rootbound membership, slope, and full land footprint before emitting it.
- The central rusher capsule is explicitly limited to the body (`radius .48`, `halfHeight .02`); it is not represented as anatomical eight-leg collision evidence.
- The pace is coherent: `configOverrides.moveSpeed = .606060…`, and the current rusher ROAM multiplier `.35` gives the model’s mapped `WalkDiagnostic` speed `.212121…`. Existing SKITTISH flee/return multipliers remain faster, as intended.
- The branch is default-world-only, leaves ordinary fallback sampling intact when the visual record is absent or unsafe, and retains the existing generated resident ownership/streaming path. It does not add Trailgloam to `COMPANIONS`, so it is not bondable; normal creature combat remains applicable.

## Required small correction

`admittedRootboundTrailgloamAsset()` currently verifies identity, role, species/archetype/temperament, clips, and locomotion speed, but it does **not** bind the asset’s gameplay values or local model path to the hard-coded values emitted by `makeFixedRootboundTrailgloamEncounter()`. A stale or altered asset record can therefore still pass the gate while the fixed source silently uses different health, damage, movement, radius, or packaging assumptions.

Make the admission gate or its focused test pin the current packaged record’s local model path and the shared behavior fields (`health`, `moveSpeed`, `damage`, `respawnSeconds`, `roamRadius`, `noticeRadius`, `personalSpace`, `leashRadius`). `fleeLeashRadius` can remain fixed-source-only because the visual-asset schema does not carry it. This is a small fail-closed consistency check, not a new API or a request to hydrate generic source behavior from records.

After that correction, proceed to the already planned native proof: visible slow ROAM, no bond prompt, ordinary field-tool HURT → FLEE → RETURN, full-disk contact/route clearance, and stream-out/re-entry. Only those captures can decide retention.

## Final source and native evidence

**Decision: RETAIN Trailgloam R1 as a slow, optional Rootbound observer.** This is a practical living-region gain using the retained model, not a companion admission or a claim of a completed locomotion/interaction suite.

The final source receipt closes the earlier contract issue: it pins the packaged model path, exact retained hash, clips, locomotion pace, and matching rusher/SKITTISH gameplay fields. It fixes the resident at `(-463, 685)`, retains all 43 curated records, and passes the complete 3.3 m sampled support disk. The fixed visual envelope radius is `1.29767 m`; after the moved home and observed push allowance, the stated route-edge margin remains above `5.13 m`.

The final phone-scale approach shows a clear low, eight-legged silhouette beside the Grove deadwood and leaves the player-facing apron open. The model is visibly distinct from the companion and surrounding low props. The 20-second observation records 202 samples and an authored ROAM playback scale near 1x. Its faster existing FLEE and RETURN scales are not cadence-matched showcase motion, but that is an acceptable consequence of reusing the rusher state machine for a single skittish observer.

The ordinary 90 ms field-tool hit proves this is not an interaction-exempt decorative prop: health changes from 6 to 4.85 and HURT is entered. Because the creature was already at its flee boundary, the recorded next state is RETURN. Do not describe that capture as a demonstrated post-hit FLEE. The separate observation trace records FLEE and RETURN states; it does not turn the attack trace into evidence of a missing animation.

The observed query/base discrepancy reaches about 7.85 cm on the sloped triangles. The recorded full-mesh support check passes, so this is retained as a query-versus-triangle/foot-placement limitation, not a claim of foot-perfect IK. Likewise, the central capsule is deliberately a body proxy; it is not an eight-leg collision fit.

The remaining planned retreat/recovery, streaming, package parity, and ordinary route checks should close the encounter evidence. No anatomy pass, companion catalog work, new behavior state, or additional model polishing is warranted for this admission.

## Closure evidence

The final validation summary confirms 1,438 tests, verify, and ZIP pass; the packaged record preserves the source identity, home, body/speed values, model path, player position, and exact GLB hash. Streaming removes the actor away from its resident chunk and restores the same `f1:w:-10:13:700` origin on return. The 12-sample ordinary approach and 32-sample ordinary retreat keep the player grounded.

The recovery observation records FLEE and RETURN over 202 samples and returns to `1.7078 m` from home while the nearby threat remains. This is adequate evidence of bounded recovery, not proof that the creature completed a calm return home. The recurring unlocated `MutationObserver.observe` error predates this asset and no new asset-load error was observed; it is recorded as unrelated, not dismissed as harmless. The limited-observer retention verdict stands.
