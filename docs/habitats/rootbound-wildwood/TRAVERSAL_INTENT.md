# Exploration through climbing and clearing

Owner steering, September14: Rootbound should include easy paths and places that require effort to enter. The player has climbing and can destroy harvestables; universal ordinary-walk reachability is not the habitat goal. Chris can playtest exploration and raised the possibility of later broad decor destruction and a cooldown emergency evacuation. Those two systems are proposals, not current implementation requests.

## Current capabilities

`src/movement/climbProbe.js` admits suitable active traversal faces with ledges1.2–4m above the feet, direct approach, adequate top support and a capsule-clear exit. `climbingController.js` handles climb, hold, descend, mantle and detach, including invalid or blocked situations. This foundation does not establish arbitrary tall-wall or all-decor climbing.

Solid harvestables lose their colliders on complete depletion through the existing resource lifecycle, with later respawn behavior. Verify the actual selected resource's identity and lifecycle when a route depends on clearing it; do not assume every decorative log, stone or tree is harvestable. Ordinary scenery has no universal damage/depletion system. There is no general cooldown evacuation action.

## Rootbound planning adjustment

- Keep a readable ordinary main outing and a return route. It need not be a conspicuous paved corridor through every room.
- Label optional pockets by access intent: ordinary movement, eligible climb, existing harvestable clearing, or proposed future capability. A slope that fails an ordinary walking check is not automatically a rejected design.
- Explore one or two local climb/clear discoveries with distinct visual cues and a plausible return. Do not require a broad destruction or evacuation system to make the current habitat playable.
- Do not use imagined future escape to excuse an actual inescapable hole. Optional difficulty and an unintended softlock are different outcomes.

## Focused proof instead of exhaustive accessibility

Spend effort on the main outing, essential interactions, intentionally used climb/clear transitions and suspected traps. Repeat checks when related geometry or behavior changes; avoid rerunning a habitat-wide walking search for every decorative or reference-image revision.

For a climb-dependent pocket, check a reachable eligible face, supported clear mantle, descent/return and blocked-exit behavior. For a clearing-dependent entrance, use the actual harvestable and confirm visual/collider removal, reentry and persistence/respawn behavior. For a suspected hole, establish a real escape or reject that trap. Preserve required shared-system and aggregate checks at runtime checkpoints.

Chris's playtesting should judge route discovery, effort, fun and perceptual readability. Supply concise player-facing instructions describing the landmark, action and visible failure signs. Agent checks still cover deterministic failures that should not consume human playtesting time. No claim of complete terrain reachability is required.

## Future proposals

Broad decor destruction could begin with stable-ID removal or damaged-state swaps, bounded brief debris effects and streamed persistence, rather than permanent dynamic rubble. Assess destructible-instance counts, batching, collider removal, save growth, respawn and landmark continuity on an actual device before calling it affordable. Ground terrain itself is a separate scope.

A possible emergency evacuation would return the player to a nearby validated supported clear point with cooldown. It needs its own design for destination validity, inventory/health preservation, combat use, companion handling and reload behavior. No cooldown duration, penalties, UI or implementation is approved here. It would provide recovery, not replace basic prevention of unavoidable traps.
