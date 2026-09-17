# Independent inspector review — Lantern Geometry PLY R5

**Current verdict: GO after a successful guarded PLY run.** Reviewed final inspector SHA-256 `3fbd02403ec74a5ba2e5ee7f6ff2d6868db7493379bba27cb8690355e83f73e1`; `py_compile` passed. It clears one read-only neutral inspection only, with no geometry alteration, export, or admission.

## Historical initial HOLD — resolved

The intended contract is sound: it requires an absolute fresh output, pins sibling plan/receipt profile, mode, V2 input hash and face cap, verifies the PLY hash/counts/bytes before import, imports one mesh with identity transform/no merge, compares imported loop indices to raw records, uses a neutral display material, and performs no normalization, welding, normal recalculation, reduction, or export. Its 8 GiB start and 6 GiB watchdog are also appropriate.

Before it runs, make these focused corrections:

1. `review.configure_studio()` creates a floor beneath the raw mesh. Remove that floor from the inspection scene or set it non-rendering before every view; an underside review cannot accept a support plane that may occlude the raw underside.
2. Remove `scene.eevee.taa_render_samples = 24` unless the exact Blender 4.5 property is verified at runtime. The inherited helper does not establish this legacy property, and inspection should use supported/default EEVEE settings instead of failing on a presentation-only option.
3. The inspector's `positions` buffer is float32. For a float64 PLY, comparing it with `source_positions.astype(np.float32)` is a conversion check, not exact XYZ preservation, despite the receipt wording. Either refuse float64 PLY in this exact-inspection tool or record a measured max conversion error and qualify the claim. Given the expected decoder output, refusal is the cleaner current boundary.

After those changes, rehash the inspector and it can run only after a successful guarded geometry PLY exists. The resulting neutral inspection remains non-admitted evidence.

## Final inspector source recheck

**GO after a successful guarded PLY run.** Inspector SHA-256 `3fbd02403ec74a5ba2e5ee7f6ff2d6868db7493379bba27cb8690355e83f73e1` removes the unsupported TAA assignment, rejects float64 PLY before a Blender scene exists, and hides the inherited neutral floor only for each underside render before restoring it. It retains the pinned-plan/receipt/PLY validation and exact float32 XYZ/index comparison. `py_compile` passed. This permits one read-only neutral inspection after the runner completes; no geometry change, export, or admission follows.
