---
name: wildkin-species-development
description: Design, produce, integrate, review, and hand off one distinct Wildkin Frontier species by separating visual asset production from behavior, taming, utility, persistence, and habitat integration.
---

# Wildkin species development

**Latest owner review direction:** apply [Rootbound practical asset reuse and showcase review](../../../docs/ROOTBOUND_ASSET_REUSE_REVIEW.md). Attractive, useful actual results may be used despite target differences or lower scores; older fixed score thresholds below are superseded for this focused run. Review reusable components, material-yield ideas, arrangement/rotation/scale/tint variants, and useful curve-authored roots/trunks. Preserve focused correctness and actual gameplay proof.


**Focused Rootbound override (latest September 14 owner direction):** use [ROOTBOUND_FOCUSED_GOAL.md](../../../docs/ROOTBOUND_FOCUSED_GOAL.md). Work continuously within Rootbound and its constituents; up to six substantial attempts per constituent/composition experiment, independent review each time, method change after two repeated defects. After six unsuccessful attempts, work on another Rootbound constituent and revisit with a concrete new approach. Keep useful partial gains against the retained baseline; preserve held candidates and reusable parts. Earlier three-pass/rotate-away rules below are historical for this focused run.


Use this project-local skill for a new Wildkin species or a substantial revision to one species. It composes the existing `wildkin-asset-forge` and general `wildkin-development` skills. It is not permission to produce a large roster before one species has a useful, readable field loop.

Read `AGENTS.md`, `docs/SESSION_START.md`, `docs/CURRENT_SLICE.md`, the relevant habitat packet, `docs/EARLY_ALPHA_PLAN.md`, and the current species/runtime owners in `docs/CODE_MAP.md`.

## Species contract

Before modeling or coding, write a compact species card:

1. **Working name and one-line fantasy.**
2. **Habitat niche:** where it lives and which visible signals lead the player to it.
3. **Distinct silhouette/body plan:** recognizable at gameplay scale and not merely a recolor or scaled existing model.
4. **Temperament:** flee, observe, warn, stalk, defend territory, retaliate, cooperate, or another bounded behavior.
5. **Taming/bonding mechanic:** an interaction that expresses the temperament and can be understood without a text-heavy menu.
6. **Field utility:** one clear way it changes exploration, collection, survival, traversal, or discovery.
7. **Camp value:** optional care, habitat, crafting, breeding, or production role that does not become mandatory maintenance.
8. **Individual variation:** only traits the current art/data path can actually express.
9. **Animation/motion set:** minimum clips and readable telegraphs.
10. **Performance and persistence:** resident cap, collider, stable source/individual IDs, capture transaction, save/reload, follower, and package paths.
11. **Non-overlap:** why it is not duplicating Mossling, Tidefin, Emberhorn, or another admitted species.
12. **Non-goals:** future genetics, reproduction, combat, or biome systems that are not part of this batch.

A creature is not admitted because the concept art or GLB looks appealing. It needs a distinct body/silhouette, recognizable behavior, a habitat relationship, a comprehensible bond method, and one useful persistent player role.

## Split the work into two lanes

### Visual asset lane

Use `.agents/skills/wildkin-asset-forge/SKILL.md`.

Typical flow:

1. For an existing species, first render its actual current mesh from front, rear, both sides and three-quarter at neutral and phone sizes. Measure complete bounds and defining part thickness; freeze unchanged component and sibling-species geometry/material/transform evidence. Use these findings to bound the revision. Then produce a clean complementary-view design target with source/proportion notes.
2. Independent reference review for anatomy, silhouette, impossible joins, background contamination, and mesh-generation risk.
3. Choose the suitable bounded production method. For manual Blender or code-native geometry, use the asset-modeling director: tool-informed measured plan, independent plan review, separate builder, then early massing review. For TRELLIS, verify that the reviewed input matches its single-object requirements and run only one heavy job at a time.
4. Inspect front, rear, side, three-quarter, underside/feet, and gameplay-sized renders.
5. Clean and normalize in Blender; preserve raw generation and editable source.
6. Rig/animate only after the neutral mesh passes.
7. Export a bounded GLB and inspect it in Three.js at actual species scale.
8. Independent visual/motion review.

An existing code-native species need not become a GLB to repair its geometry. Preserve its current runtime path when that is the smallest useful change; prove actual instantiated geometry, attachments and animation rather than granting a format-based exemption. Emberhorn's side baseline exposed 0.05m-deep legs hidden by its front view, redirecting the work from unnecessary horn redesign to measured limb volume and mane attachment. Keep shared helpers and other species unchanged unless a separately scoped consistency fix is warranted.

Trace the real factory before claiming integration. This project normally loads
baked `asset.parts` through `world.json` → `world.generated.js` →
`createVisualAssetVisual`; a changed mesh-kit constructor is only authoring
source until that recipe is rebaked. Use the focused `--asset <id>` bake selector
after neutral retention, generate world data, and compare actual factory meshes
against the reviewed source with the serializer's declared precision. Freeze
all unselected recipes, regions, collider and gameplay metadata. The first
Emberhorn encounter after source edits still displayed its old recipe, so its
runtime judgment was reopened and repeated after this chain was corrected.

Default to three substantial model passes: one initial candidate and up to two focused repairs under [the project loop policy](../../../docs/PRODUCTION_LOOP_POLICY.md). A repeated consequential gap requires a changed reference, topology or generation/rig method before using a remaining pass. Stop early on PASS; do not repeat unchanged parameters.

### Gameplay species lane

Before proposing new APIs, inspect the actual existing owner functions and record their signatures, data fields and transaction semantics in the species plan. Distinguish missing seams from APIs merely absent from an older document. Use concrete starting ranges/timings labeled existing or provisional, and write acceptance cases with observable outcomes. Never promise refunds, rollback, reachability or saved effects that the current owner does not provide. Review the plan before implementation; a generic list of owner filenames is not an implementation-ready handoff.

Work from the species card and existing owners:

1. Spawn and habitat placement with stable source identity.
2. Temperament/state machine with readable telegraphs.
3. Bond/taming transaction using ordinary input.
4. Pending capture → physical return/banking → owned individual.
5. Selected companion/follower and field utility.
6. Save-before-removal or other existing atomic transaction rules.
7. Literal reload, unload/return, death/failure, and package continuation.
8. Short player-facing presentation and field notes only where needed.

The gameplay lane may prototype with an admitted placeholder when the asset is not ready, but it must label that fixture and cannot claim visual admission. The asset lane may produce a model without integrating gameplay, but it must label it an unshipped candidate.

## Independent review gates

Keep these judgments separate:

### Visual gate

Score:

- silhouette originality and gameplay readability;
- anatomy and grounded contact;
- texture/material quality;
- deformation and motion;
- fit with the Explorer/low-poly Wildkin art direction;
- mobile rendering cost and LOD suitability.

### Species-play gate

Score:

- discoverability in its habitat;
- temperament readability;
- bonding clarity and fairness;
- usefulness without mandatory dependence;
- encounter pacing and danger;
- persistence and transaction correctness;
- differentiation from admitted species.

### Integration gate

Only integrate as an admitted species when both relevant gates pass and the normal-input journey works in the actual habitat. One strong side cannot waive a failure on the other.

## Species loop

Default batch:

1. Three one-paragraph concepts tied to one habitat need.
2. Independent selection of the strongest feasible concept.
3. Freeze the species card.
4. Run visual and gameplay lanes in parallel only where file/tool ownership is disjoint.
5. Integrate one representative encounter early.
6. One consolidated visual repair and one consolidated gameplay repair.
7. Complete a normal-input discover → bond → return → select/use → reload story.
8. Checkpoint or preserve as an explicit HOLD.

Do not spend an unattended night trying to rescue one failed creature. Cap the visual and gameplay production loops at three substantial passes each. Repeated gaps require a changed method within the remaining allowance; if none fits, preserve HOLD and move to another authorized batch or stop. These separate gates do not multiply the species or overnight batch count.

## Unique-role rules

A new species should add a different decision, not another button with different particles. Useful role families include:

- revealing hidden trails, tracks, or ecological signals;
- altering risk/reward during traversal;
- opening a resource relationship;
- improving recovery, protection, breaking, carrying, scouting, or navigation in a distinct way;
- changing how the player approaches a habitat or prepares an outing.

Avoid granting a universal key that makes the companion mandatory. Prefer optional advantages, alternate routes, reduced risk, or improved yield.

Taming should follow temperament:

- shy species: patience, distance, food placement, or stillness;
- territorial species: read warnings, retreat, prove restraint, or survive a bounded challenge;
- curious species: mimicry, object offering, movement pattern, or observation;
- social species: help a group/member or demonstrate a habitat behavior;
- ambush/predator species: tracking, baiting, trap/safety preparation, or exhaustion.

Reuse existing interaction owners before inventing a minigame framework.

## Flora and resource companions

A species batch may request one or two supporting flora/resource assets when they are necessary to make the habitat relationship readable. Route these through `wildkin-asset-forge`; do not turn a species batch into a whole-biome asset dump. TRELLIS heavy jobs remain serialized.

## Long-running session rules

The overnight orchestrator may run one species batch beside one habitat batch if:

- writers do not overlap;
- only one heavy GPU task runs at a time;
- the habitat packet is stable enough to define the species niche;
- root owns canonical integration;
- a reviewer thread remains available.

A species batch may finish at the card/reference/GLB-candidate stage. Do not force runtime integration merely to claim overnight completion.

## Required handoff

Leave:

- species card and selected/rejected concepts;
- reference and source/model hashes;
- visual/motion review;
- behavior/taming/utility review;
- exact admitted, provisional, placeholder, or HOLD status;
- normal-input journey and reload result when integrated;
- remaining blocker and the next meaningful method change.
