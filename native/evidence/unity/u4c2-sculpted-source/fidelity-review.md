# U4C2 source-to-matter fidelity review

## Verdict: REPRESENTATION_HOLD

The true-SDF field has enough visual fidelity to preserve the admitted source family's broad, authored shapes, but the existing shared Surface Nets reconstruction cannot yet be declared viable at every fine tested resolution. This is a representation/topology HOLD, not a request to reopen the mesher for a feature-fidelity failure.

## Evidence reviewed

I inspected each `resolution-A/B/C` beauty and second-angle strip in the stated order: SOURCE, 0.50 m, 0.25 m, 0.125 m, and 0.0625 m. I also inspected the B/0.125 clipped-versus-true-SDF beauty and closeup pair, the B/0.0625 closeup, and every per-row metrics file.

The focused scalar/fidelity test suite reports 16/16 passing. The matrix reports zero skipped degenerate triangles in every row.

## Fidelity judgment

- **0.50 m is below the visual floor.** Each object keeps its rough footprint, but broad source cuts flatten or step away: A's low crown and side break, B's chip/cut hierarchy, and C's leaning shoulder lose too much authored plane definition.
- **0.25 m is the lowest acceptable spacing across all three stones.** Both views retain the large cut planes, unequal silhouettes, and grounded profile that make A, B, and C read as their corresponding source assets. The p95 source/field deviations are about 0.055–0.066 m and reconstructed/source deviations are about 0.056–0.058 m. All three 0.25 m reconstructions are closed, connected manifolds.
- **0.125 m visibly improves edge and cut definition**, particularly B's changed planes and C's shoulder. The true-SDF B closeup is materially smoother and more coherent than the clipped control, confirming that preserving exterior distance improves the reconstruction rather than merely adding samples. B/0.125 is a clean manifold. C/0.125 is visually strong but has one four-use nonmanifold edge, so it cannot be admitted as a valid representation.
- **0.0625 m approaches the source silhouette most closely.** A and C are valid in this capture. B/0.0625 is visually strong but has one four-use nonmanifold edge, so it too is not viable as an authoritative reconstructed representation.

The topology defect is localized in the observed outputs and is not visible as a broad-face fidelity loss. Position-based welding and integer-cell-keyed welding report the same failure, which rules out aggregate positional weld precision as the cause and points to the one-vertex-per-cell Surface Nets ambiguity already identified.

## Topology gate

| Resolution | A | B | C | Decision |
| --- | --- | --- | --- | --- |
| 0.50 m | manifold | manifold | manifold | topology passes; fidelity below floor |
| 0.25 m | manifold | manifold | manifold | lowest common admissible representation |
| 0.125 m | manifold | manifold | **one 4-use nonmanifold edge** | HOLD for fine-tier admission |
| 0.0625 m | manifold | **one 4-use nonmanifold edge** | manifold | HOLD for fine-tier admission |

For C/0.125, the reported four-use edge runs from `(0.1756221, 1.069546, -0.7523146)` to `(0.1756221, 1.069546, -0.7481436)`. That is a topology failure even though skipped-degenerate count is zero.

## Decision boundary

Do **not** reopen the mesher on visual-fidelity grounds: 0.25 m preserves the source family's important broad faces, cuts, corners, and silhouettes. The evidence instead supports retaining 0.25 m as the bounded visual baseline while holding the representation qualification until the shared Surface Nets ambiguity is resolved or a future gate explicitly accepts a narrower topology envelope. Neither C/0.125 nor B/0.0625 should be presented as an admitted valid fine reconstruction.

This review does not assess material quality, gameplay destruction, persistence, or performance viability beyond the recorded qualification timings.

## Standalone player verification

I independently inspected `player-B-0.125.png` and its receipt/provenance. The Windows x64 Development Player rendered the expected B/0.125 true-SDF reconstruction: the tall asymmetric boulder, broad cut face, and grounded base are visible, with no missing-shader pink/error presentation. `player-B-0.125.json` pins source hash `EA991B6C6C2D132D`, reconstructed hash `7D2310981C316846`, 0.125 m spacing, 12,650 samples, a clean manifold result, and a cold-run player environment. `build-provenance.json` records the same U4C2 scene built successfully with zero errors; `player-launch.json` reports exit code 0.

The player result confirms that the valid B/0.125 row survives a standalone build. It does not alter the final **REPRESENTATION_HOLD**, which is caused by the separately verified C/0.125 and B/0.0625 nonmanifold rows.
