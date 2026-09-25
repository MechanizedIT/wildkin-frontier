# Copy-ready prompt — Unity U5 minimal destruction slice

Use only after the Unity material/procedural-rock checkpoint is reviewed and PASS.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U5
MINIMAL DESTRUCTIBLE MATTER VERTICAL SLICE

ROLE

Prove that the selected Unity matter representation, mesher and material
system can host the essential behavior learned from browser Phases A–E.

This is the final Unity qualification gate before choosing whether Unity
becomes the provisional production engine.

Do NOT port every old system.
Do NOT implement infinite streaming.
Do NOT start Unreal unless this phase exposes a blocker and the owner
later authorizes the challenger.

============================================================
0. BASELINE
============================================================

Read:

- docs/UNITY_FIRST_TRANSITION_PLAN.md
- native/shared/reference/PHASE05E_REFERENCE.json
- docs/VOXEL_PHASE05E_REPORT.md
- all Unity qualification evidence
- selected mesher/resolution/material/stamp decisions

Verify Unity tests/build green.

============================================================
1. VERTICAL-SLICE SCENE
============================================================

Create one compact stylized scene containing:

- dirt terrain
- exposed/buried rock
- one procedural RockFormationStamp resolved into matter
- one shallow overhang or support relationship
- player/free camera sufficient to target matter
- attractive enough HDRP lighting to judge the materials

The scene should use the actual selected runtime matter renderer.

============================================================
2. DIRECT EDITING
============================================================

Implement two bounded tool actions:

DIRT DIG
- broader/softer removal

ROCK STRIKE
- smaller/harder local removal

Use authoritative matter targeting.

Do not use the rigid-body collider as precision mining authority.

A ray may use render/broadphase information to find a candidate, but the
accepted edit must resolve against matter.

============================================================
3. OWNERSHIP CONTRACT
============================================================

Implement the smallest native ownership model needed to prove:

WORLD
ACTOR
CONSUMED

Per-material accounting:

initial =
world + actors + consumed

At minimum:

ROCK
DIRT

Detachment creates no reward.

Direct consumption creates reward/consumption once.

Do not reproduce the browser's exact typed ledger if a cleaner native
representation is available.

============================================================
4. LOCAL SUPPORT
============================================================

Port the behavior, not the exact algorithm.

After relevant world edits:

- derive structural seeds from changed matter
- inspect bounded local support/connectivity
- prove one component initially supported
- after sufficient excavation prove it unsupported
- unknown boundary fails closed

Keep explicit work/bounds instrumentation.

Do not scan the entire qualification scene after every hit.

============================================================
5. STATIC → DYNAMIC TRANSFER
============================================================

When the selected component is proven unsupported:

- collect complete resolved component
- build actor-local matter volume
- transfer ownership atomically
- clear/tombstone world matter
- remesh affected world bricks
- create dynamic actor render mesh
- create approximate physics proxy
- persist coherent new state

No duplicate matter.

No detachment reward.

The actor must no longer depend on world brick identity.

============================================================
6. MATTERACTOR
============================================================

Create one native MatterActor with:

- stable ID
- local matter volume
- local material field
- transform
- content revision
- physics representation
- rendering product

Use the selected stylized material projection so texture remains stable
while moving.

Approximate convex/compound collision is acceptable.

Do not chase exact concavity.

============================================================
7. PHYSICS
============================================================

Use Unity physics appropriate for the prototype.

Actor should:

- fall under gravity
- collide with terrain/static collision
- rotate naturally
- settle

Record:

- fall distance
- rotation
- contact outcome
- settle velocity

The visual surface remains matter-derived; rigid-body proxy may be
simpler.

============================================================
8. MOVED-POSE EDIT
============================================================

After the actor settles:

- target its current visible matter surface
- perform a dirt or rock edit as appropriate
- remesh the actor
- preserve transform/physics continuity

Original world position must not remain targetable as the old matter.

If editing disconnects authoritative components, do not keep disconnected
large components in one rigid body.

A minimal split/debris policy is sufficient for the qualification.

============================================================
9. PROCEDURAL ROCK DESTRUCTION
============================================================

Use at least one U4 generated RockFormationStamp as ordinary matter.

Prove:

procedural source
→ resolved matter
→ direct damage
→ detached/split matter
→ moved edit

Simulation after generation must not depend on source primitive GameObjects.

============================================================
10. PERSISTENCE
============================================================

Save and reload:

- world seed/version
- sparse edits
- ownership state
- actor local matter
- actor transform/velocity as appropriate
- revisions
- consumed totals

Do not save generated meshes/colliders.

Reload must not regenerate removed/extracted matter.

A simple qualification save format is acceptable.

============================================================
11. TRANSACTION / FAILURE SAFETY
============================================================

Implement a bounded proposal/preparation/publication model.

At minimum test failures in:

- world mesh preparation
- actor mesh preparation
- collider preparation
- save/persistence
- stale revision

A rejected edit must not:

- lose world matter
- duplicate actor matter
- double reward

Do not reproduce browser-specific rollback machinery if Unity provides a
cleaner staging approach.

============================================================
12. JOBS / MAIN-THREAD BOUNDARY
============================================================

This phase must expose real engine integration cost.

Instrument:

- matter edit CPU
- support query
- meshing job
- mesh upload/main-thread apply
- collider creation
- transaction/persistence
- end-to-end visible hitch

Use Jobs/Burst for obvious heavy loops if U2/U3 established a clean path.

Do not hide a 500 ms main-thread stall behind averaged FPS.

Capture frame-time/hitch evidence.

============================================================
13. AGENT AUTONOMY
============================================================

Codex must be able to drive the sequence through project tooling:

- reset fixture
- dig target
- query matter/support stats
- trigger/observe detachment
- inspect actor
- edit moved actor
- save/reload
- capture screenshots
- export receipt

The exact player input can remain available, but automated evidence should
not require owner clicking exact coordinates.

Custom tools must call the real runtime authority.

============================================================
14. HUMAN-VISIBLE SEQUENCE
============================================================

Capture:

01 pristine stylized scene
02 first dirt dig
03 exposed rock/material seam
04 pre-detachment support
05 support removed
06 component separating
07 actor falling
08 actor settled
09 old cavity
10 moved actor targeted
11 moved actor edited
12 save
13 reload

Include debug overlays separately for:

- matter/bricks
- support bounds/read set
- dirty write set
- ownership/ledger

Default beauty captures should keep debug overlays off.

============================================================
15. REFERENCE CONTRACT
============================================================

Do not require exact Phase E quantities.

Require the same invariants from:

native/shared/reference/PHASE05E_REFERENCE.json

Especially:

- atomic transfer
- no reward on detach
- local actor matter
- no regeneration
- bounded support
- material-specific edit
- precision matter targeting
- physics proxy separation

Document any intentionally changed native interpretation.

============================================================
16. TESTS
============================================================

Required automated tests:

- dirt vs rock edit difference
- exact ownership balance
- detachment no reward
- bounded support / unknown fails closed
- world→actor transfer once
- world cavity remains empty
- moved actor target succeeds
- old target misses
- persistence round trip
- stale/rejected transaction preserves state
- procedural stamp becomes normal matter
- no disconnected retained component in one actor after edit

PlayMode integration tests should exercise real Unity mesh/physics path for
at least the main transfer chain.

============================================================
17. PERFORMANCE RECEIPT
============================================================

Record Editor AND Windows development-player values:

- matter edit
- support query
- meshing
- mesh upload
- static collider update
- actor collider creation
- persistence
- full transaction
- peak hitch/frame time
- memory for fixture matter/mesh

No final production budget yet.

The question is whether Unity has a credible path, not whether it is
already optimized.

============================================================
18. UNITY QUALIFICATION DECISION
============================================================

At the end make a factual evidence-based recommendation:

A. UNITY QUALIFIED
Continue to the production native matter kernel.

B. UNITY QUALIFIED WITH SPECIFIC RISK
Continue Unity but carry one named investigation.

C. UNREAL CHALLENGER JUSTIFIED
Name the exact blocker Unreal should be tested against.

Do not start Unreal automatically.

============================================================
19. EVIDENCE
============================================================

Write:

native/evidence/unity/u4-destruction-slice/

Include:

- README
- JSON receipt
- visual sequence
- profiler/benchmark summary
- test summary
- agent intervention summary

============================================================
20. VALIDATION / REVIEW
============================================================

- all Unity EditMode tests
- all Unity PlayMode tests
- Windows development build
- automated evidence sequence
- no project cache pollution
- independent technical review
- independent visual review for the stylized result

Commit/push if authorized.

Final response:

PASS/HOLD
commit
Unity qualification result
agent autonomy result
mesher/resolution/material stack
destruction result
ownership result
physics result
persistence result
performance
evidence
known risks
whether Unreal challenger is justified

STOP FOR OWNER REVIEW.
