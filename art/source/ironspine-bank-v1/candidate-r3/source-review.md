# Ironspine narrow rockbank R3 — independent source review

## Decision: PASS to the final guarded Blender massing run

`build-bank.py` loads the exact frozen `construction-data-r3.json` hash and makes one literal mesh with the documented game-to-Blender mapping. It preserves stored faces and cap groups, performs validation, connectedness, two-use directed-edge, signed-volume, zero-area, cap-normal, opacity, and coordinate-roundtrip gates before studio renders. A failed audit writes pre-render metrics and stops; no automatic normal recalculation or topology substitution occurs.

The isolated cap images use only the cap face groups and compare rendered alpha coverage with their measured projected coverage, avoiding a whole-object image as a false cap proof. The neutral material is appropriate for this massing review. Final export/runtime and terrain-support admission remain outside this source gate.
