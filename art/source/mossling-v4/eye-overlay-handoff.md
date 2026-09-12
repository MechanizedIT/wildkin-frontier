# Mossling V4 eye-overlay handoff

## Scope and outcome

Target reference: `.dream-loop/living-frontier-f4/target.png`. Source asset: `assets/models/mossling-v3/model.glb` (SHA-256 `ca044bb9321423c8d4e83aedce7697d98109eafbeeafbefbdf3d0e13a58e9cf9`).

The V4 eye-overlay candidate is **not admitted**. V3 remains the shipping model; F4 may use its body-tone material path only. No V4 model, asset, or runtime integration is authorized by this handoff.

## Attempts and decisive evidence

- `candidate-v3` used head-surface ray probes and a head-weighted tangent-plane ellipse. It was structurally attached, but the overlays landed above the untouched painted eyes, producing a four-eye appearance. See `candidate-v3/review/three-quarter.png`.
- `candidate-v5` replaced the head-plane placement with manually chosen texture pixels mapped through UV triangles and interpolated source bone weights. Its left eye was plausible, but the right selection was below the iris. The close diagnostics make that mismatch clear: `baseline/eye-uv-diagnostic/right-annotated.png` and `candidate-v5/close-review/three-quarter.png`.
- `candidate-v8` corrected the manually read right pixel and used UV/body-correspondent surface points. It still rendered a separate teal fan beside the visible brown iris: `candidate-v8/close-review/front.png` and `candidate-v8/close-review/three-quarter.png`. The chosen point therefore did not identify the visible iris. Reused/non-visible texture islands are a suspected cause, not an established diagnosis.

No motion review or structural admission was run for the rejected later candidates. The original V3 cap remains unchanged.

## Material lesson

The experimental overlays correctly exported `wildkin_body` and `wildkin_iris`. Iris `COLOR_0` must be neutral white and pupil `COLOR_0` black, with teal as the `wildkin_iris` material default. Standard material tinting then recolors white iris geometry while preserving the pupil; teal vertex colors would multiply arbitrary runtime hues incorrectly.

## Reliable next pass

Use a camera-aligned UV-ID diagnostic before authoring geometry:

1. Render the V3 face from the intended front and three-quarter cameras with a UV-coordinate ID material, alongside the normal body render using the identical camera transform.
2. Manually identify each visible brown pupil centroid in the normal render, then sample the same screen pixel in the UV-ID render.
3. Convert that exact sampled UV to the body triangle and barycentric location; verify the resulting rest point projects back to the original pupil pixel in both views.
4. Author the overlay from those verified correspondences and copied/interpolated source skin weights, then judge a close static front and three-quarter render before clip contact renders.

This avoids inferring a visible eye from similar-looking painted texture islands. It is a fresh bounded asset pass, not a request for new owner approval.
