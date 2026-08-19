Perform a Phase 0 engineering-hardening pass only. Do not implement Phase 1 or add gameplay.

Goals:

1. Strengthen AGENTS.md with permanent engineering principles:
   - main.js remains a thin composition/bootstrap layer
   - one authoritative game/update/render loop
   - modules split by responsibility as complexity grows
   - avoid god objects and parallel duplicate systems
   - explicit state/dependency ownership; globals only for debug
   - centralized tuning/configuration
   - gameplay logic testable independently of rendering where practical
   - mobile performance first
   - no new dependencies without justification

2. Create docs/ARCHITECTURE.md documenting the intended lightweight architecture and data flow without over-engineering it.

3. Replace the hard-coded/regex-based first-party submission bundling with a robust automatic module-graph solution. Prefer esbuild as a build-time-only dependency:
   - bundle src/main.js
   - minify false
   - sourcemap false
   - format esm
   - keep "three" external
   - inline the readable resulting first-party bundle into submission index.html
   - continue using ./vendor/three.module.js at runtime.

4. Consolidate the two requestAnimationFrame loops into one authoritative loop without changing visible behavior.

5. Rename package metadata to wildkin-frontier and README title to Wildkin Frontier (working title).

6. Correct the README offline-test instructions so they test absence of external runtime requests without requiring a reload after disconnecting from the LAN server.

7. Add npm run verify to run all applicable automated verification.

8. Add clear Three.js version/license provenance in the repository and submission as appropriate.

9. If useful, add a minimal GitHub Actions workflow that runs npm ci and npm run verify on push.

Do not change game design, camera intent, scene content, visual direction, or add movement/gameplay.

Run all checks, update BUILD_LOG.md, and stop.