# Second overnight run — September 11, 2026

## Owner mandate and evidence

Chris explicitly resumed goal-mode development after testing on his phone. Continue useful implementation/review cycles until he says stop. Act as producer/orchestrator, make routine professional decisions, use independently assigned domain implementers/reviewers, and keep the game locally playable. This supersedes the previous wrap-up pause; it does not erase accepted engineering rules. Re-read this brief at each integrated checkpoint and after context compaction.

Owner reports the game generally looks good and the gather → return → deposit-in-pod loop worked easily. These are positive observations of that short journey, not whole-game acceptance. Reported issues and new ideas below take precedence over old agent visual scores.

## First priority: actual phone experience

- Backpack cells are rectangular in both orientations: make them square without shrinking useful touch targets or hiding inventory access.
- Dragged item sits below/right of the finger: center it above the finger with edge clamping; drop targeting still follows the real pointer. Preserve mouse/tap/keyboard and quantity transactions.
- Chrome browser chrome takes space: provide a user-initiated fullscreen control where supported and a clear, unobtrusive fallback where unavailable. Handle changing viewport and safe areas.
- Landscape camera feels too distant: add bounded useful zoom and evaluate framing at the real reduced browser height. Pinch must not steal an active joystick or menu touch; keep fixed pitch and camera-relative movement.
- A static joystick picture and “Move” text appears in landscape: use the actual control with a coherent resting affordance and touch-origin movement. Keep portrait playable; landscape remains the primary layout pending further owner preference.
- Prefer ordinary rounded corners over clipped/chamfered UI. Review all game menus for legibility, hierarchy, unnecessary steps, misleading affordances and hand occlusion.
- The first Forest Edge tree took one/two hits then stopped until repositioning: reproduce; inspect auto-target, harvesting cooldown/pending yields, target geometry/vertical reach, line of sight and input latches. Do not assume the owner's suggested height cause is correct.
- **Owner correction, September 11 evening:** keep hitting a harvestable until depleted whether earlier drops were picked up or not. The pickup-dependent pending-yield gate is unwanted behavior. The first attempted recall fix preserved that gate and is superseded; restore continuous harvesting across the shared resource path while retaining uncollected rewards and bounded storage.
- Mossling's projected button moves jerkily; hints disappear too quickly and vary between taps. Fix moving world-prompt presentation and replace introductory inspection with observation knowledge that can be reread.

## Observation proposal to implement and review

Watching a creature within a meaningful range over time discovers persistent Journal clues about behavior/taming. Sneaking, facing/occlusion and the creature's hearing/vision should make observation an in-world choice. Different species have different durations/danger; use a short first insight and a longer deeper insight if it stays understandable. Avoid mandatory timers that obscure all basic controls or lock known taming behind grind. Exact timings, interruption decay and rewards are provisional. Reuse existing perception and save owners; don't create a parallel simulation or another RAF.

## Subsequent complete slices

1. **Crashland preparation loop:** damaged escape/landing pod from a colony/research vessel, helpful maintenance drone, scattered cargo/relays leading to larger wrecks. One survey wreck → recover blueprint/parts → meaningful pack/tool upgrade → newly reachable obstacle/resource. Keep alien ruins distinct from human wreckage and use visual clues over long exposition.
2. **Defended expandable Camp:** emergency barricades rather than a farm fence. Clear adjoining areas with a resource cost that extends the perimeter automatically. Preserve placed structures and routes; make before/after footprint and collision truthful. Local hands-on station crafting remains central.
3. **Loadout and material progression:** flexible Minecraft/ARK-like hotbar assignments, distinct harvesting tools and resource requirements, a ranged weapon/ammunition, readable creature toughness and simple clothing/armor equipment. Keep the starting recovery tool useful. The idea that hotbar items survive field death is a proposal to balance against current keep-pack death behavior; don't silently claim the owner selected an exact loss rule.
4. **World/ecology:** unique larger regions, curved/overgrown routes, elevation, gravel/streams, natural concealed boundaries, purposeful spawn/harvest/ruin placement without overlaps. Species groups, stealth, dangers and companion autonomy should support the expedition choices. Review as a professional level designer using actual traversal and readability, not only coordinates.
5. **Assets/motion:** continue approved Explorer-style faceted, matte, high-contrast alien assets, minimal shading/no reflections. Retain neutral references, texture/UVs, deliberate mobile detail and articulated machines. Complete pending Tidefin action/continuous/native review before admission; inventory remaining creature/prop/ruin/tool families and replace prototypes in bounded batches.
6. **Sound and feel:** inspect current audio implementation; improve impacts, harvesting, UI, wildlife, environment and machine feedback. Research suitable free/open local generation or licensed assets only where it improves the result. Prefer lightweight offline assets/procedural synthesis to large new dependencies; track license/provenance. Three.js is not assumed to supply suitable game sounds automatically.

## Production rules

- Use `.agents/skills/wildkin-development/SKILL.md`, Dream Loop and Asset Forge as relevant. Existing accepted targets stay fixed unless owner steering changes them. New visual families require actual current view → generated target → independent target review → implementation → independent actual-view review. Ordinary correctness fixes don't need synthetic art targets.
- One writer per shared file; root owns integration/current status/canonical world generation. Workers get explicit ownership and bounded proof, reviewers act as relevant UI/UX, level, animation, systems or audio professionals. Root closes sibling contracts and reconciles feedback. No repetitive full suites per worker or unnecessary frameworks.
- Root checks meaningful native interactions early. Use focused tests, then required aggregate verify/build/ZIP at coherent checkpoints. Separate fixtures, earned play, stills, continuous playback and physical-phone proof. User observations override test counts.
- Work directly on main with cohesive local commits. The preceding GitHub backup is verified at85d249a; this run does not assume permission for deployment or paid services. Credentials/browser saves/model runtimes remain outside source control.
- Keep Blender/inference gentle: one heavy job at a time, existing RAM/VRAM guards, bounded CPU previews, no huge subdivision/remesh, no closing unknown user processes. Do not lower safety guards. Free/open tools may be researched as authorized, but don't install something merely because it exists.
- Maintain concise progress/current status. At each checkpoint: record changes, actual proof, remaining limits, next bounded work. Continue a new review/refinement pass when the plan is covered; stop only on Chris's instruction or a genuine external blocker, not an arbitrary hour budget.

## Rolling status

- Goal active; first evening candidate closes on local main from85d249a, with older experimental untracked files preserved. No new remote publication.
- Phone corrections and quiet Journal observation are integrated and independently reviewed.842tests/world/campaign/build/validation/ZIP pass,42.56MB unpacked/20.26MB ZIP. Touch/emulated fullscreen/pinch and naturally earned first-note reread/reload pass; moving-label native check remains separately tracked. Physical-phone/whole-campaign and second-note native completion are not claimed.
- Chris corrected the harvest policy during review. Removed the next-hit pickup gate and earlier recall workaround. Native stationary auto-harvest completes all5treehits with5wood still lying uncollected; focused tests also cover manual/tree/rock/fiber/custom ore, full pack, partial/failing writes and regrowth bounds.
- Survey Recovery plan is recorded in SURVEY_RECOVERY_SLICE.md. Camp composition target independently passes8.3; barricade model candidate is being built separately. Next: model review, save-compatible Camp layout/defenses and reachable adjoining-yard clearing, then survey-cartridge/pack fitting and Rootfall passage.

-22:45 Camp checkpoint:867tests/build/ZIP pass,42.97MB unpacked/20.29MB ZIP. Defended apron + saved three-bundle clearing + reachable cost console + adjoining automatic perimeter are integrated; legacy structures/storage preserved. Independent target/model8.3 and bounded native8.0 pass. Native entrance crossings, diagnostic clearing/payment/reload, Author Edit suppression and all three cleared-site full-crate reload/import regressions close the new contract. Yard-edge dressing/berm rhythm/quiet ivory stipple remain later polish.
- Animation/video question researched honestly: Explorer uses Mixamo; current Moss V3 uses fitted proxy weights and measured CC0 Wolf reference, not generated video. Mesh2Motion Fox preset is incompatible without fitting. MOTION_REFERENCE_PLAN records exact sources and free-video limits; no new generator installed. Continue current normal-speed motion review before another donor experiment.
