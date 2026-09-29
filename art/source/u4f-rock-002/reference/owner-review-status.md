# U4F-R Owner Review Status

## Owner decision — September 29, 2026

**APPROVED FOR FIRST U4F SOURCE GENERATION: `candidate-04.png`.**

- Exact approved image: `art/source/u4f-rock-002/reference/candidate-04.png`
- SHA-256: `6B0D4606568158DE586F488BB0CAFE7B17E04C26B6C47F5528CEE6209043B0BC`
- Provenance: generated September 29, 2026 with the built-in Codex `image_gen` tool; model version undisclosed; 1536 × 1024 PNG. The exact generation prompt and candidate inventory are preserved in `reference-manifest.md`.
- Role: representative first source for the one-rock end-to-end U4F qualification.

This selection does not reject the other five references. Candidates 01–06 remain retained as useful future rock-family/reference material; candidate-06 is also a strong later source candidate. Candidate-04 is not the only desired Wildkin rock style. Some final Wildkin stylization may come from material, weathering, biome, and surface-treatment systems rather than being baked entirely into source geometry. No unselected candidate is deleted or relabeled as failed because it was not selected first.

The independent image review and its candidate dispositions remain in `review-reference.md`. The owner selection is separate from that review and supersedes the prior `U4FR_OWNER_REVIEW_REQUIRED` gate for candidate-04 only.

## Result after the approved source gate

Fresh pre-start readings passed the unchanged 18 GiB Small512 startup gate (21.21 GiB free RAM; 7,390 MiB of 8,192 MiB GPU memory free). The guarded server loaded, but attempt 1 stopped itself at 5.31 GiB free under its existing 6 GiB runtime reserve, before producing a raw model. The current result is `U4F_SOURCE_GENERATOR_HOLD`; the client received a connection reset and no GLB was preserved. Independent review found no policy-justified attempt 2 because this attempt produced no raw output to classify. Full receipts and review are in `native/evidence/unity/u4f-asset-first-stamp/continuation-2026-09-29/`.

Do not weaken guards, close unrelated applications, or repeat the same route unchanged. This source-generation HOLD does not reject candidate-04 or the other five references.
