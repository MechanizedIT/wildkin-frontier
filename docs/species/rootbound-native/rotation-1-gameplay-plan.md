# Trailgloam rotation 1 gameplay plan

**Status:** design only; visual reference is held and no runtime work is authorized.

## Patient-offer

`fieldTaming.js` has an explicit stage map in `begin(id, species)` (`mossling:lure`, `tidefin:snare`, `emberhorn:challenge`, `skydancer:call`), and already implements `lure → feed → ready`. Proposed reuse: `trailgloam:lure` plus species-aware wording, with a 6m offer range. Existing values are 3 seconds feeding, quiet speed ≤2.2m/s, player-to-food retreat ≥2.8m, player-to-creature gap ≥2.2m, creature-to-food arrival <0.85m and final bond range ≤2.5m. Keep these initially and playtest; do not call an invented value existing configuration. The helper already exports `begin`, `act`, `update`, `clear` and `getState`, so no new taming framework is needed.

`begin` consumes the lure only after target/ground/range validation. Ordinary interruption clears intent and does not refund consumed supplies. `finish` rechecks eligibility and calls the existing capture transaction; a `save-failed` result leaves the attempt available for retry and must not retire the target or spend again. Rush failure applies to ready/trapped/perch near the target; lure/feed currently pause or lose calm when the required space/quiet is lost. Preserve that distinction unless a later explicit species contract changes it.

## Spore Sense

Future admission is one cohesive boundary: add a real reviewed visual/encounter identity, the companion catalog and identification entry, species validation allow-lists, the existing berry supply reference, and `trailgloam:lure` together. Trailgloam has `secret: null` and no seal-opening ability. Filter absent secrets when deriving `SECRET_COMPANION`; never pass Trailgloam through `findNearbySealChest`. Preserve every current species' secret mapping. Visual HOLD blocks this runtime admission.

`resourceSystem.getActiveNodes()` already excludes `_removed` nodes and inactive `regionId`s. Its records expose `id`, `chunkId`, `persistentFinite`, `visibleInPlay`, `group` and `state`; READY is `state.nodeState === 'READY'`, with positive `state.remainingChunks`. Read this owner at call time, never retain its mutable node array as a second registry. Filter finite, visible generated ordinary sources with valid finite position and positive remaining chunks. Use a provisional 12m XZ radius and 2.2m vertical difference; reject invalid records and sort distance followed by stable ID. Return a copied `{id,pos}` or null without modifying state or yield. This is proximity advice, not proof that a blocked source is reachable.

`createBetaGame` already receives `deps.resourceSystem`; construct the read-only query there and inject it beside the existing `strikeMinerals(pos)` callback into `createCompanionSystem`. Keep Camp/swim/selected-individual/cooldown guards in `useAbility()`. Provisional cue duration is 1.2s and cooldown 8s, owned by the existing companion cooldown. No target consumes no cooldown and returns a short no-find message. This avoids charging the player for missing resident content; it is an agent choice pending play. The current `onAbility(speciesId, playerPos, individualId)` and `abilityFx.trigger(id,pos)` lack target data, so add an optional target payload only when implementing this species, preserve all sibling calls, and cancel a cue on depletion/retirement through a read-only ID recheck.

## Proof

Freeze execution order before implementation: existing expedition/swim/selected-individual/cooldown guards run first. The companion owner then resolves the eligible candidate once. A null result returns the no-find message before cooldown, pulse, audio or any generic effect. A valid result starts the provisional 8s cooldown and calls `onAbility(speciesId, playerPos, individualId, {target: {id,pos}})` with copied values. Existing three-argument sibling calls and their seal path remain unchanged.

`createBetaGame` forwards that optional fourth payload to `abilityFx.trigger(id,pos,payload)`. The existing `createCompanionAbilityFx` pool owns the transient 1.2s cue, not the resource. Inject a read-only target-ID validator from the existing resource owner; on the existing update loop, find that ID in `getNodes()` without retaining the node or allocating another registry, then recheck removal, region activation, visibility, finite generated-source status, READY and remaining chunks. Use the owner's active-region semantics. A failed recheck, expiry, hidden presentation, reset or dispose clears this Trailgloam cue. Do not change sibling hide/resume behavior. No pickup, yield mutation, persistent marker or extra animation loop is created. Recheck observes eligibility, not navigable reachability.

Player offers berry on clear Hollow ground, steps back, watches inspection, then bonds; rushing cancels honestly. On a later expedition, calling Spore Sense near two READY sources cues the nearer/stable-ID source; collecting still requires the normal tool. It cues nothing for depleted, inactive, out-of-radius or no sources.

1. A valid clear-ground offer spends one lure, reaches ready after three quiet feeding seconds, and bonds within 2.5m; no second charge occurs.
2. Missing supplies or invalid ground starts no attempt and retires no creature. Consumed supplies are not refunded after a later ordinary interruption.
3. Rushing at the ready stage or damaging the target clears the attempt; losing quiet during feeding reduces calm under current behavior.
4. Capture save rejection keeps the same live target and retryable attempt, with no duplicate pending individual or supply charge.
5. Two eligible sources at 5m and 9m select the 5m source; equal-distance sources choose the same stable ID regardless of array order.
6. Depleted, removed, inactive, hidden, nonfinite, outside-radius or vertically separated nodes are ignored; an empty result creates no cue and consumes no cooldown.
7. Retiring/depleting the chosen source during the 1.2s cue clears it, grants no resources and leaves all other source states unchanged.
8. Literal reload has no saved cue/marker and preserves supplies, owned individual and depleted yields. Existing Mossling/Tidefin/Emberhorn/Skydancer ability callbacks retain their semantics.
9. Trailgloam never queries or opens a seal; all four existing secret mappings and seal/callback behavior stay identical. Hidden/reset/disposed target cues clear without affecting sibling effect lifecycles. A missing target produces no cooldown, pulse, audio or FX.

A pure selection fixture and field-taming adapter tests may be built separately while visual admission is held, but this document implements neither. Species catalog/allow-list/encounter/visual admission remains a later cohesive integration gate.
