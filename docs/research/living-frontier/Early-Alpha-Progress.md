# Early alpha — procedural frontier progress

September 13,2026. This supplement follows the published Visual Fieldbook and Research Appendix. Images labeled **actual** come from the running prototype. The original PDFs retain their recorded publication checkpoint; this page carries newer implementation evidence.

## The experience we are working toward

**Explore a dangerous alien habitat → find something worth bringing home → improve Camp → care for a distinctive Wildkin → prepare for a harder outing.**

Chris's latest priority is a playable early alpha soon. The working world scope is one seeded continent surrounded by ocean, with later boats opening additional continents. Roughly10 habitats and30 species are a staged content target; the first alpha uses a smaller finished set. Portrait mobile/casual comes first, with five bottom quick slots, movement above the left side and contextual actions above the right.

Each Wildkin should change what the player can do. The first proposed roles build on current abilities: Mossling for recovery and cultivation, Emberhorn for mineral access/defense, and Tidefin for a short protected approach. The abilities already exist; repeatable procedural opportunities for using them remain the next priority. [Current effects versus proposed uses](../../EARLY_ALPHA_PLAN.md).

Large regions, extreme heights and distinct upper/lower habitats remain the destination. Rivers should follow terrain, while dense areas may need clearing; the world should not become a predictable web of paths. New content should differ in silhouette, traversal, resources, behavior and discoveries—not merely color.

## Actual: a useful first outing

<img src="../../../art/reviews/alpha-outing/purpose-portrait.png" alt="Actual compact purpose card during a fresh first outing" width="250"> <img src="../../../art/reviews/alpha-outing/bond-ready-portrait.png" alt="Actual bond-ready priority cue during the Mossling retry" width="250">

A compact plan now points to the next action already supported by the game: gather the exact berry-lure ingredients, craft at Camp, approach a quiet Mossling, physically return and secure the bond, then gather for its bed. The plan is derived from existing inventory, bond, care, crop, health and ability state; it creates no quest ledger or extra reward authority. Craft/build guidance includes selected reachable storage, while feeding and planting still require a berry in the backpack.

The fresh native journey began with no resources or owned Wildkin and secured exact Mossling `wildkin_wvwyyt` after one timed attempt expired during inspection. The earned Mossling was settled in a bed, fed three carried berries and given a nearby planted garden. The actual HARVEST prompt showed4berries/Bloom+1; harvesting changed pack berries2→6, cleared the crop and returned the purpose to Plant a berry. Final earned state is one cared-for Mossling, its bed and garden,6berries,1wood,1fiber,3wildflowers,50XP and full health5.

<img src="../../../art/reviews/alpha-outing/garden-bonus-portrait.png" alt="Actual earned Mossling bed and Bloom-tended garden together in portrait play" width="250"> <img src="../../../art/reviews/alpha-outing/bloom-hint-portrait.png" alt="Actual Bloom purpose hint in an isolated health fixture" width="250">

The earned outing stayed at full health, so Bloom was checked in a clearly separate health fixture. The actual button healed3→5, started a24-second cooldown, cleared its hint and exposed the ready-crop return purpose. Developer literal reload and packaged import plus literal reload then matched the owned individual/genome, base, care, null crop, pack, atlas, ecology,50XP, health5 and Plant a berry purpose exactly. The final pack held6berries,1wood,1fiber and3wildflowers. Packaged resources came only from `http://127.0.0.1:8081`; its console was empty. The developer console had no errors since final reload, with one older unattributed pre-candidate error retained in history.

## Actual: clear portrait construction

<img src="../../../art/reviews/portrait-construction/bed-care-r1.png" alt="Actual portrait bed placement followed by physical Mossling care" width="250"> <img src="../../../art/reviews/portrait-construction/garden-plant-r1.png" alt="Actual portrait garden placement followed by Plant" width="250">

Construction now tests at most40 deterministic nearby positions through the unchanged validator used by payment, placement and reload; all11 current build families use the same rule. The existing camera owner rotates only during portrait construction. Cancel or external closure restores the prior view; successful Place retains the useful yaw and restores temporary pitch/zoom.

Native play reused the earned/refunded Camp fixture. Normal UI completed bed Build→Place→Settle→Feed three times and garden Build→Place at(2.3,0,4.3)→walk600ms/1.29m→Plant with no landscape, position or camera override. The garden is3.253m from the starting position: the rounded3.2m-ring candidate sits just outside interaction reach, and the ordinary short walk closed it. Independent review scored8.5/10 PASS. Visible Cancel and seven external owner/event paths restored exact camera state; landscape open retained its view and returning to portrait restored the prior portrait pitch.

Developer and packaged reload matched individual/genome, base/care/crop, pack, atlas/ecology,50XP, health5 and purpose exactly. The final fixture retained a ready90-second Bloom+1/yield4 crop and pack1wood,1fiber,2berries,3wildflowers. All1,252 tests passed in65.684seconds; verify/world/retained-campaign/build/validate/ZIP pass at44.22MB unpacked/20.56MB ZIP. This closes the earlier landscape workaround, but it is not a fresh outing or physical-phone claim. [Evidence and limits](../../../art/reviews/portrait-construction/receipt.md).

## Actual: a place worth investigating

<img src="../../../art/reviews/regional-blooms/r3-portrait.png" alt="Actual selected compact Sunscar crystal bloom in portrait play" width="250"> <img src="../../../art/reviews/regional-blooms/cleft-portrait.png" alt="Actual second seeded cleft deposit with two harvestable crystal sources" width="250">

The Sunscar bloom is a small reusable natural place: real harvestable crystals surrounded by cloudflowers and dark rocks. The seed chooses location, orientation and one of two arrangements. Terrain support and regional conditions determine whether a candidate exists. Nearby content makes room for the complete place.

This is early composition variety. Two arrangements do not establish an inexhaustible catalog of unique discoveries. Every visible crystal uses the existing harvesting and saved finite-depletion path; no new collection menu or decorative fake crystal is introduced. Exact selected score and lifecycle evidence: [bloom receipt](../../../art/reviews/regional-blooms/receipt.md).

## Actual: an earlier physical discovery

<img src="../../../art/reviews/frontier-discoveries/r2-near-portrait.png" alt="Actual approach to the Sunscar Signal Cache" width="250"> <img src="../../../art/reviews/frontier-discoveries/native-opened.png" alt="Actual opened cache after collecting its reward" width="250">

The Signal Cache offers an ordinary Open action and a one-time reward: two iron and eight XP. It is one authored location on validated generated ground. It establishes a working interaction/persistence path for future discoveries; it does not yet distribute rare secrets through the world. [Evidence](../../../art/reviews/frontier-discoveries/receipt.md).

## Actual: broader geography and less waiting

<img src="../../../art/reviews/regional-provinces/r3-overhead.png" alt="Actual diagnostic overhead of broad seeded province terrain" width="510">

Three broad terrain grammars share the same seed field: lush rolling land, Sunscar ribs/basins and taller Ironspine ridges. Camp and the initial plateau route stay protected. The overhead shows structure better than the ordinary portrait view; visual richness remains unfinished. [Province evidence](../../../art/reviews/regional-provinces/receipt.md).

![Measured desktop terrain and scenery update peaks](../../../art/reviews/streaming-preparation/streaming-comparison.svg)

Terrain prepares incoming pieces while moving, and scenery reuses overlapping generation work. On the same135m desktop route, maximum terrain update fell85.3→20.1ms and scenery191.3→88.4ms. These are measured CPU pauses, not phone FPS. Hitches and physical-phone verification remain open. [Timing and lifecycle evidence](../../../art/reviews/streaming-preparation/receipt.md).

## What the alpha keeps—and postpones

| Focus for early alpha | Keep as later work |
| --- | --- |
| Recognizable habitats, useful resources and readable threats | An enormous biome/species catalog |
| A complete outing and physical Camp return | Online shared-world discovery services |
| Individual capture, body-tone inheritance, care/garden/pairing | Full modular anatomy and cross-species genetics |
| Simple preparation and visible progression | Deep statistics or a large research menu |
| Stable local saves, bounded residency and portrait controls | Unbounded-distance simulation and universal device claims |

Earthlike and alien reproduction, habitat-driven research, DNA storage/cloning, player breeding lineages and trading remain part of the design direction. Base colors and eye colors are separate traits; only current body tone is visibly expressed. Mortality/elder rules remain undecided. The first alpha should make the existing small set of systems enjoyable before multiplying them.

## How work is being prioritized

One batch should produce a player-visible outcome with a useful beginning and end. Independent workers handle genuinely separate owners. One focused review produces one repair list; tests cover the changed risks. Visual passes are capped at three, and previously held art is not reopened just to chase a score. Save, collision and offline failures still require repair. An independent workflow audit compares Dream Loop and Rapid Alpha Producer against actual project results; neither skill's defaults substitute for that evidence.

The [current slice](../../CURRENT_SLICE.md) and [Living Frontier plan](../../LIVING_FRONTIER_PLAN.md) own the live next task and release priorities. This page is an illustrated checkpoint, not a promise that the remaining systems are implemented.
