# Rootbound terrain facets R1 — corrected numerical feasibility

**One read-only proposal only.** The current Rootbound terrain material already uses flat shading. This receipt tests one shallow local height term on the ordinary 2 m terrain mesh; it does not change the runtime.

## Corrected compact support

The prior receipt is preserved in [`v1`](v1/) as historical evidence. It crossed an x-chunk boundary (`[-460,-450]` while centered at `-456`) and rebuilt a nominal camera. This revision uses one complete five-by-five vertex subset inside the actual chunk `(-9,13)`:

- world bounds: **x `[-440,-432]`, z `[684,692]`**; center `(-436,688)`;
- chunk origin: `(-450,650)`; local vertex indices `ix 5..9`, `iz 17..21` on the ordinary 2 m grid;
- 25 mesh vertices and 32 mesh triangles; 9 interior vertices receive a change;
- all outer-ring vertices evaluate to exactly zero. The recorded `boundaryMaxAbsDeltaM` is `0`.

```js
const dx = (x + 436) / 4;
const dz = (z - 688) / 4;
const fade = smoothstep(1 - Math.max(Math.abs(dx), Math.abs(dz)));
const delta = 0.095 * fade * (1 - 0.4 * dx - 0.3 * dz);
```

This is a small offset shoulder only. It does not promise a room, obstacle, route change, or terrain-system integration.

## Actual mesh and camera receipt

Run:

```powershell
node art/reviews/rootbound-wildwood/terrain-facets-r1/feasibility.mjs
```

The script calls `createFrontierChunk(-9,13)`, reads its actual Float32 vertex array at the listed indices, and compares `sampleFrontier` at the same world coordinates. The largest current query-minus-mesh difference is `4.57e-7 m`, consistent with Float32 storage; no candidate term is present in either runtime path.

The copied prospective grid has a maximum final displacement of `0.095 m`; face-normal rotation is `0..1.718°` (mean `1.072°`). It has all nine changed vertices in front of the captured destination camera and in its 412×915 frame. The largest projected vertical movement is `3.20 px`.

Projection uses the actual `restart-r2-captures.json` destination state and the shipped `cameraFollow` orbit rule: recorded center `(-449,10.459937,675)`, yaw `-2.3`, pitch `36°`, effective distance `11.591080 m`, and 52° FOV. It does **not** substitute the nominal 6.55 m horizontal/5 m configuration for the actual collision/effective distance. Some farther vertices land within the upper HUD band, so this is a native-preview candidate, not a HUD-readability pass.

## Protection status

The nearest protected-life center is `(-435.5,677.8)`, `6.220 m` from a changed vertex. The nearest curated record center is `lantern-ring-b`, `5.000 m`; other nearest centers are retained in [`feasibility.json`](feasibility.json). These are point-to-grid distances only. Before any source pass, it must prove complete transformed visual/collider hull clearance, resource and home support, ordinary player-footprint triangle support/slopes, and unchanged IDs/transforms.

## Minimal source preview contract

A native preview, if authorized, must add the same final local term in the shared Rootbound query/mesh height chain. It must leave alternate worlds neutral and retain the exact 2 m grid. Required follow-up proof: all changed vertices match query/mesh output, untouched vertices remain unchanged, support and route checks pass after the final mask, and matching destination captures demonstrate whether a roughly 3 px facet cue is perceptible under the real HUD. This receipt is not implementation approval.
