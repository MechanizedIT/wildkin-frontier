# Independent source review — HOLD

**Reviewed source:** `build_probe.py` SHA-256 `7d063665d5ec52a32dff203cd397e0716a0cde6bfd0f4ad257b8fc7cb3206f86`, frozen `parameters.json`, literal arrays, and CPU proof. This remains a one-chain/one-frond CPU construction probe, not a Trailgloam candidate.

The probe correctly constructs individually closed solids and its current host/collar/link containment evidence is useful, but it does not execute the declared adjacent-link cuff method at the first two joints:

- At cuff 0 it calculates `tangents[-1] + tangents[0]`, joining the final ankle direction to the coxa direction. It must use `tangents[0] + tangents[1]`.
- At cuff 1 it calculates `tangents[0] + tangents[1]`; it must use `tangents[1] + tangents[2]`.

The hoof contact proof also contains only the final cuff-cap **center**. That cannot prove the actual generated six-vertex cap ring enters the closed hoof volume. Check every vertex of the relevant lower cuff cap ring against the hoof half-spaces, or provide a bounded triangle-intersection/penetration measurement that establishes real surface contact. The corrected method must recompute literal arrays and the proof; if either corrected joint loses containment, this probe holds.

No Blender/GPU build is approved until those two narrow source defects are corrected and independently rechecked. The later full model still needs separate planning and all-angle visual admission.

---

## Re-review — renderer HOLD for one provenance fix

**Reviewed correction:** CPU builder SHA-256 `18ffc6c31220607742affc03edfad86bd11e36018ca86b5ad4ce51bfd3ab4d01`, parameters `e43a7ca0f62976a4241cda666c207ee8f435d1a2f7da16a09644a03ee42d6e95`, literal arrays `4ec79f19e7561464db39283ceaafe2d793db324646d13ef444adebc69e897e33`, and renderer SHA-256 `d2f2c2c0ed7a9a0800f91450c795dddd232f02a2b9642ce46d0c8d8453dbf1ec`.

The construction defects are fixed. Cuff 0 now bisects links 0/1, cuff 1 bisects links 1/2, and the CPU proof tests all six final lower cap-ring vertices inside the hoof. The declared `y_min` extension is explicit, and the corrected proof records the corresponding negative containment margin (`-0.0060277m`). The renderer imports literal arrays only and repeats topology/contact checks before rendering; it does not construct or repair a creature.

**One remaining HOLD:** the renderer records source hashes only after loading. It does not reject substituted `literal-mesh-arrays.json` or `cpu-proof.json`; same parameter hash, counts, and contact values could still permit a changed shape. Pin the reviewed literal-array and CPU-proof SHA-256 values as constants and assert both before Blender object creation. Also compare each part's actual array bounds to the frozen proof bounds before rendering. This is a small provenance/parity correction, not a new model method. After it is in place, the single guarded probe render may proceed.

---

## Reproduction and current renderer check — HOLD for literal corrections

I reran CPU builder `18ffc6c31220607742affc03edfad86bd11e36018ca86b5ad4ce51bfd3ab4d01` with frozen parameters `e43a7ca0f62976a4241cda666c207ee8f435d1a2f7da16a09644a03ee42d6e95` into a fresh review-only output. It reproduced the canonical arrays byte-for-byte (`4ec79f19e7561464db39283ceaafe2d793db324646d13ef444adebc69e897e33`) and canonical CPU proof byte-for-byte: **`dc66272ad1b4b1c6072bcc4524e2b63a19d79751e1da2573a4deb86bafdd2ef0`**. Every proof part includes the `min`, `max`, and `extent` bounds consumed by the renderer.

The revised renderer correctly pins the arrays and checks bounds, but its current `CPU_PROOF_SHA256` still uses superseded `fbee179e…`; update it to the reproducible `dc66272a…d2ef0` value. It must also read back each created Blender mesh's float32 vertex coordinates and assert equality with the literal arrays after float32 conversion. Its current contact calculations are CPU-array parity calculations before mesh creation; keep that wording in the receipt, alongside the distinct Blender XYZ/index parity, rather than calling them direct Blender contact remeasurements. These are narrow evidence/provenance fixes. After them, one guarded partial-probe render may proceed.

---

## Final renderer re-review — GO

**Reviewed renderer:** SHA-256 `927db1097dcc5adfc12c7d8a41f9e7fe36e8d4b19a3d2d899832810804c1afd7`; `py_compile` passed.

**GO for one guarded, partial-probe Blender render.** It now pins canonical arrays `4ec79f19e7561464db39283ceaafe2d793db324646d13ef444adebc69e897e33` and the reproduced canonical CPU proof `dc66272ad1b4b1c6072bcc4524e2b63a19d79751e1da2573a4deb86bafdd2ef0` before object creation. It checks every array part against the frozen bounds, reads Blender float32 positions back against equivalent IEEE-754 rounded literals, and retains loop-index order checks. The receipt correctly distinguishes CPU-array contact parity from Blender XYZ/index/loop-triangle parity.

This approval is strictly for the 10-part representative chain/frond probe and its three fixed review views. It is not approval for a full Trailgloam candidate, species integration, export, or runtime admission.
