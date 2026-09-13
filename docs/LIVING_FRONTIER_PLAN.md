# Living Frontier — implementation plan

September 12, 2026. Chris approved the procedural exploration / creature-life direction and resumed continuous goal-mode development from `11393c7`. This is an in-place pivot on local `main`, not an alternate game or a compatibility project. The earlier finite campaign is useful source material, not the destination.

Current local checkpoint: broad seeded provinces now surround the preserved Camp/Skybreak route. Irregular roughly600m sites blend lush, Sunscar and Ironspine terrain, color and bounded life recipes. A continuous boundary walk, regional crystal gathering, highland footing and literal reload passed at full health. All1,191 tests and aggregate build/validation pass. Selected R3 art remains5.5/10 HOLD, especially in ordinary portrait play. Exact fixtures, package proof and remaining gaps: `art/reviews/regional-provinces/receipt.md`. This remains local work after the separately delivered `4298dd5` + `08e36a5` GitHub/Drive checkpoint.

## The game we are building

A dangerous alien frontier surrounds the crashed research Camp. Walk out, read the landscape, harvest supplies, investigate a clue, understand an unfamiliar Wildkin and decide when to return. At Camp, build useful spaces, grow suitable food, study inherited traits and raise a distinctive family. Physical actions and visible creatures carry the experience; the Journal and atlas explain discoveries without taking over play.

Continuous geography uses curated landform, habitat, ecotone and discovery recipes. It must remain coherent and reproducible, not promise that no two places ever resemble one another. One canonical seed/content edition supports separate player histories. Offline field/DNA cards are a proposed later sharing format. Verified online trading is a later product/service decision.

The refreshed illustrated research now lives in [docs/research/living-frontier](research/living-frontier/README.md): both PDFs, editable Markdown, image provenance and selected screenshots are part of the repository. The original morning files remain preserved at `C:/Users/cwood/Documents/Wildkin-Research/2026-09-12/`. Existing phone links are retained for the [Visual Fieldbook](https://drive.google.com/file/d/1CxksdXis14pKQ_3KyKvUHKMLhNly8D5y/view) and [Detailed Research Appendix](https://drive.google.com/file/d/14Hbboycp5oFvID5TwbVpPR2uA_uvJph5/view). The refresh replaces the obsolete separate-campaign/save proposal with the owner's in-place direction.

## Explicit owner steering

- Work continuously in goal mode until Chris asks to stop. Root makes routine design, implementation and orchestration decisions.
- Work directly on `main`. No branch, legacy campaign fork, or backwards compatibility requirement. Keep useful existing systems and assets. Preserve unexplained working-tree experiments.
- Latest September12 steering after waking: mobile/casual first, portrait as primary layout, with landscape/desktop support. See MOBILE_IDENTITY.md for Honeycomb research and the completed M1 portrait controls decision. The shared descriptor remains fixed-world save identity. Connected regional generation now has a local foundation: smooth weighted provinces share one terrain/life field while keeping Camp, the starter route and Skybreak exact. Bound rendering, streaming, simulation and storage; do not claim physical-phone proof from an emulated viewport.
- Subsequent explicit geography direction: large biomes, extreme alien heights and distinct life above/below, coherent rivers and some persistent clearing through dense areas, without a predictable global path web. [`WORLD_GENERATION_PLAN.md`](WORLD_GENERATION_PLAN.md) owns the sequence; [`REGIONAL_DIVERSITY_PLAN.md`](REGIONAL_DIVERSITY_PLAN.md) now distinguishes the three implemented foundation grammars from three later families and richer progression grammar. Rivers, physical water, weather, overhangs/caves and full regional ecosystems remain proposed. Component modularity for effects/crops/machines is a stated architectural interest.
- Use Dream Loop for visible scene, asset and UI work. About three improvement passes per bounded feature, except blocking correctness bugs. Choose the strongest usable candidate, record gaps and advance. Do not interrupt for routine aesthetic approval.
- Use economical models/reasoning for bounded tasks, one writer per shared file, independent visual judgment and one heavy browser/Blender/inference job at a time.
- Reuse suitable open-source libraries and licensed free assets when they help. Record source/license and actual reason for dependencies; vendor runtime necessities for offline play. No paid service, publication or account upgrade is implied.
- Text should be brief; world, animation, sound and visual feedback should teach mechanics. Exploration should take time and retain danger.
- Explore slow cliff climbing, swimming and fall damage. Base colors and eye colors belong in the creature trait plan.

## Producer choices, revisable through play

- Reuse vanilla Three.js, Rapier, existing player controller, inventory, construction, harvesting, field taming and camera. One authoritative loop and one owner per mutable domain.
- Height terrain plus authored complex rocks, arches, wrecks and later caves. No voxel excavation in the foundation.
- First stream uses 50 m chunks aligned to the existing 100 m Camp, with a bounded nearby window. The report's 64 m / nine-chunk illustration was not an accepted performance budget. Actual window and mesh density must earn their cost.
- A Wildkin genome is a small versioned game recipe, not a biological simulation. Base coat, eyes, foliage/crest, tail accent, markings and modest proportions stay within admitted family rigs. Palette metadata alone does not prove a texture can express isolated eye/coat colors.
- Individuals retain identity, origin and family links. Offspring resolve once when breeding commits. Preserve one eligible trait; remaining values come from parents before adding curated mutation rules.
- Growth without mandatory old-age death is the initial casual choice. Optional elder/legacy presentation can follow. No missed-day death or care punishment.
- Ordinary male/female pairing is one species rule. Add one clear asexual mode after the shared offspring/care path works; broader alien life cycles remain curated fiction.
- Habitat affects readiness and allowed expression, not automatic DNA rewriting. Research provides explicit, limited control over inherited choices.
- DNA archiving/cloning comes after reliable individuals and Camp transactions. Clone the recipe/provenance into a new individual with new bond/training; charge an upfront cell/resources and a visible incubation/care cycle. Recipe sharing is copying, not scarce ownership.

## Delivery sequence

| Slice | Player result | Required evidence before moving on |
| --- | --- | --- |
| F1 Terrain foundation | Leave the Camp apron into continuous nearby ground; neighboring chunks load and unload | Deterministic borders, mesh/collider/height parity, bounded residents, safe section/Author lifecycle, baseline/target/actual captures |
| F2 Living geography | Two recognizable habitats and a transition have forage, obstacles, wildlife and a clue | Stable content IDs; safe gather/capture/unload/revisit; one meaningful route and return; limited nearby actors |
| F3 Personal atlas | Minimap and full map reveal surveyed terrain and landmarks | Survey persists; map work/memory bounded; reported vs personal knowledge distinct; supported resume |
| F4 Individual Wildkin | Two Mosslings can look different and remain separate companions | Shared expression across wild/follower; independent materials; capture/secure/reload; no species deduplication loss. Static species portraits stay catalog illustrations; individual portraits need a separate admitted render path. |
| F5 Traverse and survive | Slow climb, water crossing and readable falling risk support terrain | Reuse controller states; valid ledges/exits; damage through existing health owner; keyboard/touch and motion proof |
| F6 Camp ecology | Build a nursery habitat and small food garden; animals visibly settle | Physical access and readable needs; placement/cost/capacity transaction; no absence punishment |
| F7 Raise and study | A chosen pair produces recognizable young; knowledge guides one trait | Fixed offspring, capacity reservation, care/growth, lineage and save failure behavior; one later asexual mode |
| F8 Archive and exchange | Grow a new individual from an archived or imported recipe | Version/trait validation, clone provenance, committed resources, no reroll/duplicate rewards; unverified import label |
| F9 Expand and refine | More landforms, secrets, admitted families, crafting, animation and atmosphere | Improve the weakest source of variety; long travel/storage/phone evidence; no unbounded active state |

F1, F2A forage, F3 outings/atlas and F2B individual wildlife are complete as foundations. F4 adds a shared subtle body tone; separate eyes failed art admission and remain unexpressed. F5A adds one terrace, safe slope and falling risk; arbitrary climbing/swimming and richer landforms remain unfinished. F6A adds one physical nursery with exact-individual settling, atomic berry feeding, visible bowl and safe outing/return transitions; R3 scored8.7. F6B adds a physical food garden, active-play growth and a nearby nourished-Mossling yield benefit; R2 scored8.6. F7A adds physical opposite-sex pairing, one fixed offspring, reserved capacity and young growth at the existing bed; R2 scored8.5. M1 supplies portrait camera/controls/HUD and visible target selection; R2 scored9.0. F2C supplies deterministic bounded habitat scenery, compact solids and merged low plants; R3 selected6.1HOLD after three passes, retaining sparse/uniform art debt. F5B adds slow physical climbing at the terrace with shared true-ground/fall handling; its R3 staged clips remain contact-art provisional. F7B now connects physically earned notes to optional settled-parent body-tone inheritance (8.4PASS); F2D selects improved framing at6.9HOLD. F1B selects a modest rolling shoulder/bowl at6.0HOLD after three passes; terrain depth remains debt. F4B selects clearer shared body tones at8.1PASS after two passes. Final1,131tests and native/portable proof passed,44.10MB/20.53MB. F2E now reuses shipped Tidefin/Emberhorn(8.0PASS), provides terrace minerals and fixes portrait note panels. F2F selects R3 upright grass at7.4HOLD. The newer checkpoint passes1,137tests and native/portable proof,44.11MB/20.53MB; the earlier totals above are historical. The descriptor inspector and shared active-play process clock are implemented diagnostics/infrastructure; they do not add regional runtime content, offline growth, a new schema or a measured performance claim. Next steps and mesh/overhang/habitat strategy are in WORLD_GENERATION_PLAN. The world is currently one fixed deterministic edition; saved seed coherence, other reproduction modes and deeper genetics remain future work. Small complete integrations take priority over stockpiling disconnected modules. Reorder adjacent slices when dependencies or player feedback justify it; record the reason in CURRENT_SLICE.

## Runtime ownership and scaling

- A pure global terrain sampler owns generated height, habitat blend and appearance parameters. The existing authored Camp height model remains the reserved landmark input. Geometry, collider triangles, camera support and resume queries use the same result.
- A focused chunk runtime owns resident meshes and Rapier handles. Load support before movement and unload complete lifecycles. Main only composes and calls it through the existing loop.
- Keep integer chunk identity separate from local floating render/physics coordinates. Add origin rebasing before describing distant travel as effectively unlimited. F1 establishes a nearby foundation, not an infinity claim.
- Persistent world changes are separate from loaded objects. Unloaded does not mean unknown. Generated harvest/capture/reward IDs need a durable acceptance rule before those systems stream.
- Continue with one save authority. Rework schema directly when required; no legacy migration layers solely to preserve a private pre-alpha. Avoid second inventory, health or reward ledgers. Individual/map data and terrain edition must commit coherently.
- Authoring remains useful for templates and landmarks. Do not generate the universe into world.json or hand-edit generated output independently of its owner.

## Loop and proof budget

For each visible slice: capture actual play → author a realistic in-engine target using that baseline and the approved Explorer style → independently assess feasibility → implement → capture play → independent visual judgment → at most three improvement passes. Retain the strongest usable result and honest gaps. Do not regenerate the target to excuse an implementation failure. Correctness blockers are fixed even after the aesthetic pass budget ends.

Pure correctness/data tasks use focused tests without an image-generation gate. Each worker tests its owned contract. Root performs integrated verify/ZIP and relevant native/package proof at cohesive playable boundaries, not after every edit. No tests for prose or reversible styling. New save, physics and identity boundaries need meaningful failure/reload cases.

At checkpoints update CURRENT_SLICE and BUILD_LOG, distinguish implemented from planned behavior and commit only owned cohesive changes on main. Existing experiments and unshipped candidates stay intact until deliberately used. Scope searches to named files; do not recursively search all of .dream-loop or dump historic logs.

## Starting evidence and debt

Handoff `11393c7` passed 966 tests and packaged checks at 43.84 MB unpacked / 20.46 MB ZIP. This is inherited evidence, not proof of subsequent work. The initial tree also contains pre-existing Verdant composer/test edits and untracked art/tool experiments; do not sweep them into unrelated commits.

Emberfall has an isolated full-width slope failure and is not runtime content. Tidefin V3 needs native motion/timing admission. Both are reusable candidates, not mandatory next tasks. F5B reuses CLIMB/MANTLE/FALL clips and supports eligible bounded natural faces. More complex climb anatomy/contacts, richer landforms and swimming remain unfinished.
