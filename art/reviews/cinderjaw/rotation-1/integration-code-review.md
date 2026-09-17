# Cinderjaw/Emberhorn focused visual-kit bake — independent code review

## Decision: PASS

The change adds a narrow repeatable `--asset <id>` selector to `tools/bake-visual-kits.mjs`. Arguments are parsed and the whole selection is validated before the first `bake` mutation or `world.json` write. A selection must be unique, code-native in `VISUAL_KIT_BUILDERS`, already exist in the world asset list, and not be an external-model asset. The selected map preserves request order; no selector keeps the prior full-registry iteration.

The reviewed test independently reconstructs each approved kit, serializes it through the same `meshRecipePart` boundary, and requires both authored `world.json` recipes and generated runtime data to match. The focused factory receipt further records exact indices and material flags, sub-0.00005 m coordinate round-off, and exact preservation of other top-level data, asset order, unselected assets, and selected metadata. Its invalid-selection cases also show no world write for missing, incomplete, duplicate, or external-model arguments.

This is sufficient for the authorized two-asset bake boundary. The selector does not create a generic factory path, alter game behavior, reposition assets, or admit an asset that has not passed its own model/runtime review. The reported 1,426 tests, verify, and ZIP are root-run validation evidence; packaged factory/save proof remains a separate final checkpoint record.
