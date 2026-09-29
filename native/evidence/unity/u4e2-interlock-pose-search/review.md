# Independent visual review — HOLD

Disposition: `U4E2_LOCAL_POSE_SEARCH_HOLD` (September 29, 2026). This was a fresh read-only review of the bounded U4E.2 brief, implementation, six focused tests, per-seed metrics, all matched A/D/E pair and context captures, and the available patch-debug captures. No implementation or evidence files were changed by the reviewer.

## Machine evidence confirmed

- Frozen A controls pass for all five fixtures and retain U4E.1 attempt index 0.
- D accepts 3/5 overall, including the stress accent, but only 2/4 core fixtures. E accepts all 5/5, including all four core fixtures.
- Accepted candidates pass intended-parent/terrain/frozen-sibling context checks and bidirectional sampled-overlap validation. Source recipe, geometry, content, mesh, spacing, and sibling invariants remain preserved. Search bounds and bounded finalist overlap scans are recorded per seed.
- The implementation is technically bounded and deterministic. The automated acceptance is not sufficient evidence of a believable formation.

## Visual findings

- Seed 7000 E closes the shoulder-side gap, but approximately 0.79 m total displacement and 25° of angular change reads more like repositioning than naturally seating the stone.
- Seed 7010 E appears to improve the left buttress placement, but the actual contact footprint remains difficult to read.
- Seed 7015 still reads as perched with uncertain support despite its larger measured patch.
- Seed 7017's separation improves, but approximately 0.54 m displacement and 30° of angular change reads as relocation/reorientation rather than a natural lean.
- Untouched sibling stones remain visibly detached in context captures. Patch-debug witness points/axes do not make the footprint clear enough to overcome that context evidence.

## Decision

HOLD. Rotation is materially useful to the machine-valid search, but these results do not establish visually convincing interlock. Do not start U5 or claim the formation gate passed. Any follow-up requires a fresh bounded owner-approved slice; this review does not authorize broader layout or source redesign.
