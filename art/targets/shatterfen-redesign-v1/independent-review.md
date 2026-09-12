# Shatterfen redesign V1 — independent target review

September 12, 2026. **HOLD — 7.7/10. Do not admit this image as the implementation target yet.** The visual direction is strong: an alien collecting wetland with broken peat banks, silt channels and a wreck lookout, rather than Verdant recolored blue. The material reference problems are protected-anchor clarity and essential routes that appear partly submerged. Preserve the direction while correcting those specific reads.

This is an independent target-design judgment, not a score of the current game or a geometry/physics admission. No production edits, reference generation, browser testing or model work occurred. Only this review file was written; other workers retain ownership of their files.

## Evidence and rubric

Inspected the actual full generated target, fresh before clean/planning/58-degree overview images, approved Explorer master, exact prompt, provenance, planning handoff and fresh manifest anchor data. Applied the existing Wildkin development/Dream Loop distinction between a target gate and later model, runtime, functional and phone gates. No prior Shatterfen score was inherited.

| Category | Score | Judgment |
|---|---:|---|
| Composition / level reference | 2.0/3 | The western hollow, east receiver, northwest wreck bank and north/south gates make a coherent and distinct wetland. Useful side loops and height reveals replace the before-map zigzag. However, the far-bank Beacon is not unambiguously identifiable, the green creature appears at the southwest arrival edge instead of its protected far-bank approach, and several essential crossings look wet rather than continuously dry. The receiver's low forecourt is not clearly separated from the tall surrounding plate silhouette. |
| Lighting / palette | 2.7/3 | Cool teal water and sedge, pale silt, slate faces and restrained ivory/orange debris form an appealing readable palette. Soft shadows give depth without darkening routes. Some fine painterly color variation exceeds the runtime reference's simplicity, but it is a controllable aspiration rather than an obvious rendering impossibility. |
| Materials / style | 2.4/3 | Chunky matte rock and ceramic forms suit the approved Explorer. Fen stone/reed/lily/crystal vocabulary remains recognizable. Water has more surface/shore variation than the existing flat runtime and the hull reads as a substantial composed shell, so these require explicit later implementation choices. No glossy mirror water, impossible architecture or major AI-melted landmark is apparent. |
| Details / practical readability | 0.6/1 | Reeds mostly frame water edges and the open west crescent gives a plausible snare working space. There is too much evenly distributed tiny flower/crystal flecking to treat each speck as a separate mobile prop. Several resources and small anchors cannot be reliably distinguished from decorative equivalents at this overview scale. |
| **Total** | **7.7/10** | **Target HOLD. Strong visual premise; material navigation/reference ambiguities remain.** |

## What works and should survive revision

- **Useful larger footprint:** the northwest hull shelf makes the extra rim serve an optional destination and a view back over the water. The south remains an arrival and fork, not another hub. The image plausibly fits the selected 100×100m plan, but an uncalibrated generated view cannot prove metre dimensions.
- **Different regional identity:** long low wet edges, silt crossings, split peat plates and sparse trees dominate. This is not a canopy enclosure or another eastward 3/6/8m shelf ladder. The northwest bank and lower receiver area are different destination types.
- **Natural exploration:** the broad shoulders and asymmetric banks suggest walking routes and optional cuts. There are no jump pads, checkpoint rings or repeated platform course. The left hollow offers a continuous pale crescent beside two blue creature silhouettes, with room to approach, step back and read a snare.
- **Orientation:** north remains image top/world -Z. Emberfall is at the far/top center, Verdant return at near/bottom center, the two Tidefin figures are west/left, and the receiver is east/right. There is no Verdant-style bay reversal here.
- **Recognizable style:** muted blue/gray/ivory machinery and orange accents connect to the Explorer master. Keep the receiver as the existing modest paired-pylon/bowl landmark; do not turn it into a tall glowing tower. Keep the current Tidefin runtime model separately governed by its own owner/art decision.

## Ranked corrections before target admission

### 1. Restore protected far-bank anchor and actor clarity

Make the **Tideglass Beacon and existing Sunken Cache visibly separate from the new wreck-supply cache**. I can identify the northwest wreck and nearby chest-like forms, but cannot confidently identify the protected Beacon from the image. It must remain a low extraction destination with its own standing/approach pocket, not become an inferred piece of wreck debris.

The only green creature silhouette appears near the bottom-left boundary beside arrival-side crystals. If intended as the existing Thornprowler, that is inconsistent with the protected far-bank role and its current (-32,-7) location; if decorative, it ambiguously duplicates a gameplay creature. Show it in the far-bank approach region between the northwest destination and western hollow, maintaining separation from the quiet snare bank. Do not implement the southwest relocation from this target.

Keep the source coordinates authoritative: Beacon (-28,-15), existing Sunken Cache (-29,-21), far-bank Thornprowler (-32,-7), and proposed new supply cache (-44,-34). The generated perspective is not a calibrated placement map. A revised clean target plus a companion marked planning view should make these distinct, without changing IDs, rewards or portal relationships.

### 2. Make every essential crossing visibly dry

Several pale central crossings carry teal water or white water-like streaks across the apparent walking line. Most clearly, the middle junction leading toward the receiver and the crossing north of the arrival fork can read as wet fords. The plan excludes swimming/new water traversal and asks for dry silt connections. An image that relies on submerged-looking links is a material route reference problem even if a future invisible collision surface could make it passable.

Show **two unmistakable continuous dry silt crossings**, with pale ground above the water line and water terminating at their banks. At the 100m footprint, plan for roughly 3–4m clear widths and ordinary walking alternatives to optional cuts; do not add bridges or a new traversal system just to rescue this image. Keep the west snare crescent free of reed walls and give the northwest ascent a visibly continuous dry shoulder. The image should explain the route without a reader having to assume shallow water is walkable.

### 3. Clarify the low receiver forecourt and simplify role-bearing detail

Separate the receiver's **0.7–1.2m clear forecourt** from the higher 2.2/3.3m rear peat plates. The current receiver sits on a broad cliff-edged island whose foreground and rear elevations are hard to distinguish; the intended lower accessible working pocket is not explicit. Keep a wide grade from the creek fork, a separate waypoint standing area and an identifiable Reedbank Cache approach. Avoid copying the depicted elevated island literally around the existing return spawn.

Use the target revision/planning companion to mark protected resource pockets, not to sprinkle more resource-like crystals. The fresh manifest identifies seven ordinary resource IDs **plus three harvestable props**: `prop_s2_causeway_crystal`, `prop_s2_observatory_crystal` and `prop_s2_farbank_blossom`. The plan's shorthand “seven renewables” must not lead to treating these three as disposable scenery. Distinguish their silhouettes and clear working space from repeated decorative seams, reeds and flowers. This is a reference/role safeguard, not evidence that the generated image itself deleted runtime data.

## Implementation constraints that an accepted image still would not prove

The target's 4–4.8m northwest bank is plausible with the existing continuous polygon/graded terrain path, provided a broad supported ascent is actually authored. The target cannot prove slope limits, jump distances, landing support, dry-bank snare placement, Tidefin motion, companion traversal, collider fit, save/reload, extraction, gate repair or Author rebase/export. Those remain later independent checks.

The before atlas reports **351 calls / 191,467 triangles**. The target has many more shoreline reeds and tiny flecks; this is not a measured future runtime budget. Use bounded repeated batches/instances and baked ground variation where already supported, keep foliage dense at selected wet edges, and do not instantiate every pictured speck. A mobile-cost estimate and native frame measurements belong to the implementation gate. The image does not authorize additional model families, water physics, a new engine, a new enemy or more than the selected 100×100m region.

The northwest shell is a useful visual landmark, but is not evidence that existing survey panels already form that exact geometry. First assess reuse of admitted components; any later new shell would need its own bounded art/collider admission. The observatory shown is directionally compatible with the existing receiver, not authority to replace the accepted model.

## Exact provenance

- Target: `art/targets/shatterfen-redesign-v1/target.png`, SHA256 `4df4bef3626062b2917d2f9fc2381b91cd2a678fb3030e386ce91f86a1198494`.
- Provenance file SHA256: `edf900c32494831836896f1cb386099d5f83022198a5d19c1d4917bbe5965bc2`; generator recorded as built-in image generation, September 12, 2026; one generated candidate, no runtime admission.
- Exact prompt: `art/targets/shatterfen-redesign-v1/prompt.md`. Provenance lists the fresh before overview and approved Explorer as the two supplied image references.
- Approved Explorer: `art/style/explorer-master.png`, SHA256 `a5c6d707832bb3fd0b21289be540e3fd75970befca66a442b65ebf673543adff`.
- Fresh before manifest: `.dream-loop/shatterfen-redesign-v1/before/manifest.json`, created `2026-09-12T10:09:48.58Z`, world SHA256 `e0fcaa3dd1580fcf1cd5f4de2556dfc377bff03fa126f9ae0a59cacb8a6d6888`.
- Before clean SHA256: `49bc3e03ace05ac0167a7435602200deea78895ac2b4ff0f83ca9ce38b4e1478`.
- Before planning SHA256: `69c073518532f1864393bc7ffb490fa6b0780d68bd76eea2db7d389aa4f479d3`.
- Before overview SHA256: `53c3cce6b434d08650ed4dd82053161abb5a3c00683f9ed1e4105af5146b2b52`.

The old audit chronology in `plan.md` is historical where it refers to earlier captures. This review uses the fresh manifest above, including the current Reedbank Cache at (17,4), not the stale Fen Leap Cache placement. Root owns any revised target commissioning and subsequent scope. No implementation is admitted by this report.
