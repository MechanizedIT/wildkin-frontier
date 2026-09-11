---
name: wildkin-asset-forge
description: Generate, optimize, rig, animate and admit local 3D characters and props for Wildkin Frontier from approved reference images. Use for this project's asset production and visual repair, not UI design or generic game development.
---

# Wildkin asset forge

Produce a visually reviewed, editable source and an offline-ready GLB for Wildkin Frontier. This is a project workflow, not a universal automatic rigger. Current proof and open limitations live in `docs/LOCAL_ASSET_PIPELINE.md`; never turn a pending experiment into an accepted default. The three previously admitted models prove the packaging path, not that their animation is owner-accepted: owner-observed motion defects reopen that asset's motion admission.

Find the repository from the working directory, or use `C:/Users/cwood/Documents/mobile-rpg` on Chris's laptop. Read its `AGENTS.md` and `docs/CURRENT_SLICE.md`. Preserve explicit current owner direction: landscape mobile/web, substantial stylized faceted forms, clear contrasting colors, restrained shading and no reflections. The brown-haired blue-jacket explorer is the style/identity target. Keep approved creature references even when a modeling method fails.

## Work from evidence

1. Identify the asset's existing ID, class, intended size, game uses and collision descriptor. Choose a reviewed reference or generate a mesh-ready single-subject image using the built-in OpenAI image tool. Inspect the reference first when editing. Its tool does not expose its backend image-model version: record **undisclosed**, never invent a model number.
2. Have a separate agent inspect the actual image before image-to-3D. Look for unexplained fittings, impossible connections, mismatched repeated parts, fused limbs, extra digits, misleading shadows and contaminated silhouettes. The crate's rejected unexplained gold tab and baked checkerboard are concrete examples. Preserve intentional asymmetry and functional hardware. Check image bytes: an apparent checkerboard is not evidence of transparency. Prefer a clean opaque white image with the local generator's background removal when generated alpha has halos.
3. Use [local-tools.md](references/local-tools.md) for local TRELLIS generation, inspection and texture-aware reduction. Preserve raw masters; each experimental output directory is new. Compare matching front/rear/three-quarter renders and game-sized views. A triangle count or unchanged texture hash cannot establish visual fidelity.
4. For a production batch or reference-driven art pass, use [dream-loop-production.md](references/dream-loop-production.md). It combines the approved Dream Loop target-image loop with this local asset pipeline: reference author, model implementer and independent visual judge. A visual score below 8/10 is a revision, not admission.
5. For characters, use [rigging.md](references/rigging.md). Establish the actual mesh's head, spine and ordinary travel direction before fitting an anatomy profile; preserve UVs, export in-place clips and inspect a complete motion cycle in Three.js. Static props need grounded scale/orientation normalization instead.
6. Use [admission.md](references/admission.md) for source packaging, runtime integration and checks. A separate reviewer decides whether the model and, when applicable, motion meet the target. Keep IDs, collision, save ownership and Author/Play parity. Only the shipping GLB goes under `assets/`; references, raw geometry and Blender sources stay outside it.

The reference author, model implementer and visual judge must not be the same agent for one acceptance decision. The parent coordinates useful parallel work and serializes heavy local GPU jobs. Judge actual images or motion, not prompts, script descriptions or manifests. Record reviewer identity, concrete findings, evidence paths and pass/fail; a conditional pass stays pending until its condition is tested. Character admission additionally requires the motion gates in `rigging.md`; neither a clip count, a structural metric nor a good still score can waive them. The owner's physical-phone observation is a distinct final evaluation and overrides prior agent evidence.

If a result fails, name the visible defect and alter the relevant step. Repeated UV damage means change the reduction/retopology method, not lower the reference standard. Repeated anatomy/weight failures mean inspect landmarks and joints, repair topology or use a more suitable rigging method. Do not repeatedly run unchanged parameters. Ask the owner only for a consequential unresolved design choice, paid service, destructive change or genuine blocker; normal local iterations are already authorized.

## Delivery boundaries

- Local free image-to-3D and processing; no paid API fallback or publishing without owner authorization. Do not read or print `.env` credentials.
- Keep the existing Author library as the stable asset registry, placement, collision and export tool. External models are read-only at primitive level; keep primitive recipes useful for simple editable assets. Do not delete the builder or replace the physics shape with render geometry.
- Do not spread a bad rig across the library. Repair an approved mesh/pose when it can retain likeness, colors and texture cleanly; regenerate only when source anatomy cannot be made reliable. Static props may continue through their own reviewed batch while a character animation defect remains open.
- For a class batch, inventory existing assets and their runtime uses first. Group compatible static props, humanoids, quadrupeds and other creature anatomies; each class gets a fitted review/rigging approach. Check every affected sibling path (wild creature, companion, player, Author preview and static placement) when integrating a new revision.
- Mixamo is a proposed, not admitted, source of biped animation. It has not been tested, uploaded to, or authorized for this project. A future owner-authorized trial must use its documented biped workflow, retarget locally in Blender, preserve the game mesh/texture/tool grip, remove root travel and pass the exact runtime motion gates.
- Work on `main` as required by this repository. Preserve unrelated uncommitted work and commit cohesive changes selectively.
- Close with actual visual and runtime evidence, source locations, precise asset counts and remaining limitations. Browser phone viewports are not physical-phone performance proof. Follow the project's required test/build/ZIP checks after integration.
