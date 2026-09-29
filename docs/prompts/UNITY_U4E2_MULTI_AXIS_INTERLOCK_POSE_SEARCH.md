# WILDKIN FRONTIER
# UNITY U4E.2 — LOCAL MULTI-AXIS INTERLOCK POSE SEARCH

Use a fresh **GPT-6 Luna Codex session with MAXIMUM available reasoning**.

This is a bounded diagnostic experiment following:

- U4E visual HOLD;
- U4E.1 single-axis contact-method HOLD.

Do NOT start U5.

Do NOT rebuild the full 20-seed formation gallery.

Do NOT redesign the source rocks.

---

# 0. EXPECTED STARTING POINT

Expected current `origin/main`:

`85aa8128908e4485fb5b4d1c9a0503388e51cddb`

Before modifying anything:

```bash
git checkout main
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

If `origin/main` differs, inspect the intervening work first.

Preserve all unrelated dirty/untracked work according to `AGENTS.md`.

Do not reset, clean, stash, absorb, or stage unrelated files.

---

# 1. CURRENT VERIFIED STATE

U4E proved the underlying multi-domain architecture technically viable:

- independent 0.25 m and 0.125 m child MatterDomains;
- deterministic IDs;
- true-SDF runtime matter;
- Surface Nets reconstruction;
- zero sampled double ownership in the U4E gallery;
- geometry-derived contact graph;
- bounded child editing/remeshing;
- incident-only contact invalidation;
- recipe-only pristine regeneration.

U4E remained HOLD because formations visually contained floating/separated stones.

U4E.1 added an area-weighted directional support-patch metric.

That metric demonstrated that global minimum distance was weak evidence.

Example:

seed 7000 foundation/control:

- global minimum gap ≈ 23.8 mm;
- directional median gap ≈ 276.8 mm;
- contact-patch area ratio ≈ 0.096%;
- effectively point-like support.

However:

```text
A GLOBAL_MIN_25MM: 6/6 complete controls
B DIRECTIONAL_PATCH_0MM: 0/6 complete
C DIRECTIONAL_PATCH_MINUS5MM: 0/6 complete
```

B's first failure was positive sampled overlap in 5/6 seeds and missing directional support witnesses in 1/6.

C's first failure was positive sampled overlap in 5/6 seeds and excessive penetration in 1/6.

Conclusion:

**single-axis movement is insufficient under the frozen layouts.**

---

# 2. PRIMARY QUESTION

Can a frozen U4E child stone obtain a visually convincing broad support/interlock patch while preserving all matter-ownership constraints if it may change its **local pose**, rather than moving only along one prescribed line?

Specifically test:

```text
existing relative pose
        ↓
normal translation
+ two tangential translations
        ↓
optional small bounded rotation
        ↓
broad directional patch
without sampled overlap
```

This phase tests local pose freedom only.

It does NOT redesign formation recipes.

---

# 3. IMPORTANT INTERPRETATION

Do not treat this phase as:

"find any random collision-free position."

A successful candidate must remain recognizably in the same semantic relationship.

Examples:

- shoulder remains a shoulder;
- buttress remains beside the foundation;
- ridge remains stacked beside/on the foundation;
- leaning mass remains the dominant leaning mass.

Allowed pose adjustments must therefore remain local and bounded.

---

# 4. FREEZE SOURCE / MATTER

For every experimental fixture preserve exactly:

- formation seed;
- accepted attempt index;
- semantic slot;
- parent slot;
- source archetype;
- source seed;
- `SculptedStoneRecipe`;
- source recipe hash;
- source geometry hash;
- MatterDomain spacing;
- MatterDomain density/material arrays;
- MatterDomain content hash;
- Surface Nets mesh hash.

Pose may change.

Matter may not.

No remeshing should be necessary from a pose-only candidate.

Verify this explicitly.

---

# 5. PROBLEM FIXTURES

Use these core fixtures.

## Core 1 — Low Stacked Shelf

Seed:

`7000`

Moving:

`shoulder-right`

Parent:

`foundation`

U4E.1 B/C failure class:

sampled parent overlap.

---

## Core 2 — Buttressed Outcrop

Seed:

`7010`

Moving:

`buttress-left`

Parent:

`foundation`

U4E.1 B/C failure class:

sampled parent overlap.

---

## Core 3 — Broken Stepped Ridge

Seed:

`7015`

Moving:

`ridge-left`

Parent:

`foundation`

U4E.1 failure classes:

- sampled overlap;
- excessive penetration.

---

## Core 4 — Leaning Cluster

Seed:

`7017`

Moving:

`leaning-mass`

Parent:

`foundation`

U4E.1 B/C failure class:

sampled parent overlap.

---

## Stress fixture — optional/accent relationship

Seed:

`7004`

Moving:

`accent`

Parent:

`shoulder-left`

U4E.1 B failure:

no support-facing centroid entered the directional band.

This fifth case is diagnostic.

Failure of this optional/accent case alone does not invalidate a method that solves all four core structural relationships.

---

# 6. REGENERATE THE FULL FROZEN CONTEXT

For each fixture regenerate the corresponding accepted U4E recipe/attempt.

Keep all other children at their A/control poses.

The moving child is the only pose being searched.

This is important.

A candidate moving-child pose must be checked against:

- intended parent;
- terrain;
- every other frozen sibling.

Do not optimize the pair in total isolation and then discover later that it intersects another child.

---

# 7. FRESH MATCHED CONTROL

Create a fresh control mode:

```text
A = U4E_GLOBAL_MIN_25MM
```

Use current code.

Do not use old screenshots as exact pixel references.

Generate fresh A/D/E images during one evidence run using exactly the same:

- scene;
- resolution;
- camera;
- lighting;
- material;
- framing.

Use 1920 × 1080 captures unless an established Unity evidence command requires another explicit size.

Do not repeat U4E.1's 640×360 versus 1920×1080 comparison problem.

---

# 8. RETAIN THE U4E.1 CONTACT METRIC

Keep the committed directional patch measurement:

- area-weighted triangles;
- outward normals;
- normal alignment threshold = `0.35`;
- contact-band half-width = `25 mm`;
- support-facing area;
- accepted patch area;
- patch ratio;
- weighted P10/P50/P90 gap;
- witness spans;
- patch diagonal.

Do not redesign this metric unless an actual correctness bug is found.

---

# 9. CONTACT TARGET

For this experiment use one contact target only:

```text
0 mm
```

Do not repeat the 0 / −5 mm bakeoff.

We are isolating pose freedom now.

Retain:

```text
maximum directional surface penetration = 12.5 mm
sampled positive-solid overlap = zero in both directions
```

Do not relax these to make the experiment pass.

---

# 10. LOCAL CONTACT FRAME

For each moving-child relationship derive a deterministic orthonormal frame:

```text
N = normalized direction toward intended parent
U = deterministic perpendicular tangent
V = cross(N, U)
```

`N` is the existing semantic fit direction transformed to world space.

Search pose changes relative to the original A pose.

---

# 11. METHOD D — THREE-AXIS TRANSLATION

Add experimental mode:

```text
D = MULTI_AXIS_TRANSLATION
```

Rotation remains exactly the frozen U4E rotation.

Allow:

```text
translation along N
translation along U
translation along V
```

Tangential search bounds:

```text
U: ±0.50 m
V: ±0.50 m
```

Do not enlarge those bounds during the experiment.

The normal direction may retain the existing U4E maximum fitting range, but candidate displacement from the original semantic placement must remain recorded.

---

# 12. METHOD D SEARCH

Use a bounded deterministic coarse-to-fine search.

A reasonable implementation:

## Coarse tangential lattice

```text
U and V:
-0.50
-0.375
-0.25
-0.125
 0
+0.125
+0.25
+0.375
+0.50 m
```

For each U/V candidate:

- preserve rotation;
- solve/refine displacement along N toward the 0 mm directional target;
- evaluate directional patch;
- perform inexpensive preliminary rejection.

Do not run expensive full overlap scans for obviously weak patch candidates if avoidable.

---

# 13. METHOD D REFINEMENT

Keep a bounded number of the strongest coarse candidates.

Suggested maximum:

`8`

Refine around each using approximately:

```text
±0.125 m tangential neighborhood
25 mm translation increments
```

The exact implementation may differ if an equivalent deterministic bounded method is cleaner.

Record candidate/evaluation count.

No random or unbounded optimizer.

---

# 14. METHOD E — TRANSLATION + BOUNDED ROTATION

Add:

```text
E = MULTI_AXIS_INTERLOCK_POSE
```

Use Method D as the starting search.

Also allow small orientation adjustment.

Construct rotations around the local contact frame:

- `U` axis tilt;
- `V` axis tilt;
- `N` axis twist.

Bound:

```text
U tilt: ±20°
V tilt: ±20°
N twist: ±15°
```

Do not exceed these bounds.

This phase is testing nearby interlocking poses, not reorienting the stone arbitrarily.

---

# 15. METHOD E ORIENTATION SEARCH

Use a bounded deterministic orientation lattice.

Coarse orientation candidates may use:

```text
U tilt:
-20, -10, 0, +10, +20°

V tilt:
-20, -10, 0, +10, +20°

N twist:
-15, 0, +15°
```

This is at most 75 coarse orientations before pruning.

Do not multiply the full high-resolution translation lattice by every orientation and then blindly run expensive overlap scans.

Use staged scoring.

For each orientation:

1. evaluate a small tangential neighborhood or the strongest Method-D translations;
2. solve along N;
3. calculate directional patch;
4. retain only strongest bounded candidates;
5. perform full matter-overlap validation on the finalists.

You may implement an equivalent deterministic coarse-to-fine search if it is clearer and cheaper.

Document exact evaluation counts.

---

# 16. ORIENTATION MUST NOT ALTER MATTER IDENTITY

Rotating a child is pose-only.

Verify for every selected D/E candidate:

```text
content hash unchanged
mesh hash unchanged
mesh revision unchanged
source geometry hash unchanged
source recipe hash unchanged
```

No re-SDF bake.

No remesh.

---

# 17. VALIDITY AGAINST INTENDED PARENT

A final candidate must have:

- support-facing triangles;
- nonempty directional contact patch;
- no surface penetration beyond 12.5 mm;
- zero positive-solid sample-center overlap A→B;
- zero positive-solid sample-center overlap B→A.

Do not accept a candidate only because its patch score is high.

---

# 18. VALIDITY AGAINST FORMATION CONTEXT

Also check the moving child against:

- terrain;
- every frozen sibling other than its intended parent.

Require zero sampled positive-solid overlap for every pair.

Record any newly introduced geometry-derived contacts.

A new near contact with another sibling is not automatically invalid if:

- sampled overlap remains zero;
- it visually makes sense;
- it does not destroy the intended semantic placement.

But record it.

Do not change the parent graph in this experiment.

---

# 19. SEARCH SCORE

Only compare candidates that satisfy hard geometric constraints.

Among valid candidates rank approximately by:

1. greater accepted contact-patch area;
2. greater contact-patch area ratio;
3. greater meaningful witness spread / diagonal;
4. directional median gap closer to 0;
5. smaller tangential displacement;
6. smaller angular change.

Use deterministic tie-breaking.

Do not optimize global-min distance as the primary score.

---

# 20. DO NOT INVENT A SEED-SPECIFIC PATCH THRESHOLD

Do not tune a minimum patch percentage separately for these five fixtures.

The evidence should report quantitative improvement relative to fresh A.

For this bounded experiment, final perceptual adequacy is an independent visual-review question.

Automated validity must still require:

- real patch;
- finite spread;
- zero overlap;
- penetration bound.

---

# 21. FOCUSED REGRESSION FIXTURES

Retain U4E.1's point-contact and broad-support tests.

Add a local-pose-search fixture showing:

### Translation-resolvable contact

One fixed rotation where:

- direct N movement creates collision;
- a small U/V slide creates broad zero-overlap support.

Method D should solve it.

### Rotation-resolvable contact

A fixture where translation alone cannot produce broad support without overlap, but a small bounded rotation can.

Method E should solve it.

These fixtures establish that D and E are genuinely different search capabilities.

---

# 22. REQUIRED RESULTS PER CORE FIXTURE

For each core fixture report:

### A

- original pose;
- patch area;
- patch ratio;
- median gap;
- patch diagonal;
- overlap counts.

### D

- accepted/rejected;
- N/U/V displacement;
- patch metrics;
- all overlap checks.

### E

- accepted/rejected;
- N/U/V displacement;
- U/V tilt;
- N twist;
- patch metrics;
- all overlap checks.

---

# 23. MATCHED VISUAL EVIDENCE

For each of the four core fixtures produce a board:

```text
A | D | E
```

Show at least:

### Pair-focused angle

Parent + moving child clearly visible.

### Formation-context angle

All frozen siblings visible so the new pose can be judged in context.

Use identical camera/framing per comparison row.

Do not hide failures by changing the camera.

---

# 24. STRESS-FIXTURE EVIDENCE

For seed 7004's accent produce the same metrics.

A full polished comparison board is optional if all methods fail.

If D/E solve it, include it.

---

# 25. CONTACT DEBUG EVIDENCE

For at least:

- seed 7000;
- seed 7015;
- seed 7017;

show the selected D/E contact patch:

- support-facing probes;
- accepted patch probes;
- N/U/V axes;
- original A pose ghost/wireframe if practical;
- selected pose.

The goal is to make the searched displacement understandable.

---

# 26. PASS INTERPRETATION

There are three possible useful findings.

## Finding 1 — Translation is sufficient

If D solves all four core fixtures and independent review sees convincing seating:

```text
U4E2_TRANSLATION_INTERLOCK_PASS
```

E remains diagnostic.

The next phase would integrate the translation search into a small complete-formation bakeoff.

---

## Finding 2 — Rotation is materially required

If D does not solve all four, but E solves all four and independent review sees convincing seating:

```text
U4E2_ROTATIONAL_INTERLOCK_PASS
```

This establishes bounded orientation freedom as part of the required formation composition model.

---

## Finding 3 — Local pose freedom is still insufficient

If E cannot solve all four core relationships:

```text
U4E2_LOCAL_POSE_SEARCH_HOLD
```

Stop.

Do not increase search bounds.

Do not loosen overlap constraints.

The likely next question would be:

- source-face-aware mating;
- different semantic parent/layout generation;
- or authored formation templates.

That requires separate owner review.

---

# 27. VISUAL PASS REQUIREMENT

A numerical pose-search success is not enough.

Independent review should specifically assess:

- does the stone visibly sit against/interlock with its parent?
- is the previous light gap gone?
- does it look embedded/clipped?
- does the adjusted stone still serve its semantic role?
- does the full context look more authored rather than randomly moved?
- does the improvement survive a second angle?

Do not let patch score substitute for visual judgment.

---

# 28. NO FULL FORMATION GENERATOR CHANGE

Do not replace U4E's default fitter with D or E yet.

This phase should be opt-in experimental code.

Do not modify the 20-seed generator behavior globally.

Do not update pristine-generation schema.

Do not rewrite U4E's historical hashes/evidence.

---

# 29. PARITY POLICY

U4E.1 established that old pose/contact-sensitive graph and formation hashes do not replay exactly under its evidence path, while source/domain hashes do.

Do not spend U4E.2 repairing historical screenshot/hash parity.

For frozen-fixture admission verify:

- recipe identity;
- source recipe hash;
- source geometry hash;
- content hash;
- mesh hash;
- spacing.

Generate fresh A/D/E controls in the same U4E.2 run.

Report any graph/formation-hash discrepancy, but do not make old pose-sensitive hash equality a prerequisite for this experiment.

---

# 30. TESTS

Add focused tests for:

- deterministic N/U/V frame;
- bounded tangential candidate enumeration;
- translation-only fixture solved by D;
- rotation-required fixture rejected by D and solved by E;
- pose-only search leaves matter/mesh hashes unchanged;
- overlap with a non-parent sibling rejects a candidate;
- overlap with terrain rejects a candidate;
- repeat search returns identical selected pose and metrics.

Run:

```text
focused U4E.2 EditMode
full EditMode
full relevant PlayMode
```

Current baseline:

```text
EditMode 160/160
PlayMode 3/3
```

All existing tests must remain green.

---

# 31. PLAYER BUILD

Do NOT build a Windows Player merely for this pair-level diagnostic.

A Player build is not required for U4E.2.

If this experiment passes, the subsequent complete-formation integration phase should restore the standalone Player gate.

---

# 32. PERFORMANCE / BOUNDEDNESS

Record for each fixture/method:

- candidate orientations considered;
- candidate translations considered;
- directional-patch evaluations;
- full overlap evaluations;
- selected pose;
- total search wall time.

These are qualification timings only.

The search need not yet be production-fast.

However, it must remain explicitly bounded and deterministic.

Do not introduce an unconstrained optimizer.

---

# 33. INDEPENDENT REVIEW

Use a fresh read-only reviewer.

Provide:

- this exact prompt;
- A/D/E boards;
- alternate/context angles;
- patch-debug images;
- metrics;
- tests;
- actual implementation.

The reviewer must not have implemented the search.

It should independently determine whether:

- D fixes the visual problem;
- E fixes the visual problem;
- rotations are necessary;
- poses remain semantically believable;
- any clipping/embedding is visible.

Do not rewrite a negative review into PASS.

---

# 34. EVIDENCE DIRECTORY

Use:

```text
native/evidence/unity/u4e2-interlock-pose-search/
```

Recommended:

```text
README.md
receipt.json
review.md

metrics/
  seed-7000.json
  seed-7004.json
  seed-7010.json
  seed-7015.json
  seed-7017.json
  summary.json

captures/
  seed-7000-pair.png
  seed-7000-context.png
  seed-7010-pair.png
  seed-7010-context.png
  seed-7015-pair.png
  seed-7015-context.png
  seed-7017-pair.png
  seed-7017-context.png
  debug-7000.png
  debug-7015.png
  debug-7017.png

tests/
  focused.json
  editmode.json
  playmode.json
```

Preserve U4E and U4E.1 evidence untouched.

---

# 35. DOCUMENTATION

Update current-state documentation only after final disposition.

Likely:

- `docs/CURRENT_SLICE.md`
- `docs/SESSION_START.md`
- `docs/CODE_MAP.md`
- `docs/BUILD_LOG.md`
- `docs/UNITY_U4E_FORMATION_PLAN.md`

Save this implementation brief under an appropriate prompt path such as:

```text
docs/prompts/UNITY_U4E2_MULTI_AXIS_INTERLOCK_POSE_SEARCH.md
```

Do not document U5 as started.

---

# 36. GIT CLOSURE

Before staging:

```bash
git status --short
```

Compare against initial local status.

Stage only intended U4E.2 code/evidence/docs.

Review:

```bash
git diff --cached --stat
git diff --cached
```

Commit the complete checkpoint directly to `main`.

Suggested message:

```text
Implement Unity U4E.2 interlock pose search [skip ci]
```

Push:

```bash
git push origin main
```

Verify:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

Then STOP.

---

# 37. FINAL LUNA RESPONSE

Report:

```text
U4E.2 RESULT:
U4E2_TRANSLATION_INTERLOCK_PASS
or
U4E2_ROTATIONAL_INTERLOCK_PASS
or
U4E2_LOCAL_POSE_SEARCH_HOLD

STARTING COMMIT:
<sha>

COMMIT:
<sha>

CORE FIXTURES:
7000 shoulder-right → foundation
7010 buttress-left → foundation
7015 ridge-left → foundation
7017 leaning-mass → foundation

STRESS FIXTURE:
7004 accent → shoulder-left

METHOD A:
control results

METHOD D:
multi-axis translation results
core solved X/4

METHOD E:
translation + bounded rotation results
core solved X/4

SELECTED POSES:
N/U/V offsets
U/V tilt
N twist

PATCH METRICS:
A vs D vs E

SAMPLED OVERLAP:
all parent/sibling/terrain checks

SOURCE / MATTER INVARIANCE:
result

VISUAL REVIEW:
pair views
context views
alternate-angle findings

SEARCH COST:
candidate counts
full overlap checks
wall times

TESTS:
focused
full EditMode
PlayMode

EVIDENCE:
native/evidence/unity/u4e2-interlock-pose-search/

KNOWN LIMITATIONS:
...

NEXT RECOMMENDATION:
small complete-formation integration bakeoff
OR
source-face/layout experiment

STOP FOR OWNER / CHATGPT REVIEW.

DO NOT START U5.
```
