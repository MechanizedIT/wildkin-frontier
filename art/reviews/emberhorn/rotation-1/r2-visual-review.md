# Emberhorn rotation 1 — independent R2 visual review

## Decision: HOLD; one final R3 repair is warranted

R2 removes the R1 prism-bar failure and preserves the improved, grounded R1 legs. It does not yet produce a readable mane/crest. In front, profile, rear, top, and three-quarter views, the back reads as a mostly uninterrupted torso plane with only a few tiny points. At 48px the crest is absent; at 96px it is still not a coherent dorsal silhouette. This misses the construction target's compact, visible mane while the retained red heavy quadruped, paired horns, and leg mass remain strong.

## Scores

| Axis | Score | Evidence |
| --- | ---: | --- |
| Heavy quadruped body and horn identity | 8.0 | Clear in every neutral view. |
| Grounded limb volume | 8.0 | The four R1 legs remain readable and are preserved by parity evidence. |
| Mane silhouette and attachment | 2.0 | Three small exposed points do not form a crest; most wedges are buried. |
| Three-quarter readability | 6.0 | Overall creature reads, but the target-defining back treatment does not. |
| 48px / 96px mobile readability | 3.0 | No useful crest reads at 48px; it remains fragmentary at 96px. |
| Technical and preservation evidence | 8.0 | 15 mane meshes are closed and positive-volume; all six sibling assets are exact and only the allowed Emberhorn parts changed. |
| **Overall** | **5.8** | **HOLD** |

## What changed and what did not

The stepped prism-bar look is gone, which is a real R2 improvement. The R2 topology audit and parity receipt support preservation of all four R1 legs, hooves, torso, head, horns, eyes, and the six sibling assets. Those receipts cannot establish exterior visibility.

The supplied torso-skin ray data directly explains the failure: most proposed wedge apexes are below the actual torso skin. For example, row 0 centre has clearances of -0.139, +0.044, and -0.201 across its three sections; row 2 centre has -0.061, +0.065, and -0.193. A fixed assumed torso height therefore buries the lower and upper crest profiles even where a middle profile just clears.

## Single focused R3 repair packet

Keep the R1 legs and every unmodified named component byte-for-byte unchanged. Replace only the 15 `layered_mane` placements/section coordinates using a measured retained-torso surface contract:

1. Raycast the actual retained torso mesh at every planned wedge-section column and store hit point, face/triangle identity, and outward normal in the R3 receipt. Do not use a fixed global Y attachment value.
2. Set each wedge's buried attachment profile relative to that local skin and normal, then set its exposed crest profile to a recorded, positive outward clearance sufficient to remain visible in the R3 48px and 96px views. Preserve a compact brow-to-neck ridge; do not solve burial by making large dorsal plates.
3. Fail before rendering unless every intended visible apex has a valid torso hit and positive outward clearance, every buried base has deliberate overlap with the torso, all 15 wedges remain closed/positive-volume, and the R1/sibling parity checks remain exact.
4. Capture the same eight neutral and game-scale views and judge the result as the final allowed candidate. There is no fourth candidate.

This is consequential because it corrects the measured cause of the R2 failure without reopening legs, horns, gameplay, or sibling assets.
