# Sunscar Desert rotation 1 — low-ecology composition plan

**Status: planning only.** This is a bounded removal pass for the selected
arrival and destination pockets. It does not add a system, touch the pending
weathered-rib asset lane, alter terrain, or change gameplay/source/home IDs.

## Evidence

The native envelope previews show the failure directly: repeated green
trail-stone plates and one tall Fen stone read as scattered decoration in the
open basin, rather than a dry pocket edge. The current default sampler confirms
that all twelve records below are noninteractive `kind: low` scenery; they are
not forage, wildlife, homes, canopy, Camp content, or an alternate-world
record. `asset_trail_stones` has the current 1.4m scaled-footprint basis;
`asset_fen_stone` is a solid 1.14m basis and is especially unsuitable as a
Sunscar rib substitute.

The proposal has **zero additions and zero relocations**: suppressing this
small, named set creates two clean negative-space rooms while retaining their
existing crystal/ore/fiber/Emberhorn source grouping. It avoids converting the
complaint about square plates into a denser cluster of the same plates.

## Proposed named suppressions (12 total)

| Pocket | Current scenery ID | asset / current x,z / scale | bounded result |
| --- | --- | --- | --- |
| arrival | `f2c:s:-40:-1:seed-1` | trail stones / `-1972.984,-11.746` / 1.239 | remove inner plate beside twin-source approach |
| arrival | `f2c:s:-40:-1:seed-3` | trail stones / `-1980.239,-11.892` / 1.493 | remove repeated south edge plate |
| arrival | `f2c:s:-40:-1:seed-4` | trail stones / `-1974.158,-14.890` / 1.851 | remove largest foreground plate |
| arrival | `f2c:s:-40:-1:seed-5` | Fen stone / `-1982.157,-9.285` / 1.341 | remove tall wetland monolith from basin edge |
| arrival | `f2c:s:-40:-1:seed-6` | trail stones / `-1985.776,-11.599` / 1.489 | remove repeated outer plate |
| arrival | `f2c:s:-40:-1:seed-7` | trail stones / `-1970.662,-9.780` / 1.379 | remove plate nearest the approach side |
| destination | `f2c:s:-39:1:seed-0` | trail stones / `-1933.399,73.859` / 1.236 | remove south pocket plate |
| destination | `f2c:s:-39:1:seed-1` | trail stones / `-1932.061,80.535` / 1.494 | remove inner plate beside crystal approach |
| destination | `f2c:s:-39:1:seed-2` | trail stones / `-1929.399,80.717` / 1.272 | remove duplicate east plate |
| destination | `f2c:s:-39:1:seed-3` | trail stones / `-1926.405,73.808` / 1.379 | remove detached return-side plate |
| destination | `f2c:s:-39:1:seed-5` | trail stones / `-1932.973,78.580` / 1.403 | remove overlapping plate rhythm |
| destination | `f2c:s:-39:1:seed-6` | trail stones / `-1930.495,75.964` / 1.415 | remove last inner plate |

## Safety and visible result

Each operation removes a current visual only. It creates no new transformed
bounds, terrain support demand, source approach obstruction, collision, or
route footprint; it therefore vacates, rather than consumes, the existing
1.15m low-prop route clearance and 3.2m forage clearance. Existing resource
and home transforms must be compared exactly before and after as part of the
structural pass. The relevant crystal uses its existing source/collider and is
not in this set.

At the frozen arrival/destination cameras, the result should be a legible bare
centre with natural interactive mineral/forage clusters at the edge. The
weathered-rib candidate, if separately admitted after full mesh projection,
becomes the only new broad edge volume; these removals must not be used to
claim that its asset or placement has passed. Root must native-capture the
suppressed layout and independently judge whether the retained source clusters
are enough ecology grouping. If the room becomes merely empty, hold rather than
adding generic greenery or restoring square plates.

## Source boundary

An eventual source implementation may only filter these exact twelve default
Sunscar scenery IDs, gated to the default world. It must leave all other chunks,
all existing canopies, gameplay identities, alternate worlds, and source/home
samplers unchanged. No cap increase or replacement scatter is authorized.
