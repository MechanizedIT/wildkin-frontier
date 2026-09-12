# Local motion-reference video trial

September12,2026. **Authorized preparation; generation and animation benefit not yet proved.** Chris supplied https://x.com/Stefan_3D_AI/status/2098387407565730203 and explicitly approved a free local video-generation test. He also mentioned approximately$10 Gemini/AI Studio API credit; this is an alternative to price and prepare, not a paid-generation authorization. Continue the second overnight game-development goal alongside this bounded trial.

## What the example actually demonstrates

X's exact status could not be retrieved directly. The author's own posts, available through a [profile mirror](https://www.sotwe.com/Stefan_3D_AI?lang=en), describe an optimized Tripo model, Seedance2.5 motion references made from the same side-view image, selecting useful takes, choosing clip timing upfront, then GPT-6 with Blender MCP and feedback rounds. He explicitly distinguishes this from mocap. Treat this as the author's reported result, not independently validated rig quality or evidence that video contains a ready-made skeleton.

Our existing Explorer uses Mixamo. Shipping MosslingV3 uses a fitted anatomical proxy/weights and measured CC0 Wolf contact rhythm. No generated video was used for those animations. See MOTION_REFERENCE_PLAN for exact provenance and current motion-review limits.

## Bounded first experiment

- Preserve the approved Mossling neutral target and current shipping mesh/rig. Input is the existing `art/targets/mossling-neutral-v3/reference.png`, copied byte-for-byte into a separate study. Do not change anatomy to excuse a video defect.
- Produce one small, short walking reference locally. Fixed camera, readable complete body and floor contact, repeated natural four-legged walking, restrained head/body/leaf motion. No scene cuts, orbiting camera, extra limbs or shape changes.
- First establish that a model can run safely on RTX3070Laptop8GiBVRAM/32GiBRAM. One heavy job at a time; conservative resolution/frame count, bounded CPU threads and timeout, measured RAM/VRAM. Never lower existing headroom guards or start alongside Blender/TRELLIS/native browser review.
- Pin exact code/model revisions and retain licenses, source/input hashes, actual request, timing, resource samples and unedited output. Tool/models/cache stay outside shipping assets. Do not introduce a runtime network dependency.
- Independently inspect temporal identity, contact, weight shifts, cadence and camera stability. A successful MP4 is a generation proof, not animation admission. Stills can flag defects but do not establish continuous motion quality.
- Only a useful reference proceeds to a separate candidate fit in Blender against the existing bone bases and fixed limb lengths. Preserve Idle/Walk/Run/Attack/Hurt names and authored game timing. Compare the exported candidate at normal speed and actual game scale before integration; do not replace current animation merely because generation succeeded.

## Google alternative, priced but not executed

**Local installation checkpoint, September12 01:06CDT:** isolated `C:/Users/cwood/Tools/wildkin-ltx-video` is installed; pinned Comfy core `532e2850794c7b497174a0a42ac0cb1fe5b62499`, Python3.11.5/Torch2.8cu128/Transformers4.51.3 pass dependency/import checks. Both upstream checkpoint/T5 weights match exact published sizes/SHA256; licenses and frozen dependencies are retained. Graph is512×416/49frames/batch1, preserving the complete6:5 Mossling input. No server/inference/video has run. Available host RAM≈16GiB remains below the20GiB conservative launch margin; leave idle until resource checks pass. Exact receipt: `.dream-loop/local-motion-video/INSTALL_RECEIPT.md`. No existing TRELLIS/global environment was changed.

[Google's current pricing](https://ai.google.dev/gemini-api/docs/pricing) lists720p Veo3.1 Lite at$0.05/s, Fast at$0.10/s and Standard at$0.40/s. Thus an8s clip is$0.40/$0.80/$3.20 respectively. [Veo API docs](https://ai.google.dev/gemini-api/docs/veo) support an initial image, durations4/6/8s and one result per request. A separate reference-images request requires8s. A useful proposed comparison is one8s Fast image-to-video from the identical local target, estimated$0.80; no request, key inspection, upload, charge or billing change has occurred.

[Billing documentation](https://ai.google.dev/gemini-api/docs/billing) distinguishes prepaid Gemini API credit from ineligible Google Cloud welcome credits. Actual available balance/project eligibility remains unverified. Recheck price and exact balance before any separately authorized paid trial; never infer permission to spend the full mentioned balance.
