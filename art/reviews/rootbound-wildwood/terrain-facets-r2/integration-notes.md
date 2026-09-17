# Rootbound terrain facets R2 — integration notes

**Scope:** read-only implementation map for the retained R2 preview. It is not an implementation request and does not alter the preview's candidate, terrain source, runtime, browser state, or GPU ownership.

## The minimal shared path

The final height path is already shared. The narrowest later integration is a bounded term inside the existing Rootbound profile, not a runtime mesh edit:

1. src/world/frontierRootbound.js — sampleFrontierRootboundProfile(x, z, { baseHeight, habitatWeight, protectDefaultLife }) owns the finite Rootbound height/color profile and calls the acyclic local feature sampler. Add the R2 fan only here, after validating its full support footprint and applying the same default-life protection/feather used by the existing displacement. It must be exactly zero outside the approved rectangle and at its fade boundary.
2. src/world/frontierRegion.js — sampleResolved already admits the profile only for the exact default edition/seed and returns its final height/color contribution. Keep this gate; do not extend Rootbound structural work to alternate worlds or derive a new ecology query from terrain.
3. src/world/frontierTerrain.js — sampleFrontierRaw consumes the resolved region output, and both sampleFrontierHeight and createFrontierChunk use that same raw chain. Chunk vertices at lines 344–368 become the only geometry source. No separate render displacement, triangle/index change, or physics-only height path is needed.
4. src/world/frontierChunkRuntime.js — createResident builds the visible BufferGeometry from those chunk vertices, then the residency update adds that exact chunk to physicsWorld.updateTerrainSurfaces (lines 387–406). A changed chunk therefore reaches Three and the Rapier terrain trimesh together on normal unload/reentry, without a bespoke collider.

This is deliberately local to Rootbound. It does not touch global terrain noise, grid density, camera behavior, foliage count, ecology selection, or other habitat profile functions.

## Color path and the preview/material distinction

The current visible main terrain is a baked map: createResident makes createBakedGroundTexture from createFrontierTextureColorSampler, then constructs frontier_ground with MeshStandardMaterial({ map, roughness, metalness, flatShading: true }). That material does **not** set vertexColors: true. The existing chunk.colors buffer is therefore not the right source for an authoritative R2 tint.

For the private A/B only, a cloned material may enable vertex colors with a fresh white-identity multiplier attribute. It must not reuse the current sampled RGB buffer, because that would multiply the baked map twice.

For a retained source result, keep the material unchanged and make the restrained correlated multiplier part of the final groundColorRGB sampling before the baked texture is generated. The minimal shape is a new optional Rootbound-local tint multiplier returned with the profile, carried through the existing default-world Rootbound branch in frontierRegion, and applied once to the already-composed final terrain RGB in sampleFrontierRaw before its return. It must be [1,1,1] outside the R2 fan and must remain after all existing palette blends; this avoids replacing the clearing palette with a new absolute color.

Flat shading means each rendered triangle uses a flat normal. It does not turn a vertex color attribute into a per-face color. The authoritative baked-map route avoids that interpolation distinction altogether and retains the current material/texture lifecycle.

## Physical/support pitfalls

- Do not add a standalone late height callback. It would make sampleFrontier and sampleFrontierHeight disagree with chunk vertices or give Rapier old support.
- Do not query ecology, scenery, wildlife, or support samplers from frontierRootbound; its current one-way profile deliberately avoids cyclic admission. Retain the static protection/life snapshot and measure complete resource/home/hull support externally.
- Preserve the 2 m grid and index order. The candidate spans chunks (-10,13) and (-9,13); both sides of x=-450 must calculate matching shared-edge heights.
- The R2 central lane is only a design mask. The current field contains baseline triangles up to 46 degrees, so final rendered triangle and .32 m player-footprint support determine admission—not the zero added-height stripe.
- Rootbound color/profile gating has existing sibling contracts: an explicit default world descriptor must behave like implicit default world, alternate worlds must remain equal to disableRootbound, and exterior terrain remains baseline.
- Curated Lantern supports and resource/wildlife homes use terrain heights during admission. No scenery transform, source ID, resident home, or collider should move to accommodate this fan.

## Focused proof after a source pass

Extend tests/rootboundCircuit.test.js rather than adding a broad terrain framework test:

1. sample every changed R2 vertex from both chunks and confirm sampleFrontierHeight matches the actual Float32 mesh triangle; confirm all outside/fade-boundary vertices are baseline;
2. preserve the existing default/alternate/disableRootbound color parity and add a local baked-color-sampler assertion: the default R2 field changes only at nonzero tint while alternate/exterior samples are byte-identical to baseline;
3. rerun the existing full forage/wildlife identity fingerprint and all footprint/home support checks using final mesh sampling, then add the curated asset transformed-hull support/contact check for the Lantern log/rings/thorns touching the local field;
4. instantiate both changed chunks in the existing Rapier streamed-terrain fixture, raycast contact before/after unload/reentry, and verify stable IDs/lifecycle with the current batch update path; and
5. prove the real route corridor with .32 m footprint samples on final 2 m triangles, then capture the matching native portrait and ordinary pass only after those geometric gates hold.

The actual R2 preview/visual review still decides whether this bounded integration is worth these checks.
