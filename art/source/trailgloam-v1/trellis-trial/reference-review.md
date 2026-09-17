# Trailgloam TRELLIS trial — independent reference and route review

**Experimental-input decision: GO.** Use `../rotation-1-reference/target-v2.png`, SHA-256 `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff`, as the one single-image input for a supervised TRELLIS trial. It is a clean isolated opaque subject on white, with a coherent low teal body, forward face/eyes, articulated low legs, dark cuffs/feet, and two large amber dorsal fronds. It is better suited to image-to-3D conditioning than a contact sheet or an in-world capture.

`../reference/reference-v2.png` is also clean and broadly compatible, but its separate provenance is weaker and it frames/crops the rear-side anatomy more tightly. The saved `target-v2.png` already has an explicit archived source record, so it is the more reviewable experiment input.

## Deliberate inference and later gates

The perspective shows five unambiguous root-to-foot chains; the hidden sixth is an ordinary occlusion, not a reason to categorically forbid a one-image image-to-3D experiment. The trial must declare six grounded legs as a **post-generation correction/admission requirement**, inferred from the species construction brief and orthographic evidence rather than claimed to be visible in this one image. The hidden-side body, rear socket placements, underside, closure, materials, scale, contact, and animation are likewise unknown from the image.

The image is a good high-level master for body volume, palette, eye placement, leg segmentation, cuff contrast, and the two amber frond silhouettes. It is not a literal topology template. A raw TRELLIS result remains an unadmitted master until all-angle inspection establishes a useful six-leg creature; a missing rear leg, floating foot, fused limb, buried frond, open surface, or unhelpful small-scale silhouette is a model repair issue, not evidence that this reference was unusable.

## Recommended supervised route

For one trial, prefer the existing `trellis-local.ps1 -Profile Small512` loopback-service path plus `test-trellis-local.py` over the fresh process-staged helper. This is the closest local route to the recorded successful Mossling 512 semantics: the service uses the installed pipeline's normal `run`/decode/export path and the request sends the historical 512, 12-step, guidance 7.5, texture-guidance 1.0, texture-rescale 3.0, 60k-face, 1K-texture settings. The staged helper intentionally differs in handoffs and decoder path and has repeatedly met its decoded-face refusal; it is not proven equivalent to the successful service behavior.

The service route is not a claim of lower risk or of decode-size control. Its reviewed Small512 launcher preserves its own 18 GiB startup floor, 6 GiB owned-process watchdog, 512-only model filter, offline cache, loopback binding, and one owned service record; it does **not** provide the process-staged 750k decoded-face refusal. At the currently reported 19.63 GiB free, root may make one supervised decision under those unchanged guards. Preserve the service launch record, input SHA, request/response, GPU samples, raw GLB or terminal failure, then stop. No guard, cap, helper, handoff, or retry change is authorized by this review.

This is a generation-input GO only. It does not admit a species mesh, rig, animation, collision, runtime encounter, or gameplay behavior.

## Service-start terminal receipt and continuation decision

The reviewed Small512 service did not reach a request or inference. Its owned process stopped during startup when its unchanged RAM watchdog recorded **5.80 GiB** free; the recorded PID was absent afterward and host free RAM recovered to **18.70 GiB**. Preserve that as a terminal service-start failure. It is not evidence about the Trailgloam input, decode size, mesh quality, or the historical Mossling result.

**Continuation decision: GO for one separately supervised process-staged full-export trial.** Root may use the unchanged reviewed staged 512 / 12-step / 30k requested-export / 1K-texture profile on the same pinned `target-v2.png`, with distinct fresh preflight and run directories and every existing offline, mutex, bootstrap/stage, coordinate, 6 GiB reserve, 8 GiB pre-export, and 750k decoded-face guard retained. This is a method change from the service, not an automatic retry of it.

The staged helper may refuse the decoded mesh before GLB export. If it does, retain its failure evidence and stop: a geometry-only export, cap change, resume, Blender cleanup, or another attempt requires a new independent review. A successful raw GLB still requires separate all-angle mesh and species admission review.
