# Composite harvestables — partial clearing and persistent landmarks

**Dossier key:** `rootbound.system.composite-harvestables`
**Status:** proposed design; no runtime implementation.
**Audience:** designer draft; player-facing claims await gameplay proof.

Chris proposed a large tree made of independently harvestable parts: destroy a root to open a passage while leaving the rest of the tree intact. Treat this as Rootbound's preferred candidate for localized environmental clearing rather than requiring every landmark to disappear as one resource node.

## Player experience

A substantial tree remains recognizable before and after gathering. One low root bars an interesting opening; bark wear, cuttable root scale and a harvest cue make the possible action legible. Cutting that root yields its own material and reveals a usable gap. The trunk, canopy and other roots persist. Harvesting fungi attached to the tree need not cut the root beneath them.

The illustration of Heartroot Crown suggests the visual opportunity, but its giant hollow arch is not an admitted asset. A first test could use one small root obstruction beside the main route, leaving the landmark and ordinary return intact.

## Owner-proposed Lantern Log kit

Chris reviewed the images favorably and proposed modular scenery: author a log, mushroom clusters and moss as separate reusable models; assemble variations into one composite harvestable. As damage accumulates, individual parts break away and drop the corresponding mushrooms, moss or wood. This is a future gameplay direction, not an implemented damage/drop system. His favorable assessment is retained alongside the narrower technical holds; those holds do not invalidate useful component art.

A single placed parent should own the interaction and damage progression, with stable child identities for the removable log, fungi and moss pieces. Placement variation should use deliberate attachment locations and checked scale/orientation; keep fungi rooted into wood and moss seated on the actual surface. Reuse strong parts from existing candidates after component-level review rather than requiring every variation to be generated as one mesh.

Provisional implementation approach: authored break stages can remove a selected child, update its collision if any, and grant its own material exactly once. Break order, damage thresholds, yields, tools and whether players can target a specific part remain open. If support wood breaks, remaining attached pieces must be removed/dropped or moved to a deliberately grounded remnant; do not leave floating mushrooms or moss. Regrowth should restore valid support before its dependents, on long timers and subject to building suppression and safe occupancy checks. Exact dependency/regrowth behavior still needs a scoped implementation decision.

The future source kit needs an intact arrangement and damaged-stage targets, clean child boundaries/pivots, visible attachment guidance and at least a few visibly different arrangements. Keep one coherent harvesting interaction and save owner; this proposal does not require separate damage loops or simulated physics for each piece. [Lantern constituent study](forage-fungus.md) supplies the references and actual retained models.

## Proposed parts

| Part | Proposed interaction | Visible result |
| --- | --- | --- |
| Structural trunk and main collar | Stable landmark in the first trial | Preserves silhouette and orientation |
| Selected low crossing root | Independently harvestable wood | Local gap with grounded cut stubs; matching blocker removed |
| Fallen branch | Independently harvestable wood | Branch disappears or becomes a nonblocking remnant |
| Attached fungus cluster | Separate forage harvest | Fungi removed while supporting tree remains |
| Remaining roots and canopy | Preserved in the first trial | Tree does not disappear or leave floating canopy pieces |

Not every visually similar part should secretly behave differently. Art and interaction feedback must communicate harvestability. Some major roots can remain structural; do not imply arbitrary tree collapse or full structural simulation.

## Practical construction contract

Author a coherent whole-tree target, then identify its meaningful removable sections in the modeling plan. Give those sections deliberate cut boundaries, pivots and grounded remaining stubs. A modular tree should still look organically connected before harvesting; random intersecting cylinders are not sufficient.

Each removable part needs stable identity within the parent, its own harvest state and corresponding render/collision membership. Reuse the existing harvesting and persistence owners where practical rather than inventing a second damage loop. Removing a visual alone must not leave an invisible blocker; removing a collider alone must not leave apparently solid wood. Reentry/reload must reconstruct the same partial tree.

Keep unchanged geometry efficiently grouped and avoid per-piece per-frame simulation. A candidate implementation could swap or remove a bounded number of parts and use brief pooled debris effects. This is a performance hypothesis to measure, not a claim that arbitrary numbers of destructible pieces are affordable.

## Owner direction: slow regrowth and building suppression

**Current implementation, checked September 14:** generated Frontier forage enters the resource system as `persistentFinite: true` (`src/world/frontierEcologyRuntime.js`), and that resource path currently skips regrowth. Older non-finite node types still include short 12–18 second defaults (`src/resources/resourceConfig.js`). The new owner direction supersedes both policies for future composite harvesting; changing a timer alone will not enable it. A scoped implementation must reconcile generated ecology, resource state, saved timing and building influence together. This dossier has not changed either runtime path.

Chris explicitly selected regrowth for **all harvested parts**, using much longer timers than the early project. Placed structures, such as foundations near resource nodes, should suppress regrowth so a settled area can remain clear. This supersedes the earlier permanent-root-clearing proposal. It does not mean every structural trunk or canopy part must become harvestable immediately.

Exact delays, qualifying structures and suppression distances are still to tune. Preserve harvested state and remaining regrowth timing through reentry/reload; an eventual implementation must use the authoritative time/state owners. Whether suppressed timers pause, elapse while blocked, or restart after removing a structure is an unresolved product detail, not an invented rule. Building influence should suppress regrowth, not implicitly destroy nearby intact objects.

Regrowing barriers must not overlap or trap the player or companions, intersect structures, or silently eliminate their only return. A candidate implementation should defer unsafe regrowth and reevaluate through bounded checks, rather than force-spawning an obstruction. This remains an implementation proposal requiring its own proof. The existing short resource respawn policy is not assumed suitable for structural parts.

## First useful proof, when separately scoped

One tree, one removable root section, one opening, and unchanged remaining geometry. Use ordinary harvesting to clear it, pass through and return, then unload/reload and verify the partially harvested tree and inventory. Check that the opened part's collider is gone, siblings remain, and any respawn behavior cannot trap the player. Confirm player/companion access and phone cost for that specific example rather than proving all terrain walkable.

## Draft future field-journal wording

“Some ancient roots can be cut without felling their tree. Look for younger growth across the openings beneath the trunk.”

Publish only after the visual cue and cutting behavior exist. All harvested parts regrow slowly and structures suppress regrowth by owner direction; exact timing and spatial rules remain undecided. Resource yields, tools, discovery rewards and cooldown evacuation are still unspecified. See [exploration intent](../TRAVERSAL_INTENT.md) and [field-journal contract](../FIELD_JOURNAL_SOURCE.md).
# Independent practical review

**Verdict: PASS as a bounded design candidate; HOLD for runtime implementation.**

This is a useful Rootbound interaction pattern because it preserves a landmark while making one deliberate root passage responsive to harvesting. It must remain a composited landmark feature, not a general destructibility rule.

Each parent landmark and removable part needs a stable hierarchical identity that survives recipe ordering and streaming. A cleared root's visual state, collider state, interaction state, and persisted depletion state must change together; re-entry must neither restore a blocker nor duplicate its reward. The residual trunk and every non-harvested part must retain their existing mesh and collision ownership.

The art contract needs a continuous intact silhouette, an intentional cut/separation seam, and grounded remaining stubs after clearing. Attached foliage or fungi cannot float after a root disappears; separately harvestable fungus remains an independent object and does not inherit root clearing.

Updated for subsequent owner direction: regrowth is required for all harvested parts, on long timers, with nearby qualifying structures suppressing it. It cannot overlap or strand the player or companion. A first trial must demonstrate saved harvested state, safe later regrowth and building suppression rather than silently substituting permanent clearing.

Keep runtime cost bounded: static grouped geometry, a toggled or removed collider, and a small pooled debris effect if one is needed. Do not introduce per-piece physics. Streaming must not create duplicate colliders or restore stale root state.

## Smallest responsible future trial

Use one dedicated optional root obstacle outside the main lane, with one removable root and a normal wood reward. Keep its trunk, canopy, and other roots fixed. Before clearing, the root must visibly block a named optional gap; after an ordinary harvest, show the cut remnant, remove the matching collider, and prove player and companion passage plus return. Unload/reload/re-entry must retain the harvested state and award no duplicate resource. Separately prove safe delayed regrowth, qualifying-building suppression and the eventual rule for removing that building. Exact timer/radius tuning remains open.

## Independent practical review — Lantern kit extension

**PASS as an owner-proposed future kit direction; HOLD for implementation.** The proposal correctly treats reusable log, fungus, and moss as authored components assembled into a single parent-owned landmark. The dossier keeps the favorable visual feedback distinct from the held whole-object models and makes no false claim that semantic extraction, damage drops, harvesting, or placement exists.

For a future trial, one parent must own damage progression, save state, and regeneration scheduling; each removable child needs a stable identity, one reward path, and an explicit support dependency. Removing wood must either remove or deliberately ground any dependent fungus/moss before collision and visibility update together. Long-timer regrowth must restore support before dependents and defer if structures, players, companions, or return routes make restoration unsafe. The initial scope should be one fixed arrangement and one removable part, with variations only after persistence, support removal, and suppression behavior are proved.
