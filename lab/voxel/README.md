# Wildkin voxel lab (Phase 0 only)

Run `node tools/serve.mjs --port 8090`, then open `/lab/voxel/index.html`.
The normal `/index.html` is still the preserved expedition. This page owns a
separate IndexedDB database per scalar resolution, `wildkin-voxel-lab-smooth-0.5`
or `wildkin-voxel-lab-smooth-0.25`. Block baselines use `wildkin-voxel-lab-phase0`.
It never reads legacy saves. `?size=16` and `?size=32` select cubic chunk sizes;
`?spacing=0.5` or `0.25` sets metres between scalar samples. Surface Nets is the
default; `?mesher=marching-tetrahedra` selects the smooth comparator.
`?profile=mobile` selects the landscape budget. `?mesher=js-greedy`, `block-mesh`
or `voxelize` selects a measured block baseline. A `save` query names an isolated
lab test database. `?window=32` is a measurement-only identical physical 32m
cube for comparing all scalar resolutions/chunk sizes; normal residency uses
the profile radius and rounds it to whole chunks.

WASD or touch arrows walk; drag the open canvas to look. Space jumps; E/Mine
uses the selected tool in the outlined spherical scoop; F/Collect gathers nearby material
pieces. Pick removes stone/clay; Axe removes the wooden post. The deck becomes
one bounded smooth Rapier actor with a conservative convex collision proxy.
The block baseline uses compound boxes. Fly (G, Space/Ctrl) is an explicit developer
inspection control for all three axes. Return to court returns to the fixture.
Rebase origin is a fixed-step diagnostic; global edits and saved actor addresses
remain unchanged. Save & reload waits for an actual storage transaction.

The broad terrain is a deterministic 3D density/cave field. The small court is
a deliberate reproducible test fixture, not an admitted habitat. Support solving
is deliberately limited to its wooden bridge. Browser evidence distinguishes
fixture positioning from normal-input movement and actions.

`node --test tests/voxel*.test.js` runs the focused pure/Rapier suites.
`node tools/playtest-voxel-smooth.mjs` runs actual browser interaction/reload;
set `VOXEL_SPACING=0.25` for the finer samples. `playtest-voxel-lab.mjs` retains
the block baseline proof. `benchmark-voxel-smooth.mjs` measures both chunk sizes,
sample spacings and profiles on desktop hardware. Set `VOXEL_NORMALIZED=1` for
identical physical residency or `VOXEL_MESHER=marching-tetrahedra` for the smooth
comparator. `benchmark-voxel-normalized.mjs` measures generation/meshing over an
identical cave-bearing physical volume without graphics. These do not replace
the real-phone gate. `playtest-voxel-touch.mjs` proves emulated multitouch only.
`node tools/build-voxel-lab.mjs` makes a separate portable lab with `index.html`
at its ZIP root. The shipping build script never imports the lab.

See `docs/VOXEL_PHASE0_REPORT.md` for evidence, limitations and gate status.

## Noise dependency

`vendor/fastnoise-lite.js` is the unmodified JavaScript file from npm
`fastnoise-lite@1.1.1` (its embedded source header says 1.1.0). MIT license is
preserved in the source. Origin: https://github.com/Auburn/FastNoiseLite and
https://registry.npmjs.org/fastnoise-lite/-/fastnoise-lite-1.1.1.tgz .
SHA256: `83cdfcdc9f65e02b4a8ea6fc157283119379b316b28b0021e9cc0f4d15de01bb`.
It is local, worker-safe and lab-only; no runtime download or global npm install.
The lab also reuses the repository's existing Three.js 0.160 and Rapier 0.20
vendor files and their existing licenses/notices.
