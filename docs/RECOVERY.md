# Recover the project on another computer

The existing GitHub repository is [MechanizedIT/wildkin-frontier](https://github.com/MechanizedIT/wildkin-frontier). Chris requested a new checkpoint backup and documentation refresh on September13. A source push does not deploy the game. Continuous local development is separately authorized under the current early-alpha mandate.

Read [CURRENT_SLICE.md](CURRENT_SLICE.md) for current implementation and validation, and [SESSION_START.md](SESSION_START.md) for the next task. The September12 restart handoff is historical. The illustrated research and later progress supplements are tracked in [research/living-frontier](research/living-frontier/README.md). Remote coverage must be confirmed from the delivery record or matching GitHub commit; a local commit alone does not prove a push.

## Play the checkpoint

1. Clone the repository and use `main`. Install Node.js/npm if needed, then run `npm ci` in the project directory.
2. Run `npm run dev` and open `http://localhost:8080/`. For a phone on the same Wi-Fi, use the computer's current LAN address with port8080. Allow the server through the local private-network firewall if necessary; the address can change after a reboot.
3. Read [SESSION_START.md](SESSION_START.md) before editing. [CURRENT_SLICE.md](CURRENT_SLICE.md) owns the next playable outcome; [CODE_MAP.md](CODE_MAP.md) identifies system owners. Older overnight handoffs describe earlier finite-campaign work.

The game needs no API keys. Shipping GLBs, textures, local vendor libraries, editable admitted asset sources, targets, code, tests and project documents are tracked. Build outputs can be regenerated with the package scripts.

## Recover unfinished art and workflows

- The latest **unshipped** Tidefin model, rig, animation candidate, review images and reconstruction inputs are retained in [the Tidefin recovery bundle](../art/source/tidefin-candidate-v3/RECOVERY.md). Its hash manifest maps the original ignored study paths to their tracked copies. This backup does not admit the replacement into the game.
- The project development workflow is tracked at `.agents/skills/wildkin-development/SKILL.md`.
- The project-specific Asset Forge skill, previously installed only in the owner's Codex profile, has a [recovery snapshot](../tools/skill-backups/README.md). Install or read that snapshot when the live skill is unavailable. The third-party Dream Loop skill can be reinstalled from [its upstream repository](https://github.com/achimala/dream-loop).
- Machine-specific Blender/TRELLIS paths in historical scripts and skill notes are setup examples. Re-establish local tool paths and resource guards on a replacement machine. Open retained editable Blend files directly for inspection; do not automatically launch expensive regeneration jobs.

## What this backup excludes

Credentials and `.env`, browser-local player saves, `node_modules`, downloadable AI weights/tool runtimes, generated distribution folders, caches, duplicate backups and superseded/rejected local experiments are not part of this Git backup. Preserve a wanted playthrough separately through the game's save export. The ignored `.dream-loop` folder is not generally recoverable; the retained candidate bundle and tracked review images are the explicit exceptions copied out of it.

For requested backups, review `git status` and push cohesive commits on `main`; do not blindly add every ignored/local file. Verify remote HEAD after pushing. Use the checkpoint's actual test/build receipt and retain `[skip ci]` for source-backup pushes so they do not start routine hosted CI. Browser-local player saves must be exported separately.
