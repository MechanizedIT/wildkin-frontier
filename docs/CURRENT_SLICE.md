# Wildkin Frontier — Early Access Candidate

**Status:** SUNLIT WILDS 0.3.0-alpha.1 — LOCAL CANDIDATE READY FOR OWNER PLAYTEST
**Owner authorization:** September 9, 2026. Chris requested an end-to-end playable beta candidate, professional game design/development, full campaign depth and polish, authoring improvements, autonomous implementation/testing, and explicitly superseded previous slice/AGENTS restrictions. The Devpost event is historical and no longer sets product scope.

## Active objective

**September 11 phone follow-up and live Blender tooling:** Chris likes both revised models and the Explorer's animation shapes, but requests roughly 30–40% slower sneak/walk/run and still finds Mossling motion wrong. Player ground speeds and their linked animation cadence are provisionally reduced 35% together; attack/dodge/climb and authored jump-pad impulses remain unchanged. The exact interpretation of cadence versus travel is provisional pending Chris's reply. Mossling motion acceptance is reopened: revised contact-correct candidates still fail independent visual review and are not integrated. A researched quadruped workflow and free Quaternius motion references are retained. Chris explicitly authorized Blender MCP installation; its live scene, viewport capture and frame-edit/restore protocol checks pass. Use this workbench for pose/weight inspection before further bakes. img2threejs was assessed and its useful offline rig checks adopted; its procedural reconstruction pipeline is not a replacement for the game's textured GLBs. See `MOTION_WORKFLOW_REVIEW.md` and Asset Forge's Blender/quadruped references.

**Latest physical-phone feedback — animation acceptance reopened:** Chris likes the new model appearance but reports a sideways-headed/sideways-running Mossling and a stiff, wide-striding Explorer. Direct model views confirm the Mossling head and torso/paw axes disagree; the humanoid gait script lacks pelvis/chest rotation and drives large strides on short legs. Earlier animation PASS reports are superseded by this observation, while the local generation/texture/package/runtime work remains useful. Refine Asset Forge with Dream Loop, neutral-pose anatomy review and ordinary-input motion evidence before scaling character production. Mixamo is the owner-authorized free humanoid trial; upload and automatic rigging succeeded after sign-in. Current investigation and next actions are in `MOTION_WORKFLOW_REVIEW.md`.

**Latest owner correction — no hackathon size cap:** Chris explicitly confirmed the old 35 MB limit belonged to the retired Devpost project and no longer applies. Remove that hard gate from build/ZIP tooling and asset-workflow guidance. Continue measuring actual size and mobile rendering/loading costs; historical phase documents and older size-check results do not reinstate the cap.

**Latest owner goal — reliable local asset pipeline:** Chris explicitly requested goal mode and autonomous work to create and prove a project-specific workflow/skill for approved reference images → local image-to-3D → mobile-ready textures/meshes → character rigging/animation → game integration and validation. Select and test suitable free local tools; preserve the chosen art direction and working game. Prove the process with creature, humanoid and static-asset examples and an independent replay before calling it reliable. Reassess the in-game primitive asset builder: complex modeling may move to external tools, while stable asset IDs, placement, collision metadata, Author preview and export must remain supported. Exact replacement details are provisional pending implementation evidence. No paid-service spending or publication is implied.

**Local asset workflow completed:** The installed project skill `wildkin-asset-forge` now covers independent reference review, local TRELLIS generation, texture-aware optimization, fitted Blender rigs/animations, exact-hash visual judging and offline admission. Three candidate examples are integrated: a 1,552-triangle crate, 19,999-triangle Mossling with five clips, and 19,998-triangle Explorer with eleven clips and fitted Field Tool grip. Original textures and editable sources are retained outside the shipping assets. Independent model/motion reviews and the crate workflow replay pass; the prior rejected hand repairs are excluded. The shared runtime preserves stable asset IDs, collision, Author metadata/export and individual skeleton ownership. Complex modeling moves to Blender while primitive assets remain editable in Author.

Final proof: 645 JavaScript tests, four Python GLB-checker tests, world/campaign verification and ZIP validation pass. The unpacked build is 30,859.6 KB; ZIP is 12,450.7 KB. Packaged landscape checks load all three local models, exercise player movement/attack/grip, Mossling walk/run and an independent companion, and continue with movement/menus offline without external requests or errors. Exact candidate aesthetics and physical-phone performance remain for Chris to assess. See `LOCAL_ASSET_PIPELINE.md` for the full process, evidence and manual spot check. The wider all-asset Dream Loop replacement remains separate work; the historical interim scores below are not a claim that every family is finished.

Substantially redesign visual quality, world layout, inventory and skill progression from the owner's Dreamdale / Eternal Hero recordings and feedback. `docs/VISUAL_REDESIGN_PLAN.md` is the active implementation and acceptance plan. Preserve the central decision: **How far do I push before securing what I found?**

See `docs/BETA_RELEASE_PLAN.md` for implementation and acceptance gates. Earlier phase specs document established behavior and regression evidence; they no longer forbid campaign design, companion/progression work, or agent-authored levels.

The prior candidate includes campaign, companion/progression, backup restoration and authoring checks, but the owner found placeholder-looking art, weak layout, wordy UI and a broken first parkour approach. Its 599 passing tests did not prove those perceptual and traversal requirements. Prior candidate reports are historical evidence, not current readiness or acceptance. This pass requires meaningful visual comparison and ordinary-input traversal proof.

## Product scope

- Camp plus five handcrafted, portal-connected expedition regions with distinct ecology, landmarks, harvest routes, optional traversal and secrets.
- Four bondable Wildkin; interactive bonding, at-risk capture, extraction securing, active companion selection, useful abilities and revisit opportunities.
- Meaningful persistent upgrade tiers, materials, healing crafting, journal/objectives, discovery and a campaign endpoint.
- Cohesive alien frontier aesthetic, readable explorer/creature silhouettes, responsive low-chrome UI, onboarding, pause/settings and satisfying feedback.
- Reliable save/load, extraction/death, travel, author/play/export, build and offline local operation.

## Delivery boundary

Keep development local on main. No publication, store submission, paid services, or release approval is implied. Finish a candidate for Chris to test and report actual proof, remaining limitations, and human device checks honestly. A playable beta candidate is not a claim of a commercially released game.

## Current checkpoint — September 10, 2026

The visual/feel redesign is implemented and locally validated. See `docs/SUNLIT_WILDS_REVIEW.md` for the reference analysis, delivered scope, actual route/hazard/UI/editor/package proof and remaining human acceptance. 617 automated tests pass; all five redesigned course sequences are keyboard-traversed. The new thorn beds share their visible and failure bounds. No publication or owner beta-quality acceptance is claimed.
