# Sunscar room-cleanup source review

**Decision: PASS for the bounded source contract.** `SUNSCAR_ROOM_REMOVALS` contains exactly the reviewed 12 stable IDs. `selectFrontierScenery()` computes ordinary recipes, infill, exclusions, sorting, near/outer selection, and the existing `maxTotal` slice first, then filters only selected `kind: 'low'` records when the world has the default edition and seed. This preserves allocation/order for every retained record and leaves the recipe inputs available to the infill/exclusion owners.

The same final selector is used by direct selection and `createFrontierSceneryBuild`, so prepared incremental publication takes the identical final suppression path without introducing another owner. The focused fixture verifies each retained spec/order/transform hash, exact counts for both affected windows and their combined residency, unchanged ordinary-recipe hashes, an alternate seed with no removals, and an unaffected default-world Camp window. The prepared-residency test verifies the same 12-record delta without refilling.

This PASS covers source selection only. The intentional Fen-stone deletion still needs runtime resident/collider count evidence, and the post-pass native captures must decide whether the resulting rooms are compositionally better rather than merely emptier.
