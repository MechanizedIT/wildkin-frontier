# Phase 0.5A cellular rock — isolated architecture proof

**September 23, 2026 · gate: HOLD for owner/perceptual review.** The bounded technical chain completes in a browser and in an extracted lab ZIP. The initial fracture representation passes its falsification probe. The admission gate stays open because the two split remnants develop conspicuous thin spires after the repeated central cuts, the full chain was driven by deterministic diagnostic hits (native Mine was checked separately for the world and fallen actor), and no independent perceptual reviewer was available. The architectural assumption still needing review is that a 0.5 m shared-corner scalar mask gives an acceptable *recursive split silhouette* within the fixed collider budget. No tree, dirt, shipping world migration or Phase 0.5B work is authorized by this proof.

## First gate: fracture field

The smallest probe ran before the actor implementation. A seeded, rotated, approximately isotropic jittered-site rock field uses full signed integer site addresses and a radius-two nearest-site search checked against a radius-four brute-force oracle. One fracture cell is selected at a hit, and its implicit signed cell mask is subtracted only from the hit's occupied patch. The 0.5 m Surface Nets result has a jagged, oblique recess distinct from the spherical and axis-aligned controls in the same actual render:

![Same rock, cellular, spherical and axis-aligned cuts](evidence/voxel-phase05/rock-fracture-probe.png)

The tested rock cells are **1.5 m** across, or about three scalar intervals. This trades fracture granularity for a visible irregular silhouette; smaller cells were not adopted or claimed to work. The visible mesh remains Surface Nets with 16³ chunks and 0.5 m samples; site polygons are not rendered. Negative coordinates, seed stability, nearest-search agreement, isotropy sampling and remote same-ID patch protection are covered by `voxelFractureField.test.js`. [Probe receipt](evidence/voxel-phase05/rock-fracture-probe.json).

## Implemented chain and ownership

1. A roughly 4 m boulder begins as world-owned generator matter on a narrow rocky neck. A side hit makes an irregular bite. Two neck cuts leave one unsupported component, transfer its occupied parcels to one actor, and remove the world source without a reward for detachment.
2. Rapier gravity and contact move and rotate the actor. The browser run records a substantially changed quaternion and position before its next cut. Actor ray selection intersects the actual scalar surface, transforms the hit into the stable local sample frame, checks content revision, and edits that local field. The old source position is no longer hittable.
3. Repeated middle cuts retire the parent and produce two retained physical children. Each child keeps the original fracture domain, local field, material, lineage, pose and motion; its inherited velocity uses `v + ω × r`. A further child cut changes the child field. Tiny occupied remnants are converted through the declared 64-probe retention threshold, not promoted to bodies.
4. A literal IndexedDB reload after the child hit restores the two children, retired parent ID, world deltas, fields, poses, revisions and reward ledger. The separate namespace is `wildkin-voxel-lab-cellular-0.5a-v1` with a per-proof suffix. Existing Phase 0 namespaces are unchanged.

The shared `MatterVolume` view reads generator-plus-sparse-edits for the world and bounded snapshots for actors. Both provide density, material, fracture domain and padded snapshots in a stable sample frame. Connectivity uses occupied 2×2×2 interior probes and actual face contact, plus explicit anchors; unknown structural evidence returns HOLD. `LabWorldState` remains the serialized durable transaction owner. Worker meshes and disabled Rapier products prepare before the IndexedDB transaction; a fixed-step revision check precedes save and publication. Failure injection covers worker failure, stale worker output, collider preparation failure and a real IndexedDB abort. In those cases prior matter, reward and mesh/collider products remain installed. A delayed pose update cannot restore a retired parent.

The fixed eight-subparcel accounting model starts with **2,164 stone units**. At the final child hit it has **92 world + 379 first child + 231 second child + 1,462 consumed/reward = 2,164**. Detachment and splitting issue no reward themselves. The final state has two bodies and four convex hulls per actor, below the four-body/eight-hull caps. A real Rapier/visible-surface comparison checks several initial and edited rays to within 0.5 m; the hulls are bounded proxies, not an exact concave collision surface.

![Supported boulder](evidence/voxel-phase05/headed-pc/rock-start.png)
![Irregular side bite](evidence/voxel-phase05/headed-pc/rock-bite.png)
![Fallen and rotated rock](evidence/voxel-phase05/headed-pc/rock-fallen.png)
![Two retained pieces after parent retirement](evidence/voxel-phase05/headed-pc/rock-split.png)
![One child mined again](evidence/voxel-phase05/headed-pc/rock-child-mined.png)
![Same state after literal reload](evidence/voxel-phase05/headed-pc/rock-reloaded.png)

The [headed Edge receipt](evidence/voxel-phase05/headed-pc/playtest-cellular.json) and [extracted ZIP receipt](evidence/voxel-phase05/portable-final/playtest-cellular.json) record every stage, actual poses, revisions, body/hull counts, quantity, errors and external requests. Both report no page errors or external runtime requests. The deterministic browser harness uses diagnostic coordinate hits for the full split sequence and separately proves the on-screen Mine control can edit both a world rock and a fallen actor via scalar targeting.

## Validation and measurements

Focused suites: `voxelFractureField`, `voxelMatterVolume`, `voxelMatterConnectivity`, `voxelMatterOwnership`, `voxelMatterActor`, `voxelMatterTarget`, `voxelMatterPersistence`, `voxelMatterPhysics` and `voxelMatterPublication`. Existing Phase 0 suites also run under the aggregate project checks. Final aggregate test, verify and shipping ZIP results are recorded in the build log.

Visible Edge on the local PC, one 1500×900 bounded rock scene: 16 committed edit samples, median **61.6 ms**, maximum **111.9 ms**. Worker candidate median **9.2 ms**, max **21.7 ms**; collider preparation median **10.8 ms**, max **16.0 ms**; save median **12.3 ms**, max **17.3 ms** (14 samples). Final mesh contains 104 world and 344/164 child triangles. These are small-fixture measurements, not a statistically representative world benchmark. The headed automated run reports a 50 ms frame p95 after the loop's 50 ms delta clamp; this does **not** establish a 16.7 ms PC frame target. No real landscape-phone timing was taken; Phase 0's separate phone HOLD remains.

## Limits and owner review

- The recursive split's thin spikes are visible. The current sample-corner partition keeps quantized ownership exact and rejects ambiguous shared corners, yet does not prove a consistently convincing rock silhouette. This is the principal Phase 0.5A HOLD.
- The browser proof shows actual rendering and native world/actor Mine targeting, while diagnostic hits drive the long, deterministic split path. A human should inspect whether ordinary orbit/aim/mining makes that path understandable and reliable.
- Four sector convex hulls per actor pass sampled visible-surface rays. They are not a general decomposition library, and the test does not certify every concavity or every future rock cut. Unrepresentable/budget-exceeding edits HOLD before durable commit.
- Only one fixed rock fixture, one material, one domain and one bounded support area are implemented. The floor and camera are lab props. Crash recovery between durable save and publication is handled by freezing/reloading, not tested as a general world service.

**Human review:** Open `/lab/voxel/cellular-rock.html` from `node tools/serve.mjs --port 8090`. The boulder and narrow pedestal are in front of the view. Click the boulder's near side and confirm an oblique, non-cubic recess. Orbit toward the narrow neck, mine its remaining sides until the boulder falls, press **F** to follow it, then aim at its new rotated surface and mine. Continue cutting across the middle; confirm two physical remnants and no parent at the source. Mine one remnant and use **Save & reload**; confirm the same two damaged remnants and exact balance text. Failure signs include a spherical/cubic bite, a hit at the old source, overlapping parent and children, unchanged child after mining, mismatched collision, or a quantity increase on split. The screenshots above show the repeatable scripted path for comparison.
