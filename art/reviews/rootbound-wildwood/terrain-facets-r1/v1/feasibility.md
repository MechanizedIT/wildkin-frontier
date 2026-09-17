# Rootbound Lantern threshold facets — numerical feasibility

**One proposal only; no source implementation.** The current Rootbound material is already flat-shaded. The useful test is therefore a tiny actual-height change on the ordinary 2m mesh, not a normal-only overlay or subdivision.

## Proposed local term

Apply after the existing Rootbound profile selects its final default-world height, at the existing mesh/query vertex coordinates only:

```js
const cx = -456, cz = 686;
const dx = (x - cx) / 5, dz = (z - cz) / 4;
const fade = smoothstep(1 - Math.max(Math.abs(dx), Math.abs(dz)));
const delta = 0.095 * fade * (1 - 0.4 * dx - 0.3 * dz);
```

Use it only for `x ∈ [-460,-450]`, `z ∈ [682,690]`; it is exactly zero at the connected patch boundary. This is one low offset shoulder angled toward the existing Lantern bank, not random vertex noise. It changes 15 of the 30 existing two-metre vertices; the largest final displacement is +0.095m.

## Measured preview

Run:

```powershell
node art/reviews/rootbound-wildwood/terrain-facets-r1/feasibility.mjs
```

The script calls the current `createFrontierChunk(-9,13)` and `sampleFrontier`, then applies the prospective term only to a copied numeric grid. Thus `baselineHeight` is current query/mesh data; `candidateHeight` is not current runtime behavior. The current non-Skybreak query and ordinary mesh both use the same raw height at each 2m vertex, so there is no existing query-versus-mesh mismatch to hide behind.

The resulting 32 triangles have a maximum baseline-to-candidate face-normal rotation of **2.1911°** (mean **1.0023°**). The calibrated restart-R2 destination camera projects the largest altered vertex at **0.01374 NDC vertical**; that is roughly 6.3 pixels in the 915px portrait height before any crop. It is a restrained visible plane change, not an obstacle claim.

## Protection and camera facts

The fixed destination is player `(-449, 9.559901, 675)`, yaw `-2.3`, pitch `36°`, camera center `(-449, 10.459937, 675)`, distance geometry from `restart-r2-captures.json`, and the shipped 52° FOV. The numerical camera position and every affected vertex projection are retained in [feasibility.json](feasibility.json).

The patch is below `z=700`, outside all three Rootbound resident plates. Its nearest protected-life point is `(-443.3,672.2)`, **11.871m** from a changed-grid vertex. Nearest curated records are `thorn-a` at **3.606m**, `thorn-b` at **5.000m**, `lantern-ring-b` at **6.083m**, and `lantern-log` at **7.211m**. These are center-to-grid distances, not full support clearance proof: a source pass must query the complete visual/collider hulls and preserve their final terrain supports before admitting the term.

## Minimal implementation and proof

Add one default-world-neutral local final-height term in the shared Rootbound terrain-query/mesh chain, after the existing preservation-aware profile. Do not add an API, 1m mesh, shader-normal treatment, global random rule, prop transform, or life/plate exception. The same term must feed `createFrontierChunk`, `sampleFrontier`, and `sampleFrontierHeight` so render and play agree.

Before a source change is accepted, prove: all 15 changed vertex heights exactly match query output; all untouched vertices are bit-for-bit baseline; complete resource/home/curated scenery hull supports and IDs/transforms are unchanged; the destination lane with the real .32m footprint retains final-triangle support and its existing slope limit; default implicit/explicit worlds agree; alternate worlds remain neutral; and matching destination/arrival/gallery captures show only the destination comparison change.

This result makes the plan’s original narrow patch feasible enough for one structural comparison. It does not prove perceptual success, full physical clearance, ordinary travel, or an accepted habitat improvement.
