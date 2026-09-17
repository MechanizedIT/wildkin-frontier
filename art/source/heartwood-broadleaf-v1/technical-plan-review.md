# Heartwood broadleaf staged trial 1 — independent technical readiness review

**Decision: PASS for one supervised staged 512 run only.**

I compared `tools/art/trellis-staged.py` and the frozen `staged-trial-1/plan.json` with the installed local TRELLIS source recorded by the plan. The runner's calls match the installed interfaces: `Trellis2ImageTo3DPipeline` accepts the explicit 512 default, sampler instances and parameter dictionaries, `preprocess_image`, `get_cond`, sparse/shape/texture sampling, and `decode_latent`; the installed model loader accepts the recorded local prefixes. The installed API itself uses the same `o_voxel.postprocess.to_glb` export route. There is no material local-signature mismatch blocking the supervised run.

The plan has a 6 GiB watchdog reserve, a pre-import whole-plan floor of 16.6326 GiB, per-stage floors, one 512 image, a 32,768 coordinate ceiling, a 750,000 decoded-face refusal, no remesh fallback, a fresh plan-only output directory, and staged model clearing. The recorded 18.6758 GiB free memory clears the bootstrap floor at preparation time. It is correct that the preceding small-run guard stop remains a stop, not a reason to reduce limits.

## Risks retained by the approval

- The 2.04 GiB apparent bootstrap headroom is narrow, and the metadata estimates cannot predict import, decoder, or GPU peak use. Start only while the reported free RAM/VRAM and sole-GPU-job conditions still hold; the runner must refuse or its watchdog must stop if they do not.
- The decoded-face cap occurs after decoding, so it limits export work rather than decoder peak memory. A watchdog stop or face-cap refusal is an acceptable terminal experiment outcome.
- A successful raw export would be unreviewed candidate evidence only. It does not admit the mesh, collider, material, or habitat placement.
