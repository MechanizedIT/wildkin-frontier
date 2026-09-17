# Emberhorn rotation 1 — independent construction-target review

**Decision: PASS as a prospective visual-anatomy reference (8.1/10); no gameplay or runtime admission.** The sheet keeps Emberhorn recognizable as the existing warm brick-red heavy quadruped with one paired ivory horn sweep, ivory muzzle/chest, dark hooves, and a compact ember mane. Its hero view makes the intended correction clear: four thick, segmented legs terminate in planted hooves, and the mane is a connected brow-to-neck-to-shoulder crest rather than exposed blade strips. The neutral background and supporting front/right/rear views are usable construction cues, with no extra limbs, creatures, scenery, or UI.

The views are complementary perspective concepts, not calibrated orthography. They do not establish hidden-side volume, exact limb spacing, joint pivots, mesh topology, collision, motion, or physical dimensions. The source mesh receipt remains the current evidence: 1.711 × 2.075 × 2.008 m, 1,940 triangles, 32 meshes. Existing charge, territorial behavior, taming, Cragbreaker, source identity, persistence, and gameplay proof remain out of scope.

## Required code-native plan priorities

1. Replace only the visually blade-thin leg/mane construction in `emberhorn3()` with four visibly volumetric, two-segment grounded legs and dark hooves. The right and three-quarter views must show thickness, a clear upper/lower bend, and four planted contacts without extra limbs.
2. Build one compact connected mane crest from brow through neck to shoulder, using layered faceted volumes with visible depth; no dangling strips or paper-thin plates.
3. Preserve the broad red torso/head, existing paired horn count and sweep, ivory muzzle/chest, scale, palette family, and forward charge direction. Alter horns/body only where a necessary attachment repair prevents visible separation.
4. Keep the existing code-native mesh-kit ownership and asset identity. A later plan must declare exact current functions/parts changed, neutral target views, bounds/triangle guard, and no change to colliders, behavior, animation, timing, or game-state APIs.
5. Before a production edit, independently review that concrete Three.js plan. Then judge actual neutral front/right/rear/three-quarter plus 48/96 px and an ordinary portrait encounter; target acceptance cannot be inferred from this sheet or existing gameplay tests.

The sheet does not pass charge motion or an earned encounter. Current actual right-side evidence confirms why the iteration is justified: legs and mane are visibly blade-thin, while the existing horn/body identity remains readable and should not be replaced wholesale.
