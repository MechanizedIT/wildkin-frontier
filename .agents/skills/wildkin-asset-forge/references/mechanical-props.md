# Animated mechanical props

Owner direction (September 11, 2026): machines, containers and ruins must visibly operate, open or activate. Satisfactory is a reference for understandable mechanical activity. This is a motion requirement, not a request for its production-network systems.

## Model for a purpose

1. From the reviewed target, name what moves and why: a deposition carriage along a gantry, nozzle on a connected actuator, chest lid on a rear hinge, seated crystal/ring or buried ruin petals exposing a chamber. Reject unsupported floating parts and motion that contradicts the mechanism.
2. Keep static shell parts in one material batch where practical. Export each rigid moving assembly as its own named node, with local axes, rest transform, pivot and safe travel range recorded in the manifest. A rigid prop normally needs a node hierarchy, not a deforming skin/armature. Use bones only for actual flexible structures.
3. Mesh separation must follow seams and preserve closed exposed surfaces. If a source is fused, use a bounded Blender split and repair the new inside/back faces; generate a replacement part if clean separation would destroy the shape. Preserve UVs and the approved silhouette. Do not decimate away hinges or actuator walls.
4. Export glTF named nodes. Parent a nozzle to its carriage and place an output empty at the tray. Keep motion clear of buttons, panel faces, products and the player. Inspect idle, both extremes and at least one full cycle from front/rear and the actual landscape game camera.

## Runtime and state

- Instance node transforms must be independent; geometry/textures may remain shared. Never animate cached source templates or merge movable nodes into static draw batches. Explicitly tag procedural movable subtrees before batching.
- Drive small analytic rigid motion or baked glTF clips from the existing update owner and the one game loop. No extra rAF, timers, physics world, per-frame DOM creation or unbounded effects. Three.js node transforms/AnimationMixer already provide the needed mechanics.
- Use real owner state for idle/operating/completed/opened. Crafting spends and rewards once through the save owner; restarting a presentation cycle cannot create another item. A replayed open animation cannot reopen a reward transaction.
- Pause and Author isolation must stop/suppress activity. Removal, region travel, reset, reload and shared-instance tests must leave no orphaned motion, collider or effects. Persist gameplay outcomes, not arbitrary sampled animation frames.
- Keep collision deliberate: a non-walkable machine can retain a simple static shell footprint. Any traversable moving door or lifting platform must synchronize physics and visual motion; never imply an open passage while its collider remains shut.
- Show a quiet completed state and actual output or opening; a blinking light alone does not meet the owner's request. Respect reduced-motion settings without hiding operating/completed status.

## Admission evidence

Record exact GLB hash, node names/pivots/axes/ranges, draw/triangle/texture budget, target image and independent judge. Capture two instances with only one active, operation → completion → idle, pause/travel/reset and ordinary native interaction at 844×390. A still render only admits the shape; actual runtime-cycle readability is a separate gate. Physical-phone performance remains owner/device evidence.

## Lessons from the vault and field chest

- A solid box beneath an opening lid is not a container: model a supported floor, four walls and an interior underside. Keep catches and keeper pads separate at the seam, including physical clearance in the closed state.
- Inspect the actual exported pivots, not only the Blender scene. Empty transforms can export incorrectly even when the source viewport looks right. Fresh-import the final GLB for closed, released, halfway, open and rear views.
- Review intermediate and final hardware poses. The field chest's catches first need to swing clear, then fold flush once the lid is high enough; leaving them released at full open made antenna-like protrusions. Reverse the same clearance-safe path on refill.
- Derive each mechanism from the appropriate authoritative state. The vault reveals after its seal opens and blocks collection until its tray is ready. Ordinary lids animate after the existing claim and close when existing refill availability returns. Neither animation grants rewards, and a generic lid must not bypass a species seal.
- Freeze each reviewed revision and its images under a distinct directory/hash. A small geometry correction still creates a new candidate that requires reinspection; a prior score cannot silently transfer to new bytes.
