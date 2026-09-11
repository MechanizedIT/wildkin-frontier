# Independent visual review — Mossling rig-20k-v3

Reviewed the actual v3 GLB and its supplied static/action renders, all Walk frames 1–13 and Run frames 1–11 at front, side, and three-quarter angles, plus the runtime ground-contact captures in `runtime-motion/`. Reviewed model SHA-256: `f8043f46ef7d871a82a31a1271f9ea6feda145109a495f2e2a6a2846d7e58736`.

## Target likeness: 8.1/10 — PASS

The revised model now clears the required 8/10 threshold for specific visible reasons. Against the approved neutral reference, it has a readable horizontal body/haunch silhouette, a tapered forward-facing muzzle, separate sturdy paws, the white body/green layered mantle/flowers palette, and the tall leafy tail. Side and three-quarter views preserve the correct head → neck → spine → tail direction; this is a genuine quadruped silhouette rather than the previously rejected sideways-body result.

It remains less exact than the illustration: the body is still smoother/whiter and more compact, and the leaf layers are brighter and more uniform than the reference's darker, larger, strongly faceted plates. Those are visible fidelity limits, but they do not obscure the creature identity or its anatomy. The 8.1 score reflects the corrected torso, haunch, muzzle, and paw silhouette rather than a threshold-only adjustment.

## Motion: PASS for full in-place Walk/Run cycle clarity

- **Walk:** The 13-frame side and three-quarter cycles show a complete alternating four-paw gait with visible swing and support phases. The torso has a readable vertical weight change instead of remaining locked flat, and the front view keeps the paws separated rather than crossed.
- **Run:** The 11-frame run has more extended reach/recovery and visibly greater body lift than Walk. It reads as a faster gait, not a duplicate of the walk. The runtime close ground views show both planted contacts and lifted-paw clearance without a clear ground-plane intersection or persistent hover.
- **Deformation:** No obvious head/spine axis reversal, leg inversion, paw fusion/crossing, severe knee/hip collapse, or foliage/flower detachment appears in the full rendered cycles. The mantle conceals some upper-leg detail but remains visually coherent as the body moves.
- **Actions supplied:** The Attack and Hurt peak renders retain intact anatomy, paw placement, foliage, and tail attachment. They support pose integrity only; a peak still does not prove each action's full timing or loop/transition behavior.

## Still pending

The currently available runtime images are close ground-contact/cycle captures, not translated game-travel captures. They cannot establish gameplay-world foot locking, paw sliding over distance, terrain/collision behavior, or owner playtest acceptance. Keep the translated in-game travel proof pending. This review evaluates the v3 asset and the supplied cycle/action evidence only.

## Addendum — actual game travel gate: PASS

Reviewed the rendered game capture in `travel-review/`: all 16 `companion-follow` frames from ordinary keyboard-driven player/companion travel and all 16 `wild-roam` frames from the live ROAM character. The capture report identifies the same reviewed GLB SHA-256: `f8043f46ef7d871a82a31a1271f9ea6feda145109a495f2e2a6a2846d7e58736`.

- In the unobstructed companion sequence, the Mossling travels alongside and behind the Explorer with its muzzle and body facing the visible direction of travel. It remains a readable companion-sized creature in the normal game camera rather than becoming a tiny prop or a screen-filling model.
- In the early, unobstructed wild ROAM frames (00–09), the same head/spine/tail axis faces travel and the walking poses change across ground contact and swing. Later ROAM frames are camera-occluded by level props, so they do not add useful anatomy evidence.
- Across both moving sequences, the paws remain visually close to the rendered terrain through support, with expected lifted-paw clearance in swing. I did not observe a conspicuous backward-facing travel, persistent foot skating, ground penetration, or an unreadable scale failure.

This clears the actual-game travel gate for the reviewed Walk/Run/ROAM presentation. It does not replace owner phone acceptance or the separate scaled wild FLEE check.
