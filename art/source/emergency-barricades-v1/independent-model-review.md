# Independent emergency barricade model review

Reviewer: `camp_slice_design`; September 11, 2026. Separate from reference author and model builder. Scope: exported candidate-v3 straight barricade and termination/corner post, approved Crash Camp target and Explorer style. This is a model review, not native Camp admission.

**Latest verdict: candidate-v5 PASS, 8.3/10 — model gate only.** Exact evidence and remaining limitations are recorded below. The earlier v3 HOLD is preserved as rejected history.

## Candidate v3 — HOLD, 7.6/10

The family captures the approved broad ivory armor, charcoal lower plate, blue-grey supported uprights and restrained cyan/orange accents. Its geometry is economical and its major forms remain legible beside the real Explorer in the supplied 844×390 neutral fixture. However, fresh-GLB renders show unexplained black surface artifacts on the post cap and straight-panel feet. These are prominent enough to block admission of the current bytes.

### Evidence actually inspected

- Full v3 `front.png`, `rear.png`, `side.png`, `three-quarter.png`, `corner-post.png` and `game-scale-neutral.png`.
- Full approved `art/targets/crash-camp-v1/target.png` and `art/style/explorer-master.png`, inspected earlier in this same review task chain.
- Candidate-v3 `manifest.json`, `geometry-facts.json` and named geometry construction in `build-emergency-barricades.py`.
- SHA256 independently verified: straight `6b4eb0fc93620361fcffc04750550b1d7f95dcd88468b8458021f409c191be1e`; post `7fad00245a31e0b5e85caf722c57eb1292d572e90bf59c19da8b991df9cfa449`.

The manifest identifies all images as fresh-GLB reimports. The reviewer inspected those images; no renderer or native browser was run by the reviewer. The neutral Explorer fixture establishes relative visual scale only, not actual game integration or phone performance.

### Required correction

1. **Post cap:** `corner-post.png` shows a deep black rectangular patch where the top marker should be. It reads as an unexplained hole and does not match the solid blue-grey target caps. The builder puts the orange marker at Y=1.69 with height .02; its top is Y=1.70, exactly coincident with the cap top. This is a strong source-based explanation for overlapping coplanar surfaces, not proof of the renderer's internal cause. Remove the marker or seat it visibly above the cap with no coincident exposed faces. Reinspect the actual new GLB from above/three-quarter.
2. **Straight feet/caps:** front and three-quarter images show black rectangular marks across the two toe fronts; black slits also appear immediately below the upright caps. The shoe front and brace front both reach Z=.62; the straight cap and upright both use depth .36 across their overlap. Remove exposed coplanar interfaces, by making the outer skin unambiguous or giving joined pieces a deliberate offset. Do not hide the defect through lighting changes. Reinspect front, side and three-quarter fresh-GLB views.

### Secondary target-fit observations

- The neutral tiled row has pairs of adjacent uprights at every 2.8m module seam. The reference generally uses one supported post per join. The resulting double-post rhythm is heavier, although still structurally understandable. Prefer a deliberate shared-post assembly or an equally explicit joining detail before final Camp composition review. Merely overlapping identical complete modules risks new coincident faces.
- The central orange service tab appears on every straight panel, whereas the reference uses its strongest orange plate at the special southern divider. A repeated tab can be a manufactured latch, but should not become a false interaction cue. Reserve special interaction presentation for the actual opening/task control.
- Rear view remains a solid, readable panel with attached kickplate and status inserts. There are no unsupported large pieces or thin floating decorative rails. The braces visibly connect high on the posts and plant on the ground.
- The one-sided buttresses should face outboard consistently. Do not alternate them accidentally through world yaw or corner assembly.
- The warm ivory is slightly yellower than the reference. This is a minor lighting/palette difference, not a reason for another art direction.

### Collision and metadata recommendations

- Use the measured straight bound **[-1.4,0,-.1975] to [1.4,1.7,.62]**. The manifest currently says minimum Z=-.184 and its wall box depth .368; that omits the rear orange tab's .0135m extension. Correct the bound metadata. Whether the small nonstructural tab belongs in collision is a deliberate descriptor choice, not a new overall dimension.
- The buttress is a real sloped obstacle reaching approximately .97m high and .62m outboard. A low shoe collider alone permits clipping through the visible upper brace. Prefer the supplied deliberate convex wedge per side, plus panel/uprights and feet, if supported by the existing descriptor/runtime path. Never fill the entire .62m outboard footprint with a full-height wall box.
- The separate post's .52m square overall bound is set by its low foot; its shaft is .36m square and cap .48m. A single full-height .52m box is conservative rather than exact. Prefer separate foot/shaft/cap boxes where the supported runtime contract permits. Validate ordinary player passage near ends and corners using the actual collider construction.
- Verify yaw, base support, corner/end closure, segment seams and current/future wall reservations in native Camp. These renders cannot establish them.

Structural facts supplied by checker: straight 968 triangles, 2,076 vertices, one material/primitive, 73,968 bytes; post 440 triangles, 928 vertices, one material/primitive, 34,068 bytes. Both use one tiny palette texture, roughness 1 and metallic 0. Those are appropriate bounded asset costs, but do not waive the visible defects or prove aggregate rendering performance.

## Next review

Retain v3 unchanged. Submit new exact GLB hashes and fresh post-top/three-quarter plus straight front/side/three-quarter images after contact cleanup. Reuse the approved target. No further target generation is needed. A later model PASS still requires independent native initial/expanded Camp review and collision/save verification before runtime admission.

Only this review record was written. No production files, source models, renders or tests were changed/run by this reviewer.

## Candidate v5 re-review — PASS, 8.3/10

September 11, 2026, after the builder supplied a new frozen export. This verdict supersedes v3 for model selection without changing v3's HOLD. It covers the straight barricade and separate post as static model candidates. It does not admit a native Camp perimeter or certify physics, saved expansion, Author parity or performance.

### Exact reviewed bytes and views

- Straight GLB SHA256 independently verified: `2cc773a2def685f876aeb0da4eb100e7b060099bdd9834df5c6d78257e6197a6`.
- Post GLB SHA256 independently verified: `c8f84e55996754e676cffede0a83b527e2a9057133506715ae6f3a9956a24aaa`.
- Source directory: `art/source/emergency-barricades-v1/candidate-v5`.
- Visually inspected all six full images in `.dream-loop/overnight2-barricades/v5`: front, rear, side, three-quarter, corner-post and game-scale-neutral. The final neutral view is 844×390 with three adjacent modules and the actual shipped Explorer model; it remains a separate render fixture, not native traversal.
- Read corrected final manifest after all six images completed. Supplied checker facts: straight 880 triangles, one material/primitive, 67,296 bytes; post 396 triangles, one material/primitive, 30,732 bytes. Tiny embedded palette material and the unchanged roughness/metallic treatment remain appropriate.

### Visible closure

The post cap is now a continuous blue-grey top with coherent beveled edges; the unexplained black rectangle is absent. The straight model's two toes have solid dark shoes with readable top contacts, and the previous black toe rectangles and under-cap slits are absent in front/quarter/side views. Back-facing panels remain complete and attached. The cleanup preserved the broad faceted family rather than concealing artifacts through a different lighting setup.

The upright caps project sufficiently to read as fitted covers. The triangular braces connect visibly to posts and end in planted feet. At the supplied mobile-size scale, ivory plates, dark lower armor, cyan indicators and orange latch remain identifiable without dense texture noise. No floating components, mismatched left/right support heights, garbled markings, reflective chrome or obvious exposed surface artifacts remain in the inspected views.

| Criterion | Score | Current assessment |
|---|---:|---|
| Approved reference/style fit | 2.5/3 | Strong ivory/blue-grey/charcoal family with substantial braces; mild uniform prefabricated appearance and paired seam posts differ from the target's looser salvage composition. |
| Materials and mobile form readability | 2.7/3 | Restrained matte palette, strong silhouettes and readable panel hierarchy in isolated and tiled views. |
| Structural connectivity and repeated parts | 2.4/3 | Closed, attached, grounded components; repeated modules are consistent. Paired upright rhythm is heavier than the single-post target, but is legible and does not alone block the model. |
| Detail/artifact cleanliness | 0.7/1 | Identified coplanar-looking black defects visibly resolved; simple repeatable fittings. |
| **Total** | **8.3/10** | **PASS model gate.** |

### Integration limits retained

1. Use the new measured straight bound **[-1.4,0,-.20] to [1.4,1.7,.64]**. The new shoe is .30×.12×.54 at local (±1.22,.06,.37). The post remains ±.26 X/Z, height 1.7. Do not use the v3 descriptor metadata.
2. The manifest calls the brace wedge optional. From a perceptual collision standpoint the visible .97m-high wedge needs deliberate collision coverage if players can approach it. A low shoe alone or a full-height .64m-deep wall box gives visibly incorrect contact. Validate the actual supported hull/compound implementation and outward yaw.
3. The paired tiled uprights are accepted as a modest target-fit compromise for this model gate. Do not overlap identical exports to simulate a shared post without resolving surfaces. Check real corners and termination posts independently; only a straight tiled row was supplied.
4. Repeated orange latch details are not themselves buttons. The expansion interaction needs a distinct, reachable world cue. Native camera/occlusion behavior may require presentation adjustments while preserving this model family.
5. No further neutral re-render or target regeneration is required solely for this verdict. Proceed to a small native Camp instance/perimeter review, then test initial/expanded views, ordinary access and the actual collision/save/Author lifecycle.

Reviewer remained read-only except this record; no heavy jobs, browser, tests, generated world or model edits were performed.
