# Rootbound R3 facet floor — implementation plan

**Status:** source-plan review required before runtime mutation. This is one retained
R3 candidate, confined to x[-458,-436], z[666,688] and chunks (-10,13),
(-9,13). The literal lattice, camera evidence, and pre-mutation source hashes
are adjacent to this plan.

## Exact implementation

1. Add the literal R3 12×12 value lattice and bounds to
   src/world/frontierRootbound.js. Implement one local facet sampler that:
   - returns zero outside the rectangle and on its outer vertex ring;
   - uses the ordinary 2 m grid and the same diagonal split as
     createFrontierChunk: triangle a-c-b for tx+tz <= 1 and b-c-d otherwise;
   - first applies existing life-preservation at each lattice vertex, then
     interpolates those protected vertex values. This makes the R3 term at an
     arbitrary query point the same piecewise planar surface used by mesh
     triangles, instead of multiplying a continuous protection field after
     interpolation;
   - returns both final facetDeltaM and facetActive with the existing Rootbound
     profile. Existing ridge/hollow/crown/thorn behavior stays unchanged.

2. Carry only that scalar through the existing default-world Rootbound path:
   profile result -> frontierRegion rootboundFacetDelta -> sampleFrontierRaw
   result -> createFrontierChunk Float32 rootboundFacetDeltas attribute. No
   world-data, scenery, ecology, wildlife, IDs, save schema, or global
   terrain contract changes. Alternate and disableRootbound paths return zero.

3. Keep the physical mesh indexed and unchanged in topology. Its vertex Y
   already comes from sampleFrontierRaw, so the facet term reaches the visible
   chunk and the chunk supplied to physicsWorld.updateTerrainSurfaces together.
   The added Float32 delta array is render evidence only; it must have one
   entry per chunk vertex and no effect on collision independently of Y.

4. In frontierChunkRuntime createResident, only if a chunk has a nonzero
   rootboundFacetDeltas entry, create a non-indexed **render** geometry from
   that already-final indexed chunk geometry. For every triangle, calculate
   the mean of its three sampled deltas and assign the same multiplier to each
   duplicated vertex: RGB = [1+s*.065, 1+s*.10, 1+s*.065], where s clamps
   meanDelta/.36 to [-1,1]. All other faces are [1,1,1]. Clone the existing
   mapped material, keep flatShading, enable vertexColors, and retain the
   baked map. This is the retained R3 per-face light/tint treatment; it does
   not multiply existing chunk RGB or alter a texture/global material. The
   indexed chunk data remains the physics source.

5. The two render chunks should be the only chunks that duplicate geometry.
   Their shared x=-450 vertices receive identical literal/protected values.
   Disposal must release the cloned geometry/material with the resident, while
   physics still adds/removes the unchanged chunk IDs and indexed surfaces.

## Admission and support

Existing resource/home protection remains a physical constraint, not a reason
to protect every ground blade. The profile's existing life-preservation
snapshot protects source/home selection surfaces. Curated logs/rings/thorns
and ordinary static scenery retain their positions; their existing height
samplers see final terrain height and must be rechecked on full transformed
footprints. No prop is moved or re-identified.

The ordinary destination route is checked only where the patch changes it:
its full .32 m player footprint over final 2 m triangles, the nearby essential
Lantern/Thorn supports, the relevant resident home disks, and actual Rapier
contact/unload/reentry for the two chunks. Optional exploration remains under
TRAVERSAL_INTENT; this pass does not assert all-terrain walkability.

## Focused proof

Extend tests/rootboundCircuit.test.js to prove:

- literal lattice boundary zero, shared-edge agreement, default implicit and
  explicit world parity, alternate/disableRootbound zero contribution;
- every R3 mesh vertex reports the same final query height and every
  unchanged/outer vertex retains its pre-R3 height;
- vertex delta array length/values agree with terrain sampling, and only the
  two expected chunks have nonzero deltas;
- existing forage/wildlife source fingerprint plus resource full-footprint and
  resident mesh/analytical support continue to pass;
- curated Lantern prop transformed hull support is valid at final heights; and
- two-chunk terrain surfaces raycast and preserve IDs through unload/reentry.

Root owns the matching browser capture, ordinary targeted movement/contact
check, aggregate npm test/verify/zip and checkpoint integration. This worker
will run focused tests only after source changes.

## Implemented source freeze

The approved plan is now implemented in the four named owners. The literal field is
applied before terrain chunks emit their positions; the same indexed chunk is sent to
physics. Only active chunks produce a non-indexed render duplicate with a
map-preserving, per-face multiplier. evidence.mjs records the default/alternate
gate and active-chunk counts; source-hashes.json binds this freeze.

Focused proof: node --test tests/rootboundCircuit.test.js passes 7/7, including
default/explicit/alternate field parity, shared chunk-edge values, query-to-mesh
height equality, render duplication/material use, and ordinary unload.

### Render formula correction

Ground-face RGB now follows the reviewed channel formula exactly:
[1 + s × .065, 1 + s × .10, 1 + s × .065], where s is the clamped
mean relief divided by .36. Zero-relief faces are white and existing cliff RGB
is untouched. The focused runtime proof now checks both facts and verifies that
an adjacent zero-delta chunk remains indexed with its baseline material.
