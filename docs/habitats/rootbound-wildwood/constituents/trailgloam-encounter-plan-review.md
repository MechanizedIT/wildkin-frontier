# Trailgloam encounter — independent plan review

**Decision: HOLD for one small correction packet, then GO for the bounded implementation.** The chosen west Grove edge, one stable source, SKITTISH rusher reuse, and deliberately slow authored pace are a proportionate way to make the retained model observable without a new AI or population system.

## What is sound

- The proposal keeps one source identity (`f1:w:-10:13:700`), leaves the two Mossling sources untouched, and uses the established generated-resident ownership chain.
- `createWildCreature` already merges a source's `configOverrides`; its visual animator uses the active mapped locomotion clip and authored locomotion speed. A `0.212121…` rusher override plus matching `model.locomotion.walk` therefore avoids changing shared `RUSHER_CONFIG` and addresses the measured 4.125x generic-speed problem.
- The retained asset only has `Loaded`, `Neutral`, and `WalkDiagnostic`. Mapping idle to `Loaded` and walk to `WalkDiagnostic` is honest. For this SKITTISH observer, no fake attack/run/hurt mapping is needed: absent mappings fall back to idle in the existing animation controller.
- The generic rusher capsule remains explicitly unproven for this low eight-leg model. The plan correctly makes collider fit and grounded movement a pre-retention proof rather than inheriting fixture results.

## Required correction packet

1. **Correct the non-capture wording and prove the real interaction boundary.** Current `identifyCompanion()` recognizes only entries in `COMPANIONS` by `assetId`; Trailgloam is absent from that catalog. As proposed, it will not offer a bond/taming interaction, while the ordinary combat path can still damage an active generated creature. Say exactly that: *not catalog-bondable in this admission; still an attackable living creature under existing combat rules.* Do not say merely that capture/taming is “outside scope,” because that can be read as a new interaction prohibition. Add focused proof that no bond prompt is offered, that a field-tool hit follows existing HURT/FLEE handling without console error, and that the source is not silently removed except by ordinary death/capture mechanisms.

2. **Make the full movement boundary literal.** Add `fleeLeashRadius: 3.3` to the fixed source if that is the proposed maximum disk; `createWildCreature` supports this field directly. Recompute the route clearance from the final route **edge**, the actual capsule/model envelope, and the 3.3 m disk. The prose currently starts from 9.899 m to the centerline but mixes a 3.0 m and 3.3 m subtraction, so it is not yet a reliable clearance statement.

3. **Narrow the proof to this actual behavior.** The native proof should show ordinary slow ROAM, player-triggered HURT → FLEE → RETURN, stable stream-out/re-entry, and final fixed-source home-disk support/contact. It should not require or imply an attack/run animation, a completed companion, or production anatomical collision before the explicit collider decision is made.

After those edits, this can proceed as one focused encounter admission. No new AI state, capture system, companion catalog entry, or animation set is necessary for that implementation.
