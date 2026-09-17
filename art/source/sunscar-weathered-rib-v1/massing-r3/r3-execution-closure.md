# R3 execution closure — pre-render HOLD

The final R3 release was executed once with Blender 4.5.3 LTS using --background --python build_massing_r3.py -- --execute. It stopped in the structural audit before cap-opacity or studio rendering. No mesh geometry, source coordinates, or render candidate was changed or retried.

metrics.json records one connected component, no non-two-face edges, no normal failures, expected grounded bounds (within float representation), then R3_STRUCTURAL_HOLD: cap winding/coverage failed. The left cap retained complete absolute coverage but failed the assumed winding sign. The right cap failed the same assumed sign and differed from profile area by approximately 0.0005000068, above the script's 1e-5 tolerance. This is preserved as the final counted R3 pre-render HOLD; no fourth candidate is authorized.

## Provenance

- frozen input: ../geometry-plan-r3-final.json SHA-256 077016a80c180f55ee6fab77873270cd922af236415e00ae4e62448d4420189a
- executed source: build_massing_r3.py SHA-256 dba484a99860b8c3371d39f42468a4054e1fadba822b1b47407c01bf9a59c898
- command: "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" --background --python build_massing_r3.py -- --execute
- standard output log SHA-256 28998ff746b0411fe78a57bad105a338205b977158a67b42a5d5ce2dfe767fee
- standard error log SHA-256 e971f6119b8c11dc01ee04c4ed811cdfd967633368698b8740cdc71e46fda70c
- failure metrics SHA-256 d3ffebb371e902a60bdca57773fb994ce6ed6886bf41d9278f6f9c54173b41c5
- studio/cap image artifacts: none; the failure occurred before their render loop
