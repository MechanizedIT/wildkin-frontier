# Wildkin workflow retrospective

September 11, 2026. This records production lessons from the overnight work and physical-inventory cutover. It is a workflow review, not final package admission or owner approval of every art/balance choice.

## What worked

- **Separate target, production and judgment roles.** Exact reference/model hashes and independent image review prevented a successful export or persuasive implementation report from becoming automatic art approval. Locked targets survived failed versions.
- **Scripts for reproducible construction and exact contracts.** Small composers, export checks, quantity tests and real-Rapier fixtures made model revisions, world placement and save failures reproducible. They were especially useful for geometry bounds, true hulls, ground clearance, source parity and rollback.
- **Fresh export plus actual game review.** Neutral renders exposed construction mistakes; gameplay views exposed camera cropping, dark silhouettes, interaction occlusion and scenery hiding the Explorer. Author/export/reload and package checks caught paths that studio renders could not cover.
- **Concrete earned journeys.** Starter gathering/return/build and earned Tidefin attempts revealed route, supply and instruction problems. The inaccessible central Tidefin home was moved toward a real dry bank; tool-delay-confounded failures were not treated as proof of unavoidable difficulty.
- **Small repairs across real siblings.** Shared body-clear callouts, per-instance fading, truthful convex prop support and finite inventory transactions were checked across their callers rather than patched only at the reported screenshot.
- **Explicit ownership.** Root owned integration and final state; workers owned isolated modules or evidence. This allowed UI, art and contract review to progress without concurrent writes to canonical world data.

## What failed or cost too much

| Approach | Evidence and lesson |
| --- | --- |
| Treating metrics as appearance | Closed meshes, low triangle counts and matching bounds still produced blocky outcrops or weak silhouettes. Scripts help establish facts; direct image judgment is irreducible. |
| Repeated cosmetic geology revisions | Beveled blocks, repeated ribs, rectangular stairs and exposed connectors missed the locked natural-rock target. Structural changes to unequal masses and truthful convex assemblies were more useful than further color/profile adjustments. Several geology candidates remain rejected. |
| Flat overlays on analytic terrain | Gravel ribbons showed stripes/z-fighting where analytic height differed from the rendered terrain grid. Surface conformity or grounded irregular detail must be established before adding more painting. |
| Generic rig or height-mask shortcuts | Coordinate assumptions and inappropriate weight ownership produced joint damage and cheek hooks. Fitted proxy/anatomy methods, actual local weight inspection and compatible root/body weights were more reliable; they still required exported loaded-pose review. |
| Losing texture/source fidelity during processing | Surface appearance could change despite nominally unchanged assets. Preserve the original albedo/UV source, inspect color-space/byte handling and compare the fresh GLB under matched lights. Never discard the approved source to conceal a pipeline defect. |
| Calling subtle motion finished | Tidefin's neutral/limited deformation passes did not make Attack/Hurt readable at species scale. The replacement remains unshipped; its preserved action revision still needs independent motion/native admission. |
| Proving the menu before proving access | The inventory component fit the viewport, yet the pod's normal world interaction could be hidden. Integrate a real approach → open → transact → close → walk away loop early. |
| Over-trusting proof harnesses | Hidden zero-size buttons, wrong input assumptions, stale authored data and tool delays produced misleading results. Correct the harness and preserve exclusions; do not relabel a failed fixture as success. |
| Large logs and repeated context loading | Broad reads and oversized outputs lost useful evidence and consumed time/tokens. Several sprawling handoffs blurred active versus completed tasks. Prefer a short current-state guide, code map, exact artifact path and one bounded question. |

## Contract lessons from inventory/resume

- The pack and containers need one saved quantity owner; shortcuts and old counters are views. Capacity, partial claims, recipe costs and refunds must conserve quantities across failed writes as well as success.
- A successful import initially left an old snapshot provider attached, allowing later pagehide to overwrite imported run state. The provider was detached on success and a post-import checkpoint was reproduced.
- A failed death save initially left a dead active run vulnerable to a later snapshot. The repair holds resolution, retains the previous record and retries before returning to Camp.
- A minimal expedition snapshot preserves mobile interruption expectations without serializing every creature/projectile. Paid unfinished attempts and rebuilt actors are explicit limitations, not invisible full-world persistence.
- The real-Rapier step study rejected propagation-only as a blanket replacement for simulation: moved and newly enabled/created colliders could remain stale in broadphase queries. That performance idea is a future bounded experiment, not an implemented optimization.

## Standard approach next session

1. Start with [SESSION_START.md](SESSION_START.md), current owner feedback, newest [CURRENT_SLICE.md](CURRENT_SLICE.md), actual Git state and [CODE_MAP.md](CODE_MAP.md). Historical mandate text must not restart production after a playtest handoff.
2. Choose one player-visible vertical slice and one production writer per shared file. Use independent bounded reviewers where uncertainty warrants them. Keep ordinary implementation judgment with the producer; reserve owner questions for meaningful unresolved choices.
3. Reuse the project skill at [wildkin-development](../.agents/skills/wildkin-development/SKILL.md). It routes to existing Asset Forge/Dream Loop instructions instead of copying those manuals or creating a new production framework.
4. Keep the accepted target fixed. When a method repeatedly misses, preserve the rejected candidate and change the method. Separate reference, model, deformation, continuous motion, native scene and physical-phone gates.
5. Prove the actual access/effect early, then its changed save/physics/Author siblings. Label fixture versus earned, source versus dev versus package, and sampled frames versus watched motion honestly.
6. Run focused checks during development and one coherent parent-owned aggregate/package closure. Record the exact final revision, retained candidates and limitations, then stop for Chris's requested playtest.

The repository-local `.agents/skills/wildkin-development/SKILL.md` is the standard skill entry point for future repository sessions. No user-wide skill copy or tools installation was performed. If a future host does not list project skills, open this file explicitly; investigate discovery before creating a duplicate installation.

This session produced a stronger playable foundation, not completed commercial art, a finished crash-land story or measured physical-phone performance. The next priority should follow Chris's play observations rather than the length of the remaining agent backlog.

## Second overnight corrections — September 11 evening

- Do not describe an implementation guard as desired game behavior without checking the accepted interaction. The inventory cutover blocked a harvestable's next hit until pickup; the first attempted repair recalled its drop while preserving that guard. Chris explicitly prefers continuous depletion regardless of pickup. Remove the gate across manual/auto resource families and bound outstanding rewards by the finite harvest cycle instead. Quantity safety is a requirement, not permission to add an unwanted player chore.
- Independent phone review found issues that isolated arithmetic missed: short-landscape square grids concealed later rows, portrait controls overlapped, and the guide covered Auto-harvest. Actual viewport captures and real scrolling/touch input are necessary alongside slot-size assertions.
- A live observation test cannot assume two clues arrive after standing at one fixed vantage for14seconds: normal animals wander, notice the player or leave sight. Inspect the actual interruption reasons, earn notes through the real simulation, and verify rereading/reload. Do not freeze AI or loosen design rules merely to make a timing assertion pass.
- Reset gesture ownership on capture loss and viewport changes, not just pointer-up. Verify a left joystick and two right pinch touches together. A fullscreen request succeeding in desktop mobile emulation still leaves actual-phone browser support and comfort for the owner to judge.

## Second-run Camp and motion lessons

- Prove a useful starter build against the actual scenery, route reserves and terrain before accepting a clear-looking bay. The first Camp bay failed; moving outboard decorations allowed a supported bench and crate without terrain grading beneath old saves.
- Permanent clearing crosses more than mesh visibility: final-hit save, reward creation, collision, respawn, region/Author state and construction reservations must agree. Independent review caught invisible reservations left by removed debris; the repaired validator is covered by full physical crates at all three cleared sites through reload/import.
- A generated video can propose motion, but cannot supply reliable anatomy or editable joint curves. Mesh2Motion source inspection found nonhuman rotation mapping incompatible with the current Mossling chain/bases without fitting. Reuse existing measured Wolf reference and finish continuous review first; see MOTION_REFERENCE_PLAN.md.
- Windows occasionally denies atomic replacement of world.generated.js while readers hold it. One scoped in-place regeneration copied the generated bytes after rename failed; check-world verified exact source synchronization. Do not close unknown user processes to release a file.

## Survey recovery lessons

- V1's correct bounds and low triangle count still looked like a pristine shed. The useful revision changed load-bearing ribs, broad armor, broken terminations and hull plates against the unchanged target. It passed after structural work, not cosmetic bevel/noise accumulation.
- A plausible breadcrumb position blocked the actual approach. Ordinary position-guided keyboard walking exposed it before admission; moving the fragment beside the path restored the route. Preserve the failed fixture and inspect the complete approach, not only the chest interior.
- The coarse route analyzer called the .18m floor an impassable wall even though native Rapier walking worked. It now recognizes ground-level lips within the controller's existing step limit, while raised thin platforms and tall slabs remain conservative blockers. A route estimate remains distinct from physical traversal.
- An item reward extends the full contract: catalog IDs and quantity bounds, shared-table Author editing/export/rejection, finite partial/full-pack claims, save failure/retry and actual discovery/fitting. Reuse the existing transaction owner and pack tier; do not add a parallel blueprint ledger for one upgrade.
- Readable fourth station options and inventory item descriptions outlive transient pickup notifications. The current milestone toast can still replace the pickup hint; that is a separate known notification-coordination issue, not proof that a brief toast is sufficient instruction.


## September 12 — overhead-driven region iteration lessons

- Keep both a clean orthographic measurement map and an oblique overview using the same live scene. A strict vertical map hides cliff faces; an angled target cannot fairly be judged only against it. Native walking/jumping remains the proof of usable elevation. The atlas now exposes `overview()` with real heights and explicit camera metadata, separate from the metric planning overlay.

- Do not inherit a generous visual score as truth. A fresh director found that Verdant's7.3 review understated the empty interior and reversed the bay's north/south orientation; V5 scored5.8. Use world−Z=north explicitly, judge grove-sized masses before scattered details, and compare the real renderer's water radius when connecting ponds. Reusing18 perimeter trees as interior groups improved composition without growing the canopy count. Appearance still needs native and independent review.
- The cliff-kit study caught double sRGB conversion: already-linearized swatches were stored into an sRGB image and decoded again. Verify raw palette pixels and actual embedded GLB images, not only material constants. Correcting color did not fix prototype geometry. V2 ring shapes5.2 → V3 structural blocks6.4 → V4 revised blocks5.5 triggered the prescribed owner check. Chris then explicitly accepted V3; integrate those exact exports and restore the matching builder, preserving V4 as rejected. Do not inflate the old score, rebuild accepted geometry, or extend acceptance to Rootfall/Tidefin. Free artist-created geometry remained reference research, not a runtime substitution.
- Do not classify world `props` as decoration from their name. They include authored ore, flowers, berries and Wildkin via asset gameplay roles. The first upland composer retained ordinary resources and Mossling but removed five other gameplay IDs; the campaign check caught the missing renewable iron and encounter count. Preserve the full role/identity inventory across composition, with actual collider and harvest approaches.
- Navigation evidence must follow the authored route. Holding both keyboard axes toward an endpoint cuts corners. The revised diagnostic follows each segment with a short look-ahead and records lateral error; an off-route stop is not evidence that the route is blocked.
- Capture source hashes before/after browser evidence, rather than copying a previous revision's hash into a report. V4's first native receipt lacked those snapshots; corrected provenance is explicitly reconstructed from file times, and the reusable harness now records hashes itself.
- Thick canopy walls can improve an overhead thumbnail while covering the player at gameplay pitch. Judge both views. Trunk-only physical descriptors must apply to every canopy variant, and camera-inside foliage needs visibility handling because one-sided raycasts can miss exit faces.
- A path that succeeds downhill can still fail uphill. V6's full West Hollow return exposed a roughly51° support-edge rise next to Rootfall; earlier endpoint walking did not cover that direction. Softening the support feather retained the raised lane and restored both directions under the existing controller. Verify the actual path and changed join, without loosening global slope/step limits.
- Model acceptance and whole-scene assembly are separate decisions. V3 rocks are accepted, while V6 scene review6.9 calls for overlapping broad formations in place of isolated rocks against bare slopes. Reuse the accepted mesh vocabulary and existing instance budget before producing more assets.

## Blender tool trial and final V7 lessons — September12

- Check tool result semantics as well as transport. A runtime-doc call can report MCP isError:false but found:false/unsupported; both paths need explicit assertions. Likewise, a returned screenshot may show a first-run setup overlay. Inspect actual content before claiming visual access.
- Version assumptions cost time. The new bpy-dev bridge's API lookups failed on4.5, but passed on separately installed official5.2.1; the existing production install was preserved. Isolated live/saved-file review and runtime docs are useful additions, not automatic topology or motion improvements. Record host-local installation and restart/discovery limits.
- Tune the material path actually used. Verdant routes were gravel, so changing generic palette.path did nothing. Adding optional palette.gravel through Author→validated world→terrain painter fixed the visible color while preserving default pixels in sibling regions.
- Raised perimeter seams can occur between terrain samples along the wall. Sampling half a station either side, as well as inward terrain, fixed V7's crest undercut with the same mesh/collider budget; existing all-region physical boundary tests remained authoritative.
- Separate immediate magnet pickup from settled-drop recovery. Manual collection proved one yield; it did not diagnose AutoON's stationary five-yield pile. The later position/terrain/range receipt showed all quantities safely above terrain but beyond magnet radius; normal walking recovered all five. Do not call a pickup failure fixed by merely disabling Auto in the test.
- V7's warmer paths and grouped rocks improved the scene to7.3, but the same detached-rock/flat-terrain gap persists. The next useful experiment is one complete cliff face with its terrain/grass contact, not another region-wide coordinate adjustment or reopening owner-accepted models.

- Owner clarification can close a narrow perceptual hold without another modeling cycle. After seeing the phone comparison, Chris accepted the grass rising into the cliff and suggested selective grass/rock dressing. Preserve the original review score, record the exact scope of acceptance, and retain the verified runtime instead of restoring a failed experiment. Keep routes, resources and actor silhouettes clear; do not dress every join gratuitously.

- A new Backpack strip affected the sibling storage view: passing pack-only dimensions did not prove storage. Keep short-screen transfer views focused, expose hotbar configuration through their header, and verify one entire square row plus fixed footer/status visibility. Minimum button dimensions alone do not detect a control outside the panel or a clipped item count.

- Region composition must audit new scenery roles as well as preserve old gameplay IDs. A decorative Shatterfen crystal reused a harvestable asset and silently created another renewable node. Resolve each added asset's gameplay role and keep non-harvestable scenery visually distinct from real resources.
- Preserve the previous local terrain-detail contract when replacing a whole surface. Shatterfen's admitted bank retained its models but lost paint-only approaches and full-foot burial until the bank support/paint transaction was reused after terrain rebase.
- `tools/generate-world.mjs` starts an asynchronous main without exporting its promise. Awaiting module import produced a receipt with the previous generated-file hash. Wait for its process to finish before hashing, and preserve actual capture manifests when repairing a receipt.
- A route harness must target accessible approach space. Walking to a solid resource's center correctly stops at its collider; use its reachable interaction position and test actual harvesting instead of reporting that stop as a terrain defect.
- Check every scripted interaction radius, endpoint tolerance and return segment before a long run. A waypoint's saved spawn is not its interaction center, and a0.48m stopping tolerance can leave a nominally in-range destination outside the real radius. Reverse the authored detour instead of cutting across its outcrops. After a harness-only failure, retain proved segments and use a disclosed checkpoint fixture for the remaining work; do not replay the entire route for each script correction. Give each attempt a fresh evidence directory.

## 2026-09-12T13:11:25.890Z — camera and stopping-point closure

The independent camera review caught both an incomplete runtime-solid registry and below-trimesh focus classification that point-overlap tests missed. An upward-clearance shortcut then overreached into valid lintels. Final correction uses the existing active-surface height and desired-to-smoothed sphere corridor, explicit construction registration, and canopy camera exclusions without changing gameplay collision. Zero-distance camera orientation remains independent of distance.

Native harnesses must use current canonical objects and physically clear starting positions: a removed old tree ID and a sampled point inside scenery produced two fixture failures, preserved before corrected proof. The passing final32 focused checks and966 aggregate boundary are different from physical-phone feel. Emberfall's3/4 candidate was retained with a .candidate.mjs opt-in suffix rather than leaving the normal suite broken or weakening its full-width grade assertion. SESSION_HANDOFF_2026-09-12 captures the complete workflow and restart path.
# September 12 Living Frontier lessons

- A mesh following a bone proves attachment, not anatomical placement. For a tiny feature painted into an AI mesh, identify the actual visible feature with matched camera/UV-ID renders before creating geometry. Judge the first close front and three-quarter result before additional pose exports. Guessed coordinates and plausible UV islands consumed eight local eye candidates without producing an admitted result; three reviewed static results were still wrong. Ship the usable bounded fallback and retain the failed requirement explicitly.
- Tintable iris vertices must be white, with a black pupil. Tinting a teal vertex ring multiplies colors and cannot express arbitrary eye hues faithfully.
- Procedural terrain queries must describe the full route, including joins between authored profiles. Testing a ramp column missed a max-of-two-weights trough that was absent from the mesh. Complementary ramp/shelf weights now sum, and the crosswise crown route is checked.
- PowerShell searches must use `rg ... directory -g 'pattern'`; shell-expanded filename wildcards are unreliable. Parse the minified world JSON and select records rather than returning its entire line.

### September 12 — nursery geometry and developer save fixtures
- Compare decorative heights against the actual supporting surface: a bowl rim at.545m was hidden inside a moss top at.55m. Raise the bowl visibly; keep the collider/footrest contract explicit.
- Prefer the normal save import owner for cross-origin diagnostic fixtures. Replacing localStorage while an old run is active can be overwritten by its existing save lifecycle during navigation.
- Clear device-metrics emulation before changing orientation/DPR. Verify CSS dimensions and reframe an offscreen world subject; do not mistake a stale compositor capture or offscreen anchor for a layout defect.

### September 12 — garden foliage and rendered cost
- Inspect the local geometry axis before rotating repeated foliage: the leaf blade grows along+Y, so upright/edge-on blades read as thin flower stems. Staggered outward radial tiers produced a fuller shrub in one meaningful second pass.
- Count visible triangles times InstancedMesh.count, not unique geometry or hidden objects. A temporary real-factory thumbnail renderer supplies actual WebGL calls/triangles and keeps catalog pictures consistent with changed physical models. Dispose its resources and context; menus still use static PNGs.

### September12 — nursery reservation and mobile priority
- Check sibling reservations beyond the directly occupied object. Blocking care only on the growing child's own bed still allowed another paid care assignment that Welcome would overwrite. A single-nursery foundation now makes those states globally exclusive in runtime and import.
- A young scale that looks plausible numerically can read as a small prop at gameplay distance. First-stage70% preserved recognition after55% failed review; anatomy and animation remain unchanged.
- Exact identity test fixtures should include every new canonical field; preserve full record equality instead of stripping sex/lineage to make an older assertion pass.
- A nearest object behind the player can suppress a visible object's world action in portrait. M1 must consider target readability along with physical range, while retaining authoritative activation checks.

### September12 — portrait controls and visible-action closure
- A shortcut assignment screen is not an equip screen. Before collapsing controls, perform the complete native replacement action; the compact tool button now exposes actual selection.
- Optional flags must become explicit booleans before DOM classList.toggle(force). Undefined can behave as an omitted force and alternate a class every frame; verify ordinary targets without the optional field, not only feature-specific records.
- Visibility filtering belongs before final nearby selection, with fallback across sibling owners. Reuse bounded target caches and one wall/render timebase; detached occluders must not block cached targets. Follow decorators through to the final anchor before reporting a mismatch.
- For bulk document edits, use named replacement records or explicit tuples with expected-match assertions. PowerShell single nested arrays can flatten into strings; inspect diff scope immediately and recover only your own edits from known clean evidence if needed.

### September12 — streamed scenery and portrait framing
- Count composed prefab meshes/draws before scattering. Small reed/lily/mushroom models used10–30draws each; merging their indexed parts with transforms and vertex colors preserved the kit at one low-scenery draw. Retain shared GLB templates and dispose only owned merged geometry/materials.
- Measure full composed asset bounds, not the first named part. A mushroom cap extent was initially mistaken for the full cluster; all parts and placement scale determine its actual gameplay silhouette.
- Project proposed positions through the actual portrait camera before allocating several visual rounds. A broad protected route left the first trees outside the viewport. A narrower still-clear lane and smaller nearest canopy improved visibility without changing the camera.
- Build image targets from the real admitted kit as well as the baseline. An empty ground screenshot let the mockup invent layered leaves and dense grass absent from the available assets. Retain honest below-target scores after the bounded pass budget.
- Prism collision faces need outward winding; size/height checks alone cannot detect inward faces. Verify normals before native solid-contact proof, then check retirement/return counts across the complete mesh/collider/fade/LOS lifecycle.
- Audit shipped animation clips before asset production. Explorer already has Climb/Mantle/Fall; the remaining natural-climb problem is physical control, phase/rate, pausing and gameplay contact evidence.

### September12 — physical climbing and grounded truth
- Rapier's raw `computedGrounded` can treat a tall wall or the shelf behind a capsule as support. In the real terrace fixture, repeated Jump edges reproduced a wall ratchet above the ledge. Grounded movement now requires a central slope-aware sole hit: flat support within5cm, with capsule-rise allowance through45°. Keep the real repeated-wall-jump regression; it distinguishes ordinary repeated jumps from the contextual Climb action.
- A stale full-height fall test exposed the same false support and must retain its lower-floor, exact-once impact requirement. Do not weaken a physical landing assertion to accept a cliff normal or invented grounded state.
- Staged Climb/Mantle/Fall clip metadata and the R3 pose improved readability, but palm placement, boot contact and the mantle weight transfer remain an art hold. Sampled stills can validate poses; never describe unwatched video as accepted continuous motion.

### September12 — parallel research/scenery and native closure
- Cancellation cannot live only in fixed simulation when the main loop pauses that simulation behind a modal. Check the actual caller and put transient UI cancellation in the existing always-called update. Unit invocation of a paused helper does not establish native modal behavior.
- Owning a species and earning its field research are separate facts. Use earned saved stages for observation and unlocks across all species; do not silently backfill research from ownership.
- Density counts are not visible fullness. Plot soft patch anchors against the actual portrait frame before production; behind-player patches and occluded edge patches can spend the entire geometry budget invisibly. After three passes, retain the stronger earlier candidate and its below-target score.
- Save the few owned candidate files before a later aesthetic round so selecting an earlier result is exact. Reverse only that round, including clearance constants; never restore HEAD over parallel uncommitted work.
- In-app browser screenshots may clip or wrap at a surface smaller than an emulated phone. A60% emulation scale plus matching screenshot clip preserved the full412x915CSS viewport here. Restore100% scale for native clicks; scaled captures did not reliably preserve AX click coordinates. A clean tab alone did not fix the compositor limitation. Keep original evidence and disclose capture dimensions.

### September12 — rolling terrain and body-tone comparison
- Check both horizontal and vertical camera projection before locking a terrain comparison. At the normal42degree portrait camera, a proposed feature farther ahead can be above the frame even when its X coordinate fits. Use actual world-to-screen projection; a map sketch or horizontal FOV estimate is insufficient.
- After changing emulation scale, capture in a subsequent browser call once the compositor has settled. An immediate screenshot in the same call can still contain the old full-scale crop.
- Programmatic save import deliberately detaches the old runtime snapshot provider. Always perform a literal reload after a diagnostic import, matching the real import UI. Continuing without it produced a false outing-save failure despite healthy storage; the normal return lifecycle and clean reload were sound.
- For a shared material adjustment, compare actual cached models at fixed scale, pose, lighting and sRGB output. A one-off render target can supply a neutral fixture without another frame loop or renderer. Still inspect the real actor at gameplay scale; neutral enlargement does not establish phone readability.
