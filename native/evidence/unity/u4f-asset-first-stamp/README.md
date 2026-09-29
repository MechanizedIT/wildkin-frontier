# U4F asset-first voxel stamp admission — `U4F_SOURCE_GENERATOR_HOLD`

## Disposition

U4F stopped at the source-generation readiness gate. The owner-approved reference pass produced four candidates and selected `candidate-04.png` after independent review. The guarded local TRELLIS status check found no responding service. At the final check, available system RAM was 12.11 GiB, below the unchanged 18 GiB Small512 startup gate. The existing `server.json` records a September 14 process whose PID 38692 has since been reused by a Node process. No TRELLIS generation attempt ran.

This is a generator/resource hold, not a judgment of generated-source quality, cleanup feasibility, voxel fidelity, or MatterDomain behavior. No raw model, audit, cleanup derivative, SDF stamp, Unity import, stamp lab, damage handoff, tests, or Player build was produced. Those later gates remain unattempted. The active Unity Editor session was left untouched.

## Reference

- Candidate count: 4.
- Selected reference: [`candidate-04.png`](../../../../art/source/u4f-rock-001/reference/candidate-04.png).
- Exact prompts, provenance, and SHA-256 values: [`reference-manifest.md`](../../../../art/source/u4f-rock-001/reference/reference-manifest.md).
- Independent reference review: [`review-reference.md`](../../../../art/source/u4f-rock-001/reference/review-reference.md).
- Selected SHA-256: `8CD08B697FF9FEA8035336B01D88CCC729DD598E23A285996DA166D374FEDF25`.
- Review limitation: upper-right concavity depth is ambiguous; one view cannot establish hidden-side closure.

## Guard evidence

See [`receipt.json`](receipt.json) for the machine-readable checkpoint and [`trellis-status.json`](trellis-status.json) for the saved guarded status/resource snapshot. The status helper at `http://127.0.0.1:7960` reported no ready service; the later `/ping` and `/status` requests both timed out, and a final TCP listener check found no listener on port 7960. The stale helper receipt's PID now belongs to Node. Final RAM was 12.11 GiB free versus the required 18 GiB before Small512 model import. GPU availability was 5,519 MiB of 8,192 MiB on the RTX 3070 Laptop GPU. The old local TRELLIS logs were preserved without edits.

The current process command-line query was denied by Windows (`Get-CimInstance Win32_Process: Access denied`), so this record does not claim exact identities for every Python process. The endpoint absence, reused PID, and failed RAM startup gate are sufficient to stop safely without launching another process.

## Resume criteria

Recheck the guarded status endpoint, recorded process identity, current RAM, and VRAM before any generation. Proceed only when the existing Small512 startup guard reports adequate headroom and no TRELLIS process is loading. Keep the documented maximum of two source attempts and all export/reserve limits unchanged. Do not install or update the TRELLIS stack to force this checkpoint forward.

Preserve unrelated pre-existing local work: the modified U3 burst-readiness JSON; modified HDRP pipeline/global settings; untracked `Builds/`, `authoring/`, and portable browser evidence. These paths are not part of the U4F checkpoint.

Stop for owner review. Do not start U4E.3, U4G, or U5.
