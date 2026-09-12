# Wildkin Frontier — current scope and checkpoint

Updated September 12, 2026. **Active goal-mode development: F7B/F2D checkpoint complete; next F1B rolling terrain and F4B body-tone readability.**

Chris explicitly resumed from the restart handoff and approved an in-place pivot to the illustrated procedural exploration / creature-life direction. Continue through bounded slices until he asks to stop. The old finite campaign and paused overnight mandate are historical. Read **LIVING_FRONTIER_PLAN.md → SESSION_START.md → CODE_MAP.md**.

**Latest owner steering after waking:** mobile/casual first, portrait playable with simple intuitive controls. F7A, M1 portrait controls/camera/HUD and F2C scenery foundations are complete; slow climbing is complete as a functional foundation. This replaces the earlier PC/web-first/landscape-first priority; danger and longer exploration remain. Competitive findings and proposed identity: `MOBILE_IDENTITY.md`.

## Completed foundation: F1 terrain and recipe foundations

Player result: walk beyond the existing Camp into continuously sampled terrain with a bounded loaded neighborhood. Reuse the current player, camera, Rapier, Camp, harvesting and construction. Establish one deterministic Mossling appearance recipe in parallel; collection/breeding are subsequent integrations, not complete because a helper exists.

- Pure global terrain sample and chunk identity; reserve the existing 100 m Camp. First candidate uses 50 m chunks to align its edges.
- Explicit render/collider creation and removal; shared height/normal/border samples. Update before movement through the existing loop.
- Keep Camp, portal and Author usable during the cutover. Finite region data remains temporarily as source content; do not create a legacy campaign branch or second game.
- Dream Loop baseline/target from actual play, independent comparison and up to three visual passes. Fix collision, unload, save and runtime blockers regardless of aesthetic count.
- Focused terrain/physics/lifecycle proof. Root runs aggregate verify, ZIP and relevant native/package checks at the integrated boundary.

Root owns integration, scope/docs and final verification. Bounded workers own pure terrain and genome modules/tests. One writer per file.

F1 selected its third pass under Chris's delegation: technical foundation usable, visual target not admitted. Independent R1/R2/R3 scores are3/10,3.5/10,4.4/10. The straight ground edge, sparse content and lack of distant terrain remain leading visual gaps. Full checkpoint proof:998/998 tests, verify/build/ZIP;43.87 MB unpacked /20.47 MB ZIP; native packaged Jump on streamed ground and section retirement/return fixtures. Exact sources, images, hashes and limits: `art/reviews/living-frontier-f1/receipt.md`.

**F2A complete**: live generated forage uses the existing harvesting/save owners, bounded3×3 ecology residents and persistent partial/depleted records. Native auto-harvest/collection→unload→return→reload and failed-save retry passed in an isolated developer save. Generated pending drops unload into lightweight stable-ID records and rebind on return. Camp supply stays renewable. R2 selected6.5/10 after three visual passes; exact evidence:`art/reviews/living-frontier-f2a/receipt.md`. Current selected aggregate1007/1007 and verify/build/ZIP PASS;43.88MB unpacked /20.47MB ZIP.

## Completed: F3 continuous outings and personal atlas

This adjacent reorder completes the exploration/session contract before F2B wildlife and individual capture. The world currently streams beyond Camp while the old session/map still treats it as Camp; close that mismatch now.

- Walking beyond Camp starts the existing expedition session at the current supported position. Keep one session and terrain section`camp`; distinguish physical Camp bounds from session state. No second game mode or save branch.
- Resume must load terrain at saved frontier feet before the shared support/overlap validation; preserve healthy saved position/cargo/health/XP. Physical return to Camp's existing gate/station resolves the outing through the existing banking path. Death retains terrain/resource discoveries but uses the established carried-inventory/run consequence.
- Replace the finite destination map as the normal MAP surface with a personal exploration atlas and minimap. Reveal nearby terrain as the player walks; retain revealed cells under the existing save authority. Show Camp/current position and distance with short labels; no online community or unexplored-secret disclosure yet.
- Bound live map work and stored coverage. Freeze/clear spatial runtime in Author editing. Continue one frame loop, one save authority and shared terrain height sampling.
- Test walk-out start, physical return, outside-Camp reload, failed-save retry, map reveal persistence and death. Capture actual map baseline and a realistic target before UI production; up to three visual passes.

F2B wildlife requires stable captured individual IDs before it streams; species-only pending companions cannot prove that. Mossling's current single textured mesh supports modest uniform scale/whole-model tint only. Isolated coat/eye/marking changes and modular accents require an art path; do not display unexpressed recipe traits as implemented features.

F3 checkpoint: automatic in-place outings, saved physical return eligibility, generated-ground resume and personal atlas/minimap are integrated. Aggregate1,026/1,026 and build/validate/ZIP passed; final UI focused10/10. Selected R3 independently8.5/10 after7.3/7.9 earlier passes; emulated landscape/portrait and native packaged map open passed.43.90MB unpacked/20.48MB ZIP. Exact proof, fixtures, images and hashes: `art/reviews/living-frontier-f3/receipt.md`. Current death rule retains the backpack while losing carried XP/pending bonds. Full generated-world economy and dangerous traversal remain unfinished.

## Completed: F2B individual wildlife

Complete the individual transaction before admitting generated capture-able animals. No alternate save authority or generic genetics framework.

- Replace species-only pending/owned companions with bounded individual records: stable individual ID, species, origin, acquired run and versioned Mossling genome. Other existing species retain individual identity with no invented genome expression. Permit two Mosslings; selected follower keys by individual ID while abilities still use the species catalog.
- Carry the same exact record through field capture, pending run snapshot, reload, Camp banking, owned roster/selection and death. Preserve save-before-removing-the-live-animal and atomic/idempotent banking. Update necessary Journal/result presentation to show distinguishable entries; hide unexpressed visual traits.
- Add deterministic generated Mossling residents through the existing creature owner, bounded near the player, with stable source IDs and persistent capture state. A captured source must not duplicate across unload/reload; generated origins and captured individual IDs are different identities.
- Integrate modest shared size/tint expression only when its actual wild/follower material/collision path is reviewed. No isolated eye/coat claims from a whole-mesh tint. Art revision/masks and fuller modularity remain F4 work.
- Reuse field taming, physical lure preparation and Camp return. Establish a reachable first generated animal and the supplies needed to bond with it. Add focused capture/failure/unload/bank/reload/death proof, one native interaction after clearly labeled fixture if required, and visual target/at most three passes for the visible wildlife/roster result.

Root owns shared integration and final checkpoint; workers own explicitly assigned schema/save, creature residency or UI modules. Adjacent production work may proceed in parallel only with separate file ownership. The old finite objective/material gates need a subsequent frontier progression pass; retained campaign checker success does not establish this new economy.

F2B now carries exact individual records through native lure/bond, failed-save retry, literal reload, physical Camp banking, separate same-species roster selection and death. Generated source residency is bounded to four, with captured history preventing duplicates. The first two Mosslings retain ordinary movement within a tighter initial clearing. Selected R3 scored 8.1/10 after 6.9/7.8; exact evidence and validation are in `art/reviews/living-frontier-f2b/receipt.md`. Appearance genes remain data only.

## F4 checkpoint: body-tone variation; eye overlays held

- Make two captured Mosslings visibly distinguishable using one shared expression path for wild creatures and owned followers, with independent material ownership and complete disposal. Preserve the current rig/clips and identity transactions.
- First candidate uses restrained whole-body tone plus separately head-bound eye geometry/material in a small editable Mossling revision. The current body texture combines coat, foliage and flowers: call this body tone, not isolated coat color. Do not infer semantic masks by texture thresholding. Evaluate the eye overlays for attachment, occlusion and all existing clips before shipping.
- Keep size bands, markings and crest/tail variants data-only until their actual geometry, collision and motion paths are implemented. This bounded slice need not solve every trait at once.
- Capture actual baseline and a realistic target; use separate asset implementer and visual judge, at most three visual rounds. Prove wild/follower material isolation, capture/reload expression parity, animation attachment and disposal. Reuse the current physical roster; expose only traits that are actually visible.
- Root owns shared integration and scope. One worker owns the isolated editable asset candidate; another may own pure expression/material tests. No source asset is replaced before visual/runtime proof. Continue the long-running goal after this slice.

Selected result is the unchanged V3 body with a restrained whole-body tone shared by generated wildlife and owned followers. Eye overlays failed anatomical placement in three reviewed static results and are not shipped; eye/size/marking/crest/tail genes stay data only. Independent review found the lichen/clay fallback subtly distinguishable and usable provisionally; the original eye target remains unmet. Materials are independent and disposed safely, saved clay appearance matches the packaged wild recipe, and the existing rig/clips remain unchanged. Exact evidence: `art/reviews/living-frontier-f4/receipt.md`.

## Broader authorized direction

### F5A checkpoint: rocky terrace and grounded falling risk

One three-metre shelf in chunk0,-3 now has a four-metre clear left slope, sharp front/right lips, six reused Verdant rock models with matching colliders, and shared terrain sampling. The controller emits one landing event; playerCombat owns damage/feedback/death. Drops up to2.4m and ordinary jumps are safe; larger falls cost1–4 health. Resets clear tracking. Live keyboard-handler fixtures climbed and crossed the shelf with unchanged health, then stepped off, became airborne and lost one health; literal reload retained the supported lower position and health. Arbitrary cliff climbing/swimming remain subsequent work.

R1/R2/R3 visual scores1.5/~3/~4.5; R3 is selected functional groundwork, not target visual admission. Flat wall/stone repetition and sparse geography remain debt. Shared F4/F5A checkpoint:1,057/1,057 tests, verify/build/validation/ZIP PASS;43.95MB unpacked/20.49MB ZIP. Exact proof and fixture limits:`art/reviews/living-frontier-f5a/receipt.md`. The portable build contains all six final rock instances and the same3.02m sampled drop.

## Completed foundation: F6A physical nursery and care

- Reuse Camp construction and one existing Wildkin bed as a physical nursery anchor. Settle one owned Mossling there, feed berries through a nearby world action, and show its care visibly. Keep one companion visual owner and individual identity; avoid a second creature inventory.
- Add one bounded, versioned care assignment under frontierProgress. Validate the live bed and owned individual. Spend raw berries and advance nourishment in one rollback-safe transaction. No missed-day decay, old-age death or real-time care debt.
- Start with one assignment and three nourishment steps. This is settling/feeding groundwork, not implemented breeding or a complete habitat simulation. A food garden, habitat suitability and guided inheritance follow as separate small integrations.
- Keep the physical bed/action reachable and placement-safe. Release an assignment before removing its bed. Reuse the selected companion for assignment, with short in-world feedback; avoid a new management dashboard.
- Root owns shared integration, visual target/review and scope. Workers may own explicitly separate care/save, base interaction or resting-visual files. Capture current Camp/bed baseline and a feasible target, with about three visual passes. Prove assign/feed/save failure/reload/release and preserve expedition following.

F6A selected R3 at8.7/10 after8.0/8.4. A physical moss bed, visible bowl, Settle/Feed/Release actions and one exact owned Mossling are integrated. Native failure/retry, reload, mobile controls, outing/return and packaged interactions passed.1,064/1,064 at the behavior checkpoint; final geometry focused/base/build/validation/ZIP also passed.43.98MB unpacked/20.49MB ZIP. Nourishment is presently visual status only. Exact evidence and limitations:`art/reviews/living-frontier-f6a/receipt.md`.

## Completed foundation: F6B physical food garden

- Add a small Berry Garden construction piece and one planted crop record under the existing save owner. Plant one raw backpack berry, visibly grow through three stages over90seconds of active play, then harvest3berries. Growth continues during outings; paused, hidden, Author and offline time do not advance it. No absence penalty.
- A fully nourished assigned Mossling within6m of the plot adds one Bloom-tended berry at harvest. Calculate this from authoritative bed/plot/individual/care state inside the harvest transaction. This gives the nursery an immediate use; no new autonomous animal simulation.
- Plant/harvest exchange inventory and crop in one rollback-safe commit. Full inventory and failed writes leave the ripe crop available. Save growth in bounded5second quanta, never per frame; at most one unsaved quantum may be lost. One planted crop initially; an occupied plot cannot be removed.
- Reuse base placement, footprint validation, world action and the single fixed update. Root owns integration/target/review/docs; workers own explicitly separate save/rules or garden geometry/base routing. Capture real Camp baseline and target before visual production; up to three reviewed passes.

F6B selected R2 at8.6/10 PASS after R1's7.7. Native planting, natural growth, failed-harvest rollback/reload/retry, backpack pause, active outing/return and phone-sized harvest passed. The portable build planted and advanced the same crop. Actual garden costs8draws/2,112triangles.1,070/1,070 tests and verify/build/validation/ZIP PASS;44.01MB unpacked/20.51MB ZIP. Receipt: `art/reviews/living-frontier-f6b/receipt.md`.

## Completed foundation: F7A physical pairing and young

- Use one nourished bed and two distinct owned adult Mosslings of opposite sex. The settled individual and selected follower are the chosen parents. Basic pairing has no research gate. Add strict canonical sex and optional lineage to individual records and concise symbols to the existing roster; no new management dashboard or anatomy claim.
- Commit one exact offspring genome, identity, sex and parent/generation links once when pairing starts. Consume the existing full nourishment, reserve the bed and one roster slot atomically. Save failure retains readiness and the same sequence for a deterministic retry. Include that reserved slot in capture and banking capacity rules. The parent records remain owned.
- Show one small young Mossling at the physical bed through the existing companion visual owner, using the current Idle and body-tone expression. Grow for120seconds of active play in5second checkpoints; no offline/paused/Author advance or absence debt. The young body has no active collider. Restore adult scale before ordinary following. This is a provisional scaled young model, subject to actual visual review, not a new juvenile anatomy/animation claim.
- At maturity, a nearby Welcome action atomically adds the exact child to owned, clears the growth record and settles it at that bed with empty nourishment. Keep active selection unchanged. Reserved/occupied beds cannot be removed. Prevent duplicate welcome and preserve ready offspring after a failed save.
- Root owns composition, world actions, visual target/review, docs and final checkpoint. Separate workers may own canonical identity/breeding/save, companion young representation, or existing roster metadata. Read actual state first; one writer per file. Up to three visual passes. Guided trait research and alternate reproduction follow after this complete ordinary pairing loop.

F7A selected R2 at8.5/10 after R1's7.8HOLD. Native Pair/failure/retry, natural120second growth, failed Welcome/reload, portrait Welcome, lineage roster/selection and mature release/follow passed. Young scales70/85/100% of ordinary adult size; existing V3 anatomy/Idle retained.1,077/1,077 tests and verify/build/validation/ZIP PASS;44.03MB unpacked/20.51MB ZIP. Exact receipt: `art/reviews/living-frontier-f7a/receipt.md`. One-nursery reservation also blocks care at a different bed to prevent Welcome overwriting paid care.

## Completed foundation: M1 portrait controls and camera

- Follow Chris's new mobile/casual-first steering. Make portrait the primary comfortable play layout while preserving keyboard and landscape. Capture actual portrait Camp/travel, author a feasible target, and use up to three reviewed visual passes. See `MOBILE_IDENTITY.md` for competitive positioning and limits.
- Reduce the narrow HUD to compact status/map, equipped tool/Pack, one movement control, one primary nearby action and compact traversal/escape controls. Keep existing backend action owners and separate held Attack from click interaction; do not turn a stale interaction gesture into an attack.
- Provide a comfortable stable or assisted portrait camera after testing camera-relative movement. Keep manual inspection available and retain collision/focus recovery. Avoid camera steering that rotates movement underneath a held joystick.
- Put the portrait primary action within thumb reach with a clear world target cue. Select physically reachable, visible useful targets consistently so a garden behind the player does not suppress a bed ahead. Preserve range, line-of-sight, disabled states, modal/Author cancellation and save transactions across Camp, forage/taming, gates and storage.
- One writer per input/camera/HUD file. Root owns integration, target/review, native portrait actions/travel and landscape regression; workers use focused pointer/camera/selection checks. Emulation is not physical-phone comfort/performance proof. No new deep menu, dependency or combat/progression expansion in this slice.

M1 selects R2 at9.0/10 after R1's8.8. Portrait now uses a stable42° camera, fixed left stick, compact status/map and tool/Pack controls, a real selectable tool belt, and a reachable contextual primary with a world cue. Disabled nursery/garden status leaves ordinary tool actions available. Visible candidates fall through blocked/offscreen priority targets; an eight-entry cache bounds target geometry and10Hz LOS checks. Feed/Plant/equip/Build/Atlas/Auto Harvest/Jump and portable landscape/portrait Feed passed.1,092/1,092 tests and verify/build/validation/ZIP PASS;44.05MB unpacked/20.52MB ZIP. Exact proof and fixture limits: `art/reviews/living-frontier-m1/receipt.md`.

## Completed foundation: F2C habitat scenery and northbound route

- Improve the sparse generated landscape now that the creature-life loop and portrait controls are usable. Existing terrain already provides habitat blends, but every chunk uses the same low groundcover; make the northbound route into visibly distinct Verge and Fen surroundings with a coherent transition.
- Reuse admitted canopy, reed, lily, stone and mushroom assets in a small deterministic scenery recipe. Frame the existing forage, Mosslings and terrace with recognizable scenery. This is scenery/route readability, not a new terrain-height system, water simulation, secret reward or expanded save schema.
- Keep one chunk lifecycle and shared terrain sampling. Start with a deliberate budget of up to18 nearby props plus one silhouette per outer resident chunk, maximum34 live props; measure actual draws/triangles and reduce if needed. No new dependency or model generation is required merely to add variety.
- Keep Camp, forage access, creature clearing, terrace slope and fall-gap paths clear. Decorations that visually imply a solid obstacle need deliberate placement or an existing collision path; do not scatter intangible tree trunks across walking routes.
- F2C implementation uses compact solid trunk/stone surfaces through the existing terrain-collider lifecycle, plus the existing player-foliage fade owner. Small authored plant meshes are merged into one vertex-color draw. Terrain height and saved ecology remain unchanged; no new dependency is needed.
- Capture actual portrait route baseline and a feasible target before production. Separate recipe/render worker ownership and independent visual judge, about three passes. Root owns integration, a physical Camp→Mossling→terrace route check, budget/disposal proof, aggregate and portable checkpoint. Continue the active goal afterward.

F2C selects R3 at6.1/10 HOLD after4.5/5.4; strongest usable of three passes, below the art target. Existing trees, damp plants, mushrooms and stones now frame the northbound route. Seeded placement borrows terrain residency; nearby low meshes/ground tufts merge into one draw, trunks/stones use compact solid surfaces, and canopies reuse player fade. At the inspected route26props/13surfaces/20tufts were resident. Continuous real-input-listener steering reached all seven Camp-approach→clearings→terrace waypoints with health5 unchanged; full retirement/return and portable Jump/reload passed.1,102/1,102 tests and verify/build/validation/ZIP PASS;44.07MB unpacked/20.52MB ZIP. Exact evidence: `art/reviews/living-frontier-f2c/receipt.md`. Sparse ground, shallow canopy depth and uniform terrain remain visual debt; no physical-phone performance claim.

## Completed foundation: F5B slow physical cliff climbing

- Add a deliberate, slow climb at suitable natural rock/terrain faces, starting with the existing three-metre terrace. Keep the safe slope as an alternative. Reuse player CLIMB/MANTLE/FALL states, the one fixed loop and Rapier movement; do not teleport through a face or blocked exit.
- One bounded probe identifies a nearby stable face, a reachable walkable lip and a clear capsule exit. Classify approved terrain/rock surfaces explicitly; exclude creatures, sensors, boundary walls and decorative tree trunks. Retirement invalidates an attached surface safely.
- Use a short contextual Climb action in portrait and the existing keyboard interaction path. Up/down movement should be understandable, neutral input should hold, and cancel/drop should return to existing fall tracking and health consequences. Keep ordinary Jump separate. No stamina meter or new save schema is required for this first integration.
- Audit the existing player rig/clips before production and provide an actual climbing pose/motion. Capture a repeatable face-on/side baseline and feasible target. Up to three visual passes; upright sliding alone is not accepted climbing motion.
- Close shared authored-climb/mantle exit, cancellation and reset behavior wherever the same contract changes. Prove valid/invalid faces, blocked exits, drop/landing, retired colliders, camera orbit, portrait input, section/Author/modal/resume resets and native/package traversal. Root owns integration and final checkpoint; give separate workers explicit physics/probe versus pose ownership.

F5B selects R3: approach/controls8.7PASS, improved lift-to-mantle staging, hand/boot contact and mantle art still HOLD. Chris's reported wall-jump ratchet reproduced under raw KCC grounding and is fixed by true slope-aware sole support. Repeated jumps now stay within the ordinary1.43m apex. Knockback and long-jump falls close through the same one-impact landing owner.1,123/1,123, verify/build/validate/ZIP PASS;44.09MB/20.53MB. Final landscape placement/hit-target refinements received native package proof after the aggregate. Exact evidence: `art/reviews/living-frontier-f5b/receipt.md`.

## Completed parallel batch: F7B research and F2D habitat fullness

Chris asked for faster visible milestones and explicitly authorized several independent jobs at once. Keep three worker lanes available with root integration/playtesting; this session has four active-agent slots total. Do not serialize unrelated scenery and breeding work behind shared movement code.

- F7B: reuse physical wild-Mossling observation, existing nursery and fixed-offspring transaction. Completed field research unlocks an optional guarantee that the young inherits the settled parent's visibly expressed body tone. Ordinary pairing must remain available; do not silently replace it after research. One concise bedside choice, no research dashboard/new station/library. Failed-save/retry, fixed donor/offspring, reload/import and capacity closure remain required. Separate eyes/shape/marking claims remain excluded until expressed.
- F2D: improve fullness around the northbound route through bounded merged ground vegetation, coherent dry/wet patches and existing canopy/frond silhouettes. Preserve shared heights/colliders, forage and creature access, safe terrace slope and open walking lane. Start with <=72 merged tufts and existing34prop/12canopy limits; verify actual geometry/draw costs. No new per-frame object work or network assets. Root owns actual baseline/feasible target and native route proof; worker owns scenery recipe/visual files and focused tests.
- Independent ownership: research/save/care files versus scenery recipe/visual files. Root owns shared main/UI integration and one final integrated checkpoint. Another worker may tackle a specifically isolated creature appearance/behavior task when it can integrate cleanly; no disconnected stockpile or concurrent writes. Use about three aesthetic passes and risk-proportionate proof. Existing cliff animation debt does not block this next batch.

Broader direction remains streamed terrain/ecology, personal atlas, individual modular Wildkin, swimming, immersive Camp food/habitats, field genetics, alternate reproduction, cloning and DNA exchange. Rules remain provisional producer choices to validate in play. Mobile/casual first with portrait priority and landscape/desktop support; offline Three.js/Rapier and local main remain. No backwards compatibility requirement. See LIVING_FRONTIER_PLAN for sequence and evidence gates.

F7B selects R1 at8.4PASS: earned wild observation unlocks a physical NATURAL / named-parent-tone choice. Owned species must earn their notes; ownership no longer falsely completes study. Native research, save failure/retry, exact guided-child reload/growth/Welcome, ordinary lichen versus guided clay, and portrait/landscape controls passed. Modal cancellation now runs in the existing always-called update, since paused fixed simulation cannot cancel it. F2D selects R2 at6.9HOLD after5.4/6.2; its framing remains below the art target.72tufts share one merged draw with19954triangles. The seven-waypoint physical Camp→clearings→safe terrace route passed at health5. Final1,127tests, verify/build/validate/ZIP PASS;44.10MB unpacked/20.53MB ZIP. Exact evidence: `art/reviews/living-frontier-f7b/receipt.md` and `art/reviews/living-frontier-f2d/receipt.md`.

## Next bounded parallel batch

- F1B: make the wet/dry transition read as a broad rolling rise and shallow depression through the existing global terrain sampler. Preserve authored Camp, both Mossling clearings, northbound valley and the terrace/safe slope. Capture actual baseline/feasible target before production. One worker owns `frontierTerrain.js` and focused tests; root owns integration. Close shared mesh/collider/atlas/ecology/scenery grounding, both signs of chunk borders, physical route and package. No water, erosion framework or dependency; up to three visual passes.
- Seed truth: runtime currently uses one fixed deterministic edition. Stored atlas/ecology seeds do not drive every placement RNG. A unified saved seed and new-world selection need a later explicit consistency slice; do not imply this exists when changing terrain noise.
- F4B may proceed independently: make already expressed Mossling body tones easier to distinguish through `wildkinAppearance.js` and focused tests. Capture actual paired bodies and a restrained target before production. Preserve rig/texture, shared wild/follower/young expression and material isolation/disposal. No eye, shape, size-band, modular-part or coat-mask claim; do not repeat rejected eye overlays.
- Root owns targets, native playtesting, shared integration and docs. Terrain and appearance writers stay separate; the third worker provides independent review or a bounded uncertainty audit. Continue the goal after this checkpoint.

## Last verified playable checkpoint

Current checkpoint: F7B/F2D receipts above. F5B climbing evidence remains in `art/reviews/living-frontier-f5b/receipt.md`. Inherited `11393c7` supplies the reusable camera and finite-world baseline; its966-test checkpoint is historical.

Initial working tree includes unrelated Verdant composer/test changes and untracked art/tool experiments. Preserve them; stage only owned files. Emberfall ravine and Tidefin V3 remain unshipped candidates with documented defects; they are not the current slice.

## Working limits

One loop, explicit state owners, bounded active objects, locally vendored dependencies, offline play. No paid fallback or publication. Reuse installed tools. Separate implementer and visual judge; choose the strongest usable of about three passes without implying owner acceptance. Keep player-facing prose short and show actual visuals. Backlog ideas are not implemented systems.
