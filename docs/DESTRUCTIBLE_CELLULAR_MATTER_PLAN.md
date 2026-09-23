# Destructible cellular matter — Phase 0.5 plan

**September 22, 2026 · PLANNING ONLY · awaiting owner review and fresh implementation instruction.**

Recommendation: extend the isolated lab with a shared, narrow matter-field contract, procedural fracture identity, and editable physical matter actors. Keep Surface Nets, 16³ mesh chunks, 0.5 m spacing, Three.js, Rapier, workers, IndexedDB and floating origin. Use a **hybrid support graph**: fracture fragments and bonds describe breakage; occupied scalar volumes verify that those fragments and bonds physically exist. Prove one rock through detachment, rotated secondary mining, splitting and reload before adding wood and dirt.

The owner has requested this investigation and three-material proof design, not approved the algorithms or implementation below. All new constants, file boundaries and algorithms are provisional. This document supplements [the infinite-world destination](INFINITE_VOXEL_WORLD_PLAN.md); it does not restart Phase 1, change the shipping world, resume Blender/Rootbound, or lift the deferred real-phone HOLD in [Phase 0](VOXEL_PHASE0_REPORT.md).

## 1. Current architecture and evidence

Inspected baseline: `main` at `1010861`, with only the pre-existing untracked `authoring/` directory before planning. Read current slice/session start, Phase 0 report, smooth-mesh notes, code map, relevant design/architecture rules, and the older September 15 handoff as history. The September 22 session-start closeout is the current handoff. The brain's September 21 product decisions agree with the destination; its pre-implementation status is stale and does not override repository evidence.

| Current owner | Established behavior | Boundary relevant to this proposal |
| --- | --- | --- |
| `world-state.js: LabWorldState` | Generated field plus sparse global scalar/material edits; negative density is occupied. `transact` clones, saves, then installs state through one serialized queue. | World mutation, drops and actor creation are together, but actor-local edits are absent. Keep transaction authority small. |
| `generator.js` | Meter-space density/material generator; `generateSmoothPadded` produces matching arrays over `[-1..size]³`. | No fracture domains or object-local grain. |
| `surface-nets.js` | One interpolated vertex per crossing lattice cell; trilinear gradient normals; ghost cells and lower-edge-coordinate face ownership. | Rendering is already independent of world state. Most-negative-corner vertex color is not an authoritative material-volume query. |
| `support.js` | Bounded six-neighbor sample flood of the wood bridge; unknown neighbors conservatively support it. | Fixture bounds, wood rules and sample-count caps are intentional limitations, not a general structural graph. |
| `debris.js` | Reconstructs an immutable saved density snapshot around a fixed reference center. | Smooth geometry assumes wood. No mutable per-sample materials, fracture identity or recursive split. |
| `physics.js` / `runtime.js` | Prepared world mesh/static-collider batches; create missing debris bodies/meshes; floating-origin alignment. | Actor sync only creates missing IDs: no actor replacement, retirement or worker revision path. Smooth actors use one convex hull, with a box fallback. |
| `main.js` / `smooth-raycast.js` | Input selects the world scalar surface and matching solid sample. | No actor hit selection or inverse-transform mining. |
| `persistence.js` | Isolated IndexedDB manifest/chunk transaction includes source edits, actors, drops and inventory. Fixed 32-sample save partitions are independent of 16³ mesh chunks. | Actor poses checkpoint position, orientation and sleep; velocities and editable actor revisions are absent. Saves rebuild all changed partitions, acceptable only within current bounds. |

Current atomicity has two useful but distinct guarantees: failed saves retain prior live matter/rewards; failed world-product preparation retains the previous mesh/collider batch. `publishBatch` relies on synchronous, non-throwing commits and has no rollback after an individual commit throws. Durable state currently precedes remeshing. Actor products are not part of that general replacement batch. Phase 0.5 must extend these boundaries, not claim cross-system ACID already exists.

Retain the existing `voxelLab`, `voxelSmoothState`, `voxelSmoothMesh`, `voxelSmoothRay` and `voxelDebris` tests and browser receipts. Phase 0 measured .5/16 PC meshing p95 8.3 ms, collider p99 4.6 ms, support max 11.0 ms, save max 12.0 ms; the normalized 32 m cube had a 72.0 ms maximum of the disclosed edit batches. These are baseline measurements, not forecasts for cellular matter. Physical-phone performance remains unknown.

## 2. Reuse unchanged

- The negative-solid scalar convention, meter scale, negative-safe integer coordinates, and 0.5 m / 16³ baseline. Keep .25 m and 32³ as historical comparison profiles, not new defaults.
- Surface Nets interpolation, edge ownership, winding, ghost-field contract and existing seam tests. An actor adapter supplies the same field contract.
- Three.js and Rapier versions, local vendored dependencies, fixed timestep and single existing frame loop.
- Pure procedural density/noise groundwork and the current bridge/court fixtures as regression scenarios.
- Existing world raycast math where parameterized by field reads; terrain static triangle collision; origin conversion helpers.
- The principles of immutable worker requests, cancellation, revision rejection, disabled collider preparation, one durable state coordinator and separate lab saves.

“Reuse” does not mean copying the bridge's hard-coded wood/material or create-only lifecycle into a new owner. Preserve the Phase 0 scenario and evidence behind a separate lab scenario/namespace while exercising Phase 0.5 additions.

## 3. Refactoring boundaries

Use a small **MatterVolume view**, not a superclass, ECS or new global world object. It describes how to read a field in its stable sample frame and create a bounded copy-on-write draft. It owns neither physics nor durable commits. Existing world state and actor records remain the stores; adapters do not maintain shadow copies.

```text
Input + authoritative hit
          │
          ▼
matter-edit coordinator ─── one serialized transaction via LabWorldState
          │
          ├─ MatterVolume view: world generator/deltas OR actor local snapshot
          ├─ damage + fracture queries + bounded connectivity (pure operations)
          ├─ extraction + ownership/resource accounting
          ├─ workers: immutable field snapshots → mesh/proxy candidates
          └─ prepare → durable commit → paired runtime publication
                        │                       │
                   IndexedDB               Three + Rapier
```

Extract pure edit/fracture/split operations out of `world-state.js`; keep it responsible for queued proposals and installation of a complete next state. `matter-edit.js` orchestrates the preparation protocol using injected state, worker, publication and persistence services. It does not own another authoritative state. Physics owns live body motion; persistence contains its explicit checkpoints. Runtime owns disposable meshes and handle mappings. Workers never install state.

Refactor only the smooth cellular scenario initially. The old block comparators and bridge regression remain valid. A new function is warranted only when world and actor paths actually share it; do not create generic streaming, plugin or material-simulation frameworks.

## 4. Proposed data model

Five independent layers share coordinates and versions:

| Layer | Authority / representation |
| --- | --- |
| Density | Signed scalar samples, `Float32`, spacing and immutable sample frame; defines the zero surface. CSG results are signed fields, not necessarily exact distance functions. |
| Material/domain | Material IDs plus fracture-domain provenance at occupied locations; discrete deterministic boundary selection. Do not infer material from rendered color. |
| Fracture | Versioned procedural sites/metric plus sparse accumulated cell/bond damage. IDs survive detachments and splits. |
| Connectivity | Disposable bounded graph derived from current occupied matter and persistent damage; never an independent copy of density. |
| Mesh/collision | Revision-tagged derived products; Surface Nets render geometry and separately validated compound proxies. |

Proposed records (schema sketch, not executable API):

```text
MatterVolumeView
  volumeId, contentRevision, spacing, sampleBounds
  sampleFrame                 // lattice index → local meters
  readDensity(i), readMaterial(i), readDomain(i)
  classifyMaterialDomain(localMeters)
  fractureDescriptor(domainId)
  makeDraft(bounds), snapshotPadded(bounds)

FractureDomain
  domainId, seed, algorithmVersion, profileId, profileVersion
  fieldToFractureFrame         // immutable affine mapping; no body pose
  grainFrameOrSegmentId        // single straight grain frame in first tree

MatterActorRecord
  id, lineageRootId, parentId?, createdByTransaction
  contentRevision, poseRevision, formatVersion
  spacing, localSampleBounds, sampleFrame
  densitySnapshot, materialPaletteAndSamples, domainPaletteAndSamples
  fractureDescriptors, sparseCellDamage, sparseBondDamage
  ownershipPartition, materialQuantityLedger
  globalPosition, unitQuaternion, linearVelocity, angularVelocity
  sleepState, residencyState, poseCheckpointTick

MatterTransaction
  id, expectedWorldRevision, expectedActorRevisions
  nextWorldDeltas, actorUpserts, actorRetirements, rewardChanges
  dirtyWorldAndActorProducts, ownershipAudit, preparedPublication
```

Actor snapshots contain the bounded local field after extraction, including needed positive exterior values, rather than depending on the source chunks remaining resident. World matter remains generator plus deltas. Snapshot storage can start as validated typed arrays serialized to arrays/binary buffers; compression is optional later. Meshes, collider handles and the full derived graph are not saved.

Both adapters expose identical material/domain classification at arbitrary fixed probes: evaluate trilinear density first; if occupied, choose the negative corner with greatest trilinear interpolation weight, breaking ties by stable sample-coordinate order, and take that corner's material/domain pair. Generator or snapshot supplies each corner's identity. This provisional nearest-contributing-solid rule is discrete, deterministic and testable after edits; it is separate from Surface Nets' color choice. Mixed-material faces are sampled at the fixed probes rather than averaged into a fictitious material.

Names matter: a **sample** is one scalar measurement; a **lattice cell** is the volume between eight samples; a **fracture cell** is a procedural region; a **fracture fragment** is a currently connected occupied subset of that region; an **actor** is one retained unsupported connected island containing many fragments. None is synonymous with a visible cube or a rigid body.

## 5. Fracture-field design and alternatives

Start with bounded seeded Voronoi queries in a material/object frame. The useful research precedent is reproducible nearby feature points and nearest-site regions without storing all cell polygons. Worley's paper also cautions that a jittered lattice can retain visible grid bias; isotropy must be measured, not assumed. [Worley, A Cellular Texture Basis Function](https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf).

| Candidate | Benefit | Cost / decision for proof |
| --- | --- | --- |
| Jittered, one-site-per-bin Voronoi | Simple finite search bounds, stable IDs, no precomputed polygons. | Possible lattice bias. Initial control candidate; must pass rock isotropy and visible-cut review. |
| Bounded 1–3 sites per bin, Worley-style | More irregular sizes; weakens regular one-site rhythm. | More nearest-site work, tiny-cell risk. Compare in the pure fracture probe before freezing v1. |
| Weighted/power cells | Explicit size variability; planar boundaries with bounded weights. | Empty/tiny cells and larger search bound. Reserve if site count/jitter cannot give adequate variability. |
| Recursive seeded split planes / BSP | Compact hierarchy; directional wood cuts; naturally supports subdivision. | Tree/order complexity and potential cut bias. Best fallback if fixed cells prevent satisfying re-chopping. |
| Arbitrary prefractured polygon assets / runtime decomposition | Direct authored fracture geometry. | Wrong infinite-world storage model and substantially more geometry ownership. Exclude. |
| Samples with noise-deformed sphere brushes | Very little new data. | Does not establish persistent cell/cohesion topology. Retain as Phase 0 control only. |

Proposed query:

```text
q = fieldToFractureFrame(localMeters)
u = inverseCellScale * grainRotationInverse * q
for each candidate seed bin in a proven bounded nearest-site search:
    sites = hash(domainSeed, fullIntegerBinTuple, siteOrdinal, version)
    rank by squaredDistance(u, site), then full stable site key
return (domainId, algorithmVersion, binX, binY, binZ, siteOrdinal)
```

For wood, divide grain-axis coordinates by a larger spacing than transverse coordinates: cells elongate along the trunk. Rock uses equal scale on each axis and a domain-seeded orientation to reduce axis alignment. Dirt changes scale, jitter/site distribution and cohesion, not merely color.

Use a fixed integer hash for site offsets, canonical floor division at negative coordinates, stable lexicographic ties, and quantized site positions/distance comparisons with tested numeric bounds. A hash is entropy, **not the unique identity**: the full domain/bin/site tuple prevents collision aliases. Compute relative to integer domain/bin anchors before floating operations; never hash floating-origin coordinates. Compare against a wider brute-force search oracle. Do not assume a 3×3×3 neighborhood is sufficient for every anisotropic or weighted variant. Candidate v1 clamps occupancy to at least one site per bin so a finite search bound can be proven; unsupported parameter ranges are rejected.

No seed changes when matter falls, sleeps, reloads or splits. A child retains the original domain frame even if its storage bounds shrink. Terrain domains are world anchored; tree/rock object domains retain generator object IDs. Cross-material boundaries carry explicit material pairs and domain contacts. A fracture site may span ore and stone, but damage resistance and rewards are resolved per material portion.

Damage initially accumulates on the selected occupied fracture fragment. At threshold, remove that irregular occupied region from the scalar field. Constant-metric Voronoi cells permit a local implicit intersection of bisector half-spaces; evaluate a bounded selected-cell mask only around the hit and rasterize subtraction into density (`max(oldDensity, -cellMask)`, negative-inside convention). This avoids deleting an axis-aligned brick of samples. The mask clips to the target domain/material eligibility and currently connected portion. An analytic site mask alone cannot distinguish disconnected patches: gate its raster evaluation by the selected occupied component/parcel mask plus a deterministic one-lattice-cell cut band, excluding parcels owned by other patches. Never erase remote matter sharing a cell ID. Compare mask cuts against simpler label-based removal in the first CPU/visual probe; only retain one production path.

At 0.5 m, very small cells can disappear or become grid-shaped when sampled. Initial narrow dimensions should usually span at least 2–3 intervals. No claim that sub-sample cells yield visible detail. There is no visible crack network before damage by default. Recursive destruction means further cuts/splits of remaining cells until resource conversion; endlessly subdividing one smallest cell is not promised. Hierarchical child cells remain a fallback experiment, not required first-batch machinery.

## 6. World versus actor ownership

One authoritative matter state contains world deltas, actor records and rewards. Transfers change its ownership partition, not merely visibility. Fracture identity describes provenance, while actor ID describes the current container. Neither ID alone is a consumable resource key.

```text
world-owned region
   └─ cut + verified support loss
        ├─ removed portion → material-specific reward ledger
        ├─ supported remainder → world-owned
        └─ unsupported retained island → actor A
             └─ subsequent local edit
                  ├─ removed/tiny portion → reward ledger
                  └─ islands → actors B and C; A retired
```

Stable provenance partitions must survive extraction. **Transfer/resource ownership is assigned to fixed occupied sub-parcels of lattice-cell volume, not shared scalar corner samples.** Start with the eight equal sub-parcels represented by the 2×2×2 interior probes in §8. Keys contain the immutable source lattice frame, integer lattice-cell coordinate and sub-parcel index; object/domain provenance accompanies each occupied key. Unvisited world parcels remain implicit until a bounded edit/extraction needs them. A key is owned by world, one actor, or a consumed/resource record, never several. Children retain these source keys despite arbitrary body rotation.

Scalar samples still own geometric density; the partition is an ownership/accounting mask, not a replacement density field. Shared reconstruction/halo corners do not carry independent quantity or damage authority. An actor edit may subtract only inside its owned component mask, even when its scalar write stencil includes exterior halo locations. Two distinct fragments of the same procedural cell can belong to different actors; damage keys include the occupied partition, so striking one does not affect the other.

Use one exact integer quantity unit per occupied sub-parcel at its first authoritative classification (at .5 m, a quantized 1/64 m³ estimate), with its material assigned by §4. Materialization is bounded and deterministic; it does not preallocate the infinite world. Transfers move keys/units; density subtraction consumes a surviving unit when its fixed probe becomes empty. Partial surface movement below that quantization earns no extra unit. Batch units into items with persistent remainder counts, never round independently per child. Detachment alone earns no drops. Do not recalculate a fresh full reward from a child's new bounding box. The geometric-volume estimate used for mass is separate from exact reward conservation.

Extraction is a first-batch risk: a scalar sample influences eight lattice cells, so blindly copying all corner values into both children can duplicate surfaces and matter. Build component masks, classify owned parcels deterministically, and reconstruct each child's clipped scalar field with positive exterior and the mesher's required halo. Copied corner context is read-only; it does not confer ownership. Persist the parcel partition and actor-local field, not overlapping mutable source halos. Verify union-of-components against the edited parent and measure the cut-band surface error. If a component cannot be represented without overlap, loss, or ambiguous bridges at this resolution, HOLD that edit before commitment. Do not pass only because reward totals balance. This explicit discretized ownership rule is provisional and is itself part of A's falsification test.

## 7. Actor-local editing, transforms and motion

Use one stable local sample frame per actor. For the first proof, child actors may keep their parent's frame/origin and orientation; different local COMs are valid. This avoids resampling the field or reseeding it on every split. Bounds can shrink without moving the frame. Later recentering must explicitly compose the frame and fracture mapping and prove identical queries.

1. Broadphase world chunks and actor bounds; attach actor ID, generation and content revision to every collider mapping. Collider handles may be reused, so a handle is not persistent identity.
2. Narrowphase against each candidate's scalar field in local space, not just its approximate convex collider. Compare true surface distances with the world hit; nearest opaque matter blocks a farther target even with the wrong tool. A hollow collider proxy must not become a false mining target.
3. Capture the pose used by the hit. With global actor-frame origin `t`, orientation `R`, floating origin `O`, and origin-relative Rapier/world-space hit `pPhysics`, use `x = Rᵀ((pPhysics + O) - t)`. Here `pPhysics` is not already actor-local. Directions use `dLocal = Rᵀ dWorld`; density is sampled at `(x - sampleFrame.offset)/spacing`. Normal transformation excludes translation. No nonuniform runtime actor scale in the proof.
4. At the next fixed boundary, validate ID/revision/reach and enqueue that local hit. Do not apply a world impact to a later rotated pose. A stale hit is re-picked or rejected, not silently redirected.
5. Create a local draft; resolve material/tool/cell damage; edit density; recompute affected fragments, support/contact graph, component masks, material ledger and mesh/proxy inputs.
6. Worker geometry remains in the stable local frame while the existing body can continue moving. Geometry revision is independent of pose revision; ordinary motion does not cancel useful remeshing.
7. Prepare replacement render products and disabled bodies/colliders; immediately before durability capture the latest pose/velocities at a fixed boundary. Use the brief commit barrier in §10 to keep persistence and the installed pose consistent.
8. For one remaining island, retain actor ID with incremented content revision. For multiple physical islands, retire parent and create deterministic transaction-derived child IDs. Remap hit handles and cancel parent jobs at publication. Children use the same pipeline again.

The actor transform maps its stable local frame origin, not implicitly its COM. Use actual local mass-property COMs from the prepared bodies rather than positioning a body at COM while its mesh still expects a different origin. For children retaining the parent frame, `childFrameOriginInParentFrame` is zero:

```text
childFrameOriginWorld = parentFrameOriginWorld + R * childFrameOriginInParentFrame
childWorldCOM = childFrameOriginWorld + R * childLocalCOM
parentWorldCOM = parentFrameOriginWorld + R * parentLocalCOM
r = childWorldCOM - parentWorldCOM
child.v = parent.v + cross(parent.omega, r)
child.omega = parent.omega
child.orientation = parent.orientation
```

Assign `child.v` as the rigid body's linear COM velocity; save/render/body translations consistently use `childFrameOriginWorld`.

The same correction applies to a single body's COM shift after asymmetric removal. Copy angular velocity for the first proof; no claim of exact angular momentum/energy conservation after mass removal. Avoid artificial zero-velocity resets or separation explosions. Contact-proxy overlap must be bounded; exclude sibling collision for at most one publication step only if measured necessary, never indefinitely. Sleeping actors wake on accepted mining; a failed edit restores the prior sleep/motion state. No automatic impact fracture is required.

## 8. Connectivity and support: choose C, hybrid

| Option | Assessment |
| --- | --- |
| A: sample flood | Cheap, matches current bridge, but conflates field resolution with fracture scale and gives poor partial-cell/contact semantics. Keep as a diagnostic oracle for simple fixtures. |
| B: fracture IDs only | Compact and material aware, but a partly removed cell can contain two disconnected islands; site adjacency can bridge empty space. Insufficient alone. |
| C: fracture fragments with sampled geometry/contact validation | Recommended. More bookkeeping, but separates fracture topology from the mesher while checking actual matter and boundaries. |

Build only the affected bounded graph. Its nodes are **connected occupied portions of fracture cells**, including material/domain partition where needed, not one node for every procedural ID in perpetuity.

The bridge between fields is the occupied lattice-cell volume (eight density corners), not a claim that a sample is a little rigid cube. Start with deterministic 2×2×2 interior quadrature and 2×2 shared-face probes of the trilinear field to estimate occupancy, material/domain fractions and contact area. Cell centers are a fast path only for homogeneous interiors; mixed cells must not lose minority material or grain contacts. Reuse identical global/local face probe positions on both sides. A changed sample dirties all eight incident lattice cells and their contact neighbors.

Within an ID, split disconnected occupied patches before aggregating. Between IDs, create a bond only through measured occupied face contact. A bond stores a stable endpoint/patch key, area estimate, normal, material-pair rule, remaining strength and revision. Corner-only contact is not support. Ambiguous thin necks, sub-sample islands or Surface Nets connectivity disagreement yield conservative HOLD/unknown, not arbitrary detachment. Explicit geometric fixtures must test these cases; this approximate quadrature is not a certified topology reconstruction.

`bondCapacity = contactArea * cohesion(materialPair) * grainDirectionFactor`, with accumulated damage reducing capacity. Capacity controls local damage propagation/bond failure; Phase 0.5 does **not** solve real elastic stress or gravity loads throughout an infinite graph. Wood can resist across-grain cutting differently from along-grain splitting. Dirt may erode a bounded neighboring bond ring after a cut. A broken bond between touching scalar solids needs a visible, representable cut band or component ownership separation; never make two overlapping bodies just by deleting an abstract edge.

World support is reachability to explicit intact base/root/ground anchors through retained bonds. Anchors are descriptors attached to occupied matter, not indestructible hidden points: removing root/base matter removes that anchor. Far evaluated boundaries and nonresident neighbors return `UNKNOWN_SUPPORTED`, preserving the conservative Phase 0 policy. Unknown is not proof of support and not permission to detach; defer the support-changing edit or re-evaluate after required neighbors load within the same bound. No unbounded flood or automatic region expansion.

For actors, compute local connected islands without any world anchor. A fallen tree touching the ground does not become welded back into world matter. Physics contact and structural support are different contracts. Detachment initially emits one actor per retained disconnected island, never one per cell. Very weak dirt islands use the explicit conversion tiers in §14.

Graph-based chunk/bond island detection is supported by destruction-system precedent, but not imported as an engine: [NVIDIA Blast introduction](https://docs.omniverse.nvidia.com/kit/docs/blast-sdk/latest/docs/api/introduction.html). Full stress solving is deliberately separate; Blast's own stress extension illustrates the extra mass, force and bond work that entails. [Blast stress solver](https://nvidia-omniverse.github.io/PhysX/blast/docs/api/extensions/ext_stress.html).

## 9. Collider strategy and low-poly presentation

Keep static world Surface Nets triangle colliders. Use bounded **multiple convex colliders on one body** for actors; never unrestricted dynamic triangle meshes. Rapier documents compound convex representations for dynamic concave matter and allows multiple colliders per body. [Rapier collider guide](https://rapier.rs/docs/user_guides/javascript/colliders/).

| Actor option | Phase 0.5 role |
| --- | --- |
| One hull | Retained baseline; acceptable for nearly convex pieces that pass error checks, not all concavities. |
| One hull per fracture cell | May be useful for a small cluster, but unbounded count and tiny shapes are unacceptable. Not the default. |
| Bounded spatial/fracture-cluster compounds | Recommended. Partition occupied regions deterministically and split the worst-error proxy until tolerances pass or the 8-hull cap is reached. |
| General convex decomposition library | Deferred unless bounded compounds fail the actual rock/tree fixtures. New dependency needs separate justification. |
| Box/coarse proxy | Tiny visual debris or distant noninteractive representation only; interactive matter must restore a validated representation. A box fallback must pass the same near-player error tests. |

Prototype convex plans derive from actual clipped occupied geometry/contact clusters, not just seed centers. Cap hull input points and deterministically reduce interior/redundant points; validate the result against the surface after reduction. Overlapping hulls must not double-count mass: compute material-weighted mass/COM from the matter field, then use explicit Rapier mass properties or normalized collider mass contributions. Verify the vendored 0.20 API before choosing that implementation; do not infer available methods from newer web docs.

Provisional gameplay-safe gates: sampled collision/render surface disagreement ≤0.25 m in either direction; no filled opening ≥0.75 m across in the named notch/tunnel fixtures; no penetration of the standing player or loss of floor support during replacement. Use deterministic rays and occupancy probes plus actual capsule traversal/contact. Bounds agreement alone is insufficient. If the compound cannot meet these within its cap, HOLD the edit/fixture or use only the predeclared tiny-fragment conversion tier. Do not hide a failed concavity test behind a larger conservative hull.

Surface Nets stays fixed during the fracture experiment. Its current geometry is smooth in shape; normals need not make it look plastic. [Surface Nets research basis](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/).

| Shading comparison | Tradeoff / test |
| --- | --- |
| Existing interpolated normals | Control; smooth silhouettes and lighting. |
| Flat triangle normals | First visual variant; identical positions, triangles and physics. Derivative flat shading or nonindexed copies are presentation only; check memory/draw cost. |
| Controlled normal groups | Group by lattice quad/crease angle and material, using stable face keys across seams. Reduces distracting triangulation diagonals; optional focused repair. |
| Modest simplification | Only if those fail the low-poly reading. Preserve cut boundaries, material boundaries, topology and chunk seams; separate benchmark and approval before adoption. |

Normal styles may differ across material/crease boundaries, but coordinate seams must remain absent. Compare identical seeds, camera, lighting, cut sequence and triangle counts before any simplification. Flat normals alone cannot repair an unrecognizable silhouette or unresolved fracture cells. Do not change to Dual Contouring or add a second mesher to make the cellular proof look better.

## 10. Persistence and transactional publication

Use a new cellular-lab namespace/schema (for example `wildkin-voxel-lab-cellular-v1`) and preserve Phase 0 saves intact. Validate domain/profile/generator versions, bounds, finite densities, material IDs, normalized quaternions, velocities, unique actor IDs, revisions, quantities and content checksums before installation. Reject incompatible/corrupt data without resetting it. No shipping save changes or automatic migration.

For the bounded proof, the existing manifest/chunk transaction can also hold small actor snapshots, damage and retirement records. Separate actor object-store records only if measured size warrants them; all affected stores must commit in the **same** IndexedDB transaction. Persist next world deltas, parent retirement/child creation and rewards together. Use stable transaction IDs plus monotonically increasing manifest revision; retries return the committed result or reject stale expectations, never grant drops twice. Pose checkpoints use the same queue and expected actor content revision; they cannot resurrect a retired parent.

**Recommended stronger transaction order: prepare products before durable mutation.** This directly addresses the requested failure behavior instead of committing actor damage and then discovering its replacement collider cannot be built.

```text
LIVE N
  → snapshot + bounded draft (old authority/products stay live)
  → worker mesh, connectivity, proxy plans; validate counts/ownership
  → prepare all GPU resources and disabled Rapier replacements
  → fixed-step commit barrier: verify revisions, capture final motion
  → persist complete N+1 transaction
      abort/error → discard prepared resources; resume LIVE N
      complete → install N+1 + paired products synchronously
  → retire old handles; unlock interactions; resume simulation
```

- Serialize one cellular edit at a time. Reserve peak staging resources and pin affected resident chunks/actors through preparation; unloading cancels before durability. Jobs carry `{transactionId, volumeId, contentRevision, lifetimeGeneration, jobId, domainVersions}`. A retired ID is a tombstone, never a target for a late result.
- Use the same `LabWorldState` queue/commit lock, acquired before final pose capture and held through IndexedDB completion and the synchronous installed-product swap. Defer periodic pose checkpoints while a cellular edit prepares/commits. Already queued work must finish before the lock or invalidate/rebase the proposal through expected revision checks; freezing the physics loop alone is insufficient. After release, queued pose writes re-read live actor records and check content revisions, so none can restore a retired parent. The coordinator owns operation lifetime, not another state store.
- Mesh/proxy generation occurs while the old body moves. Only the final IndexedDB interval pauses the lab's physics step and related edits, saves, origin rebases and residency mutations. Rendering/look input can continue. This small global lab barrier is a deliberate simplicity tradeoff, not a shipping-world freeze strategy. Store the latest parent pose/velocities and prepared child COM motion while paused.
- Prepared bodies are disabled, invisible and excluded from targeting; install their actor-handle mappings only at final publication. Counts include both old and staged objects. No allocations, awaits, callbacks or fallible geometry work belong in the final swap; prevalidate the full batch. Retain old handles until successful installation, then dispose them outside the observable swap boundary.
- Durability succeeds on transaction completion, not an individual request's success. Show pending feedback if final save exceeds 250 ms; attempt to abort an outstanding transaction after 1 s. Resolve its actual abort/complete outcome before resuming; a timeout is not proof of rollback.
- A preparation or durability failure leaves density, damage, rewards, actor motion checkpoint and old products intact. No “hit succeeded” or reward feedback precedes commitment. Retry is explicit/bounded, not every frame forever.
- IndexedDB plus GPU/Rapier is not one ACID system. Crash before durable completion restores N; crash after completion restores N+1, reconstructing its products before gameplay resumes. If an unexpected final swap/device failure occurs after durable completion, pause interactions/simulation and rebuild from N+1 or reload; do not continue using old geometry as if its matter were authoritative. Do not attempt an unsafe silent inverse save.

Initial actor reload may resume its saved velocity or sleep state once neighboring terrain collision is ready. Crash recovery restores the last checkpointed motion, not every unsaved timestep. Near sleeping actors retain editable volumes/colliders but require no graph/mesh work until struck. After a saved sleep checkpoint, far actors can become `DORMANT`: free body, mesh and caches, retain record plus coarse bounds index. Approach/hit request rehydrates and validates products before interaction; dormant matter is not collectible empty space. Active actors never unload without a saved checkpoint and an explicit suspended state. No time-forward offscreen simulation or world re-welding in this proof.

## 11. Three material/object profiles and fixtures

Profile data owns dimensions, size variance/site distribution, jitter, grain transform, cohesion/contact strength, resistance, eligible tools, material density, minimum physical size and conversion thresholds. These initial values are comparison settings, not balancing decisions. Resistances are relative units per cell portion; strength scales with estimated contact area rather than raw sample count.

| Parameter | Rock | Wood / straight-grain tree | Dirt |
| --- | --- | --- | --- |
| Nominal cell dimensions | 1.5 × 1.5 × 1.5 m | 1.0–1.5 m transverse, 3–4 m along trunk | 1.0–1.25 m, roughly isotropic |
| Size variation / jitter | Moderate-high; compare site counts | Moderate, segment seed; strong axial aspect | High irregularity, smaller clods but limited by .5 m sampling |
| Direction | Domain-seeded orientation, approximately isotropic statistics | Tree-local grain; retained after falling | Approximately isotropic, independently salted |
| Relative resistance | 1.0; pick | .6 with axe; direction-dependent | .25; pick/spade-compatible lab action |
| Relative cohesion | 1.0 | Axial 1.5, transverse .5 as an initial probe | .2; bounded neighboring bond weakening |
| Minimum retained physical quantity | 1.0 m³ estimate and ≥1 m minimum meaningful width | 1.0 m³ and ≥1 m thickness; long pieces allowed | 2.0 m³; smaller clods convert |
| Feedback / quantity | Stone chips, optional ore inclusion fixture | Wood pieces/log-sized matter; never recolored stone | Aggregated dirt/clod quantities; no per-clod rigid body |

Rock: approximately 4 m boulder on a narrow removable mineral neck/pedestal, all within the bounded support window. Coherent uncut silhouette, irregular chip, full support cut, fall, secondary notch, split into two retained pieces, then damage a child again. Choose the first fixture with representable thicknesses and a full cut band so its intended split is unambiguous at .5 m; separately adversarial fixtures must exercise HOLD. Include one mixed-material inclusion in automated tests even if the first visible boulder is stone-only.

Tree: approximately 8 m tall, 2–2.5 m thick tapered trunk, flared root/base and a few thick stub branches. All load-bearing limbs remain representable at 0.5 m. Use silhouette/taper/wood colors to read as a simple tree; production leaves are not required. Initial trunk/stubs share one grain frame. Later branches can reference stable branch-segment domains with explicit joint contacts; a smoothly rotating grain metric is deferred because it changes nearest-site search/topology. Cut around the base, watch the upper structure fall as one actor, chop the fallen trunk into retained wood pieces and chop again.

Dirt: roughly 5 × 3 × 3 m mound or wall. Digging yields smaller irregular clods and weaker edge cohesion. Undermine a ledge: at most two retained dirt islands in one operation; smaller portions aggregate as resources and pooled visual debris. Seed/sequence is fixed so this outcome is testable. No avalanche, soil-flow model or hundreds of physical clods.

Run fixtures separately/reset between them when the shared four-actor budget is full. That cap must remain real; do not silently raise it to obtain a demonstration. Future crystal/ice/metal/roots add profile data plus explicitly justified fracture laws; they are not Phase 0.5 content.

## 12. Bounded implementation sequence, after authorization

| Batch | Outcome | Required exit / stop |
| --- | --- | --- |
| 0.5A: one rock, end to end | Pure fracture identity/occupancy oracle first; world/actor adapters; rock removal → detach → fall/rotate → local mine → split → child mine → reload. Shared transaction and capped compounds included. | Prove or reject the architecture before content expansion. Stop for review with failures visible. |
| 0.5B: directional tree | Add profile/grain and explicit base support, simple procedural tree, material-aware fallen chopping. Same edit/actor pipeline. | Tree falls as a connected destructible actor; directional topology survives rotation/reload and chopping creates wood pieces. |
| 0.5C: dirt + integrated limits | Add smaller cells/weak cohesion and collapse conversion rules; sleeping/dormant rehydration, pathology/budget stress, shading comparison and packaged proof. | Three identities visibly and behaviorally differ; bounded fragmentation, saves, offline behavior and review gates pass. |

The pure query/control comparison at the start of A is a short falsification step, not a separate library project. If fracture cuts alias badly at .5 m, enlarge the first cell profiles and record the tradeoff before considering a separate resolution study. If extraction/transactions fail, repair those before adding tree content. No automatic renewal into world-scale streaming optimization, settlement, new dependencies, production integration or habitat buildout.

## 13. Automated tests designed before implementation

Implement the meaningful contract tests alongside each owning slice; fixtures and expected properties precede its runtime code. Existing tests remain controls, not rewritten to accept new results. Determinism hashes use canonical serialization and fixed float treatment, not map insertion order.

| Test family / likely new file | Required assertions |
| --- | --- |
| `voxelFractureField.test.js` | Same seed/frame/profile produces identical full IDs and boundaries; reversed/shuffled query order and actual 1/4-worker results agree; all six chunk faces, edges/corners and negative coordinates agree; ties and hash collisions cannot alias identity; wider-search oracle matches nearest-site queries. |
| Profile statistics in that file | Measure at least 256 interior cells per profile across four seeds in a fixed meter-space volume; rock directional mean chords max/min ≤1.25; wood median axial/transverse chord ratio ≥2.5; dirt median volume below rock (target ≤.65). Exclude clipped boundary cells explicitly. Threshold failures reject the profile, not redefine the statistic. |
| `voxelMatterVolume.test.js` | World/actor padded reads, material/domain data, CSG subtraction and dirty halos agree; no remeshing changes authoritative samples; extraction/recombination ledger exact; surface/occupancy union deviation confined to ≤one .5 m cut band, with ≤5% estimated volume error for named proof fixtures. No duplicate interiors or lost disconnected component. |
| `voxelMatterConnectivity.test.js` | Intact anchored matter stays world-owned; exact sever produces one expected island; unknown boundaries defer; cell partly empty; same ID in disconnected patches (local removal leaves the remote patch exact); thin bridge, diagonal-only contact, mixed ore/stone, root removal, branch junction, rotated grain and seam contacts. Mesh/graph topology ambiguity returns HOLD. |
| `voxelMatterActor.test.js` | Secondary hit changes density/material ledger and geometry hash; requested/content/render/collider revisions become equal at publication; split retires parent, creates exact expected children and both accept another hit. Single surviving actor preserves its frame/ID and advances revision. |
| `voxelMatterTarget.test.js` | World/local ray and point round trips, 90° and arbitrary quaternion rotations, translating/rotating hit during async work, nonzero origins and three-axis rebases; closest-world/actor occlusion, proxy false hit rejected, stale/reused collider handle rejected, mixed-material cut selects correct tool/yield. |
| `voxelMatterPersistence.test.js` | Literal save/load after world damage, detach, secondary actor damage, split, child damage, sleep/dormancy and rehydration. Assert exact ownership and resource balance. Old namespaces untouched; malformed bounds/quaternion/version rejected intact; delayed parent pose save cannot overwrite children; duplicate transaction retry idempotent. |
| Real Rapier tests in `voxelMatterPhysics.test.js` | Rock/tree falls and contacts floor; sleeps; mining wakes and rebuilds it; COM shift and split inherit `v + ω × r` within numerical tolerance. No zero resets for moving parents; no unsupported collider mass doubling. Test substantial rotation, actual shape replacement and query refresh, not only formula helpers. |
| `voxelMatterPublication.test.js` | Inject worker failure, stale completion, second/last collider allocation failure, exhausted staging budget, real IDB abort/quota error, unload and origin request during edit. Old authority/products/rewards survive all precommit failures. Every observed mesh/collider pair shares content revision; no frame/physics step sees old source plus new child. |
| Crash/recovery harness | Stop/reload before durable completion, after durable completion before publication, and after publication before cleanup. Exactly one valid ownership generation loads. Force final swap failure: gameplay pauses and reconstructs committed state; no continuing stale interaction. |
| Limits / stress | 1,000 proposed tiny disconnected pieces, giant component, worst bounded mixed graph and repeated child chops: deterministic conversion or whole-operation HOLD, bounded queues/time/memory; no truncating pieces or discarding rewards to fit a cap. Cap exhaustion cannot evict nearby sleeping actors silently. |

Browser proof uses actual worker counts, real IndexedDB failures and Rapier, native mining input, literal reload, and extracted lab ZIP with zero external requests. Record fixture seed, versions, hashes, platform and thresholds. Pure mocks cannot establish physics, durability or perception.

Human/independent review journeys:

| Recognizable setup | Exact action | Correct result / visible failure |
| --- | --- | --- |
| Gray boulder on a narrow neck | Pick: chip its side, finish cutting the neck; follow it downhill, cut through the fallen piece, hit one resulting piece. Save & reload. | Irregular missing region; one fall then multiple mineable rocks; holes persist. Cubic bites, a frozen unmineable rock, duplicate source or restored parent fail. |
| Tapered brown trunk on flared roots | Axe: cut around its base until severed; wait for it to lie down; cross-cut the fallen trunk twice. | Grain-directed pieces fall and remain wood. Rock-like shattering, floating upper tree or cuts at the old upright location fail. |
| Brown dirt wall with an overhanging lip | Dig along the bottom of the lip, then remove the remaining support. | Small irregular cuts and bounded clod/resource conversion; actor count stays capped. Dozens of rigid clods, silent material disappearance or a long freeze fail. |
| Resting rock beside an open notch | Wait for sleep, mine it, walk through the visibly open notch. | Sleeping matter accepts the hit; collider matches the opening. Invisible blockage or walking through a solid face fails. |

Perceptual review is independent of the implementer. Compare smooth/flat/grouped shading on the same actual geometry and native cut sequence. No screenshot or changed yaw alone proves a readable fall/chop. PC evidence may close the bounded desktop experiment; physical-phone performance remains HOLD until actually tested, without blocking this planning session.

## 14. Performance, body and collider budgets

These are deliberately smaller lab limits than the old long-term 64-PC/20-phone body proposal. Keep them centralized in `config.js`/profile data. Counts include sleeping actors; disabled staged allocations have their own explicit peak cap.

| Limit | Proposed Phase 0.5 bound / response |
| --- | --- |
| Committed resident actor bodies | 4 total, active + sleeping, both profiles; initially one fixture at a time. |
| Compound colliders | ≤8 per actor, ≤32 committed actor colliders total; static world colliders are counted separately. |
| Staging peak | ≤4 replacement bodies / 32 additional colliders; total ≤8 bodies / 64 colliders including old and disabled. Reserve before work; release on every failure. |
| World products in one edit | ≤27 affected world mesh/static-collider products including seam neighbors, all resident/pinned; ≤27 additional disabled static colliders during preparation. Larger dirty batches HOLD before mutation. |
| Actor matter | ≤4,096 occupied owned samples; ≤32 lattice intervals on any axis; ≤40,000 padded sample slots per actor. Both count and bounds checks apply. |
| Support solve | ≤32³ lattice cells, ≤2,048 fracture-fragment nodes, ≤12,288 bonds per operation. Unknown/overflow → whole-operation HOLD with prior state intact. |
| Extraction/split | ≤4 retained physical children, constrained by net resident budget; dirt ≤2 per operation. Sort deterministically by quantity then stable component key. |
| Collider complexity | ≤64 hull input points / proxy, ≤8,192 render triangles / actor initially; split proxy until safe or HOLD. Record resulting hull vertices as well. |
| Work queues | One edit transaction; ≤2 meshing workers PC /1 mobile; ≤8 queued jobs, ≤1 prepared edit batch. Pin/resubmit bounded batches; stale jobs release buffers. |
| Resources / visual debris | ≤64 pickup records (existing bound), batch by material and transaction with exact quantities; ≤32 pooled nonphysical particles. If aggregation cannot fit, HOLD, never lose quantity. |
| Dormant records | ≤64 in this bounded lab, with ≤16 MiB serialized actor data and ≤32 MiB total cellular snapshot. Out-of-budget saves fail before mutation; this is not an infinite-world storage solution. |
| Worker execution | Cooperative cancellation/checkpoints; 100 ms target per connectivity/damage job, 500 ms hard watchdog then cancel/HOLD. Instrument serialization and candidate search separately. |
| Main work / total memory | Retain PC p99 ≤8 ms incremental publication work, frame p95 ≤16.7 ms, ≤750 MB world allocation; phone ≤12 ms /33.3 ms /300 MB. Atomic swaps must fit the cap, not split visible/collider publication across frames. |
| Edit responsiveness | Target accepted-action-to-visible p95 ≤150 ms PC /350 ms phone over ≥30 representative edits; separately report worst split, preparation, IDB barrier, and rejected operations. Baseline max-of-two is not comparable to a new p95. |

Fragment policy, resolved **before committing**:

- Tiny or under-resolved pieces below the profile physical threshold become exact material quantities and bounded nonphysical visual debris. They are not actors and consume no body slot.
- Medium representable islands become destructible actors within body/proxy/field budgets.
- Very large, ambiguous or too-many-medium islands leave the whole requested operation uncommitted with a visible retryable limit reason. They cannot be silently atomized into resources solely to hide exhaustion. A bounded large-component fallback is a later separately reviewed behavior.
- Dirt's predeclared lower-cohesion conversion policy may convert small islands more aggressively; it is deterministic and tested. Existing medium rock/wood does not expire to make room.
- Sleeping actors retain identity and destructibility. Dormant records save cost outside the active region, but rehydration cannot exceed resident caps; wait/reject interaction until safe capacity exists.

Measure .5/16 on the same PC used in Phase 0 plus a named real phone when available. CPU and emulated layout results are labeled separately. Do not lower fidelity, raise caps or call unknown support “pass” merely to meet a timing graph.

## 15. Risks, falsification and alternatives

| Risk / disproof signal | Response within this experiment |
| --- | --- |
| .5 m makes dirt/wood cuts look like grid bites | Increase representable cell dimensions and compare actual cuts; if still unacceptable, HOLD that profile and propose a separate resolution study. Keep baseline evidence. |
| Pure cell aggregation bridges holes or mixes disconnected fragments | Use occupied fragment/contact graph; require mixed/partial-cell fixtures and conservative ambiguity handling. |
| Ownership masks and Surface Nets do not produce compatible split surfaces | Fail extraction gate. Investigate a better mask/rasterization method before more content; do not substitute arbitrary prefractured meshes. |
| Voronoi rock looks crystalline/repetitive or wood cannot be cross-cut usefully | Compare bounded site-count variant or seeded BSP/hierarchical split fallback in the same controlled fixture. Do not lock Voronoi prematurely. |
| Async physics motion makes cuts jump or children teleport | Stable field frame; pose-independent meshing; final captured motion under explicit barrier; rotated input tests. |
| Preparing everything creates memory spikes / collider pauses | Peak reservations and proxy limits; reduce fixture complexity. Preparation cost is part of acceptance, not hidden behind workers. |
| Convex proxies obstruct tunnels or overestimate mass | Error probes and capsule path, material-derived mass, bounded decomposition; HOLD if 8 hulls cannot pass. |
| Final save barrier is perceptibly disruptive | Measure separately. A later journal/publication-pending protocol can avoid global pause, but requires a new explicit recovery design; not an unreviewed optimization. |
| Region boundaries or dormant actors cause permanent floating matter | Label conservative unknown; explicit re-evaluation when resident, with bounded retries. Do not claim world-scale support solved. |
| Recursive edits inflate save/reward state | Exact lineage/quantity partition, revision checks and capped damage/snapshot data; no mesh-as-save authority. |
| Abstraction grows into a second engine | Two concrete adapters, a few pure operations and one transaction owner. Add no registry framework or parallel state store. |

## 16. Acceptance gates and authorization boundary

**Implementation gate: CLOSED.** This document is ready for owner review only. Review or approval of the design alone is not a command to start coding; wait for a fresh explicit implementation instruction naming A or the bounded Phase 0.5 scope. No new dependency, mesher replacement, shipping-world edit, remote publication or old-save migration is implied.

Planning review: two read-only code/review lanes examined field/fracture ownership and actor/physics transactions. Their shared-boundary quantity, component-mask, material-probe, frame/COM and queue-lock clarifications are incorporated; both report no remaining blocking contradiction in their reviewed areas. This is a design review, not implementation proof or owner acceptance.

**0.5A architecture gate:** rock has deterministic non-cubic fracture identity; exactly one appropriate unsupported island transfers ownership; moving/rotated/sleeping actor mining changes its local field; split children retain identity, material, motion and subsequent mineability; literal reload preserves each stage; injected precommit failures retain the prior actor/world; stale jobs cannot resurrect parent matter. Geometry union, proxy error and exact resource conservation pass. If any fail, record HOLD and the specific failed assumption before tree/dirt work.

**Whole Phase 0.5 gate:** all three fixtures pass their native interaction stories, distinct topology metrics and independent visual/behavior review; bounded fragmentation/dormancy/atomic failure tests pass; .5/16 performance and memory receipts disclose regressions; portable lab has no external requests; shipping regression checks still pass. Real-phone admission stays explicitly held until measured. Completion grants no Phase 1 or production replacement authorization.

For a future implementation checkpoint, run focused new tests during work and required `npm test`, `npm run verify`, `npm run zip` once at closure, plus the separate cellular lab browser/package proof. Update current status, code map, report and build log with actual evidence. This planning session adds no runtime tests or performance claims.

## 17. Exact likely files and smallest first batch

Proposed paths are under the isolated lab; none below adds imports to `src/`.

| File | Proposed responsibility / timing |
| --- | --- |
| **Add** `lab/voxel/matter-volume.js` | Bounded field view, world/actor adapters, drafts and padded snapshot contract. A. |
| **Add** `lab/voxel/fracture-field.js` | Seed/site/frame query, implicit cell masks, IDs; no global polygon storage. A. |
| **Add** `lab/voxel/fracture-profiles.js` | Versioned fracture/material-pair/grain settings. Rock A; tree B; dirt C. |
| **Add** `lab/voxel/matter-damage.js` | Pure tool validation, accumulated damage, scalar masks, conserved yield partition. A. |
| **Add** `lab/voxel/matter-connectivity.js` | Occupied fragments, contacts, anchors, conservative bounded islands. A. |
| **Add** `lab/voxel/matter-actor.js` | Validated local actor records, extraction/split lineage and component frames. A. |
| **Add** `lab/voxel/matter-target.js` | World/actor candidate picking, local rays, material/revision hit contract. A. |
| **Add** `lab/voxel/matter-colliders.js` | Pure bounded compound plans and error measures, separate from Rapier handles. A. |
| **Add** `lab/voxel/matter-edit.js` | Proposal/preparation/durability/publication orchestration with injected owners. A. |
| **Add** `lab/voxel/matter-fixtures.js` | Deterministic boulder/tree/dirt shapes, domain IDs and removable anchors. A–C. |
| **Change** `world-state.js` | Keep queue/install authority; delegate cellular proposals, actor pose revisions and retirement. A. |
| **Change** `generator.js` | Cellular fixture/domain sampling route; preserve old base scenario. A–C. |
| **Change** `worker.js`, `worker-pool.js` | Immutable volume jobs, content/lifetime tokens, bounded cancellation. A. |
| **Change** `runtime.js`, `publication.js` | Whole world/actor product preparation, paired swaps, retirement and recovery pause. A. |
| **Change** `physics.js` | Prepare/replace/retire actor compounds, COM/motion, barrier, origin-safe query refresh. A. |
| **Change** `persistence.js` | New namespace/schema validation, actor state/retirement, transactional quantities/revisions. A. |
| **Change** `main.js`, `config.js`, `index.html` | Scenario selection, route hit to coordinator, budget/pending feedback and proof controls; composition only. A–C. |
| **Optional change** `debris.js` | Delegate shared meshing where safe; keep immutable Phase 0 bridge adapter/control. A. |
| **Preserve** `support.js` | Historical bridge solver; cellular path uses new connectivity owner. No pretend generalization. |
| **Preserve core** `surface-nets.js`, `smooth-shading.js` | Reuse contracts; optional render-normal adapter only with unchanged baseline tests. No mesher replacement. |
| **Check/change if needed** `smooth-raycast.js` | Parameterize local field reads for `matter-target.js`; preserve the existing scalar/material hit contract and world regressions. A. |
| **Add tests** `tests/voxelFractureField.test.js`, `voxelMatterVolume.test.js`, `voxelMatterConnectivity.test.js`, `voxelMatterActor.test.js`, `voxelMatterTarget.test.js`, `voxelMatterPersistence.test.js`, `voxelMatterPhysics.test.js`, `voxelMatterPublication.test.js` | Contract matrix in §13; consolidate helpers, not assertions of source text. A–C. |
| **Add** `tools/playtest-voxel-cellular.mjs`, `tools/benchmark-voxel-cellular.mjs` | Native/diagnostic-labeled rock/tree/dirt proofs and bounded performance receipts. A–C. |
| **Check/change if needed** `tools/build-voxel-lab.mjs` | Include new lab modules and local workers; separate extracted package proof. A. |
| **Future evidence/docs** `docs/evidence/voxel-phase05/`, `docs/VOXEL_PHASE05_REPORT.md`, current slice/session start/code map/build log | Actual implementation results only when they exist. |

**Smallest first implementation batch: 0.5A, one rock.** Start with failing deterministic fracture/extraction and transaction tests, then complete the single chain: irregular cut → sever support → one falling actor → mine it after rotation → split → mine a child → save/reload, including failed-save/collider and stale-job cases. Keep one profile, one scene, the existing mesher/resolution and four-body limit. This is the smallest convincing test of the difficult architecture; a static Voronoi preview or an immutable falling rock would leave its central assumption untested. Stop at that evidence gate for review before tree/dirt expansion.
