# Survey Module V1 — independent model review

Reviewer: `camp_native_review`, independent of production implementer. Reviewed all six supplied fresh-export screenshots at their full dimensions, against the fixed target and the previously inspected approved Explorer / admitted chest style. Manifest component hashes independently checked against disk; all seven match.

## Verdict

**HOLD — 6.3/10 for this model revision.** Composition/form 1.7/3, lighting/palette 2.6/3, materials/surface treatment 1.8/3, details 0.2/1. The current asset does not meet the >=8 model-admission threshold. The target remains suitable; no target regeneration is needed.

The current model reads as a pristine open shed or modular enclosure. The target reads as the substantial torn remains of a survey cabin. This is a structural silhouette and damage-language gap, not a request for many tiny bevels or noisy texture work. The useful open-space and mechanics decisions should be retained while the cabin shell is revised.

## What works

- Three paired rib stations are recognizable and consistently aligned. The broad entrance and missing roof are clearly open in front/quarter views.
- Ivory, charcoal and blue-gray give clear manufactured identity and suit the Explorer palette. Matte shading is restrained; no reflection, emissive clutter or fine texture noise is apparent.
- The admitted chest appears at a plausible scale, sits on the floor and remains recognizable. The sampled fully open pose shows a visible gap to the back wall and no obvious lid clipping. This proves only that static sampled arrangement, not the complete lid/catch motion or native interaction.
- The shallow ramp meets the visible floor lip on the neutral plane. No obvious floating isolated part appears. Actual terrain and Rapier access remain untested.
- Seven components total 3,216 triangles and 251,368 GLB bytes according to the checked manifest, with one draw primitive per component and a tiny embedded palette. This is a deliberate mobile starting budget, not a reason to admit visibly incomplete forms or a measured FPS result.

## Required revisions

1. **Restore cabin mass and attachment hierarchy.** In `three-quarter.png`, the side walls read as thin cream fence infills between narrow dark posts. All three rib shoulders look like identical short rectangular rail extensions. Widen/deepen the principal armor shoulders and their upright transitions, with obvious feet or floor-frame sockets. Give at least the entrance rib a substantial pale armored outline like the target. Put added bulk outward where possible so the clear entry and open roof are preserved. Do not merely widen every flat wall sheet into a heavier box.
2. **Make the roof loss and hull damage unmistakable.** All six shoulder tips are identically angled, clean, flat and neatly capped; they suggest a designed unfinished roof. Keep the three paired structural positions but vary the broken terminations deliberately: one retained armored shoulder, one exposed snapped frame, one shorter torn end, with a small number of large readable breaks. Interrupt one or two retained wall panels with a manufactured torn/notched edge or a missing broad corner. The rear wall's shallow stepped notch alone is insufficient. Keep fractures planar and structural; do not add rock-shaped rubble or a forest of spikes.
3. **Replace the blank wall/floor surfaces with a few meaningful manufactured divisions.** The target has framed hull plates, a weighty floor frame and broad floor plates. V1 has two uninterrupted cream rectangles per side, a largely blank rear rectangle, and a single featureless dark floor. Introduce restrained broad panel seams/insets and visible frame-to-sheet connections; divide the floor into a few large plated sections. Keep these at mobile-readable scale and low contrast. No fine greebles, rivet grids, grunge textures or reflective material changes are needed.
4. **Make the two breadcrumbs actually damaged cargo.** `breadcrumbs.png` shows a nearly pristine beveled rectangular lid and a complete little box frame. Introduce a deliberate missing/creased panel edge consistent with the shell, and one visibly interrupted or bent frame rail. Preserve a supported grounded footprint and the two-piece limit. The fragments should explain the wreck, not look like newly placed camp furniture.

These four changes are admission blockers because they determine whether this is the referenced torn survey module. Preserve the current practical entry width, roof opening, chest spacing and material economy through the revision.

## Secondary improvements and evidence limits

- The receiver is a near-circular bowl with one wedge removed. Its pale shape is readable, but the small mount is difficult to parse from the available angles and lacks the target's purposeful joint silhouette. Make the short support and single horizontal pivot clear from at least one three-quarter/rear view. Keep its geometry subordinate to the cabin; avoid copying ambiguous stacked fittings from the target.
- The amber insert/bracket is pleasantly simple and attached to the rear wall. Keep that clarity. Its interpretation as a cartridge and relationship to the reward interaction require the later native presentation, not extra decorative shapes.
- `game-scale-neutral.png` is an 844x390 staged neutral render with the Explorer. The cabin's top is cropped and the camera/material pipeline is not actual gameplay. It supports approximate relative scale and chest prominence only; it cannot certify the native-camera static gate, foreground occlusion, world route, hillside grounding or physics. The parent owns those checks after the model reaches the neutral threshold.
- Current receiver and chest stills do not show AI-style floating fragments or impossible intersections. Passing those basic checks does not resolve the larger form/damage mismatch.
- No production assets, browser state, Blender source or collision metadata were changed by this reviewer. No full tests or commit were run.

## Exact evidence

Target `art/targets/survey-wreck-v1/target.png` SHA256: `55742c30f0b474990cb970421a8bec0d052e41f76f46f4e94d0d0fa6da14b8f7`.

Screenshots under `.dream-loop/overnight2-survey-model/v1/`:

| File | SHA256 |
| --- | --- |
| front.png | 539f7f5f8841372fe3d28d14400fe4582ab0bb48499e53ca97b4f8b8e29c2aba |
| rear.png | c99abdca7157c73e7d041ba710779dcff65320b365ca3a7b3499c47edd61057a |
| three-quarter.png | b2dafbcb8b8fb3a216d5efcdf4fc30b2bd2c9a1217adb813f803eaae8197b643 |
| game-scale-neutral.png | 0c3c1874606b520ee50d9ef01453011d9f0e90da0b046dce26f984e4563115ca |
| chest-open-clearance.png | 07adf2dfd877eca1f7865f8f751641ce92e2bbb88a54cff95f850e3b7a0e70f4 |
| breadcrumbs.png | 88a3742ab8545200c9d8b6bc5d19a593a35e6fabf00279b7ffe5ee90e67bacb5 |

Checked candidate GLBs in this folder:

| Component | SHA256 |
| --- | --- |
| survey-left-wall.glb | d58091c38a11c1e1b05b1348ec6e4141a3a0b87f626de1350eb4b878aaf46bf9 |
| survey-right-wall.glb | ee46f273efa907b41e56449dc9aa18557cbd868441c2fa9a878f132a4f984191 |
| survey-rear-wall.glb | ad0d57334a03557e7ce51d8afbdde99f62098a3341a34adbbe2c2496df0e9051 |
| survey-floor.glb | 0c0b85c525b7da4e6aa8daad16c6a2193009f1bafee62ee7a06ef95ea34b7f34 |
| survey-ramp.glb | cfd69b2cdac08969859fde1ecadeba86e3b677ee3693cd3e83a7f128bcc53c1e |
| survey-panel-debris.glb | 673c0d767167ac730531642340d0318964cdb8bd1bc2442aacec61406949dd00 |
| survey-cargo-frame.glb | 33cb40392991ef7ce6c8a269a0fe3e58823d485bc0e6bc24e5e1c0b8bb2dcb61 |
