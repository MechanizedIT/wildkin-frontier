# WILDKIN FRONTIER
# UNITY U4F-R — STYLIZED ROCK REFERENCE GATE

Continue in **this current root task**.

Do **not** create, hand off to, or message another durable Codex/ChatGPT task.
Do **not** start a second root session.
Internal bounded subagents are allowed for image review only; this task remains the sole root session.

This is a **reference/style checkpoint only**.

Do NOT run TRELLIS.
Do NOT inspect/start/stop the TRELLIS service.
Do NOT free RAM for TRELLIS.
Do NOT modify Unity code.
Do NOT enter Play Mode.
Do NOT start U4F source generation, cleanup, voxelization, U4G, or U5.

The task ends after a new Wildkin-style reference set is generated, independently reviewed, committed, and shown to the owner for visual approval.

---

## 0. STARTING CHECKPOINT

Expected current \`origin/main\` at kickoff:

\`30fb35bacb7ad3eac9122cb989a1a8b5b48765e3\`

Verify:

\`\`\`bash
git checkout main
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
\`\`\`

If main has advanced, inspect the intervening commits first.

Preserve unrelated local work exactly as required by \`AGENTS.md\`.
Do not reset, clean, stash, or absorb unrelated files.

---

## 1. REQUIRED READING

Read in this order:

1. \`AGENTS.md\`
2. \`docs/CURRENT_SLICE.md\`
3. \`docs/SESSION_START.md\`
4. \`docs/ASSET_FIRST_VOXEL_PIPELINE.md\`
5. \`art/style/README.md\`
6. \`docs/GAME_DESIGN.md\` — current product/art direction only
7. \`.agents/skills/wildkin-asset-forge/SKILL.md\`
8. \`.agents/skills/wildkin-asset-forge/references/dream-loop-production.md\`
9. \`docs/PRODUCTION_LOOP_POLICY.md\`
10. historical U4F reference manifest/review only to understand why the first set was rejected:
   - \`art/source/u4f-rock-001/reference/reference-manifest.md\`
   - \`art/source/u4f-rock-001/reference/review-reference.md\`
   - \`native/evidence/unity/u4f-asset-first-stamp/README.md\`

Do not reread the full voxel/browser history.

---

## 2. OWNER CORRECTION — AUTHORITATIVE FOR THIS GATE

The previous four U4F reference images are **not accepted as the Wildkin rock style target**.

An independent agent previously selected candidate 04, but the owner subsequently reviewed the generated images and found that they read too much like **real/natural rocks** rather than **stylized models from the game**.

That owner visual judgment supersedes the earlier agent selection for active art direction.

Preserve \`u4f-rock-001\` exactly as historical evidence.
Do not delete, overwrite, or relabel it as accepted.

Do not send candidate 04 to TRELLIS.

The new gate exists to answer:

> Can we produce a reference image that already looks like a finished stylized Wildkin Frontier 3D game asset before spending any image-to-3D compute?

---

## 3. WHAT "WILDKIN-STYLE ROCK" MEANS

The target is **not**:

- a photograph of a real rock;
- a photogrammetry/scanned rock;
- a hyper-realistic PBR boulder;
- a natural geology study;
- a studio-rendered realistic stone with photographic grain;
- a primitive cube/sphere with a rock texture;
- a soft metaball/clay blob;
- a highly noisy sculpt full of micro-cracks.

The target **is** an image of a **finished stylized 3D video-game model**, as if it were already an approved environment prop rendered in Unity or Blender for Wildkin Frontier.

Required visual language:

- substantial chunky form;
- broad deliberately designed planes;
- clearly simplified/faceted construction;
- broad rounded/chamfered bevels;
- readable silhouette at thumbnail/game distance;
- asymmetry with intentional shape design;
- low-to-mid-poly visual language even if the actual generated image is high resolution;
- simplified matte material;
- broad painted/value variation rather than photographic grain;
- modest shading;
- no glossy/reflection-heavy presentation;
- clean strong face breaks;
- enough exaggeration that it looks authored for a stylized game rather than merely "a nice real rock."

The existing project style master emphasizes substantial stylized matte forms, clear facets, readable silhouettes, restrained material detail, and strong shape/color separation. Apply that same **design language** to environment rocks.

The owner's September 29 formation example is a **shape-language reference**:
chunky blocky/faceted stones, rounded bevels, broad faces, compact weight, clean simplified game-art treatment.

Do not copy the whole formation.
Generate **one individual rock per candidate**.

---

## 4. IMAGE SHOULD LOOK LIKE A MODEL, NOT CONCEPT ART

Each candidate should look like a rendered game asset/model sheet.

Preferred presentation:

- one isolated rock;
- orthographic or very weak-perspective three-quarter view;
- top and two sides clearly visible;
- entire silhouette visible;
- clean off-white / pale neutral background;
- little or no cast shadow;
- no terrain;
- no grass;
- no neighboring stones;
- no cinematic environment;
- no depth of field;
- no text/UI;
- no photorealistic camera treatment.

It should be easy to imagine dropping the pictured object directly into the Wildkin scene.

---

## 5. EXPLICIT NEGATIVE STYLE LANGUAGE

Every image-generation prompt must explicitly include the equivalent of:

- stylized 3D video-game prop/model;
- visibly simplified/faceted game geometry;
- broad designed planes;
- chunky rounded bevels;
- hand-authored game-art look;
- simplified matte material;
- minimal microtexture.

And explicitly exclude the equivalent of:

- photorealistic;
- realistic geology photography;
- photogrammetry;
- scanned rock;
- naturalistic photographic surface grain;
- hyper-detailed erosion;
- micro-crack noise;
- cinematic realism;
- raw Unreal/Quixel scan aesthetic.

Do not assume the single word "stylized" is sufficient.

---

## 6. DESIGN RANGE — DO NOT GENERATE SIX NEAR-DUPLICATES

Create **six** new candidates across three distinct shape families.

Use a fresh source package:

\`art/source/u4f-rock-002/reference/\`

Do not overwrite \`u4f-rock-001\`.

### Family A — chunky slab / block boulder

2 variants.

Characteristics:
- broad top plane;
- compressed substantial body;
- 5–8 dominant faces;
- large chamfered corners;
- slightly irregular footprint;
- clearly a stylized rock, not masonry.

### Family B — rounded faceted boulder

2 variants.

Characteristics:
- more organic overall mass;
- still visibly faceted;
- broad polygonal transitions;
- asymmetrical high/low shoulders;
- chunky bevels;
- no sphere/egg read.

### Family C — asymmetrical alien wedge / fracture boulder

2 variants.

Characteristics:
- distinctive slanted crown or offset mass;
- one or two strong macro notches/face changes;
- slightly more alien shape character;
- still plausible as solid mineable stone;
- no spikes, crystals, holes, or attached secondary rocks for this first proof.

These families are exploration categories, not exact geometry recipes.

---

## 7. MATERIAL / COLOR DIRECTION

Geometry and shape language are primary.

Avoid realistic gray-rock photography.

Use simplified game-material treatment.

Across the six candidates, restrained palette variation is encouraged, for example:

- warm sandstone/ochre;
- cool blue-gray;
- muted slate/teal;
- desaturated alien mineral tone.

Do not add luminous crystals, moss, decals, foliage, or biome-specific attachments yet.

Material variation must not hide weak shape.

At least some candidates should use stronger stylized color separation than the rejected gray-natural set so the owner can judge the intended game-art direction.

---

## 8. REFERENCE AUTHOR ROLE

Use the built-in image generation capability available to the current task.

The reference author must save:

- exact image;
- exact prompt;
- candidate ID;
- image dimensions;
- SHA-256;
- image-tool provenance;
- exposed image-model version, or \`undisclosed\` if unavailable.

Candidate IDs:

- \`candidate-01\`
- \`candidate-02\`
- \`candidate-03\`
- \`candidate-04\`
- \`candidate-05\`
- \`candidate-06\`

Do not reuse hashes/names from \`u4f-rock-001\`.

---

## 9. INDEPENDENT REVIEW ROLE

After all six exist, use a separate read-only reviewer.

The reviewer must inspect the **actual saved images**, not just prompts.

For each candidate answer:

1. At thumbnail size, does this unmistakably read as a stylized game asset rather than a real rock?
2. Are the large planes/facets intentionally designed?
3. Are bevels/edge transitions chunky and game-readable?
4. Is surface treatment simplified enough that shape dominates?
5. Does it fit the project's substantial matte/faceted visual language?
6. Is the silhouette distinctive enough to reuse at multiple rotations?
7. Is it a plausible single closed solid for image-to-3D?
8. Are there ambiguous fused forms, deep false holes, or misleading shadows?
9. Is there enough visible top/side information for single-image 3D generation?
10. What specifically still looks too realistic, generic, primitive, or noisy?

Use these explicit status labels per image:

- \`STYLE_SHORTLIST\`
- \`STYLE_REJECT_REALISTIC\`
- \`STYLE_REJECT_GENERIC\`
- \`STYLE_REJECT_3D_INPUT\`

The reviewer may shortlist **at most three**.

The reviewer does **not** choose or approve the final Wildkin target.

---

## 10. OWNER APPROVAL IS A HARD GATE

This is the most important rule in U4F-R:

**Only the owner may select the reference that unlocks TRELLIS.**

Even if the independent reviewer loves one candidate:

- do not run TRELLIS;
- do not check TRELLIS RAM;
- do not start the service;
- do not generate a GLB;
- do not build Unity work;
- do not continue automatically.

Stop and show the owner the candidates.

This is intentionally different from the first U4F attempt.

---

## 11. CONTACT SHEET

Create a simple comparison sheet from the six original candidate images.

Suggested layout:

\`3 columns × 2 rows\`

Requirements:

- preserve candidate pixels/aspect without stylistic editing;
- same displayed size;
- neutral background;
- label only \`01\` through \`06\`;
- no review scores painted over the images;
- no beauty filters.

Save:

\`art/source/u4f-rock-002/reference/contact-sheet.png\`

The contact sheet is for fast owner comparison.
Individual originals remain authoritative.

---

## 12. NEGATIVE COMPARISON TO THE REJECTED SET

Create a short written comparison against \`u4f-rock-001\`.

Do not alter the old images.

Record specifically whether the new set improves:

- game-asset read;
- faceted/blocky language;
- simplification;
- silhouette intentionality;
- material stylization;
- reduction of photographic/natural-rock cues.

Do not claim success merely because the new prompts contain more style adjectives.

Judge actual pixels.

---

## 13. RESULT / STOP STATES

Allowed result states:

### If no candidate survives the independent style gate:

\`U4FR_REFERENCE_STYLE_HOLD\`

Commit the failed set/review as useful evidence and STOP.

### If one or more candidates are shortlisted:

\`U4FR_OWNER_REVIEW_REQUIRED\`

This is the expected successful checkpoint.

It does **not** mean a reference is approved.
It means the owner now has a suitable shortlist to inspect.

There is intentionally no \`PASS\` state without a later owner decision.

---

## 14. NO TRELLIS / NO UNITY / NO TEST SUITE

For U4F-R do not:

- call TRELLIS;
- run TRELLIS status;
- inspect TRELLIS process IDs;
- close applications for memory;
- touch the active Unity editor;
- implement C#;
- run EditMode/PlayMode;
- build a Player;
- modify SDF/matter code.

Those belong only after owner reference approval.

For validation, only perform lightweight artifact checks such as:

- files exist;
- images decode;
- dimensions recorded;
- hashes match manifest;
- contact sheet includes all six;
- Markdown/JSON parse where applicable;
- \`git diff --check\`.

---

## 15. EVIDENCE

Use:

\`art/source/u4f-rock-002/reference/\`

Recommended:

- \`candidate-01.png\` ... \`candidate-06.png\`
- \`contact-sheet.png\`
- \`reference-manifest.md\`
- \`review-reference.md\`
- \`owner-review-status.md\`

For this checkpoint, \`owner-review-status.md\` should say:

\`PENDING — requires Chris visual selection before TRELLIS\`

Do not fabricate owner approval.

Optionally add a small checkpoint under:

\`native/evidence/unity/u4fr-stylized-reference/\`

only if consistent with existing evidence conventions. Do not imply Unity work occurred.

---

## 16. DOCUMENTATION

Update current-state docs so future sessions do not resume candidate 04 by mistake.

At minimum:

- \`docs/CURRENT_SLICE.md\`
- \`docs/SESSION_START.md\`
- \`docs/ASSET_FIRST_VOXEL_PIPELINE.md\`
- \`docs/BUILD_LOG.md\`

Record:

- prior \`u4f-rock-001\` independent selection was superseded by owner art-direction review;
- candidate 01–04 are retained historical references but not approved TRELLIS inputs;
- current gate is U4F-R;
- TRELLIS remains blocked until owner picks a new reference regardless of RAM status.

Do not rewrite the historical \`U4F_SOURCE_GENERATOR_HOLD\` evidence.

---

## 17. GIT

Work directly on \`main\` per project rules.

Before staging:

\`\`\`bash
git status --short
\`\`\`

Stage only U4F-R reference/evidence/docs.

Do not include unrelated HDRP, U3, Builds/, authoring/, or other local dirt.

Review:

\`\`\`bash
git diff --cached --stat
git diff --cached
\`\`\`

Suggested commit:

\`Create U4F-R stylized rock reference shortlist [skip ci]\`

Push:

\`\`\`bash
git push origin main
git rev-parse HEAD
git rev-parse origin/main
\`\`\`

Then STOP.

---

## 18. FINAL RESPONSE

Return:

\`U4F-R RESULT:
U4FR_REFERENCE_STYLE_HOLD
or
U4FR_OWNER_REVIEW_REQUIRED

STARTING SHA:
<sha>

COMMIT:
<sha>

ROOT TASK:
confirmed no durable second task created

PRIOR REFERENCE SET:
u4f-rock-001 preserved
owner rejection reason: insufficient stylized game-asset read

NEW CANDIDATES:
01 <family> <review status>
02 <family> <review status>
03 <family> <review status>
04 <family> <review status>
05 <family> <review status>
06 <family> <review status>

INDEPENDENT SHORTLIST:
<up to three IDs>

CONTACT SHEET:
<path>

STYLE FINDINGS:
what became more game-like
what remains questionable

TRELLIS:
NOT STARTED BY DESIGN

UNITY:
NOT TOUCHED BY DESIGN

OWNER DECISION NEEDED:
Choose a candidate, request a repair/new direction, or reject all.

EVIDENCE:
<paths>

UNRELATED LOCAL WORK:
<preserved list>

STOP FOR OWNER REVIEW.
DO NOT RUN TRELLIS UNTIL OWNER EXPLICITLY SELECTS A REFERENCE.\`

In the final UI response, display/attach the contact sheet if the client supports it, and provide exact paths to all six originals.
