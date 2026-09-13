# Wildkin Frontier: Living Frontier research appendix

Updated September 12, 2026. This appendix distinguishes current playable evidence from proposed direction. It does not change game scope, saves, or runtime behavior.

## Executive direction

Wildkin Frontier is now mobile/casual first: portrait is the primary play surface, while landscape and desktop remain supported. The player takes useful, sometimes dangerous outings from Camp, maps and studies unfamiliar life, brings home individual Wildkin, and grows a recognizable family through physical care, research, and later guided genetics. The immediate build target is a seeded, coherent frontier with large regional grammar - not a random palette swap and not an isolated replacement campaign.

The current world is one fixed deterministic edition. Practical endless travel needs staged, bounded streaming, stable identities, shared terrain/collision sampling, and later save provenance before a player-facing new-world picker. It does not promise every region is forever unique.

## Current playable evidence

| Area | Current evidence | Important limit |
| --- | --- | --- |
| Portrait interaction | Five persistent bottom quick slots; joystick above left; selected action/context right; 320/360/412 portrait and landscape support proved | Physical-phone comfort/performance remains open |
| Outings and atlas | Physical Camp departure/return, saved frontier feet, personal atlas/minimap | One fixed world edition; shared discovery is future work |
| Individual Wildkin | Stable individual identity through capture, reload, Camp banking, roster and death | Mossling body tone only; separate eye, size, marking and modular parts are unshipped |
| Encounter variety | Mossling, Tidefin and Emberhorn field paths; Tidefin native snare/release and banking | Full native Emberhorn dodge/tether capture remains open |
| Traversal | Bounded slow climbing, fall damage and a selected Skybreak plateau with 27.69 m approach-to-crown relief | Swimming and general tall-wall climbing remain future work; plateau art remains below target |
| Camp care | One physical nursery, one garden, active-play young/crop growth; five-second saves | One nursery/crop; no offline absence penalty |
| Pairing/research | Natural pairing plus optional earned parent body-tone guidance | Reproduction beyond the first pairing path is proposed |
| Diagnostics | Seeded descriptor and bounded generation inspector | Inspector is not player-facing geography or climate |

## Player promise and regional grammar

Each outing should create a readable decision: a clue, unfamiliar habitat, route risk, creature observation, resource, or reason to turn back. Slow exploration is meaningful because verticality, clearing, weather exposure, habitats, and discoveries shape it. Safe Camp and early routes support short casual sessions; deeper terrain retains danger.

Proposed regional grammar uses silhouette, drainage, traversal, life above/below, materials, and discovery situations together. Thin plateau chains, mountains, deserts, wet lowlands, coherent rivers, clearable underbrush, and later cave instances are separate recipes under one saved seed/edition. Avoid a predictable world-spanning path grid. Overhangs and caves need separate mesh/collision surfaces because a heightfield has only one ground height at a horizontal point.

Skybreak now has a selected third terrain pass with broad caps, open lowland fingers and separate ascent/return. Final verification passes 1,160 tests and packaged checks. Actual keyboard input reached the crown in 26.37 seconds and descended in 22.17 seconds without health loss; a separate 30.65 m fall cost four health. These are disclosed local fixtures, not physical-phone or fresh-progression proof. A final reload check caught and corrected a slope-resume problem that could restore an older position and undo fall damage. Supported incline placement and live-value checkpoint fallback now have focused regressions. Art scores were 3.5, 4.2 and 4.9/10: R3 is the strongest usable candidate, while the visual target remains unmet. Exact evidence: `art/reviews/skybreak/receipt.md`.

## Creature, family, and research ledger

**Shipped now:** individual records, Mossling lineage/young, body-tone expression, nursery/garden, natural pairing, and earned optional tone guidance.

**Proposed next:** compatible modular Wildkin parts, proportions, base/eye colors, visible markings, additional reproduction modes, habitat/food research, Camp construction and power, DNA archive/cloning, community mapping, and trusted trade. Every modular body choice needs compatible rigs, animation, material isolation, collision, save validation, and normal-camera readability.

Earth and alien reproduction are design inputs rather than a realism simulation. Pairing, parthenogenesis, budding/spores, and symbiosis can each be species-specific fiction using the same committed offspring/care path. Mortality and elder behavior are undecided. Current active-play growth and no absence punishment are provisional; they do not select a final mortality rule.

DNA archive/cloning is later science-fiction play: it should consume resources, power, time, and nursery capacity; create a new individual with provenance; and never claim to restore a donor's lived bond.

## Architecture and save boundaries

Use one authoritative loop and explicit mutable owners. Component-style records/processes can make effects, crops, machines, and creature care composable without mandating an ECS framework. Existing crop and young growth now share an active-play accumulator; growth does not run while absent. Current saves commit on the existing cadence and remain the authority.

Future persistent clearing, depletion, crops, machines, cave instances, atlas coverage, capture histories, and online trade need stable identities and explicit transaction ownership. Single-player/offline is current scope. Trusted online trade would require a later authoritative ownership and exchange contract.

## Positioning and sources

Honeycomb: The World Beyond already combines alien biomes, exploration, laboratories, crafting, and crossbreeding. This does not make Wildkin's direction redundant; the proposed distinction is the combination of direct portrait field play, individual family lineage, personal mapping, contextual Camp care, and research-led choices. This is positioning judgment, not proof of an empty market or a claim that Honeycomb lacks unverified features.

- Honeycomb official site: https://honeycomb-game.com/
- Honeycomb Steam page: https://store.steampowered.com/app/1510440/Honeycomb/
- Snail Games launch announcement: https://snail.gcs-web.com/news-releases/news-release-details/snail-games-announces-global-launch-honeycomb-world-beyond
- Hytale, world-generation design reference: https://hytale.com/news/2026/1/the-future-of-world-generation
- Khronos glTF tutorials: https://github.khronos.org/glTF-Tutorials/gltfTutorial/
- NHGRI cloning fact sheet: https://www.genome.gov/about-genomics/fact-sheets/Cloning-Fact-Sheet
- University of Utah, epigenetic inheritance: https://learn.genetics.utah.edu/content/epigenetics/inheritance/

## Evidence and next questions

The reports use actual review captures and clearly labeled proposed art. Aggregate/package proof, exact receipts, and active scope remain in `docs/CURRENT_SLICE.md` and `art/reviews/`. Open questions: practical large-region scale, camera/readability on physical phones, water/swimming, cave lifecycle, full modular anatomy, concrete elder/mortality rules, and the product decision for trusted online trade.

## Generation pipeline and terrain contracts

The durable model is layered rather than monolithic: a saved world identity selects broad regional descriptors; those descriptors drive continuous terrain, drainage and habitat fields; local recipes reserve Camp, discoveries, creature homes, feasible access and resources; only a bounded nearby scene is instantiated. The rendered mesh, Rapier surface, camera support, prop grounding, resume query and atlas must draw on the same ground sample. A pretty terrain mesh without a matching supported position is not a valid region.

Use global integer chunk identity and local render/physics coordinates. Terrain border samples, including neighboring samples used for normals, come from the same pure world-space function. A bridge, river, landmark or discovery spanning a border must have one stable placement owner; it cannot be generated independently in adjacent chunks. Deterministic random streams should be separated by domain - terrain, flora, wildlife, secrets and offspring - so adding a flower does not reshuffle animal identity or a chest.

Heightmaps are appropriate for broad ridges, basins, plateaus and ordinary walking ground. They cannot represent an underside, arch, or cave floor below an overworld surface at the same horizontal coordinate. Overhangs, narrow shafts and caves therefore need separate closed meshes, matching collision and explicit placement sockets. A cave should be a separately loaded persistent instance keyed by the world identity and entrance ID, with a saved return anchor. This is a proposed lifecycle, not current runtime behavior.

Generation is bounded work. A descriptor is cheap data; animated creatures, colliders, particle systems and geometry are not. Preload ground before a player reaches it, cancel obsolete generation, retain ground until replacement support exists, and dispose owned resources without destroying shared templates. Instancing can reduce repeated vegetation draw overhead, but every visual choice still needs a measured device budget.

## Regional grammar and novelty limits

Regional identity comes from a dominant silhouette, traversal question, food web, resource pressure, and visible discovery - not a color wash or a new scatter table. A plateau should ask the player to read caps, slots, safe ascent/descent and exposure. A wet basin should communicate banks, connected dry ground and water semantics. A salt basin should use sightlines, shade/refill decisions and landmark mesas. Seeded variation changes arrangement inside that grammar; it should not erase the grammar.

Important rewards need reservations, clues and broad-area guarantees. Independent low-probability placement can create long empty runs: a 1% chance attempted 100 times still has about a 36.6% chance of never appearing. Common curiosities establish looking closely, regional discoveries teach a relationship, and rare signature sites supply a memorable scene. This is why a cap observatory or a root-node shortcut needs a stable identity and route relationship instead of a random chest roll.

The staged Skybreak workflow is concrete: (1) generate one plateau fixture with a verified lowland supply choice, ascent, useful landing, cap encounter and return descent; (2) extend the terrain sample with semantic cap/lowland inputs only after the landform works; (3) let existing forage, scenery and wildlife consume those inputs; (4) test map, skyline, collision, falling and portrait route together; (5) expand only after real evidence shows which variety remains weak. The first terrain fixture is now selected and its proof is recorded above; semantic cap/lowland ecology and a dedicated discovery remain next work.

## Wildkin expression, rigs, and phenotype boundaries

An authored family defines anatomy, rig, clips, sockets, allowed material masks and collision envelope. A genome is a small versioned recipe of inherited identifiers. A phenotype resolves that recipe into an approved appearance and bounded behavior configuration. An individual record owns identity, origin, parents, bond/care state and lineage. A rendered creature is temporary; it must never become the save authority.

Current Mossling evidence supports restrained whole-body tone. It does not support isolated eye colors, coat masks, markings, modular crest/tail pieces, limb proportion changes or a second body plan. Skinning and morph targets are real glTF mechanisms, but they do not make arbitrary scaled limbs attractive, grounded or clip-safe. Use expression in an order: validated palette regions; socketed accents; a small overall size range; authored morphs/limited joint changes; then a dedicated new anatomy when the family needs it. Animation can overwrite transforms each frame, so morphology ownership must compose with the pose. Never mutate a shared skeleton or material; recompute conservative culling, interaction and collision bounds for expressed variants.

The practical admission loop is wild creature -> bonding target -> follower -> nursery young -> portrait/roster -> reload/import -> disposal. A trait is not "implemented" until it survives that chain at normal camera distance and across required clips. This makes modularity a content/rigging contract, not a menu of unexpressed genome fields.

## Breeding, research, and life-cycle distinctions

The current first path is physical compatible pairing, a committed young identity, lineage, active-play growth, and optional earned body-tone guidance. The proposed next breeding screen should show parents, visible channels, permitted range, one explicit preserved choice, cost and outcome before commit. Persist the offspring recipe at commitment so reload cannot reroll it. A full roster must preserve the pending young safely. Collection capacity, nursery capacity and active rendered bodies are separate budgets.

Breeding is selective use of allowed compatible traits, not automatic invention of anatomy or a generation-level power curve. Start within a species/ecotype; permit a later cross only for curated sister species with a defined body/rig and trait table. Keep utility situational so an early companion remains valuable. Research should use a legible sequence: observe a wild expression, compare known individuals, earn one eligibility clue, then guide one limited trait. It should not expose a hidden spreadsheet.

Biology terms are not interchangeable. **Sexual pairing** combines contributor rules defined by a species. **Parthenogenesis** is development from an unfertilized egg; genetic outcomes depend on the mechanism, so it should not be treated as a guaranteed clone. Smithsonian documented this in an Asian water dragon (source below). **Budding** produces an outgrowth that can become a new individual. **Spores** are a different reproductive structure: plant spores participate in alternation of generations, while fungi can produce spores in sexual or asexual cycles. These distinctions follow the Georgia Tech references below. **Symbiosis** is an interspecies relationship; it can inspire an alien readiness requirement without being a reproduction method itself. **Cloning** is proposed here as a fictional machine that copies an approved appearance recipe into a new individual, with a new lived bond. Each mode needs separately authored contributors, compatibility, young form, care and save behavior.

Growth, adult persistence, elder presentation and mortality are distinct decisions. Current active-play growth and no absence penalty are provisional. No report recommendation selects mandatory old-age death, offline decay, or a policy for an existing companion's removal.

## Component-style Camp systems

Use small explicit records and domain owners: a crop plot owns its saved growth state; a young owns its growth/lineage state; a future machine job would own input reservation, completion and output capacity; an effect record would own source, duration, stacking and removal. The shared active-play process clock is already a focused timing helper for crops and young. It adds no schema, offline catch-up, machine system or ECS.

Composition is sufficient for the current JavaScript/Three.js/Rapier architecture. An ECS framework is not mandated. Any future temporary effect must derive values from base state rather than permanently edit health, speed or yield. Unloaded systems retain compact records, and catch-up only appears when an explicit simulation-time rule is accepted. Current crop/young timing stops while paused, hidden, offline or in Author.

## Original source ledger

The following durable sources from the morning research remain relevant; none proves a Wildkin implementation by itself.

1. Hello Games, No Man's Sky overview: https://www.nomanssky.com/about/
2. Hello Games GDC, Continuous World Generation in No Man's Sky: https://gdcvault.com/play/1024265/Continuous-World-Generation-in-No
3. Hello Games GDC, Art Direction Bootcamp: https://www.gdcvault.com/play/1021805/Art-Direction-Bootcamp-How-I
4. No Man's Sky Companions update: https://www.nomanssky.com/companions-update/
5. Hytale, The Future of World Generation: https://hytale.com/news/2026/1/the-future-of-world-generation
6. Lioden appearance guide: https://www.lioden.wiki/appearance
7. Lioden base genetics: https://www.lioden.wiki/base-genetics
8. Khronos glTF skinning tutorial: https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_020_Skins.html
9. Khronos glTF morph-target tutorial: https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_017_SimpleMorphTarget.html
10. Red Blob Games, terrain from noise: https://www.redblobgames.com/maps/terrain-from-noise/
11. Three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
12. FastNoiseLite: https://github.com/Auburn/FastNoiseLite
13. MDN, working with objects: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects
14. bitECS reference: https://github.com/NateTheGreatt/bitECS
15. Honeycomb official site: https://honeycomb-game.com/
16. Honeycomb Steam page: https://store.steampowered.com/app/1510440/Honeycomb/
17. Snail Games Honeycomb launch announcement: https://snail.gcs-web.com/news-releases/news-release-details/snail-games-announces-global-launch-honeycomb-world-beyond
18. NHGRI cloning fact sheet: https://www.genome.gov/about-genomics/fact-sheets/Cloning-Fact-Sheet
19. University of Utah, epigenetic inheritance: https://learn.genetics.utah.edu/content/epigenetics/inheritance/
20. Pocket Frogs official site: https://nimblebit.com/

## Proposed regional families and content kits

All families below are proposed grammar from `docs/REGIONAL_DIVERSITY_PLAN.md`; current runtime has one rolling frontier, a terrace, a selected Skybreak terrain fixture and bounded reused ecology. These are not six finished regions.

| Family | Dominant form and traversal question | Food/resource/discovery example |
| --- | --- | --- |
| Skybreak Plateau Fields | Tall narrow tables, cap landings, slot-valley return routes | Wet slots support reeds/berries; dry caps hold minerals; an observatory reveals a safe descent |
| Floodglass Lowlands | Braided shallow banks and dry island chains; water remains semantic until swimming exists | Fiber, berries, fungi and a half-sunk seed vault reached by connected footing |
| Sunscar Salt Basin | Long sightlines, mesas, shade/refill decisions | Bulbs and crystal seams near mesas; a shadow-pointing mineral needle leads to a cache |
| Ironspine Mountains | Directional ridges, passes, shelves and ravines | Lichen, exposed iron/crystal and a saddle storm bell that marks a reliable route |
| Hollowbough Archlands | One dominant arch/root direction, risky high shortcuts and clearable mazes | Resin/fiber at socketed joints; a living node opens a persistent shortcut |
| Underveil Cave Instances | Separate seeded chambers with deliberate retreat/return anchors | Fungal mats, mineral blooms and a deep research discovery |

Reusable kit rule: each region pairs one terrain grammar with a small flora/decor vocabulary and bounded wildlife roles. Proposed blocks include wind grass and shelf lichen for exposed caps, reed fans and basin lilies for wet margins, salt succulents for sheltered desert pockets, crystal blooms for rare strata, socketed root-arch segments for explicit overhang geometry, and lantern fungi for cave readability. Existing berry, reed, mushroom, canopy, trail-stone, and crystal assets may seed those kits only when their placement and collision contracts remain intact.

## Practical content and traversal examples

**Plateau outing:** leave Camp with a defined supply choice, follow a lowland forage clue, read a safe shoulder rather than a blind jump, reach a cap landing with a visible encounter or survey reward, then descend by the reserved return route. Falling, route visibility and supply reach are proof gates, not decorative polish.

**Wetland outing:** follow connected dry islands to a bank resource and a Tidefin-like defensive home. Do not present blue-green ground as physical water until crossing, buoyancy and exits have explicit support.

**Archland outing:** a clearable root can open one persistent low shortcut while an explicitly meshed arch offers a risky high route. The discovery depends on the relationship between route, structure and reward rather than a chest placed under any random tree.

## Content and art workflow

1. Write a region brief: silhouette, traversal question, food web, resources, one discovery, safe return and transition grammar.
2. Capture overhead and normal portrait baselines; create one realistic target; use about three visual passes and preserve rejected evidence.
3. Implement one shared terrain/collision/placement contract before dressing. Test both approach directions, landing areas, resource reach, unload/reload and return.
4. Write a creature brief: body family, behavior, taming cue, allowed traits, forbidden combinations, habitat role and required clips.
5. Admit a phenotype through wild, bonding, follower, nursery, roster, reload/import and disposal paths before calling a new trait expressed.
6. Expand only after a native/physical proof identifies the weakest remaining variety source. Reuse open-source assets only with source/license/provenance recorded.

## Current staged next slices

1. **Skybreak terrain foundation (selected):** approach, crown, descent, physical fall, shared mesh/collider sampling and bounded support are proved. Its visual target remains HOLD at 4.9/10 and sparse ecology is unfinished.
2. **Cap versus lowland habitat contract:** after the landform is accepted, pass semantic surface inputs to existing forage, scenery and wildlife consumers without treating color as ecology.
3. **One ecological outing/discovery:** reserve an observable cap discovery, lowland supply decision, existing-species home and safe descent before starting a second regional family.

## Biology references retained from the original report

The original morning report used these primary biology references for the distinctions above; they are more pertinent than generic platform links for reproduction claims.

- Smithsonian, facultative parthenogenesis in Asian water dragons: https://www.si.edu/newsdesk/releases/scientists-confirm-facultative-parthenogenesis-smithsonians-national-zoos-asian
- Georgia Tech, asexual reproduction including budding and fragmentation: https://bio1220.biosci.gatech.edu/sex-01/2-01-what-is-sex/
- University of Minnesota, flower morphology and self-incompatibility: https://open.lib.umn.edu/horticulture/chapter/7-2-flower-morphology/
- Georgia Tech, plant reproduction and spores: https://organismalbio.biosci.gatech.edu/growth-and-reproduction/plant-reproduction/
- Georgia Tech, sexual and asexual fungal spores: https://organismalbio.biosci.gatech.edu/biodiversity/fungi-2/

## Making habitat and genetics tangible

Proposed first habitat puzzle: a shelter-loving Wildkin is restless on an exposed cap. Field observation shows it nesting beneath broad leaves and eating a specific fruit. At Camp, the player places shade near its bed, grows that fruit and sees it settle into a relaxed animation. A small contextual readiness indicator explains the missing condition. Start with two understandable needs, not temperature, pH, humidity, diet and social sliders simultaneously. Current nursery care is much smaller and does not implement this puzzle yet.

Research can grant three different kinds of agency: reveal a hidden but eligible inherited channel; improve the chance of an already possible expression; or spend a limited resource to preserve one chosen parent channel. The third is already represented by body-tone guidance. Later mechanics should show the visible tradeoff before commitment. Do not silently allow a research upgrade to invent a new skeleton or guarantee every favorable trait at once.

Example alien modes (proposed fiction): a paired mammal-like family carries a young; a solitary shelled family develops an unfertilized egg under a specific seasonal cue; a plant-like Wildkin grows one bud when its habitat is thriving; a fungal family releases propagules onto an appropriate nursery substrate; two symbiotic species jointly prepare a nursery while only one is the genetic contributor. None of these require a universal opposite-sex rule. Their effort, habitat and capacity costs should be comparable even when contributor counts differ.

## Aging, DNA and exchange choices

Chris raised aging and death as an open question. The proposed starting preference is adulthood without mandatory loss, with optional elder appearance or retirement later. It keeps an attached player free to return after an absence. This remains a design recommendation, not an accepted mortality rule.

| Option | Player experience | Main design cost |
| --- | --- | --- |
| Persistent adults | Keep a favorite indefinitely; generations remain an elective project | Need useful reasons to raise young besides replacing the dead |
| Elders and retirement | A visible life story; an elder can remain in a sanctuary | More life-stage art, capacity and retirement rules |
| Finite adult lifespan | Breeding and archives become urgent, as in some breeding games | Loss anxiety and pressure conflict with casual phone sessions |

A DNA archive can support all three options. Sample a known individual, record its lineage and approved recipe, then use a physical Camp machine that consumes power, resources, time and available nursery space. A clone gets a fresh identity; archive provenance prevents it from being mistaken for the original explorer's companion. Saving an archive and consuming the machine inputs must be one coherent transaction, with outputs retained if capacity is full.

DNA exchange may fit a community better than shipping entire companions: players trade an opportunity to raise a lineage while keeping their favorite. However, unlimited duplication would make a rarity market meaningless. Before an online economy, choose whether a sample is reusable, consumable or license-like; decide whether rarity means appearance, provenance or discovery history. A local save file cannot enforce trusted scarcity. The present game is single-player and offline; these are later product and server decisions.

## Differentiation as a playable promise

Honeycomb's official page already presents alien exploration and crossbreeding; Wildkin should distinguish itself through how a session feels. A portrait session can be one forage trip, one new observation, one risky climb and one bedside care decision. A longer session can map a new region or pursue a family trait. Show personal discoveries, remembered companions and readable ecological clues through direct play, while retaining dangerous terrain and a reason to prepare.

Casual should describe input and commitment, not an empty or consequence-free world. Five thumb-reachable slots, short contextual choices, safe pauses and meaningful retreat support mobile play. Unclear cliffs, tiny menus, mandatory daily timers and endless statistical optimization would work against that promise. Physical-phone performance and comfort still need direct testing; emulated screenshots do not settle either.
