# U4E.2 — Interlock pose search

This bounded Unity Editor experiment compares the original frozen U4E pose (A), deterministic three-axis translation (D), and bounded local-frame interlock pose (E) for five U4E.1 attempt-index-0 fixtures. All candidate validation uses the fixed directional patch metric, 12.5 mm maximum penetration, bidirectional zero sampled overlap, and frozen terrain/sibling context.

Search bounds are U/V ±0.50 m; the D coarse lattice is 125 mm with up to eight coarse seeds refined inside ±125 mm at 25 mm increments. E evaluates the 5×5×3 orientation lattice (U/V ±20° in 10° increments, N twist ±15°) on those D seeds. N solving targets the nearest support-facing directional surface at 0 mm to avoid using out-of-footprint probes as a push-through signal; area-weighted median remains a recorded score, never a global-min-primary ranking.

Independent visual review is complete and assigns `U4E2_LOCAL_POSE_SEARCH_HOLD`. Machine-valid candidates do not yet read as naturally seated interlocks: several require large translations/rotations, and untouched neighboring stones remain visibly detached. No Windows Player build was requested.

Result: `U4E2_LOCAL_POSE_SEARCH_HOLD`

The original A control is accepted on all five fixtures. D accepts 3/5 overall (2/4 core fixtures); E accepts 5/5 (4/4 core plus the stress accent). Every accepted candidate is context-valid with zero bidirectional sampled overlap; source, recipe, content, mesh, and spacing invariants remain intact. Focused EditMode is 6/6, full EditMode 166/166, and PlayMode 3/3. Per-seed metrics live in `metrics/`; matched 1920×1080 PNGs live in `captures/`; test receipts and review are included here.
