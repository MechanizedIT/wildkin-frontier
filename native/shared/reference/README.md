# Native reference data

This folder contains engine-neutral facts from the completed browser R&D that native prototypes can use as a behavioral contract.

It is intentionally small.

Do **not** port browser implementation details merely because they are present in the old source tree. Native code should preserve the verified contracts and use engine-appropriate data structures.

Primary frozen reference:

- `PHASE05E_REFERENCE.json`

Authoritative source evidence remains in:

- `docs/VOXEL_PHASE05E_REPORT.md`
- `docs/evidence/voxel-phase05e/source/receipt.json`
- browser matter source/tests

When exact behavior differs intentionally in the native prototype, record the reason and the new acceptance criterion rather than silently changing the reference.
