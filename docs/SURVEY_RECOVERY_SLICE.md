# Survey Recovery — second overnight candidate

September 11 evening. **Provisional production plan with rolling implementation below.** Derived from Chris's crashland/Camp/progression direction and an independent level/systems audit. Current scope and progress remain in CURRENT_SLICE and OVERNIGHT_RUN_2. Root integrates canonical world data; each production writer receives explicit file ownership.

**23:40 Survey checkpoint:** cartridge loot/Author editing and Salvage fitting are integrated; new wreckV2 neutral8.0, independent native8.0 and bench UI8.4 pass. V1 remains rejected6.3. Root's fresh ordinary Camp Travel→Forest Edge→west entrance→chest→pack inspection→exit→reload succeeds without item grants/teleports. Separate diagnostic bench fixture proves Fit→20slots→reload. These are two separate paths, not an earned crafting journey.888tests/world/campaign/build/validation/ZIP pass,43.44MB/20.37MB. Rootfall remains unimplemented. A milestone toast can replace the initial pickup message; item inspection retains fitting instructions, with notification coordination noted for later UI polish.

**Camp implementation checkpoint:** defended apron, adjoining yard, three persistent Omni-tool clearing bundles, world-console payment and saved perimeter expansion are integrated candidates. Independent target/model gates pass; root native auto-clearing, cost-button payment and literal reload pass. Independent native layout/art review passes8.0, with both entrance crossings and explicit Author Edit suppression;867tests/build/ZIP pass. Survey wreck, cartridge/pack fitting and Rootfall remain plans. The actual starter floor and bench fit at(-4.5,7.7), with a crate at(-4.5,9.7); the material-only gravel pad changes no terrain height beneath legacy saves.

## Player journey

Wake beside the damaged pod inside emergency defenses. Gather in Forest Edge, follow recognizable cargo fragments into a torn survey module, recover a pack cartridge, and fit it at a Camp Salvage bench. Clear an adjoining work yard to gain protected construction space. Clear and brace a fallen alien growth farther up the Verdant trail to open the next region. Pack capacity helps preparation; it is not an arbitrary permission requirement for cutting the obstruction.

Camp and Survey are integrated reviewed changes. Rootfall is next. Do not start every feature simultaneously or claim the whole journey from isolated fixtures.

## Camp composition and expansion

- Retain stable pod, workshop, sanctuary, spawn and north-gate IDs/positions. Current positions: pod(-4.8,1.5), workshop(2.8,-1.6), sanctuary(-2.7,-1.6), spawn(0,2), gate(0,-6), in x/z coordinates. These are implementation aids; player instructions use visible landmarks.
- Candidate initial apron: x[-9,11], z[-4,11], with a six-metre north entry corridor x[-3,3], z[-9,-4]. Candidate adjoining southern yard: x[-13,13], z[11,31]. Avoid the western pond; ground defenses on existing berms.
- Use substantial matte emergency armor and practical braces, a visible safe entrance and small interrupted sightlines. Remove decorative farm-fence emphasis. Keep alien vegetation outside defenses; readable clearable debris belongs in the future yard.
- New generated Camp reference must pass independent target review before the visual implementation. Exact layout dimensions may change to preserve truthful traversal, the accepted reference and construction fit.
- Starter construction belongs beside the existing facilities. Validate an actual bench, crate and foundation with the production placement helper. A proposed x[-4,4],z[6,10.5] bay may be too narrow once the central route reserve is applied; do not accept it from diagram space alone. Preserve walking/service spurs and future wall reservations.
- Candidate yard task: clear three marked debris bundles with the starter Omni-tool, then spend 6 wood,4 stone,2 fiber to erect outer defenses. One saved expansion result removes the shared inner barrier and debris and creates the extended perimeter. No raid/upkeep system in this slice; north entry stays accessible throughout.

### Existing-save constraint

Current tiered build squares are x±6,z12–24; x±9,z9–27; x±12,z6–30. They overlap the proposed yard. `normalizeBase()` currently discards out-of-bounds/reserved structures; losing a storage crate can then reject the inventory as an orphaned container. Resolve the layout version before normalization, never by silently dropping a structure.

Grandfather existing southern construction or paid tiers into a cleared yard; retain structure/container IDs, contents, support relationships and positions without a repeated charge. A fixed legacy wider lower apron x±13,z5–11 may be needed for tier-2 edge buildings. New scenery, debris and walls must avoid those footprints. Keep this an explicit narrow migration, not a general framework. Prove tier0/1/2 saves with edge foundations and full crates.

## Survey recovery and pack fitting

- Torn Survey Module around(7,23) in Verdant, roughly6×7m with a west opening, near the arrival-to-Lookout trip and south of the ore branch. Keep the ridgeway and z18 route accessible.
- Manufactured pale ribs, open roof, damaged receiver and admitted articulated field chest establish a recognizable wreck. Two restrained cargo fragments lead to it. Alien ruins retain a different silhouette/material story.
- Preserve the familiar first-tree/supply nook and IDs near(-8.5,24),(-12,21.5),berries(-12,25).
- Guaranteed one stack-limit-1 Field-pack cartridge. Full inventory leaves it recoverable after making space. Loot now admits catalog items alongside resources/XP; validation, shared-table Author editing/export and partial-reward persistence are integrated.
- At a placed Salvage bench, cartridge+6 fiber+2 wood fits a permanent16→20-slot pack upgrade. One transaction consumes costs, records the existing pack tier and adds four empty slots without moving existing stacks. No separate blueprint ledger was added. Failed saves preserve prior ownership; repeat attempts show Fitted and never charge again. Exact cost is provisional.
- Reuse existing pack tiers16/20/24 and the frontierProgress save owner. Do not create a parallel blueprint/inventory authority or pretend a permanent upgrade is a disposable item output.

## Rootfall Passage

Replace only `gate_section_1_to_2`: fallen alien growth across the existing raised ridge near(0,-31), with grounded flanking rock/root masses. Source inspection found no drainage cut, so retain the actual ridge instead of assuming a ravine. Starter Omni clears visibly stressed sections;4 wood+2 fiber braces the passage. Remove this edge's XP threshold. Preserve its ID, repaired flag, destinations and safe return landing at(0,1.35,-31.5); repaired saves remain open. Exact target/layout is the next independent reference gate.

The current gate is a nonblocking arch. Closed/open visuals and physical blockage must share the saved repaired state; the transfer trigger belongs beyond the cleared approach. Check static-world refresh so no orphan collider remains. Other gate families retain current behavior until individually redesigned.

## Ownership and art boundaries

- Camp layout/placement: focused `src/base/campLayout.js`, basePlacement/baseCatalog/baseSystem; explicit sector/perimeter/reservation data, Camp-only runtime and Author suppression.
- Persistent transactions: `src/save/frontierProgress.js` owns changes, normalization, snapshots, import/export and rollback. Assign only one writer while altering it.
- Item/craft rules: inventory catalog/state, stationCatalog/craftingStations/stationPanel. Preserve pack plus explicitly selected nearby storage costs.
- Root owns canonical authoring through focused Camp/survey composer modules and serial world regeneration. No worker rewrites world.json/generated data independently.
- Reuse admitted Explorer/Mossling, Sapwood, canopies, crates, field chest and stations. New reference families: emergency Camp/barricades, survey wreck, fallen alien obstruction. Existing pod can remain explicitly provisional until replaced; helper drone is authorized broader work, not a dependency that blocks the smaller loop.

## Recognizable acceptance checks

1. From the pod, walk to locker, workshop, gate and construction area. Expect grounded defenses, clear paths and space for one bench/crate. Hidden walls, trapped spawn or an unusable suggested build bay fail.
2. Follow cargo from Forest Edge into the survey wreck. Recover the cartridge without advanced equipment; a full pack must not destroy it.
3. Fit the cartridge at the Salvage bench. Expect20slots with existing items intact; reload and storage transfer work, repeated fitting costs nothing.
4. Inspect the debris beyond Camp's inner southern barrier, clear it and pay the displayed total. Expect a larger defended area and no obsolete inner wall; reload preserves it and existing crates stay accessible. Insufficient materials spend nothing.
5. Clear and brace Rootfall, walk into Shatterfen and return. Visual opening and physical access agree, including previously repaired saves.

Independent review must use actual Camp and route traversal plus visual evidence. Target approval, module tests and diagnostic grants do not by themselves prove this earned journey.
