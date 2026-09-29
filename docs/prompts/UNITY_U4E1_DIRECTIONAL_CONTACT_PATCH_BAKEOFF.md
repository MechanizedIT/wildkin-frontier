# WILDKIN FRONTIER
# UNITY U4E.1 — DIRECTIONAL CONTACT-PATCH BAKEOFF

Use a fresh **GPT-6 Luna Codex session with MAXIMUM available reasoning**.

This is a bounded diagnosis/method experiment following the U4E visual HOLD.

Do NOT start U5.

Do NOT regenerate or redesign the entire rock system.

---

## 0. STARTING CHECKPOINT

Expected `origin/main`:

`09bd7e7a716c7fa2a074599b6f1a5be54bbc2058`

U4E disposition:

`HOLD_AFTER_INDEPENDENT_VISUAL_REVIEW`

Before implementation:

```bash
git checkout main
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Inspect intervening commits if `origin/main` has changed.

Preserve unrelated local work exactly as required by `AGENTS.md`.

---

# 1. WHY U4E HELD

U4E's technical architecture passed:

- 20 deterministic formations;
- independent 0.25 / 0.125 m MatterDomains;
- stable child IDs;
- true-SDF matter;
- geometry-derived contact measurements;
- zero sampled double ownership across the recorded gallery;
- contact graph connected to terrain;
- one-child bounded edit/remesh;
- incident-only contact invalidation;
- deterministic recipe-only pristine regeneration;
- EditMode / PlayMode / Windows Player gates.

Independent visual review nevertheless found:

- upper/cap stones reading as floating;
- flank stones reading as separated;
- insufficient believable interlocking.

This phase asks whether that visual failure is primarily caused by the current **contact metric/fitter**, rather than MatterDomain architecture or source-rock quality.

---

# 2. ROOT HYPOTHESIS

The existing fitter uses a symmetric global minimum surface distance.

`U4ESurfaceProbeSet` contains:

- all Surface Nets vertices;
- all triangle centroids.

`MeasureSurfacePair()` searches all of them.

The current contact decision can pass when:

```text
minimum gap <= 60 mm
AND
near-contact witnesses >= 2
AND
sampled solid overlap == 0
```

Current fitting targets:

`+25 mm`

Therefore a stone may pass because a corner or side feature is near its parent even if the visually important support-facing surface remains visibly separated.

The experiment should test:

> Does measuring and fitting the **directional support-facing contact patch** correlate better with believable visual contact?

---

# 3. DO NOT CHANGE THESE

Freeze:

- `MatterDomain`;
- MatterDomain storage;
- Surface Nets;
- U4C3 topology behavior;
- source-mesh → SDF conversion;
- existing sculpted-stone generator;
- U4E source recipe hashes;
- child IDs;
- sample spacings;
- formation archetypes;
- child counts;
- material;
- lighting;
- cameras/framing from final U4E evidence;
- persistence;
- edit behavior.

Do not modify stone shape generation during this experiment.

Do not solve the visual problem by changing camera angles.

---

# 4. FREEZE THE PROBLEM SET

Use these exact U4E formation seeds:

```text
7000
7004
7010
7015
7017
7019
```

These cover:

- representative seed;
- all four hero-review problem seeds;
- weakest accepted seed.

For each seed, use the **same accepted attempt index** recorded by U4E.

Verify before the experiment that regenerated baseline:

- child IDs;
- source geometry hashes;
- content hashes;
- source recipe hashes;
- spacings

match the committed U4E evidence.

If they do not, HOLD immediately.

---

# 5. PRESERVE THE CURRENT FITTER AS CONTROL A

Do not delete or rewrite the current U4E fitter yet.

Control A is:

`GLOBAL_MIN_25MM`

Meaning the current committed behavior:

- all surface probes;
- symmetric minimum SDF gap;
- target contact gap +25 mm;
- existing witness criteria.

Reproduce the frozen six seeds with this mode.

Their geometry and final baseline captures should match existing U4E evidence.

---

# 6. ADD DIRECTIONAL SURFACE-PATCH INFORMATION

Extend or add an experimental probe representation.

For each Surface Nets triangle calculate:

- centroid;
- normalized outward surface normal;
- triangle area.

Do not rely only on vertices for the new patch metric.

Names are flexible, for example:

```text
U4EDirectionalSurfaceProbe
U4EDirectionalProbeSet
U4EContactPatchMeasurement
```

Keep this engine-light/testable.

---

# 7. DEFINE THE INTENDED CONTACT DIRECTION

The recipe already contains:

`fitDirectionLocal`

This direction points from the moving child toward its intended parent/support.

Transform it into world space exactly as the existing fitter does.

Call it conceptually:

`directionTowardAnchor`

For the moving child, a support-facing triangle should have its outward normal generally facing the anchor.

Use a fixed normal-alignment threshold.

Suggested initial threshold:

```text
dot(triangleNormal, directionTowardAnchor) >= 0.35
```

Do not tune the threshold separately per seed.

Record the final threshold.

---

# 8. DIRECTIONAL CONTACT-PATCH MEASUREMENT

For only the moving child's support-facing triangle centroids:

1. transform centroid into world space;
2. transform it into the anchor domain/grid;
3. sample the anchor SDF/trilinear density;
4. derive signed surface gap;
5. weight the witness by its triangle area.

Record:

- support-facing triangle count;
- total support-facing surface area;
- minimum directional gap;
- median directional gap;
- area-weighted gap quantiles if useful;
- area inside the near-contact band;
- `contactPatchAreaRatio`;
- world-space contact witness positions;
- contact-patch spatial extent.

The key new metric is:

```text
contactPatchAreaRatio =
area of support-facing triangles in the accepted contact band
/
total support-facing triangle area
```

Do not replace the existing sampled-overlap diagnostic.

---

# 9. PATCH SPREAD / DEGENERATE POINT-CONTACT CHECK

A broad numerical count can still describe one tiny cluster.

Record the spatial extent of accepted directional witnesses.

Project contact witnesses onto two axes perpendicular to the fitting direction.

Record:

- span A;
- span B;
- contact patch diagonal.

Do not call a contact patch strong if every accepted witness lies at essentially one point/corner.

This phase is evidence-driven: record these values before choosing a production threshold.

---

# 10. EXPERIMENTAL FITTER B

Create an experimental mode:

`DIRECTIONAL_PATCH_0MM`

Do not replace Control A globally.

Start from the same proposed child poses and recipes.

Fit only along the existing `fitDirection`.

The fitting objective is no longer:

`make global minimum gap ≈ 25 mm`

Instead choose a deterministic translation along the fitting direction that maximizes a meaningful support-facing contact patch while preserving overlap constraints.

A practical bounded method is acceptable.

Recommended approach:

1. use current fitter or proposed position only as a starting bracket;
2. test a bounded deterministic 1-D set of candidate translations along the existing fit direction;
3. evaluate directional contact patch for each;
4. reject candidates with sampled positive-solid overlap;
5. reject candidates exceeding the existing maximum permitted surface penetration;
6. choose the candidate with the strongest contact-patch score;
7. deterministic tie-break:
   - greater patch area ratio;
   - greater patch extent;
   - smaller absolute surface gap;
   - smaller total adjustment.

Use coarse-to-fine search if useful.

No physics.

No lateral search yet.

No rotation optimization yet.

This intentionally tests whether **better directional seating alone** is enough.

---

# 11. EXPERIMENTAL FITTER C

Also evaluate:

`DIRECTIONAL_PATCH_MINUS_5MM`

Same method as B, but permit a target visual seating depth of approximately:

`-0.005 m`

This is a tiny surface-level seating allowance.

It must still satisfy:

- zero bidirectional positive-solid **sample-center** overlap;
- existing maximum surface penetration bound;
- no visible large interpenetration.

The purpose is to determine whether a tiny intentional zero-surface intersection eliminates visible light gaps without creating meaningful duplicate matter.

Do not exceed the existing `12.5 mm` surface-penetration ceiling.

Do not weaken sampled double-ownership checks.

---

# 12. WHY TEST 0 MM AND -5 MM

The current U4E fitter intentionally targets:

`+25 mm`

That may be contributing directly to the floating read.

Compare:

```text
A = existing global-min, +25 mm
B = directional patch, 0 mm
C = directional patch, -5 mm
```

Do not add more tuning variants unless one of these cannot be evaluated for a technical reason.

This is a bakeoff, not an open-ended parameter search.

---

# 13. KEEP THE SAME RECIPE / PARENT GRAPH

For this phase:

- same parent slot;
- same semantic relation;
- same initial proposed position;
- same yaw;
- same stone shape;
- same sample spacing.

Do not add secondary parent relationships yet.

We are isolating contact fitting first.

If directional patch fitting cannot solve the issue without lateral/rotational repositioning, record that honestly.

That result will tell us the next phase needs formation-layout/interlock optimization rather than another contact-threshold tweak.

---

# 14. TECHNICAL VALIDITY AFTER FITTING

For every candidate B/C formation require:

### Domain authority

No matter arrays are modified by fitting.

### Sample overlap

For every child/terrain and child/child pair:

```text
A→B positive sample count == 0
B→A positive sample count == 0
```

### Source invariance

Same as baseline A:

- source recipe hash;
- source geometry hash;
- content hash;
- mesh hash;
- sample spacing.

Only poses/contact measurements may differ.

### Graph

All children remain connected to terrain using geometry-derived accepted edges.

---

# 15. DO NOT LET GRAPH CONNECTIVITY HIDE WEAK CONTACT

For B/C, record both:

- ordinary graph connectivity;
- directional patch strength for the intended parent edge.

An edge is not visually qualified merely because graph traversal reaches terrain.

Report weak intended-parent patches explicitly.

---

# 16. MATCHED EVIDENCE BOARD

Produce a matched comparison for all six frozen seeds.

For each seed:

```text
A: GLOBAL_MIN_25MM
B: DIRECTIONAL_PATCH_0MM
C: DIRECTIONAL_PATCH_MINUS_5MM
```

Same:

- camera;
- framing;
- lighting;
- material;
- terrain;
- seed;
- source geometry.

Create at least:

- one primary angle board;
- one alternate-angle board.

Do not move the camera separately to flatter one method.

---

# 17. CONTACT DEBUG BOARD

For at least seeds:

```text
7000
7004
7017
```

show directional contact patch witnesses.

Use readable debug marks for:

- support-facing probes;
- accepted patch probes;
- rejected/non-contact support probes;
- intended fit direction.

The purpose is to visually confirm that the metric is measuring the actual supporting face rather than a random corner.

---

# 18. METRICS

For every intended parent contact in A/B/C record:

- seed;
- slot;
- parent slot;
- spacing pair;
- existing global minimum gap;
- directional minimum gap;
- directional median gap;
- support-facing triangle count;
- support-facing area;
- accepted patch area;
- patch area ratio;
- witness spans;
- fitting translation;
- sampled overlap both directions;
- maximum penetration;
- accepted/rejected.

Produce a compact comparison summary.

---

# 19. AUTOMATED TESTS

Add focused EditMode tests for:

### Direction filtering

A simple known mesh has expected support-facing triangles for:

- downward;
- sideways;
- diagonal directions.

### Area weighting

Patch area uses actual triangle area, not raw triangle count.

### Point-contact distinction

Create a deterministic fixture where:

- one corner is close;
- most support-facing surface is separated.

Existing global-min metric should see a small minimum gap.

Directional patch metric should report a weak/small patch.

This regression is important because it models the actual U4E failure.

### Broad support

Create a flat/broad support fixture.

Directional metric should report substantially stronger patch area/spread than the point-contact fixture.

### Fitting

Experimental fitter reaches its selected patch position deterministically.

### Authority invariance

Fitting changes pose only:

- content hash unchanged;
- mesh hash unchanged;
- mesh revision unchanged.

### Overlap

B/C do not introduce sampled positive-solid overlap.

Keep all existing U4E tests green.

---

# 20. FULL VALIDATION

Run:

- focused U4E.1 EditMode;
- full EditMode;
- full relevant PlayMode.

The pre-U4E.1 baseline is:

- EditMode 156/156;
- PlayMode 3/3.

All old tests must remain green.

Do not delete or weaken U4E overlap/contact tests merely because the experimental contact metric changes.

---

# 21. PLAYER PROOF

If B or C appears technically viable, use one representative seed in the Windows x64 Development Player.

Prefer seed:

`7000`

Show matched current-vs-selected-experimental views if practical.

Build/run using the existing Unity agent workflow.

Record:

- build success;
- error/warning count;
- process exit code;
- screenshot;
- chosen method.

Do not build U5 gameplay.

---

# 22. INDEPENDENT VISUAL REVIEW

An independent reviewer must compare A/B/C without relying on the implementation author's conclusion.

Primary questions:

1. Do caps now look seated rather than floating?
2. Do flank stones visibly meet/interlock with the foundation?
3. Does the selected method improve the same seeds that caused U4E HOLD?
4. Is improvement real from multiple angles?
5. Does -5 mm create visible clipping/interpenetration?
6. Does 0 mm already solve the problem?
7. Are formations still reading as a pile of separate pieces even after contact itself is fixed?

The reviewer should identify a preferred method only if visually supported.

---

# 23. DECISION RULE

Allowed dispositions:

```text
U4E1_DIRECTIONAL_CONTACT_PASS
U4E1_CONTACT_METHOD_HOLD
```

## PASS

Use PASS only if:

- directional metric clearly distinguishes broad support from point/corner proximity;
- B or C materially improves the known floating/separated seeds;
- improvement survives alternate angles;
- no sampled double ownership appears;
- no obvious clipping appears;
- source/domain architecture remains unchanged;
- independent review agrees.

A PASS does **not** complete U4E.

It means the next bounded phase may replace/extend formation fitting and regenerate the full 20-seed U4E gallery.

## HOLD

Use HOLD if:

- directional patch metrics do not correlate with the visual problem;
- fitting along the existing single direction cannot produce convincing seating;
- formations still read separated despite strong directional contact;
- lateral/rotational composition appears to be the real missing requirement.

If HOLD, stop.

The next planning question would then be a bounded **multi-axis/interlock composition** experiment, not U5.

---

# 24. EVIDENCE

Use a new folder:

```text
native/evidence/unity/u4e1-directional-contact/
```

Preserve the original U4E evidence unchanged.

Recommended:

```text
README.md
receipt.json
review.md

captures/
  comparison-primary.png
  comparison-alternate.png
  contact-debug-7000.png
  contact-debug-7004.png
  contact-debug-7017.png
  player.png

metrics/
  contacts.json
  seed-7000.json
  seed-7004.json
  seed-7010.json
  seed-7015.json
  seed-7017.json
  seed-7019.json

tests/
  focused.json
  editmode.json
  playmode.json

player/
  build-provenance.json
  receipt.json
```

---

# 25. DOCUMENTATION / GIT

Update only current-state docs appropriate to this bounded result.

Preserve original U4E HOLD history.

Do not rewrite U4E as PASS unless a later full-gallery closure phase earns that result.

Append `docs/BUILD_LOG.md`.

Store this exact implementation brief under a suitable prompt path.

Commit cohesive completed U4E.1 work directly to `main`.

Push `origin/main`.

Verify remote head.

Preserve unrelated local files unstaged.

Then STOP.

---

# 26. FINAL RESPONSE

Report:

```text
U4E.1 RESULT:
<disposition>

COMMIT:
<sha>

BASELINE A:
current +25 mm global-min result

METHOD B:
directional 0 mm result

METHOD C:
directional -5 mm result

KNOWN PROBLEM SEEDS:
7000
7004
7010
7015
7017
7019

CONTACT-PATCH METRIC:
implementation and thresholds

VISUAL REVIEW:
which method improved / did not improve
caps
flanks
alternate angles

SAMPLED OVERLAP:
A
B
C

SOURCE / MATTER INVARIANCE:
result

TESTS:
focused
full EditMode
PlayMode

WINDOWS PLAYER:
result

EVIDENCE:
path

NEXT RECOMMENDATION:
full U4E contact-fitter closure
OR
multi-axis/interlock composition experiment

STOP FOR OWNER / CHATGPT REVIEW.

DO NOT START U5.
```