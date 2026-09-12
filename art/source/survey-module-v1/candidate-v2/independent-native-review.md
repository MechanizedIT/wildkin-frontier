# Survey V2 — independent native level and art review

Reviewer: `camp_native_review`, independent of model implementer and integration writer. September 11 overnight continuation. Neutral V1 HOLD6.3 and V2 PASS8.0 are retained separately. This review covers the integrated V2 candidate on the local dev server, before final commit/package.

## Verdict

**PASS — exactly 8.0/10 for the bounded native Survey insertion.** Composition/readability 2.3/3, lighting/palette 2.6/3, materials/form 2.5/3, details 0.6/1. No required integration/art blocker was found in the inspected route, entrance, chest, camera angles, grounding or adjacent tree path. This is not owner approval, packaged/offline acceptance, physical-phone performance or whole-campaign acceptance.

The manufactured wreck is distinctive beside the organic terrain and alien arches. The heavy ribs, broken roof, restrained ivory/blue-gray panels and dish preserve the target's identity. The two cargo pieces mark a plausible approach and now sit clear of the route used. The west opening, open roof and short ramp communicate a space the player can enter. At an ordinary west-side camera orbit, the chest remains an obvious reward at the back of the module; its OPEN/EMPTY prompt is readable and anchored to it.

## Independent execution

Primary evidence: `.dream-loop/overnight2-survey/review/native.mjs` and `native-receipt.json`. Fresh isolated browser save, Edge headless, 844x390 DPR1 with touch UI; one 390x844 portrait sample. Ordinary Camp Travel/map, keyboard walking, mouse orbit, chest click and Auto harvest UI. Navigation used read-only player position and camera yaw to choose keys. No teleport, save seed, resource grant or camera override in this primary run.

- Walked from the Camp pod to the Travel arch and selected Verdant normally.
- Approached via the arrival trail, passed between the separated cargo pieces, reached the west ramp, walked into the cabin and approached the chest. Recorded positions advance from approximately (0.29,23.17) outside to (3.26,23.06) on the ramp and (6.96,23.02) inside. Capsule center rises from approximately .522 to .700 on the .18m floor, with no stuck step or hidden wall.
- Clicked the actual chest action. The lid opened and exposed the dark cavity without visible clipping in the resulting native view. The pack subsequently contained one Field-pack cartridge. This independently confirms the bounded travel/loot path; the later Salvage-bench fitting transaction was not retested here.
- Used native mouse orbit to face west-to-east toward the opening, then each oblique interior side. The player and open chest remained readable. The narrower V2 roof aperture did not hide the reward or create an apparent roof surface across the opening in these views.
- Resized to portrait inside. The chest, EMPTY label and player remain usable despite the tighter framing and large near rib. Portrait chest-opening input was not separately repeated; the landscape click preceded the resize.
- Walked out along the actual ramp and onto the approach under the rotated camera. The exit remained physically clear.
- Continued around the exterior to the nearby tree and rear side. The first auto-harvest attempt was approximately 2.12m from the tree center, outside the configured 1.65m reach. Its unchanged five chunks were an inconclusive distance fixture, not a collision failure. `native-receipt.json`'s `pass:true` indicates completed primary execution and must not be interpreted as that initial tree-harvest attempt succeeding.

Supplemental evidence: `tree-grounding.mjs` / `tree-grounding-receipt.json`. A fresh isolated save traveled through the normal Camp map, then used explicitly diagnostic position seeds near the existing tree and behind the wreck. Ordinary Auto harvest UI and mouse orbit followed; no material grant or camera override.

- Seeded at (11,29.3). `tree_section_1_arrival_r` was eligible, then native auto-harvest reduced its five chunks to zero in 6.5s and removed its collider. `tree-close-before.png` / `tree-close-after.png` show the existing Sapwood changing to its stump beside the wreck. The tree is separate from the wall and did not become unreachable because of the insertion.
- Seeded behind the module at (13.5,24.5), then used ordinary mouse orbit to face west. `rear-grounded-east-camera.png` shows the full rear frame seated on terrain, with no visible floating underside or hillside burial. The nearby stump remains separate from the structure.

Both runs recorded **zero page and console errors**. All owned browsers closed. Snapshot FPS values were high in headless desktop Edge but are explicitly not sustained or physical-phone performance proof.

## Actual-image inspection

All reviewer screenshots were opened and inspected at their actual full dimensions. Particularly useful comparisons:

- `arrival-default.png` / `approach-default.png`: first approach, visible fragment sequence and default camera.
- `approach-west-camera.png` / `ramp-entry.png`: full entrance, open roof, reward composition and ramp meeting the ground/floor.
- `chest-closed-west-camera.png` / `chest-open-west-camera.png`: chest prompt and native opened cavity.
- `inside-quarter-one.png` / `inside-quarter-two.png` / `inside-portrait.png`: layered ribs, dish support, near-wall visibility and tight-screen usability.
- `exited.png`: clear route between the two cargo objects after walking back out.
- `tree-close-before.png` / `tree-close-after.png` / `rear-grounded-east-camera.png`: separate resource access and rear support.

The root's current `wreck-from-trail`, `wreck-entry`, `wreck-chest-ready` and `wreck-chest-open` PNGs were also inspected. They show the default-yaw translucent occlusion treatment exposing the player/chest behind foreground wall pieces. That is visually busier than the opaque target, but it preserves the practical interaction in the supplied view. Root's full pack/reload receipt was read as supporting evidence; literal reload was not independently repeated here. Old `*failed*` root evidence predates the cargo-panel placement correction and is not the current layout.

## Remaining polish, not blockers

1. The target has richer folded armor and less regular damage. The V2 shell remains more rectangular and orderly; this was already bounded in the neutral pass. Its identity is now clear enough for the current local candidate.
2. At default arrival yaw, the large wreck initially extends off the right side of the screen. Its ramp and fragments still invite approach, and ordinary orbit reveals the full intended composition. Later guidance could better introduce that camera affordance, but forced camera changes are not required by this review.
3. Pale panels show finer surface stipple in native lighting than in the clean target. Keep future surface polish broad and matte; avoid adding further fine detail.
4. Whole foreground pieces sometimes fade together, creating several overlapping translucent planes at the default camera. This works for access but is less visually quiet than the oblique native views. Any future fade refinement must preserve player/chest visibility.
5. The receiver's rim and the plain ramp could receive restrained shape/detail refinement later. Neither currently obscures the reward or misrepresents entry.

## Exact revision and limits

Fixed target SHA256: `55742c30f0b474990cb970421a8bec0d052e41f76f46f4e94d0d0fa6da14b8f7`.

Reviewed runtime model hashes match the seven V2 hashes in `independent-model-review-v2.md`. The native source/model hash receipt is `.dream-loop/overnight2-survey/review/source-hashes.json`. At review closure:

- Composer SHA256: `c7d1d70d36d3098c2c9daf09625a4d99a6bfd116d005661b3fde70f9008bf0b4`.
- Canonical world SHA256: `6b038aee3550fa8ed29a458629fee2ed6f0dce425ff121b1383ceddec2ce46ec`.
- Generated world SHA256: `759191ab57182cebaedff90e9d3242a897a0a44ccd9e1387440f871b5bb922d7`.

This review tests the central entrance and relevant route, not every wall collision approach or every possible camera angle. It does not certify roof remnants as platforms. No Author export, saved legacy world, packaged/offline run, full suite, physical phone, bench upgrade journey or campaign progression was performed by this reviewer. No production/canonical world files or commits were changed; only owned evidence and this versioned review were written.
