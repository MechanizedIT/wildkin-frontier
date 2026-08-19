# Meta Horizon Game Prototype — Phase 0 Spec

## Status

READY TO IMPLEMENT  
This document is intended to become docs/CURRENT\_SLICE.md for the first coding-agent session.

# 1\. Phase Goal

Create a compliant, intentionally minimal Three.js/HTML5 mobile game foundation that launches reliably on desktop and phone, works without runtime network access, and already has a reproducible submission-build path.

At the end of Phase 0, there is not yet a game. There is a trustworthy shell that later slices can build on without reworking project structure or hackathon packaging.

# 2\. Player-Visible Outcome

Opening the game shows a portrait-oriented 3D scene with:  
\- A small low-poly ground/island test area.  
\- A simple placeholder player marker.  
\- A fixed high third-person / near top-down camera.  
\- Basic lighting and a readable background.  
\- A minimal HUD showing the project working in portrait.  
\- A small debug/version label that can be removed later.

No movement, harvesting, combat, Wildkin, progression, or base systems are required yet.

# 3\. Non-Negotiable Hackathon Constraints

The implementation must preserve these from day one:  
\- Single-player.  
\- Portrait mobile presentation.  
\- Three.js / HTML5 web build.  
\- No runtime external network requests.  
\- All assets and dependencies used by the submitted build are local and referenced relatively.  
\- Three.js is stored under /vendor.  
\- Final submission ZIP has index.html at its root and is no larger than 35 MB.  
\- First-party game code in the submitted index.html is readable and unminified.  
\- Development may use modular source files, but the submission build must assemble first-party JavaScript/CSS into the required root index.html.  
\- The build log must record AI-assisted development continuously.

# 4\. Technical Direction

Prefer the simplest architecture that supports repeated agent edits.

Recommended:  
\- Vanilla HTML, CSS, and JavaScript.  
\- Three.js only for rendering in Phase 0\.  
\- No React, game engine, UI framework, physics engine, ECS framework, backend, database, or cloud dependency.  
\- No CDN imports.  
\- No required build bundler for normal development.  
\- Node.js may be used for local helper scripts such as serving, packaging, and validation.

Development source can remain modular for agent readability. Submission tooling should produce a separate dist/submission build rather than forcing development to happen in one giant index.html.

Suggested structure:

/  
  AGENTS.md  
  README.md  
  package.json  
  index.html  
  src/  
    main.js  
    game/  
      createScene.js  
      createCamera.js  
      createRenderer.js  
  styles/  
    game.css  
  assets/  
  vendor/  
    three.module.js  
  docs/  
    GAME\_DESIGN.md  
    HACKATHON\_REQUIREMENTS.md  
    BUILD\_LOG.md  
    CURRENT\_SLICE.md  
    PLAYTEST\_NOTES.md  
  tools/  
    build-submission.mjs  
    validate-submission.mjs  
  dist/

The agent may simplify this structure if there is a clear reason, but must not introduce framework-heavy architecture.

# 5\. Required Repository Documents

AGENTS.md  
Keep short. It should tell every coding agent:  
\- Read docs/CURRENT\_SLICE.md first.  
\- Read GAME\_DESIGN.md and HACKATHON\_REQUIREMENTS.md before changing architecture or gameplay.  
\- Do not expand scope beyond the active slice.  
\- Preserve mobile portrait, offline, and submission constraints.  
\- Keep the build playable at the end of every session.  
\- Prefer simple explicit code.  
\- Validate before stopping.  
\- Append a BUILD\_LOG entry.  
\- Never silently change locked design decisions; record proposals instead.

README.md  
Include:  
\- One-paragraph project description.  
\- Prerequisites.  
\- How to install/run locally.  
\- How to expose the local server to a phone on the same network.  
\- How to build the submission package.  
\- How to run submission validation.  
\- Agent read order.

docs/GAME\_DESIGN.md  
Create a concise repository mirror of the stable game-design decisions from the living planning document. Do not invent unresolved mechanics. Mark open questions as open.

docs/HACKATHON\_REQUIREMENTS.md  
Record the hard submission and gameplay constraints that agents must not accidentally violate.

docs/BUILD\_LOG.md  
Start it immediately. Each AI session should append:  
\- Date/time.  
\- Tool/agent/model if known.  
\- Goal/prompt summary.  
\- Decisions made.  
\- Files/features changed.  
\- Tests/validation performed.  
\- Human/manual changes if any are later reported.  
\- Remaining issues or deferred items.

docs/PLAYTEST\_NOTES.md  
Start with a reusable template:  
\- What felt good.  
\- What was confusing.  
\- What felt awkward/slow.  
\- Bugs.  
\- Highest-value next changes.

# 6\. Scene Requirements

Create a deliberately simple but pleasant 3D test scene.

Camera  
\- Perspective camera.  
\- Fixed rotation.  
\- High third-person / near top-down angle.  
\- Portrait composition is the primary target.  
\- Camera setup should be centralized/configurable so Phase 1 can tune height, tilt, look-ahead, and follow behavior without rewriting scene creation.

World  
\- Small ground/island/platform made from simple Three.js geometry.  
\- A few primitive props such as rocks, trees, crystals, or markers may be used solely to establish scale and depth.  
\- Placeholder visuals should lean low-poly and readable rather than realistic.  
\- Avoid importing art assets unless needed.

Player Marker  
\- Simple primitive-based placeholder character/object at a clear world position.  
\- No locomotion required.  
\- Orientation should be visually readable so movement work can build on it in Phase 1\.

Lighting  
\- Simple performant lighting.  
\- Avoid expensive effects.  
\- No requirement for post-processing.

Renderer  
\- Cap pixel ratio sensibly for mobile performance.  
\- Handle viewport resize/orientation safely.  
\- The game should remain designed for portrait rather than re-layout into a landscape game.

HUD  
\- Minimal HTML/CSS overlay.  
\- Must not block the Three.js canvas.  
\- Include a temporary build/version/debug label.  
\- Touch targets are not needed yet.

# 7\. Submission Tooling

build-submission.mjs should:  
\- Create/refresh a clean submission output directory.  
\- Produce index.html at the output root.  
\- Inline all first-party JavaScript required by the game into that index.html in readable, unminified form.  
\- Inline first-party CSS if practical.  
\- Copy /vendor and required local assets.  
\- Preserve relative references.  
\- Avoid copying development-only files.  
\- Produce a ZIP or make ZIP creation a single documented command.

validate-submission.mjs should fail clearly when possible if:  
\- index.html is not at submission root.  
\- /vendor is missing when required.  
\- forbidden http:// or https:// runtime references exist in submitted HTML/JS/CSS.  
\- source-map/minified production output has accidentally replaced readable first-party code.  
\- referenced local files are missing.  
\- ZIP/package size exceeds 35 MB.  
\- obvious development-only paths or localhost references remain.

Validation does not need to be perfect. It should catch the most likely accidental disqualification errors.

# 8\. Local Development & Phone Testing

Provide a simple local server command that binds in a way that allows testing from another device on the same LAN.

README should tell the human how to:  
1\. Start the dev server.  
2\. Find/open the LAN URL from a phone.  
3\. Confirm portrait layout and touch-safe browser behavior.  
4\. Run the submission build.  
5\. Serve the submission output independently to ensure it does not rely on source files.

Do not add a PWA/service worker in Phase 0 unless there is a compelling reason. It can create caching confusion and is unnecessary for the hackathon build.

# 9\. Acceptance Criteria

Phase 0 is complete only when all of these are true:  
\- Repository is initialized and has a sensible .gitignore.  
\- Required project documents exist and contain useful starting content.  
\- Three.js is vendored locally.  
\- Game loads from a local server with no console-breaking errors.  
\- A simple 3D scene, placeholder player, fixed high-angle camera, and minimal HUD render correctly.  
\- Layout is usable at representative portrait phone sizes.  
\- Game can be opened on an actual phone over the local network.  
\- Normal runtime produces no external network requests.  
\- Submission build can be generated from a clean checkout/install.  
\- Submission output has index.html at root and local /vendor assets.  
\- First-party code in submission index.html is readable and unminified.  
\- Submission validator passes.  
\- Submission output can itself be served and loaded successfully.  
\- BUILD\_LOG.md contains the Phase 0 session entry.  
\- Agent reports exactly what it changed, what it verified automatically, and what still requires human phone testing.

# 10\. Human Review Checklist

After the agent finishes, test only the foundation:  
\- Does it load quickly?  
\- Does it look correct in portrait?  
\- Is the camera angle roughly the intended high third-person view?  
\- Is world scale easy to read?  
\- Does the placeholder player have enough visual directionality?  
\- Does the scene remain framed reasonably on your phone?  
\- Any browser UI/scroll/overscroll problems?  
\- Any visible resize/orientation glitches?  
\- Does the submission build launch separately from development source?  
\- Does airplane-mode/offline testing of the already-loaded local package reveal missing external resources?

Do not judge harvesting, combat, progression, art quality, or game fun in this phase.

# 11\. Explicit Non-Goals

Do not implement:  
\- Player movement.  
\- Harvesting.  
\- Combat or enemies.  
\- Wildkin.  
\- Capture systems.  
\- Inventory economy.  
\- Base building.  
\- Matter Resonator.  
\- Skill tree.  
\- Waystones.  
\- Persistence/save data beyond what tooling itself needs.  
\- Procedural world generation.  
\- Art pipeline.  
\- Audio system.  
\- Tutorial.  
\- Menu flow beyond what is necessary to launch the scene.

# 12\. Agent Stop Condition

Stop when the acceptance criteria that can be automated are satisfied and the build is ready for human desktop/phone review.

Do not begin Phase 1\.

At the end, provide:  
\- A concise implementation summary.  
\- Commands to run dev, build submission, validate, and test submission output.  
\- Automated test/validation results.  
\- Any manual test steps still required.  
\- A note confirming BUILD\_LOG.md was updated.  
