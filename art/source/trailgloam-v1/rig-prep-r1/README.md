# Trailgloam fitted rig checkpoint

Use **fitted-r1a/trailgloam-fitted.glb** and the adjacent editable Blend. The raw textured TRELLIS source remains unchanged. [Actual images and interactive playback](../../../reviews/trailgloam-rig-r1/review.html).

The final useful derivative has 59,376 triangles, 40,908 exported vertices, 29 bones, and Neutral/Loaded/WalkDiagnostic clips. It is retained as a fitted feasibility candidate, not admitted gameplay motion. The build receipt, roundtrip receipt, source reviews and independent visual review distinguish those claims.

## Reproduction and experiment history

- `landmarks.json` is the operative measured eight-leg handoff. Earlier inferred/mixed-axis files are archived failure history.
- `candidate-r1` is an invalid worker probe (mesh/bone scale mismatch and body-only motion); never use it as the retained rig.
- `candidate-r2` is an unexecuted source draft held during independent review.
- `fitted-r1` stopped on a meaningful reach failure before export. The reviewed plan amendment increases compression to 8cm and tightens reach tolerance.
- `fitted-r1a/executed-builder.py` preserves the exact builder used for the retained GLB. It exported successfully, then stopped on an obsolete vertex-count equality assertion. The exporter split 40 extra vertices; this was not a lost-surface defect.
- `inspect_fitted.py` independently imports source and this exact GLB in a fresh Blender process. It verifies neutral surface discrepancy below 2e-6m, matching UVs, unchanged triangle count, bones/clips, finite evaluated surfaces, foot travel and loop closure. Its actual run passed. Root authored and ran it; a separate reviewer assessed the evidence and images.
- The current `build_fitted_diagnostic.py` replaces only that obsolete count equality with a triangle-count assertion. This future-only correction has not regenerated the retained model. A reproduction requires a new output destination; the builder intentionally refuses to overwrite an attempt. Run the surface/UV inspector on any new derivative too.

CPU Blender invocations use `--background --python-exit-code 1 --python <script>` so Python failures are reflected in the process exit status. No TRELLIS inference or GPU rendering was needed for this rig study. The fixed 1.1s gait is an authored diagnostic; forward travel/retiming, transitions and full gameplay states remain next.
