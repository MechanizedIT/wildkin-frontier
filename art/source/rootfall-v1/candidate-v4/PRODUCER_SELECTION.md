# Rootfall — best existing candidate selection

September 12, 2026. **Recommend retaining the existing V4 candidate as the best usable option under Chris's bedtime delegation.** Its cut sites are clearly visible at the ordinary gameplay camera; V2's more restrained chips become tiny marks in underside shadow. The braced opening and reciprocal route are clear in both versions. V4's warm kerfs make the immediate player task easier to recognize, which is the decisive tradeoff for this bounded selection.

This is producer selection advice, not an independent 8+ art admission or Chris's personal aesthetic acceptance. **Preserve V2's native HOLD7.4 and V4's native HOLD7.1 exactly.** No replacement score is assigned. No new artwork, hybrid version, generation or owner question is proposed.

## Comparison from actual images

| Candidate | Visible strengths | Why selected or passed over |
|---|---|---|
| V1 final | Obstruction and resulting opening are understandable; inexpensive faceted asset. | Regular cylinder, square socket-like working marks and less convincing lashing depiction. Its model HOLD7.2 remains appropriate historical evidence. No benefit over the later candidates. |
| V2 | Fuller directional left buttress, tapering right branches, natural-looking small tears in neutral close view, clear supported OPEN lane. Historical model PASS8.0 and native HOLD7.4. | The actual native CLOSED/first-cut views reduce the work sites to minute gold fittings in dark shadow. With no art changes authorized, choosing it would restore an immediate interaction-readability weakness. |
| V3 | Stronger cut contrast and preserved tapered body/open lane. | Fresh game-scale and notch detail show conspicuous rectangular gold recesses with dark inserts. This is a more manufactured work-site read than V4; no V3 native sequence was found in the inspected evidence set, so no native result is invented. |
| **V4** | Warm exposed-sapwood sites are easy to locate in native CLOSED, with clearer wood color than V3 sockets. Braces, cost/action, OPEN lane and return remain readable. | **Best usable existing compromise.** The bands are too broad and the underside still reads partly as an elevated arch, but the visible work sites are more actionable than V2's. Historical native HOLD7.1 is retained. |

The historical numerical scores are not a controlled side-by-side benchmark: the V2 and V4 captures also have different terrain/HUD states. The recommendation is based on the visible task affordance, not version number or a rescore of reference fidelity. V2 remains the stronger historical scored native candidate; V4 is my preferred playable compromise given the instruction to select an existing version and move on.

## Known flaws carried forward deliberately

- CLOSED retains a dark, nearly level underside between spread root legs. It can suggest a pass-under space even though the event is designed to block passage. Selection does not resolve this target mismatch.
- V4's pale work sites are tall gold bands rather than the target's shallow irregular chips. Their visibility is useful; their shape remains imperfect.
- First-cut physical progression is subtle and still relies heavily on the message. The full middle remains until repair, so the player does not see a dramatically opened gap after a single cut.
- Teal areas are broad angular patches and exterior growth is sparse relative to the richer locked target. These are retained simplifications, not newly accepted art perfection.

No model modification, bark patch, extra root, camera change or blended V2/V4 export is requested in this selection.

## Exact selected source and existing runtime bytes

Selected source directory: `art/source/rootfall-v1/candidate-v4/`.

Read-only SHA256 checks show **all six selected V4 GLBs already exactly match the current runtime files** at `assets/models/<component>-v1/model.glb`. Retaining V4 therefore requires no asset-copy or candidate switch based on this inspection.

| Component | V4 source GLB SHA256 = current runtime GLB SHA256 |
|---|---|
| rootfall-left | `afb5651a96e28e6f1f2678d06d48d7877d02673054826dfec36b5ccc441851f3` |
| rootfall-right | `d4d6454add68a5df0f6a0acf9bf274083ff1572d8c5ef4a6768d14631197fc60` |
| rootfall-center | `74a7128a2ff1e92f0ec399b5f09ed71d86444292ba21f94544a83fdfcf62f5a2` |
| rootfall-brace-left | `31389515d4b166a3bfe34d4a2f7efe2306d442357f1f3de30cd42de44b55eac5` |
| rootfall-brace-right | `456d18a9b7ffda7995c50043dde6a13c4156e2d89c9ba652c8cffaac26b3ae53` |
| rootfall-seam | `cf40b63c6249e65455faee039a77ae13c3138bc003e8d1f43189c6deef533ce8` |

Frozen V4 manifest SHA256: `69653269481b54b312f2dc6bceba4af81656d4db31e04e8720099d452c1cd093`.
Frozen V4 builder (`build-rootfall.py`) SHA256: `52d7716ef3ba6b9018abda69b0f4d48dc55ae7fe4782ce99663d9e7a59e8b55e`.

Editable source Blender hashes, retained for provenance only; no Blender execution occurred:

- left: `7564b4aedd5f362db6f2ce5c3f82d6627ce473e875f00a93cedc31b3c23361a9`
- right: `d4b7a1b9298b1d92510bd32f015fb8cda309bf9a9325762711f7768bd748e45a`
- center: `ef3fb4f2768a018f59b33223c36846bcbf330e2d94f7f63663138a6e9857509b`
- brace-left: `406abfa7cfd0367071649e4ee53a818ee473f789647ab80ef551f3577d808544`
- brace-right: `e01c2a3d83e7295588d264fe1592a5cf8398248f299a1c72ce03486eadafc8ab`
- seam: `3cfa218a10dd3bc9d952c1ffaa5f6bc80c73d2632e89e2f94dca78d66f80cd79`

V4 manifest economy: 199,624 bytes, 2,600 unique triangles and 8 unique draws across six exports. These are asset totals, not native frame-time measurements.

## Integration contracts and differences root must preserve

Read-only inspection confirms `tools/compose-rootfall-passage.mjs` already reads the **V4 manifest**. Current world body/brace collider vertex coordinates, indices and offsets match V4 numerically; there is no selected-version collider replacement indicated. A direct serialized-string comparison differed for some numeric representations, so this conclusion uses numeric array/offset checks rather than string equality.

The current five body/brace prop origins are (0,1.35,-31), yaw0, scale1. Both cuts are at X±1.65, Y1.35, Z-30, with physical collision disabled on the cut props. The composer rebases the common Y from the actual surface at (0,-31). Do not retain a stale fixed Y if the surrounding terrain changes. Verify body and brace-foot support at the actual current ridge whenever that support is changed.

V2 is **not** interchangeable with V4 by changing only GLBs: the left/right/center collider data differ, with center hull increasing from 16 to 17 points; brace hulls, cut planes, reserved lane and brace-contact metadata are unchanged. The seam mesh names also differ: V2 uses `RootfallBark_chunk_0/1/2`, V4 uses `RootfallTornBark_chunk_0/1/2`. Current resource chunk detection uses the generic `_chunk_\d+` suffix, supporting V4 without a hardcoded old prefix. Targeting box remains 0.74×1.35×0.25m, offset Y0.675, with seam local positions (±1.65,0,1), yaw0, scale1.

Keep the existing ownership chain intact: `rootfall_cut_west/east` persist completed cuts; gate `gate_section_1_to_2` owns repair/travel; brace cost remains four wood and two fiber. Presentation derives middle visibility/collision from unrepaired state and both brace pairs from repaired state. Retained left/right pieces stay the same objects. Preserve the 3m reserved X±1.5 lane, fixed X±1.65 cut planes, reciprocal landing and save/reload behavior. No new invisible blocker, state flag, reward or replacement event is proposed.

## Evidence inspected and limits

- Locked CLOSED target `art/targets/rootfall-closed-v3/target.png`, SHA256 `3a89cdcd50110dfe973f7db3db13933f89def30c6570b1a9ac47c756d07caa58`.
- V1 final model review and actual `model-v1/final/game-scale-closed.png`.
- V2 model/native reviews, actual `model-v2/frames/game-scale-closed.png` and `brace-contact.png`.
- V3 manifest and actual `model-v3/game-scale-closed.png`, `notch-detail.png`, `front-open.png`.
- V4 review/manifest and actual `model-v4/game-scale-closed.png`, `notch-detail.png`.
- All five V2 native states in `.dream-loop/overnight2-rootfall/`: CLOSED, first cut, brace ready, OPEN, return exit.
- All five V4 native states under `native-v4/`, plus its native receipt. That receipt reports a passing isolated diagnostic with supported start/material grant, normal cutting/collision approach, Brace/Travel, reciprocal return and Continue reload, with no errors. It is historical prepared-route evidence, not a new earned journey or fresh validation of subsequently changed terrain.

No browser, Blender, aggregate tests or production changes were performed here. This review does not replace root's current cut/brace/save/travel proof or establish touch/physical-phone acceptance. Root can retain V4 under the delegated best-existing selection while honestly carrying its known visual HOLD forward.


Root disposition: retain V4 under Chris's explicit bedtime delegation. All six source/runtime exports and current colliders already match, so this decision changes no runtime bytes. Historical scores and known gaps remain as above. No owner question is pending for this bounded selection.
