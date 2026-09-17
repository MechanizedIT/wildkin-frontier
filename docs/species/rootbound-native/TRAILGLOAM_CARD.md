# Trailgloam — Rootbound-native Wildkin candidate

**Status:** the concept contract independently **PASSes** as a selected, bounded design. The earlier beauty references remain **HOLD**: v1 showed four unambiguous feet and v2 five. The separate orthographic construction sheet has a **conditional construction-reference PASS**: complementary top/side views establish six legs, while front/rear occlusion still needs neutral mesh proof. It is a reference method change only, not visual admission. Unshipped; no species-play prototype, GLB, rig, motion, encounter, or runtime admission exists. Later manual R1/R2 blockouts are preserved; R3 stopped at its shell-port audit before a new mesh/render. The linked [Rootbound species dossier](../../habitats/rootbound-wildwood/constituents/trailgloam.md) now consolidates ecology, illustrations and this history. The current focused-goal allowance supersedes historical rotation caps, while each new method still requires separate review.

## Why this candidate

Trailgloam is a small dusk-beetle Wildkin that turns Rootbound's damp hollows and deadwood edges into readable places worth searching. It offers a brief, optional indication of a nearby ordinary forage or resource source; it does not reveal routes, alter terrain, heal, shield, break minerals, or open a universal gate.

The independent concept review selected Trailgloam over Rootskipper and Thornmimic. Rootskipper needs a safe-footing/route query and a hopping locomotion contract that current owners do not expose. Thornmimic risks duplicating Emberhorn's mineral and combat identity.

## Retained initial concepts

| Concept | Habitat role | Decision |
| --- | --- | --- |
| **Trailgloam** | Damp-hollow/deadwood observer that can optionally cue one nearby existing collection opportunity. | **Selected concept PASS; visual/reference HOLD.** |
| **Rootskipper** | Root-shelf hopping creature intended to signal safe nearby footing. | Rejected: current creature/follower owners do not provide the required safe-footing query or hopping/gliding contract. |
| **Thornmimic** | Thornstone-edge curled creature intended to reveal nearby minerals/forage. | Rejected: overlaps Emberhorn's mineral/break/combat read and risks a rock-like silhouette. |

## Species card

| Contract | Frozen candidate |
| --- | --- |
| Working fantasy | **Trailgloam** — a patient, lantern-frond beetle that reads the living traces of Rootbound's floor. |
| Habitat niche | One resident encounter at a damp hollow/deadwood edge in the Rootbound circuit, preferably where the Lantern Grove's fungal cluster meets ordinary forage. Its visible cues are a low warm seam, amber dorsal fronds, concentrated fungus, and nearby deadwood; it does not appear across the continent. |
| Silhouette | A charcoal/dusky-teal, low saucer body with exactly six grounded splayed legs and two broad folded **opaque amber** dorsal fronds. The fronds form its tall readable mark at portrait scale; it is neither a leafy quadruped, aquatic glider, horned charger, nor a recolored existing model. |
| Temperament | Curious but cautious. It stops, pivots its fronds toward the player from a short distance, then retreats if rushed or struck. This is an observation/read-the-space encounter, not combat. |
| Bond | Bring a berry lure to a clear patch, step back, let Trailgloam approach and inspect it, then walk quietly to bond. This is a proposed narrow `patient-offer` field-taming strategy: it shares the ordinary supply, distance, clear-ground, live-target, interruption, capture, and save-before-removal contracts; it is not a menu or timing minigame. |
| Field utility | **Spore Sense:** when called during an expedition, Trailgloam emits a short amber indication toward one nearby READY finite ordinary forage/resource source in the active resident area. It uses a tight radius, chooses deterministically, gives no indication when none exists, and never harvests, changes spawn state, exposes hidden terrain, or marks a global objective. The result is an optional denser-route payoff, not a required key. |
| Camp value | None in this batch. Care, breeding, crafting, and production are deliberately deferred. |
| Individual variation | None required for first admission. Existing individual identity/sex/source records remain sufficient. No genome or trait claim. |
| Minimum motion | Idle frond tilt/pivot; six-leg walk; brief inspection pause; cautious recoil/turn. The asset must retain grounded feet in each state. |
| Non-overlap | Mossling owns recovery, grove/cache awakening, and garden benefit. Tidefin owns timed protection. Emberhorn owns combat/mineral breaking. Trailgloam only helps notice one nearby already-existing collection opportunity. |
| Non-goals | No safe-footing overlay, trail construction, terrain mutation, resource spawning, auto-harvest, combat, root-seal opening, navigation system, Camp maintenance, genetics, breeding, or new progression framework. |

## Current owner map and feasible change boundary

Trailgloam cannot be added as a data-only recolor: species IDs and their contracts are deliberately explicit. A future implementation must make one cohesive admission change only after visual and species-play review pass.

| Concern | Existing owner | Required bounded change when authorized |
| --- | --- | --- |
| Catalog/HUD/ability wording | `src/companions/companionCatalog.js`, `src/ui/betaShell.js` | Add Trailgloam's supplied field gear, name, cooldown, and compact ability text through the current catalog/model path. |
| Bond stages and live safety | `src/companions/fieldTaming.js`, `src/companions/fieldTamingVisual.js`, `src/companions/bondingLogic.js` | Add the small `patient-offer` strategy as a species-configured variation of existing lure/feed/quiet-approach behavior. Preserve clear ground, range, active-section, damage, death, target-retirement, and supply-save rejection paths. |
| Encounter and resident identity | `src/world/frontierWildlife.js`, `src/world/frontierTerrain.js`, creature lifecycle | Add one fixed Rootbound anchor only after the circuit's stable bounds are known. It needs a complete supported movement disk, terrain/habitat validation, a stable `originId`, and no resident-cap increase without measurement. |
| Model/physics/follower | `src/world/data/world.json`, `src/world/visualFactory.js`, `src/assets/modelAssetRuntime.js`, `src/companions/companionPhysics.js` | Admit a reviewed Trailgloam visual asset plus existing bounded follower collider/formation only after actual-scale GLB inspection. `world.generated.js` is generated output, not the authored data path. New geometry must not claim a bespoke locomotion system. |
| Individual capture and reload | `src/creatures/wildkinIndividual.js`, `src/save/frontierProgress.js`, `src/session/activeRunState.js`, `src/companions/companionSystem.js` | Extend the explicit species allow-list and observation catalog. Retain the existing transaction: validate live target -> create stable individual -> save pending capture -> remove source -> bank -> select -> restore follower. No new save schema is proposed. |
| Spore Sense cue | `src/companions/companionSystem.js`, resource-system query owner injected from `src/game/createBetaGame.js`, `src/presentation/companionAbilityFx.js` | If a future owner separately authorizes the small enabling change after both gates pass, expose one read-only, finite, active-resident query returning a deterministic nearby READY forage/resource candidate. `companionSystem` chooses/presents; the resource owner remains sole owner of readiness, depletion, regrowth, collision, and yield. Reuse the bounded ability FX pool with an amber Trailgloam branch; no persistent marker or state. This card grants no feature implementation. |

## Proposed normal-input journey

1. Enter the proposed Rootbound circuit through Orientation Meadow and find Lantern Grove's fungal/deadwood cue; this named route remains a design hypothesis.
2. Observe Trailgloam until its first journal clue is saved; approach slowly and use the existing nearby interaction.
3. Place the supplied berry lure on clear, dry land, step back, and let it inspect; quietly approach after its readable pause to bond.
4. Carry the pending individual to Camp, return normally, and bank it through the existing extraction transaction.
5. Select the secured Trailgloam for the next outing. In the Lantern Grove/Root Galleries, call Spore Sense near an existing READY source; see one brief amber direction and collect through the ordinary field tool.
6. Reload after capture and after source collection. The individual, source remainder, selected companion, and no active/cooldown visual state must retain the project’s existing semantics.

## Admission and proof plan

### Visual gate (separate asset lane)

- Inspect clean neutral model/reference at front, rear, side, three-quarter, underside/feet, and 48–96 px gameplay-sized renders.
- Require six countable grounded legs, unambiguous dorsal-frond roots, no unwanted extra limbs, a readable low-body-plus-tall-frond silhouette, and a restrained warm seam.
- Validate model scale, clip names/coverage, collider fit, follower contact, mobile material/triangle cost, and asset cleanup before it enters the runtime registry.

### Species-play gate (not run)

- Discoverability: the Hollow's habitat signals lead to the encounter without coordinates or a quest arrow.
- Bonding: clear patch, supply consumption, retreat, quiet-approach success, rushing/attack cancellation, depleted supplies, source retirement, and save failure all use honest feedback and do not delete the resident.
- Utility: no cue outside an active expedition or while swimming; no cue with no eligible source; exactly one stable candidate among several; never targets depleted, inactive, out-of-section, or unsupported sources; never alters a source.
- Persistence: capture save precedes removal; death/loss and bank/reload paths retain existing identity rules; selected follower and one resource's depleted state survive literal reload with no duplicate yield.
- Siblings: run the full ability suite so Bloom, Tidal Ward, Cragbreaker, and Skybound remain unchanged.

### Required focused tests when implementation is authorized

1. Catalog/individual/observation normalization rejects malformed Trailgloam records and preserves legacy species records.
2. `patient-offer` success and every interruption/save failure path preserves supplies/resident state according to the current transaction contract.
3. Fixed Rootbound anchor has stable source identity, complete support/home validation, active-window retirement/return parity, and bounded residency.
4. Spore Sense candidate selection is pure, radius-limited, deterministic by distance then ID, and returns no candidate for inactive/depleted/out-of-section sources.
5. Ability call produces no resource mutation; ordinary tool collection remains the only yield/depletion path.
6. Capture -> extraction -> selection -> ability -> source collection -> developer/package reload maintains individual and resource parity, with transient cue/cooldown state following existing companion policy.

**Batch boundary:** this card authorizes neither runtime implementation nor asset admission. A reviewed model candidate and the reviewed structural Rootbound circuit are prerequisites for a later owner decision; they do not themselves authorize an enabling feature.
