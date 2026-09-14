# Resume Wildkin Frontier

**Workflow preparation checkpoint — September 14, 2026. Production is stopped until Chris supplies a fresh kickoff.**

The September 13 game checkpoint remains the latest implemented build. This workflow update added no gameplay/content and makes no new visual, performance, or release claim.

## Start here

1. Read [CURRENT_SLICE](CURRENT_SLICE.md) for implemented status and the [September 13 restart handoff](SESSION_HANDOFF_2026-09-13.md) for the last tested game checkpoint.
2. Read [bounded overnight production](OVERNIGHT_PRODUCTION.md) when Chris authorizes an unattended run.
3. Route work through the project skills:
   - [general Wildkin development](../.agents/skills/wildkin-development/SKILL.md)
   - [habitat development](../.agents/skills/habitat-development/SKILL.md)
   - [Wildkin species development](../.agents/skills/wildkin-species-development/SKILL.md)
   - [asset forge](../.agents/skills/wildkin-asset-forge/SKILL.md)
   - [overnight orchestrator](../.agents/skills/overnight-orchestrator/SKILL.md)

## Prepared first trial

- [Rootbound Wildwood packet](habitats/rootbound-wildwood/PACKET.md)
- [Rootbound structure visual](../art/targets/rootbound-wildwood/layout-target.svg)
- [Rootbound composition critique/target](../art/targets/rootbound-wildwood/composition-target.svg)
- [copy-ready overnight kickoff prompt](prompts/ROOTBOUND_OVERNIGHT_KICKOFF.md)

This packet targets the owner-observed problems in the current habitat: flat local ground, uniform scatter, weak scale hierarchy, limited landmarks, insufficient patchiness, and weak route/ecological readability.

## Multi-agent setup

Project `.codex/config.toml` allows up to six spawned-agent threads in addition to the primary when the current Codex client/account supports them. This does not require using six.

Use one root session per worktree:

- at most three write-capable agents at once;
- one writer per shared file/domain;
- at least one independent reviewer;
- one TRELLIS/Blender/heavy-GPU job at a time;
- root owns integration, Git, aggregate gates, and current-scope documents.

Do not run two independent overnight root sessions against the same `main` worktree. Use one orchestrator with habitat, species, asset, review, and optional feature lanes.

## Current game checkpoint

- [Illustrated September 13 review](../art/reviews/continent-restart/review.html)
- [short written overview](DAILY_REVIEW_2026-09-13.md)
- [full continent and habitat maps](../art/reviews/continent-restart/README.md)
- [actual character Scout flight proof](../art/reviews/continent-restart/scout-receipt.md)

At that checkpoint, 1,411 tests and package checks passed, the package was 44.41 MB unpacked / 20.60 MB ZIP, and the earned Camp save remained exact. Ten habitat areas were allocated, not ten finished habitat experiences. Sparse ground, regular terrain ridges, insufficient extreme/local relief, loading hitches, broad species/genetics work, and physical-phone proof remained open.

The historical continuous-development mandate does not restart itself. Begin only from a fresh owner prompt such as the prepared kickoff.
